import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Copy,
  ExternalLink,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useTRPC } from "@/lib/trpc";
import { authClient } from "@/lib/authClient";
import type { RouterOutputs } from "@/server/routers/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/calendar")({
  component: CalendarDashboard,
});

type ShareLink = RouterOutputs["calendar"]["links"]["list"][number];
type AccountCalendar = RouterOutputs["calendar"]["accounts"][number]["calendars"][number];
type CalOption = AccountCalendar & { accountEmail: string };

interface LinkFormData {
  name: string;
  detailLevel: "full" | "busy";
  calendarIds: string[];
  expiresAt: Date | null;
}

function oauthStartUrl(): string {
  return window.ENV.API_URL.replace(/\/api\/?$/, "") + "/oauth/google/start";
}
function toDateInputValue(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

function CalendarDashboard() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();
  const isOwner = session?.user?.role === "owner";

  const accountsQuery = useQuery(trpc.calendar.accounts.queryOptions());
  const linksQuery = useQuery(trpc.calendar.links.list.queryOptions());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) toast.success(`Połączono konto ${connected}`);
    if (error) toast.error(`Błąd: ${error}`);
    if (connected || error) window.history.replaceState({}, "", "/calendar");
  }, []);

  const invalidateLinks = () => qc.invalidateQueries(trpc.calendar.links.list.queryFilter());
  const invalidateAccounts = () => qc.invalidateQueries(trpc.calendar.accounts.queryFilter());

  const disconnect = useMutation({
    ...trpc.calendar.disconnectAccount.mutationOptions(),
    onSuccess: () => {
      void invalidateAccounts();
      void invalidateLinks();
      toast.success("Konto rozłączone");
    },
  });
  const syncNow = useMutation({
    ...trpc.calendar.syncNow.mutationOptions(),
    onSuccess: () => toast.success("Synchronizacja uruchomiona"),
  });
  const createLink = useMutation({
    ...trpc.calendar.links.create.mutationOptions(),
    onSuccess: () => {
      void invalidateLinks();
      setCreating(false);
      toast.success("Link utworzony");
    },
  });
  const updateLink = useMutation({
    ...trpc.calendar.links.update.mutationOptions(),
    onSuccess: () => {
      void invalidateLinks();
      toast.success("Zapisano");
    },
  });
  const setEnabled = useMutation({
    ...trpc.calendar.links.setEnabled.mutationOptions(),
    onSuccess: () => void invalidateLinks(),
  });
  const rotate = useMutation({
    ...trpc.calendar.links.rotate.mutationOptions(),
    onSuccess: () => {
      void invalidateLinks();
      toast.success("Link odświeżony — stary przestał działać");
    },
  });
  const deleteLink = useMutation({
    ...trpc.calendar.links.delete.mutationOptions(),
    onSuccess: () => {
      void invalidateLinks();
      toast.success("Link usunięty");
    },
  });

  const [creating, setCreating] = useState(false);

  const accounts = accountsQuery.data ?? [];
  const links = linksQuery.data ?? [];
  const allCalendars: CalOption[] = accounts.flatMap((a) =>
    a.calendars.map((c) => ({ ...c, accountEmail: a.email })),
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kalendarz</h1>
          <p className="text-muted-foreground">
            Połącz swoje konta Google i udostępniaj kalendarze przez linki.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void authClient.signOut().then(() => location.assign("/login"))}
        >
          <LogOut className="mr-2 h-4 w-4" /> Wyloguj
        </Button>
      </div>

      {/* First-run onboarding for someone who just joined */}
      {accounts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Witaj 👋 Zacznij w 3 krokach</CardTitle>
            <CardDescription>
              Udostępniaj znajomym swoją dostępność — z pełnymi szczegółami albo tylko jako
              „zajęty".
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ol className="flex flex-col gap-2 text-sm">
              <li>
                <span className="mr-2 font-semibold text-primary">1.</span>Połącz swój kalendarz
                Google.
              </li>
              <li>
                <span className="mr-2 font-semibold text-primary">2.</span>Utwórz link — wybierz
                kalendarze i poziom szczegółów.
              </li>
              <li>
                <span className="mr-2 font-semibold text-primary">3.</span>Wyślij link znajomym —
                dodadzą go do swojego kalendarza.
              </li>
            </ol>
            <a href={oauthStartUrl()}>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Połącz kalendarz Google
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Connected Google accounts */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Połączone konta Google</CardTitle>
            <CardDescription>Kalendarze z tych kont możesz dodać do linków.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => syncNow.mutate()} loading={syncNow.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" /> Synchronizuj
            </Button>
            <a href={oauthStartUrl()}>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Połącz konto
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak połączonych kont.</p>
          )}
          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between border-b pb-2 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.email}</span>
                <span className="text-sm text-muted-foreground">
                  {a.calendars.length} kalendarzy
                </span>
                {a.status === "needs_reauth" && (
                  <Badge variant="destructive">Wymaga ponownego połączenia</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect.mutate({ accountId: a.id })}
                loading={disconnect.isPending && disconnect.variables?.accountId === a.id}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Rozłącz
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Share links */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Linki do udostępniania</CardTitle>
            <CardDescription>
              Każdy link może pokazywać inne kalendarze i poziom szczegółów. Google odświeża
              subskrybowane kalendarze co kilka–kilkanaście godzin.
            </CardDescription>
          </div>
          <Button onClick={() => setCreating((v) => !v)} disabled={allCalendars.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Nowy link
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {allCalendars.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Najpierw połącz konto Google, aby tworzyć linki.
            </p>
          )}
          {creating && (
            <LinkForm
              calendars={allCalendars}
              submitting={createLink.isPending}
              onCancel={() => setCreating(false)}
              onSubmit={(d) =>
                createLink.mutate({
                  name: d.name,
                  detailLevel: d.detailLevel,
                  calendarIds: d.calendarIds,
                  expiresAt: d.expiresAt,
                })
              }
            />
          )}
          {links.length === 0 && !creating && (
            <p className="text-sm text-muted-foreground">Nie masz jeszcze żadnych linków.</p>
          )}
          {links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              calendars={allCalendars}
              savingEdit={updateLink.isPending}
              onToggleEnabled={(enabled) => setEnabled.mutate({ id: link.id, enabled })}
              onRotate={() => rotate.mutate({ id: link.id })}
              onDelete={() => deleteLink.mutate({ id: link.id })}
              onSave={(d) =>
                updateLink.mutate({
                  id: link.id,
                  name: d.name,
                  detailLevel: d.detailLevel,
                  calendarIds: d.calendarIds,
                  expiresAt: d.expiresAt,
                })
              }
            />
          ))}
        </CardContent>
      </Card>

      {isOwner && <InvitesCard />}
    </div>
  );
}

