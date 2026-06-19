import { AppShell } from "@/components/layout/app-shell";
import { CompanyOverview } from "@/components/pages/company/company-overview";
import { requireAuthenticatedSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await requireAuthenticatedSession();
  const userId = session.user?.id;

  if (!userId) {
    redirect("/auth/login");
  }

  return (
    <AppShell userId={userId} currentArea="dashboard">
      <CompanyOverview />
    </AppShell>
  );
}
