import { Avatar } from "./Avatar";
import { format } from "date-fns";

const isMe = (userId: string) => {
  return window.ENV.MATRIX_USER_ID === userId;
};

export const Chat = ({
  messages,
}: {
  messages: Array<{
    messageId: string;
    userId: string | null;
    body: string;
    timestamp: string | null;
  }>;
}) => {
  return (
    <div className="flex-1 max-h-[600px] w-full overflow-y-scroll p-4 space-y-4 rounded-lg border border-dashed shadow-sm">
      {messages.map((message) =>
        isMe(message.userId ?? "") ? (
          <div
            className="flex items-start gap-3 justify-end"
            key={message.messageId}
          >
            <div className="bg-primary rounded-lg p-3 max-w-[70%] text-primary-foreground">
              <p className="text-sm">{message.body}</p>
              <p className="text-xs text-primary-foreground/80">
                {format(new Date(message.timestamp ?? ""), "HH:mm")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3" key={message.messageId}>
            <Avatar roomId={message.userId ?? ""} />
            <div className="bg-muted rounded-lg p-3 max-w-[70%]">
              <p className="text-sm">{message.body}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(message.timestamp ?? ""), "HH:mm")}
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
};
