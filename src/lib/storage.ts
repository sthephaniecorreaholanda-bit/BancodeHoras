const NAMESPACE = "bh";
const CURRENT_USER_KEY = `${NAMESPACE}:currentUser`;
const USERS_KEY = `${NAMESPACE}:users`;

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

export function getCurrentUser(): string | null {
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch {
    return null;
  }
}

export function setCurrentUser(username: string): void {
  localStorage.setItem(CURRENT_USER_KEY, username);
}

export function clearCurrentUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function userKey(suffix: string): string {
  const u = getCurrentUser();
  if (!u) throw new Error("Nenhum usuário logado");
  return `${NAMESPACE}:user:${u}:${suffix}`;
}

export const USERS_STORAGE_KEY = USERS_KEY;
