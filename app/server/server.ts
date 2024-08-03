import express from "express";
import { db } from "./db";
import { roomSettings } from "./schema";
import { eq } from "drizzle-orm";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import { client } from "./services/matrix";
import { appRouter } from "./routers/app";
import { enableSpeechToText } from "./matrix/speechToText";
import seedrandom from "seedrandom";
import { createCanvas } from "canvas";

enableSpeechToText();
await client.startClient({ initialSyncLimit: 0 });

const MAX_AGE = 86400;

const setCacheHeaders = (res: express.Response) => {
  res.setHeader("Cache-Control", `public, max-age=${MAX_AGE}`);
  res.setHeader("Expires", new Date(Date.now() + MAX_AGE * 1000).toUTCString());
};

const generateInitialsAvatar = ({
  initials,
  seed,
  size = 200,
}: {
  initials: string;
  seed: string;
  size?: number;
}) => {
  const rng = seedrandom(seed);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = `hsl(${Math.floor(rng() * 360)}, 70%, 60%)`;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "white";
  ctx.font = `bold ${size / 2}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials.toUpperCase(), size / 2, size / 2);

  return canvas.toBuffer("image/png");
};

const getInitials = (name: string): string => {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2);
};

const sendInitialsAvatar = ({
  res,
  initials,
  seed,
}: {
  res: express.Response;
  initials: string;
  seed: string;
}) => {
  const avatar = generateInitialsAvatar({ initials, seed });
  res.contentType("image/png");
  res.send(avatar);
};

const handleImageRequest = async ({
  res,
  id,
  getName,
  getAvatarUrl,
}: {
  res: express.Response;
  id: string;
  getName: () => string | undefined;
  getAvatarUrl: () => string | undefined;
}) => {
  setCacheHeaders(res);

  const name = getName();
  const avatarUrl = getAvatarUrl();

  if (!avatarUrl) {
    return sendInitialsAvatar({
      res,
      initials: getInitials(name || id),
      seed: id,
    });
  }

  const httpUrl = client.mxcUrlToHttp(avatarUrl);

  if (!httpUrl) {
    return sendInitialsAvatar({
      res,
      initials: getInitials(name || id),
      seed: id,
    });
  }

  return res.redirect(httpUrl);
};

export const app = express();

app.get("/health", (_req, res) => {
  res
    .status(client.isLoggedIn() ? 200 : 500)
    .send(client.isLoggedIn() ? "OK" : "Error");
});

app.get("/rooms", async (_req, res) => {
  const rows = await db.query.roomSettings.findMany({
    where: eq(roomSettings.transcriptionEnabled, true),
  });

  const roomsNames = await Promise.all(
    rows.map(async ({ roomId }) => ({
      roomId,
      name: client.getRoom(roomId)?.name,
    }))
  );

  res.json(roomsNames);
});

app.get("/image/:roomId", async (req, res) => {
  const roomId = req.params.roomId;
  const room = client.getRoom(roomId);

  if (!room) {
    return sendInitialsAvatar({
      res,
      initials: getInitials(roomId),
      seed: roomId,
    });
  }

  await handleImageRequest({
    res,
    id: roomId,
    getName: () => room.name,
    getAvatarUrl: () =>
      room.getAvatarUrl(client.getHomeserverUrl(), 200, 200, "scale") ||
      room.getAvatarFallbackMember()?.getMxcAvatarUrl(),
  });
});

app.get("/user-image/:userId", async (req, res) => {
  const userId = req.params.userId;
  const user = client.getUser(userId);

  if (!user) {
    return sendInitialsAvatar({
      res,
      initials: getInitials(userId.split(":")[0].slice(1)),
      seed: userId,
    });
  }

  await handleImageRequest({
    res,
    id: userId,
    getName: () => user.displayName,
    getAvatarUrl: () => user.avatarUrl,
  });
});

app.use(cors());

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  })
);
