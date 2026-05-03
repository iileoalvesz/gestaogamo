# Stage 1: Build do React
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Copia o build para o volume compartilhado com nginx
FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/dist ./dist

CMD ["sh", "-c", "cp -rf /app/dist/. /usr/share/nginx/html/ && echo 'Frontend copiado com sucesso'"]
