#!/bin/sh
set -e
# Đảm bảo node_modules được cài khi volume mount ghi đè
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "Installing dependencies..."
  npm install
fi
# Build CSS (admin + frontend) trước khi chạy app
echo "Building CSS..."
npm run build:css
exec "$@"
