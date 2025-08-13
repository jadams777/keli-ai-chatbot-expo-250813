import { apple } from '@react-native-ai/apple';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

export interface ModelConfig {
  maxOutputTokens: number;
  temperature: number;
  topP: number;
}

export interface ProviderInfo {
  provider: any;
  isLocal: boolean;
  modelName: string;
}

// Model configurations
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'apple-intelligence': {
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },
  'gpt-4o': {
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },
  'claude-3-5-sonnet-20241022': {
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },
};

// Get model configuration
export function getModelConfig(modelName: string): ModelConfig {
  return MODEL_CONFIGS[modelName] || MODEL_CONFIGS['apple-intelligence'];
}

// Get available provider with fallback logic
export async function getAvailableProvider(): Promise<ProviderInfo> {
  try {
    // Try Apple Intelligence first (local)
    const appleProvider = apple();
    return {
      provider: appleProvider,
      isLocal: true,
      modelName: 'apple-intelligence',
    };
  } catch (error) {
    console.log('Apple Intelligence not available, falling back to cloud providers');
    
    // Fallback to OpenAI if API key is available
    if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      const openaiProvider = createOpenAI({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      });
      return {
        provider: openaiProvider('gpt-4o'),
        isLocal: false,
        modelName: 'gpt-4o',
      };
    }
    
    // Fallback to Anthropic if API key is available
    if (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY) {
      const anthropicProvider = createAnthropic({
        apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
      });
      return {
        provider: anthropicProvider('claude-3-5-sonnet-20241022'),
        isLocal: false,
        modelName: 'claude-3-5-sonnet-20241022',
      };
    }
    
    // If no providers are available, throw an error
    throw new Error('No AI providers available. Please configure API keys or enable Apple Intelligence.');
  }
}
