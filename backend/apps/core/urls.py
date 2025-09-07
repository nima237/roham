from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import (
    SecretaryResolutionListView, 
    UserWorkbenchListView, 
    UserNotificationListView, 
    resolution_subclause_count, 
    debug_users, 
    debug_resolutions, 
    test_users,
    edit_user,
    create_user,
    resolutions_heatmap,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    logout_view
)

app_name = 'core'

router = DefaultRouter()
router.register(r'meetings', views.MeetingViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'referrals', views.ReferralViewSet)
router.register(r'followups', views.FollowUpViewSet)

# Manual URL patterns for resolutions to use public_id

urlpatterns = [
    # Dashboard stats (must be first)
    path('stats/dashboard/', views.dashboard_stats, name='dashboard-stats'),
    path('test-dashboard/', views.test_dashboard_endpoint, name='test-dashboard'),
    
    # Basic APIs
    path('health/', views.health_check, name='health_check'),
    path('user-info/', views.user_info, name='user-info'),
    path('users/', views.user_list, name='user-list'),
    
    # Resolution specific endpoints BEFORE router patterns
    path('resolutions/<str:public_id>/interactions/', views.resolution_interactions, name='resolution_interactions'),
    path('resolutions/<str:public_id>/progress/', views.resolution_progress, name='resolution_progress'),
    path('resolutions/<str:public_id>/interaction/', views.resolution_detail_interaction, name='resolution_detail_interaction'),
    path('resolutions/<str:public_id>/comments/', views.add_resolution_comment, name='add_resolution_comment'),
    path('resolutions/<str:public_id>/accept/', views.accept_resolution, name='accept_resolution'),
    path('resolutions/<str:public_id>/approve-ceo/', views.approve_resolution_by_ceo, name='approve_resolution_by_ceo'),
    path('resolutions/<str:public_id>/return/', views.return_resolution, name='return_resolution'),
    path('resolutions/<str:public_id>/refer/', views.refer_resolution, name='refer_resolution'),
    path('resolutions/<str:public_id>/edit/', views.edit_resolution, name='edit_resolution'),
    path('resolutions/<str:public_id>/add-participants/', views.add_resolution_participants, name='add_resolution_participants'),
    path('resolutions/<str:public_id>/remove-participant/', views.remove_resolution_participant, name='remove_resolution_participant'),
    path('resolutions/<str:public_id>/approve-by-secretary/', views.approve_resolution_by_secretary, name='resolution_approve_by_secretary'),
    path('resolutions/<str:public_id>/timeline/', views.resolution_timeline, name='resolution_timeline'),
    path('resolutions/<str:public_id>/user-duration/<int:user_id>/', views.resolution_user_duration, name='resolution_user_duration'),
    path('resolutions/<str:public_id>/chat/', views.send_chat_message, name='send_chat_message'),
    

    
    # Resolution general endpoints
    path('resolutions/count/', resolution_subclause_count),
    path('resolutions/secretary/', SecretaryResolutionListView.as_view(), name='resolutions-secretary'),
    path('resolutions/workbench/', UserWorkbenchListView.as_view(), name='resolutions-workbench'),
    path('resolutions/auditor-stats/', views.auditor_stats, name='auditor-stats'),
    path('debug/resolution-statuses/', views.debug_resolution_statuses, name='debug-resolution-statuses'),
    path('resolutions/ceo-stats/', views.ceo_stats, name='ceo-stats'),
    path('resolutions/recent/', views.recent_resolutions, name='recent-resolutions'),
    path('resolutions/recent-changed/', views.recent_changed_resolutions, name='recent-changed-resolutions'),
    path('resolutions/by-unit/', views.resolutions_by_unit, name='resolutions-by-unit'),
    path('resolutions/unit-notified/', views.unit_notified_resolutions, name='unit-notified-resolutions'),
    
    # Duration statistics endpoints
    path('stats/secretary-average-duration/', views.secretary_workbench_average_duration, name='secretary_workbench_average_duration'),
    path('stats/ceo-average-duration/', views.ceo_workbench_average_duration, name='ceo_workbench_average_duration'),
    path('stats/executor-average-duration/', views.executor_workbench_average_duration, name='executor_workbench_average_duration'),
    path('stats/meeting-to-resolution-average-duration/', views.meeting_to_resolution_average_duration, name='meeting_to_resolution_average_duration'),
    path('stats/executor-units-execution-duration/', views.executor_units_execution_duration, name='executor_units_execution_duration'),
    path('stats/executor-completion-duration/', views.executor_completion_duration, name='executor_completion_duration'),
    path('stats/executor-acceptance-duration/', views.executor_acceptance_duration, name='executor_acceptance_duration'),
    
    # Notifications
    path('notifications/user/', UserNotificationListView.as_view(), name='user-notifications'),
    path('notifications/<uuid:notification_id>/read/', views.mark_notification_read, name='mark-notification-read'),
    path('notifications/unread-count/', views.unread_notifications_count, name='unread-notifications-count'),
    path('notifications/mark-read/<uuid:notification_id>/', views.mark_notification_read, name='mark_notification_read'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('notifications/test/', views.test_notification, name='test_notification'),
    
    # Organization & Users
    path('hierarchy/', views.organizational_hierarchy, name='organizational-hierarchy'),
    path('hierarchy/subordinates/', views.user_subordinates, name='user-subordinates'),
    path('hierarchy/by-position/', views.users_by_position, name='users-by-position'),
    path('hierarchy/check-relationship/', views.check_hierarchy_relationship, name='check-hierarchy-relationship'),
    path('organization/hierarchy/', views.organizational_hierarchy, name='organization_hierarchy'),
    path('organization/users/<str:position>/', views.users_by_position, name='users_by_position'),
    path('users/subordinates/', views.get_subordinates_for_referral, name='get_subordinates_for_referral'),
    path('users/<int:user_id>/edit/', views.edit_user, name='edit-user'),
    path('users/<int:user_id>/average-duration/', views.user_average_duration, name='user_average_duration'),
    path('users/all-users-average-duration/', views.all_users_average_duration, name='all_users_average_duration'),
    
    # User settings
    path('settings/change-password/', views.change_password, name='change-password'),
    path('settings/change-email/', views.change_email, name='change-email'),
    
    # Debug endpoints
    path('debug/users/', debug_users, name='debug-users'),
    path('debug/resolutions/', debug_resolutions, name='debug-resolutions'),
    path('debug/resolution-statuses/', views.debug_resolution_statuses, name='debug-resolution-statuses'),
    path('debug/create-samples/', views.create_sample_resolutions, name='create-sample-resolutions'),
    path('test/users/', test_users, name='test-users'),
    
    path('api/users/create/', create_user, name='create_user'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/logout/', logout_view, name='logout'),
    
    # Session management
    path('api/session/status/', views.session_status, name='session_status'),
    path('api/session/refresh/', views.manual_refresh_token, name='manual_refresh_token'),
    
    # Include router patterns last (excluding resolutions)
    # path('', include(router.urls)),
]

# Manual URL patterns for resolutions to use public_id
urlpatterns += [
    path('resolutions/<str:public_id>/', views.ResolutionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='resolution-detail'),
    path('resolutions/', views.ResolutionViewSet.as_view({'get': 'list', 'post': 'create'}), name='resolution-list'),
    path('resolutions/heatmap/', resolutions_heatmap, name='resolutions-heatmap'),
]
urlpatterns += [
    path('', include(router.urls)),
]
urlpatterns += [
    path('logout/', logout_view, name='logout'),
]