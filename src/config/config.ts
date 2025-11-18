import "dotenv/config";

function loadEnvVarBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key] as string;
  if (!value) return defaultValue;
  return ["true", "1"].includes(value);
}

function loadEnvVar<T>(key: string, defaultValue: T): T {
  const value = process.env[key] as T;
  if (!value) return defaultValue;
  return value;
}

export const config = {
  // app configuration
  appUrl: loadEnvVar("APP_URL", "localhost:3000"),
  appName: loadEnvVar("APP_NAME", "telegram-bot"),
  port: loadEnvVar("PORT", 3000),

  // development configuration
  devMode: loadEnvVarBoolean("DEV_MODE", false),
  showDocumentation: loadEnvVarBoolean("SHOW_DOCUMENTATION", false),

  // security
  internalApiKey: loadEnvVar("INTERNAL_API_KEY", ""),

  // vector store configuration
  redisUrl: loadEnvVar("REDIS_URL", ""),

  // telegram configuration
  telegramBotToken: loadEnvVar("TELEGRAM_BOT_TOKEN", ""),

  // agent configuration
  providerApiKey: loadEnvVar("PROVIDER_API_KEY", ""),
  providerName: loadEnvVar("PROVIDER_NAME", "google-genai"),
  providerModel: loadEnvVar("PROVIDER_MODEL", "gemini-2.5-flash"),
};
