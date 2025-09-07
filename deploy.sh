#!/bin/bash

# Deployment script for TSE project
set -e

echo "🚀 Starting deployment process..."

# Function to generate a random secret key
generate_secret_key() {
    python -c 'import random; import string; print("".join([random.choice(string.ascii_letters + string.digits + string.punctuation) for _ in range(50)]))'
}

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production file not found. Creating from template..."
    cp backend/env.production.example .env.production
    cp frontend/env.production.example .env.production.frontend
    
    # Generate a secure secret key
    SECRET_KEY=$(generate_secret_key)
    sed -i "s/change-this-to-a-secure-production-key/$SECRET_KEY/" .env.production
    
    echo "📝 New .env.production files have been created"
    echo "⚠️  Please edit .env.production with your production values:"
    echo "   - Set ALLOWED_HOSTS to your domain (${DOMAIN:-62.60.198.100})"
    echo "   - Set CORS_ALLOWED_ORIGINS to your frontend domain"
    echo "   - Update POSTGRES_PASSWORD"
    echo "   - Configure email settings if needed"
    exit 1
fi

# Load and validate environment variables
source .env.production

# Validate required variables
required_vars=(
    "DJANGO_SECRET_KEY"
    "POSTGRES_PASSWORD"
    "ALLOWED_HOSTS"
    "CORS_ALLOWED_ORIGINS"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env.production"
        exit 1
    fi
done

# Check if passwords are default values
if [ "$POSTGRES_PASSWORD" == "change-this-to-secure-production-password" ]; then
    echo "❌ Error: Default database password detected. Please change it in .env.production"
    exit 1
fi

if [[ $DJANGO_SECRET_KEY == *"change-this-to-a-secure-production-key"* ]]; then
    echo "❌ Error: Default Django secret key detected. Please change it in .env.production"
    exit 1
fi

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Validate SSL certificates if HTTPS is enabled
if [ "$SECURE_SSL_REDIRECT" = "True" ]; then
    if [ ! -f "nginx/ssl/selfsigned.crt" ] || [ ! -f "nginx/ssl/selfsigned.key" ]; then
        echo "⚠️  SSL certificates not found. Generating self-signed certificates..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/selfsigned.key \
            -out nginx/ssl/selfsigned.crt \
            -subj "/C=IR/ST=Tehran/L=Tehran/O=TSE/CN=${DOMAIN:-62.60.198.100}"
    fi
fi

echo "✅ Environment validation passed"

# Stop and remove existing containers
echo "🔄 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Clean up old images
echo "🧹 Cleaning up old images..."
docker image prune -f

# Build and start services
echo "🔨 Building services..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "📦 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collect static files
echo "📂 Collecting static files..."
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed successfully!"
echo "🌐 Services are available at:"
echo "   Backend API: https://${DOMAIN:-62.60.198.100}/api"
echo "   Frontend: https://${DOMAIN:-62.60.198.100}"
echo "   Admin: https://${DOMAIN:-62.60.198.100}/admin"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Test all functionality"
echo "   2. Check logs: docker-compose -f docker-compose.prod.yml logs"
echo "   3. Monitor system resources"
echo "   4. Set up SSL certificates if using HTTPS"
echo "   5. Configure backup strategy for database and media files" 