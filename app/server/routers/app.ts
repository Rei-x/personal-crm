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

const loggedProcedure = publicProcedure.use(async (opts) => {
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
          people: Object.entries(
            (await client.getJoinedRoomMembers(roomId)).joined
          ).map(([userId, { avatar_url, display_name }]) => ({
            id: userId,
            avatarUrl: avatar_url,
            name: display_name,
          })),
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
  }),
});

export type AppRouter = typeof appRouter;

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInput = inferRouterInputs<AppRouter>;
