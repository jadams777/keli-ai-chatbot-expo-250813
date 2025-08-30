import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../lib/globalStore';
import { useColorScheme } from 'react-native';
import { ChatSession } from '../lib/globalStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(280, SCREEN_WIDTH * 0.8);

interface SidebarDrawerProps {
  onSelectSession: (session: ChatSession) => void;
  onNewChat: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  onSelectSession,
  onNewChat,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const {
    chatHistory,
    setSidebarVisible,
    deleteChatSession,
    loadChatHistory,
  } = useStore();

  const translateX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (chatHistory.sidebarVisible) {
      translateX.value = withTiming(0, { duration: 300 });
      overlayOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateX.value = withTiming(-SIDEBAR_WIDTH, { duration: 300 });
      overlayOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [chatHistory.sidebarVisible]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const handleClose = () => {
    setSidebarVisible(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteChatSession(sessionId);
  };

  const handleSelectSession = (session: ChatSession) => {
    onSelectSession(session);
    setSidebarVisible(false);
  };

  const handleNewChat = () => {
    onNewChat();
    setSidebarVisible(false);
  };

  const sidebarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!chatHistory.sidebarVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Overlay */}
      <Animated.View
        style={[styles.overlay, overlayAnimatedStyle]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderRightColor: isDark ? '#333333' : '#e5e5e5',
          },
          sidebarAnimatedStyle,
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: isDark ? '#333333' : '#e5e5e5' },
          ]}
        >
          <Text
            style={[
              styles.headerTitle,
              { color: isDark ? '#ffffff' : '#000000' },
            ]}
          >
            Chat History
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={24}
              color={isDark ? '#ffffff' : '#000000'}
            />
          </TouchableOpacity>
        </View>

        {/* New Chat Button */}
        <TouchableOpacity
          style={[
            styles.newChatButton,
            {
              backgroundColor: isDark ? '#333333' : '#f0f0f0',
              borderColor: isDark ? '#444444' : '#d0d0d0',
            },
          ]}
          onPress={handleNewChat}
        >
          <Ionicons
            name="add"
            size={20}
            color={isDark ? '#ffffff' : '#000000'}
          />
          <Text
            style={[
              styles.newChatText,
              { color: isDark ? '#ffffff' : '#000000' },
            ]}
          >
            New Chat
          </Text>
        </TouchableOpacity>

        {/* Chat Sessions List */}
        <ScrollView
          style={styles.sessionsList}
          showsVerticalScrollIndicator={false}
        >
          {chatHistory.isLoading ? (
            <View style={styles.loadingContainer}>
              <Text
                style={[
                  styles.loadingText,
                  { color: isDark ? '#888888' : '#666666' },
                ]}
              >
                Loading...
              </Text>
            </View>
          ) : chatHistory.chatSessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: isDark ? '#888888' : '#666666' },
                ]}
              >
                No chat history yet
              </Text>
            </View>
          ) : (
            chatHistory.chatSessions.map((session) => (
              <ChatSessionItem
                key={session.id}
                session={session}
                onSelect={() => handleSelectSession(session)}
                onDelete={() => handleDeleteSession(session.id)}
                isDark={isDark}
              />
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

interface ChatSessionItemProps {
  session: ChatSession;
  onSelect: () => void;
  onDelete: () => void;
  isDark: boolean;
}

const ChatSessionItem: React.FC<ChatSessionItemProps> = ({
  session,
  onSelect,
  onDelete,
  isDark,
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <View
      style={[
        styles.sessionItem,
        {
          backgroundColor: isDark ? '#2a2a2a' : '#f8f8f8',
          borderColor: isDark ? '#444444' : '#e0e0e0',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.sessionContent}
        onPress={onSelect}
        activeOpacity={0.7}
      >
        <View style={styles.sessionInfo}>
          <Text
            style={[
              styles.sessionTitle,
              { color: isDark ? '#ffffff' : '#000000' },
            ]}
            numberOfLines={2}
          >
            {session.title}
          </Text>
          <View style={styles.sessionMeta}>
            <Text
              style={[
                styles.sessionDate,
                { color: isDark ? '#888888' : '#666666' },
              ]}
            >
              {formatDate(session.updatedAt)}
            </Text>
            <Text
              style={[
                styles.messageCount,
                { color: isDark ? '#888888' : '#666666' },
              ]}
            >
              {session.messageCount} messages
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={isDark ? '#ff6b6b' : '#ff4757'}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60, // Account for status bar
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  newChatText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  sessionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 12,
  },
  messageCount: {
    fontSize: 12,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});