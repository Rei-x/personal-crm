ALTER TABLE "reminders" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "updatedAt" timestamp NOT NULL;