import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceSelection } from "@/components/pages/workspaces/workspace-selection";
import { requireAuthenticatedSession } from "@/lib/auth/session";

export default async function Page() {
  const session = await requireAuthenticatedSession();
  const userId = session.user?.id;

  if (!userId) {
    redirect("/auth/login");
  }

  return (
    <AppShell userId={userId} currentArea="workspaces">
      <WorkspaceSelection />
    </AppShell>
  );
}
