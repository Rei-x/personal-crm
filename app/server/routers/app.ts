import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "../db";
import { reminders } from "../schema";
import { eq } from "drizzle-orm";
import { reminderJob } from "../crons/sendReminder";

export const appRouter = router({
  reminders: router({
    delete: publicProcedure
      .input(
        z.object({
          reminderId: z.number(),
        })
      )
      .mutation(async ({ input: { reminderId } }) => {
        return db.delete(reminders).where(eq(reminders.reminderId, reminderId));
      }),
    runCron: publicProcedure.mutation(async () => {
      reminderJob.fireOnTick();
    }),
  }),
});

export type AppRouter = typeof appRouter;
