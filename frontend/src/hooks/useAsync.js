import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api.js';

/** Runs an async function on mount (and when deps change) and tracks loading / error / data. */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const counter = useRef(0);

  const run = useCallback(async () => {
    const id = ++counter.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === counter.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (id === counter.current) setState({ data: null, loading: false, error: errorMessage(e) });
    }
  }, []);

  useEffect(() => {
    run();
    return () => {
      counter.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run };
}
