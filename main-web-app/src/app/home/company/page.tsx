import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { CompanyAdmin } from "@/components/pages/company/company-admin";
import { requireAuthenticatedSession } from "@/lib/auth/session";

export default async function Page() {
  const session = await requireAuthenticatedSession();
  const userId = session.user?.id;

  if (!userId) {
    redirect("/auth/login");
  }

  return (
    <AppShell userId={userId} currentArea="company">
      <CompanyAdmin />
    </AppShell>
  );
}
