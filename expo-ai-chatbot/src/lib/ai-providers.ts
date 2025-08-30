import { getWeatherTool, webSearchTool, getLocationTool, getCalendarEventsTool, createCalendarEventTool, updateCalendarEventTool, deleteCalendarEventTool } from './tools';

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
};

export function getModelConfig(modelName: string): ModelConfig {
  return MODEL_CONFIGS[modelName] || MODEL_CONFIGS['apple-intelligence'];
}

export async function getAvailableProvider(): Promise<ProviderInfo> {
  if (createAppleProvider) {
    try {
      const apple = createAppleProvider({
        availableTools: {
          getWeather: getWeatherTool,
          search: webSearchTool,
          getLocation: getLocationTool,
          getCalendarEvents: getCalendarEventsTool,
          createCalendarEvent: createCalendarEventTool,
          updateCalendarEvent: updateCalendarEventTool,
          deleteCalendarEvent: deleteCalendarEventTool,
        }
      });
      const provider = apple();
      return { provider, isLocal: true, modelName: 'apple-intelligence' };
    } catch (error) {
      throw new Error('Apple Intelligence not available on this device: ' + error.message);
    }
  }
      
  throw new Error('Apple Intelligence module not available. Please ensure you are running on a compatible iOS device.');
}

export function getAvailableProviders(): Array<{ name: string; modelName: string; isLocal: boolean }> {
  const providers = [];
  if (createAppleProvider) {
    providers.push({ name: 'Apple Intelligence', modelName: 'apple-intelligence', isLocal: true });
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
          search: webSearchTool,
          getLocation: getLocationTool,
          getCalendarEvents: getCalendarEventsTool,
          createCalendarEvent: createCalendarEventTool,
          updateCalendarEvent: updateCalendarEventTool,
          deleteCalendarEvent: deleteCalendarEventTool,
        }
      });
      const provider = apple();
      return { provider, isLocal: true, modelName };
    } catch (error) {
      throw new Error('Apple Intelligence not available on this device: ' + error.message);
    }
  }
   
  throw new Error(`Unsupported model: ${modelName}. Only 'apple-intelligence' is supported.`);
}
