import { useState, useCallback, useRef } from 'react';
import { streamObject } from 'ai';
import { z } from 'zod';
import { getAvailableProvider, getModelConfig } from '../lib/ai-providers';

// Product schema matching the app expectations
export const ProductSchema = z.object({
  id: z.string().describe('Product ID'),
  name: z.string().describe('Product name'),
  description: z.string().describe('Product description'),
  price: z.number().describe('Product price in USD'),
  category: z.string().describe('Product category'),
  inStock: z.boolean().describe('Whether the product is in stock'),
  tags: z.array(z.string()).describe('List of product tags'),
});

export type Product = z.infer<typeof ProductSchema>;

export interface StructuredStreamingState<T = any> {
  isStreaming: boolean;
  partialObject: Partial<T> | null;
  finalObject: T | null;
  error: string | null;
  isLocal: boolean;
  modelName: string;
}

export interface StructuredStreamingOptions {
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
}

export function useAIStructuredStreaming<T = Product>(schema = ProductSchema) {
  const [state, setState] = useState<StructuredStreamingState<T>>({
    isStreaming: false,
    partialObject: null,
    finalObject: null,
    error: null,
    isLocal: false,
    modelName: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (options: StructuredStreamingOptions) => {
    try {
      // Reset state
      setState({
        isStreaming: true,
        partialObject: null,
        finalObject: null,
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

      // Start structured streaming with explicit typing
      const result = await streamObject({
        model: provider,
        prompt: options.prompt,
        schema: schema as any,
        maxOutputTokens: options.maxOutputTokens || modelConfig.maxOutputTokens,
        temperature: options.temperature || modelConfig.temperature,
        topP: options.topP || modelConfig.topP,
        abortSignal: abortControllerRef.current.signal,
      });

      // Process partial objects
      for await (const partialObject of result.partialObjectStream) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        setState(prev => ({
          ...prev,
          partialObject: partialObject as Partial<T>,
        }));
      }

      // Get final object
      const finalObject = await result.object;
      setState(prev => ({
        ...prev,
        isStreaming: false,
        finalObject: finalObject as T,
      }));

    } catch (error) {
      console.error('Structured streaming error:', error);
      
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
  }, [schema]);

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
      partialObject: null,
      finalObject: null,
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

// Convenience hook for product streaming
export function useProductStreaming() {
  return useAIStructuredStreaming<Product>(ProductSchema);
}
