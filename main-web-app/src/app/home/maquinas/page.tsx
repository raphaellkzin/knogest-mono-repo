import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { CompanyResourcePage } from "@/components/pages/company/company-resource-page";
import { requireAuthenticatedSession } from "@/lib/auth/session";

export default async function Page() {
  const session = await requireAuthenticatedSession();
  const userId = session.user?.id;

  if (!userId) {
    redirect("/auth/login");
  }

  return (
    <AppShell userId={userId} currentArea="machines">
      <CompanyResourcePage resource="machines" />
    </AppShell>
  );
}
