import json
import asyncio
import uuid
import re
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

async def get_graph_context(pool: AsyncConnectionPool, question: str, course_id: str, keywords: List[str] = None, reasoning_enabled: bool = False) -> str:
    """Caută relații conceptuale în graful de cunoștințe folosind keywords pre-extrase."""
    if not keywords:
        return ""

    if reasoning_enabled:
        cypher_query = f"""
            SELECT a::text
            FROM cypher('{GRAPH_NAME}', $$
                MATCH (n:Entity)-[r1]-(m1:Entity)-[r2]-(m2:Entity)-[r3]-(m3:Entity)
                WHERE n.course_id = '{course_id}'
                AND (
                    any(k IN $keywords WHERE toLower(n.id) CONTAINS toLower(k)) OR 
                    any(k IN $keywords WHERE toLower(n.label) CONTAINS toLower(k))
                )
                RETURN {{source: n.id, rel1: r1.type, node1: m1.id, rel2: r2.type, node2: m2.id, rel3: r3.type, target: m3.id}}
            $$, %s) AS (a agtype)
            LIMIT 35;
        """
    else:
        cypher_query = f"""
            SELECT a::text
            FROM cypher('{GRAPH_NAME}', $$
                MATCH (n:Entity)-[r]-(m:Entity)
                WHERE n.course_id = '{course_id}'
                AND (
                    any(k IN $keywords WHERE toLower(n.id) CONTAINS toLower(k)) OR 
                    any(k IN $keywords WHERE toLower(m.id) CONTAINS toLower(k)) OR 
                    any(k IN $keywords WHERE toLower(n.label) CONTAINS toLower(k)) OR 
                    any(k IN $keywords WHERE toLower(m.label) CONTAINS toLower(k))
                )
                RETURN {{source: n.id, relation: r.type, target: m.id}}
            $$, %s) AS (a agtype)
            LIMIT 25;
        """

    graph_results = []
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(cypher_query, (json.dumps({"keywords": keywords}),))
            rows = await cur.fetchall()
            for row in rows:
                try:
                    parsed_edge = json.loads(row[0].replace("'", '"')) if isinstance(row[0], str) else row[0]
                    if reasoning_enabled:
                        src = parsed_edge.get("source", "N/A")
                        rel1 = parsed_edge.get("rel1", "asociat")
                        n1 = parsed_edge.get("node1", "N/A")
                        rel2 = parsed_edge.get("rel2", "asociat")
                        n2 = parsed_edge.get("node2", "N/A")
                        rel3 = parsed_edge.get("rel3", "asociat")
                        tgt = parsed_edge.get("target", "N/A")
                        graph_results.append(f"[{src}] --> {rel1} --> [{n1}] --> {rel2} --> [{n2}] --> {rel3} --> [{tgt}]")
                    else:
                        src = parsed_edge.get("source", "N/A")
                        rel = parsed_edge.get("relation", "asociat")
                        tgt = parsed_edge.get("target", "N/A")
                        graph_results.append(f"{src} --> {rel} --> {tgt}")
                except Exception:
                    continue
                    
    graph_results = list(dict.fromkeys(graph_results))
    
    if graph_results:
        return "RELAȚII CONCEPTUALE EXTRASE DIN GRAF:\n" + "\n".join(graph_results)
    return ""

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

async def get_vector_context(pool: AsyncConnectionPool, embeddings_model: "VertexAIEmbeddings", question: str, course_id: str) -> List[Document]:
    query_embedding = await embeddings_model.aembed_query(question)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT content, metadata, embedding <=> %s::vector AS distance
                FROM rag_system.document_chunks 
                WHERE metadata->>'course_id' = %s 
                AND metadata->>'is_global_summary' IS DISTINCT FROM 'True'
                ORDER BY embedding <=> %s::vector 
                LIMIT 20
            """, (str(query_embedding), course_id, str(query_embedding)))
            rows = await cur.fetchall()
            return [
                Document(page_content=row[0], metadata=row[1]) 
                for row in rows 
                if row[2] < 0.35 and len(row[0].strip()) > 50
            ]

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

async def sse_interaction_generator(
    db_pool: AsyncConnectionPool,
    embeddings_model: "VertexAIEmbeddings",
    llm: "ChatGoogleGenerativeAI",
    request_obj,
    question: str,
    user_id: str,
    course_id: str,
    reasoning_enabled: bool = False
) -> AsyncGenerator[str, None]:
    pool = db_pool
    
    combined_id = f"{user_id}_{course_id}"
    session_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, combined_id)) 

    chat_context = await get_recent_history(pool, session_id)

    search_query, graph_keywords = await asyncio.gather(
        rewrite_question_with_context(llm, question, chat_context),
        extract_graph_keywords(llm, question)
    )

    task_vector = asyncio.create_task(get_vector_context(pool, embeddings_model, search_query, course_id))
    task_graph = asyncio.create_task(get_graph_context(pool, search_query, course_id, keywords=graph_keywords, reasoning_enabled=reasoning_enabled))
    task_summary = asyncio.create_task(get_global_summary(pool, course_id))

    vector_results, graph_text, summary_results = await asyncio.gather(
        task_vector, task_graph, task_summary
    )
    
    citations_collection = []
    filtered_citations = []
    hybrid_knowledge_body = ""
    current_source_idx = 1

    
    if summary_results:
        hybrid_knowledge_body += "--- REZUMAT GLOBAL CURS (VIZIUNE DE ANSAMBLU) ---\n"
        for summary_doc in summary_results:
            hybrid_knowledge_body += f"SURSA [{current_source_idx}]:\n{summary_doc.page_content}\n\n"
            citations_collection.append({
                "id": current_source_idx,
                "source_file": summary_doc.metadata.get("source_file", "Rezumat Global"), 
                "header": summary_doc.metadata.get("header", "Viziune de Ansamblu"), 
                "course_id": course_id,
                "text_extras": re.sub(r'<ai_vision_description>.*?</ai_vision_description>', '', summary_doc.page_content, flags=re.DOTALL | re.IGNORECASE)
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
                "text_extras": re.sub(r'<ai_vision_description>.*?</ai_vision_description>', '', doc.page_content, flags=re.DOTALL | re.IGNORECASE)
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
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            error_msg = "Sistemul AI este foarte solicitat momentan (Rate Limit). Te rugăm să încerci din nou în câteva secunde."
        yield f"event: error\ndata: {json.dumps({'error': error_msg}, ensure_ascii=False)}\n\n"
    finally:
        if full_ai_response.strip() and not await request_obj.is_disconnected():
            asyncio.create_task(persist_chat_interaction(pool, session_id, question, full_ai_response, filtered_citations))

def clean_text_noise(text: str) -> str:
    if not text: 
        return ""
        
    text = re.sub(r'<ai_vision_description>.*?</ai_vision_description>', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    text = re.sub(r'[^\w\s\.,;:\?!\[\]\(\)\-\+\*\/\\%="\'\|#_`<>]', '', text)
    
    text = re.sub(r'[ \t]{2,}', ' ', text)
    
    text = re.sub(r'Indecși Cuprins \d+', '', text, flags=re.IGNORECASE) 
    
    return text.strip() 