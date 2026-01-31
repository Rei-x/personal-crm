import { db } from "@/server/db";
import { client } from "@/server/services/matrix";
import { ntfy } from "@/server/services/ntfy";
import { createJob } from "@/server/services/pgboss";

export const scheduleNotificationJob = createJob("scheduleNotification", async () => {
  const allRooms = await db.query.roomSettings.findMany();

  for (const room of allRooms) {
    if (!room.howOftenInSeconds) {
      continue;
    }
    const matrixRoom = client.getRoom(room.roomId);

    const lastMessageTimeStamp = matrixRoom?.getLastActiveTimestamp();

    if (!lastMessageTimeStamp || !matrixRoom) {
      continue;
    }

    const notifyDate = new Date(lastMessageTimeStamp + room.howOftenInSeconds * 1000);

    if (notifyDate < new Date()) {
      await ntfy().notify({
        message: `Napisz do ${matrixRoom?.name}!`,
        title: "Przypomnienie",
      });
    }
  }
});
