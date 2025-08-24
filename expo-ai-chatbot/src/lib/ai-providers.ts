import { createOpenAI } from '@ai-sdk/openai';
import { getWeatherTool, serperTool } from './tools';

// Safely import Apple Intelligence with error handling
let appleProvider: any = null;
let createAppleProvider: any = null;
try {
  console.log('[AI-PROVIDERS DEBUG] Attempting to import Apple Intelligence module...');
  const appleModule = require('@react-native-ai/apple');
  appleProvider = appleModule.apple;
  createAppleProvider = appleModule.createAppleProvider;
  console.log('[AI-PROVIDERS DEBUG] Apple Intelligence module imported successfully:', {
    hasAppleProvider: !!appleProvider,
    hasCreateAppleProvider: !!createAppleProvider,
    moduleKeys: Object.keys(appleModule)
  });
} catch (error) {
  console.log('[AI-PROVIDERS DEBUG] Apple Intelligence module not available:', error.message);
  console.log('[AI-PROVIDERS DEBUG] Error details:', error);
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
  console.log('[AI-PROVIDERS DEBUG] getAvailableProvider called');
  console.log('[AI-PROVIDERS DEBUG] createAppleProvider available:', !!createAppleProvider);
  
  // Try Apple Intelligence first if available
  if (createAppleProvider) {
    try {
      console.log('[AI-PROVIDERS DEBUG] Attempting to create Apple provider...');
      console.log('[AI-PROVIDERS DEBUG] getWeatherTool details:', {
        toolExists: !!getWeatherTool,
        toolType: typeof getWeatherTool,
        toolKeys: getWeatherTool ? Object.keys(getWeatherTool) : 'N/A'
      });
      
      // Create Apple provider with pre-registered tools
      const apple = createAppleProvider({
        availableTools: {
          getWeather: getWeatherTool,
          search: serperTool
        }
      });
      console.log('[AI-PROVIDERS DEBUG] Apple provider created successfully:', {
        appleFunction: !!apple,
        appleType: typeof apple
      });
      
      const provider = apple();
      console.log('[AI-PROVIDERS DEBUG] Apple provider instance created:', {
        provider: !!provider,
        providerType: typeof provider,
        providerKeys: provider ? Object.keys(provider) : 'N/A'
      });
      
      return {
        provider: provider,
        isLocal: true,
        modelName: 'apple-intelligence',
      };
    } catch (error) {
      console.log('[AI-PROVIDERS DEBUG] Apple Intelligence initialization failed:', error.message);
      console.log('[AI-PROVIDERS DEBUG] Apple error details:', error);
      console.log('[AI-PROVIDERS DEBUG] Apple error stack:', error.stack);
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
  if (createAppleProvider) {
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
  console.log('[AI-PROVIDERS DEBUG] getProviderByModel called with:', modelName);
  const config = getModelConfig(modelName);
  console.log('[AI-PROVIDERS DEBUG] Model config:', config);
  
  if (modelName === 'apple-intelligence') {
    console.log('[AI-PROVIDERS DEBUG] Requesting Apple Intelligence provider');
    if (!createAppleProvider) {
      console.log('[AI-PROVIDERS DEBUG] Apple Intelligence module not available');
      throw new Error('Apple Intelligence module not available');
    }
    
    try {
      console.log('[AI-PROVIDERS DEBUG] Creating Apple provider for specific model...');
      console.log('[AI-PROVIDERS DEBUG] Tool registration for Apple Intelligence:', {
        getWeatherTool: !!getWeatherTool,
        toolStructure: getWeatherTool ? {
          description: getWeatherTool.description,
          parameters: getWeatherTool.inputSchema,
          execute: !!getWeatherTool.execute
        } : 'N/A'
      });
      
      // Create Apple provider with pre-registered tools
      const apple = createAppleProvider({
        availableTools: {
          getWeather: getWeatherTool,
          search: serperTool
        }
      });
      console.log('[AI-PROVIDERS DEBUG] Apple provider function created for model');
      
      const provider = apple();
      console.log('[AI-PROVIDERS DEBUG] Apple provider instance created for model:', {
        success: !!provider,
        type: typeof provider
      });
      
      return {
        provider: provider,
        isLocal: true,
        modelName,
      };
    } catch (error) {
      console.log('[AI-PROVIDERS DEBUG] Apple Intelligence model creation failed:', error.message);
      console.log('[AI-PROVIDERS DEBUG] Apple model error details:', error);
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