import { useState, useCallback, useRef } from 'react';
import { streamText, generateText, type CoreMessage } from 'ai';
import { getAvailableProvider, getModelConfig } from '../lib/ai-providers';
import { useStore, type ToolCall } from '../lib/globalStore';
import { getWeatherTool, webSearchTool, getLocationTool, getCalendarEventsTool, createCalendarEventTool, updateCalendarEventTool, deleteCalendarEventTool } from '../lib/tools';

// Helper to robustly clean the AI's text response
const cleanText = (text: string | null | undefined): string => {
  if (!text) return '';
  // Handles "null", "Null", and optional whitespace
  return text.trim().replace(/^(null|Null)\s*/, '');
};

export interface StreamingState {
  isStreaming: boolean;
  text: string;
  content: string;
  error: string | null;
  isLocal: boolean;
  modelName: string;
  toolCalls: ToolCall[];
}

export interface StreamingOptions {
  messages: CoreMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
}

export function useAIStreaming() {
  const { setStreamingState, resetStreamingState } = useStore();
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    text: '',
    content: '',
    error: null,
    isLocal: false,
    modelName: '',
    toolCalls: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (options: StreamingOptions) => {
    console.log('[useAIStreaming] startStreaming called with:', {
      messagesCount: options.messages.length,
      isCurrentlyStreaming: state.isStreaming
    });
    
    try {
      console.log('[useAIStreaming] Setting initial streaming state');
      setState({ isStreaming: true, text: '', content: '', error: null, isLocal: false, modelName: '', toolCalls: [] });
      setStreamingState({ isStreaming: true, streamingText: '', error: null });

      console.log('[useAIStreaming] Getting available provider');
      const { provider, isLocal, modelName } = await getAvailableProvider();
      const modelConfig = getModelConfig(modelName);

      setState(prev => ({ ...prev, isLocal, modelName }));

      console.log('[useAIStreaming] Creating new AbortController');
      abortControllerRef.current = new AbortController();

      if (isLocal && modelName === 'apple-intelligence') {
        const generateConfig = {
          model: provider,
          messages: options.messages,
          tools: { 
            getWeather: getWeatherTool, 
            search: webSearchTool, 
            getLocation: getLocationTool,
            getCalendarEvents: getCalendarEventsTool,
            createCalendarEvent: createCalendarEventTool,
            updateCalendarEvent: updateCalendarEventTool,
            deleteCalendarEvent: deleteCalendarEventTool
          },
          maxOutputTokens: options.maxOutputTokens || modelConfig.maxOutputTokens,
          temperature: options.temperature || modelConfig.temperature,
          topP: options.topP || modelConfig.topP,
          abortSignal: abortControllerRef.current.signal,
        };
        
        const result = await generateText(generateConfig);
        const cleanedText = cleanText(result.text);

        if (result.toolCalls && result.toolCalls.length > 0) {
          const toolCalls: ToolCall[] = result.toolCalls.map((toolCall: any) => ({
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            args: toolCall.args,
          }));
          setState(prev => ({ ...prev, text: cleanedText, content: cleanedText, toolCalls, isStreaming: false }));
          setStreamingState({ isStreaming: false, streamingText: cleanedText, toolCalls });
        } else {
          setState(prev => ({ ...prev, text: cleanedText, content: cleanedText, isStreaming: false }));
          setStreamingState({ isStreaming: false, streamingText: cleanedText });
        }
        
        return;
      }

      const streamConfig = {
        model: provider,
        messages: options.messages,
        maxOutputTokens: options.maxOutputTokens || modelConfig.maxOutputTokens,
        temperature: options.temperature || modelConfig.temperature,
        topP: options.topP || modelConfig.topP,
        abortSignal: abortControllerRef.current.signal,
      };
      
      const result = await streamText(streamConfig);

      let accumulatedText = '';
      for await (const textPart of result.textStream) {
        if (abortControllerRef.current?.signal.aborted) break;
        accumulatedText += textPart;
        // Clean the text on each streaming update
        const cleanedStreamingText = accumulatedText.replace(/^(null|Null)\s*/, '');
        setState(prev => ({ ...prev, text: cleanedStreamingText, content: cleanedStreamingText }));
        setStreamingState({ streamingText: cleanedStreamingText });
      }

      setState(prev => ({ ...prev, isStreaming: false }));
      setStreamingState({ isStreaming: false });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({ ...prev, isStreaming: false }));
        setStreamingState({ isStreaming: false });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setState(prev => ({ ...prev, isStreaming: false, error: errorMessage }));
        setStreamingState({ isStreaming: false, error: errorMessage });
      }
    }
  }, [setStreamingState]);

  const cancelStreaming = useCallback(() => {
    console.log('[useAIStreaming] cancelStreaming called');
    if (abortControllerRef.current) {
      console.log('[useAIStreaming] Aborting current request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    console.log('[useAIStreaming] Resetting streaming state');
    setState({ isStreaming: false, text: '', content: '', error: null, isLocal: false, modelName: '', toolCalls: [] });
    resetStreamingState();
  }, [resetStreamingState]);

  const reset = useCallback(() => {
    console.log('[useAIStreaming] reset called');
    console.log('[useAIStreaming] reset called from:', new Error().stack);
    cancelStreaming();
  }, [cancelStreaming, resetStreamingState]);

  return {
    ...state,
    startStreaming,
    cancelStreaming,
    reset,
  };
}
