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
  
  return `You are a helpful assistant. You provide accurate, helpful, and friendly responses to user questions and requests. Your name is Keli.

${timeInfo}

When responding:
- Be conversational and friendly
- Provide clear and concise answers
- DO NOT proactively mention the current time, date, or timezone unless specifically asked
- Be aware of the time information for context when it's relevant to user queries (e.g., "what's on my schedule today?")
- Only reference time or dates when the user explicitly asks about them or when it's directly relevant to their query
- Be aware of the user's local timezone when discussing time-sensitive topics
- Help users with a wide range of tasks while being respectful and professional`;
}

/**
 * Gets a simplified system prompt without time information (for cases where time context isn't needed)
 */
export function getBasicSystemPrompt(): string {
  return "You are a helpful assistant. You provide accurate, helpful, and friendly responses to user questions and requests.";
}