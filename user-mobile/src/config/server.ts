import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = '@ckash_user_web_url';

export const getDefaultServerUrl = (): string => {
  if (process.env.EXPO_PUBLIC_WEB_URL) {
    return process.env.EXPO_PUBLIC_WEB_URL;
  }
  // Android emulator uses 10.0.2.2 to access host machine localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:1002';
  }
  // iOS simulator or web
  return 'http://localhost:1002';
};

export const serverConfig = {
  async getStoredServerUrl(): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    } catch {
      // Fallback
    }
    return getDefaultServerUrl();
  },

  async setStoredServerUrl(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, url.trim());
    } catch (err) {
      console.warn('Failed to persist server URL:', err);
    }
  },

  async resetServerUrl(): Promise<string> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear server URL:', err);
    }
    return getDefaultServerUrl();
  },
};
