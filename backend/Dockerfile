FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY generator/package.json generator/package.json
COPY frontend/package.json frontend/package.json
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY backend/ ./backend
COPY generator/ ./generator
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/generator/node_modules ./generator/node_modules
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "src/server.js"]