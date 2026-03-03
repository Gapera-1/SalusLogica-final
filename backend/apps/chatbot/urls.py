from django.urls import path
from . import views

app_name = 'chatbot'

urlpatterns = [
    path('', views.chat_home, name='chat_home'),
    path('send/', views.send_message, name='send_message'),
    path('history/', views.chat_history, name='chat_history'),
    path('new/', views.new_session, name='new_session'),
    path('delete/<uuid:session_id>/', views.delete_session, name='delete_session'),
]
