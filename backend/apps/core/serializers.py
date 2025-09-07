from rest_framework import serializers
from .models import Meeting, Resolution, Notification, Referral, FollowUp, UserProfile, ResolutionComment, ResolutionAction, ResolutionCommentAttachment, MeetingAttachment
from django.contrib.auth.models import User
from .services.notification_service import NotificationService

# تابع تبدیل اعداد انگلیسی به فارسی
def to_persian_numbers(text):
    """تبدیل اعداد انگلیسی به فارسی در متن"""
    persian_digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    english_digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    
    for i in range(len(english_digits)):
        text = text.replace(english_digits[i], persian_digits[i])
    return text

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['position', 'department', 'supervisor']

class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()
    position_display = serializers.SerializerMethodField()
    supervisor = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'groups', 'position', 'position_display', 'supervisor', 'department', 'profile']
    
    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]
    
    def get_position(self, obj):
        try:
            return obj.profile.position
        except:
            return 'employee'
    
    def get_position_display(self, obj):
        try:
            return obj.profile.get_position_display()
        except:
            return 'کارمند'
    
    def get_supervisor(self, obj):
        try:
            if obj.profile.supervisor:
                supervisor = obj.profile.supervisor
                return {
                    'id': supervisor.id,
                    'username': supervisor.username,
                    'name': supervisor.get_full_name() or supervisor.username
                }
        except:
            pass
        return None
    
    def get_department(self, obj):
        try:
            return obj.profile.department
        except:
            return ''

class MeetingAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingAttachment
        fields = ['id', 'file', 'original_name', 'uploaded_at']

class MeetingSerializer(serializers.ModelSerializer):
    attendees = UserSerializer(many=True, read_only=True)
    attendees_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), 
        many=True, 
        write_only=True, 
        source='attendees',
        required=False
    )
    attachments = MeetingAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Meeting
        fields = '__all__'
        # minutes_file حذف شد و attachments اضافه شد
    
    def create(self, validated_data):
        attendees_data = validated_data.pop('attendees', [])
        
        # Handle empty strings for optional fields
        if 'description' in validated_data and validated_data['description'] == '':
            validated_data['description'] = None
        if 'other_invitees' in validated_data and validated_data['other_invitees'] == '':
            validated_data['other_invitees'] = None
            
        meeting = Meeting.objects.create(**validated_data)
        meeting.attendees.set(attendees_data)
        return meeting
    
    def update(self, instance, validated_data):
        attendees_data = validated_data.pop('attendees', None)
        
        # Handle empty strings for optional fields
        if 'description' in validated_data and validated_data['description'] == '':
            validated_data['description'] = None
        if 'other_invitees' in validated_data and validated_data['other_invitees'] == '':
            validated_data['other_invitees'] = None
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if attendees_data is not None:
            instance.attendees.set(attendees_data)
        
        return instance

