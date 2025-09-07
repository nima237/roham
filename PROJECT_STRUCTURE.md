# RH_TSE Project Structure Guide

## 📁 Root Directory Structure

```
RH_TSE/
├── 📁 frontend/              # Next.js frontend application
├── 📁 backend/               # Django backend application
├── 📁 nginx/                 # Nginx configuration
├── 📁 ldap/                  # LDAP configuration and data
├── 📁 docs/                  # Project documentation
├── 📁 certs/                 # SSL certificates for database
├── 📄 docker-compose.yml     # Development environment
├── 📄 docker-compose.prod.yml # Production environment
├── 📄 deploy.sh              # Deployment script
├── 📄 build.ps1              # Windows build script
├── 📄 build.sh               # Linux build script
├── 📄 start_docker.ps1       # Windows Docker startup script
├── 📄 setup_ldap.ps1         # LDAP setup script (Windows)
├── 📄 setup_ldap.py          # LDAP setup script (Python)
├── 📄 DEPLOYMENT.md          # Deployment guide
├── 📄 POSITION_MANAGEMENT_GUIDE.md # Position management guide
├── 📄 NOTIFICATION_SYSTEM_GUIDE.md # Notification system docs
├── 📄 DOCKER_SETUP_GUIDE.md  # Docker setup guide
├── 📄 README.md              # Main project README
├── 📄 users.csv              # User data for import
├── 📄 ldap_users.json        # LDAP user data
└── 📄 .gitignore             # Git ignore rules
```

## 🎯 Frontend Structure (`frontend/`)

```
frontend/
├── 📁 app/                   # Next.js App Router
│   ├── 📁 components/        # Reusable UI components
│   │   ├── 📁 ui/           # Base UI components
│   │   ├── 📄 Breadcrumb.tsx
│   │   ├── 📄 EditUserModal.tsx
│   │   ├── 📄 NotificationBadge.tsx
│   │   ├── 📄 NotificationModal.tsx
│   │   ├── 📄 NotificationSettings.tsx
│   │   ├── 📄 NotificationSystem.tsx
│   │   ├── 📄 NotificationTest.tsx
│   │   ├── 📄 Pagination.tsx
│   │   ├── 📄 ProtectedRoute.tsx
│   │   ├── 📄 SkeletonLoader.tsx
│   │   ├── 📄 Toast.tsx
│   │   └── 📄 TopBar.tsx
│   ├── 📁 dashboard/         # Dashboard pages
│   │   ├── 📁 calendar/      # Calendar functionality
│   │   ├── 📁 meetings/      # Meeting management
│   │   ├── 📁 resolutions/   # Resolution management
│   │   ├── 📁 settings/      # User settings
│   │   ├── 📁 users/         # User management
│   │   ├── 📁 workbench/     # Workbench functionality
│   │   ├── 📄 layout.tsx     # Dashboard layout
│   │   └── 📄 page.tsx       # Dashboard main page
│   ├── 📁 hooks/             # Custom React hooks
│   │   └── 📄 useWebSocket.ts
│   ├── 📁 providers/         # Context providers
│   │   ├── 📄 NotificationContext.tsx
│   │   ├── 📄 NotificationModalProvider.tsx
│   │   └── 📄 WebSocketProvider.tsx
│   ├── 📁 utils/             # Utility functions
│   │   └── 📄 api.ts         # API utilities
│   ├── 📁 types/             # TypeScript definitions
│   ├── 📄 layout.tsx         # Root layout
│   ├── 📄 page.tsx           # Home page
│   └── 📄 globals.css        # Global styles
├── 📁 public/                # Static assets
│   ├── 📁 icons/             # Icon files
│   └── 📁 images/            # Image files
├── 📁 tests/                 # Test files
├── 📄 package.json           # Dependencies
├── 📄 next.config.js         # Next.js config
├── 📄 tailwind.config.js     # Tailwind config
├── 📄 tsconfig.json          # TypeScript config
└── 📄 Dockerfile             # Frontend container
```

## 🔧 Backend Structure (`backend/`)

