import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { env } from "../env";
import { googleAccount, shareLink, shareLinkCalendar } from "../schema";
import { generateShareToken, randomId } from "../services/crypto";
import { syncCalendars } from "@/jobs/syncCalendars";

const detailLevel = z.enum(["full", "busy"]);

function feedUrl(token: string): string {
  return `${env.PUBLIC_URL}/share/${token}.ics`;
}
function webcalUrl(token: string): string {
  return feedUrl(token).replace(/^https?:\/\//, "webcal://");
}
// Human-friendly landing page — the link you actually send to people.
function sharePageUrl(token: string): string {
  return `${env.PUBLIC_URL}/c/${token}`;
}

async function ownedLink(userId: string, id: string) {
  const link = await db.query.shareLink.findFirst({
    where: (q, o) => o.and(o.eq(q.id, id), o.eq(q.userId, userId)),
  });
  if (!link) throw new TRPCError({ code: "NOT_FOUND" });
  return link;
}

// Set a link's calendar membership to the given ids — but only the ones the
// user actually owns (can't expose someone else's calendar).
async function setLinkCalendars(
  userId: string,
  linkId: string,
  calendarIds: string[],
): Promise<void> {
  const owned = calendarIds.length
    ? await db.query.calendar.findMany({
        where: (q, o) => o.and(o.inArray(q.id, calendarIds), o.eq(q.userId, userId)),
        columns: { id: true },
      })
    : [];
  const ownedIds = owned.map((c) => c.id);
  await db.transaction(async (tx) => {
    await tx.delete(shareLinkCalendar).where(eq(shareLinkCalendar.shareLinkId, linkId));
    if (ownedIds.length) {
      await tx
        .insert(shareLinkCalendar)
        .values(ownedIds.map((cid) => ({ shareLinkId: linkId, calendarId: cid })));
    }
  });
}

export const calendarRouter = router({
  // Connected Google accounts (+ their calendars) for the current user.
  accounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await db.query.googleAccount.findMany({
      where: (q) => eq(q.userId, ctx.user.id),
      with: { calendars: true },
    });
    return accounts.map((a) => ({
      id: a.id,
      email: a.email,
      status: a.status,
      calendars: a.calendars.map((c) => ({
        id: c.id,
        summary: c.summary,
        primary: c.primary,
        backgroundColor: c.backgroundColor,
        lastSyncedAt: c.lastSyncedAt,
      })),
    }));
  }),

  disconnectAccount: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .delete(googleAccount)
        .where(and(eq(googleAccount.id, input.accountId), eq(googleAccount.userId, ctx.user.id)));
    }),

  syncNow: protectedProcedure.mutation(async ({ ctx }) => {
    await syncCalendars.emit({ userId: ctx.user.id });
  }),

  links: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const links = await db.query.shareLink.findMany({
        where: (q) => eq(q.userId, ctx.user.id),
        with: { calendars: true },
        orderBy: (q, o) => [o.desc(q.createdAt)],
      });
      return links.map((l) => ({
        id: l.id,
        name: l.name,
        detailLevel: l.detailLevel,
        feedTitle: l.feedTitle,
        enabled: l.enabled,
        expiresAt: l.expiresAt,
        lastAccessedAt: l.lastAccessedAt,
        calendarIds: l.calendars.map((m) => m.calendarId),
        shareUrl: sharePageUrl(l.token),
        feedUrl: feedUrl(l.token),
        webcalUrl: webcalUrl(l.token),
      }));
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(120),
          detailLevel,
          calendarIds: z.array(z.string()).default([]),
          feedTitle: z.string().min(1).max(200).optional(),
          expiresAt: z.date().nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const id = randomId();
        const token = generateShareToken();
        await db.insert(shareLink).values({
          id,
          userId: ctx.user.id,
          token,
          name: input.name,
          detailLevel: input.detailLevel,
          feedTitle: input.feedTitle ?? input.name,
          expiresAt: input.expiresAt ?? null,
        });
        await setLinkCalendars(ctx.user.id, id, input.calendarIds);
        await syncCalendars.emit({ userId: ctx.user.id });
        return { id, feedUrl: feedUrl(token) };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(120).optional(),
          detailLevel: detailLevel.optional(),
          feedTitle: z.string().min(1).max(200).optional(),
          expiresAt: z.date().nullable().optional(),
          calendarIds: z.array(z.string()).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await ownedLink(ctx.user.id, input.id);
        const patch: Partial<typeof shareLink.$inferInsert> = {};
        if (input.name !== undefined) patch.name = input.name;
        if (input.detailLevel !== undefined) patch.detailLevel = input.detailLevel;
        if (input.feedTitle !== undefined) patch.feedTitle = input.feedTitle;
        if (input.expiresAt !== undefined) patch.expiresAt = input.expiresAt;
        if (Object.keys(patch).length > 0) {
          await db.update(shareLink).set(patch).where(eq(shareLink.id, input.id));
        }
        if (input.calendarIds) {
          await setLinkCalendars(ctx.user.id, input.id, input.calendarIds);
          await syncCalendars.emit({ userId: ctx.user.id });
        }
      }),

    setEnabled: protectedProcedure
      .input(z.object({ id: z.string(), enabled: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await ownedLink(ctx.user.id, input.id);
        await db
          .update(shareLink)
          .set({ enabled: input.enabled })
          .where(eq(shareLink.id, input.id));
      }),

    rotate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await ownedLink(ctx.user.id, input.id);
        const token = generateShareToken();
        await db
          .update(shareLink)
          .set({ token, rotatedAt: new Date() })
          .where(eq(shareLink.id, input.id));
        return { feedUrl: feedUrl(token), webcalUrl: webcalUrl(token) };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await ownedLink(ctx.user.id, input.id);
        await db.delete(shareLink).where(eq(shareLink.id, input.id));
      }),
  }),
});
