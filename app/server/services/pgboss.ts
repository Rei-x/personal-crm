import pgBoss, {
  type ScheduleOptions,
  type SendOptions,
  type WorkHandler,
} from "pg-boss";
import { env } from "../env";
import { db } from "../db";

import { and, eq, inArray } from "drizzle-orm";
export const boss = new pgBoss(env.DATABASE_URL);

export const createJob = <T extends object | undefined>(
  name: string,
  work: WorkHandler<T>,
  options: SendOptions = {}
) => {
  return {
    emit: async (data: T, overwriteOptions: SendOptions = {}) => {
      const jobId = await boss.send({
        name,
        data,
        options: {
          ...options,
          ...overwriteOptions,
        },
      });

      if (!jobId) {
        throw new Error("Failed to emit job");
      }
    },
    schedule: async (cron: string, data?: T, options: ScheduleOptions = {}) => {
      return boss.schedule(name, cron, data, {
        tz: "Europe/Warsaw",
        ...options,
      });
    },
    cancel: async (id: string) => {
      return boss.cancel(name, id);
    },
    getJobs: async () => {
      return db.query.job
        .findMany({
          where: (q) =>
            and(eq(q.name, name), inArray(q.state, ["active", "created"])),
        })
        .then((jobs) =>
          jobs.map((j) => ({
            ...j,
            data: j.data as T,
          }))
        );
    },
    work: async () => {
      if (!(await boss.getQueue(name))) {
        await boss.createQueue(name, {
          name,
        });
      }
      await boss.work<T>(name, work);
    },
  };
};
