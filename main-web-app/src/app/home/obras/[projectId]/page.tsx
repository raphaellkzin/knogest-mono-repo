import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import {
  lookupProjectSuppliedItemOfferSuppliersAction,
  lookupProjectSuppliedItemOffersAction,
  lookupProjectSuppliedItemsAction,
} from "@/features/projects/projects.actions";
import {
  getProjectDetail,
  getProjectReadinessOptions,
} from "@/features/projects/projects.server";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { companies, selectedCompany, session } =
    await requireCompanyWorkspace();
  const { projectId } = await params;
  let project;
  let options;
  try {
    [project, options] = await Promise.all([
      getProjectDetail(projectId),
      getProjectReadinessOptions(projectId),
    ]);
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
      <ProjectDetail
        lookupSuppliedItemOfferSuppliersAction={
          lookupProjectSuppliedItemOfferSuppliersAction
        }
        lookupSuppliedItemOffersAction={lookupProjectSuppliedItemOffersAction}
        lookupSuppliedItemsAction={lookupProjectSuppliedItemsAction}
        options={options}
        project={project}
      />
    </AppShell>
  );
}
