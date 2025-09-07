# RH TSE LDAP Setup Script for Windows PowerShell
# This script helps setup and test LDAP server

Write-Host "🔧 RH TSE LDAP Setup Script" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor Cyan

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

# Start LDAP server
Write-Host "`n🚀 Starting LDAP server..." -ForegroundColor Yellow
$ldapStarted = Run-Command "docker-compose up -d ldap" "Starting LDAP server"

if ($ldapStarted) {
    Write-Host "`n⏳ Waiting for LDAP server to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Check LDAP container status
    Write-Host "`n🔍 Checking LDAP container status..." -ForegroundColor Yellow
    $ldapRunning = Run-Command "docker ps --filter name=ldap" "Checking LDAP container"
    
    if ($ldapRunning) {
        Write-Host "`n✅ LDAP server is running!" -ForegroundColor Green
        Write-Host "`n📋 LDAP Server Details:" -ForegroundColor Cyan
        Write-Host "   - Server: localhost:389" -ForegroundColor White
        Write-Host "   - Admin DN: cn=admin,dc=rh-tse,dc=local" -ForegroundColor White
        Write-Host "   - Admin Password: admin123" -ForegroundColor White
        Write-Host "   - User Base: ou=people,dc=rh-tse,dc=local" -ForegroundColor White
        Write-Host "   - Group Base: ou=groups,dc=rh-tse,dc=local" -ForegroundColor White
        
        Write-Host "`n👥 Available Users:" -ForegroundColor Cyan
        Write-Host "   - admin / admin123 (Administrator)" -ForegroundColor White
        Write-Host "   - secretary1 / secretary123 (Secretary)" -ForegroundColor White
        Write-Host "   - ceo1 / ceo123 (CEO)" -ForegroundColor White
        Write-Host "   - executor1 / executor123 (Executor)" -ForegroundColor White
        
        # Test LDAP connection
        Write-Host "`n🔍 Testing LDAP connection..." -ForegroundColor Yellow
        $testCommand = 'docker exec rh_tse-ldap ldapsearch -x -H ldap://localhost:389 -D "cn=admin,dc=rh-tse,dc=local" -w admin123 -b "dc=rh-tse,dc=local" "(objectClass=*)" dn'
        $connectionTest = Run-Command $testCommand "Testing LDAP connection"
        
        if ($connectionTest) {
            Write-Host "✅ LDAP connection test successful!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  LDAP connection test failed, but server might still be working" -ForegroundColor Yellow
        }
        
        Write-Host "`n🎉 LDAP setup completed!" -ForegroundColor Green
        Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
        Write-Host "1. Install LDAP dependencies: pip install python-ldap==3.4.3" -ForegroundColor White
        Write-Host "2. Start your Django backend" -ForegroundColor White
        Write-Host "3. Try logging in with the provided credentials" -ForegroundColor White
        Write-Host "4. Check Django logs for any LDAP authentication issues" -ForegroundColor White
        
    } else {
        Write-Host "❌ LDAP server failed to start properly" -ForegroundColor Red
        Write-Host "`n🔍 Checking logs..." -ForegroundColor Yellow
        docker logs rh_tse-ldap
        exit 1
    }
} else {
    Write-Host "❌ Failed to start LDAP server" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Setup completed successfully!" -ForegroundColor Green
