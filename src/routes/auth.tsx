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
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Recovery links may arrive with either an implicit-flow hash or a PKCE code.
    // Detect the recovery URL before checking the existing session so the login
    // redirect cannot send the user away before PASSWORD_RECOVERY is processed.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    let recoveryDetected =
      hashParams.get("type") === "recovery" || searchParams.has("code");

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryDetected = true;
        setIsRecovery(true);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recoveryDetected) {
        void navigate({ to: redirect ?? "/painel", replace: true });
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [navigate, redirect]);

  async function onForgotPassword() {
    setError(null);
    setNotice(null);
    const parsedEmail = z.string().trim().email("Informe um e-mail válido").safeParse(email);
    if (!parsedEmail.success) {
      setError("Digite seu e-mail para receber o link de redefinição.");
      return;
    }

    setLoading(true);
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
      redirectTo: "https://marc-flock-and-fellowship.lovable.app/auth",
    });
    setLoading(false);

    if (recoveryError) {
      setError("Não foi possível enviar o link. Confira o e-mail e tente novamente.");
      return;
    }
    setNotice("Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    try {
      if (isRecovery) {
        const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
        if (updateError) {
          setError("Não foi possível atualizar a senha. Solicite um novo link de redefinição.");
          setLoading(false);
          return;
        }
        await supabase.auth.signOut();
        setIsRecovery(false);
        setPassword("");
        setNotice("Senha atualizada. Agora entre com seu e-mail e a nova senha.");
        setLoading(false);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
      if (signInError || !signInData.user) {
        const message = signInError?.message.toLowerCase() ?? "";
        setError(
          message.includes("invalid login credentials") || message.includes("invalid")
            ? "E-mail ou senha não conferem. Confira os dados ou redefina sua senha."
            : message.includes("email not confirmed")
              ? "Este e-mail ainda não foi confirmado. Verifique sua caixa de entrada."
              : "Não foi possível autenticar. Verifique a conexão e tente novamente.",
        );
        setLoading(false);
        return;
      }

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", signInData.user.id);

      if (roleError) {
        await supabase.auth.signOut();
        setError("Sua conta foi autenticada, mas não foi possível consultar suas permissões. A administração precisa verificar a tabela de perfis no Supabase.");
        setLoading(false);
        return;
      }

      const hasAccess = roles?.some((item) => item.role === "admin" || item.role === "secretaria");
      if (!hasAccess) {
        await supabase.auth.signOut();
        setError("Sua conta existe, mas ainda não tem perfil de acesso ao sistema. Configure o perfil Administrador no Supabase e tente novamente.");
        setLoading(false);
        return;
      }

      queryClient.removeQueries({ queryKey: ["auth", "me"] });
      await navigate({ to: redirect ?? "/painel", replace: true });
    } catch {
      setError("Ocorreu uma falha de conexão durante o acesso. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-4 py-8 text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(184,145,73,0.16),transparent_42%),radial-gradient(ellipse_at_90%_90%,rgba(184,145,73,0.08),transparent_38%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#b99a5b]/25 bg-[#101010] shadow-[0_28px_100px_rgba(0,0,0,0.6)] lg:min-h-[620px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden border-b border-[#b99a5b]/20 bg-[linear-gradient(145deg,#17130c_0%,#090909_58%,#050505_100%)] p-8 sm:p-12 lg:border-b-0 lg:border-r">
          <div aria-hidden="true" className="absolute -right-28 -top-28 h-80 w-80 rounded-full border border-[#c6a66a]/10" />
          <div className="relative flex items-center gap-4">
            <BrandMark size="lg" />
            <div><p className="font-display text-xl font-semibold tracking-[0.16em] text-[#e2c78e]">MARC</p><p className="mt-1 text-xs tracking-[0.08em] text-white/65">MINISTÉRIO ALIANÇA</p></div>
          </div>
          <div className="relative py-10 lg:py-0">
            <div className="mb-5 h-px w-16 bg-[#c5a365]" />
            <p className="font-display text-3xl font-semibold leading-tight text-[#f4ead5] sm:text-4xl">Ministério Aliança<br /><span className="text-[#d5b574]">Renascendo em Cristo</span></p>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">Um espaço de cuidado e organização para servir melhor à igreja, seus membros e visitantes.</p>
          </div>
          <p className="relative text-[10px] uppercase tracking-[0.2em] text-[#c7a96c]/70">Fé · Comunhão · Propósito</p>
        </section>
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="w-full max-w-sm">
            <div className="mb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c9aa70]">Acesso restrito</p>
              <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">Bem-vindo(a)</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">{isRecovery ? "Cadastre uma nova senha para sua conta administrativa." : "Entre com seu e-mail e senha para acessar o sistema administrativo."}</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-white/80">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 border-white/15 bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-[#c9aa70]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-white/80">{isRecovery ? "Nova senha" : "Senha"}</Label>
                <Input id="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 border-white/15 bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-[#c9aa70]" />
              </div>
              {error ? <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm text-red-200">{error}</p> : null}
              {notice ? <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-200">{notice}</p> : null}
              <Button type="submit" size="xl" className="h-12 w-full bg-[#c5a365] font-semibold text-[#17130c] shadow-[0_8px_24px_rgba(197,163,101,0.16)] transition hover:bg-[#d7b879]" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
                {loading ? "Aguarde..." : isRecovery ? "Salvar nova senha" : "Acessar o sistema"}
              </Button>
              {!isRecovery ? <button type="button" onClick={onForgotPassword} disabled={loading} className="w-full text-center text-sm text-[#d5b574] transition hover:text-[#f4ead5] disabled:opacity-50">Esqueci minha senha</button> : null}
            </form>
            <div className="mt-8 border-t border-white/10 pt-5"><p className="text-center text-xs leading-5 text-white/40">Sistema administrativo do Ministério Aliança Renascendo em Cristo.<br />Não há cadastro público. Solicite acesso à administração.</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
