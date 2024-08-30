import { db } from "@/server/db";
import { Form, json, useLoaderData, useRevalidator } from "@remix-run/react";
import { asc, desc, eq, not } from "drizzle-orm";
import { useRemixForm, getValidatedFormData } from "remix-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  ShadForm,
} from "@/components/ui/form";
import type { ActionFunctionArgs } from "@remix-run/node";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reminders } from "@/server/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  formatDistanceToNow,
  formatDuration,
  intervalToDuration,
} from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { env } from "@/server/env";

export function secondsToDuration(seconds: number) {
  const epoch = new Date(0);
  const secondsAfterEpoch = new Date(seconds * 1000);
  return intervalToDuration({
    start: epoch,
    end: secondsAfterEpoch,
  });
}

export const loader = async () => {
  return {
    users: await db.query.users
      .findMany({
        where: (q) => not(eq(q.userId, env.MATRIX_USER_ID)),
        with: {
          messages: {
            orderBy: (q) => desc(q.timestamp),
            limit: 1,
          },
        },
      })
      .then((result) =>
        result.sort((a, b) => {
          const aMessage = a.messages.at(0);
          const bMessage = b.messages.at(0);
          if (!aMessage?.timestamp && !bMessage?.timestamp) {
            return 0;
          }

          if (!aMessage?.timestamp) {
            return 1;
          }

          if (!bMessage?.timestamp) {
            return -1;
          }

          return aMessage.timestamp > bMessage.timestamp ? -1 : 1;
        })
      ),
    reminders: await db.query.reminders.findMany({
      with: {
        user: {
          with: {
            messages: {
              orderBy: (q) => desc(q.timestamp),
              limit: 1,
            },
          },
        },
      },
      orderBy: (q) => asc(q.createdAt),
    }),
  };
};

const schema = z.object({
  userId: z.string().min(1),
  howOftenInDays: z.coerce.number().min(1),
});

const resolver = zodResolver(schema);

export const action = async ({ request }: ActionFunctionArgs) => {
  const {
    errors,
    data,
    receivedValues: defaultValues,
  } = await getValidatedFormData<z.infer<typeof schema>>(request, resolver);
  if (errors) {
    return json({ errors, defaultValues });
  }

  return await db.insert(reminders).values({
    howOftenInSeconds: data.howOftenInDays * 24 * 60 * 60,
    userId: data.userId,
  });
};

const DeleteReminder = ({ reminderId }: { reminderId: number }) => {
  const deleteReminder = trpc.reminders.delete.useMutation();
  const { revalidate } = useRevalidator();

  return (
    <Button
      variant="outline"
      size="icon"
      loading={deleteReminder.isPending}
      onClick={() => {
        deleteReminder
          .mutateAsync({ reminderId })
          .then(() => {
            revalidate();
            toast("Deleted reminder");
          })
          .catch(() => {
            toast("Error deleting reminder");
          });
      }}
    >
      <Trash className="w-4 h-4" />
    </Button>
  );
};

const RunCron = () => {
  const runCron = trpc.reminders.runCron.useMutation();

  return (
    <Button
      onClick={() => {
        runCron
          .mutateAsync()
          .then(() => {
            toast("Cron job started");
          })
          .catch(() => {
            toast("Error starting cron job");
          });
      }}
      loading={runCron.isPending}
    >
      Run cron
    </Button>
  );
};

const Reminders = () => {
  const data = useLoaderData<typeof loader>();
  const form = useRemixForm<z.infer<typeof schema>>({
    mode: "onSubmit",
    resolver: zodResolver(schema),
    submitHandlers: {
      onInvalid: (errors) => {
        console.log(errors);
      },
    },
  });

  return (
    <div className="flex items-center flex-col">
      <h1 className="text-lg font-semibold md:text-2xl">Przypomnienia</h1>
      <div className="flex max-w-screen-md ">
        <div className="flex w-full flex-col items-center gap-1">
          <div className="flex gap-8 overflow-y-scroll p-4 space-y-4 rounded-lg border border-dashed shadow-sm">
            <ShadForm {...form}>
              <Form
                method="POST"
                className="w-[300px] mx-auto gap-2 flex flex-col"
                onSubmit={form.handleSubmit}
              >
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz osobę" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.users.map((user) => (
                            <SelectItem key={user.userId} value={user.userId}>
                              {user.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="howOftenInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Co najmniej co</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 items-center">
                          <Input type="number" placeholder="1" {...field} />
                          <p>dni</p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  loading={form.formState.isSubmitting}
                  className="mt-2 w-full"
                  type="submit"
                  name="intent"
                  value="ADD"
                >
                  Dodaj
                </Button>
              </Form>
            </ShadForm>

            <div className="mt-8">
              <Table className="w-[500px]">
                <TableCaption>
                  Wszystkie twoje przypomnienia <RunCron />
                </TableCaption>

                <TableBody>
                  {data.reminders.map((reminder) => (
                    <TableRow key={reminder.reminderId}>
                      <TableCell>
                        <Avatar roomId={reminder.user?.userId ?? ""} />
                      </TableCell>
                      <TableCell>{reminder.user?.displayName}</TableCell>
                      <TableCell>
                        co{" "}
                        {formatDuration(
                          secondsToDuration(reminder.howOftenInSeconds)
                        )}
                      </TableCell>
                      <TableCell>
                        Ostatnio:{" "}
                        {reminder.user?.messages.at(0)?.timestamp
                          ? `${formatDistanceToNow(
                              new Date(
                                reminder.user?.messages.at(0)?.timestamp ?? ""
                              )
                            )} temu`
                          : "brak"}
                      </TableCell>
                      <TableCell>
                        <DeleteReminder reminderId={reminder.reminderId} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reminders;
