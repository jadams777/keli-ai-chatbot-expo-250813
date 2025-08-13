import { Text } from "@/components/ThemedText";
import { useThemedColors } from "@/components/useThemedColors";
import { useVoice } from "@/contexts/VoiceContext";
import { useAIStreaming } from "@/hooks/useAIStreaming";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function BasicGenerationScreen() {
  const [prompt, setPrompt] = useState("");
  const colors = useThemedColors();
  const { speak, stop, isSpeaking } = useVoice();
  
  const {
    isStreaming,
    text,
    error,
    isLocal,
    modelName,
    startStreaming,
    cancelStreaming,
    reset,
  } = useAIStreaming();

  const generateText = async () => {
    if (!prompt.trim()) return;

    try {
      await startStreaming({
        prompt: prompt.trim(),
        maxOutputTokens: 1000,
        temperature: 0.7,
      });
    } catch (err) {
      console.error('Generation error:', err);
    }
  };

  const handleSpeak = () => {
    if (text && !isSpeaking) {
      speak(text);
    } else if (isSpeaking) {
      stop();
    }
  };

  const handleReset = () => {
    reset();
    setPrompt("");
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Basic Text Generation
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Generate text using AI models with streaming support
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter your prompt here..."
            placeholderTextColor={colors.textSecondary}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: isStreaming ? colors.destructive : colors.primary,
                opacity: !prompt.trim() && !isStreaming ? 0.5 : 1,
              },
            ]}
            onPress={isStreaming ? cancelStreaming : generateText}
            disabled={!prompt.trim() && !isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {isStreaming ? "Cancel" : "Generate"}
              </Text>
            )}
          </Pressable>

          {text && (
            <Pressable
              style={[
                styles.button,
                styles.secondaryButton,
                { borderColor: colors.border },
              ]}
              onPress={handleReset}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Reset
              </Text>
            </Pressable>
          )}
        </View>

        {(isLocal !== undefined || modelName) && (
          <View style={styles.modelInfo}>
            <Text style={[styles.modelText, { color: colors.textSecondary }]}>
              Model: {modelName} {isLocal ? "(Local)" : "(Cloud)"}
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.destructive + "20" }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              Error: {error}
            </Text>
          </View>
        )}

        {text && (
          <View style={styles.responseContainer}>
            <View style={styles.responseHeader}>
              <Text style={[styles.responseTitle, { color: colors.text }]}>
                Generated Text:
              </Text>
              
              {text && (
                <Pressable
                  style={[
                    styles.speakButton,
                    {
                      backgroundColor: isSpeaking ? colors.destructive : colors.primary,
                    },
                  ]}
                  onPress={handleSpeak}
                >
                  <Text style={styles.speakButtonText}>
                    {isSpeaking ? "Stop" : "Speak"}
                  </Text>
                </Pressable>
              )}
            </View>
            
            <View
              style={[
                styles.responseBox,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.responseText, { color: colors.text }]}>
                {text}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modelInfo: {
    marginBottom: 16,
    alignItems: "center",
  },
  modelText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  responseContainer: {
    marginTop: 20,
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  speakButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  speakButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  responseBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
