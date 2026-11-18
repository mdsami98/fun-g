import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import { authService, UserProfile } from '../services/auth.service';
import { getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl, getDefaultApiBaseUrl } from '../config/api';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('+8801711111111');
  const [password, setPassword] = useState('AgencyPass123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Server settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [currentBaseUrl, setCurrentBaseUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [urlMessage, setUrlMessage] = useState<string | null>(null);

  useEffect(() => {
    getApiBaseUrl().then((url) => {
      setCurrentBaseUrl(url);
      setCustomUrlInput(url);
    });
  }, []);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setErrorMessage('Please enter both phone number and password');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await authService.login(phone.trim(), password);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!customUrlInput.trim()) return;
    await setApiBaseUrl(customUrlInput.trim());
    const updated = await getApiBaseUrl();
    setCurrentBaseUrl(updated);
    setUrlMessage('API URL updated successfully!');
    setTimeout(() => {
      setUrlMessage(null);
      setShowSettings(false);
    }, 1000);
  };

  const handleResetUrl = async () => {
    const defaultUrl = await resetApiBaseUrl();
    setCurrentBaseUrl(defaultUrl);
    setCustomUrlInput(defaultUrl);
    setUrlMessage('Reset to default URL');
    setTimeout(() => {
      setUrlMessage(null);
      setShowSettings(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>AGENCY PORTAL</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in with your agency admin phone number and password to manage your operations.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+88017XXXXXXXX"
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setErrorMessage(null);
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMessage(null);
                }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Server connection indicator & configuration button */}
            <TouchableOpacity
              style={styles.serverInfoBtn}
              onPress={() => setShowSettings(true)}
              activeOpacity={0.7}
            >
              <View style={styles.serverDot} />
              <Text style={styles.serverInfoText} numberOfLines={1}>
                Server: {currentBaseUrl}
              </Text>
              <Text style={styles.serverEditLink}>Edit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Server URL Config Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend API Settings</Text>
            <Text style={styles.modalSubtitle}>
              Configure the API URL to connect to your local dev machine or live production server.
            </Text>

            {urlMessage && <Text style={styles.urlSuccessText}>{urlMessage}</Text>}

            <Text style={styles.modalLabel}>Base URL</Text>
            <TextInput
              style={styles.modalInput}
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. http://192.168.1.100:1001"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalPresets}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setCustomUrlInput('http://192.168.68.108:1001')}
              >
                <Text style={styles.presetButtonText}>This Mac Wi-Fi IP: 192.168.68.108:1001</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setCustomUrlInput('http://10.0.2.2:1001')}
              >
                <Text style={styles.presetButtonText}>Android Emulator (10.0.2.2:1001)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setCustomUrlInput('http://localhost:1001')}
              >
                <Text style={styles.presetButtonText}>Localhost:1001</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={handleResetUrl}
              >
                <Text style={styles.modalResetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveUrl}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badgeContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  formCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#26334d',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#f8fafc',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  serverInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 8,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  serverInfoText: {
    color: '#64748b',
    fontSize: 12,
    flexShrink: 1,
  },
  serverEditLink: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#26334d',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 18,
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#26334d',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#f8fafc',
    marginBottom: 12,
  },
  modalPresets: {
    marginBottom: 16,
    gap: 6,
  },
  presetButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  presetButtonText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  urlSuccessText: {
    color: '#4ade80',
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalResetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 'auto',
  },
  modalResetText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 14,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
