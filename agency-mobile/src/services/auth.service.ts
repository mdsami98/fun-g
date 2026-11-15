import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../config/api';

const TOKEN_KEY = '@agency_access_token';
const USER_KEY = '@agency_user_info';

export interface AgencyInfo {
  id: string;
  name: string;
  code: string;
  balance?: string;
  isActive?: boolean;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  role: string;
  agencyId?: string | null;
  agency?: AgencyInfo | null;
  balance?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserProfile;
}

export const authService = {
  async login(phone: string, password: string): Promise<LoginResponse> {
    const baseUrl = await getApiBaseUrl();
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/auth/login`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });
    } catch (networkError: any) {
      throw new Error(
        `Unable to connect to server at ${baseUrl}. Please check your network connection or server URL.`,
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Login failed';
      throw new Error(message);
    }

    if (!data.accessToken) {
      throw new Error('Invalid login response from server');
    }

    // Persist token and user in local storage
    await AsyncStorage.setItem(TOKEN_KEY, data.accessToken);
    if (data.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data as LoginResponse;
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getStoredUser(): Promise<UserProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async fetchCurrentUser(): Promise<UserProfile | null> {
    const token = await this.getToken();
    if (!token) return null;

    const baseUrl = await getApiBaseUrl();
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/auth/me`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
        }
        return null;
      }

      const user = await response.json();
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return user as UserProfile;
    } catch {
      // In case of offline, return cached user
      return await this.getStoredUser();
    }
  },

  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch {
      // Ignore
    }
  },
};
