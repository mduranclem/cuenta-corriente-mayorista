FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

ARG CACHEBUST=7
RUN echo "cachebust=$CACHEBUST"
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY server ./server

EXPOSE 4000
ENV NODE_ENV=production
CMD ["npm", "start"]
