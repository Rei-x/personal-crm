import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  ShadForm,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { db } from "@/server/db";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form } from "react-router";
import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { z } from "zod";
import { roomSettings } from "@/server/schema";
import { eq } from "drizzle-orm";
import { useEffect } from "react";
import { trpcServerClient } from "@/lib/trpc.server";
import { Avatar } from "@/components/Avatar";
import { formatDistanceToNow } from "date-fns";
import { useJsonLoaderData } from "@/lib/transformer";
import { jsonJson } from "@/lib/transformer.server";
import { Chat } from "@/components/Chat";
import { EventType } from "matrix-js-sdk";

const paramsSchema = z.object({
  roomId: z.string(),
});

export async function loader({ params }: LoaderFunctionArgs) {
  const { roomId } = paramsSchema.parse(params);
  return jsonJson({
    room: await trpcServerClient.rooms.single.query({ roomId }),
  });
}
const schema = z.object({
  howOftenInDays: z.coerce.number().default(0),
  enableTranscriptions: z.coerce.boolean(),
});

const resolver = zodResolver(schema);

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const roomId = paramsSchema.parse(params).roomId;

  const {
    errors,
    data,
    receivedValues: defaultValues,
  } = await getValidatedFormData<z.infer<typeof schema>>(request, resolver);
  if (errors) {
    return { errors, defaultValues };
  }

  return db
    .update(roomSettings)
    .set({
      howOftenInSeconds: data.howOftenInDays
        ? data.howOftenInDays * 24 * 60 * 60
        : null,
      transcriptionEnabled: data.enableTranscriptions,
    })
    .where(eq(roomSettings.roomId, roomId));
};

function Room() {
  const { room } = useJsonLoaderData<typeof loader>();

  const form = useRemixForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    submitHandlers: {
      onInvalid: (errors) => {
        console.log(errors);
      },
    },
    defaultValues: {
      enableTranscriptions: room.settings?.transcriptionEnabled ?? false,
      howOftenInDays: room.settings?.howOftenInSeconds
        ? room.settings?.howOftenInSeconds / (24 * 60 * 60)
        : 0,
    },
  });

  useEffect(() => {
    form.reset({
      enableTranscriptions: room.settings?.transcriptionEnabled ?? false,
      howOftenInDays: room.settings?.howOftenInSeconds
        ? room.settings?.howOftenInSeconds / (24 * 60 * 60)
        : 0,
    });
  }, [room]);

  return (
    <div>
      <div>
        <div className="flex items-center gap-4">
          <Avatar roomId={room.id} />
          <h1 className="text-xl">{room.name}</h1>
        </div>
        <div className="flex items-center mt-2 gap-2">
          <p className="text-sm text-muted-foreground">Ostatnia aktywność:</p>
          <p className="text-sm">
            {formatDistanceToNow(room.latestMessageDate)} temu
          </p>
        </div>
      </div>
      <ShadForm {...form}>
        <Form
          method="POST"
          className="w-[400px] mt-8 gap-2 flex flex-col"
          onSubmit={form.handleSubmit}
        >
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

          <FormField
            control={form.control}
            name="enableTranscriptions"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Włącz transkrypcje</FormLabel>
                </div>
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
            Zapisz
          </Button>
        </Form>
      </ShadForm>
      <div className="w-[600px]">
        <Chat
          roomId={room.id}
          messages={[
            ...room.events
              .filter((e) => e.getType() === EventType.RoomMessage)
              .map((e) => ({
                body: e.getContent().body as string,
                messageId: e.getId() ?? "",
                userId: e.getSender() ?? "",
                timestamp: e.getDate() ?? new Date(),
                type: "text" as const,
              })),
            ...room.scheduledMessages.map((m) => ({
              body: m.message,
              messageId: m.id,
              userId: window.ENV.MATRIX_USER_ID,
              timestamp: m.date,
              type: "scheduled" as const,
              scheduledDate: m.date,
            })),
          ]}
        />
      </div>
    </div>
  );
}

export default Room;
