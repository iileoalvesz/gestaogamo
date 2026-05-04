# Stage 1: Build do React
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Arquivos prontos para o volume compartilhado com nginx
FROM alpine:latest

COPY --from=builder /app/dist /usr/share/nginx/html
