import { CornerDownLeft } from "lucide-react";
import { Avatar } from "./Avatar";
import { format } from "date-fns";
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
import { useState } from "react";
import { useToast } from "./ui/use-toast";

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
  const [message, setMessage] = useState("");

  return (
    <div className="flex-1 max-h-[600px] w-full overflow-y-scroll p-4 space-y-4 rounded-lg border border-dashed shadow-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();

          sendMessage
            .mutateAsync({ roomId, message })
            .then(() => {
              setMessage("");
            })
            .finally(() => {
              revalidate();
            });
        }}
      >
        <ChatMessageList>
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
        <div className="flex-1" />
        <ChatInput
          value={message}
          disabled={sendMessage.isPending}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
        />
        <Button
          size="sm"
          loading={sendMessage.isPending}
          type="submit"
          className="ml-auto gap-1.5"
        >
          Send Message
          <CornerDownLeft className="size-3.5" />
        </Button>
      </form>
    </div>
  );
};
