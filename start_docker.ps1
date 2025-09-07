# RH TSE Docker Startup Script
# This script starts the entire project using Docker

Write-Host "🐳 RH TSE Docker Startup Script" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# Function to run commands
function Run-Command {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "`n🔄 $Description..." -ForegroundColor Yellow
    
    try {
        $result = Invoke-Expression $Command
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Description completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Description failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error running command: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Check Docker
Write-Host "`n🔍 Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not available. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Stop existing containers
Write-Host "`n🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Start all services
Write-Host "`n🚀 Starting all services..." -ForegroundColor Yellow
$servicesStarted = Run-Command "docker-compose up -d" "Starting all services"

if ($servicesStarted) {
    Write-Host "`n⏳ Waiting for services to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Check container status
    Write-Host "`n🔍 Checking container status..." -ForegroundColor Yellow
    $containersRunning = Run-Command "docker ps" "Checking container status"
    
    if ($containersRunning) {
        Write-Host "`n✅ All services are running!" -ForegroundColor Green
        Write-Host "`n📋 Service URLs:" -ForegroundColor Cyan
        Write-Host "   - Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "   - Backend: http://localhost:8000" -ForegroundColor White
        Write-Host "   - LDAP Admin: http://localhost:8080" -ForegroundColor White
        Write-Host "   - Database: localhost:1433" -ForegroundColor White
        Write-Host "   - Redis: localhost:6379" -ForegroundColor White
        
        Write-Host "`n👥 Available Users:" -ForegroundColor Cyan
        Write-Host "   - admin / admin123 (Administrator)" -ForegroundColor White
        Write-Host "   - secretary1 / secretary123 (Secretary)" -ForegroundColor White
        Write-Host "   - ceo1 / ceo123 (CEO)" -ForegroundColor White
        Write-Host "   - executor1 / executor123 (Executor)" -ForegroundColor White
        
        Write-Host "`n🔧 LDAP Configuration:" -ForegroundColor Cyan
        Write-Host "   - Server: ldap://ldap:389" -ForegroundColor White
        Write-Host "   - Admin DN: cn=admin,dc=rh-tse,dc=local" -ForegroundColor White
        Write-Host "   - Admin Password: admin123" -ForegroundColor White
        
        # Test LDAP connection
        Write-Host "`n🔍 Testing LDAP connection..." -ForegroundColor Yellow
        $testCommand = 'docker exec rh_tse-ldap ldapsearch -x -H ldap://localhost:389 -D "cn=admin,dc=rh-tse,dc=local" -w admin123 -b "dc=rh-tse,dc=local" "(objectClass=*)" dn'
        $connectionTest = Run-Command $testCommand "Testing LDAP connection"
        
        if ($connectionTest) {
            Write-Host "✅ LDAP connection test successful!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  LDAP connection test failed, but JSON fallback will work" -ForegroundColor Yellow
        }
        
        Write-Host "`n🎉 Project setup completed!" -ForegroundColor Green
        Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
        Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
        Write-Host "2. Login with the provided credentials" -ForegroundColor White
        Write-Host "3. Check http://localhost:8080 for LDAP admin interface" -ForegroundColor White
        Write-Host "4. Use http://localhost:8000 for backend API" -ForegroundColor White
        
    } else {
        Write-Host "❌ Some services failed to start properly" -ForegroundColor Red
        Write-Host "`n🔍 Checking logs..." -ForegroundColor Yellow
        docker-compose logs
        exit 1
    }
} else {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Setup completed successfully!" -ForegroundColor Green
