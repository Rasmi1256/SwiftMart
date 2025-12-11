FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies separately to cache the layer
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile


# --- Stage 2: Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application
# Note: Ensure all necessary environment variables (e.g., API_BASE_URL) 
# are set during this build step if they are consumed at build time.
RUN npx next build


# --- Stage 3: Production Server Stage ---
# Use a minimal runtime environment
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment variables for Next.js runtime
ENV NODE_ENV production
# Set the port Next.js will listen on (e.g., 3000)
ENV PORT 3000

# Copy Next.js configuration files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# If you use firebase:
# RUN apk add --no-cache bash

EXPOSE 3000

# Next.js production start command
CMD ["npx", "next", "start"]
