import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Floating Action Button that opens the AI Chatbot screen.
 * Renders as a pill in the bottom-right corner above the tab bar.
 */
const ChatBotFAB = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary }]}
      onPress={() => navigation.navigate('ChatBot')}
      activeOpacity={0.8}
      accessibilityLabel="Chat with AI"
      accessibilityRole="button"
    >
      <View style={styles.inner}>
        <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80, // above the tab bar
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 100,
  },
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatBotFAB;
