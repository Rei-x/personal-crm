import { relations } from "drizzle-orm";
import { text, timestamp, pgTable, boolean, integer, serial, numeric } from "drizzle-orm/pg-core";

export const processedEvents = pgTable("processed_events", {
  eventId: text("eventId").primaryKey(),
  userDisplayName: text("userDisplayName"),
  transcription: text("transcription"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const roomSettings = pgTable("room_settings", {
  roomId: text("roomId").primaryKey(),
  transcriptionEnabled: boolean("transcriptionEnabled").notNull().default(false),
  howOftenInSeconds: integer("howOftenInSeconds"),
});

export const receiptItem = pgTable("receipt_items", {
  id: serial().primaryKey(),
  receiptId: text()
    .references(() => receipts.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  name: text().notNull(),
  code: text().notNull(),
  isWeight: boolean().notNull().default(false),
  unitPrice: numeric().notNull(),
  quantity: numeric().notNull(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().$onUpdate(() => new Date()),
});

export const receipts = pgTable("receipts", {
  id: text().primaryKey(),
  receiptDate: timestamp(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().$onUpdate(() => new Date()),
});

export const receiptItemsRelation = relations(receipts, ({ many }) => ({
  receiptItems: many(receiptItem),
}));

export const itemsReceiptRelation = relations(receiptItem, ({ one }) => ({
  receipt: one(receipts, {
    fields: [receiptItem.receiptId],
    references: [receipts.id],
  }),
}));
