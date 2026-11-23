export const CHURCH_NAME = "MARC — Ministério Aliança Renascendo em Cristo";

/** Retorna o número no formato internacional (55 + DDD + número) ou null. */
export function normalizeBRPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return null;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  const number = normalizeBRPhone(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function birthdayMessage(fullName: string): string {
  return `Olá, ${firstName(fullName)}! 🎉 A família ${CHURCH_NAME} deseja a você um feliz aniversário! Que Deus abençoe grandemente a sua vida neste novo ano. Um abraço carinhoso!`;
}

export function welcomeMessage(fullName: string): string {
  return `Olá, ${firstName(fullName)}! Foi uma alegria receber você no ${CHURCH_NAME}. 🙏 Esperamos você novamente em nossos cultos. Se precisar de algo, conte com a gente. Deus abençoe!`;
}

/** Exibe "(11) 98765-4321" quando possível. */
export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return "—";
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}
