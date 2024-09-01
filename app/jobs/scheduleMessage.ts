import { client } from "@/server/services/matrix";
import { ntfy, NtfyTag } from "@/server/services/ntfy";
import { createJob } from "@/server/services/pgboss";

export const scheduleMessage = createJob<{
  roomId: string;
  message: string;
}>("scheduleMessage", async ([job]) => {
  const room = client.getRoom(job.data.roomId);

  await client.sendTextMessage(job.data.roomId, job.data.message);
  await ntfy().notify({
    title: `${room?.name} dostał info`,
    message: `${job.data.message}`,
    tags: [NtfyTag.LOUDSPEAKER],
  });
});
