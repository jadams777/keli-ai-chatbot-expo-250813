import { useState, useRef, useEffect, useCallback } from "react";
import { Pressable, TextInput, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { generateUUID, type UIMessage } from "@/lib/utils";
import { ChatInterface } from "@/components/chat-interface";
import { ChatInput } from "@/components/ui/chat-input";
import { SuggestedActions } from "@/components/suggested-actions";
import { SidebarDrawer } from "@/components/SidebarDrawer";
import { MenuButton } from "@/components/MenuButton";
import type { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { useStore } from "@/lib/globalStore";
import { Mic } from "lucide-react-native";
import { useAIStreaming } from "@/hooks/useAIStreaming";
import Animated, { FadeIn } from "react-native-reanimated";
import { useColorScheme } from "@/lib/useColorScheme";
import { getSystemPrompt } from "@/lib/system-prompt";
import { type CoreMessage } from "ai";
import type { ChatSession } from "@/lib/globalStore";

const HomePage = () => {
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();
  const {
    clearImageUris,
    setBottomChatHeightHandler,
    chatId,
    setChatId,
    streaming,
    setStreamingState,
    resetStreamingState,
    saveCurrentSession,
    loadChatSession,
    loadChatHistory,
  } = useStore();
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const { startStreaming, cancelStreaming, reset: resetStreaming } = useAIStreaming();

  useEffect(() => {
    if (!chatId) {
      setChatId({ id: generateUUID(), from: "newChat" });
    }
    // Load chat history on app start
    loadChatHistory();
  }, []);

  // Save current session when messages change
  useEffect(() => {
    if (messages.length > 0 && chatId) {
      saveCurrentSession(messages);
    }
  }, [messages, chatId]);

  const handleNewChat = useCallback(() => {
    if (streaming.isStreaming) {
      cancelStreaming();
    }
    setMessages([]);
    resetStreamingState();
    resetStreaming();
    clearImageUris();
    setTimeout(() => {
      const newChatId = generateUUID();
      setChatId({ id: newChatId, from: "newChat" });
      inputRef.current?.focus();
      setBottomChatHeightHandler(false);
    }, 100);
  }, [clearImageUris, setBottomChatHeightHandler, setChatId, streaming.isStreaming, cancelStreaming, resetStreamingState, resetStreaming]);

  const handleSelectSession = useCallback((session: ChatSession) => {
    // Save current session before switching
    if (messages.length > 0 && chatId) {
      saveCurrentSession(messages);
    }
    
    // Load selected session
    setMessages(session.messages);
    setChatId({ id: session.id, from: "history" });
    
    // Stop any ongoing streaming
    if (streaming.isStreaming) {
      cancelStreaming();
      resetStreamingState();
    }
  }, [messages, chatId, saveCurrentSession, setChatId, streaming.isStreaming, cancelStreaming, resetStreamingState]);

  const handleNewChatFromSidebar = useCallback(() => {
    handleNewChat();
  }, [handleNewChat]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage: UIMessage = {
      id: generateUUID(),
      role: "user",
      content: input.trim(),
    };

    const assistantMessage: UIMessage = {
      id: generateUUID(),
      role: "assistant",
      content: "",
    };

    const newMessages = [...messages, userMessage];
    setMessages([...newMessages, assistantMessage]);

    setStreamingState({
      isStreaming: true,
      currentMessageId: assistantMessage.id,
      streamingText: "",
      error: null,
    });

    setInput("");

    // Prepare messages for the AI
    const history = newMessages.slice(-5); // Get the last 5 messages
    const coreMessages: CoreMessage[] = history.map(m => ({ role: m.role, content: m.content }));

    try {
      await startStreaming({
        messages: [
          { role: 'system', content: getSystemPrompt() },
          ...coreMessages
        ],
      });
    } catch (error) {
      console.error("Streaming error:", error);
      setStreamingState({
        isStreaming: false,
        currentMessageId: null,
        streamingText: "",
        error: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const { bottom } = useSafeAreaInsets();
  const scrollViewRef = useRef<GHScrollView>(null);

  useEffect(() => {
    if (chatId) {
      setMessages([] as UIMessage[]);
    }
  }, [chatId, setMessages]);

  useEffect(() => {
    if (streaming.currentMessageId && streaming.streamingText) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === streaming.currentMessageId
            ? { ...msg, content: streaming.streamingText }
            : msg
        )
      );
    }
  }, [streaming.currentMessageId, streaming.streamingText]);

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      className="flex-1 bg-white dark:bg-black"
      style={{ paddingBottom: bottom }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Private Chat",
          headerLeft: () => (
            <MenuButton size={20} />
          ),
          headerRight: () => (
            <Pressable 
              onPress={() => router.push('/voice-chat')}
              className="flex items-center justify-center w-10 h-10"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={20} color={isDarkColorScheme ? "white" : "black"} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="container relative mx-auto flex-1 bg-white dark:bg-black"
        ref={scrollViewRef}
      >
        <ChatInterface
          messages={messages}
          scrollViewRef={scrollViewRef}
          isLoading={streaming.isStreaming}
          streamingMessageId={streaming.currentMessageId}
        />
      </ScrollView>

      {messages.length === 0 && (
        <SuggestedActions
          hasInput={!!input}
          onSubmit={(message) => {
            setInput(message);
            setTimeout(() => {
              handleSubmit();
            }, 100);
          }}
        />
      )}

      <ChatInput
        ref={inputRef}
        scrollViewRef={scrollViewRef}
        input={input}
        onChangeText={setInput}
        focusOnMount={false}
        isStreaming={streaming.isStreaming}
        onSubmit={() => {
          setBottomChatHeightHandler(true);
          handleSubmit();
          clearImageUris();
        }}
        onStop={() => {
          cancelStreaming();
          resetStreamingState();
        }}
      />
      
      <SidebarDrawer
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChatFromSidebar}
      />
    </Animated.View>
  );
};

export default HomePage;
