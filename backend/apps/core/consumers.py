import json
import base64
import hashlib
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from datetime import datetime


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get user from scope
        self.user = self.scope.get("user")
        
        print(f"WebSocket connection attempt for user: {self.user}")
        
        # Allow connection even without authentication for now
        if self.user and hasattr(self.user, 'is_authenticated') and self.user.is_authenticated:
            # Join user-specific room
            self.room_name = f"user_{self.user.id}"
            self.room_group_name = f"notifications_{self.user.id}"
            
            # Also join chat room for this user
            self.chat_room_name = f"chat_user_{self.user.id}"
            
            print(f"User {self.user.username} connecting to room: {self.room_group_name}")
        else:
            # Create a general room for unauthenticated users
            self.room_name = "general"
            self.room_group_name = "notifications_general"
            self.chat_room_name = "chat_general"
            
            print(f"Unauthenticated user connecting to general room: {self.room_group_name}")
        
        # Join notification room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Join chat room group
        await self.channel_layer.group_add(
            self.chat_room_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"WebSocket connection accepted for room: {self.room_group_name}")

    async def disconnect(self, close_code):
        print(f"WebSocket disconnected for room: {getattr(self, 'room_group_name', 'unknown')}, code: {close_code}")
        # Leave room groups
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        if hasattr(self, 'chat_room_name'):
            await self.channel_layer.group_discard(
                self.chat_room_name,
                self.channel_name
            )

    def _encode_resolution_id(self, resolution_id: str) -> str:
        """Encode resolution_id to a valid group name"""
        # Use base64 encoding to handle special characters
        import base64
        try:
            # First try to decode if it's already base64
            decoded = base64.b64decode(resolution_id + '==').decode('utf-8')
            # Use the decoded string for hash
            hash_object = hashlib.md5(decoded.encode())
        except:
            # If decoding fails, use the original string
            hash_object = hashlib.md5(resolution_id.encode())
        
        return f"chat_resolution_{hash_object.hexdigest()}"

    async def receive(self, text_data):
        # Handle messages from client
        print(f"Received message from client: {text_data}")
        
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'join_chat':
                await self.handle_join_chat(data)
            elif message_type == 'leave_chat':
                await self.handle_leave_chat(data)
            else:
                print(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            print(f"Invalid JSON received: {text_data}")
        except Exception as e:
            print(f"Error handling message: {e}")

    async def handle_chat_message(self, data):
        """Handle chat messages"""
        resolution_id = data.get('resolution_id')
        message = data.get('message')
        author_id = data.get('author_id')
        
        if resolution_id and message and author_id:
            # Send to all users in the resolution chat
            chat_group = self._encode_resolution_id(resolution_id)
            
            await self.channel_layer.group_send(
                chat_group,
                {
                    'type': 'chat_message',
                    'resolution_id': resolution_id,
                    'message': message,
                    'author_id': author_id,
                    'timestamp': data.get('timestamp')
                }
            )
            print(f"Chat message sent to resolution {resolution_id}")

    async def handle_join_chat(self, data):
        """Handle joining a chat room"""
        resolution_id = data.get('resolution_id')
        if resolution_id:
            chat_group = self._encode_resolution_id(resolution_id)
            await self.channel_layer.group_add(
                chat_group,
                self.channel_name
            )
            user_info = getattr(self.user, 'username', 'anonymous') if self.user else 'anonymous'
            print(f"🔵 User {user_info} joined chat for resolution {resolution_id} -> group: {chat_group}")

    async def handle_leave_chat(self, data):
        """Handle leaving a chat room"""
        resolution_id = data.get('resolution_id')
        if resolution_id:
            chat_group = self._encode_resolution_id(resolution_id)
            await self.channel_layer.group_discard(
                chat_group,
                self.channel_name
            )
            user_info = getattr(self.user, 'username', 'anonymous') if self.user else 'anonymous'
            print(f"🔵 User {user_info} left chat for resolution {resolution_id} -> group: {chat_group}")

    async def notification_message(self, event):
        # Send notification to WebSocket
        message_data = {
            'type': 'notification',
            'message': event['message'],
            'notification_id': str(event['notification_id']),  # Ensure string
            'notification_type': event.get('notification_type', 'info'),
            'resolution': None
        }
        # If resolution is present, convert its id to string if possible
        if event.get('resolution'):
            res = event['resolution']
            # If it's a dict with id, convert id to string
            if isinstance(res, dict) and 'id' in res:
                message_data['resolution'] = dict(res)
                message_data['resolution']['id'] = str(res['id'])
            # If it's a UUID or string, just convert to string
            else:
                message_data['resolution'] = str(res)
        
        user_info = getattr(self.user, 'username', 'anonymous') if self.user else 'anonymous'
        print(f"Sending notification to user {user_info}: {message_data}")
        await self.send(text_data=json.dumps(message_data))

    async def chat_message(self, event):
        """Handle incoming chat messages"""
        message_data = {
            'type': 'chat_message',
            'resolution_id': event['resolution_id'],
            'message': event['message'],
            'author_id': event['author_id'],
            'timestamp': event.get('timestamp'),
            'author_name': event.get('author_name', 'Unknown')
        }
        
        user_info = getattr(self.user, 'username', 'anonymous') if self.user else 'anonymous'
        print(f"🔵 Sending chat message to user {user_info}: {message_data}")
        print(f"Sending chat message to user {user_info}: {message_data}")
        await self.send(text_data=json.dumps(message_data))

    async def interaction_notification(self, event):
        """Handle incoming interaction notifications"""
        message_data = {
            'type': 'interaction_notification',
            'resolution_id': event['resolution_id'],
            'interaction_data': event['interaction_data'],
            'author_name': event.get('author_name', 'Unknown'),
            'timestamp': event.get('timestamp')
        }
        
        user_info = getattr(self.user, 'username', 'anonymous') if self.user else 'anonymous'
        print(f"Sending interaction notification to user {user_info}: {message_data}")
        await self.send(text_data=json.dumps(message_data))

    @staticmethod
    def send_notification_to_user(user_id, message, notification_id):
        """Static method to send notification to specific user"""
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        print(f"🔵 send_notification_to_user called for user_id: {user_id}")
        print(f"🔵 Message: {message}")
        print(f"🔵 Notification ID: {notification_id}")
        
        try:
            channel_layer = get_channel_layer()
            group_name = f"notifications_{user_id}"
            print(f"🔵 Sending to group: {group_name}")
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'message': message,
                    'notification_id': notification_id
                }
            )
            print(f"🔵 WebSocket message sent to group {group_name}")
        except Exception as e:
            print(f"❌ Error in send_notification_to_user: {e}")
            import traceback
            traceback.print_exc()

    @staticmethod
    def send_chat_message_to_resolution(resolution_id, message, author_id, author_name=None):
        """Static method to send chat message to resolution participants"""
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        print(f"🔵 send_chat_message_to_resolution called for resolution_id: {resolution_id}")
        print(f"🔵 Message: {message}")
        print(f"🔵 Author ID: {author_id}")
        
        try:
            channel_layer = get_channel_layer()
            # Use base64 encoding to handle special characters
            import base64
            try:
                # First try to decode if it's already base64
                decoded = base64.b64decode(resolution_id + '==').decode('utf-8')
                # Use the decoded string for hash
                hash_object = hashlib.md5(decoded.encode())
            except:
                # If decoding fails, use the original string
                hash_object = hashlib.md5(resolution_id.encode())
            
            group_name = f"chat_resolution_{hash_object.hexdigest()}"
            print(f"🔵 Sending to chat group: {group_name}")
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'chat_message',
                    'resolution_id': resolution_id,
                    'message': message,
                    'author_id': author_id,
                    'author_name': author_name,
                    'timestamp': str(datetime.now())
                }
            )
            print(f"🔵 Chat message sent to group {group_name}")
        except Exception as e:
            print(f"❌ Error in send_chat_message_to_resolution: {e}")
            import traceback
            traceback.print_exc() 

    @staticmethod
    def send_interaction_notification_to_resolution(resolution_id, interaction_data, author_name=None):
        """Static method to send interaction notification to resolution participants"""
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        print(f"🔵 send_interaction_notification_to_resolution called for resolution_id: {resolution_id}")
        print(f"🔵 Interaction data: {interaction_data}")
        print(f"🔵 Author name: {author_name}")
        
        try:
            channel_layer = get_channel_layer()
            # Use the same encoding method as _encode_resolution_id
            import base64
            try:
                # First try to decode if it's already base64
                decoded = base64.b64decode(resolution_id + '==').decode('utf-8')
                # Use the decoded string for hash
                hash_object = hashlib.md5(decoded.encode())
            except:
                # If decoding fails, use the original string
                hash_object = hashlib.md5(resolution_id.encode())
            
            # Use the same group name as chat_resolution_ to match frontend
            group_name = f"chat_resolution_{hash_object.hexdigest()}"
            print(f"🔵 Sending to chat group: {group_name}")
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'interaction_notification',
                    'resolution_id': resolution_id,
                    'interaction_data': interaction_data,
                    'author_name': author_name,
                    'timestamp': str(datetime.now())
                }
            )
            print(f"🔵 Interaction notification sent to group {group_name}")
        except Exception as e:
            print(f"❌ Error in send_interaction_notification_to_resolution: {e}")
            import traceback
            traceback.print_exc() 