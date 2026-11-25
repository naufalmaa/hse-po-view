import os
from dotenv import load_dotenv

# Base directory of csms-ai
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# 1. Check explicit ENV_FILE (e.g. ENV_FILE=.env.production or full path)
env_file = os.getenv("ENV_FILE")

# 2. Check CSMS_ENV / APP_ENV / NODE_ENV (e.g. CSMS_ENV=production -> .env.production)
if not env_file:
    env_name = os.getenv("CSMS_ENV") or os.getenv("APP_ENV") or os.getenv("NODE_ENV")
    if env_name:
        candidate = os.path.join(BASE_DIR, f".env.{env_name}")
        if os.path.exists(candidate):
            env_file = candidate

# 3. Fallback to default .env
if not env_file:
    env_file = os.path.join(BASE_DIR, ".env")
elif not os.path.isabs(env_file):
    env_file = os.path.join(BASE_DIR, env_file)

if os.path.exists(env_file):
    # override=False preserves env variables already set explicitly in environment
    load_dotenv(env_file, override=False)

CSMS_AI_HOST = os.getenv("CSMS_AI_HOST", "0.0.0.0")
CSMS_AI_PORT = int(os.getenv("CSMS_AI_PORT", "8000"))

# WAJIB: tidak ada bawaan ke DB lain, supaya engine tidak diam-diam membaca database yang salah.
DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    raise SystemExit(
        "[CSMS-AI] DATABASE_URL belum di-set. Isi di file env (lihat .env.example) "
        f"atau environment. File env yang dibaca: {env_file}"
    )

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/api/chat")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
# VLLM_BASE_URL lama: tidak dipakai lagi (diganti LLM_<PERAN>_ENDPOINT, lihat engine/providers/provider_factory.py)
VLLM_BASE_URL = os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1/chat/completions")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "qllama/bge-large-en-v1.5:latest")

EMBEDDING_DIMENSIONS = 1536  # Target dimensi untuk schema DB (vector(1536))

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "../uploads")

