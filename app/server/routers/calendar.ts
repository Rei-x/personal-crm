import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { env } from "../env";
import { googleAccount, calendar, calendarEvent, shareSettings } from "../schema";
import { generateShareToken } from "../services/crypto";
import { syncCalendars } from "@/jobs/syncCalendars";

async function getOrCreateShareSettings() {
  let s = await db.query.shareSettings.findFirst();
  if (!s) {
    await db
      .insert(shareSettings)
      .values({ id: 1, shareToken: generateShareToken() })
      .onConflictDoNothing();
    s = await db.query.shareSettings.findFirst();
  }
  if (!s) throw new Error("Failed to initialise share settings");
  return s;
}

function feedUrl(token: string): string {
  return `${env.PUBLIC_URL}/share/${token}.ics`;
}

export const calendarRouter = router({
  accounts: protectedProcedure.query(async () => {
    const accounts = await db.query.googleAccount.findMany({ with: { calendars: true } });
    return accounts.map((a) => {
      const calendars = a.calendars.map((c) => ({
        id: c.id,
        summary: c.summary,
        selected: c.selected,
        primary: c.primary,
        accessRole: c.accessRole,
        backgroundColor: c.backgroundColor,
        lastSyncedAt: c.lastSyncedAt,
      }));
      return {
        id: a.id,
        email: a.email,
        status: a.status,
        // primary calendars first, without mutating the array
        calendars: [...calendars.filter((c) => c.primary), ...calendars.filter((c) => !c.primary)],
      };
    });
  }),

  toggleCalendar: protectedProcedure
    .input(z.object({ calendarId: z.string(), selected: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(calendar)
        .set({ selected: input.selected })
        .where(eq(calendar.id, input.calendarId));
    }),

  disconnectAccount: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(googleAccount).where(eq(googleAccount.id, input.accountId));
    }),

  share: protectedProcedure.query(async () => {
    const s = await getOrCreateShareSettings();
    const [row] = await db.select({ value: count() }).from(calendarEvent);
    return {
      feedUrl: feedUrl(s.shareToken),
      feedTitle: s.feedTitle,
      rotatedAt: s.rotatedAt,
      eventCount: Number(row?.value ?? 0),
    };
  }),

  rotateShareLink: protectedProcedure.mutation(async () => {
    const s = await getOrCreateShareSettings();
    const token = generateShareToken();
    await db
      .update(shareSettings)
      .set({ shareToken: token, rotatedAt: new Date() })
      .where(eq(shareSettings.id, s.id));
    return { feedUrl: feedUrl(token) };
  }),

  updateFeedTitle: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const s = await getOrCreateShareSettings();
      await db
        .update(shareSettings)
        .set({ feedTitle: input.title })
        .where(eq(shareSettings.id, s.id));
    }),

  syncNow: protectedProcedure.mutation(async () => {
    await syncCalendars.emit(undefined);
  }),
});
