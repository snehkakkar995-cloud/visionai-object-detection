import { useEffect, useState } from 'react';
import { getModelStatus, errorMessage } from '../services/api.js';

/** Polls /api/model/status (fast while loading, slow otherwise). */
export default function useModelStatus() {
  const [status, setStatus] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer;
    const tick = async () => {
      let delay = 15000;
      try {
        const s = await getModelStatus();
        if (!alive) return;
        setStatus(s);
        setOffline(false);
        if (s.state === 'loading' || s.state === 'not_loaded') delay = 2000;
      } catch (e) {
        if (!alive) return;
        setOffline(true);
        setStatus({ error: errorMessage(e) });
        delay = 5000;
      }
      if (alive) timer = setTimeout(tick, delay);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return { status, offline, refresh: async () => setStatus(await getModelStatus()) };
}
