FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY server.js state.js state-derivation.js memo-validator.js ./
COPY handlers/ ./handlers/

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
