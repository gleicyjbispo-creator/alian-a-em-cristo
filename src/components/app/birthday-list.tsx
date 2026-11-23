import { Cake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/app/ui";
import { formatPhoneBR, birthdayMessage } from "@/lib/whatsapp";

export type BirthdayRow = {
  id: string;
  full_name: string;
  phone: string | null;
  dateLabel: string;
  tag?: string | undefined;
  highlight?: boolean | undefined;
  turningAge: number;
};

export function BirthdayList({ rows }: { rows: BirthdayRow[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-full ${r.highlight ? "bg-gold text-gold-foreground" : "bg-primary-soft text-primary"}`}
          >
            <Cake className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{r.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {r.dateLabel} · completa {r.turningAge} {r.turningAge === 1 ? "ano" : "anos"} ·{" "}
              {formatPhoneBR(r.phone)}
            </p>
          </div>
          {r.tag ? <Badge variant={r.highlight ? "gold" : "brand"}>{r.tag}</Badge> : null}
          <WhatsAppButton phone={r.phone} message={birthdayMessage(r.full_name)} label="Parabéns" />
        </li>
      ))}
    </ul>
  );
}
