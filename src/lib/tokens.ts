import tokens from "../../design/project/tokens.json";

type ColorValue = string | { light: string; dark?: string };

/** Farbwert direkt aus tokens.json – nur wo CSS-Variablen nicht gehen (z. B. Meta-Tags). */
export function colorToken(name: string, theme: "light" | "dark"): string {
  const entry = (tokens.color.tokens as Array<{ name: string; value: ColorValue }>).find((t) => t.name === name);
  if (!entry) throw new Error(`Unbekanntes Token: ${name}`);
  const v = entry.value;
  return typeof v === "string" ? v : theme === "dark" ? (v.dark ?? v.light) : v.light;
}
