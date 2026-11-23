import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Search, Wallet, ShieldAlert, History } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BrandName } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tither = { id: string; full_name: string; phone: string | null; status: "ativo" | "inativo" };
type TitheEntry = { id: string; amount_cents: number; entry_date: string; payment_method: string; notes: string | null; is_cancelled: boolean };

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export const Route = createFileRoute("/dizimistas")({
  head: () => ({ meta: [{ title: "Dizimistas · MARC" }] }),
  component: TithersPage,
});

function TithersPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Tither[]>([]);
  const [selected, setSelected] = useState<Tither | null>(null);
  const [history, setHistory] = useState<TitheEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
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
    if (roleError || !roles?.some((role) => role.role === "admin")) {
      await navigate({ to: "/painel", replace: true });
      return;
    }
    const { data: titherRows, error: titherError } = await supabase.from("member_tithers").select("member_id").eq("is_tither", true);
    if (titherError) {
      setError("Não foi possível consultar a lista de dizimistas.");
      setLoading(false);
      return;
    }
    const ids = (titherRows ?? []).map((row) => row.member_id);
    if (!ids.length) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const { data: memberRows, error: memberError } = await supabase.from("members").select("id, full_name, phone, status").in("id", ids).order("full_name");
    if (memberError) setError("Não foi possível carregar os cadastros de membros.");
    else setMembers(memberRows ?? []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => members.filter((member) => member.full_name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")) || (member.phone ?? "").includes(search.trim())), [members, search]);

  async function selectMember(member: Tither) {
    setSelected(member);
    setHistory([]);
    setHistoryLoading(true);
    const { data, error: queryError } = await supabase.from("financial_entries").select("id, amount_cents, entry_date, payment_method, notes, is_cancelled").eq("member_id", member.id).eq("entry_type", "dizimo").order("entry_date", { ascending: false });
    if (queryError) setError("Não foi possível consultar o histórico financeiro deste membro.");
    else setHistory(data ?? []);
    setHistoryLoading(false);
  }

  const total = history.filter((entry) => !entry.is_cancelled).reduce((sum, entry) => sum + entry.amount_cents, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><BrandMark /><BrandName /></div><Button variant="outline" size="sm" onClick={() => navigate({ to: "/painel" })}><ArrowLeft /> Painel</Button></header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div><p className="text-sm font-medium text-primary">Acesso exclusivo do administrador</p><h1 className="mt-1 font-display text-3xl font-semibold">Dizimistas</h1><p className="mt-2 text-sm text-muted-foreground">Consulte os membros marcados como dizimistas e seu histórico de contribuições.</p></div>
        {error ? <div role="alert" className="mt-5 flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive"><ShieldAlert size={18} />{error}</div> : null}
        <div className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1.4fr]">
          <Card className="border-0 shadow-card"><CardHeader><CardTitle className="font-display text-xl">Lista de dizimistas</CardTitle></CardHeader><CardContent>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input className="pl-9" placeholder="Buscar nome ou telefone" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            {loading ? <div className="flex justify-center py-10 text-sm text-muted-foreground"><Loader2 className="mr-2 animate-spin" /> Carregando...</div> : filtered.length ? <div className="divide-y">{filtered.map((member) => <button key={member.id} onClick={() => void selectMember(member)} className={`flex w-full items-center justify-between gap-3 py-3 text-left transition hover:bg-muted/60 ${selected?.id === member.id ? "bg-primary-soft/60" : ""}`}><span className="min-w-0"><span className="block truncate text-sm font-semibold">{member.full_name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{member.phone || "Sem telefone"} · {member.status === "ativo" ? "Ativo" : "Inativo"}</span></span><span className="text-xs text-primary">Ver histórico</span></button>)}</div> : <p className="py-10 text-center text-sm text-muted-foreground">Nenhum dizimista encontrado.</p>}
          </CardContent></Card>
          <Card className="border-0 shadow-card"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="font-display text-xl">Histórico de dízimos</CardTitle><p className="mt-1 text-sm text-muted-foreground">{selected ? selected.full_name : "Selecione um membro para consultar"}</p></div><History className="text-gold" /></div></CardHeader><CardContent>
            {selected ? <><div className="mb-5 rounded-xl bg-primary-soft/60 p-4"><p className="text-xs text-muted-foreground">Total de dízimos não cancelados no histórico carregado</p><p className="mt-1 tabular text-2xl font-semibold">{money(total)}</p></div>{historyLoading ? <div className="flex justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 animate-spin" /> Consultando histórico...</div> : history.length ? <div className="overflow-x-auto"><table className="w-full min-w-[450px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="pb-3 font-medium">Data</th><th className="pb-3 font-medium">Pagamento</th><th className="pb-3 font-medium">Valor</th><th className="pb-3 font-medium">Situação</th></tr></thead><tbody className="divide-y">{history.map((entry) => <tr key={entry.id} className={entry.is_cancelled ? "opacity-50" : ""}><td className="py-3">{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${entry.entry_date}T12:00:00Z`))}</td><td className="py-3 capitalize">{entry.payment_method}</td><td className="py-3 tabular font-semibold">{money(entry.amount_cents)}</td><td className="py-3 text-xs">{entry.is_cancelled ? "Cancelado" : "Ativo"}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">Este membro ainda não possui dízimos registrados.</p>}</> : <div className="py-14 text-center"><Wallet className="mx-auto text-muted-foreground" size={30} /><p className="mt-3 text-sm font-medium">Histórico individual</p><p className="mt-1 text-xs text-muted-foreground">Escolha um nome na lista ao lado.</p></div>}
          </CardContent></Card>
        </div>
      </main>
    </div>
  );
}
