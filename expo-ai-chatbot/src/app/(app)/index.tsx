import { useState, useRef, useEffect, useCallback } from "react";
import { Pressable, TextInput, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, Stack, useNavigation } from "expo-router";
import { generateUUID } from "@/lib/utils";
import { fetch } from "expo/fetch";

import { LottieLoader } from "@/components/lottie-loader";
import { ChatInterface } from "@/components/chat-interface";
import { ChatInput } from "@/components/ui/chat-input";
import { SuggestedActions } from "@/components/suggested-actions";
import type { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { useStore } from "@/lib/globalStore";
import { MessageCirclePlusIcon, Menu } from "lucide-react-native";
import type { Message } from "@ai-sdk/react";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAIStreaming } from "../../hooks/useAIStreaming";

type WeatherResult = {
  city: string;
  temperature: number;
  weatherCode: string;
  humidity: number;
  wind: number;
};

const HomePage = () => {
  const {
    clearImageUris,
    setBottomChatHeightHandler,
    setFocusKeyboard,
    chatId,
    setChatId,
    streaming,
    setStreamingState,
    resetStreamingState,
  } = useStore();
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { startStreaming, cancelStreaming, reset: resetStreaming } = useAIStreaming();

  // Initialize chatId if not set
  useEffect(() => {
    if (!chatId) {
      setChatId({ id: generateUUID(), from: "newChat" });
    }
  }, []);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: generateUUID(),
      role: "user",
      content: input.trim(),
    };
    
    const assistantMessage: Message = {
      id: generateUUID(),
      role: "assistant",
      content: "",
    };
    
    // Add user message and placeholder assistant message
    const newMessages = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);
    
    // Set streaming state
    setStreamingState({
      isStreaming: true,
      currentMessageId: assistantMessage.id,
      streamingText: "",
      error: null,
    });
    
    // Clear input
    setInput("");
    
    try {
      await startStreaming({
        prompt: input.trim()
      });
      
      // Note: The streaming updates should be handled through the useAIStreaming hook's state
      // This implementation may need to be updated to work with the hook's streaming state
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
  
  const append = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleNewChat = useCallback(() => {
    // Cancel any ongoing streaming
    if (streaming.isStreaming) {
      cancelStreaming();
    }
    
    // Reset messages and streaming state
    setMessages([]);
    resetStreamingState();
    resetStreaming();
    clearImageUris();

    // Small delay to ensure state updates have propagated
    setTimeout(() => {
      const newChatId = generateUUID();
      setChatId({ id: newChatId, from: "newChat" });
      inputRef.current?.focus();
      setBottomChatHeightHandler(false);
    }, 100);
  }, [clearImageUris, setBottomChatHeightHandler, setChatId, streaming.isStreaming, cancelStreaming, resetStreamingState, resetStreaming]);

  const handleTextChange = (text: string) => {
    setInput(text);
  };

  const { bottom } = useSafeAreaInsets();
  const scrollViewRef = useRef<GHScrollView>(null);

  // Reset messages when chatId changes
  useEffect(() => {
    if (chatId) {
      setMessages([] as Message[]);
    }
  }, [chatId, setMessages]);

  // Update message content with streaming text
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

  // Handle streaming completion
  useEffect(() => {
    if (!streaming.isStreaming && streaming.currentMessageId && streaming.streamingText) {
      // Ensure final text is saved to the message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === streaming.currentMessageId 
            ? { ...msg, content: streaming.streamingText }
            : msg
        )
      );
    }
  }, [streaming.isStreaming, streaming.currentMessageId, streaming.streamingText]);

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      className="flex-1 bg-white dark:bg-black"
      style={{ paddingBottom: bottom }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "hey",

          headerRight: () => (
            <Pressable disabled={!messages.length} onPress={handleNewChat}>
              <MessageCirclePlusIcon
                size={20}
                color={!messages.length ? "#eee" : "black"}
              />
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
        onChangeText={handleTextChange}
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
    </Animated.View>
  );
};

export default HomePage;
