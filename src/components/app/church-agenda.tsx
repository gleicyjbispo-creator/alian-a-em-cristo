import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AgendaKind = "reuniao" | "planejamento";
type Entry = {
  id: string;
  title: string;
  date: string;
  details: string;
};
const agendaDb = supabase as unknown as SupabaseClient;
const months = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1))),
);

export function ChurchAgenda({ kind }: { kind: AgendaKind }) {
  const isMeeting = kind === "reuniao";
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await agendaDb.from("church_agenda")
        .select("id, title, date, details")
        .eq("kind", kind)
        .order("date")
        .order("id");
      if (!active) return;
      if (result.error) {
        setError("Não foi possível carregar os registros da igreja.");
      } else {
        setEntries(result.data as Entry[]);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [kind]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !form.title.trim() || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const values = { kind, title: form.title.trim(), date: form.date, details: form.details.trim() };
    const table = agendaDb.from("church_agenda");
    const result = await (form.id ? table.update(values).eq("id", form.id) : table.insert(values))
      .select("id, title, date, details").single();
    setSaving(false);
    if (result.error || !result.data) {
      setError("O registro não foi salvo. Verifique se o banco da agenda está configurado e tente novamente.");
      return;
    }
    const saved = result.data as Entry;
    setEntries((previous) => [...previous.filter((entry) => entry.id !== saved.id), saved]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));
    setYear(Number(saved.date.slice(0, 4)));
    setForm(null);
    setNotice("Registro salvo.");
  }

  function renderEntries(items: Entry[], empty: string) {
    if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
    return <ul className="divide-y">{items.map((entry) => (
      <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <time dateTime={entry.date} className="text-xs text-muted-foreground">{entry.date.split("-").reverse().join("/")}</time>
            <h3 className="break-words font-semibold">{entry.title}</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setNotice(""); setForm(entry); }}>Editar</Button>
        </div>
        {entry.details ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.details}</p> : null}
      </li>
    ))}</ul>;
  }

  return (
    <section aria-labelledby="church-agenda-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="church-agenda-title" className="font-display text-3xl font-semibold">{isMeeting ? "Reuniões" : "Planejamento anual"}</h1>
        <Button onClick={() => {
          setNotice("");
          setForm({ id: "", title: "", date: isMeeting || year === Number(today.slice(0, 4)) ? today : `${year}-01-01`, details: "" });
        }}>{isMeeting ? "Nova reunião" : "Nova atividade"}</Button>
      </div>
      {notice ? <p role="status" className="text-sm">{notice}</p> : null}
      {form ? (
        <Card>
          <CardHeader><CardTitle>{form.id ? "Editar registro" : isMeeting ? "Nova reunião" : "Nova atividade"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1.5">
                  <Label htmlFor="agenda-title">Título</Label>
                  <Input id="agenda-title" required maxLength={150} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agenda-date">Data</Label>
                  <Input id="agenda-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agenda-details">{isMeeting ? "Pauta, ata e decisões" : "Detalhes da atividade"}</Label>
                <textarea id="agenda-details" rows={6} maxLength={20000} className="w-full rounded-md border border-input bg-background p-3 text-sm" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setForm(null)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Carregando registros…</p> : isMeeting ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Próximas reuniões</CardTitle></CardHeader>
            <CardContent>{renderEntries(entries.filter((entry) => entry.date >= today), "Nenhuma reunião agendada.")}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Histórico de reuniões</CardTitle></CardHeader>
            <CardContent>{renderEntries(entries.filter((entry) => entry.date < today).reverse(), "Nenhuma reunião no histórico.")}</CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Button variant="outline" aria-label="Ano anterior" onClick={() => setYear(year - 1)}>Anterior</Button>
            <span aria-live="polite" className="font-semibold">{year}</span>
            <Button variant="outline" aria-label="Próximo ano" onClick={() => setYear(year + 1)}>Próximo</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {months.map((month, index) => (
              <Card key={month}>
                <CardHeader><CardTitle className="capitalize">{month}</CardTitle></CardHeader>
                <CardContent>{renderEntries(entries.filter((entry) => entry.date.startsWith(`${year}-${String(index + 1).padStart(2, "0")}-`)), "Nenhuma atividade planejada.")}</CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
