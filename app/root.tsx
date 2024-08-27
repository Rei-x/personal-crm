import {
  json,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetchers,
  useNavigation,
  useRouteLoaderData,
} from "@remix-run/react";
import "./globals.css";
import { env } from "./server/env";
import { pl } from "date-fns/locale/pl";
import { setDefaultOptions } from "date-fns";
import { Providers } from "./components/Providers";
import NProgress from "nprogress";
import nProgressStyles from "nprogress/nprogress.css?url";
import type { LinksFunction } from "@remix-run/node";
import { useEffect, useMemo } from "react";

setDefaultOptions({ locale: pl });

declare global {
  interface Window {
    ENV: {
      MATRIX_USER_ID: string;
      API_URL: string;
    };
    isServer?: boolean;
  }
}

export async function loader() {
  // @ts-expect-error it's on the server only
  global.window = {
    ENV: { MATRIX_USER_ID: env.MATRIX_USER_ID, API_URL: env.API_URL },
    isServer: true,
  };
  return json({
    ENV: {
      MATRIX_USER_ID: env.MATRIX_USER_ID,
      API_URL: env.API_URL,
    },
  });
}

const useProgress = () => {
  const transition = useNavigation();

  const fetchers = useFetchers();

  /**
   * This gets the state of every fetcher active on the app and combine it with
   * the state of the global transition (Link and Form), then use them to
   * determine if the app is idle or if it's loading.
   * Here we consider both loading and submitting as loading.
   */
  const state = useMemo<"idle" | "loading">(
    function getGlobalState() {
      const states = [
        transition.state,
        ...fetchers.map((fetcher) => fetcher.state),
      ];
      if (states.every((state) => state === "idle")) return "idle";
      return "loading";
    },
    [transition.state, fetchers]
  );

  useEffect(() => {
    // and when it's something else it means it's either submitting a form or
    // waiting for the loaders of the next location so we start it
    if (state === "loading") NProgress.start();
    // when the state is idle then we can to complete the progress bar
    if (state === "idle") NProgress.done();
  }, [state]);
};

export const links: LinksFunction = () => {
  // if you already have one only add this stylesheet to your list of links
  return [{ rel: "stylesheet", href: nProgressStyles }];
};

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  useProgress();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Providers>{children}</Providers>
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data?.ENV)}`,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
