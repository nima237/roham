"""
URL configuration for the backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import HttpResponse
from apps.core.views import CustomTokenObtainPairView, AdminLoginView

urlpatterns = [
    path("admin/login/", AdminLoginView.as_view(), name='admin_login'),
    path("admin/", admin.site.urls),
    path('api/', include('apps.core.urls', namespace='core')),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', lambda request: HttpResponse("Welcome to the backend!"), name='home'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)