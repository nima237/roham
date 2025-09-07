Write-Host "Starting optimized build process..." -ForegroundColor Green

# Stop containers
Write-Host "Stopping containers..." -ForegroundColor Yellow
docker-compose down

# Remove old images to prevent dangling images
Write-Host "Removing old images..." -ForegroundColor Yellow
docker rmi rh_tse-backend:latest -f 2>$null
docker rmi rh_tse-frontend:latest -f 2>$null

# Clean up dangling images before build
Write-Host "Cleaning up dangling images..." -ForegroundColor Yellow
docker image prune -f

# Build with proper image naming
Write-Host "Building containers..." -ForegroundColor Yellow
docker-compose build

# Start containers
Write-Host "Starting containers..." -ForegroundColor Yellow
docker-compose up -d

# Clean up dangling images after build
Write-Host "Final cleanup of dangling images..." -ForegroundColor Yellow
docker image prune -f

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost/api/" -ForegroundColor Cyan 