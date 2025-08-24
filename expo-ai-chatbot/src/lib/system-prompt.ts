/**
 * System prompt configuration for the expo-ai-chatbot app
 * Provides helpful assistant behavior with local device time, date, and timezone awareness
 */

/**
 * Gets the current local device time information
 */
function getCurrentTimeInfo(): string {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timeZone
  });
  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: timeZone,
    timeZoneName: 'short'
  });
  
  return `Current local time: ${timeString} on ${dateString} (${timeZone})`;
}

/**
 * Generates the system prompt with current device time information
 * Following AI SDK system prompt guidelines from https://ai-sdk.dev/docs/foundations/prompts#system-prompts
 */
export function getSystemPrompt(): string {
  const timeInfo = getCurrentTimeInfo();
  
  return `You are Keli, a helpful assistant. You provide accurate, helpful, and friendly responses to user questions and requests.

${timeInfo}

When responding:
- Be conversational and friendly
- Provide clear and concise answers
- When users ask "What time is it?", "What's the time?", "Current time?", or similar time-related questions, provide the current time information
- DO NOT mention time information in unrelated conversations
- Always use the provided time information when users explicitly request the current time, date, or timezone
- Be aware of the time information for context when it's relevant to user queries (e.g., "what's on my schedule today?")
- Be aware of the user's local timezone when discussing time-sensitive topics
- When a user asks for a weather forecast, especially when they use words like 'tomorrow', 'next few days', or specify a number of days, make sure to use the 'getWeather' tool and set the 'forecast_days' parameter accordingly. If the user asks for 'tomorrow', set 'forecast_days' to 2. If they ask for a 'few days' or a 'couple of days', set it to 3.
- When a user asks for information about nearby places, such as "restaurants near me" or "movies nearby", use the 'getLocation' tool to get the user's zip code to provide accurate, location-specific results.
- If the user asks for a weather report, current temperature, or similar queries without specifying a location, first use the 'getLocation' tool to find their zip code. Then, use that zip code to call the 'getWeather' tool.
`;
}

/**
 * Gets a simplified system prompt without time information (for cases where time context isn't needed)
 */
export function getBasicSystemPrompt(): string {
  return "You are Keli, a helpful assistant. You provide accurate, helpful, and friendly responses to user questions and requests.";
}