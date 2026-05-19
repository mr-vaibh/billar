FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build
FROM deps AS builder
COPY . .
RUN npm run build

# Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built Next.js output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema, config, seed, and binaries so migrate+seed can run at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Entrypoint runs migrations + seed then starts the server
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && chown nextjs:nodejs docker-entrypoint.sh

# Create data directories
RUN mkdir -p /data/bills /data/templates && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV BILLS_DIR=/data/bills
ENV TEMPLATES_DIR=/data/templates

CMD ["./docker-entrypoint.sh"]
