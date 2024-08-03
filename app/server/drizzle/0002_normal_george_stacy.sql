CREATE TABLE IF NOT EXISTS "reminders" (
	"reminderId" serial PRIMARY KEY NOT NULL,
	"userId" text,
	"reminder" text,
	"howOftenInSeconds" integer NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminders" ADD CONSTRAINT "reminders_userId_users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
