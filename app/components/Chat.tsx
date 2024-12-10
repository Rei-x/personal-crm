import { CalendarIcon, Clock, SendHorizontal, Trash2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { format, formatDistanceToNow, startOfDay } from "date-fns";
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
import { DatetimePicker } from "./ui/datetime-picker";
import { Markdown } from "./Markdown";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
// import "./Chat.less";
// import Option from "rc-mentions/lib/Option";
import { Mention } from "react-mentions";
const isMe = (userId: string | null) => {
  return window.ENV.MATRIX_USER_ID === userId;
};

interface Message {
  messageId: string;
  userId: string | null;
  timestamp: Date;
  body: string;
}

type TextMessage = Message & {
  type: "text";
};

type ScheduledMessage = Message & {
  scheduledDate: Date;
  type: "scheduled";
};

export const Chat = ({
  roomId,
  messages,
  roomPeople,
}: {
  roomId: string;
  roomPeople: {
    id: string;
    name: string;
  }[];
  messages: (TextMessage | ScheduledMessage)[];
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
  const deleteScheduledMessage = trpc.deleteScheduledMessage.useMutation({
    onError: (e) => {
      toast.toast({
        title: "Failed to delete scheduled message",
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
    <div className="flex-1 w-full p-4 space-y-4 rounded-lg border border-dashed shadow-sm">
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
            .map((message) =>
              message.type === "text" ? (
                <ChatBubble
                  variant={isMe(message.userId) ? "sent" : "received"}
                  key={message.messageId}
                >
                  <Avatar userId={message.userId ?? ""} />
                  <ChatBubbleMessage>
                    <Markdown>{message.body}</Markdown>
                    <ChatBubbleTimestamp
                      timestamp={format(message.timestamp, "HH:mm")}
                    />
                  </ChatBubbleMessage>
                </ChatBubble>
              ) : (
                <ChatBubble
                  variant={isMe(message.userId) ? "sent" : "received"}
                  key={message.messageId}
                >
                  <Avatar userId={message.userId ?? ""} />
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <ChatBubbleMessage>
                        <Markdown>{message.body}</Markdown>
                        <ChatBubbleTimestamp
                          timestamp={`Wyśle za ${formatDistanceToNow(
                            message.scheduledDate,
                            { addSuffix: true }
                          )} o ${format(message.timestamp, "HH:mm")}`}
                        />
                      </ChatBubbleMessage>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        className="flex justify-between"
                        onClick={() => {
                          deleteScheduledMessage
                            .mutateAsync({
                              id: message.messageId,
                            })
                            .then(async () => {
                              revalidate();
                            });
                        }}
                      >
                        <p>Usuń</p> <Trash2 size="16" />
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </ChatBubble>
              )
            )}
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
          >
            <Mention
              trigger="@"
              markup={'<a href="__id__">__display__</a>'}
              data={roomPeople.map((r) => ({
                id: r.id,
                display: r.name,
              }))}
              displayTransform={(id, display) => `@${display}`}
              renderSuggestion={(item) => (
                <div className="flex gap-2">
                  <Avatar className="w-5 h-5" userId={item.id as string} />
                  {item.display}
                </div>
              )}
              style={{
                backgroundColor: "#cee4e5",
                fontWeight: "bold",
                color: "#000",
              }}
            />
          </ChatInput>
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
