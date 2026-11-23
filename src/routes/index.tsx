import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MARC · Sistema Administrativo" },
      {
        name: "description",
        content: "Acesso ao sistema administrativo do Ministério Aliança Renascendo em Cristo.",
      },
      { property: "og:title", content: "MARC · Sistema Administrativo" },
      {
        property: "og:description",
        content: "Acesso ao sistema administrativo do Ministério Aliança Renascendo em Cristo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
