# Backend HSE Proview (Fastify). Dibangun dari folder backend/phe-view-hse/backend.
#   docker build -t hse-proview-backend backend/phe-view-hse/backend
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Puppeteer tidak mengunduh Chrome sendiri; image memakai Chromium dari Debian (lihat tahap runtime).
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
# chromium + font: export PDF laporan harian. curl: healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-dejavu-core fonts-liberation curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    CHROME_PATH=/usr/bin/chromium \
    HOST=0.0.0.0 \
    PORT=5142 \
    UPLOADS_DIR=/data/uploads
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
EXPOSE 5142
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/public/health" || exit 1
CMD ["node", "src/server.js"]
