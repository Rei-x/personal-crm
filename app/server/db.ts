import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as pgBossSchema from "./pgBossSchema";
import { env } from "./env";

const queryClient = postgres(env.DATABASE_URL);
export const db = drizzle(queryClient, {
  schema: {
    ...schema,
    ...pgBossSchema,
  },
  logger: true,
});
