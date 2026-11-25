import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Plus, Search, Pencil, MessageCircle, UserX, Users, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BrandName } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppRole } from "@/lib/auth";

type Member = {
  id: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  joined_at: string | null;
  status: "ativo" | "inativo";
  notes: string | null;
  cargo?: string | null;
  is_tither?: boolean;
};

type FormState = {
  full_name: string;
  phone: string;
  birth_date: string;
  joined_at: string;
  status: "ativo" | "inativo";
  notes: string;
  cargo: string;
  is_tither: boolean;
};

const emptyForm: FormState = {
  full_name: "",
  phone: "",
  birth_date: "",
  joined_at: "",
  status: "ativo",
  notes: "",
  cargo: "",
  is_tither: false,
};

const messageTemplates = {
  "Mensagem bíblica": (name: string) =>
    `Olá, ${name}! Uma palavra para o seu dia: “O Senhor é o meu pastor; nada me faltará.” (Salmo 23:1) Que Deus fortaleça sua fé! Um abraço da equipe do MARC.`,
  "Convite para o culto": (name: string) =>
    `Olá, ${name}! Você e sua família são nossos convidados para o próximo culto do MARC. Vamos adorar a Deus juntos!\n\nData: \nHorário: \nLocal: `,
  "Mensagem de oração": (name: string) =>
    `Olá, ${name}! Como você está? Queremos orar por você. Se quiser compartilhar um pedido de oração, estamos à disposição. Deus abençoe! Um abraço da equipe do MARC.`,
};

type MessageTemplate = keyof typeof messageTemplates;
const defaultTemplate: MessageTemplate = "Mensagem bíblica";

function whatsappNumber(phone: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (/^[1-9]\d{9,10}$/.test(digits)) return `55${digits}`;
  if (/^55[1-9]\d{9,10}$/.test(digits)) return digits;
  return null;
}

export const Route = createFileRoute("/membros")({
  head: () => ({ meta: [{ title: "Membros · MARC" }] }),
  component: MembersPage,
});

function MembersPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<AppRole | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [recipient, setRecipient] = useState<Member | null>(null);
  const [messageTemplate, setMessageTemplate] = useState<MessageTemplate>(defaultTemplate);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("ativo");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      await navigate({ to: "/auth", replace: true });
      return;
    }
    const userId = sessionData.session.user.id;
    const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (roleError) {
      setError("Não foi possível validar seu perfil de acesso.");
      setLoading(false);
      return;
    }
    const userRole: AppRole | null = roles?.some((r) => r.role === "admin")
      ? "admin"
      : roles?.some((r) => r.role === "secretaria") ? "secretaria" : null;
    if (!userRole) {
      await supabase.auth.signOut();
      await navigate({ to: "/auth", replace: true });
      return;
    }
    setRole(userRole);

    let query = supabase.from("members").select("*").order("full_name");
    if (statusFilter !== "todos") query = query.eq("status", statusFilter);
    const term = search.trim();
    if (term) {
      const digits = term.replace(/\D/g, "");
      query = digits.length >= 3
        ? query.or(`full_name.ilike.%${term}%,phone_digits.ilike.%${digits}%`)
        : query.ilike("full_name", `%${term}%`);
    }
    const { data: rows, error: membersError } = await query.overrideTypes<Member[], { merge: false }>();
    if (membersError) {
      setError("Não foi possível carregar os membros. Verifique as políticas de acesso do Supabase.");
      setLoading(false);
      return;
    }

    let titherIds = new Set<string>();
    if (userRole === "admin" && rows?.length) {
      const { data: tithers, error: titherError } = await supabase
        .from("member_tithers")
        .select("member_id, is_tither")
        .in("member_id", rows.map((member) => member.id));
      if (titherError) {
        setError("Os membros foram carregados, mas não foi possível consultar a lista de dizimistas.");
      } else {
        titherIds = new Set((tithers ?? []).filter((item) => item.is_tither).map((item) => item.member_id));
      }
    }
    setMembers((rows ?? []).map((member) => ({ ...member, is_tither: titherIds.has(member.id) })));
    setLoading(false);
  }, [navigate, search, statusFilter]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const visibleCount = useMemo(() => members.length, [members]);

  function selectMessage(member: Member, template: MessageTemplate) {
    const firstName = member.full_name.trim().split(/\s+/)[0];
    setMessageTemplate(template);
    setMessage(messageTemplates[template](firstName));
  }

  const recipientNumber = recipient ? whatsappNumber(recipient.phone) : null;
  const whatsappUrl = recipientNumber && message.trim()
    ? `https://wa.me/${recipientNumber}?text=${encodeURIComponent(message.trim())}`
    : null;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(member: Member) {
    setEditingId(member.id);
    setForm({
      full_name: member.full_name,
      phone: member.phone ?? "",
      birth_date: member.birth_date ?? "",
      joined_at: member.joined_at ?? "",
      status: member.status,
      notes: member.notes ?? "",
      cargo: member.cargo ?? "",
      is_tither: Boolean(member.is_tither),
    });
    setFormOpen(true);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }
    setSaving(true);
    const existingMember = members.find((member) => member.id === editingId);
    const cargo = form.cargo.trim() || null;
    const payload = {
      ...(cargo || existingMember?.cargo ? { cargo } : {}),
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      birth_date: form.birth_date || null,
      joined_at: form.joined_at || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };
    let memberId = editingId;
    if (editingId) {
      const { error: updateError } = await supabase.from("members").update(payload).eq("id", editingId);
      if (updateError) {
        toast.error("Não foi possível salvar o cadastro. " + updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { data: inserted, error: insertError } = await supabase.from("members").insert(payload).select("id").single();
      if (insertError || !inserted) {
        toast.error("Não foi possível salvar o cadastro. " + (insertError?.message ?? ""));
        setSaving(false);
        return;
      }
      memberId = inserted.id;
    }

    if (role === "admin" && memberId) {
      const { error: titherError } = await supabase.from("member_tithers").upsert({
        member_id: memberId,
        is_tither: form.is_tither,
      }, { onConflict: "member_id" });
      if (titherError) toast.error("Cadastro salvo, mas não foi possível atualizar a marcação de dizimista.");
    }

    toast.success(editingId ? "Cadastro atualizado." : "Membro cadastrado.");
    setFormOpen(false);
    setSaving(false);
    await loadMembers();
  }

  async function toggleStatus(member: Member) {
    const nextStatus = member.status === "ativo" ? "inativo" : "ativo";
    const confirmed = window.confirm(`Deseja realmente ${nextStatus === "inativo" ? "inativar" : "reativar"} ${member.full_name}?`);
    if (!confirmed) return;
    const { error: updateError } = await supabase.from("members").update({ status: nextStatus }).eq("id", member.id);
    if (updateError) {
      toast.error("Não foi possível alterar a situação do membro.");
      return;
    }
    toast.success(nextStatus === "inativo" ? "Membro inativado. O histórico financeiro foi preservado." : "Membro reativado.");
    await loadMembers();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3"><BrandMark /><BrandName /></div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/painel" })}><ArrowLeft /> Painel</Button>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-medium text-primary">Gestão da igreja</p><h1 className="mt-1 font-display text-3xl font-semibold">Membros</h1><p className="mt-2 text-sm text-muted-foreground">Cadastre, pesquise e mantenha os registros atualizados.</p></div>
          <Button onClick={openNew}><Plus /> Novo membro</Button>
        </div>

        <Card className="mt-7 border-0 shadow-card">
          <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="font-display text-xl">Cadastro de membros</CardTitle><span className="text-sm text-muted-foreground">{visibleCount} registro(s)</span></div></CardHeader>
          <CardContent>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input className="pl-9" placeholder="Buscar por nome ou telefone" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filtrar situação">
                <option value="ativo">Membros ativos</option><option value="inativo">Membros inativos</option><option value="todos">Todos</option>
              </select>
            </div>
            {error ? <div role="alert" className="mb-4 flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive"><ShieldAlert size={18} />{error}</div> : null}
            {loading ? <div className="flex justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 animate-spin" /> Carregando membros...</div> : members.length ? (
              <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="pb-3 font-medium">Nome</th><th className="pb-3 font-medium">Telefone</th><th className="pb-3 font-medium">Nascimento</th><th className="pb-3 font-medium">Situação</th>{role === "admin" ? <th className="pb-3 font-medium">Dizimista</th> : null}<th className="pb-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y">{members.map((member) => <tr key={member.id}><td className="py-3 pr-3 font-medium">{member.full_name}{member.cargo ? <span className="mt-0.5 block text-xs text-muted-foreground">{member.cargo}</span> : null}</td><td className="py-3 pr-3 text-muted-foreground">{member.phone || "—"}</td><td className="py-3 pr-3 text-muted-foreground">{member.birth_date ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${member.birth_date}T12:00:00Z`)) : "—"}</td><td className="py-3 pr-3"><span className={member.status === "ativo" ? "rounded-full bg-success-soft px-2.5 py-1 text-xs text-success" : "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"}>{member.status === "ativo" ? "Ativo" : "Inativo"}</span></td>{role === "admin" ? <td className="py-3 pr-3 text-muted-foreground">{member.is_tither ? "Sim" : "Não"}</td> : null}<td className="py-3 text-right"><div className="inline-flex gap-1"><Button variant="ghost" size="icon" aria-label={`Mensagem no WhatsApp para ${member.full_name}`} title={whatsappNumber(member.phone) ? "Preparar mensagem no WhatsApp" : "Cadastre um WhatsApp com DDD"} disabled={!whatsappNumber(member.phone)} onClick={() => { selectMessage(member, defaultTemplate); setRecipient(member); }}><MessageCircle size={16} /></Button><Button variant="ghost" size="icon" aria-label={`Editar ${member.full_name}`} onClick={() => openEdit(member)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" aria-label={member.status === "ativo" ? "Inativar membro" : "Reativar membro"} onClick={() => void toggleStatus(member)}><UserX size={16} /></Button></div></td></tr>)}</tbody></table></div>
            ) : <div className="py-12 text-center"><Users className="mx-auto text-muted-foreground" size={28} /><p className="mt-3 text-sm font-medium">Nenhum membro encontrado</p><p className="mt-1 text-xs text-muted-foreground">Altere a busca ou cadastre um novo membro.</p></div>}
          </CardContent>
        </Card>

        <Dialog open={recipient !== null} onOpenChange={(open) => { if (!open) setRecipient(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mensagem no WhatsApp</DialogTitle>
              <DialogDescription>{recipient?.full_name} · {recipient?.phone}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="member-message-template">Modelo</Label>
                <select id="member-message-template" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={messageTemplate} onChange={(event) => { if (recipient) selectMessage(recipient, event.target.value as MessageTemplate); }}>
                  {Object.keys(messageTemplates).map((template) => <option key={template}>{template}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-message-text">Mensagem</Label>
                <textarea id="member-message-text" rows={7} maxLength={2000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={message} onChange={(event) => setMessage(event.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground">Revise a mensagem e confirme o envio no WhatsApp.</p>
              {whatsappUrl ? <Button asChild variant="whatsapp"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle /> Abrir WhatsApp</a></Button> : <Button variant="whatsapp" disabled><MessageCircle /> Abrir WhatsApp</Button>}
            </div>
          </DialogContent>
        </Dialog>

        {formOpen ? <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="member-form-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-card p-5 shadow-raised sm:rounded-2xl sm:p-7">
            <div className="mb-5 flex items-center justify-between"><div><h2 id="member-form-title" className="font-display text-2xl font-semibold">{editingId ? "Editar membro" : "Novo membro"}</h2><p className="mt-1 text-sm text-muted-foreground">Preencha os dados do cadastro.</p></div><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setFormOpen(false)}><X /></Button></div>
            <form onSubmit={saveMember} className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="full_name">Nome completo *</Label><Input id="full_name" required maxLength={160} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="phone">Telefone / WhatsApp</Label><Input id="phone" type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="birth_date">Data de nascimento</Label><Input id="birth_date" type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} /></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="joined_at">Data de ingresso</Label><Input id="joined_at" type="date" value={form.joined_at} onChange={(event) => setForm({ ...form, joined_at: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="status">Situação</Label><select id="status" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div></div>
              {role === "admin" ? <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={form.is_tither} onChange={(event) => setForm({ ...form, is_tither: event.target.checked })} /> É dizimista?</label> : null}
              <div className="space-y-1.5">
                <Label htmlFor="member-cargo">Cargo na igreja</Label>
                <Input id="member-cargo" maxLength={100} placeholder="Ex.: obreiro, pastora, líder de louvor" value={form.cargo} onChange={(event) => setForm({ ...form, cargo: event.target.value })} />
              </div>
              <div className="space-y-1.5"><Label htmlFor="notes">Observações</Label><textarea id="notes" rows={3} maxLength={2000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : null} Salvar cadastro</Button></div>
            </form>
          </section>
        </div> : null}
      </main>
    </div>
  );
}
