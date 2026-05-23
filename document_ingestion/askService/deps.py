from functools import lru_cache
import os
from google.oauth2 import service_account
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai.embeddings import GoogleGenerativeAIEmbeddings
from config import PROJECT_ID, LOCATION, LLM_MODEL_NAME

@lru_cache(maxsize=1)
def get_credentials():
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if credentials_path and os.path.exists(credentials_path):
        return service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
    else:
        import google.auth
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        return credentials

@lru_cache(maxsize=1)
def get_embeddings_model() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-005",
        project=PROJECT_ID,
        location=LOCATION,
        credentials=get_credentials()
    )

@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=LLM_MODEL_NAME,
        project=PROJECT_ID,
        location=LOCATION,
        credentials=get_credentials(),
        temperature=0.4,
        streaming=True,
        max_retries=2
    )
