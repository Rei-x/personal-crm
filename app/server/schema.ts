import { relations } from "drizzle-orm";
import {
  text,
  timestamp,
  pgTable,
  boolean,
  integer,
  serial,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

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

// ---------------------------------------------------------------------------
// Better Auth tables (default model/column names so the Drizzle adapter maps
// them automatically). Single-user app: registration is locked to OWNER_EMAIL.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------------------------------------------------------------------------
// Calendar sharing feature
// ---------------------------------------------------------------------------

// A connected Google account whose calendars we read. Tokens are stored
// encrypted (AES-256-GCM); see app/server/services/crypto.ts.
export const googleAccount = pgTable("google_account", {
  id: text("id").primaryKey(), // nanoid
  googleSub: text("google_sub").notNull().unique(), // stable Google user id
  email: text("email").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  accessTokenEnc: text("access_token_enc"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  status: text("status").notNull().default("active"), // active | needs_reauth
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// A calendar belonging to a connected account. `selected` controls inclusion
// in the shared feed.
export const calendar = pgTable(
  "calendar",
  {
    id: text("id").primaryKey(), // nanoid
    googleAccountId: text("google_account_id")
      .notNull()
      .references(() => googleAccount.id, { onDelete: "cascade" }),
    googleCalendarId: text("google_calendar_id").notNull(),
    summary: text("summary"),
    description: text("description"),
    timeZone: text("time_zone"),
    accessRole: text("access_role"),
    backgroundColor: text("background_color"),
    primary: boolean("primary").notNull().default(false),
    selected: boolean("selected").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("calendar_account_gcal_idx").on(table.googleAccountId, table.googleCalendarId),
  ],
);

// A single (already recurrence-expanded) event instance from a calendar.
export const calendarEvent = pgTable(
  "calendar_event",
  {
    id: serial("id").primaryKey(),
    calendarId: text("calendar_id")
      .notNull()
      .references(() => calendar.id, { onDelete: "cascade" }),
    googleEventId: text("google_event_id").notNull(),
    icalUid: text("ical_uid"),
    summary: text("summary"),
    description: text("description"),
    location: text("location"),
    allDay: boolean("all_day").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }), // for timed events (UTC instant)
    endsAt: timestamp("ends_at", { withTimezone: true }),
    startDate: text("start_date"), // YYYY-MM-DD for all-day events
    endDate: text("end_date"), // YYYY-MM-DD (exclusive, per iCal)
    status: text("status"),
    htmlLink: text("html_link"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("event_calendar_gevent_idx").on(table.calendarId, table.googleEventId)],
);

// Singleton row (id = 1) holding the rotatable feed token + title.
export const shareSettings = pgTable("share_settings", {
  id: integer("id").primaryKey().default(1),
  shareToken: text("share_token").notNull().unique(),
  feedTitle: text("feed_title").notNull().default("My calendar"),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const googleAccountRelations = relations(googleAccount, ({ many }) => ({
  calendars: many(calendar),
}));

export const calendarRelations = relations(calendar, ({ one, many }) => ({
  googleAccount: one(googleAccount, {
    fields: [calendar.googleAccountId],
    references: [googleAccount.id],
  }),
  events: many(calendarEvent),
}));

export const calendarEventRelations = relations(calendarEvent, ({ one }) => ({
  calendar: one(calendar, {
    fields: [calendarEvent.calendarId],
    references: [calendar.id],
  }),
}));
