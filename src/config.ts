// Single source of truth for app-level configuration.
// All values come from environment variables (Vite `VITE_*`); no other module
// should read `import.meta.env` directly.
export interface AppConfig {
  appName: string;
  /** Backend base URL; empty when not configured. Never required at startup. */
  apiBaseUrl: string;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  return {
    appName: env.VITE_APP_NAME || 'Frontend Application',
    apiBaseUrl: env.VITE_API_BASE_URL || '',
  };
}

export const config: AppConfig = loadConfig(import.meta.env);
