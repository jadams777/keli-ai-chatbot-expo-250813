import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UIMessage } from "./utils";

type ChatIdState = {
  id: string;
  from: "history" | "newChat";
} | null;

// Chat session interface for history management
export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  messages: UIMessage[];
}

// Storage keys for AsyncStorage
const STORAGE_KEYS = {
  CHAT_SESSIONS: '@chat_sessions',
  CURRENT_CHAT_ID: '@current_chat_id'
};

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
}

type StreamingState = {
  isStreaming: boolean;
  currentMessageId: string | null;
  streamingText: string;
  error: string | null;
  toolCalls: ToolCall[];
};

type AIProviderState = {
  selectedModel: string;
  isLocal: boolean;
  availableProviders: Array<{ name: string; modelName: string; isLocal: boolean }>;
};

// Chat history state for sidebar management
type ChatHistoryState = {
  sidebarVisible: boolean;
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
};

interface StoreState {
  scrollY: number;
  setScrollY: (value: number) => void;
  selectedImageUris: string[];
  addImageUri: (uri: string) => void;
  removeImageUri: (uri: string) => void;
  clearImageUris: () => void;
  setBottomChatHeightHandler: (value: boolean) => void;
  bottomChatHeightHandler: boolean;
  chatId: ChatIdState;
  setChatId: (value: { id: string; from: "history" | "newChat" }) => void;
  setFocusKeyboard: (value: boolean) => void;
  focusKeyboard: boolean;
  // Streaming state
  streaming: StreamingState;
  setStreamingState: (state: Partial<StreamingState>) => void;
  resetStreamingState: () => void;
  // AI Provider state
  aiProvider: AIProviderState;
  setSelectedModel: (modelName: string, isLocal: boolean) => void;
  setAvailableProviders: (providers: Array<{ name: string; modelName: string; isLocal: boolean }>) => void;
  // Chat History state
  chatHistory: ChatHistoryState;
  setSidebarVisible: (visible: boolean) => void;
  addChatSession: (session: ChatSession) => void;
  deleteChatSession: (sessionId: string) => void;
  updateChatSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  loadChatHistory: () => Promise<void>;
  saveChatHistory: () => Promise<void>;
  saveCurrentSession: (messages: UIMessage[]) => Promise<void>;
  loadChatSession: (sessionId: string) => ChatSession | null;
}

