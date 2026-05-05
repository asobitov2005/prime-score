FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_ADMIN_API_BASE_URL=/api/admin
ARG ADMIN_API_INTERNAL_BASE_URL=http://api:8000/api/admin
ENV NEXT_PUBLIC_ADMIN_API_BASE_URL=${NEXT_PUBLIC_ADMIN_API_BASE_URL}
ENV ADMIN_API_INTERNAL_BASE_URL=${ADMIN_API_INTERNAL_BASE_URL}
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ARG NEXT_PUBLIC_ADMIN_API_BASE_URL=/api/admin
ARG ADMIN_API_INTERNAL_BASE_URL=http://api:8000/api/admin
ENV NEXT_PUBLIC_ADMIN_API_BASE_URL=${NEXT_PUBLIC_ADMIN_API_BASE_URL}
ENV ADMIN_API_INTERNAL_BASE_URL=${ADMIN_API_INTERNAL_BASE_URL}
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

CMD ["./node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3001"]
