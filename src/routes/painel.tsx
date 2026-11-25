import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserRoundPlus,
  Cake,
  Wallet,
  LogOut,
  Menu,
  CalendarDays,
  ArrowUpRight,
  Church,
  Loader2,
  ShieldAlert,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BrandName } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppRole } from "@/lib/auth";

type Member = {
  id: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
};

type DashboardData = {
  members: Member[];
  visitorsThisMonth: number;
  financial: { tithe: number; offering: number } | null;
};

function saoPauloDate(offset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  const base = new Date(Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day")) + offset));
  return base.toISOString().slice(0, 10);
}

function birthdayLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(
    new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1, 12)),
  );
}

function birthdayDays(date: string) {
  const [, month, day] = date.split("-").map(Number);
  for (let offset = 0; offset <= 7; offset += 1) {
    const target = saoPauloDate(offset);
    if (target.slice(5) === `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`) return offset;
  }
  return null;
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel · MARC" },
      { name: "description", content: "Painel administrativo do Ministério Aliança Renascendo em Cristo." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<AppRole | null>(null);
  const [email, setEmail] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        await navigate({ to: "/auth", replace: true });
        return;
      }

      const user = sessionData.session.user;
      if (active) setEmail(user.email ?? "");
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleError) {
        if (active) {
          setError("Não foi possível validar seu perfil de acesso. Tente novamente ou contate o administrador.");
          setLoading(false);
        }
        return;
      }

      const userRole: AppRole | null = roles?.some((item) => item.role === "admin")
        ? "admin"
        : roles?.some((item) => item.role === "secretaria")
          ? "secretaria"
          : null;

      if (!userRole) {
        await supabase.auth.signOut();
        await navigate({ to: "/auth", replace: true });
        return;
      }
      if (active) setRole(userRole);

      const today = saoPauloDate();
      const monthStart = `${today.slice(0, 7)}-01`;
      const [membersResult, visitorsResult] = await Promise.all([
        supabase
          .from("members")
          .select("id, full_name, phone, birth_date")
          .eq("status", "ativo")
          .order("full_name"),
        supabase
          .from("visitors")
          .select("id", { count: "exact", head: true })
          .gte("visit_date", monthStart)
          .lte("visit_date", today),
      ]);

      if (membersResult.error || visitorsResult.error) {
        if (active) {
          setError("Não foi possível carregar os dados do painel. Verifique a conexão com o Supabase e as permissões.");
          setLoading(false);
        }
        return;
      }

      let financial: DashboardData["financial"] = null;
      // A secretaria nunca solicita dados financeiros ao banco.
      if (userRole === "admin") {
        const { data: entries, error: financeError } = await supabase
          .from("financial_entries")
          .select("entry_type, amount_cents")
          .eq("is_cancelled", false)
          .gte("entry_date", monthStart)
          .lte("entry_date", today);

        if (financeError) {
          if (active) {
            setError("Os dados gerais foram carregados, mas não foi possível consultar o resumo financeiro.");
            setData({
              members: membersResult.data ?? [],
              visitorsThisMonth: visitorsResult.count ?? 0,
              financial: null,
            });
            setLoading(false);
          }
          return;
        }

        financial = (entries ?? []).reduce(
          (totals, entry) => {
            if (entry.entry_type === "dizimo") totals.tithe += entry.amount_cents;
            if (entry.entry_type === "oferta") totals.offering += entry.amount_cents;
            return totals;
          },
          { tithe: 0, offering: 0 },
        );
      }

      if (active) {
        setData({
          members: membersResult.data ?? [],
          visitorsThisMonth: visitorsResult.count ?? 0,
          financial,
        });
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [navigate]);

  const birthdays = useMemo(() => {
    return (data?.members ?? [])
      .filter((member) => member.birth_date)
      .map((member) => ({ ...member, days: birthdayDays(member.birth_date as string) }))
      .filter((member) => member.days !== null)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
  }, [data?.members]);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden min-h-screen flex-col border-r border-sidebar-border bg-sidebar px-5 py-6 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-1">
          <BrandMark />
          <BrandName inverted />
        </div>
        <div className="mt-12">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">Menu principal</p>
          <nav className="mt-3 space-y-1">
            <a href="/painel" className="flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-3 text-sm font-semibold text-sidebar-accent-foreground"><Church size={18} /> Visão geral</a>
            <a href="/membros" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent"><Users size={18} /> Membros</a>
            <a href="/visitantes" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent"><UserRoundPlus size={18} /> Visitantes</a>
            {role === "admin" ? <a href="/dizimistas" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent"><Wallet size={18} /> Dizimistas</a> : null}
            <a href="/aniversarios" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent"><Cake size={18} /> Aniversários</a>
            {role === "admin" ? <a href="/financeiro" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent"><Wallet size={18} /> Financeiro</a> : null}
          </nav>
        </div>
        <div className="mt-auto rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-4">
          <p className="text-xs text-sidebar-foreground/60">Acesso conectado</p>
          <p className="mt-1 truncate text-sm font-medium">{email}</p>
          <p className="mt-1 text-xs text-sidebar-foreground/60">{role === "admin" ? "Administrador" : "Secretaria"}</p>
          <Button variant="ghost" className="mt-3 w-full justify-start px-0 text-sidebar-foreground hover:bg-transparent hover:text-gold" onClick={signOut}><LogOut /> Sair do sistema</Button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark />
            <BrandName />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs capitalize text-muted-foreground">{todayLabel}</p>
            <p className="font-display text-xl font-semibold">Visão geral</p>
          </div>
          <div className="relative lg:hidden">
            <Button variant="outline" size="icon" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}><Menu /></Button>
            {menuOpen ? <div className="absolute right-0 top-12 z-30 w-56 rounded-xl border bg-card p-2 shadow-raised">
              <a className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/painel">Visão geral</a>
              <a className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/membros">Membros</a>
              <a className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/visitantes">Visitantes</a>
              {role === "admin" ? <a className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/dizimistas">Dizimistas</a> : null}
              <a className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/aniversarios">Aniversários</a>
              {role === "admin" ? <a className="block rounded-lg px-3 py-2 text-sm hover:bg-muted" href="/financeiro">Financeiro</a> : null}
              <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={signOut}>Sair do sistema</button>
            </div> : null}
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="text-right text-xs text-muted-foreground">{email}<br />{role === "admin" ? "Administrador" : "Secretaria"}</span>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut /> Sair</Button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-primary">Ministério Aliança Renascendo em Cristo</p>
            <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">Bem-vindo(a) ao painel</h1>
            <p className="mt-2 text-sm text-muted-foreground">Acompanhe os principais registros da igreja em um só lugar.</p>
          </div>

          {loading ? <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="animate-spin" /> Carregando informações...</div> : null}
          {error ? <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-soft p-4 text-sm text-destructive"><ShieldAlert size={20} className="mt-0.5 shrink-0" /><p>{error}</p></div> : null}

          {!loading && data ? <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="border-0 shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>Membros ativos</CardDescription><span className="rounded-lg bg-primary-soft p-2 text-primary"><Users size={18} /></span></CardHeader>
                <CardContent><p className="tabular text-3xl font-semibold">{data.members.length}</p><p className="mt-1 text-xs text-muted-foreground">Pessoas cadastradas como membros</p></CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>Visitantes no mês</CardDescription><span className="rounded-lg bg-gold-soft p-2 text-gold-foreground"><UserRoundPlus size={18} /></span></CardHeader>
                <CardContent><p className="tabular text-3xl font-semibold">{data.visitorsThisMonth}</p><p className="mt-1 text-xs text-muted-foreground">Visitas registradas neste mês</p></CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>Aniversários próximos</CardDescription><span className="rounded-lg bg-success-soft p-2 text-success"><Cake size={18} /></span></CardHeader>
                <CardContent><p className="tabular text-3xl font-semibold">{birthdays.length}</p><p className="mt-1 text-xs text-muted-foreground">Hoje e nos próximos 7 dias</p></CardContent>
              </Card>
              {role === "admin" ? <Card className="border-0 shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>Entradas do mês</CardDescription><span className="rounded-lg bg-gold-soft p-2 text-gold-foreground"><Wallet size={18} /></span></CardHeader>
                <CardContent>
                  {data.financial ? <><p className="tabular text-3xl font-semibold">{money(data.financial.tithe + data.financial.offering)}</p><p className="mt-1 text-xs text-muted-foreground">Dízimos: {money(data.financial.tithe)} · Ofertas: {money(data.financial.offering)}</p></> : <p className="text-sm text-muted-foreground">Resumo indisponível.</p>}
                </CardContent>
              </Card> : null}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Card className="border-0 shadow-card">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div><CardTitle className="font-display text-xl">Próximos aniversários</CardTitle><CardDescription className="mt-1">Membros que fazem aniversário nesta semana.</CardDescription></div>
                  <Cake className="text-gold" size={20} />
                </CardHeader>
                <CardContent>
                  {birthdays.length ? <div className="divide-y">{birthdays.slice(0, 6).map((member) => <div key={member.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{member.full_name}</p><p className="mt-0.5 text-xs text-muted-foreground">{member.birth_date ? birthdayLabel(member.birth_date) : ""}</p></div>
                    <div className="shrink-0 text-right"><span className="rounded-full bg-gold-soft px-3 py-1 text-xs font-medium text-gold-foreground">{member.days === 0 ? "Hoje" : `Em ${member.days} dia(s)`}</span>
                      {member.phone ? <a className="mt-1 block text-xs text-primary hover:underline" href={`https://wa.me/55${member.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${member.full_name.split(" ")[0]}! Feliz aniversário! Que Deus abençoe sua vida com saúde, paz e muitas alegrias. Receba o carinho do Ministério Aliança Renascendo em Cristo! 💛`)}`} target="_blank" rel="noreferrer">Enviar parabéns</a> : null}
                    </div>
                  </div>)}</div> : <div className="rounded-xl bg-muted/60 px-4 py-8 text-center"><CalendarDays className="mx-auto text-muted-foreground" /><p className="mt-2 text-sm font-medium">Nenhum aniversário próximo</p><p className="mt-1 text-xs text-muted-foreground">Os aniversários cadastrados aparecerão aqui.</p></div>}
                  <a href="/aniversarios" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Ver todos os aniversários <ArrowUpRight size={15} /></a>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader><CardTitle className="font-display text-xl">Acesso rápido</CardTitle><CardDescription>Atalhos para as tarefas do dia a dia.</CardDescription></CardHeader>
                <CardContent className="grid gap-2">
                  <a href="/membros" className="flex items-center justify-between rounded-xl border p-3 text-sm transition hover:border-primary/40 hover:bg-primary-soft/40"><span className="flex items-center gap-3"><Users className="text-primary" size={18} /> Cadastro de membros</span><ArrowUpRight size={16} /></a>
                  <a href="/visitantes" className="flex items-center justify-between rounded-xl border p-3 text-sm transition hover:border-primary/40 hover:bg-primary-soft/40"><span className="flex items-center gap-3"><UserRoundPlus className="text-primary" size={18} /> Registrar visitante</span><ArrowUpRight size={16} /></a>
                  {role === "admin" ? <a href="/financeiro" className="flex items-center justify-between rounded-xl border p-3 text-sm transition hover:border-primary/40 hover:bg-primary-soft/40"><span className="flex items-center gap-3"><Wallet className="text-primary" size={18} /> Lançar entrada financeira</span><ArrowUpRight size={16} /></a> : null}
                </CardContent>
              </Card>
            </div>
          </> : null}
          {!loading && role ? (
            <section aria-labelledby="pastores-presidentes" className="mt-8">
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle id="pastores-presidentes" className="font-display text-xl">Pastores Presidentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src="/imagens/pastores-presidentes.jpeg"
                    alt="Pastores presidentes do Ministério Aliança Renascendo em Cristo"
                    width={290}
                    height={291}
                    loading="lazy"
                    className="h-auto w-full max-w-[290px] rounded-xl"
                  />
                </CardContent>
              </Card>
            </section>
          ) : null}
          <p className="mt-10 text-center text-xs text-muted-foreground">Ministério Aliança Renascendo em Cristo · Sistema administrativo</p>
        </div>
      </main>
    </div>
  );
}
