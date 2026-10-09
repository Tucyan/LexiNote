import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_PREFIX = 'lexinote_key_';

export async function saveApiKey(providerId: string, apiKey: string): Promise<void> {
  const key = `${KEY_PREFIX}${providerId}`;
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, apiKey);
    }
    return;
  }
  await SecureStore.setItemAsync(key, apiKey);
}

export async function getApiKey(providerId: string): Promise<string | null> {
  const key = `${KEY_PREFIX}${providerId}`;
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }
  return await SecureStore.getItemAsync(key);
}

export async function deleteApiKey(providerId: string): Promise<void> {
  const key = `${KEY_PREFIX}${providerId}`;
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
