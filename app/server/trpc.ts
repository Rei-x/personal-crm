import { transformer } from "@/lib/transformer";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";

export async function createContext({ req }: CreateExpressContextOptions) {
  const data = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer,
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires a valid Better Auth session. All admin functionality is built on
// this; only a couple of explicitly public procedures (e.g. needsSetup) use
// publicProcedure.
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({
    ctx: { user: opts.ctx.user, session: opts.ctx.session },
  });
});
