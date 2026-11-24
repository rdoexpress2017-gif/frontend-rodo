# ==========================================
# Stage 1: Build React + Vite SPA Bundle
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

# URL pública do backend exposto na internet na VPS (ex: http://SEU_IP_VPS:8080/api/v1 ou /api/v1 via Ingress Traefik K3s)
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Static Server
# ==========================================
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
