import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Wifi, WifiOff, CheckCircle, XCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { supabase, testSupabaseConnection } from '@/lib/supabase';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export default function TestNetworkConnectivity() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Basic Fetch Test', status: 'pending', message: 'Not started' },
    { name: 'Supabase URL Test', status: 'pending', message: 'Not started' },
    { name: 'Supabase Connection Test', status: 'pending', message: 'Not started' },
    { name: 'Auth Session Test', status: 'pending', message: 'Not started' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending', message: 'Running...' })));

    // Test 1: Basic fetch test
    try {
      const start = Date.now();
      const response = await fetch('https://httpbin.org/json', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const duration = Date.now() - start;
      
      if (response.ok) {
        updateTest(0, {
          status: 'success',
          message: `Success (${duration}ms)`,
          duration,
        });
      } else {
        updateTest(0, {
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error) {
      updateTest(0, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: Supabase URL test
    try {
      const start = Date.now();
      const response = await fetch('https://swfgczocuudtdfstsjfi.supabase.co/rest/v1/', {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zmdjem9jdXVkdGRmc3RzamZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzE0ODEsImV4cCI6MjA2ODIwNzQ4MX0.4bpgVoOu3OuwhkDs5Pk1M7NBDr0A-MqpyIaM5HwYxdg',
          'Content-Type': 'application/json',
        },
      });
      const duration = Date.now() - start;
      
      if (response.ok) {
        updateTest(1, {
          status: 'success',
          message: `Success (${duration}ms)`,
          duration,
        });
      } else {
        updateTest(1, {
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error) {
      updateTest(1, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 3: Supabase connection test
    try {
      const start = Date.now();
      const result = await testSupabaseConnection();
      const duration = Date.now() - start;
      
      updateTest(2, {
        status: result ? 'success' : 'error',
        message: result ? `Success (${duration}ms)` : 'Connection failed',
        duration,
      });
    } catch (error) {
      updateTest(2, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 4: Auth session test
    try {
      const start = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const duration = Date.now() - start;
      
      if (error) {
        updateTest(3, {
          status: 'error',
          message: error.message,
        });
      } else {
        updateTest(3, {
          status: 'success',
          message: `Success (${duration}ms) - ${data.session ? 'Has session' : 'No session'}`,
          duration,
        });
      }
    } catch (error) {
      updateTest(3, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'error':
        return <XCircle size={20} color={theme.colors.error} />;
      default:
        return <Wifi size={20} color={theme.colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Network Connectivity Test</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Tests</Text>
          <Text style={styles.sectionDescription}>
            These tests will help diagnose network connectivity issues with authentication.
          </Text>
        </View>

        <View style={styles.testsContainer}>
          {tests.map((test, index) => (
            <View key={index} style={styles.testItem}>
              <View style={styles.testHeader}>
                {getStatusIcon(test.status)}
                <Text style={styles.testName}>{test.name}</Text>
              </View>
              <Text style={[styles.testMessage, { color: getStatusColor(test.status) }]}>
                {test.message}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={runTests}
          disabled={isRunning}
        >
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Troubleshooting Tips:</Text>
          <Text style={styles.infoText}>
            • If Basic Fetch Test fails: Check your internet connection
          </Text>
          <Text style={styles.infoText}>
            • If Supabase URL Test fails: Supabase service may be down
          </Text>
          <Text style={styles.infoText}>
            • If Connection Test fails: Database configuration issue
          </Text>
          <Text style={styles.infoText}>
            • If Auth Session Test fails: Authentication service issue
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  testsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  testItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: 12,
  },
  testMessage: {
    fontSize: 14,
    marginLeft: 32,
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
});