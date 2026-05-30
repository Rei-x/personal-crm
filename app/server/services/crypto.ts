import crypto from "node:crypto";
import { env } from "../env";

// AES-256-GCM encryption for Google OAuth tokens at rest.
// ENCRYPTION_KEY is 32 bytes encoded as 64 hex chars (openssl rand -hex 32).

const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");
const ALGO = "aes-256-gcm";

if (KEY.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
}

/** Encrypt a UTF-8 string. Returns `iv:tag:ciphertext`, each base64. */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Decrypt a payload produced by {@link encrypt}. */
export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

/** URL-safe unguessable token for the public feed link. */
export function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Random id for rows we control (accounts, calendars). */
export function randomId(): string {
  return crypto.randomUUID();
}

// Stateless, signed CSRF token for the Google OAuth round-trip that also binds
// the connecting user: `<ts>.<userId>.<HMAC(ts.userId)>`. (userId is a UUID, no dots.)
export function signOAuthState(userId: string): string {
  const ts = Date.now().toString();
  const payload = `${ts}.${userId}`;
  const sig = crypto
    .createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** Returns the bound userId if the state is valid and fresh, else null. */
export function verifyOAuthState(
  state: string | undefined,
  maxAgeMs = 10 * 60 * 1000,
): string | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [ts, userId, sig] = parts;
  if (!ts || !userId || !sig) return null;
  const expected = crypto
    .createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`${ts}.${userId}`)
    .digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Date.now() - Number(ts) >= maxAgeMs) return null;
  return userId;
}
