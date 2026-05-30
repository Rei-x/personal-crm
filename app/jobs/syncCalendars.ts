import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import type { calendar_v3 } from "googleapis";
import { createJob } from "@/server/services/pgboss";
import { db } from "@/server/db";
import { googleAccount, calendar, calendarEvent } from "@/server/schema";
import { calendarClientForAccount } from "@/server/services/google";

const WINDOW_PAST_DAYS = 30;
const WINDOW_FUTURE_DAYS = 180;
const INSERT_CHUNK = 500;

type GEvent = calendar_v3.Schema$Event;

export const syncCalendars = createJob("syncCalendars", async () => {
  const accounts = await db.query.googleAccount.findMany({
    where: (q) => eq(q.status, "active"),
    with: { calendars: true },
  });

  const timeMin = addDays(new Date(), -WINDOW_PAST_DAYS).toISOString();
  const timeMax = addDays(new Date(), WINDOW_FUTURE_DAYS).toISOString();

  for (const acc of accounts) {
    const selected = acc.calendars.filter((c) => c.selected);
    if (selected.length === 0) continue;

    const cal = calendarClientForAccount(acc);

    for (const c of selected) {
      try {
        const events = await listAllEvents(cal, c.googleCalendarId, timeMin, timeMax);
        await replaceCalendarEvents(c.id, events);
        await db.update(calendar).set({ lastSyncedAt: new Date() }).where(eq(calendar.id, c.id));
        console.log(
          `Synced ${events.length} events for ${acc.email} / ${c.summary ?? c.googleCalendarId}`,
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Calendar sync failed for ${acc.email} / ${c.summary}:`, message);
        if (
          message.includes("invalid_grant") ||
          message.includes("401") ||
          message.includes("invalid_request")
        ) {
          await db
            .update(googleAccount)
            .set({ status: "needs_reauth" })
            .where(eq(googleAccount.id, acc.id));
        }
      }
    }
  }
});

async function listAllEvents(
  cal: calendar_v3.Calendar,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GEvent[]> {
  const out: GEvent[] = [];
  let pageToken: string | undefined;
  do {
    const res = await cal.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true, // expand recurring events into instances
      orderBy: "startTime",
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });
    out.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

// Drop events that shouldn't count against availability:
// declined by the owner, marked Free (transparent), or cancelled.
function keepEvent(e: GEvent): boolean {
  if (e.status === "cancelled") return false;
  if (e.transparency === "transparent") return false;
  const self = e.attendees?.find((a) => a.self);
  if (self?.responseStatus === "declined") return false;
  return true;
}

function toRow(calendarId: string, e: GEvent): typeof calendarEvent.$inferInsert {
  const isAllDay = Boolean(e.start?.date && !e.start?.dateTime);
  return {
    calendarId,
    googleEventId: e.id ?? `${calendarId}-${e.iCalUID ?? Math.random()}`,
    icalUid: e.iCalUID ?? null,
    summary: e.summary ?? null,
    description: e.description ?? null,
    location: e.location ?? null,
    allDay: isAllDay,
    startsAt: e.start?.dateTime ? new Date(e.start.dateTime) : null,
    endsAt: e.end?.dateTime ? new Date(e.end.dateTime) : null,
    startDate: isAllDay ? (e.start?.date ?? null) : null,
    endDate: isAllDay ? (e.end?.date ?? null) : null,
    status: e.status ?? null,
    htmlLink: e.htmlLink ?? null,
  };
}

async function replaceCalendarEvents(calendarId: string, events: GEvent[]): Promise<void> {
  const rows = events.filter(keepEvent).map((e) => toRow(calendarId, e));
  await db.transaction(async (tx) => {
    await tx.delete(calendarEvent).where(eq(calendarEvent.calendarId, calendarId));
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      await tx.insert(calendarEvent).values(rows.slice(i, i + INSERT_CHUNK));
    }
  });
}
