import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { periodRange } from "@/lib/dates";
import type { EntryType } from "@/lib/finance";

export type Member = Tables<"members">;
export type Visitor = Tables<"visitors">;
export type FinancialEntry = Tables<"financial_entries">;
export type EntryWithMember = FinancialEntry & { member: { id: string; full_name: string } | null };

const PAGE = 1000;

/** Busca todas as páginas (a API devolve no máximo 1000 linhas por vez). */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Remove caracteres que quebram o filtro "or" da API. */
function cleanSearch(term: string): { text: string; digits: string } {
  const text = term.replace(/[,()*%\\:"']/g, " ").trim();
  const digits = term.replace(/\D/g, "");
  return { text, digits };
}

function searchFilter(term: string): string | null {
  const { text, digits } = cleanSearch(term);
  if (!text && !digits) return null;
  const parts: string[] = [];
  if (text) parts.push(`full_name.ilike.%${text}%`);
  if (digits.length >= 3) parts.push(`phone_digits.ilike.%${digits}%`);
  return parts.join(",");
}

// ===================== Membros =====================
export type MemberStatusFilter = "ativo" | "inativo" | "todos";

export const membersQuery = (search: string, status: MemberStatusFilter) =>
  queryOptions({
    queryKey: ["members", { search, status }],
    queryFn: () =>
      fetchAll<Member>((from, to) => {
        let q = supabase.from("members").select("*").order("full_name").range(from, to);
        if (status !== "todos") q = q.eq("status", status);
        const f = searchFilter(search);
        if (f) q = q.or(f);
        return q;
      }),
  });

export const allMembersLiteQuery = queryOptions({
  queryKey: ["members", "lite"],
  queryFn: () =>
    fetchAll<Pick<Member, "id" | "full_name" | "status">>((from, to) =>
      supabase.from("members").select("id, full_name, status").order("full_name").range(from, to),
    ),
});

export const birthdayMembersQuery = queryOptions({
  queryKey: ["members", "birthdays"],
  queryFn: () =>
    fetchAll<Pick<Member, "id" | "full_name" | "phone" | "birth_date">>((from, to) =>
      supabase
        .from("members")
        .select("id, full_name, phone, birth_date")
        .eq("status", "ativo")
        .not("birth_date", "is", null)
        .order("full_name")
        .range(from, to),
    ),
});

export const activeMembersCountQuery = queryOptions({
  queryKey: ["members", "count-active"],
  queryFn: async () => {
    const { count, error } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo");
    if (error) throw error;
    return count ?? 0;
  },
});

export async function saveMember(
  id: string | null,
  values: TablesInsert<"members">,
  tither: boolean | null,
): Promise<Member> {
  const res = id
    ? await supabase.from("members").update(values as TablesUpdate<"members">).eq("id", id).select().single()
    : await supabase.from("members").insert(values).select().single();
  if (res.error) throw res.error;
  if (tither !== null) {
    const { error } = await supabase
      .from("member_tithers")
      .upsert({ member_id: res.data.id, is_tither: tither }, { onConflict: "member_id" });
    if (error) throw error;
  }
  return res.data;
}

export async function setMemberStatus(id: string, status: Member["status"]): Promise<void> {
  const { error } = await supabase.from("members").update({ status }).eq("id", id);
  if (error) throw error;
}

// ===================== Dizimistas (admin) =====================
export const tithersMapQuery = queryOptions({
  queryKey: ["tithers", "map"],
  queryFn: async () => {
    const rows = await fetchAll<{ member_id: string; is_tither: boolean }>((from, to) =>
      supabase.from("member_tithers").select("member_id, is_tither").range(from, to),
    );
    return new Map(rows.map((r) => [r.member_id, r.is_tither]));
  },
});

export type TitheSummaryRow = {
  id: string;
  full_name: string;
  status: Member["status"];
  isTither: boolean;
  count: number;
  totalCents: number;
  lastDate: string | null;
};

export const tithersQuery = queryOptions({
  queryKey: ["tithers", "list"],
  queryFn: async (): Promise<TitheSummaryRow[]> => {
    const [marked, entries] = await Promise.all([
      fetchAll<{ member_id: string; member: { id: string; full_name: string; status: Member["status"] } | null }>(
        (from, to) =>
          supabase
            .from("member_tithers")
            .select("member_id, member:members(id, full_name, status)")
            .eq("is_tither", true)
            .range(from, to),
      ),
      fetchAll<{
        member_id: string | null;
        amount_cents: number;
        is_cancelled: boolean;
        entry_date: string;
        member: { id: string; full_name: string; status: Member["status"] } | null;
      }>((from, to) =>
        supabase
          .from("financial_entries")
          .select("member_id, amount_cents, is_cancelled, entry_date, member:members(id, full_name, status)")
          .eq("entry_type", "dizimo")
          .not("member_id", "is", null)
          .range(from, to),
      ),
    ]);
    const map = new Map<string, TitheSummaryRow>();
    for (const m of marked) {
      if (!m.member) continue;
      map.set(m.member.id, { ...m.member, isTither: true, count: 0, totalCents: 0, lastDate: null });
    }
    for (const e of entries) {
      if (!e.member) continue;
      const row =
        map.get(e.member.id) ??
        { ...e.member, isTither: false, count: 0, totalCents: 0, lastDate: null };
      if (!e.is_cancelled) {
        row.count += 1;
        row.totalCents += e.amount_cents;
        if (!row.lastDate || e.entry_date > row.lastDate) row.lastDate = e.entry_date;
      }
      map.set(e.member.id, row);
    }
    return [...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
  },
});

export const memberTithesQuery = (memberId: string) =>
  queryOptions({
    queryKey: ["entries", "member", memberId],
    queryFn: () =>
      fetchAll<FinancialEntry>((from, to) =>
        supabase
          .from("financial_entries")
          .select("*")
          .eq("entry_type", "dizimo")
          .eq("member_id", memberId)
          .order("entry_date", { ascending: false })
          .range(from, to),
      ),
  });

// ===================== Visitantes =====================
export const visitorsQuery = (search: string) =>
  queryOptions({
    queryKey: ["visitors", { search }],
    queryFn: () =>
      fetchAll<Visitor>((from, to) => {
        let q = supabase
          .from("visitors")
          .select("*")
          .order("visit_date", { ascending: false })
          .order("full_name")
          .range(from, to);
        const f = searchFilter(search);
        if (f) q = q.or(f);
        return q;
      }),
  });

export const visitorsInMonthCountQuery = (start: string, end: string) =>
  queryOptions({
    queryKey: ["visitors", "count", start],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .gte("visit_date", start)
        .lt("visit_date", end);
      if (error) throw error;
      return count ?? 0;
    },
  });

export async function saveVisitor(id: string | null, values: TablesInsert<"visitors">): Promise<void> {
  const res = id
    ? await supabase.from("visitors").update(values as TablesUpdate<"visitors">).eq("id", id)
    : await supabase.from("visitors").insert(values);
  if (res.error) throw res.error;
}

export async function convertVisitor(visitorId: string): Promise<{ member_id: string; created: boolean }> {
  const { data, error } = await supabase.rpc("convert_visitor_to_member", { _visitor_id: visitorId });
  if (error) throw error;
  return data as { member_id: string; created: boolean };
}

// ===================== Financeiro (admin) =====================
export type EntryFilters = { year: number; month: number | null; type: EntryType | "todos" };

export const entriesQuery = (f: EntryFilters) =>
  queryOptions({
    queryKey: ["entries", f],
    queryFn: () => {
      const { start, end } = periodRange(f.year, f.month);
      return fetchAll<EntryWithMember>((from, to) => {
        let q = supabase
          .from("financial_entries")
          .select("*, member:members(id, full_name)")
          .gte("entry_date", start)
          .lt("entry_date", end)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to);
        if (f.type !== "todos") q = q.eq("entry_type", f.type);
        return q;
      });
    },
  });

export async function saveEntry(id: string | null, values: TablesInsert<"financial_entries">): Promise<void> {
  const res = id
    ? await supabase.from("financial_entries").update(values as TablesUpdate<"financial_entries">).eq("id", id)
    : await supabase.from("financial_entries").insert(values);
  if (res.error) throw res.error;
}

export async function cancelEntry(id: string): Promise<void> {
  const { error } = await supabase.from("financial_entries").update({ is_cancelled: true }).eq("id", id);
  if (error) throw error;
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    if (err.message.includes("row-level security")) return "Você não tem permissão para esta ação.";
    if (err.message.includes("visitors_phone_check")) return "Informe o telefone com DDD.";
    return err.message;
  }
  return "Algo deu errado. Tente novamente.";
}
