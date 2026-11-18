import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_CUSTOM_URL_KEY = '@agency_api_custom_url';

// Default URLs depending on platform:
// - Android Emulator uses 10.0.2.2 to access host Mac localhost
// - iOS Simulator uses localhost
// - Physical devices (iPhone or Android) need your Mac's LAN IP or a tunnel URL
export const getDefaultApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:1001' : 'http://localhost:1001';
};

let cachedBaseUrl: string | null = null;

export const getApiBaseUrl = async (): Promise<string> => {
  if (cachedBaseUrl) return cachedBaseUrl;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_CUSTOM_URL_KEY);
    if (saved && saved.trim().length > 0) {
      cachedBaseUrl = saved.trim();
      return cachedBaseUrl;
    }
  } catch {
    // Ignore error and fall back to default
  }
  cachedBaseUrl = getDefaultApiBaseUrl();
  return cachedBaseUrl;
};

export const setApiBaseUrl = async (url: string): Promise<void> => {
  cachedBaseUrl = url.trim();
  await AsyncStorage.setItem(STORAGE_CUSTOM_URL_KEY, cachedBaseUrl);
};

export const resetApiBaseUrl = async (): Promise<string> => {
  await AsyncStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
  cachedBaseUrl = getDefaultApiBaseUrl();
  return cachedBaseUrl;
};

