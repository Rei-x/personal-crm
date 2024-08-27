CREATE TABLE IF NOT EXISTS "jobs" (
	"jobId" text PRIMARY KEY NOT NULL,
	"lastRunAt" timestamp DEFAULT now() NOT NULL
);