```
backend/
├── 📁 apps/                  # Django applications
│   └── 📁 core/              # Main application
│       ├── 📁 management/    # Django management commands
│       │   └── 📁 commands/  # Custom commands
│       ├── 📁 migrations/    # Database migrations
│       ├── 📁 services/      # Business logic services
│       │   ├── 📄 notification_service.py
│       │   └── 📄 websocket_service.py
│       ├── 📁 tests/         # Test files
│       ├── 📄 admin.py       # Django admin configuration
│       ├── 📄 auth.py        # Authentication backend
│       ├── 📄 celery.py      # Celery configuration
│       ├── 📄 consumers.py   # WebSocket consumers
│       ├── 📄 middleware.py  # Custom middleware
│       ├── 📄 models.py      # Database models
│       ├── 📄 routing.py     # WebSocket routing
│       ├── 📄 serializers.py # DRF serializers
│       ├── 📄 tasks.py       # Celery tasks
│       ├── 📄 urls.py        # URL routing
│       └── 📄 views.py       # API views (3670 lines)
├── 📁 config/                # Django settings
│   ├── 📄 settings.py        # Main settings
│   ├── 📄 urls.py            # Root URL config
│   ├── 📄 asgi.py           # ASGI configuration
│   └── 📄 wsgi.py           # WSGI configuration
├── 📁 docs/                  # Backend documentation
├── 📁 scripts/               # Utility scripts
├── 📁 data/                  # Data files
├── 📁 media/                 # User uploaded files
├── 📁 static/                # Static files
├── 📁 staticfiles/           # Collected static files
├── 📄 manage.py              # Django management
├── 📄 requirements.txt       # Python dependencies
├── 📄 Dockerfile             # Backend container
└── 📄 setup.py               # Package setup
```

## 🐳 Infrastructure Structure

```
nginx/
├── 📄 nginx.conf             # Main nginx configuration (HTTPS enabled)
├── 📄 openssl.cnf            # SSL configuration
└── 📁 ssl/                   # SSL certificates for web server
    ├── 📄 server.crt         # Web server certificate
    └── 📄 server.key         # Web server private key

certs/
├── 📄 ca.crt                 # Certificate authority for database
├── 📄 server.crt             # Database server certificate
└── 📄 server.key             # Database server private key

ldap/
├── 📁 ldif/                  # LDAP data files
│   ├── 📄 01-ou-people.ldif  # People organizational unit
│   ├── 📄 02-ou-groups.ldif  # Groups organizational unit
│   ├── 📄 03-group-secretary.ldif # Secretary group
│   ├── 📄 04-group-ceo.ldif  # CEO group
│   ├── 📄 05-group-executor.ldif # Executor group
│   ├── 📄 06-user-admin.ldif # Admin user
│   ├── 📄 07-user-secretary.ldif # Secretary user
│   ├── 📄 08-user-ceo.ldif   # CEO user
│   └── 📄 09-user-executor.ldif # Executor user
```

## 📚 Documentation Structure

```
Root Directory:
├── 📄 README.md              # Main project overview
├── 📄 PROJECT_STRUCTURE.md   # This file - detailed structure
├── 📄 DOCKER_SETUP_GUIDE.md  # Docker setup and usage guide
├── 📄 DEPLOYMENT.md          # Production deployment guide
├── 📄 POSITION_MANAGEMENT_GUIDE.md # User position management
├── 📄 NOTIFICATION_SYSTEM_GUIDE.md # Notification system docs
└── 📁 docs/                  # Additional documentation
    ├── 📄 README.md          # Documentation index
    ├── 📁 user_import/       # User import documentation
    ├── 📄 database-quick-reference.md
    └── 📄 database-structure.md
```

## 🎯 Key Files to Know

### Frontend
- `frontend/app/dashboard/page.tsx` - Main dashboard
- `frontend/app/dashboard/resolutions/[public_id]/page.tsx` - Resolution detail page
- `frontend/app/dashboard/resolutions/add/page.tsx` - Add resolution page
- `frontend/app/dashboard/resolutions/edit/[public_id]/page.tsx` - Edit resolution page
- `frontend/app/dashboard/meetings/page.tsx` - Meetings list page
- `frontend/app/dashboard/workbench/page.tsx` - User workbench
- `frontend/app/components/NotificationSystem.tsx` - Notification system
- `frontend/app/utils/api.ts` - API utilities

