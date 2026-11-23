export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-20 w-20" : "h-12 w-12";
  return (
    <div className={`${box} grid shrink-0 place-items-center rounded-full border border-[#c9aa70]/70 bg-[#050505] text-[#d9bd82] shadow-[0_0_30px_rgba(201,170,112,0.14)]`} aria-label="Símbolo do Ministério Aliança Renascendo em Cristo" role="img">
      <svg viewBox="0 0 64 64" className="h-[76%] w-[76%]" fill="none" aria-hidden="true">
        <path d="M31.5 12v38M21 24h21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M34 15c6-7 12-8 17-7-2 5-5 8-10 10 5 0 9 2 12 6-7 2-13 1-18-3-2 5-6 9-13 12 1-7 4-12 10-16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 53h38" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".75"/>
      </svg>
    </div>
  );
}

export function BrandName({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="leading-tight">
      <p className={`font-display text-lg font-semibold tracking-[0.12em] ${inverted ? "text-sidebar-foreground" : "text-foreground"}`}>MARC</p>
      <p className={`text-[11px] tracking-wide ${inverted ? "text-sidebar-foreground/65" : "text-muted-foreground"}`}>Ministério Aliança Renascendo em Cristo</p>
    </div>
  );
}
