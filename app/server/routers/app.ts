import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "../db";
import { roomSettings } from "../schema";
import { eq } from "drizzle-orm";
import { client } from "../services/matrix";
import {
  TRPCError,
  type inferRouterInputs,
  type inferRouterOutputs,
} from "@trpc/server";
import { scheduleMessage } from "@/jobs/scheduleMessage";
import { enableLidlCoupons } from "@/jobs/enableLidlCoupons";
import { MsgType } from "matrix-js-sdk";
import { lidlPlusClient } from "../services/lidlPlus/client";
import { addMonths } from "date-fns";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => Math.floor(Math.random() * 600) + 200; // 200-800ms

const devDelayProcedure = publicProcedure.use(async (opts) => {
  if (process.env.NODE_ENV !== "production") {
    await delay(randomDelay());
  }
  return opts.next();
});

const loggedProcedure = devDelayProcedure.use(async (opts) => {
  const start = Date.now();

  const result = await opts.next();

  const durationMs = Date.now() - start;
  const meta = { path: opts.path, type: opts.type, durationMs };

  if (result.ok) {
    console.log("OK request timing:", meta);
  } else {
    console.error("Non-OK request timing", meta);
  }

  return result;
});

export const appRouter = router({
  sendMessage: loggedProcedure
    .input(
      z.object({
        roomId: z.string(),
        message: z.string(),
        date: z.date().optional(),
        mentions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input: { roomId, message, date, mentions } }) => {
      if (date) {
        console.log("Scheduling message", { roomId, message, date });
        const result = await scheduleMessage.emit(
          {
            roomId,
            message,
          },
          {
            startAfter: date,
          }
        );
        console.log("Scheduled message", result);
      } else {
        await client.sendMessage(roomId, {
          msgtype: MsgType.Text,
          body: message,
          format: "org.matrix.custom.html",
          "m.mentions": mentions
            ? {
                user_ids: mentions,
              }
            : undefined,
        });
      }
    }),
  deleteScheduledMessage: loggedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input: { id } }) => {
      await scheduleMessage.cancel(id);
    }),

  enableLidlCoupons: loggedProcedure.mutation(async () => {
    await enableLidlCoupons.emit(undefined);
  }),

  rooms: router({
    single: loggedProcedure
      .input(
        z.object({
          roomId: z.string(),
        })
      )
      .query(async ({ input: { roomId } }) => {
        const room = client.getRoom(roomId);

        if (!room) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Room not found",
          });
        }

        const timeline = room.getLiveTimeline();

        const eventsCopy = timeline.getEvents().map((e) => e);

        let settings = await db.query.roomSettings.findFirst({
          where: (q) => eq(q.roomId, roomId),
        });

        if (!settings) {
          await db.insert(roomSettings).values({
            roomId,
          });

          settings = await db.query.roomSettings.findFirst({
            where: (q) => eq(q.roomId, roomId),
          });

          if (!settings) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create room settings",
            });
          }
        }

        return {
          name: room.name,
          id: room.roomId,
          events: eventsCopy,
          scheduledMessages: await scheduleMessage.getJobs().then((jobs) =>
            jobs
              .filter((j) => j.data.roomId === roomId)
              .map((j) => ({
                id: j.id,
                roomId: j.data.roomId,
                message: j.data.message,
                date: j.startAfter,
              }))
          ),
          latestMessageDate: new Date(room.getLastActiveTimestamp()),
          settings,
        };
      }),
    all: loggedProcedure.query(async () => {
      return client
        .getVisibleRooms()
        .map((room) => {
          const eventsCopy = room
            .getLiveTimeline()
            .getEvents()
            .map((e) => e);

          return {
            name: room.name,
            id: room.roomId,
            latestEvent:
              eventsCopy[room.getLiveTimeline().getEvents().length - 1]?.event,
            latestMessage: eventsCopy
              .reverse()
              .find((e) => e.getType() === "m.room.message"),
          };
        })
        .sort((a, b) => {
          const aMessage = a.latestEvent;
          const bMessage = b.latestEvent;
          if (!aMessage?.origin_server_ts && !bMessage?.origin_server_ts) {
            return 0;
          }

          if (!aMessage?.origin_server_ts) {
            return 1;
          }

          if (!bMessage?.origin_server_ts) {
            return -1;
          }

          return aMessage.origin_server_ts > bMessage.origin_server_ts ? -1 : 1;
        });
    }),
    updateSettings: loggedProcedure
      .input(
        z.object({
          roomId: z.string(),
          howOftenInDays: z.number(),
          enableTranscriptions: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        return db
          .update(roomSettings)
          .set({
            howOftenInSeconds: input.howOftenInDays
              ? input.howOftenInDays * 24 * 60 * 60
              : null,
            transcriptionEnabled: input.enableTranscriptions,
          })
          .where(eq(roomSettings.roomId, input.roomId));
      }),
  }),
  receipts: router({
    all: loggedProcedure.query(async () => {
      return {
        receipts: await db.query.receipts.findMany({
          with: {
            receiptItems: true,
          },
          where: (q, o) => o.gte(q.receiptDate, addMonths(new Date(), -2)),
        }),
      };
    }),
  }),
  lidl: router({
    getReceipt: loggedProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .query(async ({ input: { id } }) => {
        return lidlPlusClient.receipt(id);
      }),
    coupons: loggedProcedure.query(async () => {
      const promos = await lidlPlusClient.couponPromotionsV2();
      return {
        coupons: promos.sections.flatMap((s) =>
          s.promotions.map((p) => ({
            id: p.id,
            image: p.image,
            apologizeStatus: p.availability.apologizeStatus,
            apologizeText: p.availability.text ?? "",
            type: p.type,
            promotionId: p.promotionId,
            offerTitle: p.discount.title,
            offerDescriptionShort: p.discount.description,
            apologizeTitle: p.availability.title ?? "",
            endValidityDate: p.validity.end,
            startValidityDate: p.validity.start,
            firstColor: p.specialPromotion.color ?? "",
            firstFontColor: p.specialPromotion.fontColor ?? "",
            hasAsterisk: p.discount.hasAsterisk,
            isActivated: p.isActivated,
            isHappyHour: p.isHappyHour,
            isSegmented: p.isProcessing,
            source: p.source,
            isSpecial: p.isSpecial,
            stores: p.stores,
            secondaryColor: null,
            secondaryFontColor: null,
            tagSpecial: p.specialPromotion.tag ?? "",
            title: p.title,
          }))
        ),
      };
    }),
    activateAll: loggedProcedure.mutation(async () => {
      const allPromos = await lidlPlusClient.couponPromotionsV2();
      for (const section of allPromos.sections) {
        for (const promo of section.promotions) {
          if (!promo.isActivated) {
            await lidlPlusClient.activateCouponPromotionV1(
              promo.id,
              promo.source
            );
          }
        }
      }
      return null;
    }),
    toggleCoupon: loggedProcedure
      .input(
        z.object({
          promotionId: z.string(),
          source: z.string(),
          isActivated: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        if (input.isActivated) {
          await lidlPlusClient.deactiveCouponPromotionV1(
            input.promotionId,
            input.source
          );
        } else {
          await lidlPlusClient.activateCouponPromotionV1(
            input.promotionId,
            input.source
          );
        }
        return null;
      }),
  }),
});

export type AppRouter = typeof appRouter;

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInput = inferRouterInputs<AppRouter>;
