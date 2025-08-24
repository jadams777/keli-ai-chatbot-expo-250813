import { useState, useCallback, useRef } from 'react';
import { streamText, generateText } from 'ai';
import { getAvailableProvider, getModelConfig } from '../lib/ai-providers';
import { getSystemPrompt } from '../lib/system-prompt';
import { useStore, type ToolCall } from '../lib/globalStore';
import { getWeatherTool, serperTool, getLocationTool } from '../lib/tools';

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
  prompt: string;
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
    try {
      setState({ isStreaming: true, text: '', content: '', error: null, isLocal: false, modelName: '', toolCalls: [] });
      setStreamingState({ isStreaming: true, streamingText: '', error: null });

      const { provider, isLocal, modelName } = await getAvailableProvider();
      const modelConfig = getModelConfig(modelName);

      setState(prev => ({ ...prev, isLocal, modelName }));

      abortControllerRef.current = new AbortController();

      if (isLocal && modelName === 'apple-intelligence') {
        const generateConfig = {
          model: provider,
          system: getSystemPrompt(),
          prompt: options.prompt,
          tools: { getWeather: getWeatherTool, search: serperTool, getLocation: getLocationTool },
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
        system: getSystemPrompt(),
        prompt: options.prompt,
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancelStreaming();
    setState({ isStreaming: false, text: '', content: '', error: null, isLocal: false, modelName: '', toolCalls: [] });
    resetStreamingState();
  }, [cancelStreaming, resetStreamingState]);

  return {
    ...state,
    startStreaming,
    cancelStreaming,
    reset,
  };
}
