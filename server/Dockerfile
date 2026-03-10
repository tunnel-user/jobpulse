FROM oven/bun:1

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN bun install

# Install Playwright browsers and dependencies
RUN bunx playwright install chromium
RUN bunx playwright install-deps chromium

# Copy source
COPY . .

EXPOSE 3001

CMD ["sh", "-c", "bun api.ts"]