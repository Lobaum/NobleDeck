import os
import sys
from pathlib import Path

_DIRETORIO_BACKEND = str(Path(__file__).resolve().parent.parent)
if _DIRETORIO_BACKEND not in sys.path:
    sys.path.insert(0, _DIRETORIO_BACKEND)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.banco import inicializar_banco
from app.rotas import auth, produtos, estoque, pedidos


def _obter_origens_permitidas() -> list[str]:
    origens = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    for chave_host in ("VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
        host = (os.environ.get(chave_host) or "").strip()
        if host:
            url = host if host.startswith(("http://", "https://")) else f"https://{host}"
            if url not in origens:
                origens.append(url)
    extras = (os.environ.get("ALLOWED_ORIGINS") or "").strip()
    if extras:
        for item in extras.split(","):
            url = item.strip()
            if url and url not in origens:
                origens.append(url)
    return origens


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
    allow_origins=_obter_origens_permitidas(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(produtos.router)
app.include_router(estoque.router)
app.include_router(pedidos.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)