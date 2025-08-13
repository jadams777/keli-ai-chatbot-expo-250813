import { useState, useCallback, useRef } from 'react';
import { streamText } from 'ai';
import { getAvailableProvider, getModelConfig } from '../lib/ai-providers';

export interface StreamingState {
  isStreaming: boolean;
  text: string;
  content: string;
  error: string | null;
  isLocal: boolean;
  modelName: string;
}

export interface StreamingOptions {
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
}

export function useAIStreaming() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    text: '',
    content: '',
    error: null,
    isLocal: false,
    modelName: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (options: StreamingOptions) => {
    try {
      // Reset state
      setState({
        isStreaming: true,
        text: '',
        content: '',
        error: null,
        isLocal: false,
        modelName: '',
      });

      // Get available provider
      const { provider, isLocal, modelName } = await getAvailableProvider();
      const modelConfig = getModelConfig(modelName);

      // Update state with provider info
      setState(prev => ({
        ...prev,
        isLocal,
        modelName,
      }));

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Start text streaming
      const result = await streamText({
        model: provider,
        prompt: options.prompt,
        maxOutputTokens: options.maxOutputTokens || modelConfig.maxOutputTokens,
        temperature: options.temperature || modelConfig.temperature,
        topP: options.topP || modelConfig.topP,
        abortSignal: abortControllerRef.current.signal,
      });

      // Process text stream
      let accumulatedText = '';
      for await (const textPart of result.textStream) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        accumulatedText += textPart;
        setState(prev => ({
          ...prev,
          text: accumulatedText,
          content: accumulatedText,
        }));
      }

      // Mark as completed
      setState(prev => ({
        ...prev,
        isStreaming: false,
      }));

    } catch (error) {
      console.error('Streaming error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was cancelled
        setState(prev => ({
          ...prev,
          isStreaming: false,
        }));
      } else {
        // Actual error occurred
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }));
      }
    }
  }, []);

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancelStreaming();
    setState({
      isStreaming: false,
      text: '',
      content: '',
      error: null,
      isLocal: false,
      modelName: '',
    });
  }, [cancelStreaming]);

  return {
    ...state,
    startStreaming,
    cancelStreaming,
    reset,
  };
}
