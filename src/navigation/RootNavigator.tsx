import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

// Screens
import LoginScreen from '@/screens/auth/LoginScreen';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import TransactionsScreen from '@/screens/transactions/TransactionsScreen';
import WorkScreen from '@/screens/work/WorkScreen';
import WorkDetailScreen from '@/screens/work/WorkDetailScreen';
import BudgetsScreen from '@/screens/budgets/BudgetsScreen';
import GoalsScreen from '@/screens/goals/GoalsScreen';
import AnalysisScreen from '@/screens/analysis/AnalysisScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import BillRemindersScreen from '@/screens/settings/BillRemindersScreen';
import MoreMenuScreen from '@/screens/more/MoreMenuScreen';

import { RootStackParamList, MainTabParamList, MoreStackParamList } from '@/types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

// More Stack Navigator
const MoreStackNavigator = () => {
  const { colors } = useTheme();

  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MoreStack.Screen
        name="MoreMenu"
        component={MoreMenuScreen}
        options={{ headerShown: false }}
      />
      <MoreStack.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ title: 'Budgets' }}
      />
      <MoreStack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: 'Savings Goals' }}
      />
      <MoreStack.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{ title: 'Analysis' }}
      />
      <MoreStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <MoreStack.Screen
        name="BillReminders"
        component={BillRemindersScreen}
        options={{ title: 'Bill Reminders' }}
      />
    </MoreStack.Navigator>
  );
};

// Custom Add Button Component
const AddButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.addButton, { backgroundColor: colors.primary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={32} color="#fff" />
    </TouchableOpacity>
  );
};

// Tab Navigator
const TabNavigator = () => {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'AddTransaction':
              iconName = 'add-circle';
              break;
            case 'Work':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'More':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: 'Transactions' }}
      />
      <Tab.Screen
        name="AddTransaction"
        component={DashboardScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => (
            <AddButton onPress={() => {
              // This will be handled by the screen to show add modal
              if (props.onPress) {
                props.onPress({} as any);
              }
            }} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // Navigate to transactions with add modal flag
            navigation.navigate('Transactions', { openAddModal: true });
          },
        })}
      />
      <Tab.Screen
        name="Work"
        component={WorkScreen}
        options={{ title: 'Work Projects' }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
export const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        {/* Add splash screen or loading indicator */}
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="Main" component={TabNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default RootNavigator;
