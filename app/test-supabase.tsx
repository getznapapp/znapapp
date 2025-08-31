import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { CloudUploadTest } from '@/components/CloudUploadTest';
import { theme } from '@/constants/theme';

export default function TestSupabasePage() {
  return (
    <>
      <Stack.Screen options={{ title: 'Supabase Storage Test' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Supabase Storage Test</Text>
          <Text style={styles.description}>
            Test your Supabase storage bucket configuration and photo upload functionality.
          </Text>
          
          <CloudUploadTest cameraId="test-camera-123" />
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Expected Bucket Configuration:</Text>
            <Text style={styles.infoText}>• Bucket name: camera-photos</Text>
            <Text style={styles.infoText}>• Public bucket: Yes</Text>
            <Text style={styles.infoText}>• Allowed MIME types: image/jpeg, image/png, image/webp</Text>
            <Text style={styles.infoText}>• File size limit: 10MB</Text>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Your Supabase Project:</Text>
            <Text style={styles.infoText}>• URL: https://swfgczocuudtdfstsjfi.supabase.co</Text>
            <Text style={styles.infoText}>• Project ID: swfgczocuudtdfstsjfi</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  infoSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
});