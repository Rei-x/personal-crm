import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import { client } from "./services/matrix";
import { appRouter } from "./routers/app";
import { enableSpeechToText } from "./matrix/speechToText";

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

app.listen(4000, () => {
  console.log("App listening on port 4000");
});
