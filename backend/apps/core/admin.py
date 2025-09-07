from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from apps.core.models import Meeting, Resolution, Notification, Referral, FollowUp, UserProfile, ResolutionComment, ResolutionAction, ResolutionCommentAttachment

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    fk_name = 'user'
    can_delete = False
    verbose_name_plural = 'پروفایل کاربری'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'first_name', 'last_name', 'email', 'get_position', 'get_supervisor', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'profile__position')
    
    def get_position(self, obj):
        return obj.profile.get_position_display() if hasattr(obj, 'profile') else '-'
    get_position.short_description = 'سمت'
    
    def get_supervisor(self, obj):
        if hasattr(obj, 'profile') and obj.profile.supervisor:
            return obj.profile.supervisor.get_full_name() or obj.profile.supervisor.username
        return '-'
    get_supervisor.short_description = 'سرپرست'

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'position', 'supervisor', 'department')
    list_filter = ('position', 'department')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'department')
    raw_id_fields = ('user', 'supervisor')

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
admin.site.register(UserProfile, UserProfileAdmin)

admin.site.register(Meeting)
admin.site.register(Resolution)
admin.site.register(Notification)
admin.site.register(Referral)
admin.site.register(FollowUp)

class ResolutionCommentAttachmentInline(admin.TabularInline):
    model = ResolutionCommentAttachment
    extra = 0
    readonly_fields = ('uploaded_at', 'file_size')

class ResolutionCommentAdmin(admin.ModelAdmin):
    list_display = ('resolution', 'author', 'comment_type', 'content_short', 'has_attachments', 'created_at')
    list_filter = ('comment_type', 'created_at')
    search_fields = ('resolution__clause', 'resolution__subclause', 'author__username', 'content')
    raw_id_fields = ('resolution', 'author')
    inlines = [ResolutionCommentAttachmentInline]
    
    def content_short(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_short.short_description = 'محتوا'
    
    def has_attachments(self, obj):
        return obj.attachments.exists()
    has_attachments.short_description = 'فایل پیوست'
    has_attachments.boolean = True

class ResolutionActionAdmin(admin.ModelAdmin):
    list_display = ('resolution', 'actor', 'action_type', 'description_short', 'created_at')
    list_filter = ('action_type', 'created_at')
    search_fields = ('resolution__clause', 'resolution__subclause', 'actor__username', 'description')
    raw_id_fields = ('resolution', 'actor', 'related_comment')
    
    def description_short(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'توضیحات'

admin.site.register(ResolutionComment, ResolutionCommentAdmin)
admin.site.register(ResolutionAction, ResolutionActionAdmin)

class ResolutionCommentAttachmentAdmin(admin.ModelAdmin):
    list_display = ('comment', 'original_name', 'file_size_formatted', 'file_type', 'uploaded_at')
    list_filter = ('file_type', 'uploaded_at')
    search_fields = ('original_name', 'comment__content', 'comment__author__username')
    raw_id_fields = ('comment',)
    readonly_fields = ('file_size', 'uploaded_at')
    
    def file_size_formatted(self, obj):
        if obj.file_size < 1024:
            return f"{obj.file_size} بایت"
        elif obj.file_size < 1024 * 1024:
            return f"{obj.file_size / 1024:.1f} کیلوبایت"
        else:
            return f"{obj.file_size / (1024 * 1024):.1f} مگابایت"
    file_size_formatted.short_description = 'اندازه فایل'

admin.site.register(ResolutionCommentAttachment, ResolutionCommentAttachmentAdmin)
