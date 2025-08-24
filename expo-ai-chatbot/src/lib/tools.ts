import { z } from 'zod';
import { tool } from 'ai';
import { getWeatherData } from './weather-service';

// Schema for the getWeather tool - simplified for Apple Intelligence compatibility
const getWeatherSchema = z.object({
  city: z.string()
});

// Debug logging for schema creation
console.log('[TOOLS DEBUG] Creating getWeatherSchema:', {
  schema: getWeatherSchema,
  schemaType: typeof getWeatherSchema,
  schemaShape: getWeatherSchema.shape,
  cityFieldType: getWeatherSchema.shape.city,
});

// Define the getWeather tool
export const getWeatherTool = tool({
  description: 'Get current weather information for a specific city. Use this when users ask about weather conditions, temperature, or climate in any location.',
  inputSchema: z.object({
    city: z.string(),
  }),
  execute: async ({ city }: { city: string }) => {
    console.log('[TOOLS DEBUG] getWeatherTool execute called with city:', city);
    console.log('[TOOLS DEBUG] Execute function input validation:', {
      cityType: typeof city,
      cityValue: city,
      cityLength: city?.length || 0,
      isString: typeof city === 'string',
      isValidString: typeof city === 'string' && city.length > 0
    });
    
    try {
      // Validate input parameters
      if (!city || typeof city !== 'string' || city.trim().length === 0) {
        const validationError = new Error(`Invalid city parameter: ${JSON.stringify(city)}`);
        console.log('[TOOLS DEBUG] Input validation failed:', validationError.message);
        throw validationError;
      }
      
      console.log('[TOOLS DEBUG] Calling getWeatherData with validated city:', city.trim());
      const result = await getWeatherData(city.trim());
      console.log('[TOOLS DEBUG] getWeatherTool execute success:', {
        hasResult: !!result,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : 'N/A',
        result: result
      });
      return result;
    } catch (error) {
      console.log('[TOOLS DEBUG] getWeatherTool execute failed:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'N/A',
        city: city
      });
      
      // Re-throw with more context
      if (error instanceof Error) {
        error.message = `Weather tool execution failed for city "${city}": ${error.message}`;
      }
      throw error;
    }
  }
});

// Debug logging for tool creation
console.log('[TOOLS DEBUG] Created getWeatherTool:', {
  tool: getWeatherTool,
  toolType: typeof getWeatherTool,
  description: getWeatherTool.description,
  parameters: getWeatherTool.inputSchema,
  hasExecute: typeof getWeatherTool.execute === 'function'
});

// Export all available tools
export const tools = {
  getWeather: getWeatherTool
};

// Export tool names for easy reference
export const toolNames = Object.keys(tools) as Array<keyof typeof tools>;