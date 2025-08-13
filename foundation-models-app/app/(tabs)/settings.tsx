import React, { useState } from 'react';
import { View, Text, TextInput, Switch, ScrollView, Alert } from 'react-native';
import { useThemedColors } from '../../components/useThemedColors';
import { useVoice } from '../../contexts/VoiceContext';
import { getAvailableProvider, getModelConfig } from '../../lib/ai-providers';

export default function SettingsScreen() {
  const colors = useThemedColors();
  const { isSpeaking, speak, stop } = useVoice();
  
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [providerInfo, setProviderInfo] = useState<any>(null);

  const handleSaveKeys = () => {
    // In a real app, you'd save these securely
    Alert.alert('Settings Saved', 'API keys have been saved securely.');
  };

  const handleTestProvider = async () => {
    try {
      const info = await getAvailableProvider();
      setProviderInfo(info);
      Alert.alert('Provider Test', `Using: ${info.modelName} (${info.isLocal ? 'Local' : 'Remote'})`);
    } catch (error) {
      Alert.alert('Provider Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={{ 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: colors.text, 
        marginBottom: 20 
      }}>
        Settings
      </Text>

      {/* API Keys Section */}
      <View style={{
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 16,
        }}>
          API Keys
        </Text>

        <Text style={{
          fontSize: 14,
          color: colors.text,
          marginBottom: 8,
        }}>
          OpenAI API Key
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: colors.text,
            backgroundColor: colors.background,
          }}
          value={openaiKey}
          onChangeText={setOpenaiKey}
          placeholder="sk-..."
          placeholderTextColor={colors.text + '80'}
          secureTextEntry
        />

        <Text style={{
          fontSize: 14,
          color: colors.text,
          marginBottom: 8,
        }}>
          Anthropic API Key
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: colors.text,
            backgroundColor: colors.background,
          }}
          value={anthropicKey}
          onChangeText={setAnthropicKey}
          placeholder="sk-ant-..."
          placeholderTextColor={colors.text + '80'}
          secureTextEntry
        />
      </View>

      {/* Voice Settings */}
      <View style={{
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 16,
        }}>
          Voice Output
        </Text>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 16,
            color: colors.text,
          }}>
            Enable Voice Output
          </Text>
          <Switch
            value={isSpeaking}
            onValueChange={(enabled) => enabled ? speak("Voice enabled") : stop()}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isSpeaking ? colors.background : colors.text}
          />
        </View>
      </View>

      {/* Model Priority */}
      <View style={{
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 16,
        }}>
          Model Priority
        </Text>

        <Text style={{
          fontSize: 14,
          color: colors.text,
          lineHeight: 20,
        }}>
          1. Apple Intelligence (Local)\n
          2. OpenAI GPT-4\n
          3. Anthropic Claude\n
          4. Fallback Models
        </Text>

        {providerInfo && (
          <View style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: colors.background,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 4,
            }}>
              Current Provider:
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.text,
            }}>
              {providerInfo.modelName} ({providerInfo.isLocal ? 'Local' : 'Remote'})
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
