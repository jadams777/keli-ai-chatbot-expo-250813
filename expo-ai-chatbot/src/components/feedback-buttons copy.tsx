import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TextInput } from 'react-native';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react-native';
import { UIMessage } from '@/lib/utils';
import { emailService } from '@/lib/email-service';

interface FeedbackButtonsProps {
  message: UIMessage;
  onFeedback: (messageId: string, type: 'positive' | 'negative') => void;
  messages: UIMessage[];
}

export function FeedbackButtons({ message, onFeedback, messages }: FeedbackButtonsProps) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Only show feedback buttons for assistant messages
  if (message.role !== 'assistant') {
    return null;
  }

  // Don't show buttons if feedback has already been given
  if (message.feedback?.type) {
    return (
      <View className="flex-row items-center mt-2 px-3">
        <Text className="text-sm text-gray-500">
          {message.feedback.type === 'positive' 
            ? 'Thanks for your feedback!' 
            : message.feedback.hasResponded 
              ? 'Thanks for your feedback! It helps me improve.'
              : 'How can I do better next time?'
          }
        </Text>
      </View>
    );
  }

  const handleFeedbackSubmit = async () => {
    setIsSubmitting(true);
    try {
      // First mark as negative feedback
      onFeedback(message.id, 'negative');
      // Then send feedback via email service
      await emailService.sendFeedback(messages, feedbackText);
      setShowFeedbackForm(false);
      setFeedbackText('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <View className="flex-row items-center mt-2 px-3 space-x-4">
        <TouchableOpacity
          onPress={() => onFeedback(message.id, 'positive')}
          className="flex-row items-center space-x-1 p-2 rounded-lg bg-gray-100 active:bg-gray-200"
          activeOpacity={0.7}
        >
          <ThumbsUp size={16} color="#10b981" />
          <Text className="text-sm text-gray-600">Helpful</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setShowFeedbackForm(true)}
          className="flex-row items-center space-x-1 p-2 rounded-lg bg-gray-100 active:bg-gray-200"
          activeOpacity={0.7}
        >
          <ThumbsDown size={16} color="#ef4444" />
          <Text className="text-sm text-gray-600">Not helpful</Text>
        </TouchableOpacity>
      </View>
      
      {showFeedbackForm && (
        <View className="mt-4 px-3 py-4 bg-gray-50 rounded-lg mx-3">
          <Text className="font-medium text-gray-700 mb-2">
            How can we do better next time?
          </Text>
          <TextInput
            value={feedbackText}
            onChangeText={setFeedbackText}
            // placeholder="Please share your feedback..."
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg p-3 bg-white mb-3 text-gray-800"
            style={{ textAlignVertical: 'top' }}
          />
          <View className="flex-row justify-end space-x-2">
            <TouchableOpacity
              onPress={() => {
                setShowFeedbackForm(false);
                setFeedbackText('');
              }}
              className="px-4 py-2 rounded-lg bg-gray-200"
            >
              <Text className="text-sm text-gray-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFeedbackSubmit}
              disabled={isSubmitting || !feedbackText.trim()}
              className={`px-4 py-2 rounded-lg flex-row items-center space-x-1 ${
                isSubmitting || !feedbackText.trim() ? 'bg-gray-300' : 'bg-blue-500'
              }`}
            >
              <Send size={14} color={isSubmitting || !feedbackText.trim() ? '#9ca3af' : 'white'} />
              <Text className={`text-sm ${
                isSubmitting || !feedbackText.trim() ? 'text-gray-500' : 'text-white'
              }`}>
                {isSubmitting ? 'Sending...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}