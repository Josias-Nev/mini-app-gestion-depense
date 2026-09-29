# syntax=docker/dockerfile:1

# ---- Étape 1 : build du front-end ----
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---- Étape 2 : dépendances du serveur (production uniquement) ----
# better-sqlite3 (dépendance optionnelle) est exclu : l'image utilise
# node:sqlite, le moteur SQLite intégré à Node 22 — aucun build natif requis.
FROM node:22-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --omit=optional --no-audit --no-fund

# ---- Étape 3 : image finale ----
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0 \
    DATA_DIR=/data \
    # L'image sert le site en HTTP simple : désactive le cookie Secure.
    # Passez à "true" (ou supprimez) derrière un reverse proxy HTTPS.
    COOKIE_SECURE=false
    # Définissez JWT_SECRET en production : docker run -e JWT_SECRET=...

WORKDIR /app
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data && chown app:app /data
COPY --from=server-deps --chown=app:app /app/server/node_modules server/node_modules
COPY --chown=app:app server/package.json server/package.json
COPY --chown=app:app server/src server/src
COPY --from=client-build --chown=app:app /app/client/dist client/dist

USER app
EXPOSE 4000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "server/src/index.js"]
