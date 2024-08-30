DROP TABLE "jobs";--> statement-breakpoint
DROP TABLE "messages";--> statement-breakpoint
DROP TABLE "reminders";--> statement-breakpoint
DROP TABLE "users";--> statement-breakpoint
ALTER TABLE "room_settings" ALTER COLUMN "transcriptionEnabled" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_settings" ADD COLUMN "howOftenInSeconds" integer;