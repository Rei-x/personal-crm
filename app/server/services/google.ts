import { google, type calendar_v3, type Auth } from "googleapis";
import { eq } from "drizzle-orm";
import { env } from "../env";
import { db } from "../db";
import { googleAccount, calendar } from "../schema";
import { decrypt, encrypt, randomId } from "./crypto";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
];

const REDIRECT_URI = `${env.PUBLIC_URL}/oauth/google/callback`;

export function oauthClient(): Auth.OAuth2Client {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

/** Build the Google consent URL. `access_type=offline` + `prompt=consent`
 *  guarantees a refresh token and lets the user pick a different account. */
export function buildAuthUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
    state,
  });
}

export interface ExchangedAccount {
  sub: string;
  email: string;
  refreshToken: string | null;
  accessToken: string | null;
  expiryDate: number | null;
  scope: string | null;
}

export async function exchangeCode(code: string): Promise<ExchangedAccount> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error("No id_token returned from Google");
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Missing sub/email in Google id_token");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    refreshToken: tokens.refresh_token ?? null,
    accessToken: tokens.access_token ?? null,
    expiryDate: tokens.expiry_date ?? null,
    scope: tokens.scope ?? null,
  };
}

type Account = typeof googleAccount.$inferSelect;

/** Authenticated Calendar client for a stored account; transparently refreshes
 *  the access token and persists the new token back to the DB. */
export function calendarClientForAccount(acc: Account): calendar_v3.Calendar {
  const client = oauthClient();
  client.setCredentials({
    refresh_token: decrypt(acc.refreshTokenEnc),
    access_token: acc.accessTokenEnc ? decrypt(acc.accessTokenEnc) : undefined,
    expiry_date: acc.accessTokenExpiresAt ? acc.accessTokenExpiresAt.getTime() : undefined,
  });
  client.on("tokens", (tokens) => {
    void persistTokens(acc.id, tokens).catch((err) => console.error("persistTokens failed", err));
  });
  return google.calendar({ version: "v3", auth: client });
}

async function persistTokens(
  accountId: string,
  tokens: {
    access_token?: string | null;
    expiry_date?: number | null;
    refresh_token?: string | null;
  },
): Promise<void> {
  const update: Partial<typeof googleAccount.$inferInsert> = {};
  if (tokens.access_token) update.accessTokenEnc = encrypt(tokens.access_token);
  if (tokens.expiry_date) update.accessTokenExpiresAt = new Date(tokens.expiry_date);
  if (tokens.refresh_token) update.refreshTokenEnc = encrypt(tokens.refresh_token);
  if (Object.keys(update).length === 0) return;
  await db.update(googleAccount).set(update).where(eq(googleAccount.id, accountId));
}

/** Fetch the account's calendar list and upsert it into the `calendar` table,
 *  preserving the user's `selected` choices. New owned/primary calendars are
 *  selected by default. */
export async function importCalendarList(acc: Account): Promise<void> {
  const cal = calendarClientForAccount(acc);
  const res = await cal.calendarList.list({ maxResults: 250, showHidden: false });
  const items = res.data.items ?? [];

  for (const item of items) {
    if (!item.id) continue;
    const values = {
      summary: item.summaryOverride ?? item.summary ?? null,
      description: item.description ?? null,
      timeZone: item.timeZone ?? null,
      accessRole: item.accessRole ?? null,
      backgroundColor: item.backgroundColor ?? null,
      primary: item.primary ?? false,
    };

    const existing = await db.query.calendar.findFirst({
      where: (q, o) => o.and(o.eq(q.googleAccountId, acc.id), o.eq(q.googleCalendarId, item.id!)),
    });

    if (existing) {
      await db.update(calendar).set(values).where(eq(calendar.id, existing.id));
    } else {
      await db.insert(calendar).values({
        id: randomId(),
        userId: acc.userId,
        googleAccountId: acc.id,
        googleCalendarId: item.id,
        ...values,
      });
    }
  }
}
