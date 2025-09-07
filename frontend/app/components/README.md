# Frontend Components

This directory contains reusable UI components for the RH_TSE application.

## 📁 Component Overview

### 🔔 Notification Components
- `NotificationBadge.tsx` - Badge showing notification count
- `NotificationModal.tsx` - Modal for notification details
- `NotificationSettings.tsx` - Settings for notification preferences
- `NotificationSystem.tsx` - Main notification system component
- `NotificationTest.tsx` - Testing component for notifications

### 🧭 Navigation Components
- `Breadcrumb.tsx` - Breadcrumb navigation
- `TopBar.tsx` - Top navigation bar
- `ProtectedRoute.tsx` - Route protection wrapper

### 📝 Form Components
- `EditUserModal.tsx` - Modal for editing user information

### 📊 Data Display Components
- `Pagination.tsx` - Pagination controls
- `SkeletonLoader.tsx` - Loading skeleton component
- `Toast.tsx` - Toast notification component

### 🎨 UI Components
- `ui/` - Base UI components (login form, etc.)

## 🎯 Usage Guidelines

### Import Pattern
```typescript
import { ComponentName } from '@/components/ComponentName';
```

### Component Props
All components should:
- Accept `className` prop for styling customization
- Use TypeScript interfaces for prop definitions
- Include JSDoc comments for complex props

### Styling
- Use Tailwind CSS classes
- Follow the design system defined in `tailwind.config.js`
- Use consistent spacing and color schemes

## 🔧 Development Notes

### Adding New Components
1. Create the component file in this directory
2. Export the component as default
3. Add TypeScript interfaces for props
4. Include JSDoc comments
5. Update this README if needed

### Testing Components
- Create test files in `frontend/tests/components/`
- Use React Testing Library
- Test both success and error states

## 📋 Component Checklist

- [ ] TypeScript interfaces defined
- [ ] JSDoc comments added
- [ ] Tailwind classes used consistently
- [ ] Props properly typed
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Accessibility features included 