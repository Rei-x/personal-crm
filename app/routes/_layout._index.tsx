import { json, useLoaderData, useRevalidator } from "@remix-run/react";
import { db } from "@/server/db";
import { format } from "date-fns";
import { useEffect } from "react";
import { desc } from "drizzle-orm";

export const loader = async () => {
  return json({
    messages: await db.query.messages.findMany({
      with: {
        user: true,
      },
      orderBy: (q) => desc(q.timestamp),
    }),
  });
};

const isMe = (userId: string) => {
  return window.ENV.MATRIX_USER_ID === userId;
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();

  const revalidator = useRevalidator();

  useEffect(() => {
    const timeout = setTimeout(() => {
      revalidator.revalidate();
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  });

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Messages</h1>
      </div>
      <div className="flex max-w-screen-md ">
        <div className="flex w-full flex-col items-center gap-1">
          <div className="flex-1 max-h-[600px] w-full overflow-y-scroll p-4 space-y-4 rounded-lg border border-dashed shadow-sm">
            {data.messages.map((message) =>
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
                  <img
                    src={`/user-image/${message.userId}`}
                    alt=""
                    className="bg-muted rounded-full w-8 h-8 flex items-center justify-center text-muted-foreground"
                  />
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
        </div>
      </div>
    </>
  );
}
