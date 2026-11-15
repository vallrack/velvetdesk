# VelvetDesk Omnichannel Creator Suite - Production Container
FROM node:20-bookworm-slim

WORKDIR /app

# Install system dependencies needed for native modules and audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install package dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application sources
COPY . .

# Build Vite frontend assets for static distribution
RUN npm run build

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start 24/7 background worker server (WhatsApp Baileys, Telegram Bot, Pollers, Express API)
CMD ["npm", "start"]

