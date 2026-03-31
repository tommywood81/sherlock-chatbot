"""
FastAPI application: load model at startup, mount API routes.
"""
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import LOG_LEVEL, PROJECT_ROOT
from .model import load_model
from .routes import infer, evaluation, model_card, chat

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Sherlock Holmes Chatbot API",
    description="LLM inference and evaluation API for the Sherlock model",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(infer.router)
app.include_router(evaluation.router)
app.include_router(model_card.router)
app.include_router(chat.router)


@app.on_event("startup")
def startup():
    """Load the GGUF model once at startup."""
    try:
        load_model()
    except Exception as e:
        logger.exception("Failed to load model: %s", e)
        raise


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"service": "sherlock-chatbot-api", "docs": "/docs"}
