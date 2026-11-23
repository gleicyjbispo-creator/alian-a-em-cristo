import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Cake, Loader2, MessageCircle, Search, ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BrandName } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BirthdayMember = { id: string; full_name: string; phone: string | null; birth_date: string };
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function localToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
}

function nextBirthday(date: string) {
  const [, month, day] = date.split("-").map(Number);
  const today = localToday();
  let year = today.year;
  let next = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12));
  const todayDate = new Date(Date.UTC(today.year, today.month - 1, today.day, 12));
  if (next < todayDate) {
    year += 1;
    next = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12));
  }
  const days = Math.round((next.getTime() - todayDate.getTime()) / 86400000);
  return { days, month: month ?? 1, day: day ?? 1, year };
}

export const Route = createFileRoute("/aniversarios")({
  head: () => ({ meta: [{ title: "Aniversários · MARC" }] }),
  component: BirthdaysPage,
});

function BirthdaysPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<BirthdayMember[]>([]);
  const [month, setMonth] = useState("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      await navigate({ to: "/auth", replace: true });
      return;
    }
    const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", session.session.user.id);
    if (roleError || !roles?.some((role) => role.role === "admin" || role.role === "secretaria")) {
      await supabase.auth.signOut();
      await navigate({ to: "/auth", replace: true });
      return;
    }
    const { data, error: queryError } = await supabase.from("members").select("id, full_name, phone, birth_date").eq("status", "ativo").not("birth_date", "is", null);
    if (queryError) setError("Não foi possível carregar os aniversários. Verifique as permissões do Supabase.");
    else setMembers((data ?? []).filter((item): item is BirthdayMember => Boolean(item.birth_date)));
    setLoading(false);
  }, [navigate]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    return members
      .map((member) => ({ ...member, next: nextBirthday(member.birth_date) }))
      .filter((member) => month === "todos" || member.next.month === Number(month))
      .filter((member) => !search.trim() || member.full_name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))
      .sort((a, b) => a.next.days - b.next.days || a.full_name.localeCompare(b.full_name, "pt-BR"));
  }, [members, month, search]);

  function whatsapp(member: BirthdayMember) {
    if (!member.phone) return "#";
    const digits = member.phone.replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;
    const message = `Olá, ${member.full_name.split(" ")[0]}! Feliz aniversário! Que Deus abençoe sua vida com saúde, paz e muitas alegrias. Receba o carinho do Ministério Aliança Renascendo em Cristo! 💛`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><BrandMark /><BrandName /></div><Button variant="outline" size="sm" onClick={() => navigate({ to: "/painel" })}><ArrowLeft /> Painel</Button></header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div><p className="text-sm font-medium text-primary">Cuidado e comunhão</p><h1 className="mt-1 font-display text-3xl font-semibold">Aniversários</h1><p className="mt-2 text-sm text-muted-foreground">Acompanhe os aniversariantes e envie uma mensagem pelo WhatsApp.</p></div>
        <Card className="mt-7 border-0 shadow-card"><CardHeader><div className="flex items-center justify-between"><CardTitle className="font-display text-xl">Calendário de aniversariantes</CardTitle><Cake className="text-gold" /></div></CardHeader><CardContent>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input className="pl-9" placeholder="Buscar membro" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select aria-label="Filtrar por mês" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={month} onChange={(event) => setMonth(event.target.value)}><option value="todos">Todos os meses</option>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></div>
          {error ? <div role="alert" className="mb-4 flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive"><ShieldAlert size={18} />{error}</div> : null}
          {loading ? <div className="flex justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 animate-spin" /> Carregando aniversariantes...</div> : filtered.length ? <div className="divide-y">{filtered.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-foreground"><Cake size={19} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.full_name}</p><p className="mt-0.5 text-xs text-muted-foreground">{String(member.next.day).padStart(2, "0")} de {monthNames[member.next.month - 1]} · {member.next.days === 0 ? "Hoje" : `Em ${member.next.days} dia(s)`}</p></div></div>{member.phone ? <Button asChild variant="whatsapp" size="sm"><a href={whatsapp(member)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button> : <span className="text-xs text-muted-foreground">Sem telefone cadastrado</span>}</div>)}</div> : <div className="py-12 text-center"><Cake className="mx-auto text-muted-foreground" size={28} /><p className="mt-3 text-sm font-medium">Nenhum aniversariante encontrado</p><p className="mt-1 text-xs text-muted-foreground">Confira os filtros ou complete as datas de nascimento dos membros.</p></div>}
        </CardContent></Card>
      </main>
    </div>
  );
}
