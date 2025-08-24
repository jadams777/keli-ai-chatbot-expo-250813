import { useState, useCallback, useRef } from 'react';
import { streamText, generateText } from 'ai';
import { getAvailableProvider, getModelConfig } from '../lib/ai-providers';
import { getSystemPrompt } from '../lib/system-prompt';
import { useStore, type ToolCall } from '../lib/globalStore';
import { getWeatherTool, serperTool } from '../lib/tools';

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
  const { streaming, setStreamingState, resetStreamingState } = useStore();
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
      // Reset state
      setState({
        isStreaming: true,
        text: '',
        content: '',
        error: null,
        isLocal: false,
        modelName: '',
        toolCalls: [],
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

      // Check if this is Apple Intelligence (which handles tools differently)
      if (isLocal && modelName === 'apple-intelligence') {
        console.log('[USEAISTREAMING DEBUG] Using Apple Intelligence provider');
        console.log('[USEAISTREAMING DEBUG] Provider details:', {
          provider: !!provider,
          providerType: typeof provider,
          isLocal,
          modelName
        });
        
        // Use generateText for Apple Intelligence (tools are pre-registered in provider)
        const generateConfig = {
          model: provider,
          system: getSystemPrompt(),
          prompt: options.prompt,
          tools: {
            getWeather: getWeatherTool,
            search: serperTool
          },
          maxOutputTokens: options.maxOutputTokens || modelConfig.maxOutputTokens,
          temperature: options.temperature || modelConfig.temperature,
          topP: options.topP || modelConfig.topP,
          abortSignal: abortControllerRef.current.signal,
        };
        
        console.log('[USEAISTREAMING DEBUG] generateText config:', {
          hasModel: !!generateConfig.model,
          modelType: typeof generateConfig.model,
          systemPrompt: generateConfig.system?.substring(0, 100) + '...',
          prompt: generateConfig.prompt?.substring(0, 100) + '...',
          tools: {
            getWeather: !!generateConfig.tools.getWeather,
            search: !!generateConfig.tools.search,
            getWeatherToolStructure: generateConfig.tools.getWeather ? {
              description: generateConfig.tools.getWeather.description,
              parameters: generateConfig.tools.getWeather.inputSchema,
              execute: !!generateConfig.tools.getWeather.execute
            } : 'N/A',
            searchToolStructure: generateConfig.tools.search ? {
              description: generateConfig.tools.search.description,
              parameters: generateConfig.tools.search.inputSchema,
              execute: !!generateConfig.tools.search.execute
            } : 'N/A'
          },
          maxOutputTokens: generateConfig.maxOutputTokens,
          temperature: generateConfig.temperature,
          topP: generateConfig.topP
        });
        
        console.log('[USEAISTREAMING DEBUG] Calling generateText with Apple Intelligence...');
        try {
          const result = await generateText(generateConfig);
          console.log('[USEAISTREAMING DEBUG] generateText result:', {
            hasResult: !!result,
            resultType: typeof result,
            hasText: !!result?.text,
            textLength: result?.text?.length || 0,
            hasToolCalls: !!result?.toolCalls,
            toolCallsCount: result?.toolCalls?.length || 0,
            resultKeys: result ? Object.keys(result) : 'N/A'
          });
          
          // Handle tool calls if any
           if (result.toolCalls && result.toolCalls.length > 0) {
             console.log('[USEAISTREAMING DEBUG] Processing tool calls...');
           const toolCalls: ToolCall[] = result.toolCalls.map((toolCall: any) => ({
             toolCallId: toolCall.toolCallId,
             toolName: toolCall.toolName,
             args: toolCall.args,
           }));
           
           const cleanedText = String(result.text || '').replace(/^null/, '').replace(/The weather code is \d+\./, '').trim();

           setState(prev => ({
             ...prev,
             text: cleanedText,
             content: cleanedText,
             toolCalls,
             isStreaming: false,
           }));
           
           // Update global streaming state with tool calls
           setStreamingState({
             isStreaming: false,
             streamingText: cleanedText,
             toolCalls,
           });
         } else {
           console.log('[USEAISTREAMING DEBUG] No tool calls, processing text response');
           const cleanedText = String(result.text || '').replace(/^null/, '').replace(/The weather code is \d+\./, '').trim();

           setState(prev => ({
             ...prev,
             text: cleanedText,
             content: cleanedText,
             isStreaming: false,
           }));
           
           // Update global streaming state
           setStreamingState({
             isStreaming: false,
             streamingText: cleanedText,
           });
         }
        
        return;
        
        } catch (generateError) {
          console.log('[USEAISTREAMING DEBUG] generateText failed:', generateError.message);
          console.log('[USEAISTREAMING DEBUG] generateText error details:', generateError);
          console.log('[USEAISTREAMING DEBUG] generateText error stack:', generateError.stack);
          throw generateError; // Re-throw to be handled by outer catch
        }
      }

      // For non-Apple providers, use streamText (existing behavior)
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
      console.log('[USEAISTREAMING DEBUG] Main error handler triggered');
      console.log('[USEAISTREAMING DEBUG] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.log('[USEAISTREAMING DEBUG] Error message:', error instanceof Error ? error.message : String(error));
      console.log('[USEAISTREAMING DEBUG] Error details:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[USEAISTREAMING DEBUG] Stream was cancelled (AbortError)');
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
        console.log('[USEAISTREAMING DEBUG] Actual error occurred, updating state with error');
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
      toolCalls: [],
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