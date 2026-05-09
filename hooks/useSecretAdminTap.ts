import { useRef, useState, useCallback } from 'react';

const TAP_TARGET = 20;
const WINDOW_MS = 4000;

export function useSecretAdminTap(onUnlock: () => void) {
  const tapsRef = useRef<number[]>([]);
  const [unlocked, setUnlocked] = useState(false);

  const handleTap = useCallback(() => {
    if (unlocked) return;

    const now = Date.now();
    tapsRef.current = [...tapsRef.current, now].filter(
      (t) => now - t < WINDOW_MS,
    );

    if (tapsRef.current.length >= TAP_TARGET) {
      tapsRef.current = [];
      setUnlocked(true);
      onUnlock();
    }
  }, [unlocked, onUnlock]);

  return { handleTap, unlocked };
}
