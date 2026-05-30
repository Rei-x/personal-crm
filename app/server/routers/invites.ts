import { z } from "zod";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { ownerProcedure, publicProcedure, router } from "../trpc";
import { db } from "../db";
import { env } from "../env";
import { invite } from "../schema";
import { generateShareToken, randomId } from "../services/crypto";

function inviteUrl(token: string): string {
  return `${env.PUBLIC_URL}/invite/${token}`;
}

export const invitesRouter = router({
  list: ownerProcedure.query(async () => {
    const rows = await db.query.invite.findMany({ orderBy: (q, o) => [o.desc(q.createdAt)] });
    return rows.map((i) => ({
      id: i.id,
      email: i.email,
      url: inviteUrl(i.token),
      expiresAt: i.expiresAt,
      usedAt: i.usedAt,
      createdAt: i.createdAt,
    }));
  }),

  create: ownerProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const token = generateShareToken();
      await db.insert(invite).values({
        id: randomId(),
        token,
        createdByUserId: ctx.user.id,
        email: input.email?.toLowerCase() ?? null,
        expiresAt: input.expiresInDays ? addDays(new Date(), input.expiresInDays) : null,
      });
      return { url: inviteUrl(token) };
    }),

  revoke: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.delete(invite).where(eq(invite.id, input.id));
  }),

  // Public: the /login invite view shows whether the invite is valid.
  check: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const inv = await db.query.invite.findFirst({ where: (q) => eq(q.token, input.token) });
    const valid = !!inv && !inv.usedAt && (!inv.expiresAt || inv.expiresAt > new Date());
    return { valid, email: inv?.email ?? null };
  }),
});
