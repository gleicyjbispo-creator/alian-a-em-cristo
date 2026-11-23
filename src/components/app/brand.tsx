export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16" : "h-11 w-11";
  return (
    <div
      className={`${box} grid shrink-0 place-items-center rounded-full border border-gold/70 bg-[#090909] text-gold shadow-[0_0_24px_rgba(201,164,91,0.12)]`}
      aria-label="Símbolo do Ministério Aliança Renascendo em Cristo"
    >
      <span className="font-display text-2xl leading-none" aria-hidden="true">✝</span>
    </div>
  );
}

export function BrandName({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="leading-tight">
      <p className={`font-display text-lg font-semibold tracking-[0.12em] ${inverted ? "text-sidebar-foreground" : "text-foreground"}`}>
        MARC
      </p>
      <p className={`text-[11px] tracking-wide ${inverted ? "text-sidebar-foreground/65" : "text-muted-foreground"}`}>
        Aliança Renascendo em Cristo
      </p>
    </div>
  );
}
