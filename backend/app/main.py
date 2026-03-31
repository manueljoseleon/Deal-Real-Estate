from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.api import properties, analysis, scraper, mercado


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(properties.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(scraper.router, prefix="/api/v1")
app.include_router(mercado.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "version": settings.app_version}
