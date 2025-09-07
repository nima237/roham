import json
import jwt
from django.conf import settings
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from urllib.parse import parse_qs

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Extract token from cookies (similar to HTTP middleware)
        headers = dict(scope.get('headers', []))
        cookie_header = headers.get(b'cookie', b'').decode()
        
        # Parse cookies properly
        token = None
        refresh_token = None
        if cookie_header:
            # Split by '; ' and handle each cookie
            cookies = {}
            for cookie in cookie_header.split('; '):
                if '=' in cookie:
                    name, value = cookie.split('=', 1)
                    cookies[name.strip()] = value.strip()
            token = cookies.get('jwt_access')
            refresh_token = cookies.get('jwt_refresh')
        
        print(f"WebSocket cookie header: {cookie_header}")
        print(f"WebSocket parsed cookies: {cookies if cookie_header else 'None'}")
        print(f"WebSocket token: {token[:20] if token else 'None'}...")
        
        if token:
            try:
                # Decode JWT token
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'], options={'verify_exp': False})
                user_id = payload.get('user_id')
                exp_timestamp = payload.get('exp')
                
                # Check if token is expired
                if exp_timestamp:
                    from datetime import datetime
                    current_timestamp = datetime.utcnow().timestamp()
                    
                    # If token is expired but we have refresh token, try to refresh
                    if exp_timestamp < current_timestamp and refresh_token:
                        try:
                            from rest_framework_simplejwt.tokens import RefreshToken
                            refresh = RefreshToken(refresh_token)
                            new_access_token = str(refresh.access_token)
                            token = new_access_token  # Use new token
                            payload = jwt.decode(new_access_token, settings.SECRET_KEY, algorithms=['HS256'])
                            user_id = payload.get('user_id')
                            print(f"WebSocket token refreshed for user: {user_id}")
                        except Exception as e:
                            print(f"WebSocket token refresh failed: {e}")
                            # Don't set user to None, let it continue
                            scope['user'] = None
                            return await super().__call__(scope, receive, send)
                
                print(f"WebSocket user_id from token: {user_id}")
                
                if user_id:
                    # Get user from database
                    user = await self.get_user(user_id)
                    if user:
                        scope['user'] = user
                        print(f"WebSocket user authenticated: {user.username}")
                    else:
                        print(f"User not found for ID: {user_id}")
                        scope['user'] = None
                else:
                    print("No user_id in token payload")
                    scope['user'] = None
            except jwt.ExpiredSignatureError:
                print("JWT token expired")
                scope['user'] = None
            except jwt.InvalidTokenError as e:
                print(f"Invalid JWT token: {e}")
                scope['user'] = None
            except Exception as e:
                print(f"Error processing JWT token: {e}")
                scope['user'] = None
        else:
            print("No token provided in WebSocket connection")
            # Don't block the connection, just set user to None
            scope['user'] = None
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user(self, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

# --- HTTP Middleware for JWT Cookie Authentication ---
class JWTAuthCookieMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = request.COOKIES.get('jwt_access')
        refresh_token = request.COOKIES.get('jwt_refresh')
        
        if token and not request.META.get('HTTP_AUTHORIZATION'):
            request.META['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        
        # Auto refresh token if needed
        if token and refresh_token:
            try:
                import jwt
                from django.conf import settings
                from rest_framework_simplejwt.tokens import RefreshToken
                from django.http import JsonResponse
                
                # Check if access token is expired
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'], options={'verify_exp': False})
                exp_timestamp = payload.get('exp')
                
                if exp_timestamp:
                    from datetime import datetime
                    current_timestamp = datetime.utcnow().timestamp()
                    
                    # If token expires in less than 1 hour, refresh it
                    if exp_timestamp - current_timestamp < 3600:  # 1 hour
                        try:
                            refresh = RefreshToken(refresh_token)
                            new_access_token = str(refresh.access_token)
                            
                            # Update the request with new token
                            request.META['HTTP_AUTHORIZATION'] = f'Bearer {new_access_token}'
                            
                            # Set cookie in response
                            response = self.get_response(request)
                            if hasattr(response, 'set_cookie'):
                                response.set_cookie(
                                    'jwt_access', new_access_token,
                                    max_age=getattr(settings, 'JWT_COOKIE_MAX_AGE', 60 * 60 * 24 * 7),
                                    path=getattr(settings, 'JWT_COOKIE_PATH', '/'),
                                    secure=getattr(settings, 'JWT_COOKIE_SECURE', False),
                                    httponly=getattr(settings, 'JWT_COOKIE_HTTPONLY', True),
                                    samesite=getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
                                )
                            return response
                        except Exception as e:
                            print(f"Token refresh failed: {e}")
                            # Continue with expired token, will be handled by authentication
                
            except Exception as e:
                print(f"Token validation failed: {e}")
        
        return self.get_response(request)

# --- CSRF Exemption Middleware for Admin ---
class CSRFExemptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        
        # Always exempt admin URLs from CSRF regardless of DEBUG mode
        if request.path.startswith('/admin/'):
            request._dont_enforce_csrf_checks = True
            print(f"CSRF exempted for: {request.path}")
        
        return self.get_response(request) 