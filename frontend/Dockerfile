FROM node:20-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
ARG API_INTERNAL_BASE_URL=http://api:8000/api
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV API_INTERNAL_BASE_URL=${API_INTERNAL_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

CMD ["npm", "run", "start"]
