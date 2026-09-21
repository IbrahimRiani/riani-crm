export const THEME_KEY = "ibra-crm-theme";

export type ThemeChoice = "light" | "dark";

/** Pura y testeable: decide el tema efectivo. */
export function resolveTheme(stored: string | null, systemDark: boolean): ThemeChoice {
  if (stored === "light" || stored === "dark") return stored;
  return systemDark ? "dark" : "light";
}

/** Script bloqueante en <head>: aplica .dark antes del primer pintado (evita flash). */
export const themeInitScript = `(function(){try{var s=localStorage.getItem('${THEME_KEY}');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage no disponible: el tema se aplica solo en memoria
  }
}
