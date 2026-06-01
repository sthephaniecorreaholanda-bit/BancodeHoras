import {
  readKey,
  writeKey,
  setCurrentUser,
  clearCurrentUser,
  USERS_STORAGE_KEY,
} from "./storage";

export const MAX_USERS = 2;

export type StoredUser = {
  username: string;
  passwordHash: string;
  createdAt: string;
};

export async function hashPassword(plain: string): Promise<string> {
  const buf = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function listUsers(): StoredUser[] {
  return readKey<StoredUser[]>(USERS_STORAGE_KEY, []);
}

export async function registerUser(
  username: string,
  password: string,
): Promise<void> {
  const u = username.trim();
  if (!u || !password) throw new Error("Usuário e senha são obrigatórios.");

  const users = listUsers();
  if (users.some((x) => x.username === u)) {
    throw new Error("Este usuário já existe.");
  }
  if (users.length >= MAX_USERS) {
    throw new Error(
      `Limite de ${MAX_USERS} usuários atingido. Apague algum no devtools (chave ${USERS_STORAGE_KEY}) para cadastrar outro.`,
    );
  }

  users.push({
    username: u,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  writeKey(USERS_STORAGE_KEY, users);
}

export async function loginUser(
  username: string,
  password: string,
): Promise<string> {
  const u = username.trim();
  const users = listUsers();
  const found = users.find((x) => x.username === u);
  const hash = await hashPassword(password);
  if (!found || found.passwordHash !== hash) {
    throw new Error("Usuário ou senha incorretos.");
  }
  setCurrentUser(found.username);
  return found.username;
}

export function logoutUser(): void {
  clearCurrentUser();
}
