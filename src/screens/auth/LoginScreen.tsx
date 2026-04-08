import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui';

// Note: For production, you'll need to configure Google Sign-In with expo-auth-session
// or @react-native-google-signin/google-signin
// This is a simplified version showing the UI

const LoginScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { showError } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual Google Sign-In
      // For now, show a placeholder message
      Alert.alert(
        'Setup Required',
        'To enable Google Sign-In:\n\n1. Create a Firebase project\n2. Enable Google Auth\n3. Add google-services.json\n4. Configure your .env file\n\nSee README for details.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      showError(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0f0f1a', '#1a1a2e', '#16162a'] : ['#f8fafc', '#e0e7ff', '#c7d2fe']}
      style={styles.container}
    >
      {/* Logo & Branding */}
      <View style={styles.brandingContainer}>
        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
          <Ionicons name="wallet" size={48} color="#fff" />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>FinanceFlow</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Track expenses, manage budgets,{'\n'}achieve your financial goals
        </Text>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        {[
          { icon: 'pie-chart', label: 'Expense Tracking' },
          { icon: 'bar-chart', label: 'Budget Management' },
          { icon: 'briefcase', label: 'Work Projects' },
          { icon: 'trending-up', label: 'Savings Goals' },
        ].map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={feature.icon as any} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.featureLabel, { color: colors.textSecondary }]}>
              {feature.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Sign In Button */}
      <View style={styles.authContainer}>
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: colors.card }]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Image
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={styles.googleIcon}
              />
              <Text style={[styles.googleButtonText, { color: colors.text }]}>
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.termsText, { color: colors.textMuted }]}>
          By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy
        </Text>
      </View>

      {/* Version */}
      <Text style={[styles.version, { color: colors.textMuted }]}>Version 1.0.0</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 48,
  },
  featureItem: {
    alignItems: 'center',
    width: '45%',
    paddingVertical: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  version: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    fontSize: 12,
  },
});

export default LoginScreen;
