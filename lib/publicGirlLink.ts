export function girlPublicLink(id: string): string {
  if (typeof window === "undefined") return `/?girl=${encodeURIComponent(id)}`;
  return `${window.location.origin}/?girl=${encodeURIComponent(id)}`;
}
export function readGirlParam(): string | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search).get("girl");
  return p || null;
}
