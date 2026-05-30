import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Layout } from "@/components/Layout";
import { authClient } from "@/lib/authClient";
import { PageSkeleton } from "@/components/skeletons";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const isLogin = pathname === "/login";

  useEffect(() => {
    if (isPending) return;
    if (!session && !isLogin) {
      void navigate({ to: "/login" });
    } else if (session && isLogin) {
      void navigate({ to: "/" }); // role-based landing handled by the index route
    }
  }, [session, isPending, isLogin, navigate]);

  // Login page renders without the app shell.
  if (isLogin) {
    return (
      <>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </>
    );
  }

  // While the session resolves (or before the redirect lands) don't flash the app.
  if (isPending || !session) {
    return <PageSkeleton />;
  }

  return (
    <Layout>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </Layout>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold text-red-600">Error!</h1>
        <p className="mt-2">{error?.message ?? "Unknown error"}</p>
      </div>
    </Layout>
  );
}
