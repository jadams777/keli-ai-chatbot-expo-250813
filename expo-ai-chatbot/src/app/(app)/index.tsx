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
import { useColorScheme } from "react-native";
import { useColorScheme as useCustomColorScheme } from "@/lib/useColorScheme";
import { getSystemPrompt } from "@/lib/system-prompt";
import { type CoreMessage } from "ai";
import type { ChatSession } from "@/lib/globalStore";
import { adapty } from 'react-native-adapty';
// import { emailService } from "@/lib/email-service";

const HomePage = () => {
  const router = useRouter();
  const deviceColorScheme = useColorScheme();
  const { isDarkColorScheme, colorScheme } = useCustomColorScheme();
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
    detectZipCodeFromMessage,
    setZipCode,
    hasZipCode,
  } = useStore();
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [awaitingFeedbackResponse, setAwaitingFeedbackResponse] = useState<string | null>(null);
  const { startStreaming, cancelStreaming, reset: resetStreaming } = useAIStreaming();

  useEffect(() => {
    if (!chatId) {
      setChatId({ id: generateUUID(), from: "newChat" });
    }
    // Load chat history on app start
    loadChatHistory();
    
    // Initialize Adapty SDK
    const adaptyKey = process.env.EXPO_PUBLIC_ADAPTY_SDK_KEY;
    if (adaptyKey) {
      adapty.activate(adaptyKey);
    }
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
    
    const newChatId = generateUUID();
    setChatId({ id: newChatId, from: "newChat" });
    inputRef.current?.focus();
    setBottomChatHeightHandler(false);
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

  const handleFeedback = useCallback(async (messageId: string, type: 'positive' | 'negative') => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              feedback: { 
                type, 
                isAwaitingResponse: false, // No longer awaiting response since we handle it immediately
                hasResponded: type === 'positive' // Positive feedback is immediately complete
              } 
            }
          : msg
      )
    );
  }, []);



  const handleSubmit = useCallback(async () => {
    console.log('[handleSubmit] Function called with:', {
      inputTrimmed: input.trim(),
      inputLength: input.length,
      messagesCount: messages.length,
      streamingState: streaming
    });
    
    if (!input.trim()) {
      console.log('[handleSubmit] Early return - no input');
      return;
    }

    console.log('[handleSubmit] Creating user message...');
    const userMessage: UIMessage = {
      id: generateUUID(),
      role: "user",
      content: input.trim(),
    };
    console.log('[handleSubmit] User message created:', userMessage);

    // Check for zip code in user message and store it
    console.log('[handleSubmit] Detecting zip code...');
    const detectedZipCode = detectZipCodeFromMessage(input.trim());
    if (detectedZipCode && !hasZipCode()) {
      console.log('[handleSubmit] Setting zip code:', detectedZipCode);
      await setZipCode(detectedZipCode);
      
      // Add confirmation message
      const confirmationMessage: UIMessage = {
        id: generateUUID(),
        role: "assistant",
        content: "Thanks, I got it!",
      };
      
      const newMessagesWithConfirmation = [...messages, userMessage, confirmationMessage];
      console.log('[handleSubmit] Setting confirmation messages, count:', newMessagesWithConfirmation.length);
      setMessages(newMessagesWithConfirmation);
      setInput("");
      return; // Exit early to show only the confirmation
    }

    const assistantMessage: UIMessage = {
      id: generateUUID(),
      role: "assistant",
      content: "",
    };

    const newMessages = [...messages, userMessage];
    console.log('[handleSubmit] Setting new messages, count:', newMessages.length + 1);
    setMessages([...newMessages, assistantMessage]);

    setStreamingState({
      isStreaming: true,
      currentMessageId: assistantMessage.id,
      streamingText: "",
      error: null,
    });

    console.log('[handleSubmit] Clearing input...');
    setInput("");

    // Prepare messages for the AI
    const history = newMessages.slice(-5); // Get the last 5 messages
    const coreMessages: CoreMessage[] = history.map(m => ({ role: m.role, content: m.content }));

    console.log('[handleSubmit] Getting system prompt...');
    const systemPrompt = getSystemPrompt();
    console.log('[handleSubmit] System prompt length:', systemPrompt.length);

    try {
      console.log('[handleSubmit] Starting streaming with:', {
        messagesCount: coreMessages.length + 1,
        systemPromptLength: systemPrompt.length
      });
      await startStreaming({
        messages: [
          { role: 'system', content: systemPrompt },
          ...coreMessages
        ],
      });
      console.log('[handleSubmit] Streaming started successfully');
    } catch (error) {
      console.error('[handleSubmit] Error starting streaming:', error);
      setStreamingState({
        isStreaming: false,
        currentMessageId: null,
        streamingText: "",
        error: error instanceof Error ? error.message : "An error occurred",
      });
    }
  }, [input, messages, setInput, setMessages, setStreamingState, detectZipCodeFromMessage, hasZipCode, setZipCode, startStreaming, getSystemPrompt]);

  const { bottom } = useSafeAreaInsets();
  const scrollViewRef = useRef<GHScrollView>(null);



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
          headerLeft: () => <MenuButton size={20} />,
          headerRight: () => (
            <Pressable 
              onPress={() => router.push('/voice-chat')}
              className="flex items-center justify-center w-10 h-10"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={20} color={isDarkColorScheme ? "#ffffff" : "#333333"} />
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
          onFeedback={handleFeedback}
        />
      </ScrollView>

      {messages.length === 0 && (
        <SuggestedActions
          hasInput={!!input}
          onSubmit={(message) => {
            setInput(message);
            // Use requestAnimationFrame for better timing instead of setTimeout
            requestAnimationFrame(() => {
              handleSubmit();
            });
          }}
          onDirectAssistantMessage={(message) => {
            const assistantMessage: UIMessage = {
              id: generateUUID(),
              role: "assistant",
              content: message,
            };
            setMessages([assistantMessage]);
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
        isStreaming={streaming.isStreaming}
      />
    </Animated.View>
  );
};

export default HomePage;
