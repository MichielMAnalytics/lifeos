'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { DEFAULT_NAV_ORDER, getPreset, type PageKey, type PagePreset } from './presets';

interface DashboardConfig {
  navMode: "sidebar" | "header";
  navOrder: string[];
  navHidden: string[];
  pagePresets: Record<string, string>;
  customTheme?: Record<string, string>;
}

const DEFAULT_CONFIG: DashboardConfig = {
  navMode: "sidebar",
  navOrder: [...DEFAULT_NAV_ORDER],
  navHidden: [],
  pagePresets: {},
};

interface DashboardConfigCtx {
  config: DashboardConfig;
  isLoading: boolean;
  isConfigMode: boolean;
  toggleConfigMode: () => void;
  setNavMode: (mode: "sidebar" | "header") => void;
  setNavOrder: (order: string[]) => void;
  togglePageVisibility: (page: string, visible: boolean) => void;
  setPagePreset: (page: string, preset: string) => void;
  getActivePreset: (page: PageKey) => PagePreset;
  resetConfig: () => void;
}

const DashboardConfigContext = createContext<DashboardConfigCtx>({
  config: DEFAULT_CONFIG,
  isLoading: true,
  isConfigMode: false,
  toggleConfigMode: () => {},
  setNavMode: () => {},
  setNavOrder: () => {},
  togglePageVisibility: () => {},
  setPagePreset: () => {},
  getActivePreset: (page) => getPreset(page, "default"),
  resetConfig: () => {},
});

export function DashboardConfigProvider({ children }: { children: React.ReactNode }) {
  const rawConfig = useQuery(api.dashboardConfig.get);
  const updateNavMode = useMutation(api.dashboardConfig.setNavMode);
  const updateNavOrder = useMutation(api.dashboardConfig.setNavOrder);
  const updateVisibility = useMutation(api.dashboardConfig.toggleVisibility);
  const updatePreset = useMutation(api.dashboardConfig.setPagePreset);
  const resetMutation = useMutation(api.dashboardConfig.reset);

  const [isConfigMode, setIsConfigMode] = useState(false);

  const isLoading = rawConfig === undefined;

  // Ensure new pages from DEFAULT_NAV_ORDER are merged into existing configs
  // life-coach is always pinned first
  const savedOrder = rawConfig?.navOrder ?? [...DEFAULT_NAV_ORDER];
  const mergedOrder = savedOrder.filter((p) => p !== 'life-coach');
  for (const page of DEFAULT_NAV_ORDER) {
    if (page !== 'life-coach' && !mergedOrder.includes(page)) {
      mergedOrder.push(page);
    }
  }
  mergedOrder.unshift('life-coach');

  const config: DashboardConfig = rawConfig
    ? {
        navMode: (rawConfig.navMode as "sidebar" | "header") ?? "sidebar",
        navOrder: mergedOrder,
        navHidden: rawConfig.navHidden ?? [],
        pagePresets: (rawConfig.pagePresets ?? {}) as Record<string, string>,
        customTheme: rawConfig.customTheme as Record<string, string> | undefined,
      }
    : DEFAULT_CONFIG;

  const toggleConfigMode = useCallback(() => setIsConfigMode(prev => !prev), []);

  const setNavMode = useCallback((mode: "sidebar" | "header") => {
    void updateNavMode({ mode });
  }, [updateNavMode]);

  const setNavOrder = useCallback((order: string[]) => {
    void updateNavOrder({ order });
  }, [updateNavOrder]);

  const togglePageVisibility = useCallback((page: string, visible: boolean) => {
    void updateVisibility({ page, visible });
  }, [updateVisibility]);

  const setPagePreset = useCallback((page: string, preset: string) => {
    void updatePreset({ page, preset });
  }, [updatePreset]);

  const getActivePreset = useCallback((page: PageKey): PagePreset => {
    const presetKey = config.pagePresets[page] ?? "default";
    return getPreset(page, presetKey);
  }, [config.pagePresets]);

  const resetConfig = useCallback(() => {
    void resetMutation();
  }, [resetMutation]);

  return (
    <DashboardConfigContext.Provider value={{
      config, isLoading, isConfigMode, toggleConfigMode,
      setNavMode, setNavOrder, togglePageVisibility,
      setPagePreset, getActivePreset, resetConfig,
    }}>
      {children}
    </DashboardConfigContext.Provider>
  );
}

export const useDashboardConfig = () => useContext(DashboardConfigContext);
