import { useState, useCallback, useRef } from 'react';
import { streamText } from 'ai';
import { getAvailableProvider, getModelConfig } from '../lib/ai-providers';
import { getSystemPrompt } from '../lib/system-prompt';
import { useStore } from '../lib/globalStore';

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
  const { streaming, setStreamingState, resetStreamingState } = useStore();
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
      
      // Also reset global streaming state
      setStreamingState({
        isStreaming: true,
        streamingText: '',
        error: null,
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

      // Start text streaming with system prompt
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

      // Process text stream with error handling
      let accumulatedText = '';
      
      try {
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
          
          // Update global streaming state for UI
          setStreamingState({
            streamingText: accumulatedText,
          });
        }
      } catch (streamError) {
        // Handle streaming-specific errors
        if (streamError instanceof Error && streamError.message.includes('Unhandled chunk type')) {
          // Fallback: get the final text if available
          try {
            const finalText = await result.text;
            setState(prev => ({
              ...prev,
              text: finalText,
              content: finalText,
            }));
            
            // Update global streaming state
            setStreamingState({
              streamingText: finalText,
            });
          } catch (fallbackError) {
            throw streamError; // Re-throw original error if fallback fails
          }
        } else {
          throw streamError;
        }
      }

      // Mark as completed
      setState(prev => ({
        ...prev,
        isStreaming: false,
      }));
      
      // Update global streaming state
      setStreamingState({
        isStreaming: false,
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was cancelled
        setState(prev => ({
          ...prev,
          isStreaming: false,
        }));
        
        // Update global streaming state
        setStreamingState({
          isStreaming: false,
        });
      } else {
        // Actual error occurred
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }));
        
        // Update global streaming state
        setStreamingState({
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
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
    
    // Also reset global streaming state
    resetStreamingState();
  }, [cancelStreaming, resetStreamingState]);

  return {
    ...state,
    startStreaming,
    cancelStreaming,
    reset,
  };
}