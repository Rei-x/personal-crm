import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import { useTRPC } from "@/lib/trpc";
import { Avatar } from "@/components/Avatar";
import { formatDistanceToNow } from "date-fns";
import { Chat } from "@/components/Chat";
interface MessageContent {
  body: string;
}
import { RoomDetailSkeleton } from "@/components/skeletons";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/rooms/$roomId")({
  component: Room,
  pendingComponent: RoomDetailSkeleton,
});

const schema = z.object({
  howOftenInDays: z.coerce.number(),
  enableTranscriptions: z.coerce.boolean(),
});

function Room() {
  const { roomId } = Route.useParams();
  const trpc = useTRPC();

  const { data: room } = useSuspenseQuery(trpc.rooms.single.queryOptions({ roomId }));

  const updateSettings = useMutation(trpc.rooms.updateSettings.mutationOptions());

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
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
  }, [room, form]);

  const onSubmit = form.handleSubmit((data) => {
    updateSettings.mutate({
      roomId,
      howOftenInDays: Number(data.howOftenInDays),
      enableTranscriptions: Boolean(data.enableTranscriptions),
    });
  });

  return (
    <div>
      <div>
        <div className="flex items-center gap-4">
          <Avatar roomId={room.id} />
          <h1 className="text-xl">{room.name}</h1>
        </div>
        <div className="flex items-center mt-2 gap-2">
          <p className="text-sm text-muted-foreground">Ostatnia aktywność:</p>
          <p className="text-sm">{formatDistanceToNow(room.latestMessageDate)} temu</p>
        </div>
      </div>
      <Form {...form}>
        <form className="mt-8 gap-2 flex flex-col" onSubmit={onSubmit}>
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
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Włącz transkrypcje</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <Button loading={updateSettings.isPending} className="mt-2 w-full" type="submit">
            Zapisz
          </Button>
        </form>
      </Form>
      <div>
        <Chat
          roomId={room.id}
          messages={[
            ...room.events
              .filter((e) => e.getType() === "m.room.message")
              .map((e) => ({
                body: e.getContent<MessageContent>().body,
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
