import { syncLidlReceipts } from "@/jobs/syncLidlReceipts";
import "dotenv/config";
import { boss } from "../services/pgboss";

await boss.start();

await syncLidlReceipts.emit(undefined);
