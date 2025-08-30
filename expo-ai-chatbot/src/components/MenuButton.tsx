import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useStore } from '../lib/globalStore';

interface MenuButtonProps {
  size?: number;
  style?: any;
}

export const MenuButton: React.FC<MenuButtonProps> = ({ 
  size = 24, 
  style 
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { setSidebarVisible } = useStore();

  const handlePress = () => {
    setSidebarVisible(true);
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <Ionicons
        name="menu"
        size={size}
        color={isDark ? '#ffffff' : '#000000'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
  },
});