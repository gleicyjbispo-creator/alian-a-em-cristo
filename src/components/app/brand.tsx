export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-20 w-36" : "h-12 w-24";
  return (
    <img
      src="/imagens/logo-marc.jpeg"
      alt="Logo do Ministério Aliança Renascendo em Cristo"
      className={`${box} shrink-0 rounded-lg bg-black object-contain`}
    />
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
