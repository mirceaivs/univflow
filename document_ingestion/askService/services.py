import json
import asyncio
import uuid
import re
from typing import AsyncGenerator, List, Any
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage
from langchain_postgres.chat_message_histories import PostgresChatMessageHistory
from psycopg_pool import AsyncConnectionPool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_vertexai import VertexAIEmbeddings
from config import GRAPH_NAME, HISTORY_TABLE_NAME, RAG_PROMPT

async def get_graph_context(pool: AsyncConnectionPool, question: str, course_id: str) -> str:
    cypher_query = f"""
        SELECT a::text
        FROM cypher('{GRAPH_NAME}', $$
            MATCH (n:Entity)-[r]->(m:Entity)
            WHERE n.course_id = '{course_id}'
            AND (toLower(n.label) CONTAINS toLower($keyword) OR toLower(m.label) CONTAINS toLower($keyword))
            RETURN {{source: n.id, relation: type(r), target: m.id}}
        $$, %s) AS (a agtype)
        LIMIT 10;
    """
    keywords = [word for word in question.split() if len(word) > 4]
    if not keywords: return ""
        
    graph_results = []
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(cypher_query, (json.dumps({"keyword": keywords[0]}),))
            rows = await cur.fetchall()
            for row in rows:
                try:
                    parsed_edge = json.loads(row[0].replace("'", '"')) if isinstance(row[0], str) else row[0]
                    src = parsed_edge.get("source", "N/A")
                    rel = parsed_edge.get("relation", "asociat")
                    tgt = parsed_edge.get("target", "N/A")
                    graph_results.append(f"{src} --> {rel} --> {tgt}")
                except Exception:
                    continue
    if graph_results:
        return "RELAȚII CONCEPTUALE EXTRASE DIN GRAF:\n" + "\n".join(graph_results)
    return ""

async def get_vector_context(pool: AsyncConnectionPool, embeddings_model: VertexAIEmbeddings, question: str, course_id: str) -> List[Document]:
    query_embedding = await embeddings_model.aembed_query(question)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT content, metadata 
                FROM rag_system.document_chunks 
                WHERE metadata->>'course_id' = %s 
                ORDER BY embedding <=> %s::vector 
                LIMIT 5
            """, (course_id, str(query_embedding)))
            rows = await cur.fetchall()
            return [Document(page_content=row[0], metadata=row[1]) for row in rows]


async def get_global_summary(pool: AsyncConnectionPool, course_id: str) -> List[Document]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT content, metadata 
                FROM rag_system.document_chunks 
                WHERE metadata->>'course_id' = %s 
                AND metadata->>'is_global_summary' = 'True'
                LIMIT 1
            """, (course_id,))
            rows = await cur.fetchall()
            return [Document(page_content=row[0], metadata=row[1]) for row in rows]

async def get_recent_history(pool: AsyncConnectionPool, session_id: str) -> List[Any]:
    async with pool.connection() as conn:
        history_store = PostgresChatMessageHistory(HISTORY_TABLE_NAME, session_id, async_connection=conn)
        messages = await history_store.aget_messages()
        return messages[-6:] if len(messages) > 6 else messages

async def persist_chat_interaction(pool: AsyncConnectionPool, session_id: str, user_q: str, ai_a: str, citations: List[dict]):
    async with pool.connection() as conn:
        history_store = PostgresChatMessageHistory(HISTORY_TABLE_NAME, session_id, async_connection=conn)
        human_msg = HumanMessage(content=user_q)
        ai_msg = AIMessage(content=ai_a, additional_kwargs={"citations": citations})
        await history_store.aadd_messages([human_msg, ai_msg])

