const NAMESPACE = "bh";

export function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeKey<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeKey(key: string): void {
  localStorage.removeItem(key);
}
