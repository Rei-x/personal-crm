import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { googleAccount } from "../schema";
import { encrypt, randomId, signOAuthState, verifyOAuthState } from "../services/crypto";
import { buildAuthUrl, exchangeCode, importCalendarList } from "../services/google";
import { syncCalendars } from "@/jobs/syncCalendars";

export const googleOAuthRouter = Router();

// Kick off Google consent. State is a stateless signed CSRF token.
googleOAuthRouter.get("/start", (_req, res) => {
  res.redirect(buildAuthUrl(signOAuthState()));
});

// Non-async wrapper: handleCallback never rejects (it catches internally), so
// Express 4 won't see an unhandled promise.
googleOAuthRouter.get("/callback", (req, res) => {
  void handleCallback(req, res);
});

async function handleCallback(req: Request, res: Response): Promise<void> {
  try {
    const errorParam = typeof req.query.error === "string" ? req.query.error : undefined;
    if (errorParam) {
      res.redirect("/calendar?error=" + encodeURIComponent(errorParam));
      return;
    }
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code || !verifyOAuthState(state)) {
      res.redirect("/calendar?error=invalid_state");
      return;
    }

    const exchanged = await exchangeCode(code);
    const existing = await db.query.googleAccount.findFirst({
      where: (q) => eq(q.googleSub, exchanged.sub),
    });

    let accountId: string;
    if (existing) {
      accountId = existing.id;
      await db
        .update(googleAccount)
        .set({
          email: exchanged.email,
          scope: exchanged.scope,
          status: "active",
          ...(exchanged.refreshToken ? { refreshTokenEnc: encrypt(exchanged.refreshToken) } : {}),
          ...(exchanged.accessToken ? { accessTokenEnc: encrypt(exchanged.accessToken) } : {}),
          ...(exchanged.expiryDate ? { accessTokenExpiresAt: new Date(exchanged.expiryDate) } : {}),
        })
        .where(eq(googleAccount.id, existing.id));
    } else {
      if (!exchanged.refreshToken) {
        // No refresh token means we can't sync in the background later.
        res.redirect("/calendar?error=no_refresh_token");
        return;
      }
      accountId = randomId();
      await db.insert(googleAccount).values({
        id: accountId,
        googleSub: exchanged.sub,
        email: exchanged.email,
        refreshTokenEnc: encrypt(exchanged.refreshToken),
        accessTokenEnc: exchanged.accessToken ? encrypt(exchanged.accessToken) : null,
        accessTokenExpiresAt: exchanged.expiryDate ? new Date(exchanged.expiryDate) : null,
        scope: exchanged.scope,
        status: "active",
      });
    }

    const account = await db.query.googleAccount.findFirst({ where: (q) => eq(q.id, accountId) });
    if (account) {
      await importCalendarList(account);
    }
    await syncCalendars.emit(undefined);

    res.redirect("/calendar?connected=" + encodeURIComponent(exchanged.email));
  } catch (e) {
    console.error("Google OAuth callback failed", e);
    res.redirect("/calendar?error=oauth_failed");
  }
}
