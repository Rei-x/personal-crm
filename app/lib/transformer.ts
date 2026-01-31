import { SuperJSON } from "superjson";
import { MatrixEvent, type IEvent } from "matrix-js-sdk";

// @ts-expect-error Custom serializer for MatrixEvent
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
