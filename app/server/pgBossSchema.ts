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
  cronOn: timestamp("cron_on", { withTimezone: true, mode: "string" }),
  bamOn: timestamp("bam_on", { withTimezone: true, mode: "string" }),
});

export const queueInPgboss = pgboss.table(
  "queue",
  {
    name: text("name").primaryKey().notNull(),
    policy: text("policy").notNull(),
    retryLimit: integer("retry_limit").notNull(),
    retryDelay: integer("retry_delay").notNull(),
    retryBackoff: boolean("retry_backoff").notNull(),
    retryDelayMax: integer("retry_delay_max"),
    expireSeconds: integer("expire_seconds").notNull(),
    retentionSeconds: integer("retention_seconds").notNull(),
    deletionSeconds: integer("deletion_seconds").notNull(),
    deadLetter: text("dead_letter"),
    partition: boolean("partition").notNull(),
    tableName: text("table_name").notNull(),
    deferredCount: integer("deferred_count").default(0).notNull(),
    queuedCount: integer("queued_count").default(0).notNull(),
    warningQueued: integer("warning_queued").default(0).notNull(),
    activeCount: integer("active_count").default(0).notNull(),
    totalCount: integer("total_count").default(0).notNull(),
    singletonsActive: text("singletons_active").array(),
    monitorOn: timestamp("monitor_on", { withTimezone: true, mode: "string" }),
    maintainOn: timestamp("maintain_on", { withTimezone: true, mode: "string" }),
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
  },
);

export const scheduleInPgboss = pgboss.table(
  "schedule",
  {
    name: text("name")
      .notNull()
      .references(() => queueInPgboss.name, { onDelete: "cascade" }),
    key: text("key").default("").notNull(),
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
  },
  (table) => {
    return {
      schedulePkey: primaryKey({
        columns: [table.name, table.key],
        name: "schedule_pkey",
      }),
    };
  },
);

export const subscriptionInPgboss = pgboss.table(
  "subscription",
  {
    event: text("event").notNull(),
    name: text("name")
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
  },
);

export const job = pgboss.table(
  "job",
  {
    id: uuid("id").defaultRandom().notNull(),
    name: text("name")
      .notNull()
      .references(() => queueInPgboss.name, { onDelete: "restrict" }),
    priority: integer("priority").default(0).notNull(),
    data: jsonb("data"),
    state: jobStateInPgboss("state")
      .default(sql`'created'::pgboss.job_state`)
      .notNull(),
    retryLimit: integer("retry_limit").default(2).notNull(),
    retryCount: integer("retry_count").default(0).notNull(),
    retryDelay: integer("retry_delay").default(0).notNull(),
    retryBackoff: boolean("retry_backoff").default(false).notNull(),
    retryDelayMax: integer("retry_delay_max"),
    expireSeconds: integer("expire_seconds").default(900).notNull(),
    deletionSeconds: integer("deletion_seconds").default(604800).notNull(),
    singletonKey: text("singleton_key"),
    singletonOn: timestamp("singleton_on", { mode: "string" }),
    groupId: text("group_id"),
    groupTier: text("group_tier"),
    startAfter: timestamp("start_after", { withTimezone: true }).defaultNow().notNull(),
    createdOn: timestamp("created_on", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    startedOn: timestamp("started_on", { withTimezone: true, mode: "string" }),
    completedOn: timestamp("completed_on", {
      withTimezone: true,
      mode: "string",
    }),
    keepUntil: timestamp("keep_until", { withTimezone: true, mode: "string" })
      .default(sql`(now() + '336:00:00'::interval)`)
      .notNull(),
    output: jsonb("output"),
    deadLetter: text("dead_letter").references(() => queueInPgboss.name, {
      onDelete: "restrict",
    }),
    policy: text("policy"),
  },
  (table) => {
    return {
      jobPkey: primaryKey({
        columns: [table.name, table.id],
        name: "job_pkey",
      }),
    };
  },
);
