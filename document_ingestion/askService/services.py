import json
import asyncio
import uuid
import re
import logging

logger = logging.getLogger(__name__)
from typing import AsyncGenerator, List, Any
import time
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage
from psycopg_pool import AsyncConnectionPool
from config import GRAPH_NAME, HISTORY_TABLE_NAME, RAG_PROMPT

async def extract_graph_keywords(llm, question: str) -> List[str]:
    """Extrage până la 4 concepte/entități din întrebare, folosind LLM."""
    if llm:
        try:
            prompt = (
                "Extrage între 1 și 4 concepte/entități esențiale din următoarea întrebare, "
                "la forma de dicționar (nominativ singular). Returnează STRICT conceptele "
                "sub forma unei liste separate prin virgulă, fără nicio altă explicație sau formatare.\n"
                f"Întrebare: {question}"
            )
            resp = await llm.ainvoke([HumanMessage(content=prompt)])
            content = str(resp.content).strip().lower()
            words = [w.strip() for w in content.split(',')]
            extracted = []
            for w in words:
                clean_w = "".join(c for c in w if c.isalnum() or c == '-' or c.isspace()).strip()
                if clean_w and len(clean_w) >= 3:
                    extracted.append(clean_w)
            if extracted:
                return extracted[:4]
        except Exception:
            pass
    return [word.lower() for word in question.split() if len(word) > 4][:3]

async def get_graph_chunks(pool: AsyncConnectionPool, question: str, course_id: str, keywords: List[str] = None) -> List[Document]:
    """Caută noduri legate în graf pe baza cuvintelor cheie și apoi caută textual (ILIKE) fragmentele asociate."""
    if not keywords:
        return []

    clean_keywords = [k.replace("'", "") for k in keywords]
    conds = [f"toLower(n.id) CONTAINS '{k}' OR toLower(n.label) CONTAINS '{k}'" for k in clean_keywords]
    cond_str = " OR ".join(conds)
    
    cypher_query = f"""
        SELECT a::text
        FROM cypher('{GRAPH_NAME}', $$
            MATCH (n:Entity)-[r]-(m:Entity)
            WHERE n.course_id = '{course_id}'
            AND ({cond_str})
            RETURN m.id
        $$) AS (a agtype)
        LIMIT 10;
    """
    
    expanded_concepts = set(clean_keywords)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(cypher_query)
                rows = await cur.fetchall()
                for row in rows:
                    if row[0]:
                        concept = row[0].strip('\"')
                        if len(concept) > 3:
                            expanded_concepts.add(concept.lower())
            except Exception as e:
                logger.error(f"Eroare cypher în get_graph_chunks: {e}")
                
    if not expanded_concepts:
        return []

    ilike_conditions = []
    params = []
    for concept in list(expanded_concepts)[:10]:
        ilike_conditions.append("content ILIKE %s")
        params.append(f"%{concept}%")
    
    if not ilike_conditions:
        return []
        
    ilike_str = " OR ".join(ilike_conditions)
    params.insert(0, course_id)
    
    query = f"""
        SELECT chunk_id, content, metadata
        FROM rag_system.document_chunks
        WHERE metadata->>'course_id' = %s
        AND metadata->>'is_global_summary' IS DISTINCT FROM 'True'
        AND ({ilike_str})
        LIMIT 20
    """
    
    results = []
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, tuple(params))
            rows = await cur.fetchall()
            
            for row in rows:
                content = row[1]
                score = sum(1 for c in expanded_concepts if c in content.lower())
                meta = dict(row[2]) if row[2] else {}
                meta["chunk_id"] = str(row[0])
                meta["graph_score"] = score
                results.append((score, Document(page_content=content, metadata=meta)))
                
    results.sort(key=lambda x: x[0], reverse=True)
    return [res[1] for res in results]

def reciprocal_rank_fusion(vector_list: List[Document], graph_list: List[Document], k: int = 60, top_n: int = 15) -> List[Document]:
    """Aplică Reciprocal Rank Fusion pe două liste de documente care conțin chunk_id în metadata."""
    rrf_scores = {}
    docs_map = {}
    
    for rank, doc in enumerate(vector_list):
        c_id = doc.metadata.get("chunk_id")
        if not c_id:
            continue
        docs_map[c_id] = doc
        rrf_scores[c_id] = rrf_scores.get(c_id, 0.0) + 1.0 / (k + rank + 1)
        
    for rank, doc in enumerate(graph_list):
        c_id = doc.metadata.get("chunk_id")
        if not c_id:
            continue
        docs_map[c_id] = doc
        rrf_scores[c_id] = rrf_scores.get(c_id, 0.0) + 1.0 / (k + rank + 1)
        
    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
    
    fused_docs = []
    for c_id in sorted_ids[:top_n]:
        fused_docs.append(docs_map[c_id])
        
    return fused_docs

