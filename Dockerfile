# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
# node:22-bookworm-slim instead of alpine: the deployment host cannot reach
# Docker Hub reliably, and slim is the Node 22 variant it already caches.
# Both tags are official images, so CI pulls them unchanged.
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Install dependencies from the lockfile only, so this layer is cached until
# package.json / package-lock.json change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the sources and produce the static bundle in dist/.
COPY . .
RUN npm run build


# ---- Runtime stage --------------------------------------------------------
# nginx:alpine is the official rolling tag — same config contract as the
# previous 1.27 pin, reachable from both CI and the deployment host.
FROM nginx:alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

# nginx:alpine already runs as root to bind :80 and then drops to nginx workers.
CMD ["nginx", "-g", "daemon off;"]
