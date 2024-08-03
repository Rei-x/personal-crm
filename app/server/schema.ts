import { relations } from "drizzle-orm";
import {
  text,
  timestamp,
  pgTable,
  boolean,
  serial,
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
  transcriptionEnabled: boolean("transcriptionEnabled").default(false),
});

export const messages = pgTable("messages", {
  messageId: text("messageId").primaryKey(),
  roomId: text("roomId"),
  userId: text("userId").references(() => users.userId),
  body: text("body"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const messageUser = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.userId],
  }),
}));

export const users = pgTable("users", {
  userId: text("userId").primaryKey(),
  displayName: text("displayName"),
  avatarUrl: text("avatarUrl"),
});

export const usersRelations = relations(users, ({ many }) => ({
  messages: many(messages),
  reminders: many(reminders),
}));

export const reminders = pgTable("reminders", {
  reminderId: serial("reminderId").primaryKey(),
  userId: text("userId").references(() => users.userId),
  reminder: text("reminder"),
  howOftenInSeconds: integer("howOftenInSeconds").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const reminderUser = relations(reminders, ({ one }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.userId],
  }),
}));
