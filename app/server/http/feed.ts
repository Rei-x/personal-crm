import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import ical, {
  ICalCalendarMethod,
  ICalEventClass,
  ICalEventTransparency,
  type ICalEventData,
} from "ical-generator";
import { db } from "../db";
import { shareLink } from "../schema";

// Public iCal feed: GET /share/:token(.ics). 404 unless the token matches an
// enabled, non-expired share link. Renders the link's member calendars at the
// link's detail level (full event details, or opaque "Busy" blocks).
export async function feedHandler(req: Request, res: Response): Promise<void> {
  try {
    await serveFeed(req, res);
  } catch (e) {
    console.error("Feed generation failed", e);
    res.status(500).type("text/plain").send("Internal error");
  }
}

function eventData(
  ev: {
    googleEventId: string;
    summary: string | null;
    description: string | null;
    location: string | null;
    htmlLink: string | null;
  },
  busy: boolean,
): Partial<ICalEventData> {
  if (busy) {
    return {
      id: ev.googleEventId,
      summary: "Busy",
      transparency: ICalEventTransparency.OPAQUE,
      class: ICalEventClass.PRIVATE,
    };
  }
  return {
    id: ev.googleEventId,
    summary: ev.summary ?? "(no title)",
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
    url: ev.htmlLink ?? undefined,
  };
}

async function serveFeed(req: Request, res: Response): Promise<void> {
  const raw = req.params.token ?? "";
  const token = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;
  if (!token) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }

  const link = await db.query.shareLink.findFirst({
    where: (q) => eq(q.token, token),
    with: { calendars: { with: { calendar: { with: { events: true } } } } },
  });

  const now = new Date();
  if (!link || !link.enabled || (link.expiresAt && link.expiresAt <= now)) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }

  const busy = link.detailLevel === "busy";
  const cal = ical({
    name: link.feedTitle,
    prodId: { company: "personal-crm", product: "calendar-share", language: "EN" },
    method: ICalCalendarMethod.PUBLISH,
  });
  cal.ttl(60 * 60); // refresh hint (~1h); Google largely ignores this

  for (const member of link.calendars) {
    const c = member.calendar;
    if (!c) continue;
    for (const ev of c.events) {
      if (ev.allDay) {
        if (!ev.startDate) continue;
        cal.createEvent({
          ...eventData(ev, busy),
          allDay: true,
          start: new Date(`${ev.startDate}T00:00:00Z`),
          end: ev.endDate ? new Date(`${ev.endDate}T00:00:00Z`) : undefined,
        });
      } else {
        if (!ev.startsAt || !ev.endsAt) continue;
        cal.createEvent({
          ...eventData(ev, busy),
          start: ev.startsAt,
          end: ev.endsAt,
        });
      }
    }
  }

  // Best-effort "last used" stamp.
  void db
    .update(shareLink)
    .set({ lastAccessedAt: now })
    .where(eq(shareLink.id, link.id))
    .catch((e) => console.error("lastAccessedAt update failed", e));

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="calendar.ics"');
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(cal.toString());
}
