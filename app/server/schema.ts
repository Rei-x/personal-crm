import {
  text,
  timestamp,
  pgTable,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const processedEvents = pgTable("processed_events", {
  eventId: text("eventId").primaryKey(),
  userDisplayName: text("userDisplayName"),
  transcription: text("transcription"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const roomSettings = pgTable("room_settings", {
  roomId: text("roomId").primaryKey(),
  transcriptionEnabled: boolean("transcriptionEnabled")
    .notNull()
    .default(false),
  howOftenInSeconds: integer("howOftenInSeconds"),
});