### Backend
- `backend/apps/core/views.py` - All API views
- `backend/apps/core/models.py` - Database models
- `backend/apps/core/serializers.py` - API serializers
- `backend/apps/core/services/notification_service.py` - Notification service
- `backend/config/settings.py` - Django settings

### Infrastructure
- `nginx/nginx.conf` - Main nginx configuration with HTTPS
- `docker-compose.yml` - Development environment
- `docker-compose.prod.yml` - Production environment
- `certs/` - Database SSL certificates
- `nginx/ssl/` - Web server SSL certificates

## 🔄 Recent Improvements

### 1. **Infrastructure Cleanup**
- ✅ Single nginx configuration file
- ✅ Removed duplicate configuration files
- ✅ Streamlined SSL certificate structure
- ✅ Cleaned up redundant documentation

### 2. **Authentication System**
- LDAP integration for user authentication
- Role-based access control (RBAC)
- Position management system

### 3. **Notification System**
- Real-time notifications via WebSocket
- Email notifications
- Browser push notifications
- Notification preferences

### 4. **Resolution Management**
- Complete CRUD operations for resolutions
- Status tracking and workflow
- File attachments support
- Progress tracking

### 5. **User Interface**
- Modern React/Next.js frontend
- Responsive design with Tailwind CSS
- Persian language support
- Toast notifications and modals

## 🚀 Development Workflow

1. **Frontend Development**: Work in `frontend/app/`
2. **Backend Development**: Work in `backend/apps/core/`
3. **Database Changes**: Create migrations in `backend/apps/core/migrations/`
4. **API Changes**: Update views in `backend/apps/core/views.py`
5. **Configuration**: Update settings in `backend/config/settings.py`
6. **LDAP Setup**: Use scripts in root directory (`setup_ldap.ps1`, `setup_ldap.py`)
7. **Docker Management**: Use `docker-compose.yml` for development

## 📋 File Naming Conventions

- **React Components**: PascalCase (e.g., `NotificationSystem.tsx`)
- **Pages**: kebab-case (e.g., `[public_id]/page.tsx`)
- **Python Files**: snake_case (e.g., `notification_service.py`)
- **Django Models**: PascalCase (e.g., `Resolution`, `UserProfile`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

## 🔍 Finding Code

- **API Endpoints**: Search in `backend/apps/core/views.py`
- **Database Models**: Look in `backend/apps/core/models.py`
- **Frontend Pages**: Browse `frontend/app/dashboard/`
- **Components**: Check `frontend/app/components/`
- **Utilities**: See `frontend/app/utils/` and `backend/apps/core/services/`
- **LDAP Configuration**: Check `ldap/` directory and setup scripts
- **Nginx Configuration**: Check `nginx/nginx.conf`
- **Documentation**: Browse root directory `.md` files

## 🎯 Quick Start

1. **Setup Environment**:
   ```bash
   # Start Docker containers
   docker-compose up -d
   
   # Setup LDAP (Windows)
   .\setup_ldap.ps1
   
   # Or setup LDAP (Python)
   python setup_ldap.py
   ```

2. **Access Services**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - LDAP Admin: http://localhost:8080
   - HTTPS: https://localhost (with SSL)

3. **Test Users**:
   - admin / admin123 (Administrator)
   - secretary1 / secretary123 (Secretary)
   - ceo1 / ceo123 (CEO)
   - executor1 / executor123 (Executor)

## 🔐 SSL Certificate Structure

### Web Server (nginx/ssl/):
- `server.crt` - Web server SSL certificate
- `server.key` - Web server private key
- Used by nginx for HTTPS connections

### Database (certs/):
- `ca.crt` - Certificate authority
- `server.crt` - Database server certificate  
- `server.key` - Database server private key
- Used by SQL Server for encrypted connections

## 📝 Notes

- **Single nginx config**: All configurations consolidated into `nginx/nginx.conf`
- **Dual SSL setup**: Separate certificates for web server and database
- **Clean structure**: Removed duplicate and redundant files
- **Comprehensive docs**: Essential guides without duplication 