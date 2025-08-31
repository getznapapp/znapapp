import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface BackendStatusProps {
  showDetails?: boolean;
}

export const BackendStatus: React.FC<BackendStatusProps> = ({ showDetails = false }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkBackendStatus = async () => {
    setIsChecking(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // Reduced timeout

      const response = await fetch(`${baseUrl}/api/health`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      setIsConnected(response.ok);
      setLastChecked(new Date());
    } catch (error) {
      // Don't log errors for expected offline state
      setIsConnected(false);
      setLastChecked(new Date());
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Delay initial check to avoid blocking app startup
    const timer = setTimeout(() => {
      checkBackendStatus();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (!showDetails && isConnected !== false) {
    return null; // Only show when there's an issue and details are not requested
  }

  const getStatusColor = () => {
    if (isConnected === null) return theme.colors.textSecondary;
    return isConnected ? theme.colors.success : theme.colors.error;
  };

  const getStatusText = () => {
    if (isConnected === null) return 'Checking...';
    return isConnected ? 'Backend Connected' : 'Backend Offline';
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw size={16} color={getStatusColor()} />;
    }
    return isConnected ? (
      <Wifi size={16} color={getStatusColor()} />
    ) : (
      <WifiOff size={16} color={getStatusColor()} />
    );
  };

  return (
    <Pressable style={styles.container} onPress={checkBackendStatus}>
      <View style={styles.content}>
        {getStatusIcon()}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {showDetails && lastChecked && (
          <Text style={styles.timestamp}>
            {lastChecked.toLocaleTimeString()}
          </Text>
        )}
      </View>
      {!isConnected && (
        <Text style={styles.description}>
          Running in offline mode
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
  },
  timestamp: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginLeft: 'auto',
  },
  description: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
});