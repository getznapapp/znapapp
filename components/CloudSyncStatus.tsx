import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cloud, CloudOff, Upload, Check, WifiOff } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface CloudSyncStatusProps {
  status: 'idle' | 'uploading' | 'success' | 'error' | 'offline';
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export function CloudSyncStatus({ status, message, size = 'medium' }: CloudSyncStatusProps) {
  const getIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload size={getIconSize()} color={theme.colors.primary} />;
      case 'success':
        return <Check size={getIconSize()} color={theme.colors.success || theme.colors.primary} />;
      case 'error':
        return <CloudOff size={getIconSize()} color={theme.colors.error || '#ff4444'} />;
      case 'offline':
        return <WifiOff size={getIconSize()} color={theme.colors.warning} />;
      default:
        return <Cloud size={getIconSize()} color={theme.colors.textSecondary} />;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };

  const getTextStyle = () => {
    switch (size) {
      case 'small':
        return styles.textSmall;
      case 'large':
        return styles.textLarge;
      default:
        return styles.textMedium;
    }
  };

  const getStatusText = () => {
    if (message) return message;
    
    switch (status) {
      case 'uploading':
        return 'Uploading to cloud...';
      case 'success':
        return 'Synced to cloud';
      case 'error':
        return 'Sync failed';
      case 'offline':
        return 'Offline mode';
      default:
        return 'Cloud sync ready';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return theme.colors.primary;
      case 'success':
        return theme.colors.success || theme.colors.primary;
      case 'error':
        return theme.colors.error || '#ff4444';
      case 'offline':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, size === 'small' && styles.containerSmall]}>
      {getIcon()}
      <Text style={[getTextStyle(), { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  containerSmall: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  textSmall: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500' as const,
  },
  textMedium: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
  },
  textLarge: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
});