import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";

// Guards browser-facing server routes (the OAuth connect flow). Unauthenticated
// requests are bounced to the SPA login page.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!data?.user) {
      res.redirect("/login");
      return;
    }
    next();
  } catch (e) {
    console.error("requireAuth failed", e);
    res.redirect("/login");
  }
}
