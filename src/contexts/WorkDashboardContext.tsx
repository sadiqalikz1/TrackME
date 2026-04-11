import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkDashboardConfig, WorkDashboardCard, WorkDashboardCardId } from '@/types';
import { WORK_DASHBOARD_DEFAULT_CONFIG } from '@/utils/constants';

const WORK_DASHBOARD_STORAGE_KEY = 'WORK_DASHBOARD_CONFIG';

interface WorkDashboardContextType {
  config: WorkDashboardConfig;
  isLoading: boolean;
  toggleCardVisibility: (cardId: WorkDashboardCardId) => Promise<void>;
  reorderCards: (cards: WorkDashboardCard[]) => Promise<void>;
  updateCardColor: (cardId: WorkDashboardCardId, color: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
  getEnabledCards: () => WorkDashboardCard[];
}

const WorkDashboardContext = createContext<WorkDashboardContextType | undefined>(undefined);

export const useWorkDashboard = (): WorkDashboardContextType => {
  const context = useContext(WorkDashboardContext);
  if (!context) {
    throw new Error('useWorkDashboard must be used within a WorkDashboardProvider');
  }
  return context;
};

interface WorkDashboardProviderProps {
  children: ReactNode;
}

export const WorkDashboardProvider: React.FC<WorkDashboardProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<WorkDashboardConfig>(WORK_DASHBOARD_DEFAULT_CONFIG as any);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkDashboardConfig();
  }, []);

  const loadWorkDashboardConfig = async () => {
    try {
      setIsLoading(true);
      const savedConfig = await AsyncStorage.getItem(WORK_DASHBOARD_STORAGE_KEY);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig) as WorkDashboardConfig;
        setConfig(parsedConfig);
      } else {
        setConfig(WORK_DASHBOARD_DEFAULT_CONFIG);
      }
    } catch (error) {
      console.error('Error loading work dashboard config:', error);
      setConfig(WORK_DASHBOARD_DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWorkDashboardConfig = async (newConfig: WorkDashboardConfig) => {
    try {
      await AsyncStorage.setItem(WORK_DASHBOARD_STORAGE_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (error) {
      console.error('Error saving work dashboard config:', error);
    }
  };

  const toggleCardVisibility = async (cardId: WorkDashboardCardId) => {
    const updatedCards = config.cards.map((card) =>
      card.id === cardId ? { ...card, enabled: !card.enabled } : card
    );
    const newConfig: WorkDashboardConfig = {
      ...config,
      cards: updatedCards,
      lastUpdated: Date.now(),
    };
    await saveWorkDashboardConfig(newConfig);
  };

  const reorderCards = async (cards: WorkDashboardCard[]) => {
    const newConfig: WorkDashboardConfig = {
      ...config,
      cards: cards.map((card, index) => ({ ...card, position: index })),
      lastUpdated: Date.now(),
    };
    await saveWorkDashboardConfig(newConfig);
  };

  const updateCardColor = async (cardId: WorkDashboardCardId, color: string) => {
    const updatedCards = config.cards.map((card) =>
      card.id === cardId ? { ...card, customColor: color } : card
    );
    const newConfig: WorkDashboardConfig = {
      ...config,
      cards: updatedCards,
      lastUpdated: Date.now(),
    };
    await saveWorkDashboardConfig(newConfig);
  };

  const resetToDefault = async () => {
    const newConfig: WorkDashboardConfig = {
      ...WORK_DASHBOARD_DEFAULT_CONFIG,
      lastUpdated: Date.now(),
    };
    await saveWorkDashboardConfig(newConfig);
  };

  const getEnabledCards = () => {
    return config.cards
      .filter((card) => card.enabled)
      .sort((a, b) => a.position - b.position);
  };

  const value: WorkDashboardContextType = {
    config,
    isLoading,
    toggleCardVisibility,
    reorderCards,
    updateCardColor,
    resetToDefault,
    getEnabledCards,
  };

  return (
    <WorkDashboardContext.Provider value={value}>
      {children}
    </WorkDashboardContext.Provider>
  );
};
