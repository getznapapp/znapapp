import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

export default function TestBackendSimple() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBackend = async () => {
    setIsLoading(true);
    setResults([]);

    // Get base URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
    addResult(`Base URL: ${baseUrl}`);

    // Test 1: Basic fetch to root
    try {
      addResult('Testing root endpoint...');
      const response = await fetch(`${baseUrl}/api`, {
        method: 'GET',
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          return controller.signal;
        })(),
      });
      addResult(`Root response: ${response.status} ${response.statusText}`);
      if (response.ok) {
        const data = await response.text();
        addResult(`Root data: ${data.substring(0, 100)}...`);
      }
    } catch (error) {
      addResult(`Root error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Test 2: Health endpoint
    try {
      addResult('Testing health endpoint...');
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          return controller.signal;
        })(),
      });
      addResult(`Health response: ${response.status} ${response.statusText}`);
      if (response.ok) {
        const data = await response.json();
        addResult(`Health data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult(`Health error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Test 3: tRPC endpoint
    try {
      addResult('Testing tRPC endpoint...');
      const response = await fetch(`${baseUrl}/api/trpc/example.hi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: null,
          meta: {}
        }),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          return controller.signal;
        })(),
      });
      addResult(`tRPC response: ${response.status} ${response.statusText}`);
      if (response.ok) {
        const data = await response.json();
        addResult(`tRPC data: ${JSON.stringify(data)}`);
      } else {
        const text = await response.text();
        addResult(`tRPC error text: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      addResult(`tRPC error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Backend Test' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Simple Backend Test</Text>
        <Pressable 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testBackend}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Backend'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
  },
  resultItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
});