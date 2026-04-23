FROM node:20-alpine

WORKDIR /app

# Only copy manifest files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy source
COPY agent-broker.js ./

EXPOSE 3402

CMD ["node", "agent-broker.js"]
