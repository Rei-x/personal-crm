import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import { client } from "./services/matrix";
import { appRouter } from "./routers/app";
// import { enableSpeechToText } from "./matrix/speechToText";

import { boss } from "./services/pgboss";
import { imageApi } from "./api/image";

// enableSpeechToText();
await client.startClient();
await boss.start();

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
