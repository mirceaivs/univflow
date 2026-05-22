import os
import uuid
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from google.cloud import storage
import psycopg
from dotenv import load_dotenv
from google.oauth2 import service_account
from typing import List
import json
from functools import lru_cache

load_dotenv()
app = FastAPI(title="Stateless RAG Ingestion Producer")

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
GRAPH_NAME = os.getenv("GRAPH_NAME", "document_knowledge_graph")

@lru_cache(maxsize=1)
def get_gcs_client():
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if credentials_path and os.path.exists(credentials_path):
        credentials = service_account.Credentials.from_service_account_file(credentials_path)
        credentials = credentials.with_scopes(["https://www.googleapis.com/auth/cloud-platform"])
        return storage.Client(credentials=credentials)
    
    return storage.Client()

@lru_cache(maxsize=1)
def get_gcs_bucket():
    client = get_gcs_client()
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    if not bucket_name:
        raise ValueError("Lipsește GCS_BUCKET_NAME din variabilele de mediu")
    return client.bucket(bucket_name)

DB_DSN = (
    f"host={os.getenv('DB_HOST')} "
    f"port={os.getenv('DB_PORT', '5432')} "
    f"dbname={os.getenv('DB_NAME')} "
    f"user={os.getenv('DB_USER')} "
    f"password={os.getenv('DB_PASS')}"
)

def verify_internal_access(x_internal_service_key: str = Header(...)):
    if x_internal_service_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid Service Key")



@app.post("/api/ingest")
async def ingest_documents(
    course_id: str = Form(...),
    files: List[UploadFile] = File(...), 
    bucket = Depends(get_gcs_bucket),
    _: None = Depends(verify_internal_access)
):
    print(f"\n[INGEST] Ingestion Started for course: {course_id}")
    created_jobs = []
    
    for file in files:
        job_id = str(uuid.uuid4())
        print(f"[INGEST] Start upload file: {file.filename} (Job: {job_id})")
        gcs_uri = f"gs://{GCS_BUCKET_NAME}/ingestion_artifacts/{course_id}/{job_id}_{file.filename}"
        
        try:
            
            blob = bucket.blob(f"ingestion_artifacts/{course_id}/{job_id}_{file.filename}")
            
            blob.upload_from_file(file.file)
            
            
            with psycopg.connect(DB_DSN) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO rag_system.ingestion_jobs (job_id, course_id, file_path, status)
                        VALUES (%s, %s, %s, 'PENDING')
                    """, (job_id, course_id, gcs_uri))
            
            created_jobs.append({"job_id": job_id, "filename": file.filename})
        except Exception as e:
            print(f"Eroare la fișierul {file.filename}: {str(e)}")
            continue

    if not created_jobs:
        raise HTTPException(status_code=500, detail="Nu s-a putut orchestra niciun fișier.")

    print(f"[INGEST] Finished ingestion for {len(created_jobs)} files.\n")
    return JSONResponse(
        status_code=202,
        content={
            "message": f"{len(created_jobs)} documente adăugate în coada de procesare.",
            "jobs": created_jobs
        }
    )
    
@app.get("/api/status/{job_id}")
def get_job_status(job_id: str, _: None = Depends(verify_internal_access)):
    try:
        with psycopg.connect(DB_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT status, progress, error_message
                    FROM rag_system.ingestion_jobs
                    WHERE job_id = %s
                """, (job_id,))
                result = cur.fetchone()
                
        if not result:
            raise HTTPException(status_code=404, detail="Job not found")
            
        return {
            "job_id": job_id,
            "status": result[0],
            "progress": result[1],
            "error_message": result[2]
        }
    except psycopg.Error:
        raise HTTPException(status_code=500, detail="Database connection error.")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.delete("/api/courses/{course_id}")
async def delete_entire_course_data(
    course_id: str,
    bucket = Depends(get_gcs_bucket),
    _: None = Depends(verify_internal_access)
):
    try:
        with psycopg.connect(DB_DSN) as conn:
            
            conn.execute("LOAD 'age';")
            conn.execute('SET search_path = ag_catalog, "$user", public;')
            
            with conn.cursor() as cur:
                
                cur.execute("""
                    DELETE FROM rag_system.document_chunks 
                    WHERE metadata->>'course_id' = %s
                """, (course_id,))

                
                cur.execute(f"""
                    SELECT * FROM cypher('{GRAPH_NAME}', $$
                        MATCH (n {{course_id: $course}})
                        DETACH DELETE n
                    $$, %s) AS (v agtype);
                """, (json.dumps({"course": course_id}),))

                
                cur.execute("DELETE FROM rag_system.ingestion_jobs WHERE course_id = %s", (course_id,))
        
        
        blobs = bucket.list_blobs(prefix=f"ingestion_artifacts/{course_id}/")
        for blob in blobs:
            blob.delete()
            
        return {"message": f"All data for course {course_id} has been purged successfully."}
    except Exception as e:
        print(f"Purge error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")
    
@app.delete("/api/documents/{job_id}")
async def delete_document_data(
    job_id: str,
    bucket = Depends(get_gcs_bucket),
    _: None = Depends(verify_internal_access)
):
    try:
        course_id = None
        
        with psycopg.connect(DB_DSN) as conn:
            
            conn.execute("LOAD 'age';")
            conn.execute('SET search_path = ag_catalog, "$user", public;')
            
            with conn.cursor() as cur:
                
                cur.execute("SELECT course_id FROM rag_system.ingestion_jobs WHERE job_id = %s", (job_id,))
                res = cur.fetchone()
                if res:
                    course_id = res[0]

                
                cur.execute("DELETE FROM rag_system.document_chunks WHERE job_id = %s", (job_id,))

                
                cur.execute("DELETE FROM rag_system.ingestion_jobs WHERE job_id = %s", (job_id,))
        
        
        if course_id:
            pdf_blobs = bucket.list_blobs(prefix=f"ingestion_artifacts/{course_id}/{job_id}_")
            for blob in pdf_blobs:
                blob.delete()
                
        diagram_blobs = bucket.list_blobs(prefix=f"graphrag_ingestion/{job_id}/")
        for blob in diagram_blobs:
            blob.delete()
            
        return {"message": f"Document with job_id {job_id} has been purged successfully."}
        
    except Exception as e:
        print(f"Purge error for document {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document cleanup failed: {str(e)}")