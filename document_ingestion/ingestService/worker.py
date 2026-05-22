import os
import time
import json
import random
import psycopg
from google.cloud import storage
from pydantic import BaseModel, Field
from chunker_hibrid import MultimodalSemanticPipeline
from dotenv import load_dotenv
from google.oauth2 import service_account
import concurrent.futures
import urllib.parse
import re
import tempfile

from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-3.1-flash-preview")

credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if credentials_path and os.path.exists(credentials_path):
    print(f"Loading custom service account credentials from: {credentials_path}")
    credentials = service_account.Credentials.from_service_account_file(credentials_path)
    credentials = credentials.with_scopes(["https://www.googleapis.com/auth/cloud-platform"])
else:
    print("No service account credentials file found or path doesn't exist. Falling back to Application Default Credentials (ADC) or env defaults.")
    credentials = None

class GraphNode(BaseModel):
    id: str = Field(description="Identificatorul unic sau numele normalizat al entității.")
    label: str = Field(description="Categoria entității (ex: Concept, Tehnologie, Persoană, Proces).")

class GraphEdge(BaseModel):
    source: str = Field(description="ID-ul nodului sursă.")
    target: str = Field(description="ID-ul nodului destinație.")
    relation: str = Field(description="Verbul care descrie relația.")

class GraphExtraction(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]

DB_DSN = (
    f"host={os.getenv('DB_HOST')} "
    f"port={os.getenv('DB_PORT', '5432')} "
    f"dbname={os.getenv('DB_NAME')} "
    f"user={os.getenv('DB_USER')} "
    f"password={os.getenv('DB_PASS')}"
)

storage_client = storage.Client(credentials=credentials)

llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL_NAME,
    project=os.getenv("GOOGLE_CLOUD_PROJECT"),
    location=os.getenv("GOOGLE_CLOUD_LOCATION", "global"),
    credentials=credentials,
    temperature=0.0,
    thinking_level="medium"
)

structured_llm = llm.with_structured_output(
    schema=GraphExtraction, 
    method="json_schema"
)

pipeline = MultimodalSemanticPipeline(
    project_id=os.getenv("GOOGLE_CLOUD_PROJECT"),
    location=os.getenv("LOCATION", "global"),
    credentials=credentials 
)

