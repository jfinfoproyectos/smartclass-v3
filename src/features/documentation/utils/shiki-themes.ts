import { bundledThemes } from "shiki";

/**
 * Resuelve el tema de Shiki cargando su objeto JSON directamente desde
 * bundledThemes. Esto es necesario en producción (Vercel) porque Shiki
 * no puede acceder al sistema de archivos en entornos serverless.
 *
 * rehype-pretty-code@0.14.x usa Shiki y acepta tanto strings como
 * objetos de tema (ThemeRegistrationRaw). En producción SIEMPRE usar
 * el objeto cargado dinámicamente para garantizar compatibilidad.
 */

// Mapa de nombre de tema externo (cookie/DB) → clave en bundledThemes de Shiki
const THEME_ALIAS_MAP: Record<string, keyof typeof bundledThemes> = {
  "one-dark-pro": "one-dark-pro",
  "github-dark": "github-dark",
  "github-light": "github-light",
  "dracula": "dracula",
  "dracula-soft": "dracula-soft",
  "monokai": "monokai",
  "nord": "nord",
  "rose-pine": "rose-pine",
  "rose-pine-dawn": "rose-pine-dawn",
  "rose-pine-moon": "rose-pine-moon",
  "solarized-dark": "solarized-dark",
  "solarized-light": "solarized-light",
  "tokyo-night": "tokyo-night",
  "vitesse-dark": "vitesse-dark",
  "vitesse-light": "vitesse-light",
  "catppuccin-mocha": "catppuccin-mocha",
  "catppuccin-latte": "catppuccin-latte",
  "ayu-dark": "ayu-dark",
  "houston": "houston",
  "material-theme": "material-theme",
  "material-theme-darker": "material-theme-darker",
  "material-theme-lighter": "material-theme-lighter",
  "material-theme-ocean": "material-theme-ocean",
  "material-theme-palenight": "material-theme-palenight",
  "min-dark": "min-dark",
  "min-light": "min-light",
  "night-owl": "night-owl",
  "poimandres": "poimandres",
  "slack-dark": "slack-dark",
  "slack-ochin": "slack-ochin",
  "snazzy-light": "snazzy-light",
  "synthwave-84": "synthwave-84",
  "vesper": "vesper",
};

const DEFAULT_THEME_KEY: keyof typeof bundledThemes = "one-dark-pro";

/**
 * Carga y devuelve el objeto de tema de Shiki para usar con rehype-pretty-code.
 * Esto garantiza que el tema esté disponible en producción (Vercel/Edge).
 */
export async function resolveShikiTheme(themeName: string): Promise<any> {
  const themeKey = (THEME_ALIAS_MAP[themeName] ?? DEFAULT_THEME_KEY) as keyof typeof bundledThemes;
  const loader = bundledThemes[themeKey] ?? bundledThemes[DEFAULT_THEME_KEY];
  try {
    const mod = await loader();
    return mod.default || mod;
  } catch {
    // Fallback seguro: usar el tema por defecto
    const mod = await bundledThemes[DEFAULT_THEME_KEY]();
    return mod.default || mod;
  }
}

