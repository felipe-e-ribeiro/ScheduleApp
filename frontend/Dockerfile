FROM node:22-slim AS build
WORKDIR /app

# Vite le VITE_* do ambiente/`.env` no momento do build (fica embutido no
# bundle estatico) -- por isso precisa ser um build arg, nao uma env var de
# runtime do container final.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
