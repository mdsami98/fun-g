import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  BackHandler,
  ToastAndroid,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { serverConfig } from './src/config/server';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Server edit modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const lastBackPressRef = useRef<number>(0);

  // Initialize server URL from local storage
  useEffect(() => {
    serverConfig.getStoredServerUrl().then((url) => {
      setServerUrl(url);
      setInputUrl(url);
    });
  }, []);

  // Handle hardware Android back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressRef.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => subscription.remove();
  }, [canGoBack]);

  const handleSaveServerUrl = async () => {
    let cleanUrl = inputUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }
    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/+$/, '');

    await serverConfig.setStoredServerUrl(cleanUrl);
    setServerUrl(cleanUrl);
    setInputUrl(cleanUrl);
    setIsModalVisible(false);
    setHasError(false);
    setIsLoading(true);
  };

  const handleResetServerUrl = async () => {
    const defaultUrl = await serverConfig.resetServerUrl();
    setServerUrl(defaultUrl);
    setInputUrl(defaultUrl);
    setIsModalVisible(false);
    setHasError(false);
    setIsLoading(true);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  if (!serverUrl) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Initializing CkasH Gaming App...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="light" backgroundColor="#090d16" />

      {/* Progress Bar */}
      {isLoading && loadProgress < 1 && (
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.max(10, Math.round(loadProgress * 100))}%` },
            ]}
          />
        </View>
      )}

      {/* Main WebView */}
      {!hasError ? (
        <WebView
          ref={webViewRef}
          source={{ uri: serverUrl }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          allowsBackForwardNavigationGestures={true}
          pullToRefreshEnabled={true}
          cacheEnabled={true}
          hardwareAccelerationAndroid={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          onLoadProgress={({ nativeEvent }) => {
            setLoadProgress(nativeEvent.progress);
          }}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            setHasError(true);
            setErrorMessage(
              nativeEvent.description || 'Could not connect to the gaming server.'
            );
            setIsLoading(false);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 500) {
              setHasError(true);
              setErrorMessage(`Server Error (${nativeEvent.statusCode})`);
            }
          }}
        />
      ) : (
        /* Error / Offline Screen */
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Connection Problem</Text>
          <Text style={styles.errorMessage}>
            {errorMessage || 'Unable to establish connection with gaming platform.'}
          </Text>

          <View style={styles.urlDisplayCard}>
            <Text style={styles.urlDisplayLabel}>Target Server URL:</Text>
            <Text style={styles.urlDisplayText}>{serverUrl}</Text>
          </View>

          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>🔄 Retry Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.configButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.configButtonText}>⚙️ Change Server Address</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Server Configuration Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure Server Address</Text>
            <Text style={styles.modalSubtitle}>
              Enter your local LAN IP (e.g. http://192.168.1.50:1002) or production domain.
            </Text>

            <TextInput
              style={styles.input}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="http://192.168.1.X:1002"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetServerUrl}
              >
                <Text style={styles.resetBtnText}>Reset Default</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.saveBtnText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 15,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: '#1e293b',
    width: '100%',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#f59e0b',
  },
  webView: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 320,
  },
  urlDisplayCard: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  urlDisplayLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  urlDisplayText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#090d16',
    fontSize: 16,
    fontWeight: '700',
  },
  configButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  configButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  resetBtnText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#090d16',
    fontWeight: '700',
    fontSize: 14,
  },
});
