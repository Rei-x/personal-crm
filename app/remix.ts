import { createRequestHandler } from "@remix-run/express";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "./server/env.js";

const app = express();

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

app.use(
  viteDevServer ? viteDevServer.middlewares : express.static("build/client")
);

const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
  : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore it's on the server only
    await import("../build/server/index.js");

app.use(
  "/api",
  createProxyMiddleware({
    target: env.API_URL + "/api",
    changeOrigin: true,
  })
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore it's on the server only
app.all("*", createRequestHandler({ build }));

app.listen(3000, () => {
  console.log("App listening on port 3000");
});
