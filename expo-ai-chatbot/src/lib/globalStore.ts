import { create } from "zustand";

type ChatIdState = {
  id: string;
  from: "history" | "newChat";
} | null;

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
}));
