CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS age;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Încărcăm extensia în sesiunea curentă de inițializare
LOAD 'age';

-- Creăm schema dedicată pentru componentele RAG înainte de configurarea căilor
CREATE SCHEMA IF NOT EXISTS rag_system;

-- Setăm search_path permanent la nivel de bază de date și utilizator dedicat
-- Include ag_catalog (pentru grafuri), rag_system (pentru chunk-uri vectoriale) și public
ALTER DATABASE shared_knowledge_db SET search_path TO ag_catalog, rag_system, "$user", public;
ALTER USER enterprise_admin SET search_path TO ag_catalog, rag_system, "$user", public;

-- Aplicăm și pentru sesiunea curentă de execuție a scriptului
SET search_path = ag_catalog, rag_system, "$user", public;

-- Inițializăm graful de cunoștințe hibrid
SELECT create_graph('document_knowledge_graph');

-- Crearea tabelelor în schema rag_system
CREATE TABLE IF NOT EXISTS rag_system.ingestion_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    progress INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_queue 
ON rag_system.ingestion_jobs(status, created_at) 
WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS rag_system.document_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES rag_system.ingestion_jobs(job_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index avansat HNSW pentru căutarea semantică rapidă a vectorilor (Cosine Distance)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON rag_system.document_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS rag_system.chat_history (
   id         serial primary key,
   session_id uuid not null, 
   message    jsonb not null,   
   created_at timestamp with time zone default current_timestamp
);

CREATE INDEX IF NOT EXISTS idx_chat_history_session 
ON rag_system.chat_history (session_id);