import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "secretaria";
export type Me = { id: string; email: string; role: AppRole | null };

async function fetchMe(): Promise<Me | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const list = (roles ?? []).map((r) => r.role);
  const role: AppRole | null = list.includes("admin")
    ? "admin"
    : list.includes("secretaria")
      ? "secretaria"
      : null;
  return { id: data.user.id, email: data.user.email ?? "", role };
}

export const meQueryOptions = queryOptions({
  queryKey: ["auth", "me"],
  queryFn: fetchMe,
  staleTime: 5 * 60 * 1000,
});

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  secretaria: "Secretaria",
};
