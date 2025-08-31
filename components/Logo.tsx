import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { useFonts, Chewy_400Regular } from '@expo-google-fonts/chewy';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export function Logo({ size = 'medium', color = '#FFFFFF' }: LogoProps) {
  const [fontsLoaded] = useFonts({
    Chewy_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.logo, sizeStyles[size], { color }]}>
        ZNAP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    letterSpacing: 3,
    textAlign: 'center' as const,
    fontFamily: 'Chewy_400Regular',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  small: {
    fontSize: 24,
  },
  medium: {
    fontSize: 32,
  },
  large: {
    fontSize: 48,
  },
});