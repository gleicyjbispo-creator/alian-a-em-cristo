import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Plus, Search, Pencil, UserRoundPlus, MessageCircle, UserCheck, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BrandName } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Visitor = {
  id: string;
  full_name: string;
  phone: string;
  visit_date: string;
  notes: string | null;
  member_id: string | null;
};

type VisitorForm = { full_name: string; phone: string; visit_date: string; notes: string };
const blank: VisitorForm = { full_name: "", phone: "", visit_date: new Date().toLocaleDateString("en-CA"), notes: "" };

export const Route = createFileRoute("/visitantes")({
  head: () => ({ meta: [{ title: "Visitantes · MARC" }] }),
  component: VisitorsPage,
});

function VisitorsPage() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<VisitorForm>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      await navigate({ to: "/auth", replace: true });
      return;
    }
    const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", sessionData.session.user.id);
    if (roleError || !roles?.some((r) => r.role === "admin" || r.role === "secretaria")) {
      await supabase.auth.signOut();
      await navigate({ to: "/auth", replace: true });
      return;
    }

    let query = supabase.from("visitors").select("id, full_name, phone, visit_date, notes, member_id").order("visit_date", { ascending: false });
    const term = search.trim();
    if (term) {
      const digits = term.replace(/\D/g, "");
      query = digits.length >= 3
        ? query.or(`full_name.ilike.%${term}%,phone_digits.ilike.%${digits}%`)
        : query.ilike("full_name", `%${term}%`);
    }
    const { data, error: queryError } = await query;
    if (queryError) {
      setError("Não foi possível carregar os visitantes. Verifique a conexão e as permissões do Supabase.");
    } else {
      setVisitors(data ?? []);
    }
    setLoading(false);
  }, [navigate, search]);

  useEffect(() => { void loadVisitors(); }, [loadVisitors]);

  function openNew() {
    setEditingId(null);
    setForm({ ...blank, visit_date: new Date().toLocaleDateString("en-CA") });
    setFormOpen(true);
  }

  function openEdit(visitor: Visitor) {
    setEditingId(visitor.id);
    setForm({ full_name: visitor.full_name, phone: visitor.phone, visit_date: visitor.visit_date, notes: visitor.notes ?? "" });
    setFormOpen(true);
  }

  async function saveVisitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      toast.error("Informe um telefone com DDD válido.");
      return;
    }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      phone_digits: digits,
      visit_date: form.visit_date,
      notes: form.notes.trim() || null,
    };
    const result = editingId
      ? await supabase.from("visitors").update(payload).eq("id", editingId)
      : await supabase.from("visitors").insert(payload);
    if (result.error) {
      toast.error("Não foi possível salvar o visitante. " + result.error.message);
      setSaving(false);
      return;
    }
    toast.success(editingId ? "Visitante atualizado." : "Visitante cadastrado.");
    setFormOpen(false);
    setSaving(false);
    await loadVisitors();
  }

  async function convertVisitor(visitor: Visitor) {
    if (visitor.member_id) {
      toast.info("Este visitante já foi convertido em membro.");
      return;
    }
    if (!window.confirm(`Deseja converter ${visitor.full_name} em membro?`)) return;
    const { error: conversionError } = await supabase.rpc("convert_visitor_to_member", { _visitor_id: visitor.id });
    if (conversionError) {
      toast.error("Não foi possível converter o visitante. " + conversionError.message);
      return;
    }
    toast.success("Visitante convertido em membro. O registro da visita foi preservado.");
    await loadVisitors();
  }

  function whatsappLink(visitor: Visitor) {
    const digits = visitor.phone.replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;
    const message = `Olá, ${visitor.full_name.split(" ")[0]}! Que alegria receber você no Ministério Aliança Renascendo em Cristo. Esperamos que tenha se sentido acolhido(a). Será muito bom ter você conosco novamente! Deus abençoe sua vida. 💛`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><BrandMark /><BrandName /></div><Button variant="outline" size="sm" onClick={() => navigate({ to: "/painel" })}><ArrowLeft /> Painel</Button></header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Acolhimento e integração</p><h1 className="mt-1 font-display text-3xl font-semibold">Visitantes</h1><p className="mt-2 text-sm text-muted-foreground">Registre as visitas e acompanhe quem está chegando à igreja.</p></div><Button onClick={openNew}><Plus /> Novo visitante</Button></div>
        <Card className="mt-7 border-0 shadow-card"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="font-display text-xl">Pessoas visitantes</CardTitle><span className="text-sm text-muted-foreground">{visitors.length} registro(s)</span></div></CardHeader><CardContent>
          <div className="relative mb-5"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input className="pl-9" placeholder="Buscar por nome ou telefone" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {error ? <div role="alert" className="mb-4 flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive"><ShieldAlert size={18} />{error}</div> : null}
          {loading ? <div className="flex justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 animate-spin" /> Carregando visitantes...</div> : visitors.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="pb-3 font-medium">Nome</th><th className="pb-3 font-medium">Telefone</th><th className="pb-3 font-medium">Data da visita</th><th className="pb-3 font-medium">Situação</th><th className="pb-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y">{visitors.map((visitor) => <tr key={visitor.id}><td className="py-3 pr-3 font-medium">{visitor.full_name}</td><td className="py-3 pr-3 text-muted-foreground">{visitor.phone}</td><td className="py-3 pr-3 text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${visitor.visit_date}T12:00:00Z`))}</td><td className="py-3 pr-3">{visitor.member_id ? <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs text-success">Convertido em membro</span> : <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs text-gold-foreground">Visitante</span>}</td><td className="py-3 text-right"><div className="inline-flex gap-1"><Button variant="ghost" size="icon" aria-label="Editar visitante" onClick={() => openEdit(visitor)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" aria-label="Enviar boas-vindas pelo WhatsApp" asChild><a href={whatsappLink(visitor)} target="_blank" rel="noreferrer"><MessageCircle size={16} /></a></Button>{!visitor.member_id ? <Button variant="ghost" size="icon" aria-label="Converter em membro" onClick={() => void convertVisitor(visitor)}><UserCheck size={16} /></Button> : null}</div></td></tr>)}</tbody></table></div> : <div className="py-12 text-center"><UserRoundPlus className="mx-auto text-muted-foreground" size={28} /><p className="mt-3 text-sm font-medium">Nenhum visitante encontrado</p><p className="mt-1 text-xs text-muted-foreground">Cadastre uma nova visita para começar o acompanhamento.</p></div>}
        </CardContent></Card>
        {formOpen ? <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="visitor-form-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-card p-5 shadow-raised sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 id="visitor-form-title" className="font-display text-2xl font-semibold">{editingId ? "Editar visitante" : "Novo visitante"}</h2><p className="mt-1 text-sm text-muted-foreground">Nome, telefone e data da visita são obrigatórios.</p></div><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setFormOpen(false)}><X /></Button></div>
          <form onSubmit={saveVisitor} className="space-y-4"><div className="space-y-1.5"><Label htmlFor="visitor-name">Nome completo *</Label><Input id="visitor-name" required maxLength={160} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="visitor-phone">Telefone / WhatsApp com DDD *</Label><Input id="visitor-phone" required type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="visitor-date">Data da visita *</Label><Input id="visitor-date" required type="date" value={form.visit_date} onChange={(event) => setForm({ ...form, visit_date: event.target.value })} /></div></div><div className="space-y-1.5"><Label htmlFor="visitor-notes">Observações</Label><textarea id="visitor-notes" rows={3} maxLength={2000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : null} Salvar visitante</Button></div></form>
        </section></div> : null}
      </main>
    </div>
  );
}
