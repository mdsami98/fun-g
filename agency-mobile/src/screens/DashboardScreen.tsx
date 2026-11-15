import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { authService, UserProfile } from '../services/auth.service';

interface DashboardScreenProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenAviatorPredictor: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user: initialUser,
  onLogout,
  onOpenAviatorPredictor,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const refreshed = await authService.fetchCurrentUser();
      if (refreshed) {
        setCurrentUser(refreshed);
      }
    } catch {
      // Ignore
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            onLogout();
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>Agency Portal</Text>
          <Text style={styles.topBarSubtitle}>Management App</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogoutPress}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Success / Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconWrap}>
            <Text style={styles.statusCheckmark}>✓</Text>
          </View>
          <Text style={styles.statusTitle}>You are logged in!</Text>
          <Text style={styles.statusMessage}>
            Connected to agency systems as an active administrator.
          </Text>
          <View style={styles.pillBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.pillText}>Session Active</Text>
          </View>
        </View>

        {/* Predict Aviator Score Feature Card */}
        <TouchableOpacity
          style={styles.aviatorCard}
          onPress={onOpenAviatorPredictor}
          activeOpacity={0.85}
        >
          <View style={styles.aviatorCardGlow} />
          <View style={styles.aviatorCardContent}>
            <View style={styles.aviatorBadgeRow}>
              <View style={styles.aviatorTagBadge}>
                <Text style={styles.aviatorTagText}>✈ LIVE ENGINE</Text>
              </View>
              <View style={styles.pulseContainer}>
                <View style={styles.pulseDot} />
                <Text style={styles.pulseText}>INSTANT 2S PREDICTOR</Text>
              </View>
            </View>

            <Text style={styles.aviatorTitle}>Predict Aviator Score</Text>
            <Text style={styles.aviatorDesc}>
              Real-time trajectory analysis. View the exact crash score 2s after every round crash while users wait on the 10s countdown.
            </Text>

            <View style={styles.aviatorButtonRow}>
              <View style={styles.aviatorLaunchButton}>
                <Text style={styles.aviatorLaunchText}>Open Predictor Screen →</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Agency Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeader}>Agency Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Agency Name</Text>
            <Text style={styles.infoValue}>
              {currentUser.agency?.name || 'Assigned Agency'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Agency Code</Text>
            <Text style={styles.infoValueCode}>
              {currentUser.agency?.code || 'N/A'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.roleBadge}>{currentUser.role || 'AGENCY_ADMIN'}</Text>
          </View>
        </View>

        {/* Admin User Details */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeader}>Admin Account</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{currentUser.name || 'Admin User'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{currentUser.phone}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Status</Text>
            <Text style={styles.activeStatusText}>
              {currentUser.isActive !== false ? 'Active' : 'Suspended'}
            </Text>
          </View>
        </View>

        {/* Refresh Action */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={refreshing}
          activeOpacity={0.8}
        >
          {refreshing ? (
            <ActivityIndicator color="#60a5fa" size="small" />
          ) : (
            <Text style={styles.refreshBtnText}>⟳ Refresh Account Data</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  statusCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  statusIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  statusCheckmark: {
    color: '#22c55e',
    fontSize: 30,
    fontWeight: '900',
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  statusMessage: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  pillText: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '600',
  },
  infoValueCode: {
    fontSize: 13,
    color: '#60a5fa',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadge: {
    fontSize: 12,
    color: '#c084fc',
    fontWeight: '700',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeStatusText: {
    color: '#4ade80',
    fontWeight: '700',
    fontSize: 13,
  },
  refreshBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#26334d',
    marginTop: 4,
    marginBottom: 20,
  },
  refreshBtnText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
  // Aviator Predictor Card Styles
  aviatorCard: {
    backgroundColor: '#16111e',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e11d48',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  aviatorCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e11d48',
  },
  aviatorCardContent: {
    padding: 20,
  },
  aviatorBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aviatorTagBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.4)',
  },
  aviatorTagText: {
    color: '#fb7185',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  pulseText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  aviatorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 6,
  },
  aviatorDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 16,
  },
  aviatorButtonRow: {
    alignItems: 'flex-start',
  },
  aviatorLaunchButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  aviatorLaunchText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});

