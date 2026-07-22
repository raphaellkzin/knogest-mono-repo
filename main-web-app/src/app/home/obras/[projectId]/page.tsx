import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import {
  lookupProjectSuppliedItemOfferSuppliersAction,
  lookupProjectSuppliedItemOffersAction,
  lookupProjectSuppliedItemsAction,
  lookupProjectSuppliersAction,
} from "@/features/projects/projects.actions";
import {
  getProjectDetail,
  getProjectReadinessOptions,
} from "@/features/projects/projects.server";
import { getProjectDailyReports } from "@/features/projects/daily-reports.server";

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
  let dailyReports;
  try {
    [project, options, dailyReports] = await Promise.all([
      getProjectDetail(projectId),
      getProjectReadinessOptions(projectId),
      getProjectDailyReports(projectId),
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
        initialDailyReports={dailyReports}
        lookupSuppliedItemOfferSuppliersAction={
          lookupProjectSuppliedItemOfferSuppliersAction
        }
        lookupSuppliedItemOffersAction={lookupProjectSuppliedItemOffersAction}
        lookupSuppliedItemsAction={lookupProjectSuppliedItemsAction}
        lookupSuppliersAction={lookupProjectSuppliersAction}
        options={options}
        project={project}
      />
    </AppShell>
  );
}
