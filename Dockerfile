# VelvetDesk Omnichannel Creator Suite - Production Container
FROM node:22-bookworm-slim

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

# Patch whatsapp-rust-bridge exports for Node.js ESM compatibility
RUN node -e "try { const p = 'node_modules/whatsapp-rust-bridge/package.json'; const fs = require('fs'); const j = JSON.parse(fs.readFileSync(p)); j.main = './dist/index.js'; j.exports = { '.': { import: './dist/index.js', require: './dist/index.js', default: './dist/index.js', types: './dist/index.d.ts' } }; fs.writeFileSync(p, JSON.stringify(j, null, 2)); console.log('whatsapp-rust-bridge patched successfully'); } catch(e){ console.warn(e); }"

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

