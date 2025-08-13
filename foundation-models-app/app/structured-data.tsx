import { Text } from "@/components/ThemedText";
import { useThemedColors } from "@/components/useThemedColors";
import { useVoice } from "@/contexts/VoiceContext";
import { useProductStreaming } from "@/hooks/useAIStructuredStreaming";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function StructuredDataScreen() {
  const [prompt, setPrompt] = useState(
    "Generate a product for a tech gadget store"
  );
  const colors = useThemedColors();
  const { speak, stop, isSpeaking } = useVoice();
  
  const {
    isStreaming,
    finalObject: product,
    partialObject,
    error,
    isLocal,
    modelName,
    startStreaming,
    cancelStreaming,
    reset,
  } = useProductStreaming();

  const generateProduct = async () => {
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
    if (product && !isSpeaking) {
      const text = `Product: ${product.name}. Description: ${product.description}. Price: $${product.price}. Category: ${product.category}. ${product.inStock ? 'In stock' : 'Out of stock'}.`;
      speak(text);
    } else if (isSpeaking) {
      stop();
    }
  };

  const handleReset = () => {
    reset();
    setPrompt("Generate a product for a tech gadget store");
  };

  const displayData = product || partialObject;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Structured Data Generation
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Generate structured product data with real-time streaming
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
            placeholder="Enter your product prompt..."
            placeholderTextColor={colors.textSecondary}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={3}
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
            onPress={isStreaming ? cancelStreaming : generateProduct}
            disabled={!prompt.trim() && !isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {isStreaming ? "Cancel" : "Generate Product"}
              </Text>
            )}
          </Pressable>

          {product && (
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

        {displayData && (
          <View style={styles.productContainer}>
            <View style={styles.productHeader}>
              <Text style={[styles.productTitle, { color: colors.text }]}>
                {isStreaming ? "Generating Product..." : "Generated Product:"}
              </Text>
              
              {product && (
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
                styles.productCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.productField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Name:
                </Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {displayData.name || "..."}
                </Text>
              </View>

              <View style={styles.productField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Description:
                </Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {displayData.description || "..."}
                </Text>
              </View>

              <View style={styles.productRow}>
                <View style={styles.productField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Price:
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {displayData.price ? `$${displayData.price}` : "..."}
                  </Text>
                </View>

                <View style={styles.productField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Category:
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {displayData.category || "..."}
                  </Text>
                </View>
              </View>

              <View style={styles.productRow}>
                <View style={styles.productField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Stock Status:
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {displayData.inStock !== undefined 
                      ? (displayData.inStock ? "In Stock" : "Out of Stock")
                      : "..."
                    }
                  </Text>
                </View>

                <View style={styles.productField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    ID:
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {displayData.id || "..."}
                  </Text>
                </View>
              </View>

              {displayData.tags && displayData.tags.length > 0 && (
                <View style={styles.productField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Tags:
                  </Text>
                  <View style={styles.tagsContainer}>
                    {displayData.tags.map((tag: string, index: number) => (
                      <View
                        key={index}
                        style={[
                          styles.tag,
                          { backgroundColor: colors.primary + "20", borderColor: colors.primary },
                        ]}
                      >
                        <Text style={[styles.tagText, { color: colors.primary }]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
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
    minHeight: 100,
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
  productContainer: {
    marginTop: 20,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  productTitle: {
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
  productCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
  },
  productField: {
    marginBottom: 16,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
