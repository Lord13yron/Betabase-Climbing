// Named climbing-hold colors → hex (mirrors app/globals.css --color-hold-*).
// routes.color may already be a hex string; if so we use it directly. Unknown
// / empty colors fall back to a neutral slate band.
const HOLD: Record<string, string> = {
  red: "#d6453b",
  orange: "#e5743a",
  yellow: "#edb23a",
  green: "#4e9d5b",
  teal: "#2e93ae",
  blue: "#3e6fb3",
  purple: "#7e5ca8",
  pink: "#d85b9a",
  black: "#2a2521",
  white: "#f2eee6",
};
// Dark ink on light holds; light ink on everything else.
const LIGHT_INK_FOR = new Set(["yellow", "white", "orange"]);

export function holdColor(color: string | null): string {
  if (!color) return "var(--color-slate-600)";
  const key = color.trim().toLowerCase();
  if (key.startsWith("#")) return key;
  return HOLD[key] ?? "var(--color-slate-600)";
}

export function holdInk(color: string | null): string {
  const key = (color ?? "").trim().toLowerCase();
  return LIGHT_INK_FOR.has(key) ? "#2a2521" : "#f6f2ea";
}
