import { createOpenAI } from '@ai-sdk/openai';

// Safely import Apple Intelligence with error handling
let appleProvider: any = null;
try {
  const { apple } = require('@react-native-ai/apple');
  appleProvider = apple;
} catch (error) {
  console.log('Apple Intelligence module not available:', error.message);
}

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
  'gpt-4o-mini': {
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },
  'claude-3-5-sonnet-20241022': {
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },
  'claude-3-5-haiku-20241022': {
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },
};

// Get model configuration
export function getModelConfig(modelName: string): ModelConfig {
  const config = MODEL_CONFIGS[modelName] || MODEL_CONFIGS['gpt-4o-mini'];
  return config;
}

// Get available provider with fallback logic
export async function getAvailableProvider(): Promise<ProviderInfo> {
  // Try Apple Intelligence first if available
  if (appleProvider) {
    try {
      const provider = appleProvider();
      return {
        provider: provider,
        isLocal: true,
        modelName: 'apple-intelligence',
      };
    } catch (error) {
      // Apple Intelligence initialization failed, continue to fallback
    }
  }

  // Fallback to OpenAI if API key is available
  if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
    try {
      const openaiProvider = createOpenAI({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      });
      return {
        provider: openaiProvider('gpt-4o-mini'),
        isLocal: false,
        modelName: 'gpt-4o-mini',
      };
    } catch (error) {
      // OpenAI provider initialization failed
    }
  }
      
  // If no providers are available, throw an error
  throw new Error('No AI providers available. Please configure at least one provider.');
}

// Get all available providers for selection
export function getAvailableProviders(): Array<{ name: string; modelName: string; isLocal: boolean }> {
  const providers = [];
  
  // Only include Apple Intelligence if the module is available
  if (appleProvider) {
    providers.push(
      { name: 'Apple Intelligence', modelName: 'apple-intelligence', isLocal: true }
    );
  }
  
  if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
    providers.push(
      { name: 'OpenAI GPT-4o', modelName: 'gpt-4o', isLocal: false },
      { name: 'OpenAI GPT-4o Mini', modelName: 'gpt-4o-mini', isLocal: false }
    );
  }
  
  return providers;
}

// Get specific provider by model name
export async function getProviderByModel(modelName: string): Promise<ProviderInfo> {
  const config = getModelConfig(modelName);
  
  if (modelName === 'apple-intelligence') {
    if (!appleProvider) {
      throw new Error('Apple Intelligence module not available');
    }
    
    try {
      const provider = appleProvider();
      return {
        provider: provider,
        isLocal: true,
        modelName,
      };
    } catch (error) {
      throw new Error('Apple Intelligence not available on this device: ' + error.message);
    }
  }
  
  if (modelName.startsWith('gpt-')) {
    if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    const openaiProvider = createOpenAI({
      apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    });
    
    return {
      provider: openaiProvider(modelName),
      isLocal: false,
      modelName,
    };
  }
   
  throw new Error(`Unsupported model: ${modelName}`);
}