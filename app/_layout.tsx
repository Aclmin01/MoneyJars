import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '@/store/useStore';
import { useEffect, useState } from 'react';
import { AppState, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { getColors } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

export default function RootLayout() {
  const { isOnboarded, pinCode, biometricEnabled, theme, primaryColor } = useStore();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  const colors = getColors(theme, primaryColor);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleBiometricAuth = async () => {
    if (!biometricEnabled) return;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Xác thực để mở khóa Money Jars',
          fallbackLabel: 'Dùng mã PIN',
        });
        if (result.success) {
          setIsUnlocked(true);
        }
      }
    } catch (e) {
      console.log('Biometric error', e);
    }
  };

  useEffect(() => {
    if (isReady && isOnboarded && pinCode && !isUnlocked && biometricEnabled) {
      handleBiometricAuth();
    }
  }, [isReady, isOnboarded, isUnlocked, biometricEnabled]);

  useEffect(() => {
    if (!isReady) return;
    
    const inOnboardingGroup = segments[0] === 'onboarding';
    
    if (!isOnboarded && !inOnboardingGroup) {
      router.replace('/onboarding');
    } else if (isOnboarded && inOnboardingGroup) {
      router.replace('/(tabs)');
    }
  }, [isOnboarded, segments, isReady]);

  // AppState listener for background locking
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        setIsUnlocked(false);
        setPinInput('');
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const showLockScreen = isReady && isOnboarded && pinCode && !isUnlocked;

  const handleNumpad = (val: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (val === '<') {
      setPinInput(prev => prev.slice(0, -1));
    } else {
      const newVal = pinInput + val;
      setPinInput(newVal);
      if (newVal.length === 4) {
        if (newVal === pinCode) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsUnlocked(true);
          setPinInput('');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setPinInput('');
          if (Platform.OS === 'web') {
            window.alert('Mã PIN không đúng');
          }
        }
      }
    }
  };

  if (!isReady) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="onboarding" />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* Lock Screen Overlay */}
      {showLockScreen && (
        <View style={[styles.lockContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed" size={60} color={colors.primary} style={{ marginBottom: 20 }} />
            <Text style={[styles.lockTitle, { color: colors.text }]}>Nhập mã PIN</Text>
            
            {biometricEnabled && (
              <TouchableOpacity onPress={handleBiometricAuth} style={{ marginBottom: 30, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                <Ionicons name="scan" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Sử dụng Sinh trắc học</Text>
              </TouchableOpacity>
            )}

            <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map(i => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  { borderColor: colors.primary },
                  pinInput.length > i && { backgroundColor: colors.primary }
                ]} 
              />
            ))}
          </View>

          <View style={styles.numpad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', '<']
            ].map((row, i) => (
              <View key={i} style={styles.numRow}>
                {row.map((k, j) => (
                  <TouchableOpacity 
                    key={j} 
                    style={styles.numKey} 
                    onPress={() => k ? handleNumpad(k) : null}
                    disabled={!k}
                  >
                    {k === '<' ? (
                      <Ionicons name="backspace-outline" size={28} color={colors.text} />
                    ) : (
                      <Text style={[styles.numText, { color: colors.text }]}>{k}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    ...(StyleSheet.absoluteFill as any),
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 60,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginHorizontal: 15,
  },
  numpad: {
    width: '100%',
    maxWidth: 350,
  },
  numRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  numKey: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numText: {
    fontSize: 32,
    fontWeight: '500',
  }
});