async def sse_interaction_generator(
    db_pool: AsyncConnectionPool,
    embeddings_model: VertexAIEmbeddings,
    llm: ChatGoogleGenerativeAI,
    request_obj,
    question: str,
    user_id: str,
    course_id: str
) -> AsyncGenerator[str, None]:
    pool = db_pool
    
    combined_id = f"{user_id}_{course_id}"
    session_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, combined_id)) 

    
    task_vector = asyncio.create_task(get_vector_context(pool, embeddings_model, question, course_id))
    task_graph = asyncio.create_task(get_graph_context(pool, question, course_id))
    task_history = asyncio.create_task(get_recent_history(pool, session_id))
    task_summary = asyncio.create_task(get_global_summary(pool, course_id))

    vector_results, graph_text, chat_context, summary_results = await asyncio.gather(
        task_vector, task_graph, task_history, task_summary
    )
    
    citations_collection = []
    filtered_citations = []
    hybrid_knowledge_body = ""
    current_source_idx = 1

    
    if summary_results:
        summary_doc = summary_results[0]
        hybrid_knowledge_body += f"--- REZUMAT GLOBAL CURS (VIZIUNE DE ANSAMBLU) ---\nSURSA [{current_source_idx}]:\n{summary_doc.page_content}\n\n"
        citations_collection.append({
            "id": current_source_idx,
            "source_file": summary_doc.metadata.get("source_file", "Rezumat Global"), 
            "header": summary_doc.metadata.get("header", "Viziune de Ansamblu"), 
            "course_id": course_id,
            "text_extras": summary_doc.page_content 
        })
        current_source_idx += 1

    
    if vector_results:
        hybrid_knowledge_body += "--- FRAGMENTE SPECIFICE DIN MATERIE ---\n"
        compiled_texts = []
        for doc in vector_results:
            compiled_texts.append(f"SURSA [{current_source_idx}]:\n{doc.page_content}")
            meta = doc.metadata
            citations_collection.append({
                "id": current_source_idx,
                "source_file": meta.get("source_file", "Fișier necunoscut"), 
                "header": meta.get("header", "Secțiune generică"), 
                "course_id": course_id,
                "text_extras": doc.page_content 
            })
            current_source_idx += 1
        hybrid_knowledge_body += "\n\n".join(compiled_texts)
    
    
    if graph_text: 
        hybrid_knowledge_body += f"\n\n--- RELAȚII CONCEPTUALE ---\nSURSA [{current_source_idx}] (GRAF DE CUNOȘTINȚE):\n{graph_text}"
        citations_collection.append({
            "id": current_source_idx,
            "source_file": "Graf de Cunoștințe (AI)",
            "header": "Relații Conceptuale",
            "course_id": course_id,
            "text_extras": graph_text
        })

    chain = RAG_PROMPT | llm
    full_ai_response = ""

    try:
        async for chunk in chain.astream({"context": hybrid_knowledge_body, "question": question, "chat_history": chat_context}):
            if await request_obj.is_disconnected(): break
            
            chunk_text = ""
            if isinstance(chunk.content, list):
                for item in chunk.content:
                    if isinstance(item, dict) and "text" in item: chunk_text += item["text"]
                    elif isinstance(item, str): chunk_text += item
            else:
                chunk_text = str(chunk.content)

            full_ai_response += chunk_text
            yield f"data: {json.dumps({'text': chunk_text}, ensure_ascii=False)}\n\n"

        
        used_ids = set()
        citation_matches = re.findall(r'\[(?:SURSA\s*)?\d+(?:[\s,]*(?:SURSA\s*)?\d+)*\]', full_ai_response, re.IGNORECASE)
        for match in citation_matches:
            nums = re.findall(r'\d+', match)
            used_ids.update([int(n) for n in nums])
            
        
        if used_ids:
            filtered_citations = [c for c in citations_collection if c['id'] in used_ids]
        else:
            filtered_citations = []

        
        yield f"event: citation\ndata: {json.dumps({'citations': filtered_citations}, ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"
        
    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
    finally:
        if full_ai_response.strip() and not await request_obj.is_disconnected():
            asyncio.create_task(persist_chat_interaction(pool, session_id, question, full_ai_response, filtered_citations))

def clean_text_noise(text: str) -> str:
    if not text: 
        return ""
        
    
    text = re.sub(r'[^\w\s\.,;:\?!\[\]\(\)\-\+\*\/\\%="\'\|#_`]', '', text)
    
    
    text = re.sub(r'[ \t]{2,}', ' ', text)
    
    
    text = re.sub(r'Indecși Cuprins \d+', '', text, flags=re.IGNORECASE) 
    
    return text.strip() 