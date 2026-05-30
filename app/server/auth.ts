import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { env } from "./env";
import { user, session, account, verification, invite } from "./schema";

// Reads the `invite_token` cookie from the Better Auth hook context (runtime-
// narrowed; the ctx type is broad).
function readInviteCookie(ctx: unknown): string | null {
  if (!ctx || typeof ctx !== "object" || !("headers" in ctx)) return null;
  const headers = ctx.headers;
  if (!(headers instanceof Headers)) return null;
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  const m = /(?:^|;\s*)invite_token=([^;]+)/.exec(cookie);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

type Invite = typeof invite.$inferSelect;

// A signup is allowed if there's a usable invite — either matched by the token
// cookie set on the /invite/:token landing page, or (fallback) an unused invite
// scoped to this exact email. Fail-closed.
async function findUsableInvite(email: string, token: string | null): Promise<Invite | null> {
  const now = new Date();
  const usable = (inv: Invite | undefined): inv is Invite =>
    !!inv && !inv.usedAt && (!inv.expiresAt || inv.expiresAt > now);

  if (token) {
    const byToken = await db.query.invite.findFirst({ where: (q) => eq(q.token, token) });
    if (usable(byToken) && (!byToken.email || byToken.email === email)) return byToken;
  }
  const byEmail = await db.query.invite.findFirst({
    where: (q, o) => o.and(o.eq(q.email, email), o.isNull(q.usedAt)),
  });
  return usable(byEmail) ? byEmail : null;
}

// App-level authentication (replaces the former Authelia SSO). Multi-tenant:
// the owner (OWNER_EMAIL) gets role 'owner'; everyone else must arrive with a
// valid invite and gets role 'friend'. Login via email+password or Google.
export const auth = betterAuth({
  baseURL: env.PUBLIC_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.PUBLIC_URL, "http://localhost:5173", "http://localhost:4000"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "friend",
        input: false, // clients can't set their own role
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: ["email", "profile"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser, ctx) => {
          const email = newUser.email.toLowerCase();
          if (email === env.OWNER_EMAIL.toLowerCase()) {
            return { data: { ...newUser, role: "owner" } };
          }
          const inv = await findUsableInvite(email, readInviteCookie(ctx));
          if (!inv) {
            throw new APIError("FORBIDDEN", { message: "An invite is required to sign up." });
          }
          return { data: { ...newUser, role: inv.role } };
        },
        after: async (createdUser, ctx) => {
          const email = createdUser.email.toLowerCase();
          if (email === env.OWNER_EMAIL.toLowerCase()) return;
          const inv = await findUsableInvite(email, readInviteCookie(ctx));
          if (!inv) return;
          await db
            .update(invite)
            .set({ usedAt: new Date(), usedByUserId: createdUser.id })
            .where(and(eq(invite.id, inv.id), isNull(invite.usedAt)));
        },
      },
    },
  },
});

export type Auth = typeof auth;
