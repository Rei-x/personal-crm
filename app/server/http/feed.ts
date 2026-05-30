import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import ical, { ICalCalendarMethod } from "ical-generator";
import { db } from "../db";

// Public iCal feed: GET /share/:token(.ics). 404 unless the token matches the
// current rotatable share token. Serves the merged events of all selected
// calendars across all connected accounts, with full details.
export async function feedHandler(req: Request, res: Response): Promise<void> {
  try {
    await serveFeed(req, res);
  } catch (e) {
    console.error("Feed generation failed", e);
    res.status(500).type("text/plain").send("Internal error");
  }
}

async function serveFeed(req: Request, res: Response): Promise<void> {
  const raw = req.params.token ?? "";
  const token = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;

  const settings = await db.query.shareSettings.findFirst();
  if (!settings || !token || settings.shareToken !== token) {
    res.status(404).type("text/plain").send("Not found");
    return;
  }

  const calendars = await db.query.calendar.findMany({
    where: (q) => eq(q.selected, true),
    with: { events: true },
  });

  const cal = ical({
    name: settings.feedTitle,
    prodId: { company: "personal-crm", product: "calendar-share", language: "EN" },
    method: ICalCalendarMethod.PUBLISH,
  });
  cal.ttl(60 * 60); // refresh hint (~1h); Google largely ignores this

  for (const c of calendars) {
    for (const ev of c.events) {
      if (ev.allDay) {
        if (!ev.startDate) continue;
        cal.createEvent({
          id: ev.googleEventId,
          start: new Date(`${ev.startDate}T00:00:00Z`),
          end: ev.endDate ? new Date(`${ev.endDate}T00:00:00Z`) : undefined,
          allDay: true,
          summary: ev.summary ?? "(no title)",
          description: ev.description ?? undefined,
          location: ev.location ?? undefined,
          url: ev.htmlLink ?? undefined,
        });
      } else {
        if (!ev.startsAt || !ev.endsAt) continue;
        cal.createEvent({
          id: ev.googleEventId,
          start: ev.startsAt,
          end: ev.endsAt,
          summary: ev.summary ?? "(no title)",
          description: ev.description ?? undefined,
          location: ev.location ?? undefined,
          url: ev.htmlLink ?? undefined,
        });
      }
    }
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="calendar.ics"');
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(cal.toString());
}
