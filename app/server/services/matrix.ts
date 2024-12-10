import * as sdk from "matrix-js-sdk";
import { env } from "../env";
import { logger } from "matrix-js-sdk/lib/logger.js";

logger.disableAll();
export const client = sdk.createClient({
  baseUrl: env.MATRIX_BASE_URL,
  userId: env.MATRIX_USER_ID,
  accessToken: env.MATRIX_ACCESS_TOKEN,
});

// export const matrixService = () => {
//   return {
//     sendMessageWithMention: (roomId: string, message: string, ) => {

//     }
//   }
// }

// {"msgtype":"m.text","body":"Wojciech Krzos","format":"org.matrix.custom.html","formatted_body":"<a href=\"https://matrix.to/#/@discord_1210723660718018570:matrix.suzuya.dev\">Wojciech Krzos</a>","m.mentions":{"user_ids":["@discord_1210723660718018570:matrix.suzuya.dev"]}}

export { sdk };
