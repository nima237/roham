#!/usr/bin/env python3
"""
LDAP Setup Script for RH TSE
This script helps setup and test LDAP server
"""

import subprocess
import time
import sys
import os

def run_command(command, description):
    """Run a command and return the result"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            if result.stdout:
                print(f"Output: {result.stdout}")
        else:
            print(f"❌ {description} failed")
            if result.stderr:
                print(f"Error: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running command: {e}")
        return False

def check_docker():
    """Check if Docker is running"""
    return run_command("docker --version", "Checking Docker installation")

def start_ldap():
    """Start LDAP server"""
    print("\n🚀 Starting LDAP server...")
    
    # Stop any existing containers
    run_command("docker-compose down", "Stopping existing containers")
    
    # Start LDAP server
    success = run_command("docker-compose up -d ldap", "Starting LDAP server")
    
    if success:
        print("\n⏳ Waiting for LDAP server to initialize...")
        time.sleep(10)
        
        # Check if LDAP is running
        success = run_command("docker ps | grep ldap", "Checking LDAP container status")
        
        if success:
            print("\n✅ LDAP server is running!")
            print("📋 LDAP Server Details:")
            print("   - Server: localhost:389")
            print("   - Admin DN: cn=admin,dc=rh-tse,dc=local")
            print("   - Admin Password: admin123")
            print("   - User Base: ou=people,dc=rh-tse,dc=local")
            print("   - Group Base: ou=groups,dc=rh-tse,dc=local")
            
            print("\n👥 Available Users:")
            print("   - admin / admin123 (Administrator)")
            print("   - secretary1 / secretary123 (Secretary)")
            print("   - ceo1 / ceo123 (CEO)")
            print("   - executor1 / executor123 (Executor)")
            
            return True
        else:
            print("❌ LDAP server failed to start properly")
            return False
    else:
        print("❌ Failed to start LDAP server")
        return False

def test_ldap_connection():
    """Test LDAP connection"""
    print("\n🔍 Testing LDAP connection...")
    
    # Test with ldapsearch if available
    test_command = """
    docker exec rh_tse-ldap ldapsearch -x -H ldap://localhost:389 -D "cn=admin,dc=rh-tse,dc=local" -w admin123 -b "dc=rh-tse,dc=local" "(objectClass=*)" dn
    """
    
    return run_command(test_command, "Testing LDAP connection")

def install_ldap_dependencies():
    """Install LDAP dependencies for Django"""
    print("\n📦 Installing LDAP dependencies...")
    
    # Install python-ldap
    success = run_command("pip install python-ldap==3.4.3", "Installing python-ldap")
    
    if success:
        print("✅ LDAP dependencies installed successfully")
        return True
    else:
        print("❌ Failed to install LDAP dependencies")
        return False

def main():
    """Main setup function"""
    print("🔧 RH TSE LDAP Setup Script")
    print("=" * 40)
    
    # Check Docker
    if not check_docker():
        print("❌ Docker is not available. Please install Docker first.")
        sys.exit(1)
    
    # Install dependencies
    if not install_ldap_dependencies():
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Start LDAP
    if not start_ldap():
        print("❌ Failed to start LDAP server")
        sys.exit(1)
    
    # Test connection
    if not test_ldap_connection():
        print("⚠️  LDAP connection test failed, but server might still be working")
    
    print("\n🎉 LDAP setup completed!")
    print("\n📝 Next steps:")
    print("1. Start your Django backend")
    print("2. Try logging in with the provided credentials")
    print("3. Check Django logs for any LDAP authentication issues")

if __name__ == "__main__":
    main()
