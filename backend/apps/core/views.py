"""
Core Views Module

This module contains all the views for the core application.
The views are organized by functionality:

1. Authentication & User Management
2. Resolution Management
3. Dashboard & Statistics
4. File Management
5. Notification System
6. API Endpoints

File Structure:
- Lines 1-500: Authentication & User Management
- Lines 501-1000: Resolution Management
- Lines 1001-1500: Dashboard & Statistics
- Lines 1501-2000: File Management
- Lines 2001-2500: Notification System
- Lines 2501+: API Endpoints & Utilities

TODO: Consider splitting this large file into smaller modules:
- views/auth.py
- views/resolutions.py
- views/dashboard.py
- views/files.py
- views/notifications.py
- views/api.py
"""

from django.conf import settings
import datetime


from django.shortcuts import render
from django.http import JsonResponse, Http404
from rest_framework import viewsets, generics, permissions, status, filters
from .models import Meeting, Resolution, Notification, Referral, FollowUp, UserProfile, ResolutionComment, ResolutionAction, ResolutionView
from .serializers import (
    MeetingSerializer, ResolutionSerializer, NotificationSerializer, 
    ReferralSerializer, FollowUpSerializer, UserSerializer,
    ResolutionCommentSerializer, ResolutionActionSerializer, ResolutionInteractionSerializer
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
User = get_user_model()
from django.db.models import Q, Prefetch
from django.shortcuts import get_object_or_404
from datetime import date, datetime, timedelta, time
from django.db.models import Count, Case, When
from django.db import transaction
from django.contrib.auth.models import Group
from django.utils import timezone
import json
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .consumers import NotificationConsumer

from .services.notification_service import NotificationService
import pytz
from django.db.models import OuterRef, Subquery, Max
from persiantools.jdatetime import JalaliDate
from collections import defaultdict
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

# JWT Cookie config (خواندن از settings یا مقدار پیش‌فرض)
JWT_COOKIE_NAME = getattr(settings, 'JWT_COOKIE_NAME', 'jwt_access')
JWT_REFRESH_COOKIE_NAME = getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'jwt_refresh')
JWT_COOKIE_PATH = getattr(settings, 'JWT_COOKIE_PATH', '/')
JWT_COOKIE_SECURE = getattr(settings, 'JWT_COOKIE_SECURE', False)
JWT_COOKIE_HTTPONLY = getattr(settings, 'JWT_COOKIE_HTTPONLY', True)
JWT_COOKIE_SAMESITE = getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
JWT_COOKIE_MAX_AGE = getattr(settings, 'JWT_COOKIE_MAX_AGE', 60 * 60 * 24)


# تابع تبدیل اعداد انگلیسی به فارسی
def to_persian_numbers(text):
    """تبدیل اعداد انگلیسی به فارسی در متن"""
    persian_digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    english_digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    
    for i in range(len(english_digits)):
        text = text.replace(english_digits[i], persian_digits[i])
    return text



# Create your views here.

def health_check(request):
    return JsonResponse({"status": "ok", "message": "Hello, TSE!"})

class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    filterset_fields = ['number', 'held_at']
    search_fields = ['description']
    ordering_fields = ['number', 'held_at']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # دبیران، ناظران و مدیرعامل به همه جلسات دسترسی دارند
        if (user.groups.filter(name__iexact='secretary').exists() or 
            (hasattr(user, 'profile') and user.profile.position in ['secretary', 'auditor', 'ceo'])):
            return Meeting.objects.all()
        # سایر کاربران دسترسی ندارند
        return Meeting.objects.none()

    def perform_create(self, serializer):
        meeting = serializer.save()
        files = self.request.FILES.getlist('attachments')
        for f in files:
            from .models import MeetingAttachment
            MeetingAttachment.objects.create(
                meeting=meeting,
                file=f,
                original_name=f.name
            )

    def perform_update(self, serializer):
        meeting = serializer.save()
        files = self.request.FILES.getlist('attachments')
        for f in files:
            from .models import MeetingAttachment
            MeetingAttachment.objects.create(
                meeting=meeting,
                file=f,
                original_name=f.name
            )