function LinkForm({
  calendars,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  calendars: CalOption[];
  initial?: ShareLink;
  submitting: boolean;
  onSubmit: (data: LinkFormData) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [full, setFull] = useState((initial?.detailLevel ?? "busy") === "full");
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.calendarIds ?? []));
  const [expires, setExpires] = useState(toDateInputValue(initial?.expiresAt ?? null));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="link-name">Nazwa</Label>
        <Input
          id="link-name"
          placeholder="np. Dostępność dla pracy"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
        <span>
          Pełne szczegóły wydarzeń
          <span className="block text-xs text-muted-foreground">
            Wyłączone = tylko bloki „Zajęty”, bez tytułów
          </span>
        </span>
        <Switch checked={full} onCheckedChange={setFull} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Kalendarze w tym linku</Label>
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {calendars.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: c.backgroundColor ?? "#888888" }}
              />
              <span className="truncate">{c.summary ?? c.id}</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">
                {c.accountEmail}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="link-expiry">Wygasa (opcjonalnie)</Label>
        <Input
          id="link-expiry"
          type="date"
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          loading={submitting}
          disabled={!name.trim() || selected.size === 0}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              detailLevel: full ? "full" : "busy",
              calendarIds: [...selected],
              expiresAt: expires ? new Date(expires) : null,
            })
          }
        >
          Zapisz
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}

function LinkCard({
  link,
  calendars,
  savingEdit,
  onToggleEnabled,
  onRotate,
  onDelete,
  onSave,
}: {
  link: ShareLink;
  calendars: CalOption[];
  savingEdit: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onRotate: () => void;
  onDelete: () => void;
  onSave: (data: LinkFormData) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{link.name}</span>
          <Badge variant={link.detailLevel === "full" ? "default" : "secondary"}>
            {link.detailLevel === "full" ? "Pełne szczegóły" : "Tylko zajętość"}
          </Badge>
          {!link.enabled && <Badge variant="outline">Wyłączony</Badge>}
          {link.expiresAt && (
            <Badge variant="outline">Wygasa {format(new Date(link.expiresAt), "d MMM yyyy")}</Badge>
          )}
        </div>
        <Switch checked={link.enabled} onCheckedChange={onToggleEnabled} />
      </div>

      <div className="text-sm text-muted-foreground">
        {link.calendarIds.length} kalendarzy ·{" "}
        {link.lastAccessedAt
          ? `ostatnio pobrany ${formatDistanceToNow(new Date(link.lastAccessedAt), { addSuffix: true })}`
          : "jeszcze nie pobrany"}
      </div>

      <div className="flex flex-col gap-1">
        <Label>Link do wysłania znajomym</Label>
        <div className="flex gap-2">
          <Input readOnly value={link.shareUrl} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              void navigator.clipboard.writeText(link.shareUrl);
              toast.success("Skopiowano");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={link.shareUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-2 h-4 w-4" /> Podgląd
          </Button>
        </a>
        <Button variant="ghost" size="sm" onClick={onRotate}>
          <RotateCw className="mr-2 h-4 w-4" /> Odśwież
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
          <Pencil className="mr-2 h-4 w-4" /> Edytuj
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Usuń
        </Button>
      </div>

      {editing && (
        <LinkForm
          calendars={calendars}
          initial={link}
          submitting={savingEdit}
          onCancel={() => setEditing(false)}
          onSubmit={(d) => {
            onSave(d);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function InvitesCard() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const invitesQuery = useQuery(trpc.invites.list.queryOptions());
  const [email, setEmail] = useState("");

  const invalidate = () => qc.invalidateQueries(trpc.invites.list.queryFilter());
  const create = useMutation({
    ...trpc.invites.create.mutationOptions(),
    onSuccess: (r) => {
      void invalidate();
      void navigator.clipboard.writeText(r.url);
      toast.success("Link zaproszenia skopiowany");
      setEmail("");
    },
  });
  const revoke = useMutation({
    ...trpc.invites.revoke.mutationOptions(),
    onSuccess: () => void invalidate(),
  });

  const invites = invitesQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zaproszenia</CardTitle>
        <CardDescription>
          Wygeneruj link dla znajomego — tylko zaproszone osoby mogą się zarejestrować.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="email (opcjonalnie — ogranicza zaproszenie)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            onClick={() => create.mutate({ email: email || undefined })}
            loading={create.isPending}
          >
            Utwórz
          </Button>
        </div>
        {invites.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span>{i.email ?? "dowolny email"}</span>
                {i.usedAt && <Badge variant="outline">użyte</Badge>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{i.url}</div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  void navigator.clipboard.writeText(i.url);
                  toast.success("Skopiowano");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => revoke.mutate({ id: i.id })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
