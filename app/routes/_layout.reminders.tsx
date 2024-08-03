import { db } from "@/server/db";
import { Form, json, useLoaderData, useRevalidator } from "@remix-run/react";
import { asc, desc } from "drizzle-orm";
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
import { formatDuration, intervalToDuration } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
        user: true,
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
      variant="destructive"
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
      Delete
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
    <div className="flex items-center">
      <h1 className="text-lg font-semibold md:text-2xl">Reminders</h1>
      <div className="flex max-w-screen-md ">
        <div className="flex w-full flex-col items-center gap-1">
          <div className="flex-1 max-w-[600px] w-full overflow-y-scroll p-4 space-y-4 rounded-lg border border-dashed shadow-sm">
            {data.reminders.map((reminder) => (
              <div
                className="flex items-start gap-3 justify-end"
                key={reminder.reminderId}
              >
                <p>{reminder.user?.displayName}</p>
                <p>
                  co{" "}
                  {formatDuration(
                    secondsToDuration(reminder.howOftenInSeconds)
                  )}
                </p>
                <DeleteReminder reminderId={reminder.reminderId} />
              </div>
            ))}
            <ShadForm {...form}>
              <Form method="POST" onSubmit={form.handleSubmit}>
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
                            <SelectValue placeholder="Select person" />
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
                      <FormLabel>Ilość dni</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  loading={form.formState.isSubmitting}
                  className="mt-2"
                  type="submit"
                  name="intent"
                  value="ADD"
                >
                  Submit
                </Button>
              </Form>
            </ShadForm>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reminders;
