import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { ScrollAdapt } from "@/components/scroll-adapt";
import { useWindowDimensions } from "react-native";
import { useState, useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useStore } from "@/lib/globalStore";
import { generateUUID } from "@/lib/utils";
interface SuggestedActionsProps {
  hasInput?: boolean;
  onSubmit: (message: string) => void;
  onDirectAssistantMessage?: (message: string) => void;
}

export function SuggestedActions({
  hasInput = false,
  onSubmit,
  onDirectAssistantMessage,
}: SuggestedActionsProps) {
  const { selectedImageUris, setChatId, location, loadZipCode } = useStore();
  const { width } = useWindowDimensions();
  const [cardWidth, setCardWidth] = useState(0);

  const opacity = useSharedValue(1);

  useEffect(() => {
    loadZipCode();
  }, []);

  useEffect(() => {
    opacity.value = withTiming(
      hasInput || selectedImageUris.length > 0 ? 0 : 1,
      {
        duration: 200,
      },
    );
  }, [hasInput, selectedImageUris]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePress = (action: string, title: string) => {
    // Special handling for "What can Keli do?" action
    if (title === "What can Keli do?" && onDirectAssistantMessage) {
      onDirectAssistantMessage(action);
      return;
    }
    
    const newChatId = generateUUID();
    setChatId({ id: newChatId, from: "newChat" });
    
    // Submit the action message
    onSubmit(action);
  };

  const getActions = () => {
    if (location.zipCode) {
      // Location-specific suggestions when zip code is available
      return [
        {
          title: "What can Keli do?",
          label: "Discover how Keli can help you with daily tasks and information.",
          action: "Hi, I'm Keli, your helpful AI assistant! Here's what I can help you with:\n\n🌤️ **Weather & Forecasts**: Get current weather conditions and multi-day forecasts for any location\n\n🔍 **Web Search**: Find current information, news, facts, and answers to your questions from across the internet\n\n📍 **Local Search**: Discover nearby restaurants, entertainment, activities, and local recommendations based on your area\n\n📅 **Calendar Management**: View your schedule, create new events, update existing appointments, and delete calendar entries\n\n💬 **General Assistant**: Answer questions, help with writing, provide explanations, and assist with various daily tasks\n\nJust ask me anything - I'm here to help make your day easier and more productive!",
        },
        {
          title: "Weather forecast",
          label: `Get detailed weather information for your area (${location.zipCode}).`,
          action: `What is the weather forecast for ${location.zipCode}?`,
        },
        {
          title: "Top local restaurants",
          label: `Discover top-rated restaurants and dining options in your area.`,
          action: `What are some highly-rated restaurants near ${location.zipCode}?`,
        },
        {
          title: "Fun things to do",
          label: `Find exciting activities and events happening in your area.`,
          action: `What are some fun things to do this weekend near ${location.zipCode}?`,
        },        {
          title: "Enjoy Live Music",
          label: `Find upcoming live music performance in your area.`,
          action: `Find upcoming live music performance near ${location.zipCode}`,
        },
      ];
    } else {
      // Default suggestions when no zip code is available
      return [
        {
          title: "What can Keli do?",
          label: "Discover how Keli can help you with daily tasks and information.",
          action: "Hi, I'm Keli, your helpful AI assistant! Here's what I can help you with:\n\n🌤️ **Weather & Forecasts**: Get current weather conditions and multi-day forecasts for any location\n\n🔍 **Web Search**: Find current information, news, facts, and answers to your questions from across the internet\n\n📍 **Location Services**: Discover nearby restaurants, entertainment, activities, and local recommendations based on your area\n\n📅 **Calendar Management**: View your schedule, create new events, update existing appointments, and delete calendar entries\n\n💬 **General Assistant**: Answer questions, help with writing, provide explanations, and assist with various daily tasks\n\nJust ask me anything - I'm here to help make your day easier and more productive!",
        },
        {
          title: "What's the weather",
          label:
            "Get detailed weather information for San Francisco.",
          action: "What is the weather in San Francisco today?",
        },
        {
          title: "Help me write an essay",
          label:
            "Create a well-researched essay exploring Silicon Valley's history.",
          action: "Help me draft a short essay about Silicon Valley",
        },
        {
          title: "Get stock market analysis",
          label:
            "Check current stock prices, market trends, & key financial metrics.",
          action: "What is the current stock price of Apple (AAPL)?",
        },
      ];
    }
  };

  const actions = getActions();

  return (
    <Animated.View
      style={animatedStyle}
      // Prevent invisible overlay from blocking touches when user is typing or has images
      pointerEvents={hasInput || selectedImageUris.length > 0 ? 'none' : 'auto'}
    >
      <ScrollAdapt withSnap itemWidth={cardWidth}>
        {actions.map((item, i) => (
          <Pressable key={item.action} onPress={() => handlePress(item.action, item.title)}>
            <View
              onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
              className={cn(
                "mb-3 mr-2.5 h-32 w-[280px] rounded-lg border border-gray-200 bg-white p-4 dark:bg-black",
              )}
              style={{
                //   borderWidth: StyleSheet.hairlineWidth,
                //   borderColor: "red",
                ...(i === actions.length - 1 && {
                  marginRight: width - cardWidth,
                }),
              }}
            >
              <Text className="text-lg font-semibold">{item.title}</Text>
              <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {item.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollAdapt>
    </Animated.View>
  );
}
