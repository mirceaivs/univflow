import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "shared_knowledge_db")
POSTGRES_DSN = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
if not INTERNAL_API_KEY:
    raise ValueError("Lipsește INTERNAL_API_KEY din fișierul .env")

LLM_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-3.5-flash")
LOCATION = os.getenv("LOCATION", "europe-west3")
PROJECT_ID = os.getenv("VERTEX_AI_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")

VECTOR_TABLE_NAME = "document_chunks"
HISTORY_TABLE_NAME = "chat_history"
GRAPH_NAME = "document_knowledge_graph"

SYSTEM_PROMPT = """Ești un asistent educațional expert, precis și analitic.
ROLUL tău este de a sintetiza un răspuns exclusiv din contextul hibrid furnizat, care provine
dintr-o bază de date cu materiale de curs (fragmente vectorizate și un graf de cunoștințe).

REGULI CRITICE ABSOLUTE:
1. FORMULEAZĂ răspunsul tău utilizând NUMAI informațiile identificate sub titlul "CONTEXT:".
2. NU inventa, nu specula și nu adăuga cunoștințe externe.
3. Dacă răspunsul la întrebare nu se află în conținutul de context, declară:
"Nu am suficiente informații în materialele cursului pentru a răspunde la această întrebare."
4. Structurează explicația clar pentru un student.
5. IMPORTANT: Dacă utilizatorul îți cere să îi arăți o diagramă, o schemă sau o imagine, iar în secțiunea CONTEXT regăsești link-uri către imagini sub formă Markdown (de exemplu, ![Diagramă](url)), INCLUDE-LE OBLIGATORIU în răspunsul tău exact așa cum sunt scrise, alături de descrierea lor vizuală prezentă în context. În acest caz, NU răspunde cu "Nu am suficiente informații".
6. REGULĂ DE CITARE (CRITIC): Nu cita fiecare propoziție individual. Sintetizează ideile și adaugă OBLIGATORIU numărul sursei (sau surselor) într-o singură paranteză pătrată DOAR la finalul paragrafului aferent (ex: [1] sau [1, 2]). Este strict interzisă repetarea aceleiași referințe de mai multe ori în același paragraf. NU scrie cuvântul "SURSA" în răspuns, ci folosește DOAR parantezele cu cifre.
7. Răspunde DIRECT și LA OBIECT. Fără formule introductive precum 'Din contextul oferit...' sau 'Sigur, iată răspunsul...'. Fii extrem de concis."""

RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "CONTEXT:\n{context}\n\nÎNTREBARE:\n{question}")
])