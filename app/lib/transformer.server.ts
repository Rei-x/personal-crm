import { serialize } from "superjson";
import "./transformer";

export const jsonJson = <Data>(obj: Data): Data => {
  const superJsonResult = serialize(obj);
  // @ts-expect-error ??? asdsadasdasd
  return superJsonResult;
};
