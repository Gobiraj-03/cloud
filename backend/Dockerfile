# ==============================================================================
# AssetFlow — IT Asset Lifecycle & Software License Management System
# Production Dockerfile for Node.js / Express Backend
# Target Platform: Amazon ECS (Express Mode) / AWS Fargate / AWS App Runner
# ==============================================================================

# 1. Base image: Official Node.js 20 LTS (Bookworm Slim)
# Selected for security, glibc compatibility with prebuilt drivers, and minimal image size.
FROM node:20-bookworm-slim

# 2. Metadata labels
LABEL maintainer="AssetFlow Team"
LABEL description="Production container for AssetFlow Express.js Backend API"
LABEL version="1.0.0"

# 3. Environment configuration
# Default to production, bind to 0.0.0.0, default port 5000
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    NPM_CONFIG_LOGLEVEL=warn

# 4. Install curl for container health checking and apply security updates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 5. Set container working directory
WORKDIR /app

# 6. Copy dependency specifications first to leverage Docker layer caching
COPY package*.json ./

# 7. Install production dependencies only
# --omit=dev excludes test libraries (supertest) and unnecessary tooling
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# 8. Copy application source code
# Note: Sensitive files, .env, SQLite databases, and tests are excluded via .dockerignore
COPY server.js ./
COPY src/ ./src/

# 9. Set proper file ownership and switch to non-root user for security hardening
RUN chown -R node:node /app
USER node

# 10. Expose application port
EXPOSE 5000

# 11. Container Healthcheck compatible with GET /api/health
# Returns 0 when healthy (HTTP 200), non-zero on failure (HTTP 503 or unreachable)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

# 12. Container entrypoint using existing production startup command
CMD ["npm", "start"]
