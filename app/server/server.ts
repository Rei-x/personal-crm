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

const api = express();

api.use(cors());
api.use(imageApi);

api.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  })
);

const app = express();

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
