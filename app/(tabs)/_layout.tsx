import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Camera, Settings } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { Logo } from '@/components/Logo';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'rgba(26, 26, 30, 0.8)' : theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 88,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarBackground: Platform.OS === 'ios' ? () => (
          <BlurView
            intensity={80}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              backgroundColor: 'rgba(26, 26, 30, 0.8)',
            }}
          />
        ) : undefined,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600' as const,
          marginBottom: 8,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: theme.fontSize.lg,
          fontWeight: '600' as const,
        },
        headerTintColor: theme.colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: () => <Logo size="medium" />,
          tabBarIcon: ({ color, size, focused }) => (
            <Home 
              size={size} 
              color={focused ? theme.colors.primary : color}
              fill={focused ? theme.colors.primary : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color, size, focused }) => (
            <Camera 
              size={size} 
              color={focused ? theme.colors.primary : color}
              fill={focused ? theme.colors.primary : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Settings 
              size={size} 
              color={focused ? theme.colors.primary : color}
              fill={focused ? theme.colors.primary : 'transparent'}
            />
          ),
        }}
      />
    </Tabs>
  );
}