class ResolutionViewSet(viewsets.ModelViewSet):
    queryset = Resolution.objects.all()
    serializer_class = ResolutionSerializer
    filterset_fields = ['status', 'meeting']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'title']
    lookup_field = 'public_id'
    
    def get_object(self):
        """Override to use public_id lookup"""
        public_id = self.kwargs.get('public_id')
        if public_id:
            try:
                return Resolution.objects.get(public_id=public_id)
            except Resolution.DoesNotExist:
                raise Http404("Resolution not found")
        return super().get_object()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        # چک دسترسی دقیقاً مثل سایر viewها
        has_access = (
            instance.executor_unit == user or
            user in instance.coworkers.all() or
            user in instance.inform_units.all() or
            user in instance.participants.all() or
            instance.created_by == user or
            (hasattr(user, 'profile') and user.profile.position in ['secretary', 'auditor', 'ceo'])
        )
        if not has_access:
            return Response(
                {"error": "شما به این مصوبه دسترسی ندارید."},
                status=status.HTTP_403_FORBIDDEN
            )
        # ثبت اولین مشاهده
        ResolutionView.objects.get_or_create(user=request.user, resolution=instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        print("Received data:", request.data)
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print("Error creating resolution:", str(e))
            raise

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    filterset_fields = ['recipient', 'resolution', 'read']
    search_fields = ['message']
    ordering_fields = ['sent_at']

class ReferralViewSet(viewsets.ModelViewSet):
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer
    filterset_fields = ['referred_to', 'resolution']
    search_fields = ['note']
    ordering_fields = ['created_at']

class FollowUpViewSet(viewsets.ModelViewSet):
    queryset = FollowUp.objects.all()
    serializer_class = FollowUpSerializer
    filterset_fields = ['assigned_to', 'resolution', 'status']
    search_fields = ['note']
    ordering_fields = ['created_at', 'updated_at', 'due_date']

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    user = request.user
    groups = list(user.groups.values_list('name', flat=True))
    position = getattr(user.profile, 'position', None) if hasattr(user, 'profile') else None
    department = getattr(user.profile, 'department', None) if hasattr(user, 'profile') else None
    position_display = getattr(user.profile, 'position_display', None) if hasattr(user, 'profile') else None
    
    return Response({
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'groups': groups,
        'position': position,
        'profile': {
            'department': department,
            'position_display': position_display,
            'position': position
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    User = get_user_model()
    users = User.objects.select_related('profile').all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

class SecretaryResolutionListView(generics.ListAPIView):
    serializer_class = ResolutionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # دبیران، ناظران، مدیرعامل و کارشناس دبیرخانه به همه مصوبات دسترسی دارند
        if (user.groups.filter(name__iexact='secretary').exists() or 
            (hasattr(user, 'profile') and user.profile.position in ['secretary', 'auditor', 'ceo', 'employee'])):
            return Resolution.objects.all().order_by('-created_at')
        # سایر کاربران فقط مصوباتی را می‌بینند که وضعیت آن pending_secretary_approval نیست
        return Resolution.objects.filter(
            ~Q(status='pending_secretary_approval'),
            Q(executor_unit=user) |
            Q(coworkers=user) |
            Q(inform_units=user)
        ).distinct().order_by('-created_at')

class UserWorkbenchListView(generics.ListAPIView):
    serializer_class = ResolutionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # ناظران، دبیر و مدیرعامل به همه مصوبات دسترسی دارند
        if hasattr(user, 'profile') and user.profile.position in ['auditor', 'ceo', 'secretary']:
            return Resolution.objects.all().order_by('-created_at')
        # واحد مجری می‌تواند مصوبه‌های pending_ceo_approval را هم ببیند
        if Resolution.objects.filter(executor_unit=user).exists():
            return Resolution.objects.filter(
                Q(executor_unit=user) |
                Q(coworkers=user) |
                Q(inform_units=user) |
                Q(participants=user)
            ).distinct().order_by('-created_at')
        # سایر کاربران فقط مصوباتی را می‌بینند که وضعیت آن pending_ceo_approval یا pending_secretary_approval نیست
        return Resolution.objects.filter(
            ~Q(status='pending_ceo_approval'),
            ~Q(status='pending_secretary_approval'),
            Q(executor_unit=user) |
            Q(coworkers=user) |
            Q(inform_units=user) |
            Q(participants=user)
        ).distinct().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        # دریافت لیست مصوبات مشاهده شده توسط کاربر
        viewed_resolutions = set(str(v) for v in ResolutionView.objects.filter(
            user=request.user,
            resolution_id__in=[item['id'] for item in data]
        ).values_list('resolution_id', flat=True))

        # اضافه کردن فیلد unread به هر مصوبه
        for item in data:
            item['unread'] = item['id'] not in viewed_resolutions
            if not item['unread']:
                view = ResolutionView.objects.filter(
                    user=request.user,
                    resolution_id=item['id']
                ).first()
                item['first_viewed_at'] = view.first_viewed_at.isoformat() if view else None
            else:
                item['first_viewed_at'] = None

        return Response(data)

class UserNotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(recipient=user).order_by('-sent_at')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resolution_subclause_count(request):
    meeting = request.GET.get('meeting')
    clause = request.GET.get('clause')
    if not clause:
        return Response({'count': 0})
    count = Resolution.objects.filter(meeting_id=meeting, clause=clause).count()
    return Response({'count': count})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_users(request):
    User = get_user_model()
    users = User.objects.all()
    data = []
    for user in users:
        data.append({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'groups': [group.name for group in user.groups.all()]
        })
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_resolutions(request):
    resolutions = Resolution.objects.select_related('executor_unit', 'meeting').all()[:3]
    data = []
    for resolution in resolutions:
        data.append({
            'id': str(resolution.id),
            'clause': resolution.clause,
            'subclause': resolution.subclause,
            'executor_unit': {
                'id': resolution.executor_unit.id if resolution.executor_unit else None,
                'username': resolution.executor_unit.username if resolution.executor_unit else None,
                'first_name': resolution.executor_unit.first_name if resolution.executor_unit else None,
                'last_name': resolution.executor_unit.last_name if resolution.executor_unit else None,
            } if resolution.executor_unit else None
        })
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_users(request):
    User = get_user_model()
    users = User.objects.all()
    data = []
    for user in users:
        data.append({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': f"{user.first_name} {user.last_name}".strip() if user.first_name and user.last_name else user.username
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(
            id=notification_id,
            recipient=request.user
        )
        notification.read = True
        notification.save()
        return Response({'status': 'success'})
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=404)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all unread notifications as read for the current user"""
    try:
        # Update all unread notifications for the current user
        updated_count = Notification.objects.filter(
            recipient=request.user,
            read=False
        ).update(read=True)
        
        return Response({
            'status': 'success',
            'updated_count': updated_count
        })
    except Exception as e:
        return Response({
            'error': f'Error marking notifications as read: {str(e)}'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_notifications_count(request):
    user = request.user
    count = Notification.objects.filter(recipient=user, read=False).count()
    return Response({'count': count})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organizational_hierarchy(request):
    """دریافت کل سلسله مراتب سازمانی"""
    
    # پیدا کردن کاربران سطح بالا (بدون سرپرست)
    top_level_users = User.objects.filter(profile__supervisor__isnull=True).order_by('profile__position')
    
    def build_hierarchy(user):
        user_data = UserSerializer(user).data
        subordinates = User.objects.filter(profile__supervisor=user).order_by('profile__position', 'first_name')
        user_data['subordinates'] = [build_hierarchy(sub) for sub in subordinates]
        return user_data
    
    hierarchy = [build_hierarchy(user) for user in top_level_users]
    total_count = len(hierarchy)
    return Response({
        "hierarchy": hierarchy,
        "total_employees": total_count
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_subordinates(request):
    """دریافت زیردستان کاربر جاری"""
    user = request.user
    
    if not hasattr(user, 'profile'):
        return Response([])
    
    # زیردستان مستقیم
    direct_subordinates = User.objects.filter(profile__supervisor=user)
    
    # تمام زیردستان (مستقیم و غیرمستقیم)
    all_subordinates = user.profile.get_all_subordinates()
    
    return Response({
        'direct_subordinates': UserSerializer(direct_subordinates, many=True).data,
        'all_subordinates': UserSerializer(all_subordinates, many=True).data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users_by_position(request):
    """دریافت کاربران بر اساس سمت"""
    position = request.GET.get('position')
    
    if position:
        users = User.objects.filter(profile__position=position)
    else:
        users = User.objects.all()
    
    users = users.order_by('first_name', 'last_name', 'username')
    return Response(UserSerializer(users, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_hierarchy_relationship(request):
    """بررسی اینکه آیا کاربران در یک زنجیره سلسله‌مراتبی قرار دارند"""
    try:
        subordinate_id = request.data.get('subordinate_id')
        supervisor_ids = request.data.get('supervisor_ids', [])
        
        if not subordinate_id or not supervisor_ids:
            return Response(
                {"error": "subordinate_id و supervisor_ids اجباری هستند."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subordinate = User.objects.get(id=subordinate_id)
        except User.DoesNotExist:
            return Response(
                {"error": "کاربر زیردست یافت نشد."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not hasattr(subordinate, 'profile'):
            return Response({"is_subordinate": False})
        
        # بررسی اینکه آیا subordinate زیردست هر یک از supervisor_ids هست
        def is_subordinate_of(user, target_ids, visited=None):
            if visited is None:
                visited = set()
            
            if user.id in visited:
                return False
            visited.add(user.id)
            
            if not hasattr(user, 'profile') or not user.profile.supervisor:
                return False
            
            supervisor = user.profile.supervisor
            
            # اگر سرپرست مستقیم در لیست هدف باشد
            if supervisor.id in target_ids:
                return True
            
            # بررسی recursive زنجیره بالاتر
            return is_subordinate_of(supervisor, target_ids, visited)
        
        result = is_subordinate_of(subordinate, supervisor_ids)
        
        return Response({
            "is_subordinate": result,
            "subordinate_id": subordinate_id,
            "supervisor_ids": supervisor_ids
        })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در بررسی روابط سلسله‌مراتبی: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# API endpoints برای تعاملات مصوبه

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resolution_detail_interaction(request, public_id):
    """دریافت جزئیات کامل مصوبه برای صفحه تعاملات و ثبت اولین مشاهده"""
    try:
        resolution = Resolution.objects.prefetch_related(
            'comments__author',
            'actions__actor',
            'coworkers',
            'inform_units',
            'participants'
        ).select_related('meeting', 'executor_unit').get(public_id=public_id)
        user = request.user
        # ثبت اولین مشاهده
        ResolutionView.objects.get_or_create(user=user, resolution=resolution)
        
        # بررسی دسترسی
        has_access = (
            resolution.executor_unit == user or
            user in resolution.coworkers.all() or
            user in resolution.inform_units.all() or
            user in resolution.participants.all() or
            resolution.created_by == user or
            hasattr(user, 'profile') and user.profile.position == 'secretary' or
            hasattr(user, 'profile') and user.profile.position == 'auditor'
        )
        
        if not has_access:
            return Response(
                {"error": "شما به این مصوبه دسترسی ندارید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ResolutionInteractionSerializer(resolution, context={'request': request})
        return Response(serializer.data)
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_resolution_comment(request, public_id):
    """اضافه کردن کامنت به مصوبه"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        
        # بررسی دسترسی
        user = request.user
        has_access = (
            resolution.executor_unit == user or
            user in resolution.coworkers.all() or
            user in resolution.inform_units.all() or
            user in resolution.participants.all() or
            resolution.created_by == user
        )
        
        if not has_access:
            return Response(
                {"error": "شما به این مصوبه دسترسی ندارید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        data = request.data.copy()
        data['resolution'] = resolution.public_id
        data['author'] = user.id
        
        serializer = ResolutionCommentSerializer(data=data)
        if serializer.is_valid():
            comment = serializer.save(author=user, resolution=resolution)
            
            # اگر کاربر در participants نیست، اضافه‌اش کن
            if user not in resolution.participants.all():
                resolution.participants.add(user)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def return_resolution_to_secretary(request, public_id):
    """برگشت مصوبه به دبیر توسط مجری"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        
        # بررسی دسترسی - فقط مجری می‌تواند برگرداند
        if resolution.executor_unit != request.user:
            return Response(
                {"error": "فقط مجری می‌تواند مصوبه را برگرداند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if resolution.status == 'returned_to_secretary':
            return Response(
                {"error": "این مصوبه قبلاً برگردانده شده است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        if not reason:
            return Response(
                {"error": "دلیل برگشت اجباری است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # تغییر وضعیت مصوبه
        resolution.status = 'returned_to_secretary'
        resolution.can_edit = True
        resolution.save()
        
        # ایجاد کامنت
        comment = ResolutionComment.objects.create(
            resolution=resolution,
            author=request.user,
            comment_type='return',
            content=f"مصوبه به دبیر برگردانده شد.\nدلیل: {reason}"
        )
        
        # ایجاد اکشن
        action = ResolutionAction.objects.create(
            resolution=resolution,
            actor=request.user,
            action_type='return_to_secretary',
            description=reason,
            action_data={'reason': reason},
            related_comment=comment
        )
        
        # ایجاد نوتیفیکیشن برای دبیر
        if resolution.created_by:
            meeting_num = to_persian_numbers(str(resolution.meeting.number))
            clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
            NotificationService.create_notification(
                recipient=resolution.created_by,
                message=f"مصوبه جلسه {meeting_num} بند {clause_subclause} توسط مجری برگردانده شده است.",
                resolution=resolution
            )
        
        return Response({
            "message": "مصوبه با موفقیت برگردانده شد.",
            "comment": ResolutionCommentSerializer(comment).data,
            "action": ResolutionActionSerializer(action).data
        })
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refer_resolution(request, public_id):
    """ارجاع مصوبه به افراد جدید"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        
        # بررسی دسترسی - مجری و همکاران می‌توانند ارجاع دهند
        user = request.user
        can_refer = (
            resolution.executor_unit == user or
            user in resolution.coworkers.all()
        )
        
        if not can_refer:
            return Response(
                {"error": "شما مجاز به ارجاع این مصوبه نیستید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_ids = request.data.get('user_ids', [])
        description = request.data.get('description', '')
        
        if not user_ids:
            return Response(
                {"error": "حداقل یک کاربر برای ارجاع انتخاب کنید."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not description:
            return Response(
                {"error": "توضیحات ارجاع اجباری است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی وجود کاربران
        users = User.objects.filter(id__in=user_ids)
        if len(users) != len(user_ids):
            return Response(
                {"error": "برخی از کاربران انتخاب شده معتبر نیستند."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # اضافه کردن کاربران به participants
        for user_obj in users:
            resolution.participants.add(user_obj)
        
        # ایجاد کامنت
        user_names = [user_obj.get_full_name() or user_obj.username for user_obj in users]
        comment_content = f"ارجاع به: {', '.join(user_names)}\nتوضیحات: {description}"
        
        comment = ResolutionComment.objects.create(
            resolution=resolution,
            author=request.user,
            comment_type='referral',
            content=comment_content,
            action_data={'referred_users': user_ids}
        )
        
        # ایجاد اکشن
        action = ResolutionAction.objects.create(
            resolution=resolution,
            actor=request.user,
            action_type='referral',
            description=description,
            action_data={'referred_users': user_ids, 'user_names': user_names},
            related_comment=comment
        )
        
        # ایجاد نوتیفیکیشن برای کاربران ارجاع شده
        for user_obj in users:
            meeting_num = to_persian_numbers(str(resolution.meeting.number))
            clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
            NotificationService.create_notification(
                recipient=user_obj,
                message=f"مصوبه جلسه {meeting_num} بند {clause_subclause} به شما ارجاع داده شده است.",
                resolution=resolution
            )
        
        return Response({
            "message": "ارجاع با موفقیت انجام شد.",
            "comment": ResolutionCommentSerializer(comment).data,
            "action": ResolutionActionSerializer(action).data,
            "referred_users": UserSerializer(users, many=True).data
        })
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subordinates_for_referral(request):
    """دریافت زیرمجموعه‌های کاربر برای ارجاع"""
    user = request.user
    
    if not hasattr(user, 'profile'):
        return Response({"subordinates": []})
    
    subordinates = user.profile.get_all_subordinates()
    serializer = UserSerializer(subordinates, many=True)
    
    return Response({"subordinates": serializer.data})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def resolution_interactions(request, public_id):
    """دریافت و اضافه کردن تعاملات مصوبه"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        
        # منطق دسترسی جدید بر اساس وضعیت مصوبه
        is_secretary = hasattr(user, 'profile') and user.profile.position == 'secretary'
        is_auditor = hasattr(user, 'profile') and user.profile.position == 'auditor'
        is_executor = resolution.executor_unit == user
        is_creator = resolution.created_by == user
        is_ceo = hasattr(user, 'profile') and user.profile.position == 'ceo'
        
        # دسترسی به مشاهده تعاملات (همه می‌توانند ببینند)
        view_access = (
            is_secretary or is_auditor or is_executor or is_creator or
            (hasattr(user, 'profile') and user.profile.position == 'ceo') or  # مدیرعامل می‌تواند ببیند
            user in resolution.coworkers.all() or
            user in resolution.inform_units.all() or
            user in resolution.participants.all()
        )
        
        # دسترسی به ارسال پیام (محدود بر اساس وضعیت)
        if resolution.status == 'notified':
            # فقط دبیر، واحد مجری، ناظر و مدیرعامل می‌توانند چت کنند
            chat_access = is_secretary or is_executor or is_auditor or (hasattr(user, 'profile') and user.profile.position == 'ceo')
        elif resolution.status == 'pending_ceo_approval':
            # در حالت گفتگو، فقط دبیر، معاون، ناظر و مدیرعامل می‌توانند چت کنند
            chat_access = is_secretary or is_executor or is_auditor or (hasattr(user, 'profile') and user.profile.position == 'ceo')
        elif resolution.status == 'returned_to_secretary':
            # در حالت گفتگو، فقط دبیر، معاون، ناظر و مدیرعامل می‌توانند چت کنند
            chat_access = is_secretary or is_executor or is_auditor or (hasattr(user, 'profile') and user.profile.position == 'ceo')
        elif resolution.status in ['in_progress', 'completed']:
            # بعد از قبول، واحد مجری، همکاران، ناظر و مدیرعامل می‌توانند چت کنند (دبیر خیر)
            chat_access = (
                is_executor or
                user in resolution.coworkers.all() or
                user in resolution.inform_units.all() or
                user in resolution.participants.all() or
                is_auditor or  # ناظر می‌تواند چت را ببیند
                (hasattr(user, 'profile') and user.profile.position == 'ceo')  # مدیرعامل می‌تواند چت را ببیند
            ) and not is_secretary  # فقط دبیر منع شده
        else:
            # در سایر حالات (مثل cancelled)، همه participants می‌توانند چت کنند
            chat_access = (
                is_executor or is_creator or
                user in resolution.coworkers.all() or
                user in resolution.inform_units.all() or
                user in resolution.participants.all() or
                (hasattr(user, 'profile') and user.profile.position == 'ceo')  # مدیرعامل می‌تواند چت کند
            )
        
        # برای مشاهده کافی است view_access داشته باشد
        if not view_access:
            return Response(
                {"error": "شما به این مصوبه دسترسی ندارید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            # دریافت تعاملات (کامنت‌های عادی و اکشن‌ها)
            comments = resolution.comments.filter(comment_type__in=['message', 'action']).select_related('author')
            serializer = ResolutionCommentSerializer(comments, many=True)
            
            # تعیین participants که دسترسی چت دارند
            chat_participants = []
            if resolution.status in ['in_progress', 'completed']:
                # بعد از قبول: مجری، همکاران، واحدهای اطلاع‌رسانی
                if resolution.executor_unit:
                    chat_participants.append(resolution.executor_unit)
                
                for participant in resolution.coworkers.all():
                    if participant not in chat_participants:
                        chat_participants.append(participant)
                        
                for participant in resolution.inform_units.all():
                    if participant not in chat_participants:
                        chat_participants.append(participant)
                        
                for participant in resolution.participants.all():
                    if participant not in chat_participants:
                        # فقط اگر دبیر نباشه
                        if not (hasattr(participant, 'profile') and participant.profile.position == 'secretary'):
                            chat_participants.append(participant)
            elif resolution.status == 'notified':
                # فقط واحد مجری (دبیر حذف شد)
                if resolution.executor_unit:
                    chat_participants.append(resolution.executor_unit)
            elif resolution.status == 'pending_ceo_approval':
                # فقط واحد مجری (دبیر حذف شد)
                if resolution.executor_unit:
                    chat_participants.append(resolution.executor_unit)
            elif resolution.status == 'returned_to_secretary':
                # فقط واحد مجری (دبیر حذف شد)
                if resolution.executor_unit:
                    chat_participants.append(resolution.executor_unit)
            
            # اضافه کردن همه ناظران به لیست چت در همه مراحل
            auditors = User.objects.filter(profile__position='auditor')
            for auditor in auditors:
                if auditor not in chat_participants:
                    chat_participants.append(auditor)
            
            # اضافه کردن مدیرعامل به لیست چت در همه مراحل
            ceos = User.objects.filter(profile__position='ceo')
            for ceo in ceos:
                if ceo not in chat_participants:
                    chat_participants.append(ceo)
            
            # حذف تکرارها
            unique_participants = []
            for p in chat_participants:
                if p not in unique_participants:
                    unique_participants.append(p)
            
            # اضافه کردن اطلاعات دسترسی برای فرانت‌اند
            response_data = {
                'comments': serializer.data,
                'can_accept': is_executor and resolution.status in ['notified', 'returned_to_secretary'],
                'can_return': is_executor and resolution.status == 'notified',
                'can_edit': is_secretary,  # برای تست - قبلاً: is_secretary and resolution.status == 'returned_to_secretary'
                'can_dialogue': chat_access and resolution.status == 'returned_to_secretary',
                'can_chat': chat_access,
                'is_secretary': is_secretary,
                'is_executor': is_executor,
                'chat_participants': UserSerializer(unique_participants, many=True).data
            }
            return Response(response_data)
        
        elif request.method == 'POST':
            # بررسی مجوز اضافه کردن تعامل
            if not chat_access:
                if resolution.status in ['in_progress', 'completed'] and is_secretary:
                    return Response(
                        {"error": "بعد از قبول مصوبه، دبیر دیگر نمی‌تواند در گفتگو شرکت کند."}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                else:
                    return Response(
                        {"error": "شما مجاز به ارسال پیام در این مصوبه نیستید."}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # تعیین participants که دسترسی چت دارند (برای POST)
            chat_participants = []
            if resolution.status in ['in_progress', 'completed']:
                # بعد از قبول: مجری، همکاران، واحدهای اطلاع‌رسانی
                if resolution.executor_unit:
                    chat_participants.append(resolution.executor_unit)
                
                for participant in resolution.coworkers.all():
                    if participant not in chat_participants:
                        chat_participants.append(participant)
                        
                for participant in resolution.inform_units.all():
                    if participant not in chat_participants:
                        chat_participants.append(participant)
                        
                for participant in resolution.participants.all():
                    if participant not in chat_participants:
                        # فقط اگر دبیر نباشه
                        if not (hasattr(participant, 'profile') and participant.profile.position == 'secretary'):
                            chat_participants.append(participant)
            elif resolution.status == 'notified':
                # فقط واحد مجری (دبیر حذف شد)
                if resolution.executor_unit:
                    chat_participants.append(resolution.executor_unit)
            elif resolution.status == 'pending_ceo_approval':
                # فقط واحد مجری (دبیر حذف شد)
                if resolution.executor_unit:
                    chat_participants.append(resolution.executor_unit)
            elif resolution.status == 'returned_to_secretary':
                # فقط واحد مجری (دبیر حذف شد)
                if resolution.executor_unit:
                    chat_participants.append(resolution.executor_unit)
            
            # اضافه کردن همه ناظران به لیست چت در همه مراحل (برای POST)
            auditors = User.objects.filter(profile__position='auditor')
            for auditor in auditors:
                if auditor not in chat_participants:
                    chat_participants.append(auditor)
            
            # اضافه کردن مدیرعامل به لیست چت در همه مراحل (برای POST)
            ceos = User.objects.filter(profile__position='ceo')
            for ceo in ceos:
                if ceo not in chat_participants:
                    chat_participants.append(ceo)
            
            # حذف تکرارها
            unique_participants = []
            for p in chat_participants:
                if p not in unique_participants:
                    unique_participants.append(p)
            
            # اضافه کردن تعامل جدید
            content = request.data.get('content', '')
            mentions_data = request.data.get('mentions', [])  # لیست ID های کاربران mention شده
            attachments = request.FILES.getlist('attachments')  # لیست فایل‌های پیوست
            reply_to_id = request.data.get('reply_to_id')  # ID کامنت مورد پاسخ
            
            # اگر mentions به صورت JSON string آمده، parse کن
            if isinstance(mentions_data, str):
                try:
                    import json
                    mentions_data = json.loads(mentions_data)
                except (json.JSONDecodeError, TypeError):
                    mentions_data = []
            
            # بررسی وجود محتوا یا فایل
            if not content.strip() and not attachments:
                return Response(
                    {"error": "محتوای تعامل یا فایل پیوست اجباری است."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # اگر فقط فایل باشد، محتوا را خالی بگذار
            if not content.strip() and attachments:
                content = ""
            
            # بررسی کامنت مورد پاسخ
            reply_to_comment = None
            if reply_to_id:
                try:
                    reply_to_comment = ResolutionComment.objects.get(
                        id=reply_to_id, 
                        resolution=resolution
                    )
                except ResolutionComment.DoesNotExist:
                    return Response(
                        {"error": "کامنت مورد پاسخ یافت نشد."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # ایجاد کامنت
            comment = ResolutionComment.objects.create(
                resolution=resolution,
                author=user,
                comment_type='message',
                content=content,
                reply_to=reply_to_comment
            )
            
            # پردازش فایل‌های پیوست
            max_size = 10 * 1024 * 1024  # 10 MB
            from .models import ResolutionCommentAttachment
            for attachment in attachments:
                if attachment.size > max_size:
                    comment.delete()  # حذف کامنت ایجاد شده
                    return Response(
                        {"error": "اندازه فایل نباید بیشتر از ۱۰ مگابایت باشد."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                ResolutionCommentAttachment.objects.create(
                    comment=comment,
                    file=attachment,
                    original_name=attachment.name,
                    file_size=attachment.size,
                    file_type=attachment.content_type or 'unknown'
                )
            
            # ایجاد نوتیفیکیشن فقط برای کسانی که دسترسی دارند
            notify_users = []
            
            # اضافه کردن mentions
            if mentions_data:
                # فقط کاربرانی که هم در mentions هستند و هم دسترسی چت دارند
                participant_ids = [p.id for p in unique_participants]
                mentioned_users = User.objects.filter(id__in=mentions_data).filter(id__in=participant_ids)
                comment.mentions.set(mentioned_users)
                
                # اضافه کردن کاربران mention شده به لیست نوتیفیکیشن
                for mentioned_user in mentioned_users:
                    if mentioned_user != user and mentioned_user not in notify_users:
                        notify_users.append(mentioned_user)
            
            # اگر کاربر در participants نیست، اضافه‌اش کن
            if user not in resolution.participants.all():
                resolution.participants.add(user)
            
            # اضافه کردن کاربری که پیامش reply شده به لیست نوتیف
            if reply_to_comment and reply_to_comment.author != user:
                if reply_to_comment.author not in notify_users:
                    notify_users.append(reply_to_comment.author)
            
            # ارسال نوتیفیکیشن فقط برای:
            # 1. کاربران mention شده
            # 2. کاربری که پیامش reply شده
            for participant in notify_users:
                if mentions_data and participant.id in mentions_data:
                    # نوتیف برای mention
                    meeting_num = to_persian_numbers(str(resolution.meeting.number))
                    clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
                    message = f"شما در مصوبه جلسه {meeting_num} بند {clause_subclause} نام‌برده شدید."
                    NotificationService.create_notification(
                        recipient=participant,
                        message=message,
                        resolution=resolution
                    )
                elif reply_to_comment and participant == reply_to_comment.author:
                    # نوتیف برای reply
                    meeting_num = to_persian_numbers(str(resolution.meeting.number))
                    clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
                    message = f"به پیام شما در مصوبه جلسه {meeting_num} بند {clause_subclause} پاسخ داده شد."
                    NotificationService.create_notification(
                        recipient=participant,
                        message=message,
                        resolution=resolution
                    )
            
            # Send WebSocket notification for new interaction
            from .consumers import NotificationConsumer
            author_name = f"{user.first_name} {user.last_name}".strip() or user.username
            NotificationConsumer.send_interaction_notification_to_resolution(
                resolution_id=public_id,
                interaction_data=ResolutionCommentSerializer(comment).data,
                author_name=author_name
            )
            
            serializer = ResolutionCommentSerializer(comment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def resolution_progress(request, public_id):
    """دریافت و بروزرسانی پیشرفت مصوبه"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        
        # بررسی دسترسی
        user = request.user
        has_access = (
            resolution.executor_unit == user or
            user in resolution.coworkers.all() or
            user in resolution.inform_units.all() or
            user in resolution.participants.all() or
            resolution.created_by == user or
            (hasattr(user, 'profile') and user.profile.position == 'secretary') or
            (hasattr(user, 'profile') and user.profile.position == 'auditor') or
            (hasattr(user, 'profile') and user.profile.position == 'ceo')
        )
        
        if not has_access:
            return Response(
                {"error": "شما به این مصوبه دسترسی ندارید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            # دریافت بروزرسانی‌های پیشرفت
            progress_updates = resolution.comments.filter(comment_type='progress_update').select_related('author')
            serializer = ResolutionCommentSerializer(progress_updates, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # بررسی مجوز برای بروزرسانی - ناظران فقط می‌توانند مشاهده کنند
            is_auditor = hasattr(user, 'profile') and user.profile.position == 'auditor'
            if is_auditor:
                return Response(
                    {"error": "ناظران فقط می‌توانند پیشرفت را مشاهده کنند، نه به‌روزرسانی کنند."}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # بروزرسانی پیشرفت
            progress = request.data.get('progress')
            description = request.data.get('description', '')
            
            if progress is None:
                return Response(
                    {"error": "درصد پیشرفت اجباری است."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                progress = int(progress)
                if progress < 0 or progress > 100:
                    raise ValueError()
            except (ValueError, TypeError):
                return Response(
                    {"error": "درصد پیشرفت باید عددی بین 0 تا 100 باشد."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not description.strip():
                return Response(
                    {"error": "توضیحات پیشرفت اجباری است."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # بروزرسانی پیشرفت مصوبه
            old_progress = resolution.progress
            resolution.progress = progress
            resolution.save()
            
            # ایجاد کامنت پیشرفت
            comment_content = f"پیشرفت از {old_progress}% به {progress}% تغییر یافت.\nتوضیحات: {description}"
            comment = ResolutionComment.objects.create(
                resolution=resolution,
                author=user,
                comment_type='progress_update',
                content=comment_content,
                action_data={'old_progress': old_progress, 'new_progress': progress}
            )
            
            # ایجاد اکشن
            action = ResolutionAction.objects.create(
                resolution=resolution,
                actor=user,
                action_type='progress_update',
                description=description,
                action_data={'old_progress': old_progress, 'new_progress': progress},
                related_comment=comment
            )
            
            # اگر کاربر در participants نیست، اضافه‌اش کن
            if user not in resolution.participants.all():
                resolution.participants.add(user)
            
            # ایجاد نوتیفیکیشن برای سایر participants
            participants = resolution.get_all_participants()
            for participant in participants:
                if participant != user:  # خودش نوتیف نگیره
                    meeting_num = to_persian_numbers(str(resolution.meeting.number))
                    clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
                    progress_persian = to_persian_numbers(str(progress))
                    NotificationService.create_notification(
                        recipient=participant,
                        message=f"پیشرفت مصوبه جلسه {meeting_num} بند {clause_subclause} به {progress_persian}% رسید.",
                        resolution=resolution
                    )

            # ایجاد نوتیفیکیشن برای همه ناظرها
            from django.contrib.auth import get_user_model
            User = get_user_model()
            auditors = User.objects.filter(profile__position='auditor')
            for auditor in auditors:
                if auditor != user and auditor not in participants:
                    meeting_num = to_persian_numbers(str(resolution.meeting.number))
                    clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
                    progress_persian = to_persian_numbers(str(progress))
                    NotificationService.create_notification(
                        recipient=auditor,
                        message=f"پیشرفت مصوبه جلسه {meeting_num} بند {clause_subclause} به {progress_persian}% رسید.",
                        resolution=resolution
                    )
            
            # برگرداندن داده‌های کامنت با ساختار مناسب برای فرانت‌اند
            response_data = {
                'id': str(comment.id),
                'progress': progress,
                'description': description,
                'created_at': comment.created_at.isoformat(),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_resolution(request, public_id):
    """قبول مصوبه توسط واحد مجری"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        
        # بررسی مجوز
        if resolution.executor_unit != user:
            return Response(
                {"error": "فقط واحد مجری می‌تواند مصوبه را قبول کند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # معاون می‌تونه از وضعیت "notified" یا "returned_to_secretary" قبول کنه
        if resolution.status not in ['notified', 'returned_to_secretary']:
            return Response(
                {"error": "این مصوبه در وضعیت قابل قبول نیست."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # اگر از وضعیت "returned_to_secretary" قبول می‌کنه، یعنی گفتگو تموم شده
        dialogue_ended = resolution.status == 'returned_to_secretary'
        
        # تغییر وضعیت به "در حال اجرا"
        resolution.status = 'in_progress'
        resolution.save()
        
        # ثبت اکشن قبول
        action_description = 'مصوبه توسط واحد مجری قبول شد.'
        if dialogue_ended:
            action_description = 'واحد مجری پس از بحث، مصوبه را قبول کرد و گفتگو پایان یافت.'
        
        action = ResolutionAction.objects.create(
            resolution=resolution,
            actor=user,
            action_type='executor_accepted',
            description=action_description
        )
        
        # ثبت کامنت
        comment_content = 'مصوبه قبول شد و به مرحله اجرا منتقل شد.'
        if dialogue_ended:
            comment_content = 'واحد مجری پس از بحث، مصوبه را قبول کرد. گفتگو پایان یافت و مصوبه به مرحله اجرا منتقل شد.'
        
        comment = ResolutionComment.objects.create(
            resolution=resolution,
            author=user,
            comment_type='action',
            content=comment_content,
            related_action=action
        )
        
        # نوتیفیکیشن برای دبیر
        meeting_num = to_persian_numbers(str(resolution.meeting.number))
        clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
        message = f"مصوبه جلسه {meeting_num} بند {clause_subclause} توسط واحد مجری قبول شد."
        if dialogue_ended:
            message = f"واحد مجری پس از بحث، مصوبه جلسه {meeting_num} بند {clause_subclause} را قبول کرد."
        
        if resolution.created_by and hasattr(resolution.created_by, 'profile') and resolution.created_by.profile.position == 'secretary':
            NotificationService.create_notification(
                recipient=resolution.created_by,
                message=message,
                resolution=resolution
            )
        
        return Response(
            {"message": "مصوبه با موفقیت قبول شد.", "status": resolution.status, "dialogue_ended": dialogue_ended}, 
            status=status.HTTP_200_OK
        )
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def return_resolution(request, public_id):
    """برگشت مصوبه به دبیر توسط واحد مجری"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        reason = request.data.get('reason', '').strip()
        
        # بررسی مجوز
        if resolution.executor_unit != user:
            return Response(
                {"error": "فقط واحد مجری می‌تواند مصوبه را برگشت دهد."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if resolution.status != 'notified':
            return Response(
                {"error": "این مصوبه در وضعیت قابل برگشت نیست."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reason:
            return Response(
                {"error": "دلیل برگشت اجباری است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # تغییر وضعیت به "منتظر تایید مدیرعامل"
        resolution.status = 'pending_ceo_approval'
        resolution.save()
        
        # ثبت اکشن برگشت
        action = ResolutionAction.objects.create(
            resolution=resolution,
            actor=user,
            action_type='return',
            description=reason,
            action_data={'reason': reason}
        )
        
        # ثبت کامنت
        comment = ResolutionComment.objects.create(
            resolution=resolution,
            author=user,
            comment_type='action',
            content=f'مصوبه به مدیرعامل برگشت داده شد و منتظر تایید مدیرعامل است.\nدلیل: {reason}',
            related_action=action
        )
        
        # نوتیفیکیشن برای مدیرعامل
        meeting_num = to_persian_numbers(str(resolution.meeting.number))
        clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
        
        # اطمینان از اینکه همه مدیرعامل‌ها نوتیف بگیرند
        ceos = User.objects.filter(profile__position='ceo')
        for ceo in ceos:
            NotificationService.create_notification(
                recipient=ceo,
                message=f"مصوبه جلسه {meeting_num} بند {clause_subclause} توسط واحد مجری برگشت داده شد.\nدلیل: {reason}",
                resolution=resolution
            )
        
        return Response(
            {"message": "مصوبه با موفقیت به مدیرعامل برگشت داده شد.", "status": resolution.status}, 
            status=status.HTTP_200_OK
        )
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def edit_resolution(request, public_id):
    """ویرایش مصوبه توسط دبیر (فقط برای مصوبات برگشتی)"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        
        # بررسی مجوز - فقط دبیر می‌تواند ویرایش کند، ناظر نمی‌تواند status تغییر دهد
        is_secretary = hasattr(user, 'profile') and user.profile.position == 'secretary'
        is_auditor = hasattr(user, 'profile') and user.profile.position == 'auditor'
        is_ceo = hasattr(user, 'profile') and user.profile.position == 'ceo'
        
        if is_auditor:
            return Response(
                {"error": "ناظران نمی‌توانند وضعیت مصوبه را تغییر دهند. این تغییرات توسط سیستم خودکار انجام می‌شود."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not (is_secretary or (is_ceo and resolution.status in ['pending_ceo_approval', 'returned_to_secretary'])):
            return Response(
                {"error": "فقط دبیر یا مدیرعامل (در انتظار تایید مدیرعامل یا مصوبات برگشتی) می‌تواند مصوبه را ویرایش کند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # بررسی وضعیت - فقط مصوبات برگشتی قابل ویرایش هستند
        # if resolution.status != 'returned_to_secretary':  # موقتاً غیرفعال برای تست
        #     return Response(
        #         {"error": "فقط مصوبات برگشت داده شده قابل ویرایش هستند."}, 
        #         status=status.HTTP_400_BAD_REQUEST
        #     )
        
        if request.method == 'GET':
            # دریافت اطلاعات مصوبه برای ویرایش
            serializer = ResolutionSerializer(resolution)
            return Response(serializer.data)
        
        elif request.method in ['PUT', 'PATCH']:
            # ویرایش مصوبه
            print("Edit resolution data received:", request.data)  # Debug
            
            old_data = {
                'description': resolution.description,
                'executor_unit': resolution.executor_unit.id if resolution.executor_unit else None,
                'deadline': resolution.deadline.isoformat() if resolution.deadline else None,
                'type': resolution.type
            }
            
            # بروزرسانی داده‌ها
            serializer = ResolutionSerializer(resolution, data=request.data, partial=(request.method == 'PATCH'))
            if serializer.is_valid():
                updated_resolution = serializer.save()
                
                # ثبت تغییرات در کامنت
                changes = []
                if old_data['description'] != updated_resolution.description:
                    changes.append("توضیحات مصوبه")
                if old_data['executor_unit'] != (updated_resolution.executor_unit.id if updated_resolution.executor_unit else None):
                    changes.append("واحد مجری")
                if old_data['deadline'] != (updated_resolution.deadline.isoformat() if updated_resolution.deadline else None):
                    changes.append("مهلت انجام")
                if old_data['type'] != updated_resolution.type:
                    changes.append("نوع مصوبه")
                
                if changes:
                    # ثبت کامنت ویرایش
                    comment = ResolutionComment.objects.create(
                        resolution=updated_resolution,
                        author=user,
                        comment_type='action',
                        content=f'مصوبه ویرایش شد.\nموارد تغییر: {", ".join(changes)}',
                        action_data={'changes': changes, 'old_data': old_data}
                    )
                    
                    # ثبت اکشن
                    action = ResolutionAction.objects.create(
                        resolution=updated_resolution,
                        actor=user,
                        action_type='edit',
                        description=f'ویرایش مصوبه: {", ".join(changes)}',
                        action_data={'changes': changes, 'old_data': old_data},
                        related_comment=comment
                    )
                
                # تغییر وضعیت بر اساس نقش کاربر
                if is_secretary:
                    # اگر دبیر ویرایش کند، وضعیت به "pending_ceo_approval" تغییر کند
                    updated_resolution.status = 'pending_ceo_approval'
                    updated_resolution.save()
                    
                    # ثبت اکشن تایید دبیر
                    secretary_action = ResolutionAction.objects.create(
                        resolution=updated_resolution,
                        actor=user,
                        action_type='secretary_approved',
                        description='تایید مصوبه توسط دبیر (پس از ویرایش)',
                        action_data={
                            'previous_status': 'returned_to_secretary',
                            'new_status': 'pending_ceo_approval',
                            'edit_related': True
                        }
                    )
                    
                    # ایجاد کامنت برای اکشن تایید دبیر
                    secretary_comment = ResolutionComment.objects.create(
                        resolution=updated_resolution,
                        author=user,
                        comment_type='action',
                        content='مصوبه توسط دبیر تایید شد (پس از ویرایش)',
                        related_action=secretary_action
                    )
                    
                    # ایجاد نوتیفیکیشن برای مدیرعامل
                    ceos = User.objects.filter(profile__position='ceo')
                    for ceo in ceos:
                        meeting_num = to_persian_numbers(str(updated_resolution.meeting.number))
                        clause_subclause = to_persian_numbers(f"{updated_resolution.clause}-{updated_resolution.subclause}")
                        NotificationService.create_notification(
                            recipient=ceo,
                            message=f"مصوبه جلسه {meeting_num} بند {clause_subclause} ویرایش شده و برای تایید ارسال شده است.",
                            resolution=updated_resolution
                        )
                else:
                    # اگر مدیرعامل ویرایش کند، وضعیت بر اساس نوع مصوبه تغییر کند
                    if updated_resolution.type == 'informational':
                        updated_resolution.status = 'completed'
                    else:
                        updated_resolution.status = 'notified'
                    updated_resolution.save()
                    
                    # ثبت اکشن تایید مدیرعامل
                    new_status = 'completed' if updated_resolution.type == 'informational' else 'notified'
                    ceo_action = ResolutionAction.objects.create(
                        resolution=updated_resolution,
                        actor=user,
                        action_type='ceo_approved',
                        description=f'تایید مصوبه توسط مدیرعامل (پس از ویرایش) - وضعیت: {new_status}',
                        action_data={
                            'previous_status': 'pending_ceo_approval',
                            'new_status': new_status,
                            'edit_related': True
                        }
                    )
                    
                    # ایجاد کامنت برای اکشن تایید مدیرعامل
                    comment_text = (
                        'مصوبه اطلاع‌رسانی توسط مدیرعامل تایید و تکمیل شد (پس از ویرایش)' 
                        if updated_resolution.type == 'informational' 
                        else 'مصوبه توسط مدیرعامل تایید شد (پس از ویرایش)'
                    )
                    ceo_comment = ResolutionComment.objects.create(
                        resolution=updated_resolution,
                        author=user,
                        comment_type='action',
                        content=comment_text,
                        related_action=ceo_action
                    )
                    
                    # ایجاد نوتیفیکیشن برای واحد مجری
                    if updated_resolution.executor_unit:
                        NotificationService.create_notification(
                            recipient=updated_resolution.executor_unit,
                            message=f"مصوبه {updated_resolution.clause}-{updated_resolution.subclause} ویرایش شده و مجدداً ابلاغ شده است.",
                            resolution=updated_resolution
                        )
                
                response_message = (
                    "مصوبه اطلاع‌رسانی با موفقیت ویرایش شد و تکمیل گردید."
                    if updated_resolution.type == 'informational'
                    else "مصوبه با موفقیت ویرایش شد و مجدداً ابلاغ گردید."
                )
                return Response({
                    "message": response_message,
                    "resolution": ResolutionSerializer(updated_resolution).data
                })
            else:
                print("Serializer validation errors:", serializer.errors)  # Debug
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_resolution_participants(request, public_id):
    """افزودن اعضای جدید به گروه پیگیری مصوبه"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        
        # بررسی مجوز - معاونان و مدیران می‌توانند اعضا اضافه کنند
        print(f"User: {user.username}")  # Debug
        print(f"User groups: {[g.name for g in user.groups.all()]}")  # Debug
        print(f"Has profile: {hasattr(user, 'profile')}")  # Debug
        if hasattr(user, 'profile'):
            print(f"User position: {user.profile.position}")  # Debug
        
        # بررسی اینکه کاربر معاون یا مدیر است
        is_deputy = (user.groups.filter(name='Deputy').exists() or 
                    (hasattr(user, 'profile') and user.profile.position == 'deputy'))
        is_manager = (user.groups.filter(name='Manager').exists() or 
                     (hasattr(user, 'profile') and user.profile.position == 'manager'))
        
        if not (is_deputy or is_manager):
            return Response(
                {"error": "فقط معاونان و مدیران می‌توانند اعضا به گروه پیگیری اضافه کنند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        participant_ids = request.data.get('participant_ids', [])
        
        if not participant_ids:
            return Response(
                {"error": "حداقل یک عضو برای افزودن انتخاب کنید."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی وجود کاربران
        participants = User.objects.filter(id__in=participant_ids)
        if len(participants) != len(participant_ids):
            return Response(
                {"error": "برخی از کاربران انتخاب شده معتبر نیستند."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی اینکه کاربران انتخابی زیرمجموعه معاون هستند
        if hasattr(user, 'profile'):
            user_subordinates = user.profile.get_all_subordinates()
            user_subordinate_ids = [sub.id for sub in user_subordinates]
            
            for participant in participants:
                if participant.id not in user_subordinate_ids:
                    return Response(
                        {"error": f"کاربر {participant.get_full_name() or participant.username} در زیرمجموعه شما نیست."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # اضافه کردن کاربران به participants
        added_count = 0
        for participant in participants:
            if participant not in resolution.participants.all():
                resolution.participants.add(participant)
                added_count += 1
                
                # ایجاد نوتیفیکیشن برای عضو جدید
                meeting_num = to_persian_numbers(str(resolution.meeting.number))
                clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
                NotificationService.create_notification(
                    recipient=participant,
                    message=f"شما به گروه پیگیری مصوبه جلسه {meeting_num} بند {clause_subclause} اضافه شدید.",
                    resolution=resolution
                )
        
        if added_count == 0:
            return Response(
                {"message": "همه کاربران انتخاب شده قبلاً در گروه پیگیری هستند."}, 
                status=status.HTTP_200_OK
            )
        
        # ثبت کامنت
        participant_names = [p.get_full_name() or p.username for p in participants]
        comment_content = f"اعضای جدید به گروه پیگیری اضافه شدند: {', '.join(participant_names)}"
        
        comment = ResolutionComment.objects.create(
            resolution=resolution,
            author=user,
            comment_type='action',
            content=comment_content,
            action_data={'added_participants': [p.id for p in participants], 'added_count': added_count}
        )
        
        # ثبت اکشن
        action = ResolutionAction.objects.create(
            resolution=resolution,
            actor=user,
            action_type='add_participants',
            description=f'افزودن {added_count} عضو جدید به گروه پیگیری',
            action_data={'added_participants': [p.id for p in participants], 'added_count': added_count},
            related_comment=comment
        )
        
        return Response(
            {"message": f"{added_count} عضو جدید با موفقیت اضافه شد.", "added_count": added_count}, 
            status=status.HTTP_200_OK
        )
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_resolution_participant(request, public_id):
    """حذف عضو از گروه پیگیری مصوبه"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        
        participant_id = request.data.get('participant_id')
        if not participant_id:
            return Response(
                {"error": "شناسه کاربر برای حذف الزامی است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # دریافت کاربر برای حذف
        try:
            participant_to_remove = User.objects.get(id=participant_id)
        except User.DoesNotExist:
            return Response(
                {"error": "کاربر مورد نظر یافت نشد."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # بررسی اینکه آیا کاربر مورد نظر در گروه پیگیری است یا نه
        if participant_to_remove not in resolution.participants.all():
            return Response(
                {"error": "کاربر مورد نظر در گروه پیگیری نیست."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی مجوز حذف - فقط زیرمجموعه‌ها قابل حذف هستند
        can_remove = False
        
        # بررسی اینکه آیا کاربر می‌خواهد خودش را حذف کند (غیرمجاز)
        if participant_to_remove == user:
            return Response(
                {"error": "شما نمی‌توانید خودتان را از گروه حذف کنید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # فقط اگر مدیر/معاون باشد و کاربر در زیرمجموعه‌اش باشد (مستقیم یا غیرمستقیم)
        if hasattr(user, 'profile'):
            user_subordinates = user.profile.get_all_subordinates()
            user_subordinate_ids = [sub.id for sub in user_subordinates]
            
            if participant_to_remove.id in user_subordinate_ids:
                can_remove = True
        
        if not can_remove:
            participant_name = participant_to_remove.get_full_name() or participant_to_remove.username
            return Response(
                {"error": f"شما مجاز به حذف {participant_name} نیستید. فقط می‌توانید زیرمجموعه‌های خود را حذف کنید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # حذف کاربر از گروه پیگیری
        resolution.participants.remove(participant_to_remove)
        
        # ایجاد نوتیفیکیشن برای کاربر حذف شده (مگر اینکه خودش را حذف کرده باشد)
        # نوتیفیکیشن بدون لینک به مصوبه چون کاربر دیگر دسترسی ندارد
        if participant_to_remove != user:
            meeting_num = to_persian_numbers(str(resolution.meeting.number))
            clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
            NotificationService.create_notification(
                recipient=participant_to_remove,
                message=f"شما از گروه پیگیری مصوبه جلسه {meeting_num} بند {clause_subclause} حذف شدید.",
                resolution=None  # بدون لینک به مصوبه چون دسترسی ندارد
            )
        
        # ثبت کامنت
        participant_name = participant_to_remove.get_full_name() or participant_to_remove.username
        comment_content = f"{participant_name} از گروه پیگیری حذف شد"
        
        comment = ResolutionComment.objects.create(
            resolution=resolution,
            author=user,
            comment_type='action',
            content=comment_content,
            action_data={'removed_participant': participant_to_remove.id}
        )
        
        # ثبت اکشن
        action = ResolutionAction.objects.create(
            resolution=resolution,
            actor=user,
            action_type='remove_participant',
            description=f'حذف {participant_name} از گروه پیگیری',
            action_data={'removed_participant': participant_to_remove.id},
            related_comment=comment
        )
        
        return Response(
            {"message": f"{participant_name} با موفقیت از گروه پیگیری حذف شد."}, 
            status=status.HTTP_200_OK
        )
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        # لاگ کردن خطا برای debugging
        import traceback
        print(f"Error in remove_resolution_participant: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {"error": f"خطا در حذف کاربر: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auditor_stats(request):
    """آمار کلی برای داشبورد ناظر"""
    try:
        user = request.user
        
        # بررسی اینکه کاربر ناظر یا مدیرعامل است
        if not (hasattr(user, 'profile') and user.profile.position in ['auditor', 'ceo']):
            return Response(
                {"error": "فقط ناظران و مدیرعامل به این بخش دسترسی دارند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # آمار کلی مصوبات
        total_resolutions = Resolution.objects.count()
        operational_resolutions = Resolution.objects.filter(type='operational').count()
        informational_resolutions = Resolution.objects.filter(type='informational').count()
        
        # آمار مصوبات عملیاتی (فقط عملیاتی)
        completed_resolutions = Resolution.objects.filter(status='completed', type='operational').count()
        cancelled_resolutions = Resolution.objects.filter(status='cancelled', type='operational').count()
        notified_resolutions = Resolution.objects.filter(status='notified', type='operational').count()
        pending_resolutions = Resolution.objects.filter(status='in_progress', type='operational').count()
        returned_resolutions = Resolution.objects.filter(status='returned_to_secretary', type='operational').count()
        
        # آمار انتظار تایید
        pending_ceo_approval = Resolution.objects.filter(status='pending_ceo_approval').count()
        pending_secretary_approval = Resolution.objects.filter(status='pending_secretary_approval').count()
        pending_approval = pending_ceo_approval + pending_secretary_approval
        
        # مصوبات عقب افتاده (فقط عملیاتی)
        today = date.today()
        overdue_resolutions = Resolution.objects.filter(
            deadline__lt=today,
            status__in=['notified', 'in_progress'],
            type='operational'
        ).count()
        
        # آمار جلسات
        total_meetings = Meeting.objects.count()
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_meetings = Meeting.objects.filter(held_at__gte=thirty_days_ago).count()
        
        # تعداد واحدهای فعال (واحدهایی که حداقل یک مصوبه دارند)
        active_executors = Resolution.objects.filter(executor_unit__isnull=False).values('executor_unit').distinct().count()
        
        return Response({
            'total_resolutions': total_resolutions,
            'operational_resolutions': operational_resolutions,
            'informational_resolutions': informational_resolutions,
            'completed_resolutions': completed_resolutions,
            'cancelled_resolutions': cancelled_resolutions,
            'notified_resolutions': notified_resolutions,
            'pending_resolutions': pending_resolutions,
            'returned_resolutions': returned_resolutions,
            'overdue_resolutions': overdue_resolutions,
            'total_meetings': total_meetings,
            'recent_meetings': recent_meetings,
            'active_executors': active_executors,
            'pending_ceo_approval': pending_ceo_approval,
            'pending_secretary_approval': pending_secretary_approval,
            'pending_approval': pending_approval,
        })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در دریافت آمار: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """آمار داشبورد - اطلاعات کلی مصوبات"""
    try:
        from django.db.models import Count, Q
        from datetime import date
        
        # 1. تعداد کل مصوبات
        total_resolutions = Resolution.objects.count()
        
        # 2. تعداد مصوبات به تفکیک نوع
        operational_resolutions = Resolution.objects.filter(type='operational').count()
        informational_resolutions = Resolution.objects.filter(type='informational').count()
        
        # 3. تعداد مصوبات در انتظار تایید دبیر
        pending_secretary_approval = Resolution.objects.filter(status='pending_secretary_approval').count()
        
        # 4. تعداد مصوبات در انتظار تایید مدیرعامل
        pending_ceo_approval = Resolution.objects.filter(status='pending_ceo_approval').count()
        
        # 5. تعداد مصوبات در انتظار تایید واحد مجری
        # مصوباتی که وضعیت "در حال ابلاغ" دارند و هنوز توسط واحد مجری پذیرفته نشده‌اند
        pending_executor_approval = Resolution.objects.filter(
            status='notified',
            executor_unit__isnull=False
        ).count()
        
        # آمار اضافی برای داشبورد
        completed_resolutions = Resolution.objects.filter(status='completed').count()
        in_progress_resolutions = Resolution.objects.filter(status='in_progress').count()
        cancelled_resolutions = Resolution.objects.filter(status='cancelled').count()
        
        # مصوبات عقب افتاده
        today = date.today()
        overdue_resolutions = Resolution.objects.filter(
            deadline__lt=today,
            status__in=['notified', 'in_progress']
        ).count()
        
        # آمار جلسات
        total_meetings = Meeting.objects.count()
        
        # تعداد تسک‌های pending کاربر جاری و نقش‌های خاص
        user = request.user
        from django.db.models import Q
        # دبیر
        pending_tasks_secretary = Resolution.objects.filter(status='pending_secretary_approval').count()
        # مدیرعامل
        pending_tasks_ceo = Resolution.objects.filter(status='pending_ceo_approval').count()
        # مجری (فقط مصوباتی که مجری خود کاربر است و notified)
        pending_tasks_executor = Resolution.objects.filter(
            status='notified',
            executor_unit=user
        ).count()
        # حالت قبلی (برای کاربر عادی یا سایر نقش‌ها)
        my_pending_tasks = Resolution.objects.filter(
            Q(executor_unit=user) | Q(coworkers=user) | Q(inform_units=user) | Q(participants=user),
            status__in=['in_progress', 'notified', 'pending_ceo_approval', 'pending_secretary_approval']
        ).distinct().count()
        
        return Response({
            # آمار اصلی درخواستی
            'total_resolutions': total_resolutions,
            'operational_resolutions': operational_resolutions,
            'informational_resolutions': informational_resolutions,
            'completed_resolutions': completed_resolutions,
            'in_progress_resolutions': in_progress_resolutions,
            'cancelled_resolutions': cancelled_resolutions,
            'overdue_resolutions': overdue_resolutions,
            'total_meetings': total_meetings,
            'pending_secretary_approval': pending_secretary_approval,
            'pending_ceo_approval': pending_ceo_approval,
            'pending_executor_approval': pending_executor_approval,
            # جدید:
            'pending_tasks_secretary': pending_tasks_secretary,
            'pending_tasks_ceo': pending_tasks_ceo,
            'pending_tasks_executor': pending_tasks_executor,
            'my_pending_tasks': my_pending_tasks,
            
            # خلاصه وضعیت‌ها
            'status_summary': {
                'total': total_resolutions,
                'operational': operational_resolutions,
                'informational': informational_resolutions,
                'pending_secretary': pending_secretary_approval,
                'pending_ceo': pending_ceo_approval,
                'pending_executor': pending_executor_approval,
                'completed': completed_resolutions,
                'in_progress': in_progress_resolutions,
                'cancelled': cancelled_resolutions,
                'overdue': overdue_resolutions,
            }
        })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در دریافت آمار داشبورد: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_resolutions(request):
    """مصوبات اخیر برای نمایش در داشبورد"""
    try:
        user = request.user
        
        # بررسی اینکه کاربر ناظر یا مدیرعامل است
        if not (hasattr(user, 'profile') and user.profile.position in ['auditor', 'ceo']):
            return Response(
                {"error": "فقط ناظران و مدیرعامل به این بخش دسترسی دارند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        limit = int(request.GET.get('limit', 10))
        
        # دریافت مصوبات اخیر
        resolutions = Resolution.objects.select_related(
            'meeting', 'executor_unit'
        ).order_by('-created_at')[:limit]
        
        # سریالایز کردن داده‌ها
        data = []
        for resolution in resolutions:
            data.append({
                'id': str(resolution.id),
                'clause': resolution.clause,
                'subclause': resolution.subclause,
                'description': resolution.description,
                'status': resolution.status,
                'created_at': resolution.created_at.isoformat(),
                'meeting': {
                    'number': resolution.meeting.number,
                    'date': resolution.meeting.held_at.isoformat() if resolution.meeting.held_at else None,
                },
                'executor_unit': {
                    'name': resolution.executor_unit.get_full_name() or resolution.executor_unit.username if resolution.executor_unit else 'نامشخص',
                }
            })
        
        return Response(data)
        
    except Exception as e:
        return Response(
            {"error": f"خطا در دریافت مصوبات اخیر: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resolutions_by_unit(request):
    """آمار مصوبات به تفکیک واحد مجری برای نمودار (برای همه کاربران لاگین‌شده)"""
    try:
        # آمار مصوبات به تفکیک واحد مجری
        unit_stats = Resolution.objects.select_related('executor_unit').values(
            'executor_unit__first_name', 
            'executor_unit__last_name', 
            'executor_unit__username'
        ).annotate(
            total_count=Count('id'),
            completed_count=Count(Case(When(status='completed', then=1))),
            notified_count=Count(Case(When(status='notified', then=1))),
            pending_count=Count(Case(When(status='in_progress', then=1))),
            returned_count=Count(Case(When(status='returned_to_secretary', then=1))),
            cancelled_count=Count(Case(When(status='cancelled', then=1)))
        ).filter(executor_unit__isnull=False).order_by('-total_count')[:10]  # فقط 10 واحد برتر
        # تبدیل به فرمت مناسب برای نمودار
        data = []
        for stat in unit_stats:
            unit_name = f"{stat['executor_unit__first_name']} {stat['executor_unit__last_name']}".strip()
            if not unit_name:
                unit_name = stat['executor_unit__username']
            data.append({
                'unit_name': unit_name,
                'total_count': stat['total_count'],
                'completed_count': stat['completed_count'],
                'notified_count': stat['notified_count'],
                'pending_count': stat['pending_count'],
                'returned_count': stat['returned_count'],
                'cancelled_count': stat['cancelled_count'],
            })
        return Response(data)
    except Exception as e:
        return Response({"error": f"خطا در دریافت آمار واحدها: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unit_notified_resolutions(request):
    """تعداد مصوبات در حال ابلاغ برای واحد مجری خاص یا همه واحدها برای ناظر/مدیرعامل"""
    try:
        user = request.user
        position = getattr(user.profile, 'position', None) if hasattr(user, 'profile') else None
        # اگر کاربر ناظر یا مدیرعامل است، آمار همه واحدها را بده
        if position in ['auditor', 'ceo', 'secretary']:
            from django.db.models import Count
            from apps.core.models import UserProfile
            units = UserProfile.objects.filter(position='deputy')
            data = []
            for unit in units:
                notified_count = Resolution.objects.filter(
                    executor_unit=unit.user,
                    status='notified'
                ).count()
                unit_name = unit.user.get_full_name() or unit.user.username
                data.append({
                    'unit_name': unit_name,
                    'notified_count': notified_count
                })
            return Response(data)
        # اگر کاربر deputy است، فقط آمار خودش را بده
        if position == 'deputy':
            notified_count = Resolution.objects.filter(
                executor_unit=user,
                status='notified'
            ).count()
            unit_name = user.get_full_name() or user.username
            return Response({
                'unit_name': unit_name,
                'notified_count': notified_count
            })
        # سایر کاربران: آمار واحد خودشان (در صورت وجود)
        notified_count = Resolution.objects.filter(
            executor_unit=user,
            status='notified'
        ).count()
        unit_name = user.get_full_name() or user.username
        return Response({
            'unit_name': unit_name,
            'notified_count': notified_count
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": f"خطا در دریافت آمار واحد: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def test_dashboard_endpoint(request):
    """Test endpoint for dashboard stats"""
    return Response({
        'message': 'Dashboard endpoint is working',
        'user': request.user.username,
        'total_resolutions': 33,
        'operational_resolutions': 25,
        'informational_resolutions': 8,
        'completed_resolutions': 15,
        'cancelled_resolutions': 2,
        'notified_resolutions': 8,
        'pending_resolutions': 5,
        'returned_resolutions': 3,
        'overdue_resolutions': 6,
        'total_meetings': 10,
        'recent_meetings': 3,
        'active_executors': 3,
        'pending_ceo_approval': 5,
        'pending_secretary_approval': 3,
        'pending_approval': 8,
    })

@api_view(['GET'])
def debug_resolution_statuses(request):
    """Debug: نمایش تعداد مصوبات در هر وضعیت"""
    try:
        from django.db.models import Count
        
        # شمارش مصوبات در هر وضعیت
        status_counts = Resolution.objects.values('status').annotate(count=Count('id')).order_by('status')
        
        # تمام مصوبات با جزئیات
        all_resolutions = Resolution.objects.values('id', 'clause', 'subclause', 'status')[:20]
        
        # اطلاعات کاربر فعلی
        user_info = {
            'username': request.user.username,
            'has_profile': hasattr(request.user, 'profile'),
            'position': request.user.profile.position if hasattr(request.user, 'profile') else None,
            'groups': list(request.user.groups.values_list('name', flat=True))
        }
        
        return Response({
            'status_counts': list(status_counts),
            'all_resolutions': list(all_resolutions),
            'total_count': Resolution.objects.count(),
            'current_user': user_info
        })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در debug: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['POST'])
def create_sample_resolutions(request):
    """ایجاد مصوبه‌های نمونه برای تست"""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # پیدا کردن یک کاربر برای تست
        user = User.objects.first()
        if not user:
            return Response({"error": "هیچ کاربری یافت نشد"}, status=400)
        
        # پیدا کردن یا ایجاد یک جلسه
        meeting = Meeting.objects.first()
        if not meeting:
            meeting = Meeting.objects.create(
                number=1000,
                held_at='2024-01-01',
                description='جلسه تست'
            )
        
        # ایجاد مصوبه‌های نمونه با statusهای مختلف
        sample_data = [
            {'status': 'notified', 'clause': '1', 'subclause': '1', 'description': 'مصوبه در حال ابلاغ'},
            {'status': 'in_progress', 'clause': '1', 'subclause': '2', 'description': 'مصوبه در حال اجرا'},
            {'status': 'completed', 'clause': '1', 'subclause': '3', 'description': 'مصوبه تکمیل شده'},
            {'status': 'cancelled', 'clause': '1', 'subclause': '4', 'description': 'مصوبه لغو شده'},
            {'status': 'returned_to_secretary', 'clause': '1', 'subclause': '5', 'description': 'مصوبه برگشت به دبیر'},
        ]
        
        created_resolutions = []
        for data in sample_data:
            resolution = Resolution.objects.create(
                meeting=meeting,
                clause=data['clause'],
                subclause=data['subclause'],
                description=data['description'],
                status=data['status'],
                type='operational',
                executor_unit=user,
                created_by=user
            )
            created_resolutions.append({
                'id': str(resolution.id),
                'status': resolution.status,
                'clause': resolution.clause,
                'subclause': resolution.subclause
            })
        
        return Response({
            'message': 'مصوبه‌های نمونه ایجاد شدند',
            'created_resolutions': created_resolutions
        })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در ایجاد مصوبه‌های نمونه: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """تغییر کلمه عبور کاربر"""
    try:
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # اعتبارسنجی ورودی
        if not current_password:
            return Response(
                {"error": "کلمه عبور فعلی اجباری است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_password:
            return Response(
                {"error": "کلمه عبور جدید اجباری است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if new_password != confirm_password:
            return Response(
                {"error": "کلمه عبور جدید و تکرار آن مطابقت ندارند."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {"error": "کلمه عبور جدید باید حداقل ۸ کاراکتر باشد."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی کلمه عبور فعلی
        user = request.user
        if not user.check_password(current_password):
            return Response(
                {"error": "کلمه عبور فعلی صحیح نیست."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # تنظیم کلمه عبور جدید
        user.set_password(new_password)
        user.save()
        
        return Response(
            {"message": "کلمه عبور با موفقیت تغییر یافت."}, 
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        return Response(
            {"error": "خطای داخلی سرور."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_email(request):
    """تغییر ایمیل کاربر"""
    try:
        new_email = request.data.get('new_email')
        password = request.data.get('password')
        
        # اعتبارسنجی ورودی
        if not new_email:
            return Response(
                {"error": "ایمیل جدید اجباری است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not password:
            return Response(
                {"error": "کلمه عبور برای تأیید هویت اجباری است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # اعتبارسنجی فرمت ایمیل
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, new_email):
            return Response(
                {"error": "فرمت ایمیل صحیح نیست."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی تکراری نبودن ایمیل
        user = request.user
        if User.objects.filter(email=new_email).exclude(id=user.id).exists():
            return Response(
                {"error": "این ایمیل قبلاً توسط کاربر دیگری استفاده شده است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # بررسی کلمه عبور فعلی
        if not user.check_password(password):
            return Response(
                {"error": "کلمه عبور صحیح نیست."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # تنظیم ایمیل جدید
        user.email = new_email
        user.save()
        
        return Response(
            {"message": "ایمیل با موفقیت تغییر یافت."}, 
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        return Response(
            {"error": "خطای داخلی سرور."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def edit_user(request, user_id):
    """ویرایش اطلاعات کاربر توسط دبیر"""
    try:
        target_user = get_object_or_404(User, id=user_id)
        user = request.user
        
        # بررسی مجوز - فقط دبیر می‌تواند ویرایش کند
        is_secretary = hasattr(user, 'profile') and user.profile.position == 'secretary'
        
        if not is_secretary:
            return Response(
                {"error": "فقط دبیر می‌تواند اطلاعات کاربران را ویرایش کند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # دریافت داده‌های ویرایش شده
        data = request.data
        
        # بروزرسانی اطلاعات کاربر
        if 'first_name' in data:
            target_user.first_name = data['first_name']
        if 'last_name' in data:
            target_user.last_name = data['last_name']
        if 'email' in data:
            target_user.email = data['email']
            
        # بروزرسانی پروفایل کاربر
        if hasattr(target_user, 'profile'):
            if 'position' in data:
                target_user.profile.position = data['position']
            if 'department' in data:
                target_user.profile.department = data['department']
            if 'supervisor' in data:
                supervisor_id = data['supervisor']
                if supervisor_id:
                    supervisor = User.objects.get(id=supervisor_id)
                    target_user.profile.supervisor = supervisor
                else:
                    target_user.profile.supervisor = None
            target_user.profile.save()
            
        target_user.save()
        
        return Response(UserSerializer(target_user).data)
        
    except User.DoesNotExist:
        return Response(
            {"error": "کاربر مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    """ایجاد کاربر جدید توسط دبیر"""
    try:
        user = request.user
        
        # بررسی مجوز - فقط دبیر می‌تواند کاربر جدید ایجاد کند
        is_secretary = hasattr(user, 'profile') and user.profile.position == 'secretary'
        
        if not is_secretary:
            return Response(
                {"error": "فقط دبیر می‌تواند کاربر جدید ایجاد کند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # دریافت داده‌های کاربر جدید
        data = request.data
        
        # بررسی وجود فیلدهای ضروری
        required_fields = ['username', 'password']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {"error": f"فیلد {field} الزامی است."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # بررسی تکراری نبودن نام کاربری
        if User.objects.filter(username=data['username']).exists():
            return Response(
                {"error": "این نام کاربری قبلاً استفاده شده است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ایجاد کاربر جدید
        new_user = User.objects.create_user(
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            email=data.get('email', '')
        )
        
        # ایجاد پروفایل کاربر
        UserProfile.objects.create(
            user=new_user,
            position=data.get('position', ''),
            department=data.get('department', '')
        )
        
        # تنظیم سرپرست
        if data.get('supervisor'):
            try:
                supervisor = User.objects.get(id=data['supervisor'])
                new_user.profile.supervisor = supervisor
                new_user.profile.save()
            except User.DoesNotExist:
                pass
        
        return Response(UserSerializer(new_user).data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Update last_login
        user = self.user
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Add user data to response
        user_serializer = UserSerializer(user)
        data.update(user_serializer.data)
        
        return data

@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access = response.data.get('access')
            refresh = response.data.get('refresh')
            response.set_cookie(
                JWT_COOKIE_NAME, access,
                max_age=JWT_COOKIE_MAX_AGE,
                path=JWT_COOKIE_PATH,
                secure=JWT_COOKIE_SECURE,
                httponly=JWT_COOKIE_HTTPONLY,
                samesite=JWT_COOKIE_SAMESITE
            )
            response.set_cookie(
                JWT_REFRESH_COOKIE_NAME, refresh,
                max_age=JWT_COOKIE_MAX_AGE * 7,
                path=JWT_COOKIE_PATH,
                secure=JWT_COOKIE_SECURE,
                httponly=JWT_COOKIE_HTTPONLY,
                samesite=JWT_COOKIE_SAMESITE
            )
        return response

@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Try to get refresh token from cookie if not in body
        if 'refresh' not in request.data:
            request.data['refresh'] = request.COOKIES.get(JWT_REFRESH_COOKIE_NAME)
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access = response.data.get('access')
            response.set_cookie(
                JWT_COOKIE_NAME, access,
                max_age=JWT_COOKIE_MAX_AGE,
                path=JWT_COOKIE_PATH,
                secure=JWT_COOKIE_SECURE,
                httponly=JWT_COOKIE_HTTPONLY,
                samesite=JWT_COOKIE_SAMESITE
            )
        return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ceo_stats(request):
    """آمار کلی برای داشبورد مدیرعامل"""
    try:
        user = request.user
        
        # بررسی اینکه کاربر مدیرعامل است
        if not (hasattr(user, 'profile') and user.profile.position == 'ceo'):
            return Response(
                {"error": "فقط مدیرعامل به این بخش دسترسی دارد."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # آمار کلی مصوبات
        total_resolutions = Resolution.objects.count()
        operational_resolutions = Resolution.objects.filter(type='operational').count()
        informational_resolutions = Resolution.objects.filter(type='informational').count()
        
        # آمار مصوبات عملیاتی (فقط عملیاتی)
        completed_resolutions = Resolution.objects.filter(status='completed', type='operational').count()
        cancelled_resolutions = Resolution.objects.filter(status='cancelled', type='operational').count()
        notified_resolutions = Resolution.objects.filter(status='notified', type='operational').count()
        pending_resolutions = Resolution.objects.filter(status='in_progress', type='operational').count()
        returned_resolutions = Resolution.objects.filter(status='returned_to_secretary', type='operational').count()
        
        # مصوبات در انتظار تایید مدیرعامل (وضعیت جدید)
        pending_ceo_approval = Resolution.objects.filter(status='pending_ceo_approval', type='operational').count()
        
        # مصوبات عقب افتاده (فقط عملیاتی)
        today = date.today()
        overdue_resolutions = Resolution.objects.filter(
            deadline__lt=today,
            status__in=['notified', 'in_progress'],
            type='operational'
        ).count()
        
        # آمار جلسات
        total_meetings = Meeting.objects.count()
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_meetings = Meeting.objects.filter(held_at__gte=thirty_days_ago).count()
        
        # تعداد واحدهای فعال (واحدهایی که حداقل یک مصوبه دارند)
        active_executors = Resolution.objects.filter(executor_unit__isnull=False).values('executor_unit').distinct().count()
        
        return Response({
            'total_resolutions': total_resolutions,
            'operational_resolutions': operational_resolutions,
            'informational_resolutions': informational_resolutions,
            'completed_resolutions': completed_resolutions,
            'cancelled_resolutions': cancelled_resolutions,
            'notified_resolutions': notified_resolutions,
            'pending_resolutions': pending_resolutions,
            'returned_resolutions': returned_resolutions,
            'overdue_resolutions': overdue_resolutions,
            'total_meetings': total_meetings,
            'recent_meetings': recent_meetings,
            'active_executors': active_executors,
            'pending_approval': pending_ceo_approval,
        })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در دریافت آمار: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_resolution_by_ceo(request, public_id):
    """تایید مصوبه توسط مدیرعامل"""
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        
        # بررسی مجوز - فقط مدیرعامل می‌تواند تایید کند
        if not (hasattr(user, 'profile') and user.profile.position == 'ceo'):
            return Response(
                {"error": "فقط مدیرعامل می‌تواند مصوبه را تایید کند."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # بررسی وضعیت مصوبه
        if resolution.status != 'pending_ceo_approval':
            return Response(
                {"error": "این مصوبه در وضعیت قابل تایید نیست."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # تغییر وضعیت بر اساس نوع مصوبه
        if resolution.type == 'informational':
            resolution.status = 'completed'
        else:
            resolution.status = 'notified'
        resolution.save()        
        # ثبت اکشن تایید
        action = ResolutionAction.objects.create(
            resolution=resolution,
            actor=user,
            action_type='ceo_approved',
            description='مصوبه توسط مدیرعامل تایید شد و به مرحله ابلاغ منتقل شد.'
        )
        
        # ثبت کامنت
        comment_content = 'مصوبه توسط مدیرعامل تایید شد و به واحد مجری ابلاغ شد.'
        comment = ResolutionComment.objects.create(
            resolution=resolution,
            author=user,
            content=comment_content,
            comment_type='action',
            related_action=action
        )
        
        # ایجاد نوتیفیکیشن برای مجری (فقط عملیاتی)
        if resolution.type != 'informational' and resolution.executor_unit:
            meeting_num = to_persian_numbers(str(resolution.meeting.number))
            clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
            NotificationService.create_notification(
                recipient=resolution.executor_unit,
                message=f"مصوبه جلسه {meeting_num} بند {clause_subclause} توسط مدیرعامل تایید شد و به شما ابلاغ شده است.",
                resolution=resolution
            )
        
        # ایجاد نوتیفیکیشن برای همکاران (فقط عملیاتی)
        if resolution.type != 'informational':
            for coworker in resolution.coworkers.all():
                meeting_num = to_persian_numbers(str(resolution.meeting.number))
                clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
                NotificationService.create_notification(
                    recipient=coworker,
                    message=f"مصوبه جلسه {meeting_num} بند {clause_subclause} توسط مدیرعامل تایید شد و در آن به عنوان همکار انتخاب شده‌اید.",
                    resolution=resolution
                )
        
        # ایجاد نوتیفیکیشن برای واحدهای اطلاع‌رسانی (همه انواع)
        for inform_unit in resolution.inform_units.all():
            meeting_num = to_persian_numbers(str(resolution.meeting.number))
            clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
            if resolution.type == 'informational':
                message = f"مصوبه اطلاع‌رسانی جلسه {meeting_num} بند {clause_subclause} توسط مدیرعامل تایید شد و جهت اطلاع ارسال شده است."
            else:
                message = f"مصوبه جلسه {meeting_num} بند {clause_subclause} توسط مدیرعامل تایید شد و جهت اطلاع ارسال شده است."
            
            NotificationService.create_notification(
                recipient=inform_unit,
                message=message,
                resolution=resolution
            )
        
        # ایجاد نوتیفیکیشن برای دبیر (همه انواع)
        if resolution.created_by:
            NotificationService.create_notification(
                recipient=resolution.created_by,
                message=(
                    f"مصوبه جلسه {resolution.meeting.number} bند {resolution.clause}-{resolution.subclause} توسط مدیرعامل تایید شد."
                    if resolution.type != 'informational' else
                    f"مصوبه اطلاع‌رسانی جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} توسط مدیرعامل تایید و تکمیل شد."
                ),
                resolution=resolution
            )
        
        return Response({
            "message": "مصوبه با موفقیت تایید شد.",
            "status": resolution.status
        })
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"خطا در تایید مصوبه: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_notification(request):
    """تست ارسال نوتیفیکیشن لحظه‌ای"""
    try:
        message = request.data.get('message', 'این یک نوتیفیکیشن تست است')
        notification_type = request.data.get('type', 'info')
        
        # ارسال نوتیفیکیشن به کاربر فعلی (هم در دیتابیس ذخیره می‌شود و هم WebSocket می‌فرستد)
        notification = NotificationService.create_notification(
            recipient=request.user,
            message=message,
            resolution=None
        )
        
        return Response({
            'success': True,
            'message': 'نوتیفیکیشن تست ارسال شد',
            'notification_id': str(notification.id) if notification else None
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_resolution_by_secretary(request, public_id):
    """
    تایید مصوبه توسط دبیر
    """
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        
        # بررسی دسترسی: فقط دبیران می‌توانند تایید کنند
        if not (user.groups.filter(name__iexact='secretary').exists() or 
                (hasattr(user, 'profile') and user.profile.position == 'secretary')):
            return Response({
                'error': 'فقط دبیران می‌توانند مصوبه را تایید کنند'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # بررسی وضعیت: فقط مصوبات در انتظار تایید دبیر قابل تایید هستند
        if resolution.status != 'pending_secretary_approval':
            return Response({
                'error': 'این مصوبه در وضعیت انتظار تایید دبیر نیست'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # دریافت داده‌های درخواست
        data = request.data
        approved = data.get('approved', True)
        comment = data.get('comment', '')
        
        with transaction.atomic():
            if approved:
                # تایید مصوبه - تغییر وضعیت به pending_ceo_approval
                resolution.status = 'pending_ceo_approval'
                resolution.save(update_fields=['status', 'updated_at'])
                
                # ایجاد اکشن
                action = ResolutionAction.objects.create(
                    resolution=resolution,
                    actor=user,
                    action_type='secretary_approved',
                    description='تایید مصوبه توسط دبیر',
                    action_data={
                        'previous_status': 'pending_secretary_approval',
                        'new_status': 'pending_ceo_approval',
                        'comment': comment
                    }
                )
                
                # ایجاد کامنت
                if comment:
                    ResolutionComment.objects.create(
                        resolution=resolution,
                        author=user,
                        content=comment,
                        comment_type='action',
                        related_action=action
                    )
                
                # ارسال نوتیفیکیشن به ایجادکننده مصوبه
                if resolution.created_by and resolution.created_by != user:
                    NotificationService.create_notification(
                        recipient=resolution.created_by,
                        resolution=resolution,
                        message=f'مصوبه {resolution.clause}-{resolution.subclause} توسط دبیر تایید شد'
                    )
                
                # ارسال نوتیفیکیشن به مدیرعامل
                ceos = User.objects.filter(profile__position='ceo')
                for ceo in ceos:
                    if ceo != user:
                        NotificationService.create_notification(
                            recipient=ceo,
                            resolution=resolution,
                            message=f'مصوبه {resolution.clause}-{resolution.subclause} توسط دبیر تایید شده و در انتظار تایید شماست'
                        )
                
                return Response({
                    'message': 'مصوبه با موفقیت تایید شد و برای تایید مدیرعامل ارسال شد',
                    'new_status': 'pending_ceo_approval'
                }, status=status.HTTP_200_OK)
            else:
                # رد مصوبه - تغییر وضعیت به cancelled
                resolution.status = 'cancelled'
                resolution.save(update_fields=['status', 'updated_at'])
                
                # ایجاد اکشن
                action = ResolutionAction.objects.create(
                    resolution=resolution,
                    actor=user,
                    action_type='return',
                    description='رد مصوبه توسط دبیر',
                    action_data={
                        'previous_status': 'pending_secretary_approval',
                        'new_status': 'cancelled',
                        'comment': comment
                    }
                )
                
                # ایجاد کامنت
                if comment:
                    ResolutionComment.objects.create(
                        resolution=resolution,
                        author=user,
                        content=comment,
                        comment_type='action',
                        related_action=action
                    )
                
                # ارسال نوتیفیکیشن به ایجادکننده مصوبه
                if resolution.created_by and resolution.created_by != user:
                    NotificationService.create_notification(
                        recipient=resolution.created_by,
                        resolution=resolution,
                        message=f'مصوبه {resolution.clause}-{resolution.subclause} توسط دبیر رد شد'
                    )
                
                return Response({
                    'message': 'مصوبه رد شد',
                    'new_status': 'cancelled'
                }, status=status.HTTP_200_OK)
                
    except Exception as e:
        return Response({
            'error': f'خطا در تایید مصوبه: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resolution_timeline(request, public_id):
    """
    دریافت تاریخچه کامل مصوبه شامل:
    - زمان ثبت توسط کارشناس دبیرخانه
    - زمان تایید دبیر
    - زمان تایید مدیرعامل  
    - زمان قبول واحد مجری
    """
    try:
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = request.user
        
        # بررسی دسترسی
        is_secretary = hasattr(user, 'profile') and user.profile.position == 'secretary'
        is_auditor = hasattr(user, 'profile') and user.profile.position == 'auditor'
        is_executor = resolution.executor_unit == user
        is_creator = resolution.created_by == user
        is_ceo = hasattr(user, 'profile') and user.profile.position == 'ceo'
        
        can_view = (
            is_secretary or is_auditor or is_executor or is_creator or is_ceo or
            user in resolution.coworkers.all() or
            user in resolution.inform_units.all() or
            user in resolution.participants.all()
        )
        
        if not can_view:
            return Response(
                {"error": "شما به این مصوبه دسترسی ندارید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        timeline = []
        
        # 1. زمان ثبت مصوبه
        if resolution.created_by:
            timeline.append({
                'action': 'created',
                'action_persian': 'ثبت مصوبه',
                'actor': {
                    'id': resolution.created_by.id,
                    'name': resolution.created_by.get_full_name() or resolution.created_by.username,
                    'position': getattr(resolution.created_by.profile, 'position', 'کاربر') if hasattr(resolution.created_by, 'profile') else 'کاربر',
                    'department': getattr(resolution.created_by.profile, 'department', '') if hasattr(resolution.created_by, 'profile') else ''
                },
                'timestamp': resolution.created_at,
                'description': 'مصوبه توسط کارشناس دبیرخانه ثبت شد'
            })
        
        # 2. اکشن‌های مرتبط
        actions = ResolutionAction.objects.filter(resolution=resolution).order_by('created_at')
        
        for action in actions:
            action_data = {
                'action': action.action_type,
                'action_persian': action.get_action_type_display(),
                'actor': {
                    'id': action.actor.id,
                    'name': action.actor.get_full_name() or action.actor.username,
                    'position': getattr(action.actor.profile, 'position', 'کاربر') if hasattr(action.actor, 'profile') else 'کاربر',
                    'department': getattr(action.actor.profile, 'department', '') if hasattr(action.actor, 'profile') else ''
                },
                'timestamp': action.created_at,
                'description': action.description,
                'action_data': action.action_data
            }
            
            # اضافه کردن اطلاعات اضافی بر اساس نوع اکشن
            if action.action_type == 'secretary_approved':
                action_data['description'] = 'مصوبه توسط دبیر تایید شد'
            elif action.action_type == 'ceo_approved':
                action_data['description'] = 'مصوبه توسط مدیرعامل تایید شد'
            elif action.action_type == 'executor_accepted':
                action_data['description'] = 'مصوبه توسط واحد مجری قبول شد'
            elif action.action_type == 'return_to_secretary':
                action_data['description'] = 'مصوبه به دبیر برگشت داده شد'
            
            timeline.append(action_data)
        
        # مرتب‌سازی بر اساس زمان
        timeline.sort(key=lambda x: x['timestamp'])
        
        return Response({
            'public_id': str(resolution.id),
            'resolution_info': {
                'clause': resolution.clause,
                'subclause': resolution.subclause,
                'meeting_number': resolution.meeting.number,
                'status': resolution.status,
                'status_persian': resolution.get_status_display()
            },
            'timeline': timeline
        })
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"خطا در دریافت تاریخچه: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resolution_user_duration(request, public_id, user_id):
    """
    محاسبه مدت زمان حضور کاربر در مصوبه
    برای دبیر: یک دوره (created → secretary_approved)
    برای مدیرعامل: چندین دوره (secretary_approved → ceo_approved/return)
    برای واحد مجری: چندین دوره (ceo_approved → return/executor_accepted)
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        
        resolution = get_object_or_404(Resolution, public_id=public_id)
        user = get_object_or_404(User, id=user_id)
        
        # بررسی دسترسی
        current_user = request.user
        is_secretary = hasattr(current_user, 'profile') and current_user.profile.position == 'secretary'
        is_auditor = hasattr(current_user, 'profile') and current_user.profile.position == 'auditor'
        is_executor = resolution.executor_unit == current_user
        is_creator = resolution.created_by == current_user
        is_ceo = hasattr(current_user, 'profile') and current_user.profile.position == 'ceo'
        
        can_view = (
            is_secretary or is_auditor or is_executor or is_creator or is_ceo or
            current_user in resolution.coworkers.all() or
            current_user in resolution.inform_units.all() or
            current_user in resolution.participants.all() or
            current_user == user  # کاربر می‌تواند مدت زمان خودش را ببیند
        )
        
        if not can_view:
            return Response(
                {"error": "شما به این اطلاعات دسترسی ندارید."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # دریافت اکشن‌های مصوبه
        actions = ResolutionAction.objects.filter(
            resolution_id=public_id
        ).order_by('created_at')
        
        # تشخیص نقش کاربر
        if not hasattr(user, 'profile'):
            return Response(
                {"error": "کاربر مورد نظر پروفایل ندارد."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_role = user.profile.position
        durations = []
        current_start = None
        
        for action in actions:
            if user_role == 'ceo':
                # مدیرعامل - ممکن است چندین دوره داشته باشد
                if action.action_type == 'secretary_approved':
                    # شروع دوره جدید
                    current_start = action.created_at
                elif action.action_type in ['ceo_approved', 'return']:
                    # پایان دوره فعلی
                    if current_start:
                        duration = action.created_at - current_start
                        durations.append({
                            'period': len(durations) + 1,
                            'start': current_start,
                            'end': action.created_at,
                            'duration': duration,
                            'action_type': action.action_type,
                            'duration_hours': duration.total_seconds() / 3600
                        })
                        current_start = None
                        
            elif user_role == 'executor':
                # واحد مجری - ممکن است چندین دوره داشته باشد
                if action.action_type == 'ceo_approved':
                    # شروع دوره جدید
                    current_start = action.created_at
                elif action.action_type in ['return', 'executor_accepted']:
                    # پایان دوره فعلی
                    if current_start:
                        duration = action.created_at - current_start
                        durations.append({
                            'period': len(durations) + 1,
                            'start': current_start,
                            'end': action.created_at,
                            'duration': duration,
                            'action_type': action.action_type,
                            'duration_hours': duration.total_seconds() / 3600
                        })
                        current_start = None
                        
            elif user_role == 'secretary':
                # دبیر - فقط یک دوره
                if action.action_type == 'created':
                    current_start = action.created_at
                elif action.action_type == 'secretary_approved':
                    if current_start:
                        duration = action.created_at - current_start
                        durations.append({
                            'period': 1,
                            'start': current_start,
                            'end': action.created_at,
                            'duration': duration,
                            'action_type': action.action_type,
                            'duration_hours': duration.total_seconds() / 3600
                        })
                        current_start = None
        
        # آخرین دوره اگر هنوز ادامه دارد
        if current_start:
            duration = timezone.now() - current_start
            durations.append({
                'period': len(durations) + 1,
                'start': current_start,
                'end': timezone.now(),
                'duration': duration,
                'ongoing': True,
                'action_type': 'ongoing',
                'duration_hours': duration.total_seconds() / 3600
            })
        
        # محاسبه آمار
        total_duration = sum(d['duration'] for d in durations)
        total_periods = len(durations)
        
        # تبدیل به فرمت قابل خواندن
        def format_duration(td):
            total_seconds = int(td.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            return f"{hours} ساعت و {minutes} دقیقه"
        
        return Response({
            'user_id': user_id,
            'user_name': user.get_full_name() or user.username,
            'user_role': user_role,
            'public_id': str(public_id),
            'resolution_info': {
                'clause': resolution.clause,
                'subclause': resolution.subclause,
                'meeting_number': resolution.meeting.number
            },
            'periods': [{
                **period,
                'duration_formatted': format_duration(period['duration'])
            } for period in durations],
            'total_duration': total_duration,
            'total_duration_formatted': format_duration(total_duration),
            'total_periods': total_periods,
            'total_hours': round(total_duration.total_seconds() / 3600, 2),
            'average_period_hours': round((total_duration.total_seconds() / 3600) / total_periods, 2) if total_periods > 0 else 0
        })
        
    except Resolution.DoesNotExist:
        return Response(
            {"error": "مصوبه مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except User.DoesNotExist:
        return Response(
            {"error": "کاربر مورد نظر یافت نشد."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"خطا در محاسبه مدت زمان: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_average_duration(request, user_id):
    """
    محاسبه میانگین مدت زمان حضور کاربر در تمام مصوبه‌ها (برای همه کاربران لاگین‌شده)
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Q, Avg, Count
        user = get_object_or_404(User, id=user_id)
        # دریافت تمام مصوبه‌هایی که کاربر در آن‌ها مشارکت داشته
        resolutions = Resolution.objects.filter(
            Q(created_by=user) |  # مصوبه‌های ایجاد شده توسط کاربر
            Q(executor_unit=user) |  # مصوبه‌های مجری
            Q(coworkers=user) |  # مصوبه‌های همکار
            Q(inform_units=user) |  # مصوبه‌های اطلاع‌رسانی
            Q(participants=user)  # مصوبه‌های شرکت‌کننده
        ).distinct()
        total_duration = timedelta()
        total_resolutions = 0
        for res in resolutions:
            # محاسبه مدت زمان حضور کاربر در هر مصوبه (بر اساس اکشن‌ها)
            actions = ResolutionAction.objects.filter(resolution=res, actor=user).order_by('created_at')
            if actions.exists():
                start_time = actions.first().created_at
                end_time = actions.last().created_at
                total_duration += (end_time - start_time)
                total_resolutions += 1
        avg_duration = total_duration / total_resolutions if total_resolutions > 0 else timedelta()
        return Response({
            'user_id': user.id,
            'avg_duration_minutes': avg_duration.total_seconds() / 60 if total_resolutions > 0 else 0,
            'total_resolutions': total_resolutions
        })
    except Exception as e:
        return Response({"error": f"خطا در محاسبه میانگین مدت زمان: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_users_average_duration(request):
    """محاسبه میانگین مدت زمان تمام کاربران"""
    try:
        # دریافت تمام کاربران
        users = User.objects.filter(is_active=True)
        user_durations = []
        
        for user in users:
            # محاسبه میانگین مدت زمان برای هر کاربر
            actions = ResolutionAction.objects.filter(
                actor=user,
                action_type__in=['accept', 'approve', 'start_execution']
            ).select_related('resolution')
            
            total_duration = timedelta()
            resolution_count = 0
            
            for action in actions:
                resolution = action.resolution
                
                # پیدا کردن اکشن قبلی
                previous_action = ResolutionAction.objects.filter(
                    resolution=resolution,
                    created_at__lt=action.created_at
                ).order_by('-created_at').first()
                
                if previous_action:
                    duration = action.created_at - previous_action.created_at
                    total_duration += duration
                    resolution_count += 1
            
            if resolution_count > 0:
                average_duration = total_duration / resolution_count
                
                def format_duration(td):
                    days = td.days
                    hours = td.seconds // 3600
                    minutes = (td.seconds % 3600) // 60
                    
                    if days > 0:
                        return f"{days} روز و {hours} ساعت"
                    elif hours > 0:
                        return f"{hours} ساعت و {minutes} دقیقه"
                    else:
                        return f"{minutes} دقیقه"
                
                user_durations.append({
                    'user_id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'position': getattr(user.profile, 'position', 'unknown') if hasattr(user, 'profile') else 'unknown',
                    'average_duration': format_duration(average_duration),
                    'average_duration_seconds': average_duration.total_seconds(),
                    'resolution_count': resolution_count
                })
        
        # مرتب کردن بر اساس مدت زمان (کمترین اول)
        user_durations.sort(key=lambda x: x['average_duration_seconds'])
        
        return Response({
            'users': user_durations
        })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در محاسبه میانگین مدت زمان: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def secretary_workbench_average_duration(request):
    """محاسبه میانگین مدت زمان مصوبات در کارتابل دبیر"""
    try:
        # پیدا کردن مصوباتی که در کارتابل دبیر بوده‌اند
        resolutions = Resolution.objects.all()
        
        total_duration = timedelta()
        resolution_count = 0
        
        for resolution in resolutions:
            # زمان ایجاد مصوبه از خود مدل Resolution
            created_time = resolution.created_at

            # پیدا کردن اکشن تایید دبیر
            secretary_approve_action = ResolutionAction.objects.filter(
                resolution=resolution,
                action_type='secretary_approved'
            ).order_by('created_at').first()

            if created_time and secretary_approve_action:
                duration = secretary_approve_action.created_at - created_time
                total_duration += duration
                resolution_count += 1
        
        if resolution_count > 0:
            average_duration = total_duration / resolution_count
            
            def format_duration(td):
                days = td.days
                hours = td.seconds // 3600
                minutes = (td.seconds % 3600) // 60
                
                if days > 0:
                    return f"{days} روز و {hours} ساعت"
                elif hours > 0:
                    return f"{hours} ساعت و {minutes} دقیقه"
                else:
                    return f"{minutes} دقیقه"
            
            return Response({
                'average_duration': format_duration(average_duration),
                'average_duration_seconds': average_duration.total_seconds(),
                'resolution_count': resolution_count
            })
        else:
            return Response({
                'average_duration': '0 دقیقه',
                'average_duration_seconds': 0,
                'resolution_count': 0
            })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در محاسبه میانگین مدت زمان کارتابل دبیر: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ceo_workbench_average_duration(request):
    """محاسبه میانگین مدت زمان مصوبات در کارتابل مدیرعامل"""
    try:
        # پیدا کردن مصوباتی که در کارتابل مدیرعامل بوده‌اند
        resolutions = Resolution.objects.all()
        
        total_duration = timedelta()
        resolution_count = 0
        
        for resolution in resolutions:
            # پیدا کردن اکشن تایید دبیر
            secretary_approve_action = ResolutionAction.objects.filter(
                resolution=resolution,
                action_type='secretary_approved'
            ).order_by('created_at').first()

            # پیدا کردن اکشن تایید مدیرعامل
            ceo_approval_action = ResolutionAction.objects.filter(
                resolution=resolution,
                action_type='ceo_approved'
            ).order_by('created_at').first()

            if secretary_approve_action and ceo_approval_action:
                duration = ceo_approval_action.created_at - secretary_approve_action.created_at
                total_duration += duration
                resolution_count += 1
        
        if resolution_count > 0:
            average_duration = total_duration / resolution_count
            
            def format_duration(td):
                days = td.days
                hours = td.seconds // 3600
                minutes = (td.seconds % 3600) // 60
                
                if days > 0:
                    return f"{days} روز و {hours} ساعت"
                elif hours > 0:
                    return f"{hours} ساعت و {minutes} دقیقه"
                else:
                    return f"{minutes} دقیقه"
            
            return Response({
                'average_duration': format_duration(average_duration),
                'average_duration_seconds': average_duration.total_seconds(),
                'resolution_count': resolution_count
            })
        else:
            return Response({
                'average_duration': '0 دقیقه',
                'average_duration_seconds': 0,
                'resolution_count': 0
            })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در محاسبه میانگین مدت زمان کارتابل مدیرعامل: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def executor_workbench_average_duration(request):
    """محاسبه میانگین مدت زمان مصوبات در کارتابل واحد مجری (قبل از شروع اجرا)"""
    try:
        # پیدا کردن مصوباتی که در کارتابل مجری بوده‌اند
        resolutions = Resolution.objects.filter(
            status__in=['notified', 'in_progress']
        )
        
        total_duration = timedelta()
        resolution_count = 0
        
        for resolution in resolutions:
            # پیدا کردن اکشن ابلاغ به مجری
            notify_action = ResolutionAction.objects.filter(
                resolution=resolution,
                action_type='notify'
            ).order_by('-created_at').first()
            
            # پیدا کردن اکشن شروع اجرا
            start_execution_action = ResolutionAction.objects.filter(
                resolution=resolution,
                action_type='start_execution'
            ).order_by('-created_at').first()
            
            if notify_action and start_execution_action:
                duration = start_execution_action.created_at - notify_action.created_at
                total_duration += duration
                resolution_count += 1
        
        if resolution_count > 0:
            average_duration = total_duration / resolution_count
            
            def format_duration(td):
                days = td.days
                hours = td.seconds // 3600
                minutes = (td.seconds % 3600) // 60
                
                if days > 0:
                    return f"{days} روز و {hours} ساعت"
                elif hours > 0:
                    return f"{hours} ساعت و {minutes} دقیقه"
                else:
                    return f"{minutes} دقیقه"
            
            return Response({
                'average_duration': format_duration(average_duration),
                'average_duration_seconds': average_duration.total_seconds(),
                'resolution_count': resolution_count
            })
        else:
            return Response({
                'average_duration': '0 دقیقه',
                'average_duration_seconds': 0,
                'resolution_count': 0
            })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در محاسبه میانگین مدت زمان کارتابل مجری: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meeting_to_resolution_average_duration(request):
    """میانگین زمان از برگزاری جلسه تا ثبت مصوبات توسط کارشناس دبیرخانه"""
    try:
        from datetime import timedelta
        from django.db.models import F
        resolutions = Resolution.objects.select_related('meeting').all()
        total_duration = timedelta()
        count = 0
        tz = pytz.timezone(getattr(settings, 'TIME_ZONE', 'UTC'))
        for res in resolutions:
            if res.meeting and res.meeting.held_at and res.created_at:
                held_at = res.meeting.held_at
                if isinstance(held_at, datetime):
                    held_at_dt = held_at
                else:
                    held_at_dt = datetime.combine(held_at, time.min)
                # تبدیل به offset-aware
                if held_at_dt.tzinfo is None or held_at_dt.tzinfo.utcoffset(held_at_dt) is None:
                    held_at_dt = tz.localize(held_at_dt)
                created_at = res.created_at
                if created_at.tzinfo is None or created_at.tzinfo.utcoffset(created_at) is None:
                    created_at = tz.localize(created_at)
                duration = created_at - held_at_dt
                total_duration += duration
                count += 1
        if count > 0:
            average_duration = total_duration / count
            def format_duration(td):
                days = td.days
                hours = td.seconds // 3600
                minutes = (td.seconds % 3600) // 60
                if days > 0:
                    return f"{days} روز و {hours} ساعت"
                elif hours > 0:
                    return f"{hours} ساعت و {minutes} دقیقه"
                else:
                    return f"{minutes} دقیقه"
            return Response({
                'average_duration': format_duration(average_duration),
                'average_duration_seconds': average_duration.total_seconds(),
                'resolution_count': count
            })
        else:
            return Response({
                'average_duration': '0 دقیقه',
                'average_duration_seconds': 0,
                'resolution_count': 0
            })
    except Exception as e:
        return Response({
            "error": f"خطا در محاسبه میانگین زمان جلسه تا ثبت مصوبه: {str(e)}"
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def executor_units_execution_duration(request):
    """میانگین مدت زمان اجرای مصوبات برای هر واحد مجری (برای بارچارت داشبورد)"""
    try:
        from django.db.models import F
        import pytz
        from datetime import datetime, time, timedelta
        from django.contrib.auth import get_user_model
        User = get_user_model()
        tz = pytz.timezone(getattr(settings, 'TIME_ZONE', 'UTC'))
        units = {}
        resolutions = Resolution.objects.select_related('executor_unit').all()
        for res in resolutions:
            if not res.executor_unit:
                continue
            start_action = ResolutionAction.objects.filter(
                resolution=res,
                action_type='executor_accepted'
            ).order_by('created_at').first()
            if not start_action:
                continue
            start_time = start_action.created_at
            if start_time.tzinfo is None or start_time.tzinfo.utcoffset(start_time) is None:
                start_time = tz.localize(start_time)
            end_comment = ResolutionComment.objects.filter(
                resolution=res,
                comment_type='progress_update',
                action_data__icontains='"new_progress": 100'
            ).order_by('-created_at').first()
            if not end_comment:
                continue
            end_time = end_comment.created_at
            if end_time.tzinfo is None or end_time.tzinfo.utcoffset(end_time) is None:
                end_time = tz.localize(end_time)
            duration = (end_time - start_time).total_seconds() / 60
            unit_id = res.executor_unit.id
            unit_name = str(res.executor_unit)
            if hasattr(res.executor_unit, 'get_full_name'):
                unit_name = res.executor_unit.get_full_name() or str(res.executor_unit)
            if unit_id not in units:
                units[unit_id] = {
                    'unit_id': unit_id,
                    'unit_name': unit_name,
                    'durations': []
                }
            units[unit_id]['durations'].append(duration)
        result = []
        for unit in units.values():
            avg_duration = sum(unit['durations']) / len(unit['durations']) if unit['durations'] else 0
            result.append({
                'unit_id': unit['unit_id'],
                'unit_name': unit['unit_name'],
                'avg_execution_duration_minutes': avg_duration,
                'count': len(unit['durations'])
            })
        return Response(result)
    except Exception as e:
        return Response({
            "error": f"خطا در محاسبه میانگین مدت زمان اجرای مصوبات: {str(e)}"
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def executor_completion_duration(request):
    """دریافت میانگین مدت زمان تکمیل مصوبات توسط مجری (از قبول تا 100%)"""
    try:
        from django.db.models import Avg, Count, Q
        from datetime import datetime, timedelta
        
        # دریافت مصوبات عملیاتی که تکمیل شده‌اند
        completed_operational_resolutions = Resolution.objects.filter(
            type='operational',
            status='completed',
            progress=100
        ).select_related('executor_unit')
        
        executor_stats = []
        
        # گروه‌بندی بر اساس واحد مجری
        executor_groups = completed_operational_resolutions.values('executor_unit').annotate(
            count=Count('id')
        ).filter(executor_unit__isnull=False)
        
        for group in executor_groups:
            executor_id = group['executor_unit']
            executor = User.objects.get(id=executor_id)
            
            # دریافت مصوبات این واحد مجری
            resolutions = completed_operational_resolutions.filter(executor_unit_id=executor_id)
            
            total_duration_minutes = 0
            valid_resolutions = 0
            
            for resolution in resolutions:
                # پیدا کردن زمان قبول مصوبه توسط مجری
                acceptance_action = ResolutionAction.objects.filter(
                    resolution=resolution,
                    action_type='executor_accepted'
                ).first()
                
                if acceptance_action:
                    acceptance_time = acceptance_action.created_at
                    
                    # پیدا کردن آخرین به‌روزرسانی پیشرفت به 100%
                    completion_action = ResolutionAction.objects.filter(
                        resolution=resolution,
                        action_type='progress_update',
                        action_data__contains={'new_progress': 100}
                    ).order_by('-created_at').first()
                    
                    if completion_action:
                        completion_time = completion_action.created_at
                        
                        # محاسبه مدت زمان از قبول تا تکمیل (100%)
                        duration = completion_time - acceptance_time
                        duration_minutes = duration.total_seconds() / 60
                        
                        # فقط مصوبات با مدت زمان معقول (بیش از 1 دقیقه و کمتر از 1 سال)
                        if 1 <= duration_minutes <= 525600:  # 1 دقیقه تا 1 سال
                            total_duration_minutes += duration_minutes
                            valid_resolutions += 1
            
            if valid_resolutions > 0:
                avg_duration_minutes = total_duration_minutes / valid_resolutions
                
                executor_stats.append({
                    'unit_name': executor.profile.department if hasattr(executor, 'profile') and executor.profile.department else executor.username,
                    'avg_completion_duration_minutes': round(avg_duration_minutes, 2),
                    'resolution_count': valid_resolutions
                })
        
        # مرتب‌سازی بر اساس میانگین مدت زمان (صعودی)
        executor_stats.sort(key=lambda x: x['avg_completion_duration_minutes'])
        
        return Response(executor_stats)
        
    except Exception as e:
        return Response(
            {"error": f"خطا در محاسبه مدت زمان تکمیل: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def executor_acceptance_duration(request):
    """دریافت میانگین مدت زمان قبول مصوبات توسط مجری (از تایید مدیرعامل تا قبول مجری)"""
    try:
        from django.db.models import Avg, Count, Q
        from datetime import datetime, timedelta
        
        # دریافت همه مصوبات عملیاتی که به مجری اختصاص داده شده‌اند (قبول شده یا نشده)
        all_operational_resolutions = Resolution.objects.filter(
            type='operational',
            executor_unit__isnull=False
        ).select_related('executor_unit')
        
        executor_stats = []
        
        # گروه‌بندی بر اساس واحد مجری
        executor_groups = all_operational_resolutions.values('executor_unit').annotate(
            count=Count('id')
        ).filter(executor_unit__isnull=False)
        
        for group in executor_groups:
            executor_id = group['executor_unit']
            executor = User.objects.get(id=executor_id)
            
            # دریافت مصوبات این واحد مجری
            resolutions = all_operational_resolutions.filter(executor_unit_id=executor_id)
            
            total_duration_minutes = 0
            valid_resolutions = 0
            
            for resolution in resolutions:
                # پیدا کردن زمان تایید توسط مدیرعامل
                ceo_approval_action = ResolutionAction.objects.filter(
                    resolution=resolution,
                    action_type='ceo_approved'
                ).order_by('-created_at').first()
                
                if ceo_approval_action:
                    ceo_approval_time = ceo_approval_action.created_at
                    
                    # پیدا کردن اولین قبول توسط مجری
                    executor_acceptance_action = ResolutionAction.objects.filter(
                        resolution=resolution,
                        action_type='executor_accepted'
                    ).order_by('created_at').first()
                    
                    if executor_acceptance_action:
                        acceptance_time = executor_acceptance_action.created_at
                        
                        # محاسبه مدت زمان از تایید مدیرعامل تا قبول مجری
                        duration = acceptance_time - ceo_approval_time
                        duration_minutes = duration.total_seconds() / 60
                        
                        # فقط مصوبات با مدت زمان معقول (بیش از 1 دقیقه و کمتر از 1 سال)
                        if 1 <= duration_minutes <= 525600:  # 1 دقیقه تا 1 سال
                            total_duration_minutes += duration_minutes
                            valid_resolutions += 1
            
            # همیشه واحد مجری را اضافه کن، حتی اگر هیچ مصوبه‌ای قبول نکرده باشد
            if valid_resolutions > 0:
                avg_duration_minutes = total_duration_minutes / valid_resolutions
            else:
                avg_duration_minutes = 0
            
            executor_stats.append({
                'unit_name': executor.profile.department if hasattr(executor, 'profile') and executor.profile.department else executor.username,
                'avg_acceptance_duration_minutes': round(avg_duration_minutes, 2),
                'resolution_count': valid_resolutions,
                'total_assigned_resolutions': resolutions.count()
            })
        
        # مرتب‌سازی بر اساس میانگین مدت زمان (صعودی)
        executor_stats.sort(key=lambda x: x['avg_acceptance_duration_minutes'])
        
        return Response(executor_stats)
        
    except Exception as e:
        return Response(
            {"error": f"خطا در محاسبه مدت زمان قبول: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_changed_resolutions(request):
    """
    ۱۰ مصوبه‌ای که اخیراً روی آن‌ها کامنت (تغییر) ثبت شده و کاربر به آن‌ها دسترسی دارد (یونیک و مرتب‌شده)
    """
    user = request.user
    limit = int(request.GET.get('limit', 10))

    # دسترسی کاربر به مصوبات (منطق مشابه سایر لیست‌ها)
    access_q = Q()
    if hasattr(user, 'profile') and user.profile.position in ['auditor', 'ceo', 'secretary']:
        access_q = Q()
    else:
        access_q = (
            Q(executor_unit=user) |
            Q(coworkers=user) |
            Q(inform_units=user) |
            Q(participants=user) |
            Q(created_by=user)
        )
        # سایر کاربران فقط مصوباتی را می‌بینند که وضعیت آن pending_ceo_approval یا pending_secretary_approval نیست
        access_q &= ~Q(status='pending_ceo_approval') & ~Q(status='pending_secretary_approval')

    # آخرین زمان تغییر هر مصوبه (بر اساس کامنت)
    last_comment_subquery = ResolutionComment.objects.filter(
        resolution=OuterRef('pk')
    ).order_by('-created_at').values('created_at')[:1]

    # فقط مصوباتی که حداقل یک کامنت دارند
    resolutions_with_comments = Resolution.objects.annotate(
        last_comment=Subquery(last_comment_subquery)
    ).filter(
        last_comment__isnull=False
    ).filter(access_q)

    # مرتب‌سازی بر اساس آخرین کامنت و یونیک کردن (۱۰ مورد)
    resolutions = resolutions_with_comments.order_by('-last_comment').distinct()[:limit]

    # سریالایز کردن داده‌ها
    serializer = ResolutionSerializer(resolutions, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resolutions_heatmap(request):
    """
    خروجی: { months: ["1402-11", ...], units: ["..."], data: [[count,...], ...] }
    محور افقی: ۱۲ ماه اخیر شمسی (مثلاً 1402-11)
    محور عمودی: واحد مجری (نام)
    مقدار: تعداد مصوبات هر واحد در هر ماه
    """
    from collections import defaultdict
    import pytz
    tz = pytz.timezone(getattr(settings, 'TIME_ZONE', 'Asia/Tehran'))
    # 1. استخراج ۱۲ ماه اخیر شمسی
    today = datetime.now(tz)
    months = []
    for i in range(11, -1, -1):
        d = today - timedelta(days=30*i)
        j = JalaliDate.to_jalali(d)
        months.append(f"{j.year}-{j.month:02d}")
    months = sorted(list(set(months)))  # مرتب‌سازی و حذف تکراری احتمالی
    # 2. استخراج واحدهای مجری
    units_qs = Resolution.objects.filter(executor_unit__isnull=False).values_list('executor_unit__id', 'executor_unit__first_name', 'executor_unit__last_name', 'executor_unit__username').distinct()
    units = []
    unit_id_to_name = {}
    for uid, first, last, username in units_qs:
        name = f"{first or ''} {last or ''}".strip() or username
        units.append(name)
        unit_id_to_name[uid] = name
    # 3. شمارش مصوبات هر واحد در هر ماه
    data_dict = defaultdict(lambda: defaultdict(int))
    resolutions = Resolution.objects.select_related('meeting', 'executor_unit').filter(executor_unit__isnull=False, meeting__isnull=False)
    for res in resolutions:
        if not res.meeting or not res.meeting.held_at:
            continue
        jdate = JalaliDate.to_jalali(res.meeting.held_at)
        month_str = f"{jdate.year}-{jdate.month:02d}"
        if month_str not in months:
            continue
        unit_name = unit_id_to_name.get(res.executor_unit.id)
        if not unit_name:
            continue
        data_dict[unit_name][month_str] += 1
    # 4. ساخت آرایه داده
    data = []
    for unit in units:
        row = [data_dict[unit][m] for m in months]
        data.append(row)
    return Response({
        'months': months,
        'units': units,
        'data': data
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    response = Response({"message": "Logged out successfully."})
    response.delete_cookie('jwt_access')
    response.delete_cookie('jwt_refresh')
    response.delete_cookie('csrftoken')
    # اگر از session استفاده می‌کنید:
    # request.session.flush()
    return response

# Custom admin login view for both development and production
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.views import LoginView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.middleware.csrf import get_token
from django.contrib.auth import authenticate, login
from django.shortcuts import redirect
from django.http import HttpResponse

@method_decorator(csrf_exempt, name='dispatch')
class AdminLoginView(LoginView):
    template_name = 'admin/login.html'
    
    def dispatch(self, request, *args, **kwargs):
        # Completely bypass CSRF for admin login
        request._dont_enforce_csrf_checks = True
        return super().dispatch(request, *args, **kwargs)
    
    def post(self, request, *args, **kwargs):
        # Handle login manually to bypass CSRF
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        if username and password:
            user = authenticate(request, username=username, password=password)
            if user is not None and user.is_staff:
                login(request, user)
                return redirect('admin:index')
        
        # If authentication fails, show the login form again
        return self.get(request, *args, **kwargs)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add a dummy CSRF token to prevent template errors
        context['csrf_token'] = 'dummy_token'
        return context

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_status(request):
    """Check current session status and token expiration"""
    try:
        from datetime import datetime
        import jwt
        from django.conf import settings
        
        token = request.COOKIES.get('jwt_access')
        refresh_token = request.COOKIES.get('jwt_refresh')
        
        if not token:
            return Response({
                'authenticated': False,
                'message': 'No access token found'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Decode token to check expiration
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'], options={'verify_exp': False})
        exp_timestamp = payload.get('exp')
        
        if exp_timestamp:
            current_timestamp = datetime.utcnow().timestamp()
            time_until_expiry = exp_timestamp - current_timestamp
            
            # Calculate hours until expiry
            hours_until_expiry = time_until_expiry / 3600
            
            return Response({
                'authenticated': True,
                'user_id': request.user.id,
                'username': request.user.username,
                'expires_in_hours': round(hours_until_expiry, 2),
                'expires_in_seconds': int(time_until_expiry),
                'has_refresh_token': bool(refresh_token),
                'needs_refresh': hours_until_expiry < 1,  # Less than 1 hour
                'token_expired': time_until_expiry <= 0
            })
        else:
            return Response({
                'authenticated': False,
                'message': 'Invalid token format'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        return Response({
            'authenticated': False,
            'message': f'Error checking session: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manual_refresh_token(request):
    """Manually refresh access token"""
    try:
        refresh_token = request.COOKIES.get('jwt_refresh')
        
        if not refresh_token:
            return Response({
                'success': False,
                'message': 'No refresh token found'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken(refresh_token)
        new_access_token = str(refresh.access_token)
        
        response = Response({
            'success': True,
            'message': 'Token refreshed successfully'
        })
        
        # Set new access token cookie
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
        return Response({
            'success': False,
            'message': f'Token refresh failed: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_chat_message(request, resolution_id):
    """Send a chat message to resolution participants via WebSocket"""
    try:
        message = request.data.get('message')
        if not message:
            return Response(
                {"error": "پیام نمی‌تواند خالی باشد"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get current user info
        user = request.user
        author_name = f"{user.first_name} {user.last_name}".strip() or user.username
        
        # Send via WebSocket
        from .consumers import NotificationConsumer
        NotificationConsumer.send_chat_message_to_resolution(
            resolution_id=resolution_id,
            message=message,
            author_id=user.id,
            author_name=author_name
        )
        
        return Response({
            "success": True,
            "message": "پیام با موفقیت ارسال شد"
        })
        
    except Exception as e:
        return Response(
            {"error": f"خطا در ارسال پیام: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )