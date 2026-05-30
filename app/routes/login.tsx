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
        toast.error(res.error.message ?? "Authentication failed");
        return;
      }
      void navigate({ to: "/" });
    } catch {
      toast.error("Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } catch {
      toast.error("Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  const title = inviteToken ? "You're invited" : isRegister ? "Create your account" : "Sign in";
  const description = inviteInvalid
    ? "This invite is invalid or has already been used."
    : inviteToken
      ? "Create your account to connect and share your calendars."
      : isRegister
        ? "Set up the owner account for this app."
        : "Enter your credentials to continue.";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button variant="outline" type="button" onClick={onGoogle} loading={googleLoading}>
            Continue with Google
          </Button>
          <div className="text-center text-xs text-muted-foreground">or</div>
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
              <Label htmlFor="password">Password</Label>
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
              {isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
