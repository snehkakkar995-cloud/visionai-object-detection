import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, saveSettings } from '../services/api.js';

export const DEFAULT_SETTINGS = {
  default_confidence: 0.25,
  default_iou: 0.45,
  video_frame_stride: 1,
  live_interval_ms: 200,
  live_max_width: 640,
};

const Ctx = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getSettings()
      .then((s) => alive && setSettings({ ...DEFAULT_SETTINGS, ...s }))
      .catch(() => {}) // backend may be offline; defaults are used
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(async (next) => {
    const saved = await saveSettings(next);
    setSettings({ ...DEFAULT_SETTINGS, ...saved });
    return saved;
  }, []);

  const value = useMemo(() => ({ settings, loaded, save }), [settings, loaded, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
