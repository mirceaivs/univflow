from functools import lru_cache
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai.embeddings import GoogleGenerativeAIEmbeddings
from config import PROJECT_ID, LOCATION, LLM_MODEL_NAME

@lru_cache(maxsize=1)
def get_embeddings_model() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-005",
        project=PROJECT_ID,
        location=LOCATION
    )

@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=LLM_MODEL_NAME,
        project=PROJECT_ID,
        location=LOCATION,
        temperature=0.4,
        streaming=True,
        max_retries=2
    )
