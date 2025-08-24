import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { LottieLoader } from '@/components/lottie-loader';
import { type ToolCall } from '@/lib/globalStore';
import { cn } from '@/lib/utils';

interface ToolCallIndicatorProps {
  toolCalls: ToolCall[];
}

// A map of tool names to user-friendly display names.
const toolDisplayNames: Record<string, string> = {
  getWeather: 'Checking Weather',
  getLocation: 'Getting Location',
  search: 'Searching Web',
};

export function ToolCallIndicator({ toolCalls }: ToolCallIndicatorProps) {
  // Filter for tool calls that are currently in progress (i.e., no result yet).
  const inProgressCalls = toolCalls.filter(call => !call.result);

  if (inProgressCalls.length === 0) {
    return null;
  }

  return (
    <View className="-mt-2 mb-4 flex-row">
      <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-gray-200">
        <Text className="text-lg">🤖</Text>
      </View>
      <View className={cn(
        "-ml-2 -mt-[1px] max-w-[85%] flex-row items-center rounded-2xl bg-muted/50 p-2",
      )}>
        <LottieLoader width={30} height={30} />
        <View className="ml-1">
          {inProgressCalls.map((call, index) => (
            <Text key={`${call.toolCallId}-${index}`} className="text-muted-foreground">
              {toolDisplayNames[call.toolName] || `Running: ${call.toolName}`}...
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}
