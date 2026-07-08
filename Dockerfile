FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# 构建期无数据库连接，静态化阶段的 DB 探测失败是非致命的
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 迁移由 K8s initContainer 执行：npx drizzle-kit migrate
CMD ["npm", "start"]
