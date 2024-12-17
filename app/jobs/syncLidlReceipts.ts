import { db } from "@/server/db";
import { lidlPlusClient } from "@/server/services/lidlPlus/client";
import { createJob } from "@/server/services/pgboss";
import { receiptItem, receipts } from "@/server/schema";
import type { ReceiptOne } from "@/server/services/lidlPlus/receipt";

export const syncLidlReceipts = createJob("syncLidlReceipts", async () => {
  const receiptsData = await lidlPlusClient.receipts();

  const allReceiptsIds = await db.query.receipts.findMany({
    columns: {
      id: true,
    },
  });

  const existingReceiptsIds = allReceiptsIds.map((r) => r.id);

  const newReceipts = receiptsData.filter(
    (r) => !existingReceiptsIds.includes(r.id)
  );

  const fetchedReceipts: ReceiptOne[] = [];

  for (const receipt of newReceipts) {
    const fetchedReceipt = await lidlPlusClient.receipt(receipt.id);

    fetchedReceipts.push(fetchedReceipt);
  }

  if (fetchedReceipts.length === 0) {
    return;
  }

  console.log(fetchedReceipts.at(0)?.itemsLine.at(0)?.quantity);

  await db.transaction(async (tx) => {
    await tx
      .insert(receipts)
      .values(
        newReceipts.map((r) => ({
          id: r.id,
          receiptDate: r.date,
        }))
      )
      .returning({ id: receipts.id });

    await tx.insert(receiptItem).values(
      fetchedReceipts.flatMap((r) =>
        r.itemsLine.flatMap((i) => ({
          code: i.codeInput,
          name: i.name,
          isWeight: i.isWeight,
          unitPrice: i.currentUnitPrice.replace(",", "."),
          quantity: i.quantity.replace(",", "."),
          receiptId: r.id,
        }))
      )
    );
  });
});
