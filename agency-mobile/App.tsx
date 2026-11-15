import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { authService, UserProfile } from './src/services/auth.service';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AviatorPredictorScreen } from './src/screens/AviatorPredictorScreen';

type AppScreen = 'dashboard' | 'aviator-predictor';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('dashboard');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const stored = await authService.getStoredUser();
        if (stored) {
          setCurrentUser(stored);
          // Try validating / refreshing in the background
          authService.fetchCurrentUser().then((fresh) => {
            if (fresh) setCurrentUser(fresh);
          });
        }
      } catch {
        // Fall back to login
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LoginScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setActiveScreen('dashboard');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {activeScreen === 'aviator-predictor' ? (
        <AviatorPredictorScreen onBack={() => setActiveScreen('dashboard')} />
      ) : (
        <DashboardScreen
          user={currentUser}
          onLogout={() => {
            setCurrentUser(null);
            setActiveScreen('dashboard');
          }}
          onOpenAviatorPredictor={() => setActiveScreen('aviator-predictor')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
