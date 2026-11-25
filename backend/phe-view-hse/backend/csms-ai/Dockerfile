# csms-ai (FastAPI, penilaian AI CSMS). Dibangun dari folder backend/phe-view-hse/backend/csms-ai.
#   docker build -t hse-proview-csms-ai backend/phe-view-hse/backend/csms-ai
# Image besar (PaddleOCR + OpenCV). LLM TIDAK ikut di image: arahkan LLM_*_ENDPOINT ke server model.
FROM python:3.11-slim
# libgl1/libglib2.0-0/libgomp1: OpenCV + PaddleOCR. unar: baca lampiran .rar. poppler-utils: utilitas PDF. curl: healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 unar poppler-utils curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home --uid 1001 app \
 && mkdir -p /data/uploads outputs reports \
 && chown -R app:app /app /data
USER app
ENV PYTHONUNBUFFERED=1 \
    CSMS_ENV=production \
    CSMS_AI_HOST=0.0.0.0 \
    CSMS_AI_PORT=8001 \
    UPLOADS_DIR=/data/uploads
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${CSMS_AI_PORT}/health" || exit 1
CMD ["sh", "-c", "python -m server.scripts.ensure_schema && python -m server.main"]
