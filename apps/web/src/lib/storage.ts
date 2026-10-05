// Browser storage is a convenience only: every access is best-effort, because it can be
// unavailable (private mode, blocked site data) and the app must keep working without it.

type Area = 'local' | 'session';

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(kind: Area, key: string | null): T | null {
  if (!key) return null;
  try {
    const raw = area(kind)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(kind: Area, key: string | null, value: unknown) {
  if (!key) return;
  try {
    area(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort.
  }
}

export function readString(kind: Area, key: string): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeString(kind: Area, key: string, value: string) {
  try {
    area(kind)?.setItem(key, value);
  } catch {
    // Best-effort.
  }
}

export function removeKey(kind: Area, key: string | null) {
  if (!key) return;
  try {
    area(kind)?.removeItem(key);
  } catch {
    // Best-effort.
  }
}

export function removeKeysWithPrefix(kind: Area, prefix: string) {
  const storage = area(kind);
  if (!storage) return;
  try {
    for (const key of Object.keys(storage)) {
      if (key.startsWith(prefix)) storage.removeItem(key);
    }
  } catch {
    // Best-effort.
  }
}
