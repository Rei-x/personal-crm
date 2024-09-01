import { json } from "@remix-run/node";
import { serialize } from "superjson";
import "./transformer";

export const jsonJson = <Data>(
  obj: Data,
  init?: number | ResponseInit
): Data => {
  const superJsonResult = serialize(obj);
  // @ts-expect-error ??? asdsadasdasd
  return json(superJsonResult, init);
};
