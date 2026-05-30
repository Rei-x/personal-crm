import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import "dotenv/config";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    OPENAI_API_KEY: z.string(),
    MATRIX_BASE_URL: z.string().url(),
    MATRIX_USER_ID: z.string(),
    MATRIX_ACCESS_TOKEN: z.string(),
    TEMP_DIR: z.string().default("./temp"),
    TRANSCRIPTIONS_DIR: z.string().default("./transcriptions"),
    PORT: z.coerce.number().default(3000),
    TOPIC_NAME: z.string().default("rei-reminders"),
    API_URL: z.string().default("http://localhost:4000"),
    LIDL_PLUS_REFRESH_TOKEN: z.string(),
    // Public base URL of the app (no trailing slash), used as Better Auth baseURL
    // and to build the Google OAuth redirect URI + the public feed URL.
    PUBLIC_URL: z.string().url().default("http://localhost:4000"),
    // Better Auth signing secret (openssl rand -hex 32).
    BETTER_AUTH_SECRET: z.string().min(1),
    // The single owner allowed to register / sign in.
    OWNER_EMAIL: z.string().email(),
    // Google OAuth web client credentials (for connecting calendar accounts).
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    // 32-byte key as 64 hex chars (openssl rand -hex 32) for AES-256-GCM token encryption.
    ENCRYPTION_KEY: z.string().length(64),
  },
  runtimeEnv: process.env,
  isServer: typeof window === "undefined" || ("isServer" in window && window.isServer === true),
  emptyStringAsUndefined: true,
});
