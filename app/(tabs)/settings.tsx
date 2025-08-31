import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { MessageCircle, Mail, HelpCircle, Trash2, Shield, Briefcase, Users, Palette, Instagram, Twitter, LogOut } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { router } from 'expo-router';

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

function SettingsItem({ icon, title, subtitle, onPress }: SettingsItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.settingsItemContent}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.itemTitle}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padding="sm">
        {children}
      </Card>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();

  const handlePress = (action: string) => {
    console.log(`Pressed: ${action}`);
    // TODO: Implement actual functionality
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/sign-in');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.user_metadata?.full_name || 'User'}</Text>
              <Text style={styles.profileHandle}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {/* Support Section */}
        <SettingsSection title="SUPPORT">
          <SettingsItem
            icon={<MessageCircle size={20} color={theme.colors.textSecondary} />}
            title="Text"
            onPress={() => handlePress('text')}
          />
          <View style={styles.separator} />
          <SettingsItem
            icon={<Mail size={20} color={theme.colors.textSecondary} />}
            title="Email"
            onPress={() => handlePress('email')}
          />
          <View style={styles.separator} />
          <SettingsItem
            icon={<HelpCircle size={20} color={theme.colors.textSecondary} />}
            title="FAQ"
            onPress={() => handlePress('faq')}
          />
        </SettingsSection>

        {/* Account Section */}
        <SettingsSection title="ACCOUNT">
          <SettingsItem
            icon={<LogOut size={20} color={theme.colors.error} />}
            title="Sign Out"
            onPress={handleSignOut}
          />
        </SettingsSection>

        {/* Data Section */}
        <SettingsSection title="DATA">
          <SettingsItem
            icon={<Trash2 size={20} color={theme.colors.textSecondary} />}
            title="Clear Cache"
            onPress={() => handlePress('clear-cache')}
          />
          <View style={styles.separator} />
          <SettingsItem
            icon={<Shield size={20} color={theme.colors.textSecondary} />}
            title="Privacy"
            onPress={() => handlePress('privacy')}
          />
        </SettingsSection>

        {/* Debug Section */}
        <SettingsSection title="DEBUG">
          <SettingsItem
            icon={<HelpCircle size={20} color={theme.colors.primary} />}
            title="Test Supabase Upload"
            subtitle="Debug photo upload issues"
            onPress={() => router.push('/test-supabase-upload')}
          />
        </SettingsSection>

        {/* Get in Touch Section */}
        <SettingsSection title="GET IN TOUCH">
          <SettingsItem
            icon={<Briefcase size={20} color={theme.colors.textSecondary} />}
            title="Business Inquiries"
            onPress={() => handlePress('business')}
          />
          <View style={styles.separator} />
          <SettingsItem
            icon={<Users size={20} color={theme.colors.textSecondary} />}
            title="Jobs at Znap"
            onPress={() => handlePress('jobs')}
          />
        </SettingsSection>

        {/* Customize Section */}
        <SettingsSection title="CUSTOMIZE">
          <SettingsItem
            icon={<Palette size={20} color={theme.colors.textSecondary} />}
            title="App Icon"
            onPress={() => handlePress('app-icon')}
          />
        </SettingsSection>

        {/* Social Links */}
        <View style={styles.socialSection}>
          <Text style={styles.sectionTitle}>SOCIALS</Text>
          <View style={styles.socialButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
              onPress={() => handlePress('instagram')}
            >
              <Instagram size={24} color={theme.colors.textSecondary} />
              <Text style={styles.socialText}>Instagram</Text>
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
              onPress={() => handlePress('twitter')}
            >
              <Twitter size={24} color={theme.colors.textSecondary} />
              <Text style={styles.socialText}>Twitter</Text>
            </Pressable>
          </View>
        </View>
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
  profileCard: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  profileHandle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.5,
  },
  settingsItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  itemSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 52,
  },
  socialSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  socialButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  socialText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
  },
});