# Stage 1: build React app
FROM node:20-alpine AS builder
WORKDIR /app
# Copy lockfile too so dependency installation can be cached.
# Use npm ci for deterministic installs based on package-lock.json.
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
