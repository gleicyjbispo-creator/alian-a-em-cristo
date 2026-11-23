import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Download, Loader2, Plus, Search, Pencil, Ban, Wallet, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BrandName } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Entry = {
  id: string;
  entry_type: "dizimo" | "oferta";
  amount_cents: number;
  entry_date: string;
  payment_method: "pix" | "dinheiro" | "transferencia" | "outro";
  member_id: string | null;
  notes: string | null;
  is_cancelled: boolean;
  cancelled_at: string | null;
};
type MemberOption = { id: string; full_name: string };
type EntryForm = { entry_type: Entry["entry_type"]; amount: string; entry_date: string; payment_method: Entry["payment_method"]; member_id: string; notes: string };
const blank: EntryForm = { entry_type: "dizimo", amount: "", entry_date: new Date().toLocaleDateString("en-CA"), payment_method: "pix", member_id: "", notes: "" };
const paymentLabels = { pix: "Pix", dinheiro: "Dinheiro", transferencia: "Transferência", outro: "Outro" };

function brl(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
function toCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}
function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · MARC" }] }),
  component: FinancePage,
});

function FinancePage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [typeFilter, setTypeFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<EntryForm>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      await navigate({ to: "/auth", replace: true });
      return;
    }
    const currentUserId = session.session.user.id;
    setUserId(currentUserId);
    const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", currentUserId);
    if (roleError || !roles?.some((role) => role.role === "admin")) {
      toast.error("Acesso restrito ao administrador.");
      await navigate({ to: "/painel", replace: true });
      return;
    }

    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10);
    const [entryResult, memberResult] = await Promise.all([
      supabase.from("financial_entries").select("id, entry_type, amount_cents, entry_date, payment_method, member_id, notes, is_cancelled, cancelled_at").gte("entry_date", firstDay).lte("entry_date", lastDay).order("entry_date", { ascending: false }),
      supabase.from("members").select("id, full_name").eq("status", "ativo").order("full_name"),
    ]);
    if (entryResult.error || memberResult.error) {
      setError("Não foi possível carregar o financeiro. Verifique as políticas RLS e a conexão do Supabase.");
    } else {
      setEntries(entryResult.data ?? []);
      setMembers(memberResult.data ?? []);
    }
    setLoading(false);
  }, [navigate, month, year]);

  useEffect(() => { void load(); }, [load]);

  const memberNames = useMemo(() => new Map(members.map((member) => [member.id, member.full_name])), [members]);
  const filtered = useMemo(() => entries.filter((entry) => {
    const typeOk = typeFilter === "todos" || entry.entry_type === typeFilter;
    const name = entry.member_id ? memberNames.get(entry.member_id) ?? "" : "anonimo";
    const searchOk = !search.trim() || name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")) || entry.notes?.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"));
    return typeOk && searchOk;
  }), [entries, typeFilter, search, memberNames]);

  const totals = useMemo(() => filtered.reduce((result, entry) => {
    if (entry.is_cancelled) return result;
    if (entry.entry_type === "dizimo") result.tithe += entry.amount_cents;
    else result.offering += entry.amount_cents;
    return result;
  }, { tithe: 0, offering: 0 }), [filtered]);

  function openNew() {
    setEditingId(null);
    setForm({ ...blank, entry_date: new Date().toLocaleDateString("en-CA") });
    setFormOpen(true);
  }
  function openEdit(entry: Entry) {
    if (entry.is_cancelled) return;
    setEditingId(entry.id);
    setForm({
      entry_type: entry.entry_type,
      amount: (entry.amount_cents / 100).toFixed(2).replace(".", ","),
      entry_date: entry.entry_date,
      payment_method: entry.payment_method,
      member_id: entry.member_id ?? "",
      notes: entry.notes ?? "",
    });
    setFormOpen(true);
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = toCents(form.amount);
    if (cents <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    const payload = {
      entry_type: form.entry_type,
      amount_cents: cents,
      entry_date: form.entry_date,
      payment_method: form.payment_method,
      member_id: form.entry_type === "dizimo" ? form.member_id || null : null,
      notes: form.notes.trim() || null,
    };
    const result = editingId
      ? await supabase.from("financial_entries").update(payload).eq("id", editingId)
      : await supabase.from("financial_entries").insert({ ...payload, created_by: userId });
    if (result.error) {
      toast.error("Não foi possível salvar o lançamento. " + result.error.message);
      setSaving(false);
      return;
    }
    toast.success(editingId ? "Lançamento atualizado." : "Entrada registrada.");
    setFormOpen(false);
    setSaving(false);
    await load();
  }

  async function cancelEntry(entry: Entry) {
    if (!window.confirm("Cancelar este lançamento? O registro será preservado, mas deixará de compor os totais.")) return;
    const { error: cancelError } = await supabase.from("financial_entries").update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
    }).eq("id", entry.id);
    if (cancelError) {
      toast.error("Não foi possível cancelar o lançamento.");
      return;
    }
    toast.success("Lançamento cancelado e preservado no histórico.");
    await load();
  }

  function exportCsv() {
    const rows = [
      ["Data", "Tipo", "Valor (R$)", "Forma de pagamento", "Membro", "Observação", "Situação"],
      ...filtered.map((entry) => [
        new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${entry.entry_date}T12:00:00Z`)),
        entry.entry_type === "dizimo" ? "Dízimo" : "Oferta",
        (entry.amount_cents / 100).toFixed(2).replace(".", ","),
        paymentLabels[entry.payment_method],
        entry.member_id ? memberNames.get(entry.member_id) ?? "Membro inativo" : "Anônimo",
        entry.notes ?? "",
        entry.is_cancelled ? "Cancelado" : "Ativo",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `marc-financeiro-${year}-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><BrandMark /><BrandName /></div><Button variant="outline" size="sm" onClick={() => navigate({ to: "/painel" })}><ArrowLeft /> Painel</Button></header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Acesso exclusivo do administrador</p><h1 className="mt-1 font-display text-3xl font-semibold">Financeiro</h1><p className="mt-2 text-sm text-muted-foreground">Controle de dízimos e ofertas da igreja.</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download /> Exportar CSV</Button><Button onClick={openNew}><Plus /> Novo lançamento</Button></div></div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2"><Card className="border-0 shadow-card"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total de dízimos</p><p className="mt-2 tabular text-2xl font-semibold">{brl(totals.tithe)}</p></CardContent></Card><Card className="border-0 shadow-card"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total de ofertas</p><p className="mt-2 tabular text-2xl font-semibold">{brl(totals.offering)}</p></CardContent></Card></div>
        <Card className="mt-6 border-0 shadow-card"><CardHeader><div className="flex items-center justify-between"><CardTitle className="font-display text-xl">Lançamentos</CardTitle><Wallet className="text-gold" /></div></CardHeader><CardContent>
          <div className="mb-5 grid gap-3 sm:grid-cols-4"><div className="relative sm:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input className="pl-9" placeholder="Buscar membro ou observação" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select aria-label="Mês" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={month} onChange={(event) => setMonth(event.target.value)}>{monthNames.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</select><Input aria-label="Ano" type="number" min="2020" max="2100" value={year} onChange={(event) => setYear(event.target.value)} /></div>
          <div className="mb-4 flex flex-wrap gap-2"><Button size="sm" variant={typeFilter === "todos" ? "soft" : "outline"} onClick={() => setTypeFilter("todos")}>Todos</Button><Button size="sm" variant={typeFilter === "dizimo" ? "soft" : "outline"} onClick={() => setTypeFilter("dizimo")}>Dízimos</Button><Button size="sm" variant={typeFilter === "oferta" ? "soft" : "outline"} onClick={() => setTypeFilter("oferta")}>Ofertas</Button></div>
          {error ? <div role="alert" className="mb-4 flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive"><ShieldAlert size={18} />{error}</div> : null}
          {loading ? <div className="flex justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 animate-spin" /> Carregando lançamentos...</div> : filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="pb-3 font-medium">Data</th><th className="pb-3 font-medium">Tipo</th><th className="pb-3 font-medium">Pessoa</th><th className="pb-3 font-medium">Pagamento</th><th className="pb-3 font-medium">Valor</th><th className="pb-3 font-medium">Situação</th><th className="pb-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y">{filtered.map((entry) => <tr key={entry.id} className={entry.is_cancelled ? "opacity-55" : ""}><td className="py-3 pr-3">{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${entry.entry_date}T12:00:00Z`))}</td><td className="py-3 pr-3">{entry.entry_type === "dizimo" ? "Dízimo" : "Oferta"}</td><td className="py-3 pr-3">{entry.entry_type === "oferta" || !entry.member_id ? "Anônimo" : memberNames.get(entry.member_id) ?? "Membro inativo"}</td><td className="py-3 pr-3">{paymentLabels[entry.payment_method]}</td><td className="py-3 pr-3 tabular font-semibold">{brl(entry.amount_cents)}</td><td className="py-3 pr-3">{entry.is_cancelled ? <span className="text-xs text-destructive">Cancelado</span> : <span className="text-xs text-success">Ativo</span>}</td><td className="py-3 text-right"><div className="inline-flex gap-1">{!entry.is_cancelled ? <><Button variant="ghost" size="icon" aria-label="Editar lançamento" onClick={() => openEdit(entry)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" aria-label="Cancelar lançamento" onClick={() => void cancelEntry(entry)}><Ban size={16} /></Button></> : null}</div></td></tr>)}</tbody></table></div> : <div className="py-12 text-center"><Wallet className="mx-auto text-muted-foreground" size={28} /><p className="mt-3 text-sm font-medium">Nenhum lançamento neste período</p><p className="mt-1 text-xs text-muted-foreground">Altere os filtros ou registre uma nova entrada.</p></div>}
          <p className="mt-4 border-t pt-4 text-right text-sm font-semibold">Total do período filtrado: {brl(totals.tithe + totals.offering)}</p>
        </CardContent></Card>
        {formOpen ? <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="entry-form-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-card p-5 shadow-raised sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 id="entry-form-title" className="font-display text-2xl font-semibold">{editingId ? "Editar lançamento" : "Novo lançamento"}</h2><p className="mt-1 text-sm text-muted-foreground">Registre o dízimo ou a oferta recebida.</p></div><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setFormOpen(false)}><X /></Button></div>
          <form onSubmit={saveEntry} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="entry-type">Tipo</Label><select id="entry-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.entry_type} onChange={(event) => setForm({ ...form, entry_type: event.target.value as EntryForm["entry_type"], member_id: "" })}><option value="dizimo">Dízimo</option><option value="oferta">Oferta</option></select></div><div className="space-y-1.5"><Label htmlFor="entry-amount">Valor (R$)</Label><Input id="entry-amount" required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="entry-date">Data</Label><Input id="entry-date" required type="date" value={form.entry_date} onChange={(event) => setForm({ ...form, entry_date: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="entry-payment">Forma de pagamento</Label><select id="entry-payment" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value as EntryForm["payment_method"] })}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select></div></div>
            {form.entry_type === "dizimo" ? <div className="space-y-1.5"><Label htmlFor="entry-member">Membro (opcional)</Label><select id="entry-member" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.member_id} onChange={(event) => setForm({ ...form, member_id: event.target.value })}><option value="">Dízimo anônimo</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}</select></div> : <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">As ofertas são registradas sem identificação do doador.</p>}
            <div className="space-y-1.5"><Label htmlFor="entry-notes">Observação</Label><textarea id="entry-notes" rows={3} maxLength={1000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : null} Salvar lançamento</Button></div>
          </form></section></div> : null}
      </main>
    </div>
  );
}
