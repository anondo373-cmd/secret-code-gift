import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppConfig, config as defaultConfig } from '../config';

const LOCAL_STORAGE_CONFIG_KEY = 'love_gift_saved_config_v1';

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

function readLocalCachedConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    if (raw) {
      return mergeWithDefaultConfig(JSON.parse(raw));
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveLocalCachedConfig(cfg: AppConfig) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [appConfig, setAppConfigState] = useState<AppConfig>(
    () => readLocalCachedConfig() || defaultConfig
  );
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  const setAppConfig: React.Dispatch<React.SetStateAction<AppConfig>> = useCallback(
    (updater) => {
      setAppConfigState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        saveLocalCachedConfig(next);
        return next;
      });
    },
    []
  );

  const refreshConfig = useCallback(async () => {
    try {
      const resp = await fetch('/api/config');
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.config) {
          const merged = mergeWithDefaultConfig(json.config);
          setAppConfigState(merged);
          saveLocalCachedConfig(merged);
          return;
        }
      }

      // If the server had no config yet, but this browser has custom saved config in localStorage,
      // automatically sync it to the server so src/savedConfig.json & DB get populated!
      const localCached = readLocalCachedConfig();
      if (
        localCached &&
        JSON.stringify(localCached) !== JSON.stringify(defaultConfig)
      ) {
        await fetch('/api/sync-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: localCached }),
        }).catch(() => {});
      }
    } catch {
      // Fallback to local cached or defaultConfig silently
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
