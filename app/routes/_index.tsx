import { Avatar } from "@/components/Avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { RouterOutputs } from "@/server/routers/app";
import { Link, Outlet } from "@remix-run/react";
import { useState } from "react";
import { useDebounce } from "use-debounce";

export default function Dashboard() {
  const [data] = trpc.rooms.all.useSuspenseQuery(undefined, {
    refetchInterval: 5000,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 200);
  return (
    <>
      <div className="flex max-w-screen-sm">
        <Card>
          <CardHeader>
            <CardTitle>Chats</CardTitle>
            <Input
              placeholder="Kto tym razem?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardHeader>
          <RoomList data={data} search={debouncedSearch} />
        </Card>
      </div>
      <Outlet />
    </>
  );
}
export const RoomList = ({
  data,
  search,
}: {
  data: RouterOutputs["rooms"]["all"];
  search: string;
}) => {
  return (
    <CardContent className="grid gap-2 max-h-[750px] overflow-y-scroll">
      {[...data]
        ?.sort((a, b) => {
          // seaach
          if (search) {
            if (a.name.toLowerCase().includes(search.toLowerCase())) {
              return -1;
            }
            if (b.name.toLowerCase().includes(search.toLowerCase())) {
              return 1;
            }
          }

          return 0;
        })
        .slice(0, 50)
        .map((room) => (
          <Link
            to={`/rooms/${room.id}`}
            key={room.id}
            className="flex hover:bg-slate-300 p-4 rounded-sm transition-colors items-center gap-4"
          >
            <Avatar roomId={room.id} username={room.name} />
            <div className="grid gap-1">
              <p className="text-sm font-medium leading-none">{room.name}</p>
              <p className="text-sm truncate text-muted-foreground">
                {room.latestMessage?.getContent().body}
              </p>
            </div>
          </Link>
        ))}
    </CardContent>
  );
};
