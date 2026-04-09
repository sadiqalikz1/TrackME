import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAuth } from '@/contexts';
import { RootStackParamList } from '@/types';
import { AddOptionsModal } from '@/components/ui';

// Auth Screens
import LoginScreen from '@/screens/auth/LoginScreen';

// Main Screens
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import TransactionsScreen from '@/screens/transactions/TransactionsScreen';
import WorkScreen from '@/screens/work/WorkScreen';
import WorkDashboardScreen from '@/screens/work/WorkDashboardScreen';
import WorkDetailScreen from '@/screens/work/WorkDetailScreen';
import MoreMenuScreen from '@/screens/more/MoreMenuScreen';
import BudgetsScreen from '@/screens/budgets/BudgetsScreen';
import GoalsScreen from '@/screens/goals/GoalsScreen';
import QuotationsScreen from '@/screens/quotations/QuotationsScreen';
import QuotationDetailScreen from '@/screens/quotations/QuotationDetailScreen';
import AnalysisScreen from '@/screens/analysis/AnalysisScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import BillRemindersScreen from '@/screens/settings/BillRemindersScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();
const WorkStack = createNativeStackNavigator();

// Work Stack Navigator
const WorkStackNavigator = () => {
  const { colors } = useTheme();
  
  return (
    <WorkStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <WorkStack.Screen name="WorkDashboard" component={WorkDashboardScreen} />
      <WorkStack.Screen name="WorkMain" component={WorkScreen} />
      <WorkStack.Screen name="WorkDetail" component={WorkDetailScreen} />
    </WorkStack.Navigator>
  );
};

// More Stack Navigator
const MoreStackNavigator = () => {
  const { colors } = useTheme();

  return (
    <MoreStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <MoreStack.Screen name="Budgets" component={BudgetsScreen} />
      <MoreStack.Screen name="Goals" component={GoalsScreen} />
      <MoreStack.Screen name="Quotations" component={QuotationsScreen} />
      <MoreStack.Screen name="QuotationDetail" component={QuotationDetailScreen} />
      <MoreStack.Screen name="Analysis" component={AnalysisScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="BillReminders" component={BillRemindersScreen} />
    </MoreStack.Navigator>
  );
};

// Custom Tab Bar Button for Add Options
const AddTabButton: React.FC<{ onPress?: (e?: any) => void }> = ({ onPress }) => {
  const { colors } = useTheme();
  const [rotateAnim] = useState(new Animated.Value(0));

  const handlePress = (e: any) => {
    Animated.spring(rotateAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start(() => {
      rotateAnim.setValue(0);
    });

    onPress?.(e);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.addButton,
        {
          transform: [{ rotate: rotateInterpolate }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.addButtonInner, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Tab Navigator
const MainTabNavigator = () => {
  const { colors } = useTheme();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const navigation = useNavigation<any>();

  const addOptions = [
    {
      id: 'transaction',
      label: 'Transaction',
      icon: 'swap-horizontal',
      color: '#3b82f6',
      onPress: () => {
        setAddModalVisible(false);
        // Navigate to Transactions and trigger add modal via route params
        navigation.navigate('Transactions', { openAddModal: true });
      },
    },
    {
      id: 'quotation',
      label: 'Quotation',
      icon: 'document-text',
      color: '#8b5cf6',
      onPress: () => {
        setAddModalVisible(false);
        // Navigate to More menu, then Quotations with create flag
        navigation.navigate('More', { 
          screen: 'Quotations',
          params: { openCreateModal: true }
        });
      },
    },
    {
      id: 'work',
      label: 'Work',
      icon: 'briefcase',
      color: '#10b981',
      onPress: () => {
        setAddModalVisible(false);
        // Navigate to Work main screen then to create
        navigation.navigate('Work', { 
          screen: 'WorkMain',
          params: { openCreateModal: true }
        });
      },
    },
    {
      id: 'goal',
      label: 'Goal',
      icon: 'target',
      color: '#f59e0b',
      onPress: () => {
        setAddModalVisible(false);
        // Navigate to More menu, then Goals with create flag
        navigation.navigate('More', {
          screen: 'Goals',
          params: { openCreateModal: true }
        });
      },
    },
  ];

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.border,
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string = 'home';

            switch (route.name) {
              case 'Dashboard':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Transactions':
                iconName = focused ? 'list' : 'list-outline';
                break;
              case 'Work':
                iconName = focused ? 'briefcase' : 'briefcase-outline';
                break;
              case 'More':
                iconName = focused ? 'grid' : 'grid-outline';
                break;
            }

            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen 
          name="Transactions" 
          component={TransactionsScreen}
          options={{
            tabBarLabel: 'Income',
          }}
        />
        <Tab.Screen
          name="AddTransaction"
          component={View}
          options={{
            tabBarLabel: '',
            tabBarButton: (props) => <AddTabButton {...props} />,
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              setAddModalVisible(true);
            },
          })}
        />
        <Tab.Screen 
          name="Work" 
          component={WorkStackNavigator}
          options={{
            tabBarLabel: 'Work',
          }}
        />
        <Tab.Screen 
          name="More" 
          component={MoreStackNavigator}
          options={{
            tabBarLabel: 'Menu',
          }}
        />
      </Tab.Navigator>

      <AddOptionsModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        options={addOptions}
      />
    </>
  );
};

// Root Navigator
export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        {/* Loading screen */}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default RootNavigator;
