# AI SDK v5 Implementation Examples

This document provides practical implementation examples for common AI use cases after migrating to AI SDK v5 with Apple Foundation Models support.

## Table of Contents

1. [Basic Text Generation](#basic-text-generation)
2. [Streaming Chat Interface](#streaming-chat-interface)
3. [Structured Data Generation](#structured-data-generation)
4. [Provider Fallback Implementation](#provider-fallback-implementation)
5. [React Native Components](#react-native-components)
6. [Next.js API Integration](#nextjs-api-integration)
7. [Error Handling and Retry Logic](#error-handling-and-retry-logic)
8. [Performance Optimization](#performance-optimization)

## Basic Text Generation

### Simple Text Generation Hook

```typescript
// hooks/useTextGeneration.ts
import { useState, useCallback } from 'react';
import { generateText } from 'ai';
import { createAIProvider } from '@/lib/ai-providers';

export function useTextGeneration() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);

  const generate = useCallback(async (prompt: string, options: {
    maxTokens?: number;
    temperature?: number;
  } = {}) => {
    try {
      setLoading(true);
      setError(null);
      setResult('');

      const { provider, type } = await createAIProvider();

      if (type === 'apple' && provider) {
        const response = await generateText({
          model: provider,
          prompt,
          maxOutputTokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7
        });

        setResult(response.text);
        setUsage(response.usage);
      } else {
        // Cloud fallback
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            maxTokens: options.maxTokens || 500,
            temperature: options.temperature || 0.7
          })
        });

        const data = await response.json();
        setResult(data.text);
        setUsage(data.usage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, usage, generate };
}
```

### Usage Example

```typescript
// components/TextGenerator.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTextGeneration } from '@/hooks/useTextGeneration';

export function TextGenerator() {
  const [prompt, setPrompt] = useState('');
  const { result, loading, error, usage, generate } = useTextGeneration();

  const handleGenerate = () => {
    if (prompt.trim()) {
      generate(prompt, { maxTokens: 200 });
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          minHeight: 80
        }}
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Enter your prompt here..."
        multiline
      />
      
      <TouchableOpacity
        style={{
          backgroundColor: loading ? '#ccc' : '#007AFF',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16
        }}
        onPress={handleGenerate}
        disabled={loading}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {loading ? 'Generating...' : 'Generate Text'}
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={{ color: 'red', marginBottom: 16 }}>
          Error: {error}
        </Text>
      )}

      {result && (
        <View style={{
          backgroundColor: '#f8f9fa',
          padding: 16,
          borderRadius: 8,
          marginBottom: 16
        }}>
          <Text style={{ fontSize: 16, lineHeight: 24 }}>{result}</Text>
          {usage && (
            <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Tokens: {usage.totalTokens} | Prompt: {usage.promptTokens} | Completion: {usage.completionTokens}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
```

## Streaming Chat Interface

### Advanced Streaming Hook with Message History

```typescript
// hooks/useStreamingChat.ts
import { useState, useCallback, useRef } from 'react';
import { streamText } from 'ai';
import { createAIProvider } from '@/lib/ai-providers';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);
    setCurrentResponse('');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const { provider, type } = await createAIProvider();
      
      // Build conversation history
      const conversationMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      if (type === 'apple' && provider) {
        const stream = await streamText({
          model: provider,
          messages: conversationMessages,
          maxOutputTokens: 1000,
          abortSignal: abortControllerRef.current.signal
        });

        let fullResponse = '';
        for await (const chunk of stream.textStream) {
          fullResponse += chunk;
          setCurrentResponse(fullResponse);
        }

        // Add assistant message to history
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
          tokens: (await stream.usage)?.totalTokens
        };

        setMessages(prev => [...prev, assistantMessage]);
        setCurrentResponse('');
      } else {
        // Cloud streaming fallback
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: conversationMessages,
            stream: true
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text-delta') {
                fullResponse += data.textDelta;
                setCurrentResponse(fullResponse);
              }
            }
          }
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setCurrentResponse('');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setCurrentResponse('');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, loading]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentResponse('');
    setError(null);
  }, []);

  return {
    messages,
    currentResponse,
    loading,
    error,
    sendMessage,
    cancelGeneration,
    clearChat
  };
}
```

### Chat Interface Component

```typescript
// components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useStreamingChat } from '@/hooks/useStreamingChat';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    messages,
    currentResponse,
    loading,
    error,
    sendMessage,
    cancelGeneration,
    clearChat
  } = useStreamingChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, currentResponse]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  const renderMessage = (message: any, index: number) => (
    <View
      key={message.id || index}
      style={{
        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
        backgroundColor: message.role === 'user' ? '#007AFF' : '#f0f0f0',
        padding: 12,
        borderRadius: 16,
        marginVertical: 4,
        maxWidth: '80%'
      }}
    >
      <Text style={{
        color: message.role === 'user' ? 'white' : 'black',
        fontSize: 16
      }}>
        {message.content}
      </Text>
      {message.tokens && (
        <Text style={{
          color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#666',
          fontSize: 12,
          marginTop: 4
        }}>
          {message.tokens} tokens
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, padding: 16 }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>AI Chat</Text>
          <TouchableOpacity
            onPress={clearChat}
            style={{
              backgroundColor: '#FF3B30',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6
            }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          
          {/* Current streaming response */}
          {currentResponse && (
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: '#f0f0f0',
              padding: 12,
              borderRadius: 16,
              marginVertical: 4,
              maxWidth: '80%'
            }}>
              <Text style={{ color: 'black', fontSize: 16 }}>
                {currentResponse}
              </Text>
              <View style={{
                width: 8,
                height: 8,
                backgroundColor: '#007AFF',
                borderRadius: 4,
                marginTop: 4,
                opacity: 0.7
              }} />
            </View>
          )}
        </ScrollView>

        {/* Error display */}
        {error && (
          <Text style={{
            color: 'red',
            fontSize: 14,
            marginVertical: 8,
            textAlign: 'center'
          }}>
            {error}
          </Text>
        )}

        {/* Input area */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0'
        }}>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginRight: 8,
              maxHeight: 100
            }}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            multiline
            editable={!loading}
          />
          
          {loading ? (
            <TouchableOpacity
              onPress={cancelGeneration}
              style={{
                backgroundColor: '#FF3B30',
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>⏹</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim()}
              style={{
                backgroundColor: input.trim() ? '#007AFF' : '#ccc',
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>↑</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
```

## Structured Data Generation

### Product Information Generator

```typescript
// hooks/useProductGenerator.ts
import { useState, useCallback } from 'react';
import { generateObject, streamObject } from 'ai';
import { z } from 'zod';
import { createAIProvider } from '@/lib/ai-providers';

// Enhanced product schema
const ProductSchema = z.object({
  name: z.string().describe('Product name'),
  price: z.number().positive().describe('Price in USD'),
  category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports', 'other']),
  description: z.string().min(50).describe('Detailed product description'),
  features: z.array(z.string()).min(3).max(10).describe('Key product features'),
  specifications: z.object({
    dimensions: z.string().optional(),
    weight: z.string().optional(),
    material: z.string().optional(),
    color: z.string().optional()
  }).optional(),
  inStock: z.boolean().describe('Whether the product is in stock'),
  rating: z.number().min(1).max(5).describe('Average customer rating'),
  tags: z.array(z.string()).max(5).describe('Product tags for search')
});

type Product = z.infer<typeof ProductSchema>;

export function useProductGenerator() {
  const [product, setProduct] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const generateProduct = useCallback(async (
    prompt: string,
    options: { streaming?: boolean } = {}
  ) => {
    try {
      setLoading(true);
      setError(null);
      setProduct(null);
      setIsStreaming(options.streaming || false);

      const { provider, type } = await createAIProvider();

      if (type === 'apple' && provider) {
        if (options.streaming) {
          // Streaming structured generation
          const stream = await streamObject({
            model: provider,
            schema: ProductSchema,
            prompt: `Generate a detailed product based on: ${prompt}`
          });

          for await (const partialProduct of stream.partialObjectStream) {
            setProduct(partialProduct);
          }

          const finalProduct = await stream.object;
          setProduct(finalProduct);
        } else {
          // Non-streaming structured generation
          const result = await generateObject({
            model: provider,
            schema: ProductSchema,
            prompt: `Generate a detailed product based on: ${prompt}`
          });

          setProduct(result.object);
        }
      } else {
        // Cloud fallback
        const response = await fetch('/api/ai/generate-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            streaming: options.streaming
          })
        });

        const data = await response.json();
        setProduct(data.product);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate product');
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }, []);

  return {
    product,
    loading,
    error,
    isStreaming,
    generateProduct
  };
}
```

### Product Display Component

```typescript
// components/ProductGenerator.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch
} from 'react-native';
import { useProductGenerator } from '@/hooks/useProductGenerator';

export function ProductGenerator() {
  const [prompt, setPrompt] = useState('');
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const { product, loading, error, isStreaming, generateProduct } = useProductGenerator();

  const handleGenerate = () => {
    if (prompt.trim()) {
      generateProduct(prompt, { streaming: streamingEnabled });
    }
  };

  const renderProductField = (label: string, value: any, isPartial = false) => {
    if (value === undefined || value === null) {
      return isPartial ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{label}:</Text>
          <View style={{
            height: 20,
            backgroundColor: '#f0f0f0',
            borderRadius: 4,
            opacity: 0.5
          }} />
        </View>
      ) : null;
    }

    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{label}:</Text>
        {Array.isArray(value) ? (
          <View>
            {value.map((item, index) => (
              <Text key={index} style={{ marginLeft: 8, marginBottom: 2 }}>• {item}</Text>
            ))}
          </View>
        ) : typeof value === 'object' ? (
          <View style={{ marginLeft: 8 }}>
            {Object.entries(value).map(([key, val]) => (
              val && <Text key={key} style={{ marginBottom: 2 }}>{key}: {String(val)}</Text>
            ))}
          </View>
        ) : (
          <Text style={{ color: '#333' }}>{String(value)}</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Product Generator
      </Text>

      {/* Input Section */}
      <View style={{ marginBottom: 20 }}>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            minHeight: 80
          }}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Describe the product you want to generate (e.g., 'wireless headphones for gaming')..."
          multiline
        />

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <Text>Enable Streaming:</Text>
          <Switch
            value={streamingEnabled}
            onValueChange={setStreamingEnabled}
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: loading ? '#ccc' : '#007AFF',
            padding: 12,
            borderRadius: 8
          }}
          onPress={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            {loading ? (isStreaming ? 'Generating...' : 'Processing...') : 'Generate Product'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error && (
        <Text style={{ color: 'red', marginBottom: 16, textAlign: 'center' }}>
          Error: {error}
        </Text>
      )}

      {/* Product Display */}
      {product && (
        <View style={{
          backgroundColor: '#f8f9fa',
          padding: 16,
          borderRadius: 8,
          borderWidth: isStreaming ? 2 : 1,
          borderColor: isStreaming ? '#007AFF' : '#e0e0e0'
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 16,
            color: isStreaming ? '#007AFF' : '#000'
          }}>
            Generated Product {isStreaming && '(Updating...)'}
          </Text>

          {renderProductField('Name', product.name, isStreaming)}
          {renderProductField('Price', product.price ? `$${product.price}` : undefined, isStreaming)}
          {renderProductField('Category', product.category, isStreaming)}
          {renderProductField('Description', product.description, isStreaming)}
          {renderProductField('Features', product.features, isStreaming)}
          {renderProductField('Specifications', product.specifications, isStreaming)}
          {renderProductField('In Stock', product.inStock ? 'Yes' : 'No', isStreaming)}
          {renderProductField('Rating', product.rating ? `${product.rating}/5 stars` : undefined, isStreaming)}
          {renderProductField('Tags', product.tags, isStreaming)}
        </View>
      )}
    </ScrollView>
  );
}
```

## Provider Fallback Implementation

### Smart Provider Selection

```typescript
// lib/smart-provider.ts
import { apple } from '@react-native-ai/apple';
import { openai } from '@ai-sdk/openai';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProviderMetrics {
  successRate: number;
  averageLatency: number;
  lastUsed: Date;
  errorCount: number;
  totalRequests: number;
}

class SmartProviderManager {
  private metrics: Map<string, ProviderMetrics> = new Map();
  private readonly METRICS_KEY = 'ai_provider_metrics';

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(this.METRICS_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = new Map(Object.entries(data).map(([key, value]: [string, any]) => [
          key,
          { ...value, lastUsed: new Date(value.lastUsed) }
        ]));
      }
    } catch (error) {
      console.warn('Failed to load provider metrics:', error);
    }
  }

  async selectProvider(options: {
    preferApple?: boolean;
    requiresStructured?: boolean;
    maxLatency?: number;
  } = {}) {
    const appleAvailable = await this.checkAppleAvailability();
    const appleMetrics = this.metrics.get('apple');
    const cloudMetrics = this.metrics.get('cloud');

    // If Apple Intelligence is preferred and available
    if (options.preferApple && appleAvailable) {
      // Check if Apple has good performance metrics
      if (!appleMetrics || appleMetrics.successRate > 0.8) {
        return {
          provider: apple(),
          type: 'apple' as const,
          name: 'Apple Intelligence'
        };
      }
    }

    // If structured output is required, prefer cloud for reliability
    if (options.requiresStructured && cloudMetrics?.successRate > 0.9) {
      return {
        provider: null, // Use API
        type: 'cloud' as const,
        name: 'Cloud AI'
      };
    }

    // Latency-based selection
    if (options.maxLatency) {
      if (appleAvailable && (!appleMetrics || appleMetrics.averageLatency < options.maxLatency)) {
        return {
          provider: apple(),
          type: 'apple' as const,
          name: 'Apple Intelligence'
        };
      }
    }

    // Default fallback logic
    if (appleAvailable) {
      return {
        provider: apple(),
        type: 'apple' as const,
        name: 'Apple Intelligence'
      };
    }

    return {
      provider: null,
      type: 'cloud' as const,
      name: 'Cloud AI'
    };
  }

  async recordMetrics(providerType: string, success: boolean, latency: number) {
    const current = this.metrics.get(providerType) || {
      successRate: 1,
      averageLatency: 0,
      lastUsed: new Date(),
      errorCount: 0,
      totalRequests: 0
    };

    current.totalRequests++;
    current.lastUsed = new Date();
    
    if (success) {
      current.successRate = (current.successRate * (current.totalRequests - 1) + 1) / current.totalRequests;
      current.averageLatency = (current.averageLatency * (current.totalRequests - 1) + latency) / current.totalRequests;
    } else {
      current.errorCount++;
      current.successRate = (current.successRate * (current.totalRequests - 1)) / current.totalRequests;
    }

    this.metrics.set(providerType, current);
    await this.saveMetrics();
  }

  private async checkAppleAvailability(): Promise<boolean> {
    try {
      // This would be implemented by @react-native-ai/apple
      const availability = await apple.checkAvailability();
      return availability.isAvailable;
    } catch {
      return false;
    }
  }

  private async saveMetrics() {
    try {
      const data = Object.fromEntries(this.metrics.entries());
      await AsyncStorage.setItem(this.METRICS_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save provider metrics:', error);
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics.entries());
  }
}

export const smartProviderManager = new SmartProviderManager();
```

## Next.js API Integration

### Enhanced API Routes

```typescript
// pages/api/ai/chat.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      messages,
      model = 'gpt-4',
      provider = 'openai',
      stream = true,
      maxTokens = 1000,
      temperature = 0.7
    }: {
      messages: ChatMessage[];
      model?: string;
      provider?: 'openai' | 'anthropic';
      stream?: boolean;
      maxTokens?: number;
      temperature?: number;
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Select provider
    const aiProvider = provider === 'anthropic' 
      ? anthropic(model.startsWith('claude') ? model : 'claude-3-sonnet-20240229')
      : openai(model);

    if (stream) {
      // Streaming response
      const result = await streamText({
        model: aiProvider,
        messages,
        maxOutputTokens: maxTokens,
        temperature
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      for await (const chunk of result.textStream) {
        res.write(`data: ${JSON.stringify({ 
          type: 'text-delta', 
          textDelta: chunk 
        })}\n\n`);
      }

      const usage = await result.usage;
      res.write(`data: ${JSON.stringify({ 
        type: 'finish', 
        usage 
      })}\n\n`);
      res.end();
    } else {
      // Non-streaming response
      const { generateText } = await import('ai');
      const result = await generateText({
        model: aiProvider,
        messages,
        maxOutputTokens: maxTokens,
        temperature
      });

      res.status(200).json({
        text: result.text,
        usage: result.usage,
        model: model,
        provider: provider
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

```typescript
// pages/api/ai/generate-product.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const ProductSchema = z.object({
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports', 'other']),
  description: z.string().min(50),
  features: z.array(z.string()).min(3).max(10),
  specifications: z.object({
    dimensions: z.string().optional(),
    weight: z.string().optional(),
    material: z.string().optional(),
    color: z.string().optional()
  }).optional(),
  inStock: z.boolean(),
  rating: z.number().min(1).max(5),
  tags: z.array(z.string()).max(5)
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, streaming = false, model = 'gpt-4' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const aiModel = openai(model);
    const fullPrompt = `Generate a detailed product based on: ${prompt}. Make sure all required fields are filled with realistic data.`;

    if (streaming) {
      const stream = await streamObject({
        model: aiModel,
        schema: ProductSchema,
        prompt: fullPrompt
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const partialObject of stream.partialObjectStream) {
        res.write(`data: ${JSON.stringify({ 
          type: 'partial-object', 
          object: partialObject 
        })}\n\n`);
      }

      const finalObject = await stream.object;
      res.write(`data: ${JSON.stringify({ 
        type: 'final-object', 
        object: finalObject 
      })}\n\n`);
      res.end();
    } else {
      const result = await generateObject({
        model: aiModel,
        schema: ProductSchema,
        prompt: fullPrompt
      });

      res.status(200).json({
        product: result.object,
        usage: result.usage
      });
    }
  } catch (error) {
    console.error('Product generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate product',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

## Error Handling and Retry Logic

### Robust Error Handling Hook

```typescript
// hooks/useRobustAI.ts
import { useState, useCallback } from 'react';
import { generateText, streamText } from 'ai';
import { smartProviderManager } from '@/lib/smart-provider';

interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number;
  fallbackToCloud?: boolean;
}

export function useRobustAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T | null> => {
    const {
      maxRetries = 3,
      backoffMs = 1000,
      fallbackToCloud = true
    } = options;

    setLoading(true);
    setError(null);
    setRetryCount(0);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        const startTime = Date.now();
        const result = await operation();
        const latency = Date.now() - startTime;
        
        // Record success metrics
        await smartProviderManager.recordMetrics('current', true, latency);
        
        setLoading(false);
        return result;
      } catch (err) {
        const latency = Date.now() - Date.now();
        await smartProviderManager.recordMetrics('current', false, latency);
        
        console.warn(`Attempt ${attempt + 1} failed:`, err);
        
        if (attempt === maxRetries) {
          // Final attempt failed
          if (fallbackToCloud && attempt === 0) {
            // Try cloud fallback
            try {
              const cloudResult = await this.tryCloudFallback(operation);
              setLoading(false);
              return cloudResult;
            } catch (cloudErr) {
              setError(`All attempts failed. Last error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          } else {
            setError(err instanceof Error ? err.message : 'Operation failed');
          }
          break;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, backoffMs * Math.pow(2, attempt))
        );
      }
    }
    
    setLoading(false);
    return null;
  }, []);

  const generateTextRobust = useCallback(async (
    prompt: string,
    options: RetryOptions & { maxTokens?: number; temperature?: number } = {}
  ) => {
    return executeWithRetry(async () => {
      const { provider } = await smartProviderManager.selectProvider();
      
      if (provider) {
        const result = await generateText({
          model: provider,
          prompt,
          maxOutputTokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7
        });
        return result.text;
      } else {
        // Cloud API fallback
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            maxTokens: options.maxTokens || 500,
            temperature: options.temperature || 0.7
          })
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.text;
      }
    }, options);
  }, [executeWithRetry]);

  return {
    loading,
    error,
    retryCount,
    generateTextRobust,
    executeWithRetry
  };
}
```

## Performance Optimization

### Caching and Optimization

```typescript
// lib/ai-cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

