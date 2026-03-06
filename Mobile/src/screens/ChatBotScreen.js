import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { chatbotAPI } from '../services/api';

const ChatBotScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const flatListRef = useRef(null);

  // Animated typing dots
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!loading) return;
    const animateDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    const a1 = animateDot(dot1Anim, 0);
    const a2 = animateDot(dot2Anim, 150);
    const a3 = animateDot(dot3Anim, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [loading]);

  const quickSuggestions = [
    t('chatbot.suggestion1') || '💊 Drug interactions',
    t('chatbot.suggestion2') || '⏰ Medication schedule',
    t('chatbot.suggestion3') || '🩺 Side effects',
    t('chatbot.suggestion4') || '📋 Health tips',
  ];

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await chatbotAPI.getHistory();
      if (data.messages && data.messages.length > 0) {
        setMessages(
          data.messages.map((m) => ({
            id: m.id?.toString() || Math.random().toString(),
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
          }))
        );
        setSessionId(data.session_id);
      } else {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content:
              t('chatbot.welcome') ||
              "Hello! 👋 I'm SalusLogica AI, your health assistant. How can I help you today?",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            t('chatbot.welcome') ||
            "Hello! 👋 I'm SalusLogica AI, your health assistant. How can I help you today?",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setInitialLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    sendMessageWithText(text);
  };

  const startNewChat = () => {
    setMessages([
      {
        id: 'welcome_new',
        role: 'assistant',
        content:
          t('chatbot.welcome') ||
          "Hello! 👋 I'm SalusLogica AI, your health assistant. How can I help you today?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setSessionId(null);
  };

  const sendSuggestion = (text) => {
    setInput(text);
    setTimeout(() => {
      setInput(text);
      sendMessageWithText(text);
    }, 50);
  };

  const sendMessageWithText = async (text) => {
    if (!text.trim() || loading) return;
    Keyboard.dismiss();
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const data = await chatbotAPI.sendMessage(text.trim(), sessionId);
      if (data.session_id) setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        {
          id: data.message?.id?.toString() || Date.now().toString() + '_reply',
          role: 'assistant',
          content: data.reply,
          timestamp: data.message?.created_at || new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '_error',
          role: 'assistant',
          content:
            t('chatbot.error') ||
            "Sorry, I couldn't process your request. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simple markdown-ish rendering for bold/bullet/numbered lists
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Parse bold markers **...**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const rendered = parts.map((seg, j) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return (
            <Text key={j} style={{ fontWeight: '700' }}>
              {seg.slice(2, -2)}
            </Text>
          );
        }
        if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2) {
          return (
            <Text key={j} style={{ fontStyle: 'italic' }}>
              {seg.slice(1, -1)}
            </Text>
          );
        }
        return seg;
      });

      const isBullet = line.startsWith('• ') || line.startsWith('- ');
      const isNumbered = /^\d+\.\s/.test(line);

      if (isBullet || isNumbered) {
        return (
          <Text key={i} style={{ marginLeft: 8, marginTop: 2 }}>
            {rendered}
          </Text>
        );
      }

      return (
        <Text key={i}>
          {rendered}
          {i < lines.length - 1 ? '\n' : ''}
        </Text>
      );
    });
  };

  const renderMessage = useCallback(
    ({ item }) => {
      const isUser = item.role === 'user';
      return (
        <View
          style={[
            styles.messageBubbleRow,
            isUser ? styles.userRow : styles.assistantRow,
          ]}
        >
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: isUser ? '#ffffff' : colors.text },
              ]}
            >
              {renderFormattedText(item.content)}
            </Text>
            <Text
              style={[
                styles.messageTime,
                { color: isUser ? 'rgba(255,255,255,0.6)' : colors.textMuted },
              ]}
            >
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    },
    [colors]
  );

  // Scroll to end when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  if (initialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {t('chatbot.title') || 'SalusLogica AI'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('chatbot.subtitle') || 'Health Assistant'}
            </Text>
          </View>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const isWelcomeOnly = messages.length === 1 && (messages[0].id === 'welcome' || messages[0].id === 'welcome_new');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityLabel={t('common.back') || 'Go back'}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerRow}>
            <View style={styles.headerAvatarSmall}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {t('chatbot.title') || 'SalusLogica AI'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('chatbot.subtitle') || 'Health Assistant'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={startNewChat}
          style={styles.headerBtn}
          accessibilityLabel={t('chatbot.newChat') || 'Start new chat'}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <View style={[styles.messageBubbleRow, styles.assistantRow]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
              <View
                style={[
                  styles.messageBubble,
                  styles.assistantBubble,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.typingIndicator}>
                  <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, opacity: dot1Anim }]} />
                  <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, opacity: dot2Anim }]} />
                  <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, opacity: dot3Anim }]} />
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* Quick Suggestions */}
      {isWelcomeOnly && !loading && (
        <View style={styles.suggestionsContainer}>
          {quickSuggestions.map((suggestion, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.suggestionChip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
              onPress={() => sendSuggestion(suggestion)}
              activeOpacity={0.7}
            >
              <Text style={[styles.suggestionText, { color: colors.primary }]}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Disclaimer */}
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        {t('chatbot.disclaimer') ||
          'AI responses are informational only. Always consult your healthcare provider.'}
      </Text>

      {/* Input area */}
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder={t('chatbot.placeholder') || 'Ask me anything about health...'}
          placeholderTextColor={colors.textMuted}
          editable={!loading}
          maxLength={2000}
          multiline
          textAlignVertical="center"
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!input.trim() || loading}
          style={[
            styles.sendBtn,
            {
              backgroundColor: input.trim() && !loading ? colors.primary : colors.border,
            },
          ]}
          accessibilityLabel={t('chatbot.send') || 'Send message'}
          accessibilityRole="button"
        >
          <Ionicons
            name="send"
            size={20}
            color={input.trim() && !loading ? '#fff' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 4,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatBotScreen;
