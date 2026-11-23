import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { birthdayMembersQuery } from "@/lib/api";
import { birthdaysInMonth } from "@/lib/birthdays";
import { MONTHS_PT, parseISODate, todayInSaoPaulo } from "@/lib/dates";
import { EmptyState, LoadingList, PageHeader } from "@/components/app/ui";
import { BirthdayList } from "@/components/app/birthday-list";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/aniversarios")({
  head: () => ({
    meta: [
      { title: "Aniversários · MARC" },
      { name: "description", content: "Aniversariantes do mês entre os membros do MARC." },
      { property: "og:title", content: "Aniversários · MARC" },
      { property: "og:description", content: "Aniversariantes do mês entre os membros do MARC." },
    ],
  }),
  component: Aniversarios,
});

function Aniversarios() {
  const today = todayInSaoPaulo();
  const t = parseISODate(today);
  const [month, setMonth] = useState(t.m);
  const { data, isLoading } = useQuery(birthdayMembersQuery);
  // O ano usado é o do próximo aniversário (para meses já passados, o ano seguinte)
  const year = month < t.m ? t.y + 1 : t.y;
  const list = data ? birthdaysInMonth(data, month, year) : [];

  return (
    <div>
      <PageHeader
        title="Aniversários"
        description="Membros ativos com data de nascimento cadastrada."
      />

      <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 sm:flex-wrap" role="tablist" aria-label="Mês">
          {MONTHS_PT.map((name, i) => {
            const m = i + 1;
            return (
              <button
                key={name}
                role="tab"
                aria-selected={m === month}
                onClick={() => setMonth(m)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  m === month
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState title={`Nenhum aniversariante em ${MONTHS_PT[month - 1]?.toLowerCase()}`} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? "aniversariante" : "aniversariantes"}
          </p>
          <BirthdayList
            rows={list.map((b) => {
              const isToday = month === t.m && b.day === t.d;
              return {
                id: b.id,
                full_name: b.full_name,
                phone: b.phone,
                turningAge: b.turningAge,
                dateLabel: `${String(b.day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
                tag: isToday ? "Hoje" : undefined,
                highlight: isToday,
              };
            })}
          />
        </>
      )}
    </div>
  );
}
