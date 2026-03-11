# Stage 1: builder
FROM oven/bun:1 AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies (layer-cached as long as package.json doesn't change)
COPY package.json ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# Stage 2: runner
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Only copy what the production server needs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static      ./.next/static
COPY --from=builder /app/public            ./public

EXPOSE 3000

# next start in standalone mode, no full node_modules needed
CMD ["bun", "server.js"]
