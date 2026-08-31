# Bakeio WhatsApp worker.
# One long-lived process holding a WhatsApp socket per connected bakery.
# Run exactly one instance: two would fight over the same WhatsApp sessions.

FROM node:20-slim

WORKDIR /app

# Install dependencies first so image layers cache between deploys.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
