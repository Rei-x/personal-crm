import { SuperJSON, deserialize, type SuperJSONResult } from "superjson";
import { MatrixEvent, type IEvent } from "matrix-js-sdk";
import { useLoaderData as useRemixLoaderData } from "react-router";
import { useMemo } from "react";

// @ts-expect-error ??? DASDASDSAD
SuperJSON.registerCustom<MatrixEvent, IEvent>(
  {
    deserialize(v) {
      return new MatrixEvent(v);
    },
    serialize(v) {
      return v.getEffectiveEvent();
    },
    isApplicable(v) {
      return v instanceof MatrixEvent;
    },
  },
  "matrixEvent"
);
export const transformer = SuperJSON;

export const parse = <Data>(superJsonResult: SuperJSONResult) =>
  deserialize(superJsonResult) as Data;

export const useJsonLoaderData = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => unknown
>() => {
  const loaderData = useRemixLoaderData<T>(); // HACK: any to avoid type error

  // @ts-expect-error ??? asdasdsadsad
  return useMemo(() => parse<Awaited<ReturnType<T>>>(loaderData), [loaderData]);
};
