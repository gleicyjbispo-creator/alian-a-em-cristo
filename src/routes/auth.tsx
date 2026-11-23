import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeRedirect(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = safeRedirect(search["redirect"]);
    return r ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Entrar · MARC" },
      { name: "description", content: "Acesso restrito à equipe do MARC." },
      { property: "og:title", content: "Entrar · MARC" },
      { property: "og:description", content: "Acesso restrito à equipe do MARC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  password: z.string().min(1, "Informe a senha").max(128),
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: redirect ?? "/painel", replace: true });
    });
  }, [navigate, redirect]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword(parsed.data);
    if (err) {
      setLoading(false);
      setError(
        err.message.toLowerCase().includes("invalid")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
      );
      return;
    }
    queryClient.removeQueries({ queryKey: ["auth", "me"] });
    await navigate({ to: redirect ?? "/painel", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-12 text-primary-foreground lg:flex">
        <BrandMark size="lg" />
        <div className="max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight">
            Ministério Aliança
            <br />
            Renascendo em Cristo
          </p>
          <p className="mt-4 text-primary-foreground/75">
            Membros, visitantes, aniversários e finanças da igreja em um só lugar.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Uso exclusivo da equipe administrativa.</p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div>
              <p className="font-display text-lg font-semibold">MARC</p>
              <p className="text-xs text-muted-foreground">Aliança Renascendo em Cristo</p>
            </div>
          </div>
          <h1 className="text-3xl font-semibold">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use o e-mail e a senha fornecidos pelo administrador.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="xl" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
              Entrar
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">
            Não há cadastro público. Peça acesso ao administrador da igreja.
          </p>
        </div>
      </div>
    </div>
  );
}
