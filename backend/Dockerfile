FROM node:20-bookworm-slim AS deps
WORKDIR /app
# Нужен openssl для Prisma в контейнере.
# Для bcrypt/node-gyp иногда нужен fallback build (python + toolchain),
# если prebuilt бинарник не скачался (таймауты GitHub assets).
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Копируем минимум для postinstall (prisma generate + sync-dosage-vendor)
COPY package*.json ./
COPY prisma ./prisma
COPY scripts ./scripts

# Ставим зависимости со scripts, чтобы собрался bcrypt и сгенерировался Prisma Client.
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/tsconfig.build.json ./tsconfig.build.json
COPY --from=build /app/package.json ./package.json

# uploads нужен для картинок/аватаров/тем/объявлений
RUN mkdir -p /app/uploads/thread /app/uploads/avatars /app/uploads/listings

EXPOSE 3000

# В проде миграции делайте отдельной командой/джобой:
# npx prisma migrate deploy
CMD ["node", "dist/main.js"]

