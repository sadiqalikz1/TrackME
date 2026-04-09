import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth } from '@/contexts';
import { Card, Button, Input } from '@/components/ui';

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  screen: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'budgets',
    icon: 'pie-chart',
    label: 'Budgets',
    description: 'Set and track spending limits',
    color: '#6366f1',
    screen: 'Budgets',
  },
  {
    id: 'goals',
    icon: 'flag',
    label: 'Savings Goals',
    description: 'Track your financial goals',
    color: '#10b981',
    screen: 'Goals',
  },
  {
    id: 'bank-accounts',
    icon: 'wallet',
    label: 'Bank Accounts',
    description: 'Manage your accounts and cards',
    color: '#3b82f6',
    screen: 'BankAccounts',
  },
  {
    id: 'quotations',
    icon: 'document-text',
    label: 'Quotations',
    description: 'Manage project quotations',
    color: '#3b82f6',
    screen: 'Quotations',
  },
  {
    id: 'analysis',
    icon: 'analytics',
    label: 'Analysis',
    description: 'Financial insights and trends',
    color: '#f59e0b',
    screen: 'Analysis',
  },
  {
    id: 'bills',
    icon: 'calendar',
    label: 'Bill Reminders',
    description: 'Never miss a payment',
    color: '#ef4444',
    screen: 'BillReminders',
  },
  {
    id: 'settings',
    icon: 'settings',
    label: 'Settings',
    description: 'Customize your experience',
    color: '#8b5cf6',
    screen: 'Settings',
  },
];

const MoreMenuScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user, isGuest, loginWithEmail, signupWithEmail, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Auth modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNavigate = (screen: string) => {
    navigation.navigate(screen as never);
  };

  const handleLogin = async () => {
    try {
      setError('');
      setIsLoading(true);
      await loginWithEmail(loginEmail, loginPassword);
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    try {
      setError('');
      if (signupPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      setIsLoading(true);
      await signupWithEmail(signupEmail, signupPassword, signupDisplayName);
      setShowSignupModal(false);
      setSignupEmail('');
      setSignupPassword('');
      setSignupDisplayName('');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>More</Text>
        </View>

        {/* User Card or Guest Banner */}
        {isGuest ? (
          <Card style={[styles.guestCard, { backgroundColor: colors.card }]}>
            <Ionicons name="phone-portrait" size={32} color={colors.primary} />
            <Text style={[styles.guestTitle, { color: colors.text }]}>Guest Mode</Text>
            <Text style={[styles.guestDescription, { color: colors.textMuted }]}>
              You're using the app offline. Data is saved locally only.
            </Text>
            <Button
              title="Sign In with Email"
              onPress={() => {
                setError('');
                setShowLoginModal(true);
              }}
              style={styles.authButton}
            />
            <Button
              title="Create Account"
              onPress={() => {
                setError('');
                setShowSignupModal(true);
              }}
              variant="outline"
              style={styles.authButton}
            />
          </Card>
        ) : (
          <Card style={styles.userCard}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.displayName || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                {user?.email}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.logoutButton, { backgroundColor: '#fee2e2' }]}
            >
              <Ionicons name="log-out" size={20} color="#dc2626" />
            </TouchableOpacity>
          </Card>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavigate(item.screen)}
              style={[
                styles.menuItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuDescription, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* LOGIN MODAL */}
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sign In</Text>
              <TouchableOpacity onPress={() => setShowLoginModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
                <Text style={{ color: '#dc2626' }}>{error}</Text>
              </View>
            ) : null}

            <Input
              placeholder="Email"
              value={loginEmail}
              onChangeText={setLoginEmail}
              keyboardType="email-address"
              editable={!isLoading}
              style={styles.input}
            />

            <Input
              placeholder="Password"
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
              editable={!isLoading}
              style={styles.input}
            />

            <Button
              title={isLoading ? 'Signing In...' : 'Sign In'}
              onPress={handleLogin}
              disabled={isLoading || !loginEmail || !loginPassword}
              style={styles.submitButton}
            />

            <Button
              title="Cancel"
              onPress={() => setShowLoginModal(false)}
              variant="outline"
              disabled={isLoading}
              style={styles.submitButton}
            />

            <TouchableOpacity onPress={() => { setShowLoginModal(false); setShowSignupModal(true); }}>
              <Text style={[{ color: colors.primary }, styles.switchText]}>
                Don't have an account? Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SIGNUP MODAL */}
      <Modal
        visible={showSignupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSignupModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Account</Text>
              <TouchableOpacity onPress={() => setShowSignupModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
                <Text style={{ color: '#dc2626' }}>{error}</Text>
              </View>
            ) : null}

            <Input
              placeholder="Display Name"
              value={signupDisplayName}
              onChangeText={setSignupDisplayName}
              editable={!isLoading}
              style={styles.input}
            />

            <Input
              placeholder="Email"
              value={signupEmail}
              onChangeText={setSignupEmail}
              keyboardType="email-address"
              editable={!isLoading}
              style={styles.input}
            />

            <Input
              placeholder="Password (min 6 characters)"
              value={signupPassword}
              onChangeText={setSignupPassword}
              secureTextEntry
              editable={!isLoading}
              style={styles.input}
            />

            <Button
              title={isLoading ? 'Creating...' : 'Create Account'}
              onPress={handleSignup}
              disabled={
                isLoading ||
                !signupEmail ||
                !signupPassword ||
                !signupDisplayName ||
                signupPassword.length < 6
              }
              style={styles.submitButton}
            />

            <Button
              title="Cancel"
              onPress={() => setShowSignupModal(false)}
              variant="outline"
              disabled={isLoading}
              style={styles.submitButton}
            />

            <TouchableOpacity onPress={() => { setShowSignupModal(false); setShowLoginModal(true); }}>
              <Text style={[{ color: colors.primary }, styles.switchText]}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  bottomPadding: {
    height: 100,
  },
  guestCard: {
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  guestDescription: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  authButton: {
    marginBottom: 8,
    width: '100%',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
  },
  submitButton: {
    marginBottom: 8,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '600',
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
});

export default MoreMenuScreen;
