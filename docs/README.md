# RH_TSE Project Documentation

## 📚 Documentation Structure

### 🚀 Quick Start
- [Getting Started](./getting-started.md)
- [Installation Guide](./installation.md)
- [Development Setup](./development.md)

### 🏗️ Architecture
- [System Overview](./architecture/system-overview.md)
- [Database Schema](./architecture/database-schema.md)
- [API Documentation](./api/README.md)
- [Frontend Architecture](./frontend/README.md)
- [Backend Architecture](./backend/README.md)

### 🔧 Development
- [Development Guidelines](./development/guidelines.md)
- [Code Style Guide](./development/code-style.md)
- [Testing Strategy](./development/testing.md)
- [Deployment Guide](./deployment/README.md)

### 📋 Features
- [User Management](./features/user-management.md)
- [Resolution System](./features/resolutions.md)
- [Notification System](./features/notifications.md)
- [Dashboard](./features/dashboard.md)

### 🛠️ Maintenance
- [Troubleshooting](./maintenance/troubleshooting.md)
- [Performance Optimization](./maintenance/performance.md)
- [Security Guidelines](./maintenance/security.md)

## 📁 Project Structure

```
RH_TSE/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App router pages and components
│   ├── components/          # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── providers/          # Context providers
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript type definitions
├── backend/                 # Django backend application
│   ├── apps/               # Django apps
│   │   └── core/           # Main application
│   ├── config/             # Django settings
│   ├── docs/               # Backend documentation
│   └── scripts/            # Utility scripts
├── nginx/                  # Nginx configuration
├── docs/                   # Project documentation
└── docker-compose.yml      # Development environment
```

## 🎯 Key Features

- **Resolution Management**: Complete workflow for managing resolutions
- **User Roles**: Secretary, CEO, Deputy, Executor roles with permissions
- **Real-time Notifications**: WebSocket-based notification system
- **Dashboard Analytics**: Comprehensive statistics and charts
- **File Management**: Attachment system for resolutions
- **Progress Tracking**: Timeline and progress updates

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Chart.js** for data visualization
- **FontAwesome** for icons

### Backend
- **Django 4.2** with REST framework
- **PostgreSQL** database
- **Redis** for caching and WebSockets
- **Celery** for background tasks
- **JWT** authentication

### Infrastructure
- **Docker** containerization
- **Nginx** reverse proxy
- **Docker Compose** for development

## 📈 Project Status

- ✅ Core functionality implemented
- ✅ User authentication and authorization
- ✅ Resolution workflow
- ✅ Dashboard and analytics
- ✅ Real-time notifications
- 🔄 Performance optimization
- 🔄 Enhanced testing
- 🔄 Documentation completion

## 🤝 Contributing

Please read our [Contributing Guidelines](./development/contributing.md) before submitting changes.

## 📄 License

This project is proprietary software. All rights reserved. 