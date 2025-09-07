# Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Git installed
- At least 2GB RAM available

## Quick Start (Local Testing)

1. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd RH_TSE
   ```

2. **Create environment file:**
   ```bash
   cp backend/env.example .env
   # Edit .env with your values
   ```

3. **Run deployment script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Manual Deployment

### 1. Environment Setup
Create `.env` file in project root:
```bash
cp backend/env.example .env
```

Edit `.env` with your production values:
```env
# Django Settings
DEBUG=False
DJANGO_SECRET_KEY=your-super-secret-key-here
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database Settings
POSTGRES_DB=tse_db
POSTGRES_USER=tse_user
POSTGRES_PASSWORD=your-secure-password
POSTGRES_HOST=db
POSTGRES_PORT=5433

# CORS Settings
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 2. Deploy with Docker Compose
```bash
# Stop existing services
docker-compose -f docker-compose.prod.yml down

# Build and start
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Verify Deployment
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- Database: localhost:5433

## Production Considerations

### Security
- ✅ Change default passwords
- ✅ Use strong SECRET_KEY
- ✅ Set DEBUG=False
- ✅ Configure ALLOWED_HOSTS
- ✅ Set up CORS properly
- ✅ Use HTTPS in production

### Performance
- ✅ Static files collected
- ✅ Database migrations run
- ✅ Gunicorn for production
- ✅ Restart policies set

### Monitoring
- Health checks configured
- Logs available via `docker-compose logs`
- Database persistence with volumes

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :8000
   netstat -tulpn | grep :3000
   ```

2. **Database connection issues:**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.prod.yml logs db
   ```

3. **Build failures:**
   ```bash
   # Clean and rebuild
   docker-compose -f docker-compose.prod.yml down
   docker system prune -f
   docker-compose -f docker-compose.prod.yml build --no-cache
   ```

### Useful Commands
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Access container shell
docker-compose -f docker-compose.prod.yml exec backend bash

# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U tse_user tse_db > backup.sql
```

## Server Deployment

For server deployment, follow these additional steps:

1. **Install Docker on server**
2. **Clone repository**
3. **Set up environment variables**
4. **Run deployment script**
5. **Configure reverse proxy (nginx)**
6. **Set up SSL certificates**
7. **Configure firewall**

Example nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
``` 