import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import RootNavigator from '@/navigation/RootNavigator';
import { initializeFirebase } from '@/services/firebase';
import '../global.css';

// Initialize Firebase
initializeFirebase();

// Keep splash screen visible until we're ready
SplashScreen.preventAutoHideAsync();

// Ignore some harmless warnings
LogBox.ignoreLogs([
  'AsyncStorage has been extracted',
  'Setting a timer',
  'VirtualizedLists should never be nested',
]);

const AppContent: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { user, isLoading } = useAuth();
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [isBiometricCheck, setIsBiometricCheck] = useState(true);

  useEffect(() => {
    const checkBiometric = async () => {
      // If user is logged in and has biometric enabled
      if (user?.biometricEnabled) {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        if (compatible && enrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verify your identity',
            fallbackLabel: 'Use passcode',
            disableDeviceFallback: false,
          });

          setIsBiometricVerified(result.success);
        } else {
          setIsBiometricVerified(true);
        }
      } else {
        setIsBiometricVerified(true);
      }
      setIsBiometricCheck(false);
    };

    if (!isLoading) {
      checkBiometric();
    }
  }, [user, isLoading]);

  useEffect(() => {
    const hideSplash = async () => {
      if (!isLoading && !isBiometricCheck) {
        await SplashScreen.hideAsync();
      }
    };
    hideSplash();
  }, [isLoading, isBiometricCheck]);

  // Still loading or checking biometrics
  if (isLoading || isBiometricCheck) {
    return null;
  }

  // User has biometric enabled but not verified
  if (user?.biometricEnabled && !isBiometricVerified) {
    return null;
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      <RootNavigator />
    </>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
