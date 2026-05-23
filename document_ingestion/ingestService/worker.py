import os
import sys
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
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-3.5-flash")

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

ai_project_id = os.getenv("VERTEX_AI_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")

llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL_NAME,
    project=ai_project_id,
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
    project_id=ai_project_id,
    location=os.getenv("LOCATION", "global"),
    credentials=credentials 
)

def extract_graph_data(text_chunk: str) -> GraphExtraction:
    prompt = (
        "Analizează următorul text în limba română și extrage un graf de cunoștințe cuprinzător. "
        "Identifică entitățile principale ca noduri și relațiile dintre ele ca muchii.\n"
        f"Text:\n{text_chunk}"
    )
    return structured_llm.invoke(prompt)

def is_retryable_exception(e):
    error_str = str(e).lower()
    return "429" in error_str or "quota" in error_str or "exhausted" in error_str or "500" in error_str or "503" in error_str

@retry(
    stop=stop_after_attempt(6),
    wait=wait_exponential(multiplier=1, min=2, max=60),
    retry=retry_if_exception(is_retryable_exception),
    reraise=True
)
def fetch_ai_data_with_retry(chunk_obj):
    emb = pipeline.embeddings.embed_query(chunk_obj.page_content)
    graph = extract_graph_data(chunk_obj.page_content)
    return chunk_obj, emb, graph

def fetch_ai_data(chunk_obj):
    return fetch_ai_data_with_retry(chunk_obj)

def process_single_execution():
    bucket_name = os.getenv("BUCKET_NAME")
    file_path = os.getenv("FILE_PATH")

    if not bucket_name or not file_path:
        print("EROARE: BUCKET_NAME sau FILE_PATH lipsesc din variabilele de mediu.")
        sys.exit(1)

    # 1. Filtrare Arhitecturală: Ieșire grațioasă pentru fișiere neprocesabile (diagrame, etc.)
    if not file_path.lower().endswith(".pdf"):
        print(f"[{file_path}] Nu este un PDF procesabil. Se închide worker-ul grațios (exit 0).")
        sys.exit(0)

    # 3. Parametrizare: Parsare job_id și course_id din calea GCS
    # Format așteptat: ingestion_artifacts/{course_id}/{job_id}_{filename}
    parts = file_path.split("/")
    if len(parts) >= 3 and parts[0] == "ingestion_artifacts":
        course_id = parts[1]
        filename_with_job = parts[-1]
        if "_" in filename_with_job:
            job_id = filename_with_job.split("_", 1)[0]
        else:
            job_id = "unknown_job_" + str(int(time.time()))
    else:
        # Fallback dacă fișierul a fost încărcat direct într-un folder atipic
        course_id = "default_course"
        job_id = "job_" + str(int(time.time()))

    gcs_uri = f"gs://{bucket_name}/{file_path}"
    print(f"[{job_id}] Acquired File: {file_path}. Processing for course {course_id}...")
    
    # 2 & 4. Execuție unică și Terminație
    try:
        # Marcăm ca PROCESSING în BD
        with psycopg.connect(DB_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE rag_system.ingestion_jobs
                    SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP
                    WHERE job_id = %s AND status = 'PENDING'
                """, (job_id,))
            conn.commit()

        raw_filename = urllib.parse.unquote(os.path.basename(gcs_uri))
        real_filename = re.sub(r'^([0-9a-fA-F\-]+_|[a-zA-Z0-9]+_)', '', raw_filename)
        
        temp_dir = tempfile.gettempdir()
        temp_pdf_path = os.path.join(temp_dir, f"{job_id}_{real_filename}")
        blob = None
        
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_path)
        
        print(f"[{job_id}] Se descarcă {gcs_uri} către {temp_pdf_path}...")
        blob.download_to_filename(temp_pdf_path)

        print(f"[{job_id}] Începe chunking-ul multimodal...")
        # GCS_BUCKET_NAME este utilizat în pipeline pentru adăugarea diagramelor/imaginilor
        app_bucket_name = os.getenv("GCS_BUCKET_NAME", bucket_name)
        
        semantic_chunks = pipeline.process_document(
            temp_pdf_path, 
            course_id, 
            storage_client, 
            app_bucket_name, 
            job_id
        )

        total_chunks = len(semantic_chunks)
        print(f"[{job_id}] Începe preluarea datelor AI în paralel pentru {total_chunks} chunk-uri...")

        ai_results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            futures = [executor.submit(fetch_ai_data, c) for c in semantic_chunks]
            for future in concurrent.futures.as_completed(futures):
                try:
                    ai_results.append(future.result())
                except Exception as thread_err:
                    print(f"[{job_id}] Eroare la generarea AI pentru un chunk: {thread_err}")
                    raise thread_err

        print(f"[{job_id}] Date AI preluate. Începe inserarea în PostgreSQL...")

        # 6. Atomicitate: Bloc try-except cu rollback explicit
        with psycopg.connect(DB_DSN) as conn:
            try:
                conn.execute("LOAD 'age';")
                conn.execute("SET search_path = ag_catalog, \"$user\", public;")
                
                with conn.cursor() as cur:
                    for idx, (chunk, embedding_vector, graph_data) in enumerate(ai_results):
                        # Inserare text și embed
                        cur.execute("""
                            INSERT INTO rag_system.document_chunks (job_id, content, embedding, metadata)
                            VALUES (%s, %s, %s, %s)
                        """, (job_id, chunk.page_content, str(embedding_vector), json.dumps(chunk.metadata)))

                        # Inserare noduri graf
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

                        # Inserare muchii graf
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
            except Exception as db_err:
                conn.rollback()
                raise Exception(f"Eroare la inserarea în DB (rollback executat explicit): {db_err}")

        # Finalizarea statusului job-ului
        with psycopg.connect(DB_DSN) as conn:
            conn.execute("""
                UPDATE rag_system.ingestion_jobs
                SET status = 'COMPLETED', progress = 100, updated_at = CURRENT_TIMESTAMP
                WHERE job_id = %s
            """, (job_id,))
            
        print(f"[{job_id}] Procesare completă!")

    except Exception as e:
        print(f"[{job_id}] EROARE FATALĂ: {str(e)}")
        try:
            with psycopg.connect(DB_DSN) as conn:
                conn.execute("""
                    UPDATE rag_system.ingestion_jobs
                    SET status = 'FAILED', error_message = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE job_id = %s
                """, (str(e), job_id))
        except Exception as db_update_err:
            print(f"Nu s-a putut actualiza statusul de eșec în DB: {db_update_err}")
        finally:
            # 4. Terminație cu eroare
            sys.exit(1)
            
    finally:
        try:
            if 'temp_pdf_path' in locals() and os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
        except Exception:
            pass

        try:
            if 'blob' in locals() and blob and blob.exists():
                blob.delete()
        except Exception:
            pass
            
    # 4. Terminație cu succes
    sys.exit(0)

if __name__ == "__main__":
    process_single_execution()