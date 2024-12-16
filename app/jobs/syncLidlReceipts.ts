import { db } from "@/server/db";
import { lidlPlusClient } from "@/server/services/lidlPlus/client";
import { createJob } from "@/server/services/pgboss";

export const syncLidlReceipts = createJob("syncLidlReceipts", async () => {
  const receipts = await lidlPlusClient.receipts();

  const allReceiptsIds = await db.query.receipts.findMany({
    columns: {
      id: true,
    },
  });

  const existingReceiptsIds = allReceiptsIds.map((r) => r.id);

  const newReceipts = receipts.filter(
    (r) => !existingReceiptsIds.includes(r.id)
  );
});
