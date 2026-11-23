import { useCallback, useEffect, useState } from 'react';

const KEY = 'striplink:pfatc-mode';
const EVENT = 'striplink:pfatc-mode';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * PFATC mode: posts only carry the PFTracker link. PFATC doesn't allow
 * Google Form or StripLink links, so it's on unless the controller turns it off.
 */
export function usePfatcMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(read());
    const sync = () => setOn(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const set = useCallback((value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? 'on' : 'off');
    } catch {
      // storage unavailable: keep it for this page only
    }
    setOn(value);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [on, set];
}
