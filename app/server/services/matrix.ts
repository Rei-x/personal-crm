import * as sdk from "matrix-js-sdk";
import { env } from "../env";
import { logger } from "matrix-js-sdk/lib/logger.js";

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- matrix-js-sdk logger workaround
(logger as unknown as { disableAll: () => void }).disableAll();
export const client = sdk.createClient({
  baseUrl: env.MATRIX_BASE_URL,
  userId: env.MATRIX_USER_ID,
  accessToken: env.MATRIX_ACCESS_TOKEN,
});

export { sdk };