export const useStore = create<StoreState>((set) => ({
  scrollY: 0,
  setScrollY: (value: number) => set({ scrollY: value }),
  selectedImageUris: [],
  addImageUri: (uri: string) =>
    set((state) => ({
      selectedImageUris: [...state.selectedImageUris, uri],
    })),
  removeImageUri: (uri: string) =>
    set((state) => ({
      selectedImageUris: state.selectedImageUris.filter(
        (imageUri) => imageUri !== uri,
      ),
    })),
  clearImageUris: () => set({ selectedImageUris: [] }),
  bottomChatHeightHandler: false,
  setBottomChatHeightHandler: (value: boolean) =>
    set({ bottomChatHeightHandler: value }),
  chatId: null,
  setChatId: (value) => set({ chatId: value }),
  focusKeyboard: false,
  setFocusKeyboard: (value: boolean) => set({ focusKeyboard: value }),
  // Streaming state
  streaming: {
    isStreaming: false,
    currentMessageId: null,
    streamingText: '',
    error: null,
    toolCalls: [],
  },
  setStreamingState: (state: Partial<StreamingState>) => {
    // Centralized cleaning of streaming text to prevent "null" prefix
    if (typeof state.streamingText === 'string') {
      state.streamingText = state.streamingText.replace(/^(null|Null)\s*/, '');
    }
    set((prevState) => ({
      streaming: { ...prevState.streaming, ...state },
    }));
  },
  resetStreamingState: () =>
    set({
      streaming: {
        isStreaming: false,
        currentMessageId: null,
        streamingText: '',
        error: null,
        toolCalls: [],
      },
    }),
  // AI Provider state
  aiProvider: {
    selectedModel: 'gpt-4o',
    isLocal: false,
    availableProviders: [],
  },
  setSelectedModel: (modelName: string, isLocal: boolean) =>
    set((state) => ({
      aiProvider: { ...state.aiProvider, selectedModel: modelName, isLocal },
    })),
  setAvailableProviders: (providers) =>
    set((state) => ({
      aiProvider: { ...state.aiProvider, availableProviders: providers },
    })),
  // Chat History state
  chatHistory: {
    sidebarVisible: false,
    chatSessions: [],
    currentSessionId: null,
    isLoading: false,
  },
  setSidebarVisible: (visible: boolean) =>
    set((state) => ({
      chatHistory: { ...state.chatHistory, sidebarVisible: visible },
    })),
  addChatSession: (session: ChatSession) =>
    set((state) => ({
      chatHistory: {
        ...state.chatHistory,
        chatSessions: [session, ...state.chatHistory.chatSessions],
      },
    })),
  deleteChatSession: (sessionId: string) =>
    set((state) => ({
      chatHistory: {
        ...state.chatHistory,
        chatSessions: state.chatHistory.chatSessions.filter(
          (session) => session.id !== sessionId
        ),
      },
    })),
  updateChatSession: (sessionId: string, updates: Partial<ChatSession>) =>
    set((state) => ({
      chatHistory: {
        ...state.chatHistory,
        chatSessions: state.chatHistory.chatSessions.map((session) =>
          session.id === sessionId ? { ...session, ...updates } : session
        ),
      },
    })),
  loadChatHistory: async () => {
    try {
      set((state) => ({
        chatHistory: { ...state.chatHistory, isLoading: true },
      }));
      
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      const sessions: ChatSession[] = data ? JSON.parse(data) : [];
      
      // Convert date strings back to Date objects
      const parsedSessions = sessions.map(session => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      }));
      
      set((state) => ({
        chatHistory: {
          ...state.chatHistory,
          chatSessions: parsedSessions,
          isLoading: false,
        },
      }));
    } catch (error) {
      console.error('Failed to load chat history:', error);
      set((state) => ({
        chatHistory: { ...state.chatHistory, isLoading: false },
      }));
    }
  },
  saveChatHistory: async () => {
    try {
      const { chatHistory } = useStore.getState();
      await AsyncStorage.setItem(
        STORAGE_KEYS.CHAT_SESSIONS,
        JSON.stringify(chatHistory.chatSessions)
      );
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  },
  saveCurrentSession: async (messages: UIMessage[]) => {
    try {
      const { chatId, chatHistory } = useStore.getState();
      if (!chatId || messages.length === 0) return;
      
      const title = messages[0]?.content?.slice(0, 50) || 'New Chat';
      const now = new Date();
      
      const existingSessionIndex = chatHistory.chatSessions.findIndex(
        (session) => session.id === chatId.id
      );
      
      const sessionData: ChatSession = {
        id: chatId.id,
        title,
        createdAt: existingSessionIndex >= 0 ? chatHistory.chatSessions[existingSessionIndex].createdAt : now,
        updatedAt: now,
        messageCount: messages.length,
        messages,
      };
      
      if (existingSessionIndex >= 0) {
        // Update existing session
        set((state) => ({
          chatHistory: {
            ...state.chatHistory,
            chatSessions: state.chatHistory.chatSessions.map((session, index) =>
              index === existingSessionIndex ? sessionData : session
            ),
          },
        }));
      } else {
        // Add new session
        set((state) => ({
          chatHistory: {
            ...state.chatHistory,
            chatSessions: [sessionData, ...state.chatHistory.chatSessions],
          },
        }));
      }
      
      // Save to AsyncStorage
      const { chatHistory: updatedHistory } = useStore.getState();
      await AsyncStorage.setItem(
        STORAGE_KEYS.CHAT_SESSIONS,
        JSON.stringify(updatedHistory.chatSessions)
      );
    } catch (error) {
      console.error('Failed to save current session:', error);
    }
  },
  loadChatSession: (sessionId: string) => {
    const { chatHistory } = useStore.getState();
    return chatHistory.chatSessions.find((session) => session.id === sessionId) || null;
  },
}));
