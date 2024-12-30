import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetchers,
  useNavigation,
  useRouteError,
  useRouteLoaderData,
} from "react-router";
import "./globals.css";
import { env } from "./server/env";
import { pl } from "date-fns/locale/pl";
import { setDefaultOptions } from "date-fns";
import { Providers } from "./components/Providers";
import nprogress from "nprogress";
import nProgressStyles from "nprogress/nprogress.css?url";
import type { LinksFunction, MetaFunction } from "react-router";
import { useEffect, useMemo } from "react";
import { Layout as MyLayout } from "@/components/Layout";

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
  return {
    ENV: {
      MATRIX_USER_ID: env.MATRIX_USER_ID,
      API_URL: env.API_URL,
    },
  };
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
    if (state === "loading") nprogress.start();
    // when the state is idle then we can to complete the progress bar
    if (state === "idle") nprogress.done();
  }, [state]);
};

export const links: LinksFunction = () => {
  // if you already have one only add this stylesheet to your list of links
  return [{ rel: "stylesheet", href: nProgressStyles }];
};

export const meta: MetaFunction = () => {
  return [
    { title: "Jelly App" },
    {
      name: "description",
      content: "Welcome to Jelly, all in one app of my life!",
    },
  ];
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
        <Providers>
          <MyLayout>{children}</MyLayout>
        </Providers>
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

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </>
    );
  }

  return (
    <>
      <h1>Error!</h1>
      {/* @ts-expect-error ??? ?????????*/}
      <p>{error?.message ?? "Unknown error"}</p>
    </>
  );
}
