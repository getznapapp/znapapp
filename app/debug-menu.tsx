import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';

export default function DebugMenuScreen() {
  const debugScreens = [
    {
      title: 'Setup Supabase',
      description: 'Instructions for setting up Supabase tables',
      route: '/setup-supabase',
    },
    {
      title: 'Test Supabase Setup',
      description: 'Test if Supabase is properly configured',
      route: '/test-supabase-setup',
    },
    {
      title: 'Debug Database State',
      description: 'Check current database state and tables',
      route: '/debug-database-state',
    },
    {
      title: 'Debug Camera Issue',
      description: 'Test complete camera creation and photo upload flow',
      route: '/debug-camera-issue',
    },
    {
      title: 'Debug Camera Creation',
      description: 'Test camera creation flow',
      route: '/debug-camera-creation',
    },
    {
      title: 'Debug Camera Sync',
      description: 'Fix camera ID synchronization issues',
      route: '/debug-camera-sync',
    },
    {
      title: 'Test Camera Simple',
      description: 'Simple camera functionality test',
      route: '/test-camera-simple',
    },
    {
      title: 'Test Photo Count',
      description: 'Test photo count and gallery functionality',
      route: '/test-photo-count',
    },
    {
      title: 'Clear Storage',
      description: 'Clear all local storage data',
      route: '/clear-storage',
    },
    {
      title: 'Test Network Errors',
      description: 'Test network error handling and fallbacks',
      route: '/test-network-errors',
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Debug Menu',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <Text style={styles.title}>Debug & Test Screens</Text>
      <Text style={styles.subtitle}>
        Use these screens to test and debug the app functionality
      </Text>
      
      <ScrollView style={styles.scrollContainer}>
        {debugScreens.map((screen, index) => (
          <Pressable
            key={index}
            style={styles.card}
            onPress={() => router.push(screen.route as any)}
          >
            <Text style={styles.cardTitle}>{screen.title}</Text>
            <Text style={styles.cardDescription}>{screen.description}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  scrollContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});