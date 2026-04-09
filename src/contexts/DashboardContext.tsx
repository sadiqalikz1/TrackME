import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardConfig, DashboardCard, DashboardCardId } from '@/types';
import { STORAGE_KEYS, DASHBOARD_DEFAULT_CONFIG } from '@/utils/constants';

interface DashboardContextType {
  config: DashboardConfig;
  isLoading: boolean;
  toggleCardVisibility: (cardId: DashboardCardId) => Promise<void>;
  reorderCards: (cards: DashboardCard[]) => Promise<void>;
  updateCardColor: (cardId: DashboardCardId, color: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
  getEnabledCards: () => DashboardCard[];
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<DashboardConfig>(DASHBOARD_DEFAULT_CONFIG as any);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardConfig();
  }, []);

  const loadDashboardConfig = async () => {
    try {
      setIsLoading(true);
      const savedConfig = await AsyncStorage.getItem(STORAGE_KEYS.DASHBOARD_CONFIG);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig) as DashboardConfig;
        setConfig(parsedConfig);
      } else {
        setConfig(DASHBOARD_DEFAULT_CONFIG);
      }
    } catch (error) {
      console.error('Error loading dashboard config:', error);
      setConfig(DASHBOARD_DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDashboardConfig = async (newConfig: DashboardConfig) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DASHBOARD_CONFIG, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (error) {
      console.error('Error saving dashboard config:', error);
    }
  };

  const toggleCardVisibility = async (cardId: DashboardCardId) => {
    const updatedCards = config.cards.map((card) =>
      card.id === cardId ? { ...card, enabled: !card.enabled } : card
    );
    const newConfig: DashboardConfig = {
      ...config,
      cards: updatedCards,
      lastUpdated: Date.now(),
    };
    await saveDashboardConfig(newConfig);
  };

  const reorderCards = async (cards: DashboardCard[]) => {
    const newConfig: DashboardConfig = {
      ...config,
      cards: cards.map((card, index) => ({ ...card, position: index })),
      lastUpdated: Date.now(),
    };
    await saveDashboardConfig(newConfig);
  };

  const updateCardColor = async (cardId: DashboardCardId, color: string) => {
    const updatedCards = config.cards.map((card) =>
      card.id === cardId ? { ...card, customColor: color } : card
    );
    const newConfig: DashboardConfig = {
      ...config,
      cards: updatedCards,
      lastUpdated: Date.now(),
    };
    await saveDashboardConfig(newConfig);
  };

  const resetToDefault = async () => {
    const newConfig: DashboardConfig = {
      ...DASHBOARD_DEFAULT_CONFIG,
      lastUpdated: Date.now(),
    };
    await saveDashboardConfig(newConfig);
  };

  const getEnabledCards = () => {
    return config.cards.filter((card) => card.enabled).sort((a, b) => a.position - b.position);
  };

  const value: DashboardContextType = {
    config,
    isLoading,
    toggleCardVisibility,
    reorderCards,
    updateCardColor,
    resetToDefault,
    getEnabledCards,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export default DashboardContext;
