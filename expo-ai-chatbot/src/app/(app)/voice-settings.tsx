import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Volume2, Check } from 'lucide-react-native';
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { AppleSpeech } from '@react-native-ai/apple';

// Apple Speech availability
let isAppleSpeechAvailable = false;

// Check Apple Speech availability
const checkAppleSpeechAvailability = async () => {
  console.log('=== Apple Speech Availability Check ===');
  console.log('Platform:', Platform.OS);
  
  if (Platform.OS !== 'ios') {
    console.log('Apple Speech features only available on iOS devices');
    return false;
  }
  
  if (isAppleSpeechAvailable) {
    console.log('Apple Speech already available, skipping check');
    return true;
  }
  
  try {
    console.log('Checking AppleSpeech availability...');
    // Try to get voices to test if AppleSpeech is available
    await AppleSpeech.getVoices();
    
    isAppleSpeechAvailable = true;
    console.log('Apple Speech is available');
    return true;
  } catch (error) {
    console.log('Apple Speech not available:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return false;
  }
};

interface VoiceInfo {
  identifier: string;
  name: string;
  language: string;
  quality: 'default' | 'enhanced' | 'premium';
  traits?: string[];
}

interface GroupedVoices {
  premium: VoiceInfo[];
  enhanced: VoiceInfo[];
  default: VoiceInfo[];
}

const SELECTED_VOICE_KEY = 'selectedVoice';
const PREVIEW_TEXT = 'Hello, this is a preview of this voice.';

export default function VoiceSettings() {
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [groupedVoices, setGroupedVoices] = useState<GroupedVoices>({
    premium: [],
    enhanced: [],
    default: [],
  });
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const audioPlayerRef = useRef<any>(null);

  useEffect(() => {
    const initializeVoices = async () => {
      console.log('=== Voice Settings Initialization ===');
      setLoading(true);
      
      console.log('Checking Apple Speech availability...');
      const success = await checkAppleSpeechAvailability();
      console.log('Apple Speech available:', success);
      
      if (success) {
        console.log('Proceeding to load voices...');
        await loadVoices();
      } else {
        console.log('Failed to initialize Apple Speech, stopping initialization');
        setLoading(false);
      }
      await loadSelectedVoice();
    };
    
    initializeVoices();
    
    return () => {
      // Cleanup audio player if needed
      if (audioPlayerRef.current) {
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const loadVoices = async () => {
    console.log('=== Voice Loading Debug ===');
    console.log('Apple Speech Available:', isAppleSpeechAvailable);
    
    if (!isAppleSpeechAvailable) {
      console.log('Apple Speech not available - showing alert');
      Alert.alert('Error', 'Apple Speech module is not available on this device.');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading voices using AppleSpeech.getVoices()...');
      const availableVoices = await AppleSpeech.getVoices();
      
      console.log('Raw voices from AppleSpeech:', availableVoices.length);
      console.log('Sample voice structure:', availableVoices[0]);
      
      // Filter for English voices only to reduce clutter
      const englishVoices = availableVoices.filter((voice: any) => 
        voice.language && voice.language.startsWith('en')
      );
      
      console.log('Filtered English voices:', englishVoices.length);
      
      // Convert to our VoiceInfo format with quality detection fallback
      const voiceList: VoiceInfo[] = englishVoices.map((voice: any) => {
        let quality: 'default' | 'enhanced' | 'premium' = 'default';
        
        // First, check if voice.quality exists and is valid
        if (voice.quality && ['default', 'enhanced', 'premium'].includes(voice.quality)) {
          quality = voice.quality;
        } else {
          // Fallback: detect quality from identifier patterns
          const identifier = voice.identifier?.toLowerCase() || '';
          
          if (identifier.includes('premium') || identifier.includes('neural')) {
            quality = 'premium';
          } else if (identifier.includes('enhanced') || identifier.includes('compact')) {
            quality = 'enhanced';
          } else if (identifier.includes('super-compact')) {
            quality = 'default';
          } else {
            // Additional heuristics based on common voice patterns
            // Premium voices often have specific identifiers
            if (voice.name && (voice.name.includes('Premium') || voice.name.includes('Neural'))) {
              quality = 'premium';
            } else if (voice.name && voice.name.includes('Enhanced')) {
              quality = 'enhanced';
            }
          }
        }
        
        return {
          identifier: voice.identifier,
          name: voice.name,
          language: voice.language,
          quality,
          traits: voice.traits || []
        };
      });
      
      console.log('Converted voices:', voiceList.length);
      console.log('Voice names:', voiceList.map(v => `${v.name} (${v.quality})`));

      // Group voices by quality
      const grouped: GroupedVoices = {
        premium: voiceList.filter((v: VoiceInfo) => v.quality === 'premium'),
        enhanced: voiceList.filter((v: VoiceInfo) => v.quality === 'enhanced'),
        default: voiceList.filter((v: VoiceInfo) => v.quality === 'default'),
      };
      
      console.log('Grouped voices:');
      console.log('- Premium:', grouped.premium.length, grouped.premium.map(v => v.name));
      console.log('- Enhanced:', grouped.enhanced.length, grouped.enhanced.map(v => v.name));
      console.log('- Default:', grouped.default.length, grouped.default.map(v => v.name));

      setVoices(voiceList);
      setGroupedVoices(grouped);
      
      console.log('Voice loading completed successfully');
    } catch (error) {
      console.error('Error loading voices from AppleSpeech:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      Alert.alert('Error', 'Failed to load available voices.');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedVoice = async () => {
    try {
      const saved = await AsyncStorage.getItem(SELECTED_VOICE_KEY);
      if (saved) {
        const selectedVoiceObj = JSON.parse(saved);
        setSelectedVoice(selectedVoiceObj.identifier);
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
    }
  };

  const saveSelectedVoice = async (voiceId: string) => {
    try {
      // Find the complete voice object
      const selectedVoiceObj = voices.find(voice => voice.identifier === voiceId);
      if (!selectedVoiceObj) {
        console.error('Voice not found:', voiceId);
        Alert.alert('Error', 'Selected voice not found.');
        return;
      }
      
      // Save the complete voice object to match what voice-chat.tsx expects
      await AsyncStorage.setItem(SELECTED_VOICE_KEY, JSON.stringify(selectedVoiceObj));
      setSelectedVoice(voiceId);
    } catch (error) {
      console.error('Error saving voice settings:', error);
      Alert.alert('Error', 'Failed to save voice preference.');
    }
  };

  const previewVoice = async (voice: VoiceInfo) => {
    if (!isAppleSpeechAvailable) return;

    try {
      setPreviewingVoice(voice.identifier);
      
      // Stop any currently playing audio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }

      console.log('Generating preview audio for voice:', voice.name, voice.identifier);
      
      // Generate audio using AppleSpeech.generate()
      const audioBuffer = await AppleSpeech.generate(PREVIEW_TEXT, {
        language: voice.language,
        voice: voice.identifier,
      });

      if (audioBuffer) {
        console.log('Audio generated successfully, buffer length:', audioBuffer.byteLength);
        
        // Convert ArrayBuffer to Uint8Array
        const uint8Array = new Uint8Array(audioBuffer);
        
        // Convert Uint8Array to base64 using React Native compatible method
        const chunkSize = 8192;
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64Audio = btoa(binaryString);
        const tempFilePath = `${FileSystem.documentDirectory}temp_preview_audio.wav`;
        
        await FileSystem.writeAsStringAsync(tempFilePath, base64Audio, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        console.log('Audio file written to:', tempFilePath);
        
        // Create and configure audio player
        audioPlayerRef.current = createAudioPlayer();
        
        // Replace the audio source and play
        await audioPlayerRef.current.replace(tempFilePath);
        audioPlayerRef.current.play();
        
        console.log('Audio playback started');
        
        // Set up completion handler
        const handlePlaybackEnd = () => {
          console.log('Audio playback ended');
          setPreviewingVoice(null);
          if (audioPlayerRef.current) {
            audioPlayerRef.current.remove();
            audioPlayerRef.current = null;
          }
          // Clean up temp file
          FileSystem.deleteAsync(tempFilePath).catch(() => {});
        };
        
        // Monitor playback completion
        const checkPlayback = setInterval(() => {
          if (audioPlayerRef.current && audioPlayerRef.current.isLoaded && !audioPlayerRef.current.isPlaying) {
            clearInterval(checkPlayback);
            handlePlaybackEnd();
          }
        }, 100);
        
        // Cleanup after 10 seconds as fallback
        setTimeout(() => {
          clearInterval(checkPlayback);
          handlePlaybackEnd();
        }, 10000);
      } else {
        console.error('No audio buffer received from AppleSpeech.generate()');
        Alert.alert('Error', 'Failed to generate audio for voice preview.');
        setPreviewingVoice(null);
      }
    } catch (error) {
      console.error('Error previewing voice:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      Alert.alert('Error', 'Failed to preview voice.');
      setPreviewingVoice(null);
    }
  };

  const getQualityBadgeColor = (quality: string) => {
    switch (quality) {
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'enhanced':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderVoiceItem = (voice: VoiceInfo) => {
    const isSelected = selectedVoice === voice.identifier;
    const isPreviewing = previewingVoice === voice.identifier;

    return (
      <TouchableOpacity
        key={voice.identifier}
        className={`p-4 mb-3 rounded-lg border ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        }`}
        onPress={() => saveSelectedVoice(voice.identifier)}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-lg font-semibold text-gray-900 mr-2">
                {voice.name}
              </Text>
              <View className={`px-2 py-1 rounded-full ${getQualityBadgeColor(voice.quality)}`}>
                <Text className="text-xs font-medium capitalize">
                  {voice.quality}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-600">
              {voice.language} • {voice.identifier}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <TouchableOpacity
              className="p-2 mr-2 rounded-full bg-gray-100"
              onPress={() => previewVoice(voice)}
              disabled={isPreviewing}
            >
              {isPreviewing ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Volume2 size={20} color="#6B7280" />
              )}
            </TouchableOpacity>
            
            {isSelected && (
              <View className="p-2 rounded-full bg-blue-500">
                <Check size={20} color="white" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVoiceSection = (title: string, voices: VoiceInfo[], description: string) => {
    if (voices.length === 0) return null;

    return (
      <View className="mb-6">
        <View className="mb-3">
          <Text className="text-xl font-bold text-gray-900 mb-1">{title}</Text>
          <Text className="text-sm text-gray-600">{description}</Text>
        </View>
        {voices.map(renderVoiceItem)}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">Loading available voices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full"
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="ml-2 text-xl font-bold text-gray-900">
          Voice Settings
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Instructions */}
        <View className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Text className="text-sm text-blue-800 mb-2 font-medium">
            Choose Your Preferred Voice
          </Text>
          <Text className="text-sm text-blue-700">
            Select a voice for text-to-speech. Premium and Enhanced voices offer better quality but may need to be downloaded first.
          </Text>
        </View>

        {/* Voice Sections */}
        {renderVoiceSection(
          'Premium Voices',
          groupedVoices.premium,
          'Highest quality voices with natural intonation and expression'
        )}
        
        {renderVoiceSection(
          'Enhanced Voices',
          groupedVoices.enhanced,
          'High quality voices with improved clarity and naturalness'
        )}
        
        {renderVoiceSection(
          'Standard Voices',
          groupedVoices.default,
          'Default system voices available on all devices'
        )}

        {/* Fallback message */}
        {groupedVoices.premium.length === 0 && groupedVoices.enhanced.length === 0 && (
          <View className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <Text className="text-sm text-yellow-800 mb-2 font-medium">
              No Premium or Enhanced Voices Available
            </Text>
            <Text className="text-sm text-yellow-700">
              Only standard voices are available on this device. You can download additional voices from Settings &gt; Accessibility &gt; Spoken Content &gt; Voices.
            </Text>
          </View>
        )}

        {/* Total count */}
        <View className="mt-4 p-3 bg-gray-100 rounded-lg">
          <Text className="text-sm text-gray-600 text-center">
            {voices.length} voices available • {groupedVoices.premium.length} premium • {groupedVoices.enhanced.length} enhanced • {groupedVoices.default.length} standard
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}