async def rewrite_question_with_context(llm, question: str, chat_history: List[Any]) -> str:
    """Rescrie întrebarea utilizatorului încorporând contextul conversațional."""
    if not chat_history:
        return question
    
    history_text = ""
    for msg in chat_history[-4:]:
        role = "Student" if isinstance(msg, HumanMessage) else "Asistent"
        history_text += f"{role}: {msg.content[:300]}\n"
    
    prompt = (
        "Rescrie întrebarea studentului într-o formă autonomă (self-contained) "
        "care încorporează contextul conversației anterioare. "
        "Returnează DOAR întrebarea rescrisă, fără explicații.\n\n"
        f"ISTORIC:\n{history_text}\n"
        f"ÎNTREBARE CURENTĂ: {question}\n"
        f"ÎNTREBARE RESCRISĂ:"
    )
    try:
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        rewritten = str(resp.content).strip()
        return rewritten if len(rewritten) > 5 else question
    except Exception:
        return question

async def get_vector_context(pool: AsyncConnectionPool, embeddings_model: "VertexAIEmbeddings", question: str, course_id: str, threshold: float = 0.35) -> List[Document]:
    query_embedding = await embeddings_model.aembed_query(question)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT chunk_id, content, metadata, embedding <=> %s::vector AS distance
                FROM rag_system.document_chunks 
                WHERE metadata->>'course_id' = %s 
                ORDER BY embedding <=> %s::vector 
                LIMIT 20
            """, (str(query_embedding), course_id, str(query_embedding)))
            rows = await cur.fetchall()
            
            results = []
            for row in rows:
                if row[3] < threshold and len(row[1].strip()) > 50:
                    meta = dict(row[2]) if row[2] else {}
                    meta["chunk_id"] = str(row[0])
                    results.append(Document(page_content=row[1], metadata=meta))
            return results

_global_summary_cache = {}
CACHE_TTL = 300

async def get_global_summary(pool: AsyncConnectionPool, course_id: str) -> List[Document]:
    current_time = time.time()
    if course_id in _global_summary_cache:
        cached_time, cached_result = _global_summary_cache[course_id]
        if current_time - cached_time < CACHE_TTL:
            return cached_result

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT content, metadata 
                FROM rag_system.document_chunks 
                WHERE metadata->>'course_id' = %s 
                AND metadata->>'is_global_summary' = 'True'
            """, (course_id,))
            rows = await cur.fetchall()
            result = [Document(page_content=row[0], metadata=row[1]) for row in rows]
            if result:
                _global_summary_cache[course_id] = (current_time, result)
            return result

async def get_recent_history(pool: AsyncConnectionPool, session_id: str) -> List[Any]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(f"""
                SELECT message FROM rag_system.{HISTORY_TABLE_NAME}
                WHERE session_id = %s
                ORDER BY id DESC LIMIT 6
            """, (session_id,))
            rows = await cur.fetchall()
            
            messages = []
            for row in reversed(rows):
                msg_json = row[0]
                msg_type = msg_json.get("type")
                content = msg_json.get("data", {}).get("content", "")
                if msg_type == "human":
                    messages.append(HumanMessage(content=content))
                elif msg_type == "ai":
                    messages.append(AIMessage(content=content))
            return messages

async def persist_chat_interaction(pool: AsyncConnectionPool, session_id: str, user_q: str, ai_a: str, citations: List[dict]):
    from langchain_postgres.chat_message_histories import PostgresChatMessageHistory
    async with pool.connection() as conn:
        history_store = PostgresChatMessageHistory(HISTORY_TABLE_NAME, session_id, async_connection=conn)
        human_msg = HumanMessage(content=user_q)
        ai_msg = AIMessage(content=ai_a, additional_kwargs={"citations": citations})
        await history_store.aadd_messages([human_msg, ai_msg])

