# Core Django App

This is the main Django application for the RH_TSE project.

## 📁 File Structure

### 🔧 Core Files
- `models.py` (323 lines) - Database models and relationships
- `views.py` (3670 lines) - API views and endpoints
- `serializers.py` (481 lines) - DRF serializers for API
- `urls.py` (128 lines) - URL routing configuration
- `admin.py` (95 lines) - Django admin customization

### 🔐 Authentication & Security
- `auth.py` (18 lines) - Custom authentication backend
- `middleware.py` (97 lines) - Custom middleware (CSRF, JWT)

### 🔄 Background Tasks
- `celery.py` (14 lines) - Celery configuration
- `tasks.py` (43 lines) - Background task definitions

### 🌐 WebSocket Support
- `consumers.py` (97 lines) - WebSocket consumers
- `routing.py` (6 lines) - WebSocket URL routing

### 🧪 Testing
- `tests/` - Test files and test utilities

### 📊 Management Commands
- `management/commands/` - Custom Django management commands

### 🔧 Services
- `services/` - Business logic services
  - `notification_service.py` - Notification handling
  - `websocket_service.py` - WebSocket utilities

## 🎯 Key Models

### User Management
- `User` - Extended Django user model
- `UserProfile` - User profile information
- `UserRole` - User role definitions

### Resolution System
- `Resolution` - Main resolution model
- `ResolutionAttachment` - File attachments
- `ResolutionProgress` - Progress tracking
- `ResolutionComment` - Comments and notes

### Meeting System
- `Meeting` - Meeting information
- `MeetingParticipant` - Meeting attendees

### Notification System
- `Notification` - User notifications
- `NotificationSettings` - User notification preferences

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/user/` - Current user info

### Resolutions
- `GET /api/resolutions/` - List resolutions
- `POST /api/resolutions/` - Create resolution
- `GET /api/resolutions/{id}/` - Get resolution details
- `PUT /api/resolutions/{id}/` - Update resolution
- `DELETE /api/resolutions/{id}/` - Delete resolution

### Dashboard
- `GET /api/dashboard/stats/` - Dashboard statistics
- `GET /api/dashboard/recent-resolutions/` - Recent resolutions
- `GET /api/dashboard/charts/` - Chart data

### Users
- `GET /api/users/` - List users
- `POST /api/users/` - Create user
- `GET /api/users/{id}/` - Get user details
- `PUT /api/users/{id}/` - Update user

## 🚀 Development Guidelines

### Adding New Models
1. Define the model in `models.py`
2. Create and run migrations
3. Add to admin in `admin.py`
4. Create serializers in `serializers.py`
5. Add views in `views.py`
6. Add URL patterns in `urls.py`

### Adding New API Endpoints
1. Add view function/class in `views.py`
2. Add serializer in `serializers.py`
3. Add URL pattern in `urls.py`
4. Add tests in `tests/`

### Background Tasks
1. Define task in `tasks.py`
2. Import and use in views as needed
3. Configure Celery settings in `celery.py`

## 📋 Code Organization

### Views Organization (views.py)
The views are organized by functionality:
- Lines 1-500: Authentication & User Management
- Lines 501-1000: Resolution Management  
- Lines 1001-1500: Dashboard & Statistics
- Lines 1501-2000: File Management
- Lines 2001-2500: Notification System
- Lines 2501+: API Endpoints & Utilities

### Future Improvements
Consider splitting `views.py` into smaller modules when:
- File exceeds 5000 lines
- Multiple developers work on same file
- Specific functionality needs isolation

## 🔍 Common Patterns

### API Response Format
```python
{
    "success": True,
    "data": {...},
    "message": "Success message"
}
```

### Error Handling
```python
try:
    # Operation
    return Response({"success": True, "data": result})
except Exception as e:
    return Response({"success": False, "error": str(e)}, status=400)
```

### Permission Checks
```python
@permission_classes([IsAuthenticated])
def my_view(request):
    # View logic
```

## 🧪 Testing

### Running Tests
```bash
python manage.py test apps.core.tests
```

### Test Structure
- `tests/test_api.py` - API endpoint tests
- `tests/test_models.py` - Model tests
- `tests/test_views.py` - View tests
- `tests/test_workbench.py` - Workbench tests 