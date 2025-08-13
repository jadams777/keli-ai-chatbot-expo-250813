# AI SDK v5 Migration Guide

## Overview

This guide provides step-by-step instructions for migrating your Expo iOS app from the custom `expo-foundation-models` implementation to Vercel AI SDK v5 with Apple Foundation Models support using the `@react-native-ai/apple` provider.

## Prerequisites

* iOS 18+ (iOS 26+ recommended for full Apple Intelligence support)

* React Native 0.79+ with New Architecture enabled

* Expo SDK 53+

* Apple Intelligence enabled device for testing

* Node.js 18+ for Next.js API server

## Migration Steps

### Step 1: Backup and Prepare

```bash
# Backup your current project
git add .
git commit -m "Backup before AI SDK v5 migration"
git branch backup-pre-migration

# Ensure you're on the main development branch
git checkout main
```

### Step 2: Update Dependencies

**Update package.json:**

```bash
# Install AI SDK v5 and Apple provider
pnpm add ai@5.0.0 @react-native-ai/apple zod@3.25.0

# Install additional AI SDK packages if needed
pnpm add @ai-sdk/react@2.0.0 @ai-sdk/openai@2.0.0

# Update peer dependencies
pnpm add react@19.0.0 react-dom@19.0.0
```

**Updated package.json dependencies:**

```json
{
  "dependencies": {
    "ai": "^5.0.0",
    "@react-native-ai/apple": "^1.0.0",
    "@ai-sdk/react": "^2.0.0",
    "@ai-sdk/openai": "^2.0.0",
    "zod": "^3.25.0",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  }
}
```

### Step 3: Run AI SDK v5 Codemods

```bash
# Run automatic migration codemods
npx @ai-sdk/codemod v5 ./app ./hooks ./components

# Or run specific codemods
npx @ai-sdk/codemod v5/rename-max-tokens ./hooks
npx @ai-sdk/codemod v5/rename-core-message ./app
```

### Step 4: Remove Custom Module

**Remove the custom expo-foundation-models module:**

```bash
# Remove the custom module directory
rm -rf ./modules/expo-foundation-models

# Update imports in your files (will be handled in next steps)
```

### Step 5: Create Provider Configuration

**Create** **`lib/ai-providers.ts`:**

```typescript
import { apple } from '@react-native-ai/apple';
import { openai } from '@ai-sdk/openai';
import { Platform } from 'react-native';

// Apple Intelligence availability check
export const checkAppleIntelligenceAvailability = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  
  try {
    // This will be provided by @react-native-ai/apple
    const { isAvailable } = await apple.checkAvailability();
    return isAvailable;
  } catch (error) {
    console.warn('Apple Intelligence check failed:', error);
    return false;
  }
};

// Provider factory
export const createAIProvider = async () => {
  const isAppleAvailable = await checkAppleIntelligenceAvailability();
  
  if (isAppleAvailable) {
    return {
      provider: apple(),
      type: 'apple' as const,
      name: 'Apple Intelligence'
    };
  }
  
  // Fallback to cloud provider via API
  return {
    provider: null, // Will use API calls
    type: 'cloud' as const,
    name: 'Cloud AI'
  };
};

// Cloud API client for fallback
export const cloudAIClient = {
  async generateText(prompt: string, options: any = {}) {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        ...options
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  async streamText(prompt: string, options: any = {}) {
    const response = await fetch('/api/ai/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        stream: true,
        ...options
      })
    });
    
    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.statusText}`);
    }
    
    return response.body;
  }
};
```

### Step 6: Migrate Custom Hooks

**Update** **`hooks/useFoundationModelsStreaming.ts`** **to** **`hooks/useAIStreaming.ts`:**

```typescript
import { useState, useCallback } from 'react';
import { streamText } from 'ai';
import { createAIProvider, cloudAIClient } from '@/lib/ai-providers';

export function useAIStreaming() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenCount, setTokenCount] = useState(0);

  const startStreaming = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Prompt cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setContent('');
      setTokenCount(0);

      const { provider, type } = await createAIProvider();

      if (type === 'apple' && provider) {
        // Use Apple Intelligence directly
        const stream = await streamText({
          model: provider,
          prompt,
          maxOutputTokens: 1000
        });

        for await (const chunk of stream.textStream) {
          setContent(prev => prev + chunk);
        }

        // Get final usage stats
        const usage = await stream.usage;
        setTokenCount(usage?.totalTokens || 0);
      } else {
        // Use cloud API fallback
        const streamResponse = await cloudAIClient.streamText(prompt);
        const reader = streamResponse?.getReader();
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta') {
                  setContent(prev => prev + data.textDelta);
                }
              }
            }
          }
        }
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start streaming');
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setTokenCount(0);
    setError(null);
  }, []);

  return {
    content,
    loading,
    error,
    tokenCount,
    startStreaming,
    reset
  };
}
```

**Update** **`hooks/useFoundationModelsStructuredStreaming.ts`** **to** **`hooks/useAIStructuredStreaming.ts`:**

```typescript
import { useState, useCallback } from 'react';
import { streamObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, cloudAIClient } from '@/lib/ai-providers';

// Define your schema
const ProductSchema = z.object({
  name: z.string().optional(),
  price: z.number().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  inStock: z.boolean().optional()
});

type Product = z.infer<typeof ProductSchema>;

