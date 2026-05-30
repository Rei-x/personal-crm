import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { db } from "../db";
import { googleAccount } from "../schema";
import { auth } from "../auth";
import { encrypt, randomId, signOAuthState, verifyOAuthState } from "../services/crypto";
import { buildAuthUrl, exchangeCode, importCalendarList } from "../services/google";
import { requestSync } from "@/jobs/syncCalendars";

export const googleOAuthRouter = Router();

// Start consent. The signed state binds the connecting user so the callback
// can attach the account to the right person.
googleOAuthRouter.get("/start", (req, res) => {
  void handleStart(req, res);
});

async function handleStart(req: Request, res: Response): Promise<void> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) {
    res.redirect("/login");
    return;
  }
  res.redirect(buildAuthUrl(signOAuthState(session.user.id)));
}

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
    const userId = verifyOAuthState(state);
    if (!code || !userId) {
      res.redirect("/calendar?error=invalid_state");
      return;
    }

    const exchanged = await exchangeCode(code);
    const existing = await db.query.googleAccount.findFirst({
      where: (q) => eq(q.googleSub, exchanged.sub),
    });

    // A Google account belongs to exactly one app user — never let another user
    // re-bind it.
    if (existing && existing.userId !== userId) {
      res.redirect("/calendar?error=account_taken");
      return;
    }

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
        res.redirect("/calendar?error=no_refresh_token");
        return;
      }
      accountId = randomId();
      await db.insert(googleAccount).values({
        id: accountId,
        userId,
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
    await requestSync(userId);

    res.redirect("/calendar?connected=" + encodeURIComponent(exchanged.email));
  } catch (e) {
    console.error("Google OAuth callback failed", e);
    res.redirect("/calendar?error=oauth_failed");
  }
}
