import * as sdk from "matrix-js-sdk";
import { env } from "../env";

export const client = sdk.createClient({
  baseUrl: env.MATRIX_BASE_URL,
  userId: env.MATRIX_USER_ID,
  accessToken: env.MATRIX_ACCESS_TOKEN,
});

export { sdk };
