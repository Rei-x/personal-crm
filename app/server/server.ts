import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { client } from "./services/matrix";
import { appRouter } from "./routers/app";
import { enableSpeechToText } from "./matrix/speechToText";
import { env } from "./env";

import { boss } from "./services/pgboss";
import { imageApi } from "./api/image";
import { scheduleNotificationJob } from "@/jobs/scheduleNotification";
import { scheduleMessage } from "@/jobs/scheduleMessage";
import { enableLidlCoupons } from "@/jobs/enableLidlCoupons";
import { syncLidlReceipts } from "@/jobs/syncLidlReceipts";
import { syncCalendars } from "@/jobs/syncCalendars";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { createContext } from "./trpc";
import { requireAuth } from "./http/requireAuth";
import { googleOAuthRouter } from "./http/oauth";
import { feedHandler } from "./http/feed";
import { sharePageHandler } from "./http/sharePage";

enableSpeechToText();

await client.startClient({
  disablePresence: true,
});
await boss.start();

boss.on("error", console.error);

await scheduleNotificationJob.work();
await scheduleNotificationJob.schedule("0 10 * * *");

await scheduleMessage.work();

await enableLidlCoupons.work();
await enableLidlCoupons.schedule("5 * * * *");

await syncLidlReceipts.work();
await syncLidlReceipts.schedule("5 * * * *");

await syncCalendars.work();
await syncCalendars.schedule("*/15 * * * *", undefined, { singletonKey: "sync:all" });

const api = express();

api.use(imageApi);

api.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

const app = express();

// Allow credentialed (cookie) requests — same-origin in prod, localhost in dev.
app.use(cors({ origin: true, credentials: true }));

// Better Auth handler — MUST be mounted before any body parser.
app.all("/api/auth/*", toNodeHandler(auth));

// Public, unauthenticated iCal feed that calendar apps subscribe to.
app.get("/share/:token", feedHandler);

// Public, human-friendly "add to your calendar" landing page for recipients.
app.get("/c/:token", sharePageHandler);

// Invite landing: set the (httpOnly) gate cookie that the signup hook reads,
// then send the user to the login screen.
app.get("/invite/:token", (req, res) => {
  const token = req.params.token;
  res.cookie("invite_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 60 * 1000,
    path: "/",
  });
  res.redirect("/login?invite=" + encodeURIComponent(token));
});

// Google calendar connect flow — requires a logged-in session (any user).
app.use("/oauth/google", requireAuth, googleOAuthRouter);

app.use("/api", api);

// Serve static client files in production
if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(process.cwd(), "dist/client");

  app.use(express.static(clientPath, { index: false }));

  // Serve index.html with injected environment variables
  app.get("*", (_req, res) => {
    const indexPath = path.join(clientPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");

    // Inject environment variables
    const envScript = `<script>window.ENV = ${JSON.stringify({
      MATRIX_USER_ID: env.MATRIX_USER_ID,
      API_URL: env.API_URL,
    })};</script>`;

    html = html.replace("</head>", `${envScript}</head>`);

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
}

app.listen(4000, () => {
  console.log("App listening on port 4000");
});
