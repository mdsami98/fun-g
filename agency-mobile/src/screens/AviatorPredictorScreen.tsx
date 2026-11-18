import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { gameService, PredictionData } from '../services/game.service';

interface AviatorPredictorScreenProps {
  onBack: () => void;
}

export const AviatorPredictorScreen: React.FC<AviatorPredictorScreenProps> = ({ onBack }) => {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [displayedScore, setDisplayedScore] = useState<string>('--');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');

  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreScaleAnim = useRef(new Animated.Value(1)).current;
  const scoreOpacityAnim = useRef(new Animated.Value(1)).current;

  // Track previous state to detect crash transition
  const prevPhaseRef = useRef<string | null>(null);
  const lastProcessedCrashIdRef = useRef<string | null>(null);
  const isCalculatingRef = useRef<boolean>(false);
  const calcIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Continuous Radar Beam Rotation
  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotation.start();

    // Pulsing circle wave
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      rotation.stop();
      pulse.stop();
      if (calcIntervalRef.current) clearInterval(calcIntervalRef.current);
    };
  }, []);

  // 2. Trigger 2-Second Prediction Calculation (Runs strictly once per crash)
  const trigger2SecondCalculation = (nextScore: string) => {
    if (calcIntervalRef.current) clearInterval(calcIntervalRef.current);

    setIsCalculating(true);
    isCalculatingRef.current = true;
    setScanProgress(0);

    // Animate score exit
    Animated.timing(scoreOpacityAnim, {
      toValue: 0.2,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // 2-second progress ticker
    const startTime = Date.now();
    const duration = 2000; // Exactly 2 seconds

    calcIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      setScanProgress(pct);

      if (elapsed >= duration) {
        if (calcIntervalRef.current) clearInterval(calcIntervalRef.current);
        setDisplayedScore(nextScore);
        setIsCalculating(false);
        isCalculatingRef.current = false;

        // Pop in the new score
        scoreScaleAnim.setValue(1.3);
        scoreOpacityAnim.setValue(0);
        Animated.parallel([
          Animated.spring(scoreScaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(scoreOpacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 40);
  };

  // 3. Real-time Polling / Engine Sync
  useEffect(() => {
    let mounted = true;

    const fetchEngineState = async () => {
      try {
        const data = await gameService.getPrediction();
        if (!mounted) return;
        setConnectionStatus('connected');
        setPrediction(data);

        const currentPhase = data.phase;
        const currentRoundId = data.roundId;
        const targetScore = data.targetCrashPoint ?? data.nextQueuedCrashPoint ?? '2.00';

        // Initial load: show score immediately if not set yet
        if (displayedScore === '--' && !isCalculatingRef.current) {
          setDisplayedScore(targetScore);
        }

        // Detect crash event (triggered ONLY when plane crashes, once per crash)
        const isCrashed = currentPhase === 'crashed';
        const crashId =
          currentRoundId ?? (data.history && data.history.length > 0 ? data.history[0].roundId : data.timestamp);

        const hasNotCalculatedForThisCrash =
          crashId !== null && lastProcessedCrashIdRef.current !== crashId;

        if (isCrashed && hasNotCalculatedForThisCrash && !isCalculatingRef.current) {
          lastProcessedCrashIdRef.current = crashId;
          trigger2SecondCalculation(targetScore);
        }

        prevPhaseRef.current = currentPhase;
      } catch {
        if (mounted) setConnectionStatus('error');
      }
    };

    // Initial fetch
    fetchEngineState();

    // Sync every 800ms
    const pollTimer = setInterval(fetchEngineState, 800);

    return () => {
      mounted = false;
      clearInterval(pollTimer);
    };
  }, [displayedScore]);

  // Interpolate rotation angle
  const spinInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getPillColor = (scoreStr: string) => {
    const val = parseFloat(scoreStr);
    if (val >= 10) return styles.pillGold;
    if (val >= 2) return styles.pillPurple;
    return styles.pillBlue;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.brandTitleContainer}>
          <Text style={styles.planeIcon}>✈</Text>
          <Text style={styles.brandTitle}>AVIATOR PREDICTOR</Text>
        </View>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.connectionDot,
              connectionStatus === 'connected' && styles.dotGreen,
              connectionStatus === 'error' && styles.dotRed,
            ]}
          />
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Subtitle / Mode Notice */}
        <View style={styles.modeNotice}>
          <Text style={styles.modeNoticeTitle}>ENGINE SYNCED PREDICTOR</Text>
          <Text style={styles.modeNoticeSubtitle}>
            Accurate next crash point delivered 2 seconds after every round crash.
          </Text>
        </View>

        {/* Radar Circular Animation Container */}
        <View style={styles.radarWrapper}>
          {/* Pulsing Outer Glow Ring */}
          <Animated.View
            style={[
              styles.radarOuterRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Rotating Scanner Needle */}
          <Animated.View
            style={[
              styles.radarScannerContainer,
              {
                transform: [{ rotate: spinInterpolate }],
              },
            ]}
          >
            <View style={styles.radarScannerBeam} />
          </Animated.View>

          {/* Central Circular Display Card */}
          <View style={styles.radarCenterCircle}>
            {isCalculating ? (
              <View style={styles.calcContainer}>
                <Text style={styles.calcIcon}>⚡</Text>
                <Text style={styles.calcLabel}>CALCULATING</Text>
                <Text style={styles.calcProgress}>{scanProgress}%</Text>
                <Text style={styles.calcSub}>Next Trajectory Lock</Text>
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.scoreContainer,
                  {
                    transform: [{ scale: scoreScaleAnim }],
                    opacity: scoreOpacityAnim,
                  },
                ]}
              >
                <Text style={styles.targetLabel}>NEXT CRASH POINT</Text>
                <Text style={styles.scoreText}>{displayedScore}x</Text>
                <View style={styles.guaranteedBadge}>
                  <Text style={styles.guaranteedText}>✓ PREDICTED TARGET</Text>
                </View>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Live Game Status Bar */}
        <View style={styles.statusBarCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Live Aviator Phase</Text>
            <Text
              style={[
                styles.phaseText,
                prediction?.phase === 'running' && styles.phaseRunning,
                prediction?.phase === 'betting' && styles.phaseBetting,
                prediction?.phase === 'crashed' && styles.phaseCrashed,
              ]}
            >
              {isCalculating
                ? 'CRASH DETECTED (ANALYZING)'
                : prediction?.phase === 'running'
                ? `✈ FLYING (NOW: ${prediction.liveMultiplier}x)`
                : prediction?.phase === 'betting'
                ? 'WAITING FOR TAKEOFF'
                : 'ROUND CRASHED'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>User App Delay</Text>
            <Text style={styles.statusRowValue}>~10s Countdown Bar</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Agency Predictor Delay</Text>
            <Text style={styles.statusRowValueHighlight}>2.0s (Instant Lock)</Text>
          </View>
        </View>

        {/* Recent Crashes History */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>RECENT CRASH HISTORY</Text>
          <View style={styles.historyPillsContainer}>
            {prediction?.history && prediction.history.length > 0 ? (
              prediction.history.slice(0, 7).map((item, index) => (
                <View key={item.roundId || index} style={[styles.historyPill, getPillColor(item.crashPoint)]}>
                  <Text style={styles.historyPillText}>{item.crashPoint}x</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyHistoryText}>Loading crash history...</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070a10',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2234',
    backgroundColor: '#0c101a',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#161f30',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  brandTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planeIcon: {
    fontSize: 18,
    color: '#e11d48',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1.1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161f30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#94a3b8',
  },
  dotGreen: {
    backgroundColor: '#22c55e',
  },
  dotRed: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  modeNotice: {
    alignItems: 'center',
    marginBottom: 28,
  },
  modeNoticeTitle: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  modeNoticeSubtitle: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
  },
  // Radar Animation Container
  radarWrapper: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  radarOuterRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: 'rgba(225, 29, 72, 0.4)',
    backgroundColor: 'rgba(225, 29, 72, 0.04)',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  radarScannerContainer: {
    position: 'absolute',
    width: 280,
    height: 280,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  radarScannerBeam: {
    width: 4,
    height: 140,
    backgroundColor: '#e11d48',
    borderRadius: 2,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  radarCenterCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#0d1320',
    borderWidth: 3,
    borderColor: '#e11d48',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },
  // Score Inside Circle
  scoreContainer: {
    alignItems: 'center',
  },
  targetLabel: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(225, 29, 72, 0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginVertical: 2,
  },
  guaranteedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginTop: 4,
  },
  guaranteedText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
  },
  // Calculating Phase Inside Circle
  calcContainer: {
    alignItems: 'center',
  },
  calcIcon: {
    fontSize: 26,
    color: '#eab308',
    marginBottom: 4,
  },
  calcLabel: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  calcProgress: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 2,
  },
  calcSub: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  // Status Card
  statusBarCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 26,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRowLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  statusRowValue: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  statusRowValueHighlight: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '800',
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phaseRunning: {
    color: '#60a5fa',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  phaseBetting: {
    color: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  phaseCrashed: {
    color: '#f43f5e',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  // History
  historyCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 16,
  },
  historyTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  historyPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  pillPurple: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  pillGold: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  historyPillText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyHistoryText: {
    color: '#64748b',
    fontSize: 12,
  },
});
