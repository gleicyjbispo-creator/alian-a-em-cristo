import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Cake,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { meQueryOptions, ROLE_LABEL, type Me } from "@/lib/auth";
import { BrandMark, BrandName } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.fetchQuery(meQueryOptions);
    if (!me) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { me };
  },
  component: AuthenticatedLayout,
});

type NavItem = {
  to: "/painel" | "/membros" | "/visitantes" | "/aniversarios" | "/dizimistas" | "/financeiro";
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/membros", label: "Membros", icon: Users },
  { to: "/visitantes", label: "Visitantes", icon: UserPlus },
  { to: "/aniversarios", label: "Aniversários", icon: Cake },
  { to: "/dizimistas", label: "Dizimistas", icon: HandCoins, adminOnly: true },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
];

function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };
}

function NavLinks({ me, onNavigate }: { me: Me; onNavigate?: () => void }) {
  const items = NAV.filter((i) => !i.adminOnly || me.role === "admin");
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-[18px]"
          activeProps={{
            className: "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-sidebar-primary",
          }}
        >
          <item.icon />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function UserBox({ me }: { me: Me }) {
  const signOut = useSignOut();
  return (
    <div className="rounded-xl border border-sidebar-border p-3">
      <p className="truncate text-sm font-medium text-sidebar-foreground">{me.email}</p>
      <p className="text-xs text-sidebar-primary">{me.role ? ROLE_LABEL[me.role] : "Sem perfil"}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void signOut()}
        className="mt-2 w-full justify-start px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut /> Sair
      </Button>
    </div>
  );
}

function NoRole({ me }: { me: Me }) {
  const signOut = useSignOut();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="surface max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold">Acesso ainda não liberado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O usuário <strong>{me.email}</strong> não tem perfil de administrador ou secretaria. Peça ao
          administrador para liberar seu acesso.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => void signOut()}>
          <LogOut /> Sair
        </Button>
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  const { me } = Route.useRouteContext();
  const [open, setOpen] = useState(false);

  if (!me.role) return <NoRole me={me} />;

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between bg-sidebar p-4 lg:flex">
        <div>
          <div className="mb-8 flex items-center gap-3 px-2 pt-2">
            <BrandMark />
            <BrandName inverted />
          </div>
          <NavLinks me={me} />
        </div>
        <UserBox me={me} />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-sidebar px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <BrandMark />
          <BrandName inverted />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col justify-between border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
            <div>
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mb-8 flex items-center gap-3 px-2 pt-2">
                <BrandMark />
                <BrandName inverted />
              </div>
              <NavLinks me={me} onNavigate={() => setOpen(false)} />
            </div>
            <UserBox me={me} />
          </SheetContent>
        </Sheet>
      </header>

      <main className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10")}>
        <Outlet />
      </main>
    </div>
  );
}
