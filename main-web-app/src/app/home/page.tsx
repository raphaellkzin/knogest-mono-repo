import { AppShell } from "@/components/layout/app-shell";
import { HomeDashboard } from "@/components/pages/home/home-dashboard";
import { requireAuthenticatedSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await requireAuthenticatedSession();
  const userId = session.user?.id;

  if (!userId) {
    redirect("/auth/login");
  }

  return (
    <AppShell userId={userId} currentArea="project">
      <HomeDashboard userId={userId} />
    </AppShell>
  );
}
