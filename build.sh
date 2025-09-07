#!/bin/bash

echo "🚀 Starting optimized build process..."

# Stop containers
echo "📦 Stopping containers..."
docker-compose down

# Clean up dangling images before build
echo "🧹 Cleaning up dangling images..."
docker image prune -f

# Build with cache optimization
echo "🔨 Building containers with cache optimization..."
docker-compose build

# Start containers
echo "🚀 Starting containers..."
docker-compose up -d

# Clean up dangling images after build
echo "🧹 Final cleanup of dangling images..."
docker image prune -f

echo "✅ Build completed successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost/api/" 