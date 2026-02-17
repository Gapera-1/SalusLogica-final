from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserProfile


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone', 'user_type')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Authenticate using email
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
            
            if not user:
                raise serializers.ValidationError('Invalid email or password')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            if not user.email_verified:
                raise serializers.ValidationError(
                    'Email not verified. Check your inbox for the verification link, or request a new one.'
                )
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include email and password')
        
        return attrs


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'phone', 'user_type', 'date_of_birth', 'timezone', 'created_at', 'avatar_url')
        read_only_fields = ('id', 'created_at', 'avatar_url')
    
    def get_avatar_url(self, obj):
        """Get user's avatar URL from profile"""
        try:
            if obj.profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile.avatar.url)
                return obj.profile.avatar.url
        except (AttributeError, UserProfile.DoesNotExist):
            pass
        return None


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    age_category_display = serializers.CharField(source='get_age_category_display', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = '__all__'
    
    def get_avatar_url(self, obj):
        """Get absolute URL for avatar"""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class AvatarUploadSerializer(serializers.ModelSerializer):
    """Serializer specifically for avatar uploads"""
    avatar = serializers.ImageField(required=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ('avatar', 'avatar_url')
    
    def get_avatar_url(self, obj):
        """Get absolute URL for uploaded avatar"""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
    
    def validate_avatar(self, value):
        """Validate avatar file"""
        # Check file size (max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Avatar file size cannot exceed 5MB.")
        
        # Check file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Only JPEG, PNG, GIF, and WebP images are allowed.")
        
        return value
