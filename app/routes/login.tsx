import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/authClient";
import { useTRPC } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const inviteToken = useMemo(() => new URLSearchParams(window.location.search).get("invite"), []);

  const { data: setup } = useQuery(trpc.needsSetup.queryOptions());
  const { data: inviteInfo } = useQuery({
    ...trpc.invites.check.queryOptions({ token: inviteToken ?? "" }),
    enabled: !!inviteToken,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isRegister = !!inviteToken || setup?.needsSetup === true;
  const inviteInvalid = !!inviteToken && inviteInfo && !inviteInfo.valid;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = isRegister
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] ?? "user" })
        : await authClient.signIn.email({ email, password });
      if (res.error) {
        toast.error(res.error.message ?? "Logowanie nie powiodło się");
        return;
      }
      void navigate({ to: "/" });
    } catch {
      toast.error("Logowanie nie powiodło się");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } catch {
      toast.error("Logowanie przez Google nie powiodło się");
      setGoogleLoading(false);
    }
  }

  const title = inviteToken ? "Masz zaproszenie" : isRegister ? "Utwórz konto" : "Zaloguj się";
  const description = inviteInvalid
    ? "To zaproszenie jest nieprawidłowe lub zostało już użyte."
    : inviteToken
      ? "Utwórz konto, aby połączyć i udostępniać swoje kalendarze."
      : isRegister
        ? "Skonfiguruj konto właściciela aplikacji."
        : "Wprowadź dane logowania, aby kontynuować.";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button variant="outline" type="button" onClick={onGoogle} loading={googleLoading}>
            Kontynuuj z Google
          </Button>
          <div className="text-center text-xs text-muted-foreground">lub</div>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" loading={loading}>
              {isRegister ? "Utwórz konto" : "Zaloguj się"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