class ResolutionSerializer(serializers.ModelSerializer):
    # uuid = serializers.UUIDField(source='pk', read_only=True)  # حذف شود
    attendees_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    coworkers_ids = serializers.SerializerMethodField()
    inform_units_ids = serializers.SerializerMethodField()
    participants_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    
    # Write-only fields for creation/update
    coworkers_ids_input = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    inform_units_ids_input = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    
    # Handle field mapping from frontend
    meeting_id = serializers.IntegerField(write_only=True, required=False)
    executor_unit_id = serializers.IntegerField(write_only=True, required=False)
    
    executor_unit = UserSerializer(read_only=True)
    executor_name = serializers.SerializerMethodField()
    coworkers_names = serializers.SerializerMethodField()
    inform_units_names = serializers.SerializerMethodField()
    coworkers = UserSerializer(many=True, read_only=True)
    inform_units = UserSerializer(many=True, read_only=True)
    is_overdue = serializers.SerializerMethodField()
    meeting_date = serializers.CharField(source='meeting.held_at', read_only=True)
    meeting_title = serializers.CharField(source='meeting.description', read_only=True)
    meeting = serializers.SerializerMethodField()
    last_progress_update = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    first_viewed_at = serializers.SerializerMethodField()
    
    def get_meeting(self, obj):
        if obj.meeting:
            return {
                'id': str(obj.meeting.id),
                'number': obj.meeting.number,
                'held_at': obj.meeting.held_at.isoformat() if obj.meeting.held_at else None
            }
        return None
    
    def get_executor_name(self, obj):
        if obj.executor_unit:
            return obj.executor_unit.get_full_name() or obj.executor_unit.username
        return None
    
    def get_coworkers_names(self, obj):
        return [user.get_full_name() or user.username for user in obj.coworkers.all()]
    
    def get_inform_units_names(self, obj):
        return [user.get_full_name() or user.username for user in obj.inform_units.all()]
    
    def get_is_overdue(self, obj):
        if obj.deadline and obj.status not in ['completed', 'cancelled']:
            from datetime import date
            return obj.deadline < date.today()
        return False
    
    def get_coworkers_ids(self, obj):
        return [user.id for user in obj.coworkers.all()]
    
    def get_inform_units_ids(self, obj):
        return [user.id for user in obj.inform_units.all()]
    
    def get_last_progress_update(self, obj):
        # دریافت آخرین به‌روزرسانی پیشرفت
        latest_progress = obj.comments.filter(comment_type='progress_update').order_by('-created_at').first()
        if latest_progress:
            return latest_progress.created_at.isoformat()
        return None

    def get_unread(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        from .models import ResolutionView
        return not ResolutionView.objects.filter(user=request.user, resolution=obj).exists()

    def get_first_viewed_at(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        from .models import ResolutionView
        view = ResolutionView.objects.filter(user=request.user, resolution=obj).first()
        return view.first_viewed_at.isoformat() if view and view.first_viewed_at else None

    class Meta:
        model = Resolution
        fields = [
            'id', 'public_id', 'meeting', 'meeting_id', 'meeting_date', 'meeting_title', 'clause', 'subclause', 'description', 'type',
            'executor_unit', 'executor_unit_id', 'executor_name', 'coworkers', 'coworkers_names', 'coworkers_ids',
            'inform_units', 'inform_units_names', 'inform_units_ids', 'participants', 'participants_ids',
            'attendees_ids', 'progress', 'status', 'deadline', 'is_overdue', 'can_edit', 'created_at', 'updated_at',
            'last_progress_update', 'coworkers_ids_input', 'inform_units_ids_input',
            'unread', 'first_viewed_at'
            # 'uuid'  # <-- do NOT include uuid in public API
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Handle meeting_id to meeting mapping
        meeting_id = validated_data.pop('meeting_id', None)
        if meeting_id:
            from .models import Meeting
            try:
                meeting = Meeting.objects.get(id=meeting_id)
                validated_data['meeting'] = meeting
            except Meeting.DoesNotExist:
                raise serializers.ValidationError({'meeting_id': 'Meeting with this ID does not exist.'})
        
        # Handle executor_unit_id to executor_unit mapping
        executor_unit_id = validated_data.pop('executor_unit_id', None)
        if executor_unit_id:
            try:
                executor_unit = User.objects.get(id=executor_unit_id)
                validated_data['executor_unit'] = executor_unit
            except User.DoesNotExist:
                raise serializers.ValidationError({'executor_unit_id': 'User with this ID does not exist.'})
        
        # استخراج لیست‌های ID و فیلدهای many-to-many
        coworkers_ids = validated_data.pop('coworkers_ids_input', [])
        if not coworkers_ids:
            coworkers_ids = validated_data.pop('coworkers', [])
        
        inform_units_ids = validated_data.pop('inform_units_ids_input', [])
        if not inform_units_ids:
            inform_units_ids = validated_data.pop('inform_units', [])
            
        participants_ids = validated_data.pop('participants_ids', [])
        
        # حذف فیلدهای many-to-many از validated_data
        validated_data.pop('coworkers', None)
        validated_data.pop('inform_units', None)
        validated_data.pop('participants', None)
        
        # Set created_by to current user
        if 'request' in self.context:
            validated_data['created_by'] = self.context['request'].user
        
        # تعیین وضعیت بر اساس نقش کاربر
        if 'request' in self.context and hasattr(self.context['request'].user, 'profile'):
            user_position = self.context['request'].user.profile.position
            if user_position == 'secretary':
                # اگر دبیر مصوبه ایجاد می‌کند، وضعیت را "pending_ceo_approval" قرار بده
                validated_data['status'] = 'pending_ceo_approval'
            elif user_position == 'employee':
                # اگر کارشناس دبیرخانه (employee) مصوبه ایجاد می‌کند، وضعیت را "pending_secretary_approval" قرار بده
                validated_data['status'] = 'pending_secretary_approval'
        
        # ایجاد مصوبه بدون فیلدهای many-to-many
        resolution = Resolution.objects.create(**validated_data)
        
        # اضافه کردن روابط many-to-many بعد از ایجاد شیء
        if coworkers_ids:
            resolution.coworkers.set(coworkers_ids)
        if inform_units_ids:
            resolution.inform_units.set(inform_units_ids)
        if participants_ids:
            resolution.participants.set(participants_ids)
        
        # ایجاد نوتیفیکیشن بر اساس وضعیت
        meeting_num = to_persian_numbers(str(resolution.meeting.number))
        clause_subclause = to_persian_numbers(f"{resolution.clause}-{resolution.subclause}")
        
        if resolution.status == 'pending_ceo_approval':
            # نوتیفیکیشن برای مدیرعامل (فقط وقتی دبیر ثبت می‌کند)
            ceos = User.objects.filter(profile__position='ceo')
            for ceo in ceos:
                NotificationService.create_notification(
                    recipient=ceo,
                    message=f"مصوبه جدید جلسه {meeting_num} بند {clause_subclause} برای تایید ارسال شده است.",
                    resolution=resolution
                )
        elif resolution.status == 'pending_secretary_approval':
            # نوتیفیکیشن برای دبیر (فقط وقتی کارشناس ثبت می‌کند)
            secretaries = User.objects.filter(profile__position='secretary')
            for secretary in secretaries:
                NotificationService.create_notification(
                    recipient=secretary,
                    message=f"مصوبه جدید جلسه {meeting_num} بند {clause_subclause} برای تایید ارسال شده است.",
                    resolution=resolution
                )
        
        return resolution

    def update(self, instance, validated_data):
        # Handle executor_unit_id to executor_unit mapping
        executor_unit_id = validated_data.pop('executor_unit_id', None)
        if executor_unit_id:
            from django.contrib.auth.models import User
            try:
                executor_unit = User.objects.get(id=executor_unit_id)
                validated_data['executor_unit'] = executor_unit
            except User.DoesNotExist:
                raise serializers.ValidationError({'executor_unit_id': 'User with this ID does not exist.'})
        
        # استخراج لیست‌های ID
        coworkers_ids = validated_data.pop('coworkers_ids_input', None)
        if coworkers_ids is None:
            coworkers_ids = validated_data.pop('coworkers', None)
            
        inform_units_ids = validated_data.pop('inform_units_ids_input', None)
        if inform_units_ids is None:
            inform_units_ids = validated_data.pop('inform_units', None)
            
        participants_ids = validated_data.pop('participants_ids', None)
        
        # حذف فیلدهای many-to-many از validated_data
        validated_data.pop('coworkers', None)
        validated_data.pop('inform_units', None)
        validated_data.pop('participants', None)
        
        # به‌روزرسانی فیلدهای اصلی
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # به‌روزرسانی روابط many-to-many
        if coworkers_ids is not None:
            instance.coworkers.set(coworkers_ids)
        if inform_units_ids is not None:
            instance.inform_units.set(inform_units_ids)
        if participants_ids is not None:
            instance.participants.set(participants_ids)
        
        return instance

class NotificationSerializer(serializers.ModelSerializer):
    resolution = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = '__all__'
    
    def get_resolution(self, obj):
        if obj.resolution:
            return {
                'id': str(obj.resolution.id),
                'public_id': obj.resolution.public_id,
                'clause': obj.resolution.clause,
                'subclause': obj.resolution.subclause,
                'meeting': {
                    'number': obj.resolution.meeting.number
                } if obj.resolution.meeting else None
            }
        return None

class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = '__all__'

class FollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUp
        fields = '__all__'

class ResolutionCommentAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = ResolutionCommentAttachment
        fields = ['id', 'original_name', 'file_size', 'file_type', 'url']
    
    def get_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.get_file_url()

class ResolutionCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    mentions = UserSerializer(many=True, read_only=True)
    attachments = ResolutionCommentAttachmentSerializer(many=True, read_only=True)
    id = serializers.UUIDField(read_only=True)
    reply_to = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    reply_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = ResolutionComment
        fields = ['id', 'content', 'comment_type', 'created_at', 'author', 'action_data', 'mentions', 'attachments', 'reply_to', 'replies', 'reply_to_id']
    
    def get_reply_to(self, obj):
        if obj.reply_to:
            return {
                'id': str(obj.reply_to.id),
                'content': obj.reply_to.content,
                'author': {
                    'id': obj.reply_to.author.id,
                    'username': obj.reply_to.author.username,
                    'first_name': obj.reply_to.author.first_name,
                    'last_name': obj.reply_to.author.last_name,
                }
            }
        return None
    
    def get_replies(self, obj):
        # فقط نمایش تعداد replies، نه محتوای کامل آنها (برای جلوگیری از nested queries)
        return obj.replies.count() if hasattr(obj, 'replies') else 0

class ResolutionActionSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ResolutionAction
        fields = ['id', 'resolution', 'actor', 'actor_name', 'action_type', 'description', 'created_at', 'action_data']
        read_only_fields = ['id', 'actor', 'created_at']
    
    def get_actor_name(self, obj):
        return obj.actor.get_full_name() or obj.actor.username

class ResolutionInteractionSerializer(serializers.ModelSerializer):
    """سریالایزر کامل برای صفحه تعاملات مصوبه"""
    comments = ResolutionCommentSerializer(many=True, read_only=True)
    actions = ResolutionActionSerializer(many=True, read_only=True)
    all_participants = serializers.SerializerMethodField()
    meeting_title = serializers.CharField(source='meeting.description', read_only=True)
    executor_unit = UserSerializer(read_only=True)
    executor_name = serializers.SerializerMethodField()
    coworkers_names = serializers.SerializerMethodField()
    inform_units_names = serializers.SerializerMethodField()
    inform_units = UserSerializer(many=True, read_only=True)
    coworkers = UserSerializer(many=True, read_only=True)
    can_return_to_secretary = serializers.SerializerMethodField()
    can_refer = serializers.SerializerMethodField()
    can_accept = serializers.SerializerMethodField()
    
    class Meta:
        model = Resolution
        fields = [
            'id', 'meeting', 'meeting_title', 'clause', 'subclause', 'description', 
            'type', 'status', 'progress', 'deadline', 'can_edit', 'executor_unit', 
            'executor_name', 'coworkers', 'coworkers_names', 'inform_units', 
            'inform_units_names', 'participants', 'all_participants', 'comments', 
            'actions', 'can_return_to_secretary', 'can_refer', 'can_accept'
        ]
    
    def get_all_participants(self, obj):
        participants = obj.get_all_participants()
        return UserSerializer(participants, many=True).data
    
    def get_executor_name(self, obj):
        return obj.executor_unit.get_full_name() or obj.executor_unit.username if obj.executor_unit else None
    
    def get_coworkers_names(self, obj):
        return [user.get_full_name() or user.username for user in obj.coworkers.all()]
    
    def get_inform_units_names(self, obj):
        return [user.get_full_name() or user.username for user in obj.inform_units.all()]
    
    def get_can_return_to_secretary(self, obj):
        """بررسی اینکه آیا کاربر فعلی می‌تواند مصوبه را به دبیر برگرداند"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # فقط مجری می‌تواند مصوبه را برگرداند
        return obj.executor_unit == request.user and obj.status != 'returned_to_secretary'
    
    def get_can_refer(self, obj):
        """بررسی اینکه آیا کاربر فعلی می‌تواند مصوبه را ارجاع دهد"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # مجری و همکاران می‌توانند ارجاع دهند
        return (
            obj.executor_unit == request.user or 
            request.user in obj.coworkers.all()
        )

    def get_can_accept(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.executor_unit == request.user and obj.status == 'notified'

    def get_can_accept(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.executor_unit == request.user and obj.status == 'notified' 