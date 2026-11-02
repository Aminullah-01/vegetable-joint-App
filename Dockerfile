# ==============================================================================
# Vegetable Joint — Production Multi-Stage Dockerfile (Source §43)
# Stage 1: Build production React application with production settings
# Stage 2: Serve static build through hardened Nginx web server
# ==============================================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install clean dependencies
RUN npm ci

# Copy source code and environment definitions
COPY . .

# Build for production with production env settings
ENV VITE_APP_ENV=production
ENV VITE_USE_MOCK_DATA=false
ENV VITE_API_BASE_URL=https://api.vegetablejoint.ng/api/v1
ENV VITE_SANCTUM_CSRF_URL=https://api.vegetablejoint.ng/sanctum/csrf-cookie
RUN npm run build:prod

# --- Stage 2: Production Static Host ---
FROM nginx:alpine

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
