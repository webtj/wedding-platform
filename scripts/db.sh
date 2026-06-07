#!/bin/bash
# Start Prisma Studio on port 5556 (skip if already running)

PORT=5556

if lsof -i :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "✅ Prisma Studio 已在运行: http://localhost:$PORT"
  exit 0
fi

echo "🌱 启动 Prisma Studio..."
cd "$(dirname "$0")/../wedding-platform-api" || exit 1
npx prisma studio --port "$PORT" --browser none
