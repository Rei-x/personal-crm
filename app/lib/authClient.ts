import { createAuthClient } from "better-auth/react";

// Mirrors the tRPC client convention: window.ENV.API_URL already points at the
// API base (".../api"), so the Better Auth endpoints live at ".../api/auth".
export const authClient = createAuthClient({
  baseURL: window.ENV.API_URL + "/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;
