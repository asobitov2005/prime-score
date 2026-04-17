FROM node:20-alpine

WORKDIR /app

ARG NEXT_PUBLIC_ADMIN_API_BASE_URL=http://localhost:8000/api/admin
ARG ADMIN_API_INTERNAL_BASE_URL=http://api:8000/api/admin
ENV NEXT_PUBLIC_ADMIN_API_BASE_URL=${NEXT_PUBLIC_ADMIN_API_BASE_URL}
ENV ADMIN_API_INTERNAL_BASE_URL=${ADMIN_API_INTERNAL_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

CMD ["npm", "run", "start"]
