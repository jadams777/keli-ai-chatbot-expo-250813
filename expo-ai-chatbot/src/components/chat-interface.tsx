import { View, ScrollView, ActivityIndicator } from "react-native";

// import Markdown from "react-native-markdown-display";
import { CustomMarkdown } from "@/components/ui/markdown";
import { useKeyboard } from "@react-native-community/hooks";
import { Text } from "@/components/ui/text";
import WeatherCard from "@/components/weather";
import { WelcomeMessage } from "@/components/welcome-message";
import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { LottieLoader } from "@/components/lottie-loader";
import { useStore, type ToolCall } from "@/lib/globalStore";

import { type UIMessage } from "@/lib/utils";

type ChatInterfaceProps = {
  messages: UIMessage[];
  scrollViewRef: React.RefObject<ScrollView>;
  isLoading?: boolean;
  streamingMessageId?: string | null;
};

export const ChatInterface = forwardRef<ScrollView, ChatInterfaceProps>(
  ({ messages, scrollViewRef, isLoading, streamingMessageId }, ref) => {
    const { keyboardShown, keyboardHeight } = useKeyboard();
    const { streaming } = useStore();

    return (
      <View className="flex-1">
        <ScrollView ref={ref} className="flex-1 space-y-4 p-4">
          {!messages.length && <WelcomeMessage />}
          {messages.length > 0
            ? messages.map((m, index) => (
                <React.Fragment key={m.id}>
                  {/* Handle tool invocations from messages (existing behavior) */}
                  {m.toolInvocations?.map((t) => {
                    if (t.toolName === "getWeather") {
                      if (!t.result) {
                        return (
                          <View
                            key={t.toolCallId}
                            className={cn(
                              "mt-4 max-w-[85%] rounded-2xl bg-muted/50 p-4",
                            )}
                          >
                            <ActivityIndicator size="small" color="black" />
                            <Text>Getting weather data...</Text>
                          </View>
                        );
                      }
                      if (t.result) {
                        return (
                          <WeatherCard
                            key={t.toolCallId}
                            city={t.result.city || "Unknown"}
                            temperature={t.result.current.temperature_2m}
                            weatherCode={t.result.current.weathercode}
                            humidity={t.result.current.relative_humidity_2m}
                            wind={t.result.current.wind_speed_10m}
                          />
                        );
                      }
                    }
                    return null;
                  })}

                  {/* Handle tool calls from streaming state (new Apple Intelligence behavior) */}
                  {streaming.isStreaming && streaming.currentMessageId === m.id && streaming.toolCalls?.map((toolCall: ToolCall) => {
                    if (toolCall.toolName === "getWeather") {
                      if (!toolCall.result) {
                        return (
                          <View
                            key={toolCall.toolCallId}
                            className={cn(
                              "mt-4 max-w-[85%] rounded-2xl bg-muted/50 p-4",
                            )}
                          >
                            <ActivityIndicator size="small" color="black" />
                            <Text>Getting weather data...</Text>
                          </View>
                        );
                      }
                      if (toolCall.result) {
                        return (
                          <WeatherCard
                            key={toolCall.toolCallId}
                            city={toolCall.result.city || "Unknown"}
                            temperature={toolCall.result.current.temperature_2m}
                            weatherCode={toolCall.result.current.weathercode}
                            humidity={toolCall.result.current.relative_humidity_2m}
                            wind={toolCall.result.current.wind_speed_10m}
                          />
                        );
                      }
                    }
                    return null;
                  })}

                  <View
                    className={`flex-row px-4 ${m.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[95%] pl-0"} rounded-3xl ${m.role === "user" ? "bg-muted/50" : ""} `}
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
                  {(isLoading || streaming.isStreaming) &&
                    messages[messages.length - 1].role === "user" &&
                    m === messages[messages.length - 1] && (
                      <View className="flex-row">
                        <View
                          className={
                            "mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-gray-200"
                          }
                        >
                          <Text className="text-lg">{"🤖"}</Text>
                        </View>
                        <View className="-ml-2 -mt-[1px]">
                          <LottieLoader width={40} height={40} />
                        </View>
                      </View>
                    )}
                  {streaming.error && (
                    <View className="flex-row px-4 max-w-[95%] pl-0 rounded-3xl">
                      <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-red-200">
                        <Text className="text-lg">⚠️</Text>
                      </View>
                      <View className="flex-1 py-2">
                        <Text className="text-red-600">Error: {streaming.error}</Text>
                      </View>
                    </View>
                  )}
                </React.Fragment>
              ))
            : null}
        </ScrollView>
      </View>
    );
  },
);
