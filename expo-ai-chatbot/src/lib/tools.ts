import { z } from 'zod';
import { tool } from 'ai';
import { getWeatherData } from './weather-service';
import { getCurrentZipCode } from './location-service';

// Define the getWeather tool
export const getWeatherTool = tool({
  description: 'Get current weather information or a weather forecast for a specific city or zip code. Use this when users ask about weather conditions, temperature, or climate in any location. You can also specify the number of days for a forecast.',
  inputSchema: z.object({
    location: z.string().describe("The city or zip code for which to get the weather forecast."),
    forecast_days: z.number().default(3).optional(),
  }),
  execute: async ({ location, forecast_days }: { location: string, forecast_days?: number }) => {
    try {
      if (!location || typeof location !== 'string' || location.trim().length === 0) {
        throw new Error(`Invalid location parameter: ${JSON.stringify(location)}`);
      }
      const result = await getWeatherData(location.trim(), forecast_days);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        error.message = `Weather tool execution failed for location "${location}": ${error.message}`;
      }
      throw error;
    }
  }
});

// Define the serperTool
export const serperTool = tool({
  description: 'Use the Serper API to perform a web search. This is useful for finding information on the internet. Use this when users ask for information that is not related to weather.',
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }: { query: string }) => {
    const myHeaders = new Headers();
    myHeaders.append("X-API-KEY", process.env.EXPO_PUBLIC_SERPER_API_KEY);
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      "q": query
    });

    const requestOptions: RequestInit = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };

    try {
      const response = await fetch("https://google.serper.dev/search", requestOptions);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(error);
      return { error: error.message };
    };
  }
});

// Define the getLocation tool
export const getLocationTool = tool({
  description: 'Get the user\'s current zip code to provide location-specific information for queries about nearby places, such as restaurants or movie theaters.',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const zipCode = await getCurrentZipCode();
      return { zipCode };
    } catch (error) {
      return { error: error.message };
    }
  }
});


// Export all available tools
export const tools = {
  getWeather: getWeatherTool,
  search: serperTool,
  getLocation: getLocationTool,
};

// Export tool names for easy reference
export const toolNames = Object.keys(tools) as Array<keyof typeof tools>;
