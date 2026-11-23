import { formatDateBR } from "./dates";

export type EntryType = "dizimo" | "oferta";
export type PaymentMethod = "pix" | "dinheiro" | "transferencia" | "outro";

export const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outro: "Outro",
};

type TotalsInput = { entry_type: EntryType; amount_cents: number; is_cancelled: boolean };

/** Totais do período. Lançamentos cancelados não entram na soma. */
export function computeTotals(entries: TotalsInput[]): {
  dizimos: number;
  ofertas: number;
  total: number;
} {
  let dizimos = 0;
  let ofertas = 0;
  for (const e of entries) {
    if (e.is_cancelled) continue;
    if (e.entry_type === "dizimo") dizimos += e.amount_cents;
    else ofertas += e.amount_cents;
  }
  return { dizimos, ofertas, total: dizimos + ofertas };
}

export type CsvEntry = TotalsInput & {
  entry_date: string;
  payment_method: PaymentMethod;
  notes: string | null;
  member_name: string | null;
};

function csvCell(value: string): string {
  // Evita que planilhas interpretem texto como fórmula
  let v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[";\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

function centsToCsv(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
}

/** CSV separado por ";" com BOM, pronto para abrir no Excel em português. */
export function entriesToCsv(entries: CsvEntry[]): string {
  const header = ["Data", "Tipo", "Valor (R$)", "Forma de pagamento", "Membro", "Observação", "Situação"];
  const rows = entries.map((e) =>
    [
      formatDateBR(e.entry_date),
      ENTRY_TYPE_LABEL[e.entry_type],
      centsToCsv(e.amount_cents),
      PAYMENT_LABEL[e.payment_method],
      e.entry_type === "oferta" ? "" : (e.member_name ?? "Anônimo"),
      e.notes ?? "",
      e.is_cancelled ? "Cancelado" : "Válido",
    ]
      .map(csvCell)
      .join(";"),
  );
  return "\uFEFF" + [header.join(";"), ...rows].join("\r\n");
}
