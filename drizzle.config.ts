import { defineConfig } from "drizzle-kit";
import { env } from "./app/server/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/server/schema.ts",
  out: "./app/server/drizzle",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