def fetch_job() -> tuple:
    with psycopg.connect(DB_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                WITH cte AS (
                    SELECT job_id FROM rag_system.ingestion_jobs
                    WHERE status = 'PENDING'
                    ORDER BY created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                UPDATE rag_system.ingestion_jobs
                SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP
                FROM cte
                WHERE rag_system.ingestion_jobs.job_id = cte.job_id
                RETURNING rag_system.ingestion_jobs.job_id, 
                          rag_system.ingestion_jobs.file_path, 
                          rag_system.ingestion_jobs.course_id;
            """)
            job = cur.fetchone()
            conn.commit()
            return job

def extract_graph_data(text_chunk: str) -> GraphExtraction:
    prompt = (
        "Analizează următorul text în limba română și extrage un graf de cunoștințe cuprinzător. "
        "Identifică entitățile principale ca noduri și relațiile dintre ele ca muchii.\n"
        f"Text:\n{text_chunk}"
    )
    return structured_llm.invoke(prompt)

def process_job(job_id: str, gcs_uri: str, course_id: str):
    
    raw_filename = urllib.parse.unquote(os.path.basename(gcs_uri))
    
    
    real_filename = re.sub(r'^([0-9a-fA-F\-]+_|[a-zA-Z0-9]+_)', '', raw_filename)
    
    
    temp_dir = tempfile.gettempdir()
    temp_pdf_path = os.path.join(temp_dir, f"{job_id}_{real_filename}")
    blob = None
    
    try:
        bucket_name = gcs_uri.split("/")[2]
        blob_name = "/".join(gcs_uri.split("/")[3:])
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        print(f"[{job_id}] Se descarcă {gcs_uri} ...")
        blob.download_to_filename(temp_pdf_path)

        print(f"[{job_id}] Începe chunking-ul multimodal (GCS & Markdown Injection)...")
        bucket_name = os.getenv("GCS_BUCKET_NAME")
        
        
        semantic_chunks = pipeline.process_document(
            temp_pdf_path, 
            course_id, 
            storage_client, 
            bucket_name, 
            job_id
        )

        with psycopg.connect(DB_DSN) as conn:
            conn.execute("LOAD 'age';")
            conn.execute("SET search_path = ag_catalog, \"$user\", public;")
            
            with conn.cursor() as cur:
                total_chunks = len(semantic_chunks)
                print(f"[{job_id}] Începe preluarea datelor AI în paralel pentru {total_chunks} chunk-uri...")
                
                def fetch_ai_data(chunk_obj, max_retries=6):
                    for attempt in range(max_retries):
                        try:
                            emb = pipeline.embeddings.embed_query(chunk_obj.page_content)
                            graph = extract_graph_data(chunk_obj.page_content)
                            return chunk_obj, emb, graph
                        except Exception as e:
                            error_str = str(e).lower()
                            if "429" in error_str or "quota" in error_str or "exhausted" in error_str:
                                sleep_time = (2 ** attempt) + random.uniform(0.1, 1.5)
                                time.sleep(sleep_time)
                            else:
                                raise e
                    raise Exception(f"Eșec după {max_retries} încercări pe chunk-ul curent.")

                ai_results = []
                with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
                    futures = [executor.submit(fetch_ai_data, c) for c in semantic_chunks]
                    for future in concurrent.futures.as_completed(futures):
                        try:
                            ai_results.append(future.result())
                        except Exception as thread_err:
                            print(f"[{job_id}] Eroare la generarea AI pentru un chunk: {thread_err}")

                print(f"[{job_id}] Date AI preluate. Începe inserarea în PostgreSQL...")

                for idx, (chunk, embedding_vector, graph_data) in enumerate(ai_results):
                    cur.execute("""
                        INSERT INTO rag_system.document_chunks (job_id, content, embedding, metadata)
                        VALUES (%s, %s, %s, %s)
                    """, (job_id, chunk.page_content, str(embedding_vector), json.dumps(chunk.metadata)))

                    if graph_data and hasattr(graph_data, 'nodes') and graph_data.nodes:
                        for node in graph_data.nodes:
                            cur.execute("""
                                SELECT * FROM cypher('document_knowledge_graph', $$
                                    MERGE (n:Entity {id: $id})
                                    SET n.label = $label, n.course_id = $course
                                    RETURN n
                                $$, %(params)s) AS (v agtype);
                            """, {"params": json.dumps({
                                "id": node.id,
                                "label": node.label,
                                "course": course_id
                            })})

                    if graph_data and hasattr(graph_data, 'edges') and graph_data.edges:
                        for edge in graph_data.edges:
                            cur.execute("""
                                SELECT * FROM cypher('document_knowledge_graph', $$
                                    MATCH (a:Entity {id: $source}), (b:Entity {id: $target})
                                    MERGE (a)-[r:RELATION {type: $relation}]->(b)
                                    RETURN r
                                $$, %(params)s) AS (v agtype);
                            """, {"params": json.dumps({
                                "source": edge.source,
                                "target": edge.target,
                                "relation": edge.relation
                            })})

                    progress = int(((idx + 1) / total_chunks) * 100)
                    cur.execute("""
                        UPDATE rag_system.ingestion_jobs
                        SET progress = %s WHERE job_id = %s
                    """, (progress, job_id))
            
            conn.commit()

        with psycopg.connect(DB_DSN) as conn:
            conn.execute("""
                UPDATE rag_system.ingestion_jobs
                SET status = 'COMPLETED', progress = 100, updated_at = CURRENT_TIMESTAMP
                WHERE job_id = %s
            """, (job_id,))
            
        print(f"[{job_id}] Procesare completă!")

    except Exception as e:
        print(f"[{job_id}] EROARE: {str(e)}")
        with psycopg.connect(DB_DSN) as conn:
            conn.execute("""
                UPDATE rag_system.ingestion_jobs
                SET status = 'FAILED', error_message = %s, updated_at = CURRENT_TIMESTAMP
                WHERE job_id = %s
            """, (str(e), job_id))
    finally:
        try:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
        except Exception:
            pass

        try:
            if blob and blob.exists():
                blob.delete()
        except Exception:
            pass

def worker_loop():
    print("GraphRAG Worker Daemon Initialized and waiting for jobs...")
    while True:
        job = fetch_job()
        if job:
            job_id, gcs_uri, course_id = job
            print(f"Acquired Job: {job_id}. Processing...")
            process_job(job_id, gcs_uri, course_id)
        else:
            time.sleep(5)

if __name__ == "__main__":
    worker_loop()