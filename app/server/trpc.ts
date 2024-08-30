import { transformer } from "@/lib/transformer";
import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";

const t = initTRPC.create({
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
