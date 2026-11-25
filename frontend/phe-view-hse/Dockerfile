# Frontend HSE Proview (React + Vite), disajikan nginx. Dibangun dari folder frontend/phe-view-hse.
#   docker build -t hse-proview-frontend --build-arg VITE_APP_BASE_URL=https://hse.contoh.id frontend/phe-view-hse
# VITE_* dibaca saat BUILD: ganti nilainya = build ulang image.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Kosong = API diakses lewat origin yang sama (nginx di bawah meneruskan /api dan /uploads ke backend).
ARG VITE_APP_BASE_URL=""
ARG VITE_APP_VARIANT=""
ARG VITE_FEATURE_TUTORIAL="true"
ENV VITE_APP_BASE_URL=${VITE_APP_BASE_URL} \
    VITE_APP_VARIANT=${VITE_APP_VARIANT} \
    VITE_FEATURE_TUTORIAL=${VITE_FEATURE_TUTORIAL} \
    VITE_APP_ENV_MODE=release
RUN npx vite build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
