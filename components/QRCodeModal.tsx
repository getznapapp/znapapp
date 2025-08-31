import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Share, Alert, Platform, ScrollView } from 'react-native';
import { X, Share2, Copy } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { theme } from '@/constants/theme';
import { generateInviteUrl } from '@/lib/deep-links';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  cameraId: string;
  cameraName: string;
}

export function QRCodeModal({ visible, onClose, cameraId, cameraName }: QRCodeModalProps) {
  console.log('=== QR CODE MODAL DEBUG ===');
  console.log('Camera ID received:', JSON.stringify(cameraId));
  console.log('Camera name:', JSON.stringify(cameraName));
  console.log('Current window location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
  
  // Create a cross-platform invite URL that works for both app and web users
  // The generateInviteUrl function should always use production URL
  const joinUrl = generateInviteUrl(cameraId);
  
  console.log('Generated invite URL:', joinUrl);
  console.log('Join URL generated:', JSON.stringify(joinUrl));
  console.log('QR data to encode:', JSON.stringify(joinUrl));
  console.log('QR data length:', joinUrl.length);
  console.log('Expected URL should start with: https://znapapp.netlify.app/camera?id=');
  console.log('URL starts correctly:', joinUrl.startsWith('https://znapapp.netlify.app/camera?id='));

  const handleShare = async () => {
    try {
      const shareMessage = `Join my camera "${cameraName}"!\n\nCamera ID: ${cameraId}\n\nLink: ${joinUrl}\n\nThis link will open the Znap app if you have it installed, or take you to the web version.\n\nYou can also manually join by opening the Znap app and entering the Camera ID above.`;
      
      if (Platform.OS === 'web') {
        // Web fallback
        await navigator.clipboard.writeText(shareMessage);
        Alert.alert('Information Copied!', 'Camera join information has been copied to clipboard');
      } else {
        await Share.share({
          message: shareMessage,
          title: `Join ${cameraName}`,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share camera information');
    }
  };

  const handleCopyLink = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(joinUrl);
      } else {
        await Clipboard.setStringAsync(joinUrl);
      }
      Alert.alert('Link Copied!', 'Camera join link has been copied to clipboard');
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Camera</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.cameraName}>{cameraName}</Text>
            <Text style={styles.subtitle}>
              Share this QR code or link to invite others. The link works for both app and web users!
            </Text>

            <View style={styles.qrContainer}>
              {Platform.OS === 'web' ? (
                // Fallback for web - show a placeholder with camera ID
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>QR Code</Text>
                  <Text style={styles.qrPlaceholderSubtext}>Camera ID: {cameraId}</Text>
                  <Text style={styles.qrPlaceholderNote}>Scan with mobile device</Text>
                </View>
              ) : (
                <QRCode
                  value={joinUrl}
                  size={180}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  quietZone={10}
                  enableLinearGradient={false}
                />
              )}
            </View>

            <View style={styles.cameraIdContainer}>
              <Text style={styles.cameraIdLabel}>Camera ID</Text>
              <Text style={styles.cameraIdValue}>{cameraId}</Text>
            </View>

            <View style={styles.linkContainer}>
              <Text style={styles.linkLabel}>Join Link</Text>
              <Text style={styles.linkText} numberOfLines={2}>
                {joinUrl}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.actionButton} onPress={handleShare}>
                <Share2 size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Share Link</Text>
              </Pressable>

              <Pressable style={styles.actionButton} onPress={handleCopyLink}>
                <Copy size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Copy Link</Text>
              </Pressable>
            </View>

            <View style={styles.manualJoinContainer}>
              <Text style={styles.manualJoinTitle}>Manual Join Instructions:</Text>
              <Text style={styles.manualJoinText}>
                1. Open the Znap app{"\n"}
                2. Tap "Join Camera"{"\n"}
                3. Enter Camera ID: <Text style={styles.manualJoinId}>{cameraId}</Text>
              </Text>
            </View>
            

            
            <Text style={styles.instructions}>
              Others can scan this QR code or use the link. The link automatically opens the app if installed, or the web version if not!
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: '#F3F4F6',
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    padding: theme.spacing.md,
  },
  qrPlaceholderText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  qrPlaceholderSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: '600' as const,
    marginBottom: theme.spacing.xs,
  },
  qrPlaceholderNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  linkContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    width: '100%',
  },
  linkLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  linkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md + 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  instructions: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraIdContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  cameraIdLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cameraIdValue: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontFamily: 'monospace',
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  manualJoinContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  manualJoinTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  manualJoinText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  manualJoinId: {
    fontFamily: 'monospace',
    fontWeight: '700' as const,
    color: theme.colors.primary,
  },


});