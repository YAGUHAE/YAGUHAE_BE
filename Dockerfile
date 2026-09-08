# syntax=docker/dockerfile:1

# 1) 빌드용 의존성 설치 (devDependencies 포함)
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 2) 애플리케이션 빌드
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 3) 런타임 의존성만 설치 (이미지 크기 축소)
FROM node:24-alpine AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# husky 등 devDependencies 전용 prepare 스크립트가 --prod 설치에서 실행되면
# "husky: not found" 로 실패하므로 런타임 의존성 단계에서는 스크립트를 건너뛴다.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# 4) 런타임
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# node 이미지에 기본 포함된 비루트 사용자로 실행
USER node

EXPOSE 4000
CMD ["node", "dist/main"]
