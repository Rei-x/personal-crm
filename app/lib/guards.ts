import { redirect } from "@tanstack/react-router";
import { authClient } from "./authClient";

// Route guard for owner-only pages (rooms / receipts / lidl). Friends are sent
// to the calendar. Client-side UX only — the API enforces this server-side too.
export async function requireOwner(): Promise<void> {
  const { data } = await authClient.getSession();
  if (!data) throw redirect({ to: "/login" });
  if (data.user.role !== "owner") throw redirect({ to: "/calendar" });
}
