import {
  CalendarIcon,
  Clock,
  CornerDownLeft,
  SendHorizontal,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { format, formatDistanceToNow, setDate, startOfDay } from "date-fns";
import {
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
} from "./ui/chat/chat-bubble";
import { ChatInput } from "./ui/chat/chat-input";
import { ChatMessageList } from "./ui/chat/chat-message-list";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { useRevalidator } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "./ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { date } from "zod";
import { DatetimePicker } from "./ui/datetime-picker";
import { set } from "nprogress";

const isMe = (userId: string) => {
  return window.ENV.MATRIX_USER_ID === userId;
};

export const Chat = ({
  roomId,
  messages,
}: {
  roomId: string;
  messages: Array<{
    messageId: string;
    userId: string | null;
    timestamp: Date;
    body: string;
  }>;
}) => {
  const { revalidate } = useRevalidator();
  const toast = useToast();
  const sendMessage = trpc.sendMessage.useMutation({
    onError: (e) => {
      toast.toast({
        title: "Failed to send message",
        description: e.message,
        variant: "destructive",
      });
    },
  });
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    undefined
  );

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1  w-full  p-4 space-y-4 rounded-lg border border-dashed shadow-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();

          sendMessage
            .mutateAsync({ roomId, message, date: scheduledDate })
            .then(() => {
              setMessage("");
              setScheduledDate(undefined);
            })
            .finally(() => {
              revalidate();
            });
        }}
      >
        <ChatMessageList
          className="max-h-[600px] overflow-y-scroll"
          ref={messagesContainerRef}
        >
          {messages
            .filter((m) => m.userId)
            .map((message) => (
              <ChatBubble
                variant={isMe(message.userId!) ? "sent" : "received"}
                key={message.messageId}
              >
                <Avatar userId={message.userId ?? ""} />
                <ChatBubbleMessage>
                  {message.body}
                  <ChatBubbleTimestamp
                    timestamp={format(message.timestamp, "HH:mm")}
                  />
                </ChatBubbleMessage>
              </ChatBubble>
            ))}
        </ChatMessageList>
        <div className="flex flex-1 items-stretch">
          <ChatInput
            value={message}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && "form" in e.target) {
                e.preventDefault();
                (e.target.form as HTMLFormElement).requestSubmit();
              }
            }}
            disabled={sendMessage.isPending}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tutaj są wiadomości..."
            className="min-h-4 rounded-r-none"
          />
          <Button
            size="sm"
            loading={sendMessage.isPending}
            type="submit"
            className="rounded-l-none w-12 h-auto flex-1 gap-1.5"
          >
            <SendHorizontal size={22} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                loading={sendMessage.isPending}
                variant="secondary"
                className="rounded-l-none ml-2 w-12 h-auto flex-1 gap-1.5"
              >
                <Clock size={22} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4">
              <DatetimePicker
                disabled={{ before: new Date() }}
                selected={scheduledDate}
                setDate={(d) => {
                  if (d < startOfDay(new Date())) {
                    setScheduledDate(undefined);
                  } else {
                    setScheduledDate(d);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground">
          {scheduledDate ? (
            <span>
              <CalendarIcon size={16} className="inline-block mr-1" />
              Zostanie wysłana {format(scheduledDate, "PPPp")} -{" "}
              {formatDistanceToNow(scheduledDate, { addSuffix: true })}
            </span>
          ) : null}
        </p>
      </form>
    </div>
  );
};
