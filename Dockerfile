# Multi-stage Docker build for Dream2Play AI

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve using the backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "backend/server.js"]
