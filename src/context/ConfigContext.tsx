import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppConfig, config as defaultConfig } from '../config';

interface ConfigContextValue {
  appConfig: AppConfig;
  setAppConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  refreshConfig: () => Promise<void>;
  isLoadingConfig: boolean;
}

const ConfigContext = createContext<ConfigContextValue>({
  appConfig: defaultConfig,
  setAppConfig: () => {},
  refreshConfig: async () => {},
  isLoadingConfig: false,
});

export function mergeWithDefaultConfig(partial: Partial<AppConfig> | null | undefined): AppConfig {
  if (!partial || typeof partial !== 'object') return defaultConfig;
  return {
    ...defaultConfig,
    ...partial,
    tulipNotes:
      Array.isArray(partial.tulipNotes) && partial.tulipNotes.length === 6
        ? (partial.tulipNotes as [string, string, string, string, string, string])
        : defaultConfig.tulipNotes,
    albumPhotos:
      Array.isArray(partial.albumPhotos) && partial.albumPhotos.length > 0
        ? partial.albumPhotos
        : defaultConfig.albumPhotos,
    illustrations: {
      ...defaultConfig.illustrations,
      ...(partial.illustrations || {}),
    },
    illustrationsPublicIds: {
      ...(defaultConfig.illustrationsPublicIds || {}),
      ...(partial.illustrationsPublicIds || {}),
    },
  };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [appConfig, setAppConfig] = useState<AppConfig>(defaultConfig);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  const refreshConfig = useCallback(async () => {
    try {
      const resp = await fetch('/api/config');
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.config) {
          setAppConfig(mergeWithDefaultConfig(json.config));
        }
      }
    } catch {
      // Fallback to defaultConfig silently
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  return (
    <ConfigContext.Provider
      value={{ appConfig, setAppConfig, refreshConfig, isLoadingConfig }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(ConfigContext);
}
