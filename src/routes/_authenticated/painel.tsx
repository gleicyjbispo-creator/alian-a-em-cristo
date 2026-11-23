import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Cake, HandCoins, UserPlus, Users, Wallet } from "lucide-react";

import {
  activeMembersCountQuery,
  birthdayMembersQuery,
  entriesQuery,
  visitorsInMonthCountQuery,
} from "@/lib/api";
import { upcomingBirthdays, describeDaysUntil } from "@/lib/birthdays";
import { formatDateBR, monthName, parseISODate, periodRange, todayInSaoPaulo } from "@/lib/dates";
import { computeTotals } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { EmptyState, LoadingList, PageHeader, StatCard } from "@/components/app/ui";
import { BirthdayList } from "@/components/app/birthday-list";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel · MARC" },
      { name: "description", content: "Resumo de membros, visitantes e aniversários do MARC." },
      { property: "og:title", content: "Painel · MARC" },
      { property: "og:description", content: "Resumo de membros, visitantes e aniversários do MARC." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { me } = Route.useRouteContext();
  const isAdmin = me.role === "admin";
  const today = todayInSaoPaulo();
  const { y, m } = parseISODate(today);
  const { start, end } = periodRange(y, m);

  const members = useQuery(activeMembersCountQuery);
  const visitors = useQuery(visitorsInMonthCountQuery(start, end));
  const bdays = useQuery(birthdayMembersQuery);
  const entries = useQuery({ ...entriesQuery({ year: y, month: m, type: "todos" }), enabled: isAdmin });

  const upcoming = bdays.data ? upcomingBirthdays(bdays.data, today, 7) : [];
  const todayCount = upcoming.filter((b) => b.daysUntil === 0).length;
  const totals = entries.data ? computeTotals(entries.data) : null;

  return (
    <div>
      <PageHeader
        title="Painel"
        description={`Hoje é ${formatDateBR(today)} · ${monthName(m)} de ${y}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          tone="brand"
          label="Membros ativos"
          value={members.data ?? "…"}
          icon={<Users />}
        />
        <StatCard
          label="Visitantes no mês"
          value={visitors.data ?? "…"}
          hint={`Visitas em ${monthName(m).toLowerCase()}`}
          icon={<UserPlus />}
        />
        <StatCard
          tone="gold"
          label="Aniversários (7 dias)"
          value={bdays.data ? upcoming.length : "…"}
          hint={todayCount ? `${todayCount} hoje` : "Nenhum hoje"}
          icon={<Cake />}
        />
      </div>

      {isAdmin ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Financeiro de {monthName(m).toLowerCase()}</h2>
            <Button variant="link" asChild className="px-0">
              <Link to="/financeiro">Ver lançamentos</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Dízimos" value={totals ? formatBRL(totals.dizimos) : "…"} icon={<HandCoins />} />
            <StatCard label="Ofertas" value={totals ? formatBRL(totals.ofertas) : "…"} icon={<Wallet />} />
            <StatCard
              tone="brand"
              label="Total de entradas"
              value={totals ? formatBRL(totals.total) : "…"}
              hint="Sem lançamentos cancelados"
            />
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aniversariantes: hoje e próximos 7 dias</h2>
          <Button variant="link" asChild className="px-0">
            <Link to="/aniversarios">Ver por mês</Link>
          </Button>
        </div>
        {bdays.isLoading ? (
          <LoadingList />
        ) : upcoming.length === 0 ? (
          <EmptyState title="Nenhum aniversário nos próximos 7 dias">
            Cadastre a data de nascimento dos membros para vê-los aqui.
          </EmptyState>
        ) : (
          <BirthdayList
            rows={upcoming.map((b) => ({
              id: b.id,
              full_name: b.full_name,
              phone: b.phone,
              turningAge: b.turningAge,
              dateLabel: formatDateBR(b.nextBirthday).slice(0, 5),
              tag: describeDaysUntil(b.daysUntil),
              highlight: b.daysUntil === 0,
            }))}
          />
        )}
      </section>
    </div>
  );
}
