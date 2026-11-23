import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: ({ context }) => {
    if (context.me.role !== "admin") {
      throw redirect({ to: "/painel" });
    }
  },
  component: () => <Outlet />,
});
