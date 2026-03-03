from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatSession, ChatMessage
from .serializers import (
    ChatSessionSerializer,
    ChatMessageSerializer,
    SendMessageSerializer,
)
from .ai_engine import get_ai_response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_home(request):
    """Return the user's chat sessions."""
    sessions = ChatSession.objects.filter(user=request.user)[:20]
    serializer = ChatSessionSerializer(sessions, many=True)
    return Response({
        'success': True,
        'sessions': serializer.data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a message and get an AI response."""
    serializer = SendMessageSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user_message = serializer.validated_data['message']
    session_id = serializer.validated_data.get('session_id')

    # Get or create session
    if session_id:
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Chat session not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
    else:
        # Create a new session with truncated title from first message
        title = user_message[:80] + ('…' if len(user_message) > 80 else '')
        session = ChatSession.objects.create(user=request.user, title=title)

    # Save user message
    ChatMessage.objects.create(session=session, role='user', content=user_message)

    # Build conversation history for AI
    history = list(
        session.messages.order_by('created_at').values('role', 'content')
    )

    # Get AI response
    ai_reply = get_ai_response(history)

    # Save assistant message
    assistant_msg = ChatMessage.objects.create(
        session=session, role='assistant', content=ai_reply
    )

    return Response({
        'success': True,
        'session_id': str(session.id),
        'reply': ai_reply,
        'message': ChatMessageSerializer(assistant_msg).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    """Return the chat history (messages) for the user's most recent session,
    or a specific session if session_id query param is provided."""
    session_id = request.query_params.get('session_id')

    if session_id:
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(
                {'success': False, 'error': 'Chat session not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
    else:
        session = ChatSession.objects.filter(user=request.user).first()
        if not session:
            return Response({'success': True, 'messages': [], 'session_id': None})

    messages = session.messages.order_by('created_at')
    serializer = ChatMessageSerializer(messages, many=True)

    return Response({
        'success': True,
        'session_id': str(session.id),
        'messages': serializer.data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def new_session(request):
    """Create a new empty chat session."""
    session = ChatSession.objects.create(user=request.user, title='New conversation')
    return Response({
        'success': True,
        'session_id': str(session.id),
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_session(request, session_id):
    """Delete a chat session and all its messages."""
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Chat session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    session.delete()
    return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
