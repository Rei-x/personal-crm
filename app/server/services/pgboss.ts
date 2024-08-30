import pgBoss, { type SendOptions, type WorkHandler } from "pg-boss";
import { env } from "../env";
export const boss = new pgBoss(env.DATABASE_URL);

export const createJob = <T extends object | undefined>(
  name: string,
  work: WorkHandler<T>,
  options: SendOptions = {}
) => {
  return {
    emit: async (data: T, overwriteOptions: SendOptions = {}) => {
      await boss.send({
        name,
        data,
        options: {
          ...options,
          ...overwriteOptions,
        },
      });
    },
    work: async () => {
      await boss.work(name, work);
    },
  };
};