export function useAIStructuredStreaming() {
  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPartial, setIsPartial] = useState(false);

  const startStreaming = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Prompt cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setData(null);
      setIsPartial(false);

      const { provider, type } = await createAIProvider();

      if (type === 'apple' && provider) {
        // Use Apple Intelligence with structured output
        const stream = await streamObject({
          model: provider,
          schema: ProductSchema,
          prompt
        });

        for await (const partialObject of stream.partialObjectStream) {
          setData(partialObject);
          setIsPartial(true);
        }

        // Get final object
        const finalObject = await stream.object;
        setData(finalObject);
        setIsPartial(false);
      } else {
        // Use cloud API fallback for structured output
        const response = await cloudAIClient.generateText(prompt, {
          schema: ProductSchema,
          structured: true
        });
        
        setData(response.object);
        setIsPartial(false);
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start structured streaming');
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setIsPartial(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    isPartial,
    startStreaming,
    reset
  };
}
```

### Step 7: Update App Components

**Update** **`app/streaming-chat.tsx`:**

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useAIStreaming } from '@/hooks/useAIStreaming';

export default function StreamingChatScreen() {
  const [prompt, setPrompt] = useState('');
  const { content, loading, error, tokenCount, startStreaming, reset } = useAIStreaming();

  const handleSubmit = async () => {
    if (prompt.trim()) {
      await startStreaming(prompt);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <ScrollView style={{ flex: 1, marginBottom: 20 }}>
        {error && (
          <Text style={{ color: 'red', marginBottom: 10 }}>
            Error: {error}
          </Text>
        )}
        
        {content && (
          <View style={{ backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10 }}>
            <Text>{content}</Text>
            {tokenCount > 0 && (
              <Text style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
                Tokens: {tokenCount}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 5,
            padding: 10,
            marginRight: 10
          }}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Enter your prompt..."
          multiline
        />
        
        <TouchableOpacity
          style={{
            backgroundColor: loading ? '#ccc' : '#007AFF',
            padding: 10,
            borderRadius: 5
          }}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={{ color: 'white' }}>
            {loading ? 'Generating...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={{
          backgroundColor: '#FF3B30',
          padding: 10,
          borderRadius: 5,
          marginTop: 10
        }}
        onPress={reset}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Step 8: Create Next.js API Server (Optional)

**Create** **`api-server/pages/api/ai/generate.ts`:**

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model = 'gpt-4', maxTokens = 1000 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await generateText({
      model: openai(model),
      prompt,
      maxOutputTokens: maxTokens
    });

    res.status(200).json({
      text: result.text,
      usage: result.usage,
      model: model
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate text' });
  }
}
```

**Create** **`api-server/pages/api/ai/stream.ts`:**

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model = 'gpt-4' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const stream = await streamText({
      model: openai(model),
      prompt
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream.textStream) {
      res.write(`data: ${JSON.stringify({ type: 'text-delta', textDelta: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'finish' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('AI streaming error:', error);
    res.status(500).json({ error: 'Failed to stream text' });
  }
}
```

### Step 9: Update Configuration

**Update** **`app.json`** **for Apple Intelligence:**

```json
{
  "expo": {
    "name": "foundation-models-app",
    "slug": "foundation-models-app",
    "version": "1.0.0",
    "platforms": ["ios"],
    "ios": {
      "deploymentTarget": "18.0",
      "infoPlist": {
        "NSAppleIntelligenceUsageDescription": "This app uses Apple Intelligence to provide AI-powered features."
      }
    },
    "plugins": [
      "expo-dev-client",
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": true
          }
        }
      ]
    ]
  }
}
```

### Step 10: Testing and Validation

**Create test script** **`scripts/test-migration.ts`:**

```typescript
import { createAIProvider } from '../lib/ai-providers';

async function testMigration() {
  console.log('Testing AI SDK v5 migration...');
  
  try {
    // Test provider selection
    const { provider, type, name } = await createAIProvider();
    console.log(`✅ Provider selected: ${name} (${type})`);
    
    // Test basic generation (if Apple Intelligence available)
    if (type === 'apple' && provider) {
      const { generateText } = await import('ai');
      const result = await generateText({
        model: provider,
        prompt: 'Say hello in a friendly way',
        maxOutputTokens: 50
      });
      console.log(`✅ Apple Intelligence test: ${result.text}`);
    }
    
    console.log('✅ Migration test completed successfully!');
  } catch (error) {
    console.error('❌ Migration test failed:', error);
  }
}

testMigration();
```

### Step 11: Build and Deploy

```bash
# Clean and rebuild
rm -rf node_modules
pnpm install

# Build for iOS
expо run:ios

# Test on device with Apple Intelligence
# Verify fallback behavior on simulator
```

## Breaking Changes Summary

| Old API                                              | New API                    | Notes                       |
| ---------------------------------------------------- | -------------------------- | --------------------------- |
| `ExpoFoundationModelsModule.startStreamingSession()` | `streamText()` from AI SDK | Unified streaming interface |
| `GenerationRequest.prompt`                           | `generateText({ prompt })` | Same parameter name         |
| `maxTokens`                                          | `maxOutputTokens`          | Parameter renamed           |
| Custom event listeners                               | Async iterators            | Modern streaming approach   |
| `StreamingChunk.content`                             | `textStream` chunks        | Direct text chunks          |
| Custom session management                            | Built-in stream handling   | Simplified state management |

## Troubleshooting

### Apple Intelligence Not Available

* Ensure iOS 18+ and Apple Intelligence enabled device

* Check device compatibility and region settings

* Verify app permissions in Settings

### Streaming Issues

* Check network connectivity for cloud fallback

* Verify API keys for cloud providers

* Test with smaller prompts first

### Build Errors

* Ensure New Architecture is enabled

* Clean build folder and reinstall dependencies

* Check iOS deployment target (18.0+)

## Next Steps

1. Test thoroughly on both Apple Intelligence enabled and disabled devices
2. Monitor

