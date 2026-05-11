import { useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TAP_TARGET = 20;
const WINDOW_MS = 4000;
const STORAGE_KEY = 'zipsender-admin-unlocked';

export async function loadAdminUnlocked(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function saveAdminUnlocked(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {}
}

export function useSecretAdminTap(onUnlock: () => void, alreadyUnlocked: boolean) {
  const tapsRef = useRef<number[]>([]);

  const handleTap = useCallback(() => {
    if (alreadyUnlocked) return;

    const now = Date.now();
    tapsRef.current = [...tapsRef.current, now].filter(
      (t) => now - t < WINDOW_MS
    );

    if (tapsRef.current.length >= TAP_TARGET) {
      tapsRef.current = [];
      saveAdminUnlocked(true).then(() => onUnlock());
    }
  }, [alreadyUnlocked, onUnlock]);

  return { handleTap };
}