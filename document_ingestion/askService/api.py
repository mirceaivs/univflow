import uuid
import logging
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from fastapi.responses import StreamingResponse
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from deps import get_embeddings_model, get_llm
from config import INTERNAL_API_KEY
from schemas import AskRequest, QuizRequest, Quiz
from services import sse_interaction_generator, clean_text_noise, get_vector_context, get_global_summary

logger = logging.getLogger(__name__)
router = APIRouter()

def verify_internal_access(x_internal_service_key: str = Header(...)):
    if x_internal_service_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid Service Key")

@router.get("/health")
def health_check(_: None = Depends(verify_internal_access)):
    return {"status": "ok"}

@router.post("/api/ask/stream")
async def handle_ask_query(
    request: Request,
    payload: AskRequest,
    x_user_id: str = Header(..., description="ID student"),
    x_course_id: str = Header(..., description="ID curs"),
    embeddings_model: "VertexAIEmbeddings" = Depends(get_embeddings_model),
    llm: "ChatGoogleGenerativeAI" = Depends(get_llm),
    _: None = Depends(verify_internal_access)
):

    if not payload.question.strip(): raise HTTPException(status_code=400, detail="Întrebare goală.")
    return StreamingResponse(
        sse_interaction_generator(
            request.app.state.db_pool,
            embeddings_model,
            llm,
            request,
            payload.question,
            x_user_id,
            x_course_id
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
    )

@router.get("/api/ask/history/{course_id}")
async def get_paginated_history(
    request: Request,
    course_id: str,
    page: int = 0,
    size: int = 20,
    x_user_id: str = Header(..., alias="X-User-Id"),
    _: None = Depends(verify_internal_access)
):
    combined_id = f"{x_user_id}_{course_id}"
    session_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, combined_id))
    offset = page * size 
    pool = request.app.state.db_pool 
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT message FROM rag_system.chat_history 
                WHERE session_id = %s ORDER BY created_at DESC 
                LIMIT %s OFFSET %s
            """, (session_id, size, offset))
            rows = await cur.fetchall()

    clean_messages = []
    for row in rows:
        msg_data = row[0].get("data", {})
        raw_citations = msg_data.get("additional_kwargs", {}).get("citations", [])
        clean_citations = [{
            "id": c.get("id"),
            "header": c.get("header"),
            "course_id": c.get("course_id"),
            "source_file": c.get("source_file"),
            "text_extras": clean_text_noise(c.get("text_extras", "")) 
        } for c in raw_citations]

        clean_messages.append({
            "role": msg_data.get("type"),
            "content": clean_text_noise(msg_data.get("content")), 
            "citations": clean_citations
        })
    
    return {"session_id": session_id, "page": page, "size": len(clean_messages), "messages": clean_messages}







def is_429_error(exception: Exception) -> bool:
    err_str = str(exception)
    return "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    before_sleep=lambda retry_state: logger.warning(
        f"API Google blocat (probabil 429). Reîncercăm: Atacul {retry_state.attempt_number}..."
    )
)
async def generate_quiz_with_retry(llm, prompt):
    
    structured_llm = llm.with_structured_output(schema=Quiz, method="json_schema")
    return await structured_llm.ainvoke(prompt)


@router.post("/api/quiz/{course_id}/generate")
async def generate_quiz(
    request: Request,
    course_id: str,
    payload: QuizRequest,
    x_user_id: str = Header(..., alias="X-User-Id"),
    embeddings_model: "VertexAIEmbeddings" = Depends(get_embeddings_model),
    llm: "ChatGoogleGenerativeAI" = Depends(get_llm),
    _: None = Depends(verify_internal_access)
):
    pool = request.app.state.db_pool
    
    
    is_general_quiz = not payload.topic or payload.topic.strip().lower() == "conceptele principale"
    
    all_docs = []
    
    if is_general_quiz:
        
        summary_docs = await get_global_summary(pool, course_id)
        
        
        vector_docs = await get_vector_context(pool, embeddings_model, "concepte fundamentale și idei principale", course_id)
        
        
        all_docs = summary_docs + vector_docs
    else:
        
        all_docs = await get_vector_context(pool, embeddings_model, f"informații esențiale despre {payload.topic}", course_id)

    if not all_docs:
        raise HTTPException(status_code=404, detail="Nu am găsit suficiente informații în curs.")
        
    context_text = "\n\n".join([doc.page_content for doc in all_docs])
    multi_select_rule = (
        "2. Întrebările pot avea UNA SAU MAI MULTE variante corecte (multi-select). Setează is_correct=true pentru toate opțiunile valide."
        if payload.allow_multiple_correct 
        else "2. EXACT O SINGURĂ variantă trebuie să fie corectă (single-select), restul false."
    )

    prompt = f"""Ești un profesor universitar expert și un tutore de învățat. Pe baza contextului furnizat, generează un test grilă cu {payload.num_questions} întrebări despre subiectul: "{payload.topic}".
    NIVEL DE DIFICULTATE: {payload.difficulty.upper()}.
    REGULI STRICTE DE FORMATARE:
    1. Fiecare întrebare trebuie să aibă EXACT {payload.options_per_question} variante de răspuns.
    2. FEEDBACK OBLIGATORIU: Pentru fiecare variantă de răspuns (atât corecte, cât și greșite), completează câmpul 'feedback' detaliat.
    3. OBLIGATORIU CRITIC: Amestecă ordinea răspunsurilor (NU pune mereu varianta corectă prima). Trebuie să fie distribuit aleator.
    {multi_select_rule}
    4. Toate informațiile trebuie extrase STRICT din contextul furnizat.
    CONTEXT:\n{context_text}"""
    
    try:
        
        quiz_result = await generate_quiz_with_retry(llm, prompt)
        return quiz_result.model_dump()
        
    except Exception as e:
        logger.error(f"Eroare finală la generarea testului: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Eroare la generarea testului: {str(e)}")