interface CacheEntry {
  result: any;
  timestamp: number;
  provider: string;
  ttl: number;
}

class AICache {
  private readonly CACHE_PREFIX = 'ai_cache_';
  private readonly DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

  private generateKey(prompt: string, options: any = {}): string {
    const data = JSON.stringify({ prompt, ...options });
    return createHash('md5').update(data).digest('hex');
  }

  async get(prompt: string, options: any = {}): Promise<any | null> {
    try {
      const key = this.generateKey(prompt, options);
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      
      if (!cached) return null;
      
      const entry: CacheEntry = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
        return null;
      }
      
      return entry.result;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  async set(
    prompt: string, 
    result: any, 
    provider: string, 
    options: any = {}, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const key = this.generateKey(prompt, options);
      const entry: CacheEntry = {
        result,
        timestamp: Date.now(),
        provider,
        ttl
      };
      
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`, 
        JSON.stringify(entry)
      );
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  async getStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return {
        count: cacheKeys.length,
        totalSize
      };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}

export const aiCache = new AICache();
```

### Optimized Generation Hook

```typescript
// hooks/useOptimizedAI.ts
import { useState, useCallback, useMemo } from 'react';
import { generateText } from 'ai';
import { smartProviderManager } from '@/lib/smart-provider';
import { aiCache } from '@/lib/ai-cache';
import { debounce } from 'lodash';

export function useOptimizedAI() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheHit, setCacheHit] = useState(false);

  // Debounced generation to avoid excessive API calls
  const debouncedGenerate = useMemo(
    () => debounce(async (prompt: string, options: any) => {
      await performGeneration(prompt, options);
    }, 500),
    []
  );

  const performGeneration = useCallback(async (
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      useCache?: boolean;
      cacheTime?: number;
    } = {}
  ) => {
    try {
      setLoading(true);
      setError(null);
      setCacheHit(false);

      // Check cache first
      if (options.useCache !== false) {
        const cached = await aiCache.get(prompt, options);
        if (cached) {
          setResult(cached);
          setCacheHit(true);
          setLoading(false);
          return;
        }
      }

      // Select optimal provider
      const { provider, type } = await smartProviderManager.selectProvider({
        maxLatency: 5000, // 5 second max for good UX
        preferApple: true
      });

      let text: string;
      
      if (provider) {
        // Use Apple Intelligence
        const result = await generateText({
          model: provider,
          prompt,
          maxOutputTokens
```

