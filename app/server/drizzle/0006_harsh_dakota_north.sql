CREATE TABLE IF NOT EXISTS "receipt_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"receiptId" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"isWeight" boolean DEFAULT false NOT NULL,
	"unitPrice" numeric NOT NULL,
	"quantity" numeric NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"receiptDate" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receiptId_receipts_id_fk" FOREIGN KEY ("receiptId") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
