import type { AppRouter } from "@/server/routers/app";
import { createTRPCClient, httpBatchLink } from "@trpc/react-query";
import { transformer } from "./transformer";
import { env } from "@/server/env";

export const trpcServerClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: env.API_URL + "/trpc",
      transformer,
    }),
  ],
});
