export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 text-2xl" : "h-10 w-10 text-lg";
  return (
    <div
      className={`${box} grid shrink-0 place-items-center rounded-xl bg-gold font-display font-bold text-gold-foreground shadow-raised`}
      aria-hidden
    >
      M
    </div>
  );
}

export function BrandName({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="leading-tight">
      <p
        className={`font-display text-lg font-semibold ${inverted ? "text-sidebar-foreground" : "text-foreground"}`}
      >
        MARC
      </p>
      <p className={`text-xs ${inverted ? "text-sidebar-foreground/70" : "text-muted-foreground"}`}>
        Aliança Renascendo em Cristo
      </p>
    </div>
  );
}
