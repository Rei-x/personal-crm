import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { Avatar } from "@/components/Avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { RouterOutputs } from "@/server/routers/app";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomsPageSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/rooms")({
  component: RoomsLayout,
  pendingComponent: RoomsPageSkeleton,
});

function RoomsLayout() {
  const [data] = trpc.rooms.all.useSuspenseQuery(undefined, {
    refetchInterval: 5000,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 200);
  const matchRoute = useMatchRoute();
  const hasId = matchRoute({ to: "/rooms/$roomId", fuzzy: true });
  const isMobile = useIsMobile();

  return (
    <div className={cn("flex gap-4", isMobile ? "flex-col" : "flex-row")}>
      {hasId && isMobile ? (
        <div>
          <Link to="/rooms" className="flex items-center gap-2 py-4 mb-2">
            <ChevronLeft /> Powrót
          </Link>
          <Outlet />
        </div>
      ) : (
        <>
          <div className="flex max-w-screen-sm">
            <Card>
              <CardHeader>
                <CardTitle>Rozmowy</CardTitle>
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
      )}
    </div>
  );
}

const RoomList = ({
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
            to="/rooms/$roomId"
            params={{ roomId: room.id }}
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
