CREATE TABLE "invite" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'friend' NOT NULL,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"used_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "share_link" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"detail_level" text DEFAULT 'busy' NOT NULL,
	"feed_title" text DEFAULT 'My calendar' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	CONSTRAINT "share_link_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "share_link_calendar" (
	"share_link_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	CONSTRAINT "share_link_calendar_share_link_id_calendar_id_pk" PRIMARY KEY("share_link_id","calendar_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'friend' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "google_account" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_used_by_user_id_user_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_link" ADD CONSTRAINT "share_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_link_calendar" ADD CONSTRAINT "share_link_calendar_share_link_id_share_link_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_link_calendar" ADD CONSTRAINT "share_link_calendar_calendar_id_calendar_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "share_link_userId_idx" ON "share_link" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "calendar" ADD CONSTRAINT "calendar_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_account" ADD CONSTRAINT "google_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_userId_idx" ON "calendar" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "google_account_userId_idx" ON "google_account" USING btree ("user_id");--> statement-breakpoint
UPDATE "user" SET "role" = 'owner';--> statement-breakpoint
UPDATE "google_account" SET "user_id" = (SELECT "id" FROM "user" ORDER BY "created_at" LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "calendar" SET "user_id" = (SELECT "id" FROM "user" ORDER BY "created_at" LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
INSERT INTO "share_link" ("id","user_id","token","name","detail_level","feed_title","enabled","created_at","updated_at") SELECT md5(random()::text || clock_timestamp()::text || 'sharelink'), u."id", ss."share_token", 'My calendar', 'full', ss."feed_title", true, now(), now() FROM "share_settings" ss CROSS JOIN "user" u;--> statement-breakpoint
INSERT INTO "share_link_calendar" ("share_link_id","calendar_id") SELECT sl."id", c."id" FROM "share_link" sl, "calendar" c WHERE c."selected" = true;--> statement-breakpoint
ALTER TABLE "calendar" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "google_account" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "share_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "share_settings" CASCADE;--> statement-breakpoint
ALTER TABLE "calendar" DROP COLUMN "selected";
