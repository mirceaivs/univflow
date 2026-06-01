import platform
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from psycopg_pool import AsyncConnectionPool

from config import POSTGRES_DSN, PROJECT_ID, LOCATION, LLM_MODEL_NAME
from api import router

if platform.system() == "Windows":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def configure_postgres_connection(conn):
    async with conn.cursor() as cur:
        await cur.execute("LOAD 'age';")
        await cur.execute('SET search_path = ag_catalog, rag_system, "$user", public;')
    await conn.commit()

async def check_postgres_connection(conn):
    async with conn.cursor() as cur:
        await cur.execute("SELECT 1;")

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = AsyncConnectionPool(
        conninfo=POSTGRES_DSN,
        min_size=2,
        max_size=20,
        open=False,
        configure=configure_postgres_connection,
        check=check_postgres_connection
    )
    await pool.open()
    app.state.db_pool = pool
    app.state.active_tasks = {}

    yield 
    await app.state.db_pool.close()

app = FastAPI(title="Stateless RAG Ask Service", lifespan=lifespan)
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)