async def generate_interaction(
    db_pool: AsyncConnectionPool,
    embeddings_model: "VertexAIEmbeddings",
    llm: "ChatGoogleGenerativeAI",
    request_obj,
    question: str,
    user_id: str,
    course_id: str,
    reasoning_enabled: bool = False
) -> dict:
    pool = db_pool
    
    current_task = asyncio.current_task()
    combined_id = f"{user_id}_{course_id}"
    if hasattr(request_obj.app.state, "active_tasks"):
        request_obj.app.state.active_tasks[combined_id] = current_task
        
    session_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, combined_id)) 

    chat_context = await get_recent_history(pool, session_id)

    async def get_vector_pipeline():
        rewritten_q = await rewrite_question_with_context(llm, question, chat_context)
        return await get_vector_context(pool, embeddings_model, rewritten_q, course_id)

    async def get_graph_pipeline():
        g_keywords = await extract_graph_keywords(llm, question)
        return await get_graph_chunks(pool, question, course_id, keywords=g_keywords)

    task_vector = asyncio.create_task(get_vector_pipeline())
    task_graph = asyncio.create_task(get_graph_pipeline())

    vector_results, graph_results = await asyncio.gather(
        task_vector, task_graph
    )
    
    fused_results = reciprocal_rank_fusion(vector_results, graph_results, k=60, top_n=15)
    
    citations_collection = []
    filtered_citations = []
    hybrid_knowledge_body = ""
    current_source_idx = 1

    
    if fused_results:
        hybrid_knowledge_body += "--- FRAGMENTE RELEVANTE (RRF) ---\n"
        compiled_texts = []
        for doc in fused_results:
            compiled_texts.append(f"SURSA [{current_source_idx}]:\n{doc.page_content}")
            meta = doc.metadata
            
            # Clean AI vision description safely from citations
            clean_page_content = re.sub(r'<ai_vision_description>.*?(?:</ai_vision_description>|$)', '', doc.page_content, flags=re.DOTALL | re.IGNORECASE)
            clean_page_content = re.sub(r'^.*?</ai_vision_description>', '', clean_page_content, flags=re.DOTALL | re.IGNORECASE)
            clean_page_content = re.sub(r'</?ai_vision_description>', '', clean_page_content, flags=re.IGNORECASE)
            
            citations_collection.append({
                "id": current_source_idx,
                "source_file": meta.get("source_file", "Fișier necunoscut"), 
                "header": meta.get("header", "Secțiune generică"), 
                "course_id": course_id,
                "text_extras": clean_page_content
            })
            current_source_idx += 1
        hybrid_knowledge_body += "\n\n".join(compiled_texts)

    chain = RAG_PROMPT | llm
    full_ai_response = ""

    try:
        response = await chain.ainvoke({"context": hybrid_knowledge_body, "question": question, "chat_history": chat_context})
        
        if isinstance(response.content, list):
            text_parts = []
            for block in response.content:
                if isinstance(block, dict):
                    text_parts.append(block.get("text", ""))
                elif hasattr(block, "text"):
                    text_parts.append(getattr(block, "text"))
                elif isinstance(block, str):
                    text_parts.append(block)
                else:
                    text_parts.append(str(block))
            full_ai_response = "".join(text_parts).strip()
        else:
            full_ai_response = str(response.content).strip()
        
        used_ids = set()
        citation_matches = re.findall(r'\[(?:SURSA\s*)?\d+(?:[\s,]*(?:SURSA\s*)?\d+)*\]', full_ai_response, re.IGNORECASE)
        for match in citation_matches:
            nums = re.findall(r'\d+', match)
            used_ids.update([int(n) for n in nums])
            
        
        if used_ids:
            filtered_citations = [c for c in citations_collection if c['id'] in used_ids]
        else:
            filtered_citations = []

        return {"text": full_ai_response, "citations": filtered_citations}
        
    except asyncio.CancelledError:
        full_ai_response = "Generare oprită de utilizator."
        logger.info(f"Generare oprită de utilizator pentru session_id: {session_id}")
        asyncio.create_task(persist_chat_interaction(pool, session_id, question, full_ai_response, []))
        raise
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            error_msg = "Sistemul AI este foarte solicitat momentan (Rate Limit). Te rugăm să încerci din nou în câteva secunde."
        return {"error": error_msg}
    finally:
        if hasattr(request_obj.app.state, "active_tasks") and request_obj.app.state.active_tasks.get(combined_id) == current_task:
            request_obj.app.state.active_tasks.pop(combined_id, None)

        if full_ai_response.strip() and not await request_obj.is_disconnected():
            asyncio.create_task(persist_chat_interaction(pool, session_id, question, full_ai_response, filtered_citations))

def clean_text_noise(text: str) -> str:
    if not text: 
        return ""
        
    text = re.sub(r'<ai_vision_description>.*?(?:</ai_vision_description>|$)', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'^.*?</ai_vision_description>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'</?ai_vision_description>', '', text, flags=re.IGNORECASE)
    
    text = re.sub(r'[^\w\s\.,;:\?!\[\]\(\)\-\+\*\/\\%="\'\|#_`<>]', '', text)
    
    text = re.sub(r'[ \t]{2,}', ' ', text)
    
    text = re.sub(r'Indecși Cuprins \d+', '', text, flags=re.IGNORECASE) 
    
    return text.strip() 