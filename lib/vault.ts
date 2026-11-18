const PIN_KEY = "vm-vault-pin";
const VAULT_KEY = "vm-vault-ids";

export function hasVaultPin(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(PIN_KEY));
}

export function setVaultPin(pin: string) {
  if (pin.length < 4) return false;
  try {
    localStorage.setItem(PIN_KEY, pin);
    return true;
  } catch {
    return false;
  }
}

export function checkVaultPin(pin: string): boolean {
  try {
    return localStorage.getItem(PIN_KEY) === pin;
  } catch {
    return false;
  }
}

export function getVaultIds(): string[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleVaultItem(id: string) {
  const cur = getVaultIds();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(0, 100);
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}
