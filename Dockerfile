# syntax=docker/dockerfile:1

FROM node:20-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN npm install

FROM dependencies AS build
WORKDIR /app

COPY frontend ./frontend
RUN npm run build --workspace frontend

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=5000
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN npm install --omit=dev && npm cache clean --force

COPY --chown=node:node backend ./backend
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/backend/uploads && chown -R node:node /app/backend

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start", "--workspace", "backend"]
