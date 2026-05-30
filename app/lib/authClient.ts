import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

// Mirrors the tRPC client convention: window.ENV.API_URL already points at the
// API base (".../api"), so the Better Auth endpoints live at ".../api/auth".
export const authClient = createAuthClient({
  baseURL: window.ENV.API_URL + "/auth",
  // Surfaces our custom `role` field on the session user (typed).
  plugins: [inferAdditionalFields({ user: { role: { type: "string", input: false } } })],
});

export const { signIn, signUp, signOut, useSession } = authClient;
