FROM node:16-alpine AS deps

ENV NODE_ENV production

RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:16-alpine AS runner

ENV NODE_ENV production
ENV PORT 5234

USER node
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY . .

CMD ["node", "index.mjs"]