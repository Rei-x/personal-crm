import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Layout } from "@/components/Layout";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
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
