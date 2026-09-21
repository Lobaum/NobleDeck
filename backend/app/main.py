import sys
from pathlib import Path

_DIRETORIO_BACKEND = str(Path(__file__).resolve().parent.parent)
if _DIRETORIO_BACKEND not in sys.path:
    sys.path.insert(0, _DIRETORIO_BACKEND)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.banco import inicializar_banco
from app.rotas import auth, produtos, estoque, pedidos, torneios


@asynccontextmanager
async def lifespan(app: FastAPI):
    inicializar_banco()
    yield

app = FastAPI(
    title="API",
    description="(FastAPI + POO)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(produtos.router)
app.include_router(estoque.router)
app.include_router(pedidos.router)
app.include_router(torneios.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)