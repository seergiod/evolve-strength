const KEY = "ironfeed_username";

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setUsername(name: string) {
  localStorage.setItem(KEY, name);
}

export function clearUsername() {
  localStorage.removeItem(KEY);
}
