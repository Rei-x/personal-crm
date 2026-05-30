import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/authClient";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
    throw redirect({ to: data.user.role === "owner" ? "/rooms" : "/calendar" });
  },
});
