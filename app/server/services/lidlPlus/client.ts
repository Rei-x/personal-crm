import { env } from "@/server/env";
import { LidlPlusApi } from "./lidlPlus";

export const lidlPlusClient = new LidlPlusApi("pl", "PL", env.LIDL_PLUS_REFRESH_TOKEN);
