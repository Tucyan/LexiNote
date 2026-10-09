import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { NotebookProvider } from '@/context/NotebookContext';
import { HistoryProvider } from '@/context/HistoryContext';

function RootLayoutContent() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="vocabulary/[id]"
          options={{
            title: '词汇详情与编辑',
            headerBackTitle: '返回',
          }}
        />
      </Stack>
    </>
  );
}

function ThemedApp() {
  const { settings, isReady } = useSettings();

  if (!isReady) {
    return null;
  }

  return (
    <ThemeProvider settings={settings}>
      <NotebookProvider>
        <HistoryProvider>
          <RootLayoutContent />
        </HistoryProvider>
      </NotebookProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemedApp />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
