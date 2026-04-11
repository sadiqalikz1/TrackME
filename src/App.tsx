import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AuthProvider, ThemeProvider, NotificationProvider, DashboardProvider, WorkDashboardProvider, useTheme, useAuth } from '@/contexts';
import { NotificationToast } from '@/components';
import { DataSyncStrategyModal } from '@/components/ui';
import RootNavigator from '@/navigation/RootNavigator';
import '../global.css';

const AppContent: React.FC = () => {
  const { isDark } = useTheme();
  const { showSyncModal, localDataCount, cloudDataExists, handleSyncStrategy, dismissSyncModal } = useAuth();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
      <NotificationToast />
      <DataSyncStrategyModal
        visible={showSyncModal}
        onClose={dismissSyncModal}
        onSelectStrategy={handleSyncStrategy}
        localDataCount={localDataCount}
        cloudDataExists={cloudDataExists}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <DashboardProvider>
              <WorkDashboardProvider>
                <NotificationProvider>
                  <AppContent />
                </NotificationProvider>
              </WorkDashboardProvider>
            </DashboardProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
