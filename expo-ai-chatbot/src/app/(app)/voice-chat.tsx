import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Alert, Platform, ScrollView } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mic, RotateCcw, X, Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  useAudioRecorder,
  AudioModule,
  useAudioRecorderState,
  setAudioModeAsync,
  createAudioPlayer,
  RecordingPresets,
} from 'expo-audio';
import { useAIStreaming } from '@/hooks/useAIStreaming';
import { useStore } from '@/lib/globalStore';
import { AppleSpeech } from '@react-native-ai/apple';
import InCallManager from 'react-native-incall-manager';

// Apple AI module references
let apple: any = null;
let experimental_transcribe: any = null;
let isAppleAIAvailable = false;

// Debug mode flag
const DEBUG_MODE = true;

// Debug logging utility
const debugLog = (category: string, message: string, data?: any) => {
  if (!DEBUG_MODE) return;
  const timestamp = new Date().toISOString();
  const prefix = `[VoiceChat:${category}] ${timestamp}`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

// Performance timing utility
const performanceTimer = {
  timers: new Map<string, number>(),
  start: (name: string) => {
    const startTime = Date.now();
    performanceTimer.timers.set(name, startTime);
    debugLog('Performance', `Timer started: ${name}`);
    return startTime;
  },
  end: (name: string) => {
    const startTime = performanceTimer.timers.get(name);
    if (!startTime) {
      debugLog('Performance', `Timer not found: ${name}`);
      return 0;
    }
    const duration = Date.now() - startTime;
    debugLog('Performance', `Timer ended: ${name} - Duration: ${duration}ms`);
    performanceTimer.timers.delete(name);
    return duration;
  }
};

// Memory usage utility
const logMemoryUsage = (context: string) => {
  if (typeof global !== 'undefined' && global.gc) {
    try {
      global.gc();
      const memUsage = process.memoryUsage();
      debugLog('Memory', `${context} - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    } catch (error) {
      debugLog('Memory', `Failed to get memory usage for ${context}:`, error);
    }
  }
};

// Function to remove markdown and emojis for speech
const cleanSpokenText = (text: string) => {
  if (!text) return '';

  // Remove markdown-like characters (e.g., *, **, __, #, ##, ###, etc.)
  let cleanedText = text.replace(/(\*|_|`|~|#|\d+\.|-|>)/g, '');

  // Remove emojis
  cleanedText = cleanedText.replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, '');

  // Remove URLs
  cleanedText = cleanedText.replace(/https?:\[^\s]+/g, '');

  // Remove markdown links but keep the text
  cleanedText = cleanedText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Replace multiple spaces with a single space
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

  return cleanedText;
};

// Enhanced function to load Apple AI modules with detailed logging
const loadAppleAIModules = async () => {
  performanceTimer.start('loadAppleAIModules');
  debugLog('Debug', 'Starting Apple AI module loading process');
  logMemoryUsage('Before module loading');
  
  if (Platform.OS !== 'ios') {
    debugLog('Error', 'Apple AI features only available on iOS devices', { platform: Platform.OS });
    performanceTimer.end('loadAppleAIModules');
    return false;
  }
  
  if (isAppleAIAvailable) {
    debugLog('Debug', 'Apple AI modules already loaded, skipping initialization');
    performanceTimer.end('loadAppleAIModules');
    return true;
  }
  
  try {
    debugLog('Debug', 'Attempting to load Apple AI modules...');
    
    // Load @react-native-ai/apple module
    debugLog('Debug', 'Loading @react-native-ai/apple module...');
    const appleModuleStart = Date.now();
    const appleModule = require('@react-native-ai/apple');
    const appleModuleTime = Date.now() - appleModuleStart;
    debugLog('Performance', `@react-native-ai/apple module loaded in ${appleModuleTime}ms`);
    
    apple = appleModule.apple;
    
    // Validate apple object
    if (apple) {
      debugLog('Debug', 'Apple object inspection', {
        appleType: typeof apple,
        appleMethods: Object.getOwnPropertyNames(apple),
        applePrototype: Object.getOwnPropertyNames(Object.getPrototypeOf(apple)),
        hasTranscriptionModel: typeof apple.transcriptionModel
      });
    }
    
    debugLog('Debug', 'Apple module components extracted', {
      hasApple: !!apple,
      appleType: typeof apple
    });
    
    // Load ai module
    debugLog('Debug', 'Loading ai module...');
    const aiModuleStart = Date.now();
    const aiModule = require('ai');
    const aiModuleTime = Date.now() - aiModuleStart;
    debugLog('Performance', `ai module loaded in ${aiModuleTime}ms`);
    
    experimental_transcribe = aiModule.experimental_transcribe;
    
    debugLog('Debug', 'AI module components extracted', {
      hasExperimentalTranscribe: !!experimental_transcribe,
      experimentalTranscribeType: typeof experimental_transcribe
    });
    
    // Validate all required components
    const missingComponents = [];
    if (!apple) missingComponents.push('apple');
    if (!experimental_transcribe) missingComponents.push('experimental_transcribe');
    
    if (missingComponents.length > 0) {
      debugLog('Error', 'Missing required Apple AI components', { missing: missingComponents });
      performanceTimer.end('loadAppleAIModules');
      return false;
    }
    
    isAppleAIAvailable = true;
    logMemoryUsage('After module loading');
    performanceTimer.end('loadAppleAIModules');
    debugLog('Debug', 'Apple AI modules loaded successfully');
    return true;
  } catch (error) {
    debugLog('Error', 'Failed to load Apple AI modules', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    logMemoryUsage('After module loading failure');
    performanceTimer.end('loadAppleAIModules');
    return false;
  }
};

// Function to load selected voice preference from AsyncStorage
const loadSelectedVoice = async () => {
  try {
    const selectedVoiceJson = await AsyncStorage.getItem('selectedVoice');
    if (selectedVoiceJson) {
      const selectedVoice = JSON.parse(selectedVoiceJson);
      debugLog('Debug', 'Loaded selected voice from storage', selectedVoice);
      return selectedVoice;
    }
  } catch (error) {
    debugLog('Warning', 'Failed to load selected voice from storage', { error: error.message });
  }
  return null;
};

// Reset function to clean up state
const resetVoiceChatState = (setVoiceState: (state: VoiceState) => void, setStatusText: (text: string) => void, setRecording: (recording: any) => void) => {
  debugLog('Debug', 'Resetting voice chat state');
  setVoiceState('idle');
  setStatusText('Tap and hold to speak');
  setRecording(null);
};

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'generating' | 'playing' | 'error';

const VoiceChatScreen = () => {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { resetStreamingState } = useStore();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const voiceStateRef = React.useRef(voiceState);
  voiceStateRef.current = voiceState;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<any>(null);
  const [statusText, setStatusText] = useState('Tap and hold to speak');
  const [recording, setRecording] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasShownResponse, setHasShownResponse] = useState(false);
  
  

  // Use HIGH_QUALITY preset for recording - expo-audio will handle format conversion
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  debugLog('Debug', 'Audio recorder initialized with HIGH_QUALITY preset', {
    preset: 'HIGH_QUALITY',
    platform: Platform.OS
  });
  const recorderState = useAudioRecorderState(audioRecorder);
  const { startStreaming, cancelStreaming } = useAIStreaming();
  const { streaming } = useStore();
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const buttonOpacity = useSharedValue(1);

  const stopPlayback = useCallback(async () => {
    debugLog('Debug', 'TTS playback stopped by user or on exit');
    cancelStreaming();
    if (audioPlayerRef.current) {
      // Pause playback before removing the player
      await audioPlayerRef.current.pause();
      await audioPlayerRef.current.remove();
      audioPlayerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setVoiceState('idle');
    setStatusText('Tap and hold to speak');
  }, [cancelStreaming]);
  
  // Request microphone permissions on mount and cleanup on unmount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Required', 'Microphone access is required for voice chat.');
        }
      } catch (error) {
        console.error('Failed to request permissions:', error);
      }
    };
    
    requestPermissions();
  }, []);

  // Initialize InCallManager and activate speakerphone on mount
  useEffect(() => {
    const initializeCallManager = async () => {
      try {
        debugLog('Debug', 'Initializing InCallManager for voice chat');
        InCallManager.start({ media: 'audio' });
        // Add delay to allow InCallManager to fully initialize before setting speakerphone
        setTimeout(() => {
          InCallManager.setForceSpeakerphoneOn(true);
          debugLog('Debug', 'InCallManager started with speakerphone activated');
        }, 150);
      } catch (error) {
        debugLog('Error', 'Failed to initialize InCallManager', { error: error.message });
      }
    };

    initializeCallManager();

    // Cleanup on unmount
    return () => {
      try {
        debugLog('Debug', 'Stopping InCallManager on component unmount');
        InCallManager.stop();
      } catch (error) {
        debugLog('Error', 'Failed to stop InCallManager', { error: error.message });
      }
    };
  }, []);
  
  // Configure audio session
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      } catch (error) {
        console.error('Failed to configure audio:', error);
      }
    };
    
    configureAudio();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Re-initialize InCallManager when screen comes into focus
      const initializeCallManager = async () => {
        try {
          debugLog('Debug', 'Re-initializing InCallManager on screen focus');
          InCallManager.start({ media: 'audio' });
          // Add delay to allow InCallManager to fully initialize before setting speakerphone
          setTimeout(() => {
            InCallManager.setForceSpeakerphoneOn(true);
            debugLog('Debug', 'InCallManager re-initialized with speakerphone activated on focus');
          }, 150);
        } catch (error) {
          debugLog('Error', 'Failed to re-initialize InCallManager on focus', { error: error.message });
        }
      };

      initializeCallManager();

      return () => {
        try {
          debugLog('Debug', 'Stopping InCallManager on screen blur');
          InCallManager.stop();
        } catch (error) {
          debugLog('Error', 'Failed to stop InCallManager on blur', { error: error.message });
        }
        stopPlayback();
        reset();
      };
    }, [stopPlayback])
  );
  
  const startRecording = async () => {
    performanceTimer.start('startRecording');
    debugLog('Debug', 'Starting recording process');
    logMemoryUsage('Before startRecording');
    
    try {
      debugLog('Debug', 'Requesting recording permissions...');
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        debugLog('Error', 'Recording permission denied');
        Alert.alert('Permission Required', 'Microphone access is required for voice chat.');
        performanceTimer.end('startRecording');
        return;
      }
      
      debugLog('Debug', 'Recording permission granted, starting recording...');
      
      // Ensure speakerphone is active before recording
      try {
        InCallManager.setForceSpeakerphoneOn(true);
        debugLog('Debug', 'Speakerphone re-activated for recording');
      } catch (error) {
        debugLog('Error', 'Failed to re-activate speakerphone for recording', { error: error.message });
      }
      
      setVoiceState('recording');
      setStatusText('Recording... Release to send');
      
      // Haptic feedback on start
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Start pulse animation
      pulseScale.value = withRepeat(
        withTiming(1.2, { duration: 800 }),
        -1,
        true
      );
      
      debugLog('Debug', 'Starting audio recorder...');
      debugLog('Debug', 'Audio recorder configuration', {
        hasRecorder: !!audioRecorder,
        recorderState: recorderState,
        initialUri: audioRecorder?.uri
      });
      
      if (!audioRecorder) {
        throw new Error('Audio recorder not initialized');
      }
      
      // Check if recorder is ready (remove canRecord check as it doesn't exist in the type)
      if (!audioRecorder) {
        throw new Error('Audio recorder not initialized properly');
      }
      
      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      performanceTimer.start('audioRecorderStart');
      await audioRecorder.record();
      performanceTimer.end('audioRecorderStart');
      
      setRecording(audioRecorder);
      
      debugLog('Debug', 'Recording started successfully', {
        hasRecording: !!audioRecorder,
        recorderState: recorderState,
        uri: audioRecorder.uri,
        isRecording: audioRecorder.isRecording
      });
      
      performanceTimer.end('startRecording');
      logMemoryUsage('After startRecording');
      
    } catch (error) {
      debugLog('Error', 'Failed to start recording', {
        error: error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        recorderState: recorderState
      });
      performanceTimer.end('startRecording');
      setVoiceState('idle');
      setStatusText('Failed to start recording');
    }
  };
  
  const stopRecording = async () => {
    if (!recording) {
      debugLog('Error', 'stopRecording called but no recording exists');
      return;
    }
    
    performanceTimer.start('stopRecording');
    debugLog('Debug', 'Starting stopRecording process');
    logMemoryUsage('Before stopRecording');
    
    try {
      debugLog('Debug', 'Stopping audio recording...');
      // Haptic feedback on release
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Stop pulse animation
      pulseScale.value = withSpring(1);
      
      setVoiceState('transcribing');
      setStatusText('Transcribing...');
      
      performanceTimer.start('audioRecorderStop');
      await audioRecorder.stop();
      performanceTimer.end('audioRecorderStop');
      
      const uri = audioRecorder.uri;
      setRecording(null);
      
      debugLog('Debug', 'Audio recording stopped', {
        uri: uri,
        hasUri: !!uri,
        recorderState: recorderState,
        isRecording: audioRecorder.isRecording,
        hasRecorder: !!audioRecorder
      });
      
      // Log detailed URI information
      if (uri) {
        debugLog('Debug', 'Recording URI details', {
          fullUri: uri,
          uriLength: uri.length,
          isFileUri: uri.startsWith('file://'),
          pathPart: uri.replace('file://', ''),
          extension: uri.split('.').pop()
        });
      } else {
        debugLog('Error', 'No URI generated by audio recorder', {
          recorderState: recorderState,
          isRecording: audioRecorder.isRecording,
          hasRecorder: !!audioRecorder
        });
      }
      
      if (!uri) {
        debugLog('Error', 'No recording URI available after stopping recorder');
        throw new Error('No recording URI available');
      }
      
      // Verify file creation immediately after stopping
      debugLog('Debug', 'Verifying file creation immediately after stop...');
      let fileVerified = false;
      let verificationAttempts = 0;
      const maxVerificationAttempts = 10;
      const verificationDelay = 100; // 100ms delay between verification attempts
      
      while (!fileVerified && verificationAttempts < maxVerificationAttempts) {
        try {
          const immediateFileInfo = await FileSystem.getInfoAsync(uri);
          debugLog('Debug', `File verification attempt ${verificationAttempts + 1}`, {
            exists: immediateFileInfo.exists,
            size: immediateFileInfo.exists ? (immediateFileInfo as any).size : 0,
            uri: uri
          });
          
          if (immediateFileInfo.exists && (immediateFileInfo as any).size > 0) {
            fileVerified = true;
            debugLog('Debug', 'File creation verified successfully', {
              size: (immediateFileInfo as any).size,
              sizeInKB: Math.round((immediateFileInfo as any).size / 1024)
            });
            break;
          }
          
          verificationAttempts++;
          if (verificationAttempts < maxVerificationAttempts) {
            debugLog('Debug', `File not ready yet, waiting ${verificationDelay}ms before verification retry ${verificationAttempts}/${maxVerificationAttempts}`);
            await new Promise(resolve => setTimeout(resolve, verificationDelay));
          }
        } catch (verificationError) {
          verificationAttempts++;
          debugLog('Debug', `File verification failed (attempt ${verificationAttempts}/${maxVerificationAttempts})`, {
            error: verificationError.message
          });
          
          if (verificationAttempts < maxVerificationAttempts) {
            await new Promise(resolve => setTimeout(resolve, verificationDelay));
          }
        }
      }
      
      if (!fileVerified) {
        debugLog('Error', 'File creation could not be verified after recording stop', {
          uri: uri,
          verificationAttempts: verificationAttempts
        });
        throw new Error(`Recording file was not created or is empty. URI: ${uri}`);
      }
      
      debugLog('Debug', 'Recording saved and verified successfully', { uri });
      
      // Load Apple AI modules
      debugLog('Debug', 'Loading Apple AI modules for transcription...');
      const modulesLoaded = await loadAppleAIModules();
      if (!modulesLoaded) {
        debugLog('Error', 'Apple AI modules failed to load for transcription');
        setVoiceState('error');
        setStatusText('Voice features require iOS device with Apple Intelligence. Tap to retry.');
        performanceTimer.end('stopRecording');
        return;
      }
      
      let transcription = '';
      
      try {
        debugLog('Debug', 'Starting transcription process...');
        performanceTimer.start('transcription');
        
        // Read audio file using FileSystem with retry logic
        debugLog('Debug', 'Reading audio file from URI', { uri });
        performanceTimer.start('audioFetch');
        
        let base64Audio = '';
        let retryAttempts = 0;
        const maxRetries = 5;
        const retryDelay = 200; // 200ms delay between retries
        
        while (retryAttempts < maxRetries) {
          try {
            // Check if file exists first
            const fileInfo = await FileSystem.getInfoAsync(uri);
            debugLog('Debug', `File existence check (attempt ${retryAttempts + 1})`, {
              exists: fileInfo.exists,
              size: fileInfo.exists ? (fileInfo as any).size : 0,
              uri: uri
            });
            
            if (!fileInfo.exists) {
              debugLog('Debug', `File does not exist yet, waiting ${retryDelay}ms before retry ${retryAttempts + 1}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryAttempts++;
              continue;
            }
            
            if (fileInfo.exists && (fileInfo as any).size === 0) {
              debugLog('Debug', `File exists but is empty, waiting ${retryDelay}ms before retry ${retryAttempts + 1}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryAttempts++;
              continue;
            }
            
            // File exists and has content, try to read it
            base64Audio = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            debugLog('Debug', 'Audio file read successfully on attempt', {
              attempt: retryAttempts + 1,
              base64Length: base64Audio.length
            });
            break;
            
          } catch (readError) {
            retryAttempts++;
            debugLog('Debug', `File read failed (attempt ${retryAttempts}/${maxRetries})`, {
              error: readError.message,
              willRetry: retryAttempts < maxRetries
            });
            
            if (retryAttempts >= maxRetries) {
              throw new Error(`Failed to read audio file after ${maxRetries} attempts: ${readError.message}`);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
        
        performanceTimer.end('audioFetch');
        
        debugLog('Debug', 'Audio file read successfully', {
          base64Length: base64Audio.length,
          sizeInKB: Math.round(base64Audio.length * 0.75 / 1024), // Approximate size from base64
          fileUri: uri,
          fileExtension: uri.split('.').pop(),
          isWavFormat: uri.toLowerCase().includes('.wav')
        });
        
        if (!base64Audio || base64Audio.length === 0) {
          throw new Error('Failed to read audio file or file is empty');
        }
        
        debugLog('Debug', 'Using base64 audio directly for transcription', {
          base64Length: base64Audio.length,
          sizeInKB: Math.round(base64Audio.length * 0.75 / 1024), // Approximate size after base64 decoding
          sizeInMB: Math.round(base64Audio.length * 0.75 / 1024 / 1024 * 100) / 100
        });
        
        // Prepare transcription model
        debugLog('Debug', 'Preparing transcription model...');
        const transcriptionModel = apple.transcriptionModel();
        debugLog('Debug', 'Transcription model created', {
          model: transcriptionModel,
          modelType: typeof transcriptionModel
        });
        
        // Prepare transcription parameters
        const transcriptionParams = {
          model: transcriptionModel,
          audio: base64Audio,
        };
        
        debugLog('Debug', 'Transcription parameters prepared', {
          hasModel: !!transcriptionParams.model,
          hasAudio: !!transcriptionParams.audio,
          audioSize: transcriptionParams.audio.length,
          modelType: typeof transcriptionParams.model
        });
        
        // Call experimental_transcribe
        debugLog('Debug', 'Calling experimental_transcribe...');
        performanceTimer.start('experimentalTranscribe');
        logMemoryUsage('Before experimental_transcribe');
        
        const response = await experimental_transcribe(transcriptionParams);
        
        performanceTimer.end('experimentalTranscribe');
        logMemoryUsage('After experimental_transcribe');
        
        debugLog('Debug', 'experimental_transcribe response received', {
          hasResponse: !!response,
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : []
        });
        
        transcription = response.text;
        
        debugLog('Debug', 'Transcription completed successfully', {
          transcription: transcription,
          transcriptionLength: transcription?.length || 0,
          segments: response.segments,
          segmentCount: response.segments?.length || 0,
          duration: response.durationInSeconds
        });
        
        performanceTimer.end('transcription');
        
      } catch (transcriptionError) {
        debugLog('Error', 'Transcription failed', {
          error: transcriptionError,
          errorMessage: transcriptionError?.message,
          errorStack: transcriptionError?.stack,
          errorName: transcriptionError?.name
        });
        performanceTimer.end('transcription');
        setVoiceState('error');
        setStatusText('Transcription failed. Tap to retry.');
        performanceTimer.end('stopRecording');
        return;
      }
      
      debugLog('Debug', 'Validating transcription result', {
        hasTranscription: !!transcription,
        transcriptionLength: transcription?.length || 0,
        isEmpty: !transcription || transcription.trim() === ''
      });
      
      if (!transcription || !transcription.trim()) {
        debugLog('Error', 'Empty or invalid transcription received', {
          transcription: transcription,
          trimmed: transcription?.trim()
        });
        setVoiceState('error');
        setStatusText('No speech detected. Tap to retry.');
        performanceTimer.end('stopRecording');
        return;
      }
      
      debugLog('Debug', 'Transcription validation successful', {
        transcription: transcription,
        length: transcription.length
      });
      
      // Generate AI response
      debugLog('Debug', 'Starting AI response generation...');
      setVoiceState('generating');
      setStatusText('Thinking...');
      
      await startStreaming({
        messages: [{ role: 'user', content: transcription.trim() }],
      });
      
      performanceTimer.end('stopRecording');
      logMemoryUsage('After stopRecording completed');
      
    } catch (error) {
      debugLog('Error', 'Critical error in stopRecording', {
        error: error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorName: error?.name,
        voiceState: voiceState,
        hasRecording: !!recording
      });
      performanceTimer.end('stopRecording');
      logMemoryUsage('After stopRecording error');
      setVoiceState('error');
      setStatusText('Failed to process audio. Tap to retry.');
      setRecording(null);
    }
  };
  
  // Reset function
  const reset = () => {
    debugLog('Debug', 'Resetting component state', {
      currentRetryCount: retryCount,
      voiceState: voiceState,
      hasRecording: !!recording,
    });

    // Stop and restart InCallManager to ensure clean state
    try {
      InCallManager.stop();
      InCallManager.start({ media: 'audio' });
      InCallManager.setForceSpeakerphoneOn(true);
      debugLog('Debug', 'InCallManager reset during component reset');
    } catch (error) {
      debugLog('Error', 'Failed to reset InCallManager during component reset', { error: error.message });
    }

    setRetryCount(0);
    resetVoiceChatState(setVoiceState, setStatusText, setRecording);
    resetStreamingState();

    debugLog('Debug', 'Component state reset', {
      retryCount: 0,
      voiceState: 'idle',
    });
  };

  // Retry function for when transcription fails
  const retryTranscription = () => {
    debugLog('Debug', 'Retrying transcription', {
      currentAttempt: retryCount,
      nextAttempt: retryCount + 1,
      voiceState: voiceState,
      hasRecording: !!recording,
    });

    setRetryCount((prev) => prev + 1);
    reset();
  };

  // Manual reset function
  const manualReset = () => {
    debugLog('Debug', 'Manual reset triggered');
    reset();
  };
  
  // Handle AI streaming completion
  useEffect(() => {
    if (streaming.streamingText && !hasShownResponse) {
      setHasShownResponse(true);
    }

    const handleStreamingComplete = async () => {
      debugLog('Debug', 'Checking streaming completion', {
        isStreaming: streaming.isStreaming,
        hasStreamingText: !!streaming.streamingText,
        streamingTextLength: streaming.streamingText?.length || 0,
        voiceState: voiceState,
        shouldProcess: !streaming.isStreaming && streaming.streamingText && voiceStateRef.current === 'generating'
      });
      
      if (!streaming.isStreaming && streaming.streamingText && voiceStateRef.current === 'generating') {
        try {
          debugLog('Debug', 'Starting speech synthesis process');
          performanceTimer.start('speechSynthesis');
          
          setVoiceState('playing');
          setStatusText('Speaking...');
          
          // Generate speech using Apple's TTS
          debugLog('Debug', 'Loading Apple AI modules for speech synthesis...');
          const modulesLoaded = await loadAppleAIModules();
          
          debugLog('Debug', 'Apple AI modules loaded for speech', {
            modulesLoaded: modulesLoaded,
            hasApple: !!apple,
            hasSpeechModel: apple ? typeof apple.speechModel : 'undefined'
          });
          
          if (modulesLoaded && Platform.OS === 'ios') {
            debugLog('Debug', 'Generating speech with Apple TTS', {
              textLength: streaming.streamingText.length,
              text: streaming.streamingText.substring(0, 100) + '...'
            });
            
            performanceTimer.start('appleSpeechGenerate');
            
            // Generate speech using AppleSpeech with selected voice from settings
            let result;
            const spokenText = cleanSpokenText(streaming.streamingText);
            try {
              // Load selected voice from AsyncStorage
              const selectedVoice = await loadSelectedVoice();
              
              if (selectedVoice) {
                debugLog('Debug', 'Using selected voice from settings', {
                  voiceId: selectedVoice.identifier,
                  quality: selectedVoice.quality,
                  language: selectedVoice.language,
                  name: selectedVoice.name
                });
                
                result = await AppleSpeech.generate(spokenText, {
                  voice: selectedVoice.identifier,
                  language: selectedVoice.language
                });
              } else {
                // Fallback to automatic voice selection if no preference saved
                debugLog('Debug', 'No voice preference found, using automatic selection');
                const availableVoices = await AppleSpeech.getVoices();
                
                // Filter for English voices and prioritize by quality
                const englishVoices = availableVoices.filter(voice => 
                  voice.language?.startsWith('en') || voice.identifier?.includes('en-US')
                );
                
                // Find premium voice first, then enhanced, then default
                const premiumVoice = englishVoices.find(voice => 
                  voice.quality === 'premium' || voice.identifier?.includes('premium')
                );
                const enhancedVoice = englishVoices.find(voice => 
                  voice.quality === 'enhanced' || voice.identifier?.includes('enhanced')
                );
                
                const fallbackVoice = premiumVoice || enhancedVoice;
                
                if (fallbackVoice) {
                  debugLog('Debug', 'Using fallback high-quality voice', {
                    voiceId: fallbackVoice.identifier,
                    quality: fallbackVoice.quality,
                    language: fallbackVoice.language,
                    name: fallbackVoice.name
                  });
                  
                  result = await AppleSpeech.generate(spokenText, {
                    voice: fallbackVoice.identifier,
                    language: fallbackVoice.language
                  });
                } else {
                  debugLog('Debug', 'No premium/enhanced voices found, using default');
                  result = await AppleSpeech.generate(spokenText);
                }
              }
            } catch (voiceError) {
              debugLog('Warning', 'Failed to configure voice, using default', {
                error: voiceError?.message
              });
              result = await AppleSpeech.generate(spokenText);
            }
            performanceTimer.end('appleSpeechGenerate');
            
            debugLog('Debug', 'Speech synthesis completed successfully', {
              hasResult: !!result,
              resultType: typeof result,
              isArrayBuffer: result instanceof ArrayBuffer,
              resultLength: result?.byteLength || 0
            });
            
            // Implement audio playback with ArrayBuffer from AppleSpeech.generate()
            if (result && result instanceof ArrayBuffer) {
              try {
                const audioPlayer = createAudioPlayer();
                audioPlayerRef.current = audioPlayer;

                setVoiceState('playing');
                setStatusText('Playing response...');

                debugLog('Debug', 'Starting audio playback', {
                  audioDataLength: result.byteLength,
                  audioDataType: typeof result
                });
                
                const tempFileName = `tts_audio_${Date.now()}.wav`;
                const tempFilePath = `${FileSystem.cacheDirectory}${tempFileName}`;
                
                const chunkSize = 8192;
                let binaryString = '';
                const uint8Array = new Uint8Array(result);
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                  const chunk = uint8Array.subarray(i, i + chunkSize);
                  binaryString += String.fromCharCode.apply(null, chunk);
                }
                const base64Audio = btoa(binaryString);
                
                debugLog('Debug', 'Writing audio to temporary file', {
                  tempFilePath: tempFilePath,
                  base64Length: base64Audio.length
                });
                
                await FileSystem.writeAsStringAsync(tempFilePath, base64Audio, {
                  encoding: FileSystem.EncodingType.Base64
                });
                
                debugLog('Debug', 'Audio file written successfully', {
                  filePath: tempFilePath
                });
                
                await audioPlayer.replace(tempFilePath);
                audioPlayer.play();
                
                debugLog('Debug', 'Audio playback started', {
                  filePath: tempFilePath
                });
                
                const cleanupTempFile = async () => {
                  try {
                    const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
                    if (fileInfo.exists) {
                      await FileSystem.deleteAsync(tempFilePath);
                      debugLog('Debug', 'Temporary audio file cleaned up', {
                        filePath: tempFilePath
                      });
                    }
                  } catch (cleanupError) {
                    debugLog('Warning', 'Failed to cleanup temporary audio file', {
                      error: cleanupError,
                      filePath: tempFilePath
                    });
                  }
                };
                
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
                intervalRef.current = setInterval(async () => {
                  if (audioPlayer && audioPlayer.duration > 0 && audioPlayer.currentTime >= audioPlayer.duration) {
                    clearInterval(intervalRef.current);
                    if (voiceStateRef.current === 'playing') {
                      debugLog('Debug', 'Audio playback finished');
                      setVoiceState('idle');
                      setStatusText('Tap and hold to speak');
                      await cleanupTempFile();
                      if (audioPlayer.isLoaded) {
                        audioPlayer.remove();
                        audioPlayerRef.current = null;
                      }
                    }
                  }
                }, 250);
                
              } catch (audioError) {
                debugLog('Error', 'Failed to play audio', {
                  error: audioError,
                  errorMessage: audioError?.message,
                  errorStack: audioError?.stack
                });
                setVoiceState('idle');
                setStatusText('Tap and hold to speak');
              }
            } else {
              debugLog('Warning', 'No audio data available for playback');
            }
            
          } else {
            debugLog('Warning', 'Speech synthesis not available', {
              modulesLoaded: modulesLoaded,
              hasApple: !!apple,
              platform: Platform.OS,
              reason: 'requires iOS device with Apple Intelligence'
            });
          }
          
          performanceTimer.end('speechSynthesis');
          debugLog('Debug', 'Speech synthesis process completed');
          
        } catch (error) {
          debugLog('Error', 'Failed to synthesize speech', {
            error: error,
            errorMessage: error?.message,
            errorStack: error?.stack,
            streamingTextLength: streaming.streamingText?.length || 0
          });
          performanceTimer.end('speechSynthesis');
          setVoiceState('idle');
          setStatusText('Tap and hold to speak');
        }
      }
    };
    
    handleStreamingComplete();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [streaming.isStreaming, streaming.streamingText, hasShownResponse]);
  
  const onPressIn = async () => {
    debugLog('Debug', 'Button press in detected', {
      voiceState: voiceState,
      hasRecording: !!recording,
      retryCount: retryCount
    });
    
    if (voiceState === 'idle' || voiceState === 'error') {
      debugLog('Debug', 'Starting recording from idle or error state');
      InCallManager.setForceSpeakerphoneOn(true);
      buttonScale.value = withSpring(0.9);
      startRecording();
    } else if (voiceState === 'playing') {
      debugLog('Debug', 'Interrupting TTS playback');
      await stopPlayback(); // Stop playback before starting a new recording
      buttonScale.value = withSpring(0.9);
      startRecording();
    } else {
      debugLog('Debug', 'Button press ignored', {
        reason: 'invalid state for press in',
        currentState: voiceState
      });
    }
  };
  
  const onPressOut = () => {
    debugLog('Debug', 'Button press out detected', {
      voiceState: voiceState,
      hasRecording: !!recording
    });
    
    if (voiceState === 'recording') {
      debugLog('Debug', 'Stopping recording from recording state');
      buttonScale.value = withSpring(1);
      stopRecording();
    } else if (voiceState === 'error') {
      debugLog('Debug', 'Button release in error state');
      buttonScale.value = withSpring(1);
    } else {
      debugLog('Debug', 'Button release ignored', {
        reason: 'invalid state for press out',
        currentState: voiceState
      });
    }
  };
  
  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
      opacity: buttonOpacity.value,
    };
  });
  
  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: interpolate(pulseScale.value, [1, 1.2], [0.3, 0]),
    };
  });
  
  const getButtonColor = () => {
    switch (voiceState) {
      case 'recording':
        return 'bg-red-500';
      case 'transcribing':
      case 'generating':
        return 'bg-yellow-500';
      case 'playing':
        return 'bg-green-500';
      case 'error':
        return 'bg-orange-500';
      default:
        return 'bg-white';
    }
  };
  
  const getIconColor = () => {
    return voiceState === 'idle' ? 'black' : 'white';
  };
  
  return (
    <View className="flex-1 bg-black" style={{ paddingBottom: bottom }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Voice Chat',
          headerStyle: { backgroundColor: 'black' },
          headerTintColor: 'white',
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <ArrowLeft size={24} color="white" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/voice-settings')}>
              <Settings size={24} color="white" />
            </Pressable>
          ),
        }}
      />
      
      <View className="flex-1 items-center px-8">
        <View className="justify-center items-center my-4">
          {/* Status Text */}
          <Text className="text-white text-lg text-center mb-12 font-medium">
            {statusText}
          </Text>
          
          <View className="items-center justify-center relative">
            {/* Push-to-Talk Button - Always Centered */}
            <View className="relative">
              {/* Pulse Effect (only visible when recording) */}
              {voiceState === 'recording' && (
                <Animated.View
                  style={[pulseAnimatedStyle]}
                  className="absolute inset-0 w-32 h-32 rounded-full bg-white"
                />
              )}
              
              {/* Main Button */}
              <Animated.View style={buttonAnimatedStyle}>
                <Pressable
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  disabled={voiceState === 'transcribing' || voiceState === 'generating'}
                  className={`w-32 h-32 rounded-full ${getButtonColor()} justify-center items-center shadow-lg`}
                >
                  <Mic size={48} color={getIconColor()} />
                </Pressable>
              </Animated.View>
            </View>

            {/* Stop Playback Button - Positioned to the right */}
            {voiceState === 'playing' && (
              <Pressable
                onPress={stopPlayback}
                className="absolute bg-red-500 w-16 h-16 rounded-full justify-center items-center"
                style={{ left: 150 }}
              >
                <X size={32} color="white" />
              </Pressable>
            )}
          </View>
        </View>

        {/* AI Response Display */}
        <View className="flex-1 w-full">
          <ScrollView 
            className="flex-1"
            contentContainerStyle={{
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
            }}
          >
            {streaming.streamingText ? (
              <View className="px-6">
                <Text className="text-white text-base text-center leading-6">
                  {streaming.streamingText}
                </Text>
              </View>
            ) : (
              <View />
            )}
          </ScrollView>
        </View>
        
        {/* Manual Reset Button - only show in error state */}
        {voiceState === 'error' && (
          <View className="absolute top-20 right-6">
            <Pressable
              onPress={manualReset}
              className="bg-gray-700 p-3 rounded-full"
            >
              <RotateCcw size={20} color="white" />
            </Pressable>
          </View>
        )}
        
        {/* Instructions */}
        {!hasShownResponse && (
          <View className="absolute bottom-20 left-0 right-0 px-8">
            <Text className="text-gray-400 text-sm text-center leading-5">
              {voiceState === 'error' 
                ? `Retry attempt ${retryCount + 1}. Tap the microphone to retry or the reset button to start over.`
                : 'Hold the button to record your voice message. Release to send and hear the AI response.'
              }
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default VoiceChatScreen;