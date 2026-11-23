import { describe, expect, it } from "vitest";

import { birthdaysInMonth, upcomingBirthdays } from "@/lib/birthdays";
import { todayInSaoPaulo } from "@/lib/dates";
import { computeTotals, entriesToCsv } from "@/lib/finance";
import { formatBRL, parseBRLToCents } from "@/lib/money";
import { normalizeBRPhone, whatsappUrl } from "@/lib/whatsapp";

const people = [
  { full_name: "Ana Teste", birth_date: "1990-11-23" },
  { full_name: "Bruno Ficticio", birth_date: "1985-11-30" },
  { full_name: "Carla Exemplo", birth_date: "2000-12-01" },
  { full_name: "Davi Modelo", birth_date: "1970-11-22" },
  { full_name: "Sem Data", birth_date: null },
];

describe("aniversários", () => {
  it("usa a data de São Paulo, não a UTC", () => {
    // 02:00 UTC de 24/11 ainda é 23/11 em São Paulo
    expect(todayInSaoPaulo(new Date("2026-11-24T02:00:00Z"))).toBe("2026-11-23");
  });

  it("mostra quem faz aniversário hoje e nos próximos 7 dias", () => {
    const list = upcomingBirthdays(people, "2026-11-23", 7);
    expect(list.map((p) => p.full_name)).toEqual(["Ana Teste", "Bruno Ficticio"]);
    expect(list[0]?.daysUntil).toBe(0);
    expect(list[1]?.daysUntil).toBe(7);
  });

  it("atravessa a virada do ano", () => {
    const list = upcomingBirthdays([{ full_name: "Eva", birth_date: "1999-01-02" }], "2026-12-30", 7);
    expect(list[0]?.nextBirthday).toBe("2027-01-02");
    expect(list[0]?.turningAge).toBe(28);
  });

  it("lista aniversariantes do mês ordenados pelo dia", () => {
    const nov = birthdaysInMonth(people, 11, 2026);
    expect(nov.map((p) => p.day)).toEqual([22, 23, 30]);
  });
});

describe("valores em centavos", () => {
  it("converte valores brasileiros sem perder centavos", () => {
    expect(parseBRLToCents("1.234,56")).toBe(123456);
    expect(parseBRLToCents("R$ 50")).toBe(5000);
    expect(parseBRLToCents("10,5")).toBe(1050);
    expect(parseBRLToCents("0,10")).toBe(10);
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("1,234")).toBeNull();
  });

  it("exibe moeda no formato brasileiro", () => {
    expect(formatBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });
});

describe("totais financeiros", () => {
  it("separa dízimos e ofertas e ignora lançamentos cancelados", () => {
    const totals = computeTotals([
      { entry_type: "dizimo", amount_cents: 10000, is_cancelled: false },
      { entry_type: "dizimo", amount_cents: 5000, is_cancelled: true },
      { entry_type: "oferta", amount_cents: 2550, is_cancelled: false },
    ]);
    expect(totals).toEqual({ dizimos: 10000, ofertas: 2550, total: 12550 });
  });

  it("exporta CSV com ; e valor com vírgula", () => {
    const csv = entriesToCsv([
      {
        entry_type: "oferta",
        amount_cents: 2550,
        is_cancelled: false,
        entry_date: "2026-11-01",
        payment_method: "pix",
        notes: "=cuidado",
        member_name: null,
      },
    ]);
    const line = csv.split("\r\n")[1];
    expect(line).toBe("01/11/2026;Oferta;25,50;Pix;;'=cuidado;Válido");
  });
});

describe("WhatsApp", () => {
  it("monta o número com 55 e DDD", () => {
    expect(normalizeBRPhone("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizeBRPhone("98765-4321")).toBeNull();
    expect(whatsappUrl("11987654321", "Olá!")).toBe("https://wa.me/5511987654321?text=Ol%C3%A1!");
  });
});
