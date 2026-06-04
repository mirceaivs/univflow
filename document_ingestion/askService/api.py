import uuid
import logging
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from fastapi.responses import StreamingResponse
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from deps import get_embeddings_model, get_llm, get_pro_llm
from config import INTERNAL_API_KEY
from schemas import AskRequest, QuizRequest, Quiz
from services import generate_interaction, clean_text_noise, get_vector_context, get_global_summary

logger = logging.getLogger(__name__)
router = APIRouter()

def verify_internal_access(x_internal_service_key: str = Header(...)):
    if x_internal_service_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid Service Key")

@router.get("/health")
def health_check(_: None = Depends(verify_internal_access)):
    return {"status": "ok"}

@router.post("/api/ask/stop")
async def stop_ask_query(
    request: Request,
    x_user_id: str = Header(..., description="ID student"),
    x_course_id: str = Header(..., description="ID curs"),
    _: None = Depends(verify_internal_access)
):
    combined_id = f"{x_user_id}_{x_course_id}"
    task = request.app.state.active_tasks.get(combined_id)
    if task:
        try:
            task.cancel()
            logger.info(f"Task cancelat cu succes pentru combined_id: {combined_id}")
            return {"status": "cancelled"}
        except Exception as e:
            logger.error(f"Eroare la anularea task-ului pentru {combined_id}: {str(e)}")
            return {"status": "error", "detail": str(e)}
    return {"status": "not_running"}

@router.post("/api/ask")
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
    
    if payload.reasoning_enabled:
        llm = get_pro_llm()
    
    result = await generate_interaction(
        request.app.state.db_pool,
        embeddings_model,
        llm,
        request,
        payload.question,
        x_user_id,
        x_course_id,
        payload.reasoning_enabled
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

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
                WHERE session_id = %s ORDER BY id DESC 
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
    has_fallback = False
    
    if is_general_quiz:
        summary_docs = await get_global_summary(pool, course_id)
        vector_docs = await get_vector_context(pool, embeddings_model, "concepte fundamentale și idei principale", course_id, threshold=0.5)
        all_docs = summary_docs + vector_docs
    else:
        all_docs = await get_vector_context(pool, embeddings_model, f"informații esențiale despre {payload.topic}", course_id, threshold=0.35)
        if not all_docs:
            logger.info(f"No specific chunks found for topic '{payload.topic}'. Falling back to general summary and concepts.")
            summary_docs = await get_global_summary(pool, course_id)
            vector_docs = await get_vector_context(pool, embeddings_model, "concepte fundamentale și idei principale", course_id, threshold=0.35)
            all_docs = summary_docs + vector_docs
            has_fallback = True

    if not all_docs:
        raise HTTPException(status_code=404, detail="Nu am găsit suficiente informații în curs.")
        
    context_text = "\n\n".join([doc.page_content for doc in all_docs])
    multi_select_rule = (
        "2. Întrebările pot avea UNA SAU MAI MULTE variante corecte (multi-select). Setează is_correct=true pentru toate opțiunile valide."
        if payload.allow_multiple_correct 
        else "2. EXACT O SINGURĂ variantă trebuie să fie corectă (single-select), restul false."
    )

    difficulty_guideline = ""
    if payload.difficulty.upper() == "UȘOR":
        difficulty_guideline = "Pentru nivelul UȘOR, generează întrebări directe, de reamintire sau definiții simple din context."
    elif payload.difficulty.upper() == "AVANSAT":
        difficulty_guideline = "Pentru nivelul AVANSAT, generează întrebări de analiză profundă, corelații complexe, scenarii de aplicare sau deducții din context."
    else:
        difficulty_guideline = "Pentru nivelul MEDIU, generează întrebări de înțelegere generală, asocieri logice standard sau interpretări de bază ale conceptelor."

    prompt = f"""Ești un profesor universitar expert și un tutore de învățat. Pe baza contextului furnizat, generează un test grilă cu {payload.num_questions} întrebări despre subiectul: "{payload.topic}".
    NIVEL DE DIFICULTATE: {payload.difficulty.upper()}. {difficulty_guideline}
    REGULI STRICTE DE FORMATARE:
    1. Fiecare întrebare trebuie să aibă EXACT {payload.options_per_question} variante de răspuns.
    2. FEEDBACK OBLIGATORIU: Pentru fiecare variantă de răspuns (atât corecte, cât și greșite), completează câmpul 'feedback' detaliat.
    3. OBLIGATORIU CRITIC: Amestecă ordinea răspunsurilor (NU pune mereu varianta corectă prima). Trebuie să fie distribuit aleator.
    {multi_select_rule}
    4. Toate informațiile trebuie extrase STRICT din contextul furnizat.
    5. LEGĂTURĂ CU CONTEXTUL & FALLBACK: Toate întrebările trebuie să se bazeze EXCLUSIV pe contextul furnizat. Dacă subiectul solicitat ("{payload.topic}") NU este acoperit de contextul furnizat (este complet diferit sau irelevant), NU inventa informații din exterior. În schimb, revino la conceptele generale prezente în context (generează testul pe baza materiei disponibile) și adaugă o notă explicativă succintă la începutul câmpului 'explanation' al primei întrebări (de exemplu: "[Notă: Subiectul solicitat nu este acoperit de materialele cursului. Testul a fost generat pe baza conceptelor generale disponibile.]").
    CONTEXT:\n{context_text}"""
    
    try:
        
        quiz_result = await generate_quiz_with_retry(llm, prompt)
        res_dict = quiz_result.model_dump()
        res_dict["is_fallback"] = has_fallback
        res_dict["topic"] = payload.topic
        return res_dict
        
    except Exception as e:
        logger.error(f"Eroare finală la generarea testului: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Eroare la generarea testului: {str(e)}")