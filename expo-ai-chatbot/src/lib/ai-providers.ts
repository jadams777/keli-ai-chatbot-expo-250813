import { createOpenAI } from '@ai-sdk/openai';
import { getWeatherTool, serperTool, getLocationTool } from './tools';

let appleProvider: any = null;
let createAppleProvider: any = null;
try {
  const appleModule = require('@react-native-ai/apple');
  appleProvider = appleModule.apple;
  createAppleProvider = appleModule.createAppleProvider;
} catch (error) {
  // Apple Intelligence module not available
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

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'apple-intelligence': { maxOutputTokens: 4096, temperature: 0.7, topP: 0.9 },
  'gpt-4o': { maxOutputTokens: 4096, temperature: 0.7, topP: 0.9 },
  'gpt-4o-mini': { maxOutputTokens: 4096, temperature: 0.7, topP: 0.9 },
  'claude-3-5-sonnet-20241022': { maxOutputTokens: 4096, temperature: 0.7, topP: 0.9 },
  'claude-3-5-haiku-20241022': { maxOutputTokens: 4096, temperature: 0.7, topP: 0.9 },
};

export function getModelConfig(modelName: string): ModelConfig {
  return MODEL_CONFIGS[modelName] || MODEL_CONFIGS['gpt-4o-mini'];
}

export async function getAvailableProvider(): Promise<ProviderInfo> {
  if (createAppleProvider) {
    try {
      const apple = createAppleProvider({
        availableTools: {
          getWeather: getWeatherTool,
          search: serperTool,
          getLocation: getLocationTool,
        }
      });
      const provider = apple();
      return { provider, isLocal: true, modelName: 'apple-intelligence' };
    } catch (error) {
      // Fallback on error
    }
  }

  if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
    try {
      const openaiProvider = createOpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY });
      return { provider: openaiProvider('gpt-4o-mini'), isLocal: false, modelName: 'gpt-4o-mini' };
    } catch (error) {
      // Fallback on error
    }
  }
      
  throw new Error('No AI providers available. Please configure at least one provider.');
}

export function getAvailableProviders(): Array<{ name: string; modelName: string; isLocal: boolean }> {
  const providers = [];
  if (createAppleProvider) {
    providers.push({ name: 'Apple Intelligence', modelName: 'apple-intelligence', isLocal: true });
  }
  if (process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
    providers.push(
      { name: 'OpenAI GPT-4o', modelName: 'gpt-4o', isLocal: false },
      { name: 'OpenAI GPT-4o Mini', modelName: 'gpt-4o-mini', isLocal: false }
    );
  }
  return providers;
}

export async function getProviderByModel(modelName: string): Promise<ProviderInfo> {
  if (modelName === 'apple-intelligence') {
    if (!createAppleProvider) {
      throw new Error('Apple Intelligence module not available');
    }
    try {
      const apple = createAppleProvider({
        availableTools: {
          getWeather: getWeatherTool,
          search: serperTool,
          getLocation: getLocationTool,
        }
      });
      const provider = apple();
      return { provider, isLocal: true, modelName };
    } catch (error) {
      throw new Error('Apple Intelligence not available on this device: ' + error.message);
    }
  }
  
  if (modelName.startsWith('gpt-')) {
    if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    const openaiProvider = createOpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY });
    return { provider: openaiProvider(modelName), isLocal: false, modelName };
  }
   
  throw new Error(`Unsupported model: ${modelName}`);
}
