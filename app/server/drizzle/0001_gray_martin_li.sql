CREATE TABLE IF NOT EXISTS "messages" (
	"messageId" text PRIMARY KEY NOT NULL,
	"roomId" text,
	"userId" text,
	"body" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processed_events" (
	"eventId" text PRIMARY KEY NOT NULL,
	"userDisplayName" text,
	"transcription" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_settings" (
	"roomId" text PRIMARY KEY NOT NULL,
	"transcriptionEnabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"userId" text PRIMARY KEY NOT NULL,
	"displayName" text,
	"avatarUrl" text
);
--> statement-breakpoint
DROP TABLE "user";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
