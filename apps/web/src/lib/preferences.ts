import { useSyncExternalStore } from 'react';
import { readString, writeString } from './storage';

/** Per-device display preferences from Settings (same storage keys as the original app). */
export const PREFERENCES = {
  widget: 'tasknest-widget',
  reminders: 'tasknest-reminder',
} as const;

type PreferenceKey = (typeof PREFERENCES)[keyof typeof PREFERENCES];

const listeners = new Set<() => void>();

function read(key: PreferenceKey) {
  return readString('local', key) !== 'off';
}

export function setPreference(key: PreferenceKey, on: boolean) {
  writeString('local', key, on ? 'on' : 'off');
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key && Object.values(PREFERENCES).includes(event.key as PreferenceKey)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function usePreference(key: PreferenceKey): boolean {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => true,
  );
}
