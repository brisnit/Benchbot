# BenchBot production image.
# Built on the official Playwright image so Chromium + all system libraries
# needed for REAL crawling/screenshots are present. Pinned to the same
# Playwright version as package.json to avoid browser/driver mismatches.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first (better layer caching). Include dev deps because
# the Next.js production build needs TypeScript/Tailwind etc. The package's
# postinstall (`playwright install chromium`) ensures the browser matches.
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy the rest of the source and build.
COPY . .
RUN npm run build

# Runtime configuration. Railway injects $PORT; Next reads it automatically.
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Persistent app data (audits + screenshots) lives here — mount a Railway
# volume at /app/.data so it survives redeploys and restarts.
VOLUME ["/app/.data"]

CMD ["npm", "run", "start"]
