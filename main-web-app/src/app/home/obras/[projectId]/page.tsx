import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import { getProjectDetail } from "@/features/projects/projects.server";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { companies, selectedCompany, session } =
    await requireCompanyWorkspace();
  const { projectId } = await params;
  let project;
  try {
    project = await getProjectDetail(projectId);
  } catch {
    notFound();
  }
  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="works"
    >
      <ProjectDetail project={project} />
    </AppShell>
  );
}
