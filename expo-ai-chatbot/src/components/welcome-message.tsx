import { View, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";
import { MessageCircle } from "lucide-react-native";
import { useStore } from "@/lib/globalStore";
import { useEffect } from "react";

export const WelcomeMessage = () => {
  const { location, loadZipCode, hasZipCode } = useStore();
  
  useEffect(() => {
    loadZipCode();
  }, [loadZipCode]);
  return (
    <View className="max-w-xl rounded-xl p-6">
      <View className="mb-8 flex-row items-center justify-center">
        <Image
          source={require("@/assets/keli_ai_favicon.jpeg")}
          style={{ width: 50, height: 50 }}
          contentFit="contain"
        />
      </View>

      <View className="space-y-4">
        <Text className="text-center leading-7">
          👋 Hi, I'm Keli, your friendly AI assistant. How can I help you today?
        </Text>
        {!hasZipCode() && (
          <Text className="text-center leading-7 mt-4">
            If you provide your zip code, I'll personalize weather and local search.
          </Text>
        )}
      </View>
    </View>
  );
};
