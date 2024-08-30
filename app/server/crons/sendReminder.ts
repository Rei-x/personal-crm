// import { CronJob } from "cron";
// import { db } from "../db";
// import { desc, eq } from "drizzle-orm";
// import { addSeconds } from "date-fns";
// import { ntfy } from "../services/ntfy";
// import { jobs } from "../schema";

// export const reminderJob = CronJob.from({
//   cronTime: "0 0 6 * * *",
//   onTick: async function onTick() {
//     const currentDate = new Date();

//     currentDate.setSeconds(0, 0);

//     const jobId = `sendReminder-${currentDate.toISOString()}`;

//     const job = await db.query.jobs.findFirst({
//       where: (q) => eq(q.jobId, jobId),
//     });

//     if (job) {
//       return;
//     } else {
//       await db.insert(jobs).values({
//         jobId,
//       });
//     }

//     const reminders = await db.query.reminders.findMany({
//       with: {
//         user: {
//           with: {
//             messages: {
//               orderBy: (q) => desc(q.timestamp),
//               limit: 1,
//             },
//           },
//         },
//       },
//     });

//     const users = reminders.filter((r) => {
//       const latestMessage = r.user?.messages.at(0);

//       if (!latestMessage || !latestMessage.timestamp) {
//         return true;
//       }
//       const notifyDate = addSeconds(
//         latestMessage.timestamp,
//         r.howOftenInSeconds
//       );

//       return notifyDate < new Date();
//     });

//     for (const user of users) {
//       await ntfy().notify({
//         message: `Napisz do ${user.user?.displayName}!`,
//         title: "Przypomnienie",
//       });
//     }
//   },
//   timeZone: "Europe/Warsaw",
// });
