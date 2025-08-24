import { View, ScrollView } from "react-native";
import { CustomMarkdown } from "@/components/ui/markdown";
import { useKeyboard } from "@react-native-community/hooks";
import { Text } from "@/components/ui/text";
import WeatherCard from "@/components/weather";
import { WelcomeMessage } from "@/components/welcome-message";
import React, { forwardRef } from "react";
import { LottieLoader } from "@/components/lottie-loader";
import { useStore } from "@/lib/globalStore";
import { ToolCallIndicator } from "@/components/ui/tool-call-indicator";

import { type UIMessage } from "@/lib/utils";

type ChatInterfaceProps = {
  messages: UIMessage[];
  scrollViewRef: React.RefObject<ScrollView>;
  isLoading?: boolean;
  streamingMessageId?: string | null;
};

export const ChatInterface = forwardRef<ScrollView, ChatInterfaceProps>(
  ({ messages, scrollViewRef }, ref) => {
    const { keyboardShown, keyboardHeight } = useKeyboard();
    const { streaming } = useStore();

    const isAtBottom = true; // This should be dynamic based on scroll position

    return (
      <View className="flex-1">
        <ScrollView ref={ref} className="flex-1 space-y-4 p-4">
          {!messages.length && <WelcomeMessage />}
          {messages.length > 0 &&
            messages.map((m) => (
              <React.Fragment key={m.id}>
                {/* Render message content */}
                <View
                  className={`flex-row px-4 ${m.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[95%] pl-0"} rounded-3xl ${m.role === "user" ? "bg-muted/50" : ""}`}
                >
                  {m.content.length > 0 && (
                    <>
                      <View
                        className={
                          m.role === "user"
                            ? ""
                            : "mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-gray-200"
                        }
                      >
                        <Text className="text-lg">
                          {m.role === "user" ? "" : "🤖"}
                        </Text>
                      </View>
                      <CustomMarkdown
                        content={
                          streaming.isStreaming &&
                          streaming.currentMessageId === m.id &&
                          m.role === "assistant"
                            ? streaming.streamingText || m.content
                            : m.content
                        }
                      />
                    </>
                  )}
                </View>
              </React.Fragment>
            ))}

          {/* Render tool results from streaming */}
          {streaming.toolCalls?.map((call) => {
            if (call.toolName === "getWeather" && call.result) {
              return (
                <WeatherCard
                  key={call.toolCallId}
                  city={call.result.city || "Unknown"}
                  temperature={call.result.current.temperature_2m}
                  weatherCode={call.result.current.weathercode}
                  humidity={call.result.current.relative_humidity_2m}
                  wind={call.result.current.wind_speed_10m}
                />
              );
            }
            return null;
          })}

          {/* Render tool call indicator OR the generic streaming loader */}
          {streaming.isStreaming && (
            <>
              {streaming.toolCalls && streaming.toolCalls.some(call => !call.result) ? (
                <ToolCallIndicator toolCalls={streaming.toolCalls} />
              ) : (
                // Only show the generic loader if there are no active tool calls
                // and the assistant message has started streaming.
                !streaming.toolCalls?.some(call => !call.result) && (
                  <View className="flex-row">
                    <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                      <Text className="text-lg">{"🤖"}</Text>
                    </View>
                    <View className="-ml-2 -mt-[1px]">
                      <LottieLoader width={40} height={40} />
                    </View>
                  </View>
                )
              )}
            </>
          )}

          {/* Render error message if any */}
          {streaming.error && (
            <View className="flex-row rounded-3xl px-4 pl-0 max-w-[95%]">
              <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-red-200">
                <Text className="text-lg">⚠️</Text>
              </View>
              <View className="flex-1 py-2">
                <Text className="text-red-600">Error: {streaming.error}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  },
);