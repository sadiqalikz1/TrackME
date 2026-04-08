import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colors: ThemeColors;
}

interface ThemeColors {
  // Backgrounds
  background: string;
  card: string;
  cardSecondary: string;
  surface: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Primary
  primary: string;
  primaryLight: string;
  
  // Semantic
  success: string;
  warning: string;
  danger: string;
  info: string;
  
  // Border
  border: string;
  borderLight: string;
  
  // Input
  inputBackground: string;
  inputBorder: string;
  
  // Tab bar
  tabBarBackground: string;
  tabBarInactive: string;
}

const lightColors: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  cardSecondary: '#f1f5f9',
  surface: '#ffffff',
  
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  
  primary: '#6366f1',
  primaryLight: '#818cf8',
  
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  
  inputBackground: '#f8fafc',
  inputBorder: '#e2e8f0',
  
  tabBarBackground: '#ffffff',
  tabBarInactive: '#94a3b8',
};

const darkColors: ThemeColors = {
  background: '#0f0f1a',
  card: '#1a1a2e',
  cardSecondary: '#16162a',
  surface: '#1e1e2e',
  
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  
  primary: '#818cf8',
  primaryLight: '#a5b4fc',
  
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#60a5fa',
  
  border: '#2d2d44',
  borderLight: '#1e1e2e',
  
  inputBackground: '#16162a',
  inputBorder: '#2d2d44',
  
  tabBarBackground: '#1a1a2e',
  tabBarInactive: '#64748b',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(STORAGE_KEYS.theme);
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setThemeState(storedTheme);
      } else {
        setThemeState(systemColorScheme || 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.theme, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  const value: ThemeContextType = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
    colors,
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
