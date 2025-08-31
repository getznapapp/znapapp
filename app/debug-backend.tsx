import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

export default function DebugBackend() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (test: string, result: any, error?: any) => {
    setResults(prev => [...prev, {
      test,
      result,
      error,
      timestamp: new Date().toISOString()
    }]);
  };

  const testBackendConnection = async () => {
    setIsLoading(true);
    setResults([]);

    // Test 1: Check current URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
    addResult('Base URL', baseUrl);

    // Test 2: Health check
    try {
      const healthUrl = `${baseUrl}/api/health`;
      addResult('Health URL', healthUrl);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult('Health Check', data);
      } else {
        addResult('Health Check', null, `HTTP ${response.status}`);
      }
    } catch (error) {
      addResult('Health Check', null, error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: tRPC endpoint
    try {
      const trpcUrl = `${baseUrl}/api/trpc/example.hi`;
      addResult('tRPC URL', trpcUrl);
      
      const response = await fetch(trpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: null,
          meta: {}
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult('tRPC Test', data);
      } else {
        const text = await response.text();
        addResult('tRPC Test', null, `HTTP ${response.status}: ${text}`);
      }
    } catch (error) {
      addResult('tRPC Test', null, error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Supabase test
    try {
      const supabaseUrl = `${baseUrl}/api/supabase-test`;
      const response = await fetch(supabaseUrl);
      
      if (response.ok) {
        const data = await response.json();
        addResult('Supabase Test', data);
      } else {
        const text = await response.text();
        addResult('Supabase Test', null, `HTTP ${response.status}: ${text}`);
      }
    } catch (error) {
      addResult('Supabase Test', null, error instanceof Error ? error.message : 'Unknown error');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    testBackendConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Backend Debug' }} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Backend Connection Debug</Text>
          <Pressable 
            style={styles.button} 
            onPress={testBackendConnection}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Retest Connection'}
            </Text>
          </Pressable>
        </View>

        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <Text style={styles.testName}>{result.test}</Text>
            <Text style={styles.timestamp}>{result.timestamp}</Text>
            
            {result.result && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>Result:</Text>
                <Text style={styles.resultText}>
                  {typeof result.result === 'string' 
                    ? result.result 
                    : JSON.stringify(result.result, null, 2)
                  }
                </Text>
              </View>
            )}
            
            {result.error && (
              <View style={styles.errorSection}>
                <Text style={styles.sectionTitle}>Error:</Text>
                <Text style={styles.errorText}>{result.error}</Text>
              </View>
            )}
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
  scrollView: {
    flex: 1,
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
  buttonText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  resultCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  timestamp: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  resultSection: {
    marginTop: theme.spacing.sm,
  },
  errorSection: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    fontFamily: 'monospace',
  },
});