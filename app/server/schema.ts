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
  primaryKey,
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
// them automatically). Multi-tenant: `role` distinguishes the owner (full app)
// from invited friends (calendar feature only). Registration is invite-gated.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").notNull().default("friend"), // 'owner' | 'friend'
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

// A connected Google account whose calendars we read. Owned by an app user.
// Tokens are stored encrypted (AES-256-GCM); see app/server/services/crypto.ts.
export const googleAccount = pgTable(
  "google_account",
  {
    id: text("id").primaryKey(), // nanoid
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
  },
  (table) => [index("google_account_userId_idx").on(table.userId)],
);

// A calendar belonging to a connected account. Inclusion in a feed is decided
// per share link via `share_link_calendar` (not a global flag).
export const calendar = pgTable(
  "calendar",
  {
    id: text("id").primaryKey(), // nanoid
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("calendar_account_gcal_idx").on(table.googleAccountId, table.googleCalendarId),
    index("calendar_userId_idx").on(table.userId),
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

// A shareable feed. A user can have many, each exposing a chosen subset of
// their calendars at a chosen detail level.
export const shareLink = pgTable(
  "share_link",
  {
    id: text("id").primaryKey(), // nanoid
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(), // unguessable, rotatable
    name: text("name").notNull(), // owner-facing label, e.g. "Work availability"
    detailLevel: text("detail_level").notNull().default("busy"), // 'full' | 'busy'
    feedTitle: text("feed_title").notNull().default("My calendar"), // X-WR-CALNAME
    enabled: boolean("enabled").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  },
  (table) => [index("share_link_userId_idx").on(table.userId)],
);

// Which calendars a share link exposes (many-to-many).
export const shareLinkCalendar = pgTable(
  "share_link_calendar",
  {
    shareLinkId: text("share_link_id")
      .notNull()
      .references(() => shareLink.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id")
      .notNull()
      .references(() => calendar.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.shareLinkId, table.calendarId] })],
);

// Invite-only onboarding. Single-use; optionally restricted to one email.
export const invite = pgTable("invite", {
  id: text("id").primaryKey(), // nanoid
  token: text("token").notNull().unique(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email"), // if set, only this address may claim
  role: text("role").notNull().default("friend"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedByUserId: text("used_by_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const googleAccountRelations = relations(googleAccount, ({ one, many }) => ({
  user: one(user, { fields: [googleAccount.userId], references: [user.id] }),
  calendars: many(calendar),
}));

export const calendarRelations = relations(calendar, ({ one, many }) => ({
  user: one(user, { fields: [calendar.userId], references: [user.id] }),
  googleAccount: one(googleAccount, {
    fields: [calendar.googleAccountId],
    references: [googleAccount.id],
  }),
  events: many(calendarEvent),
  shareLinks: many(shareLinkCalendar),
}));

export const calendarEventRelations = relations(calendarEvent, ({ one }) => ({
  calendar: one(calendar, {
    fields: [calendarEvent.calendarId],
    references: [calendar.id],
  }),
}));

export const shareLinkRelations = relations(shareLink, ({ one, many }) => ({
  user: one(user, { fields: [shareLink.userId], references: [user.id] }),
  calendars: many(shareLinkCalendar),
}));

export const shareLinkCalendarRelations = relations(shareLinkCalendar, ({ one }) => ({
  shareLink: one(shareLink, {
    fields: [shareLinkCalendar.shareLinkId],
    references: [shareLink.id],
  }),
  calendar: one(calendar, {
    fields: [shareLinkCalendar.calendarId],
    references: [calendar.id],
  }),
}));
