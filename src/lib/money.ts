const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 123456 -> "R$ 1.234,56" */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/**
 * Converte o valor digitado ("1.234,56", "R$ 50", "10,5") em centavos inteiros,
 * sem usar ponto flutuante. Retorna null quando o valor é inválido.
 */
export function parseBRLToCents(input: string): number | null {
  let s = input.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" no formato brasileiro = mil duzentos e trinta e quatro
    s = s.replace(/\./g, "");
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!match) return null;
  const whole = match[1] ?? "0";
  const frac = (match[2] ?? "").padEnd(2, "0");
  const cents = Number(whole) * 100 + Number(frac);
  return Number.isSafeInteger(cents) ? cents : null;
}

/** 123456 -> "1234,56" (para preencher o campo de edição) */
export function centsToInput(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, "0");
  return `${whole},${frac}`;
}
