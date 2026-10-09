import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabsLayout() {
  const { colors, fontScale } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '700',
          fontSize: 17 * fontScale,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 62,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11 * fontScale,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '查询记录',
          headerTitle: 'LexiNote · 查询和记录',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="guess"
        options={{
          title: '猜词辅助',
          headerTitle: '语境猜词辅助',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'bulb' : 'bulb-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notebooks"
        options={{
          title: '笔记',
          headerTitle: '笔记管理与词库',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: '复习',
          headerTitle: '复习中心',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'repeat' : 'repeat-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          headerTitle: '设置与数据管理',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
