FROM node:22-slim

WORKDIR /app/multiplayer

COPY multiplayer/package.json multiplayer/package-lock.json ./
RUN npm ci --omit=dev

COPY multiplayer/*.js ./
COPY multiplayer/handlers/ ./handlers/
COPY tools/ai-agent/package.json tools/ai-agent/package-lock.json /app/tools/ai-agent/
RUN npm ci --omit=dev --prefix /app/tools/ai-agent
COPY tools/ai-agent/src/ /app/tools/ai-agent/src/

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
