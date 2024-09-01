import {
  text,
  timestamp,
  boolean,
  integer,
  pgSchema,
  foreignKey,
  jsonb,
  primaryKey,
  uuid,
  customType,
  interval,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const pgboss = pgSchema("pgboss");

export const jobStateInPgboss = pgboss.enum("job_state", [
  "failed",
  "cancelled",
  "completed",
  "active",
  "retry",
  "created",
]);

export const versionInPgboss = pgboss.table("version", {
  version: integer("version").primaryKey().notNull(),
  maintainedOn: timestamp("maintained_on", {
    withTimezone: true,
    mode: "string",
  }),
  cronOn: timestamp("cron_on", { withTimezone: true, mode: "string" }),
  monitoredOn: timestamp("monitored_on", {
    withTimezone: true,
    mode: "string",
  }),
});

export const queueInPgboss = pgboss.table(
  "queue",
  {
    name: text("name").primaryKey().notNull(),
    policy: text("policy"),
    retryLimit: integer("retry_limit"),
    retryDelay: integer("retry_delay"),
    retryBackoff: boolean("retry_backoff"),
    expireSeconds: integer("expire_seconds"),
    retentionMinutes: integer("retention_minutes"),
    deadLetter: text("dead_letter"),
    partitionName: text("partition_name"),
    createdOn: timestamp("created_on", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedOn: timestamp("updated_on", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      queueDeadLetterFkey: foreignKey({
        columns: [table.deadLetter],
        foreignColumns: [table.name],
        name: "queue_dead_letter_fkey",
      }),
    };
  }
);

export const scheduleInPgboss = pgboss.table("schedule", {
  name: text("name")
    .primaryKey()
    .notNull()
    .references(() => queueInPgboss.name, { onDelete: "cascade" }),
  cron: text("cron").notNull(),
  timezone: text("timezone"),
  data: jsonb("data"),
  options: jsonb("options"),
  createdOn: timestamp("created_on", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedOn: timestamp("updated_on", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

export const subscriptionInPgboss = pgboss.table(
  "subscription",
  {
    event: text("event").primaryKey().notNull(),
    name: text("name")
      .primaryKey()
      .notNull()
      .references(() => queueInPgboss.name, { onDelete: "cascade" }),
    createdOn: timestamp("created_on", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedOn: timestamp("updated_on", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      subscriptionPkey: primaryKey({
        columns: [table.event, table.name],
        name: "subscription_pkey",
      }),
    };
  }
);

export const archiveInPgboss = pgboss.table(
  "archive",
  {
    id: uuid("id").primaryKey().notNull(),
    name: text("name").primaryKey().notNull(),
    priority: integer("priority").notNull(),
    data: jsonb("data"),
    state: customType({ dataType: () => "pgboss.job_state" })(
      "state"
    ).notNull(),
    retryLimit: integer("retry_limit").notNull(),
    retryCount: integer("retry_count").notNull(),
    retryDelay: integer("retry_delay").notNull(),
    retryBackoff: boolean("retry_backoff").notNull(),
    startAfter: timestamp("start_after", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    startedOn: timestamp("started_on", { withTimezone: true, mode: "string" }),
    singletonKey: text("singleton_key"),
    singletonOn: timestamp("singleton_on", { mode: "string" }),
    expireIn: interval("expire_in").notNull(),
    createdOn: timestamp("created_on", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    completedOn: timestamp("completed_on", {
      withTimezone: true,
      mode: "string",
    }),
    keepUntil: timestamp("keep_until", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    output: jsonb("output"),
    deadLetter: text("dead_letter"),
    policy: text("policy"),
    archivedOn: timestamp("archived_on", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      archivePkey: primaryKey({
        columns: [table.id, table.name],
        name: "archive_pkey",
      }),
    };
  }
);

export const job = pgboss.table("job", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  name: text("name")
    .primaryKey()
    .notNull()
    .references(() => queueInPgboss.name, { onDelete: "restrict" }),
  priority: integer("priority")
    .default(sql`0`)
    .notNull(),
  data: jsonb("data"),
  state: jobStateInPgboss("state").notNull(),
  retryLimit: integer("retry_limit")
    .default(sql`2`)
    .notNull(),
  retryCount: integer("retry_count")
    .default(sql`0`)
    .notNull(),
  retryDelay: integer("retry_delay")
    .default(sql`0`)
    .notNull(),
  retryBackoff: boolean("retry_backoff")
    .default(sql`false`)
    .notNull(),
  startAfter: timestamp("start_after", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  startedOn: timestamp("started_on", {
    withTimezone: true,
  }),
  singletonKey: text("singleton_key"),
  singletonOn: timestamp("singleton_on", { mode: "string" }),
  expireIn: interval("expire_in")
    .default(sql`'00:15:00'`)
    .notNull(),
  createdOn: timestamp("created_on", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  completedOn: timestamp("completed_on", {
    withTimezone: true,
    mode: "string",
  }),
  keepUntil: timestamp("keep_until", { withTimezone: true, mode: "string" })
    .default(sql`(now() + '14 days'::interval)`)
    .notNull(),
  output: jsonb("output"),
  deadLetter: text("dead_letter").references(() => queueInPgboss.name, {
    onDelete: "restrict",
  }),
  policy: text("policy"),
});
