import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { env } from "./env";
import { user, session, account, verification } from "./schema";

// App-level authentication (replaces the former Authelia SSO in front of the
// app). Single-user: email + password, and registration is locked to
// OWNER_EMAIL so a publicly-reachable signup endpoint can't mint other accounts.
export const auth = betterAuth({
  baseURL: env.PUBLIC_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.PUBLIC_URL, "http://localhost:5173", "http://localhost:4000"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          if (newUser.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) {
            throw new Error("Registration is restricted to the owner account.");
          }
          return { data: newUser };
        },
      },
    },
  },
});

export type Auth = typeof auth;
