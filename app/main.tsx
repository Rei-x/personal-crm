import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Providers } from "./components/Providers";
import "./globals.css";
import { setDefaultOptions } from "date-fns";
import { pl } from "date-fns/locale/pl";
import nprogress from "nprogress";
import "nprogress/nprogress.css";
import { PageSkeleton } from "./components/skeletons";

setDefaultOptions({ locale: pl });

declare global {
  interface Window {
    ENV: {
      MATRIX_USER_ID: string;
      API_URL: string;
    };
  }
}

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: PageSkeleton,
  defaultPendingMs: 100,
  defaultPendingMinMs: 300,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Setup nprogress for route transitions
router.subscribe("onBeforeLoad", () => {
  nprogress.start();
});

router.subscribe("onLoad", () => {
  nprogress.done();
});

const rootElement = document.getElementById("root")!;

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
