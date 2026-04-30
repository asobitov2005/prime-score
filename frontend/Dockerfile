FROM node:20-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG API_INTERNAL_BASE_URL=http://api:8000/api
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV API_INTERNAL_BASE_URL=${API_INTERNAL_BASE_URL}
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
