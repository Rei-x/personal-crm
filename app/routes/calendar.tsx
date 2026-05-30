import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, LogOut, Plus, RefreshCw, RotateCw, Trash2 } from "lucide-react";
import { useTRPC } from "@/lib/trpc";
import { authClient } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/calendar")({
  component: CalendarSettings,
});

// The OAuth connect route lives at the server root (not under /api).
function oauthStartUrl(): string {
  return window.ENV.API_URL.replace(/\/api\/?$/, "") + "/oauth/google/start";
}

function CalendarSettings() {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const accountsQuery = useQuery(trpc.calendar.accounts.queryOptions());
  const shareQuery = useQuery(trpc.calendar.share.queryOptions());

  const [title, setTitle] = useState("");
  useEffect(() => {
    if (shareQuery.data?.feedTitle) setTitle(shareQuery.data.feedTitle);
  }, [shareQuery.data?.feedTitle]);

  // Surface ?connected / ?error from the OAuth redirect, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) toast.success(`Połączono konto ${connected}`);
    if (error) toast.error(`Błąd połączenia: ${error}`);
    if (connected || error) window.history.replaceState({}, "", "/calendar");
  }, []);

  const invalidateAccounts = () => qc.invalidateQueries(trpc.calendar.accounts.queryFilter());
  const invalidateShare = () => qc.invalidateQueries(trpc.calendar.share.queryFilter());

  const toggleCalendar = useMutation({
    ...trpc.calendar.toggleCalendar.mutationOptions(),
    onSuccess: invalidateAccounts,
  });
  const disconnect = useMutation({
    ...trpc.calendar.disconnectAccount.mutationOptions(),
    onSuccess: () => {
      void invalidateAccounts();
      toast.success("Konto rozłączone");
    },
  });
  const rotate = useMutation({
    ...trpc.calendar.rotateShareLink.mutationOptions(),
    onSuccess: () => {
      void invalidateShare();
      toast.success("Link odświeżony — stary przestał działać");
    },
  });
  const updateTitle = useMutation({
    ...trpc.calendar.updateFeedTitle.mutationOptions(),
    onSuccess: () => {
      void invalidateShare();
      toast.success("Zapisano");
    },
  });
  const syncNow = useMutation({
    ...trpc.calendar.syncNow.mutationOptions(),
    onSuccess: () => toast.success("Synchronizacja uruchomiona"),
  });

  const accounts = accountsQuery.data ?? [];
  const feedUrl = shareQuery.data?.feedUrl ?? "";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kalendarz</h1>
          <p className="text-muted-foreground">
            Połącz konta Google i udostępnij jeden wspólny kalendarz znajomym.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void authClient.signOut().then(() => location.assign("/login"))}
        >
          <LogOut className="mr-2 h-4 w-4" /> Wyloguj
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Połączone konta Google</CardTitle>
            <CardDescription>
              Zaznacz kalendarze, które mają trafić do wspólnego feedu.
            </CardDescription>
          </div>
          <a href={oauthStartUrl()}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Połącz konto
            </Button>
          </a>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak połączonych kont.</p>
          )}
          {accounts.map((acc) => (
            <div key={acc.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{acc.email}</span>
                  {acc.status === "needs_reauth" && (
                    <Badge variant="destructive">Wymaga ponownego połączenia</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnect.mutate({ accountId: acc.id })}
                  loading={disconnect.isPending && disconnect.variables?.accountId === acc.id}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Rozłącz
                </Button>
              </div>
              <div className="flex flex-col gap-2 pl-2">
                {acc.calendars.length === 0 && (
                  <p className="text-xs text-muted-foreground">Brak kalendarzy.</p>
                )}
                {acc.calendars.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-2"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: c.backgroundColor ?? "#888888" }}
                      />
                      {c.summary ?? c.id}
                      {c.primary && <Badge variant="secondary">główny</Badge>}
                    </span>
                    <Switch
                      checked={c.selected}
                      onCheckedChange={(checked) =>
                        toggleCalendar.mutate({ calendarId: c.id, selected: checked })
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wspólny link</CardTitle>
          <CardDescription>
            Wyślij ten adres znajomym — dodadzą go w Google Calendar przez „Inne kalendarze → Z
            adresu URL”.
            {shareQuery.data ? ` Obecnie ${shareQuery.data.eventCount} wydarzeń.` : ""} Uwaga:
            Google odświeża subskrybowane kalendarze co kilka–kilkanaście godzin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="feedTitle">Nazwa kalendarza</Label>
            <div className="flex gap-2">
              <Input id="feedTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Button
                variant="outline"
                onClick={() => updateTitle.mutate({ title })}
                loading={updateTitle.isPending}
              >
                Zapisz
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Adres feedu (.ics)</Label>
            <div className="flex gap-2">
              <Input readOnly value={feedUrl} />
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(feedUrl);
                  toast.success("Skopiowano");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => syncNow.mutate()} loading={syncNow.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" /> Synchronizuj teraz
            </Button>
            <Button
              variant="destructive"
              onClick={() => rotate.mutate()}
              loading={rotate.isPending}
            >
              <RotateCw className="mr-2 h-4 w-4" /> Odśwież link (unieważnij stary)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
