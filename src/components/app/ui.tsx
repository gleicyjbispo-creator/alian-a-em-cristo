import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "gold" | "brand";
}) {
  return (
    <div
      className={cn(
        "surface p-5",
        tone === "brand" && "border-transparent bg-brand-gradient text-primary-foreground",
        tone === "gold" && "border-transparent bg-gold-soft",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-sm font-medium",
            tone === "brand" ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span className={cn("[&_svg]:size-5", tone === "brand" ? "text-gold" : "text-primary")}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tabular">{value}</p>
      {hint ? (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "brand" ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div> : null}
    </div>
  );
}

export function LoadingList() {
  return (
    <div className="space-y-2" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="surface h-16 animate-pulse bg-muted" />
      ))}
    </div>
  );
}

export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  size = "sm",
}: {
  phone: string | null | undefined;
  message: string;
  label?: string;
  size?: "sm" | "default";
}) {
  const url = whatsappUrl(phone, message);
  if (!url) {
    return (
      <Button variant="outline" size={size} disabled title="Telefone sem DDD ou inválido">
        <MessageCircle /> {label}
      </Button>
    );
  }
  return (
    <Button variant="whatsapp" size={size} asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle /> {label}
      </a>
    </Button>
  );
}

export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{message}</p>;
}
