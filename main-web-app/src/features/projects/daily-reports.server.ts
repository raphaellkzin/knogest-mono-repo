import "server-only";

import { getApiV1ProjectsProjectidDailyReports } from "@/generated/clients/getApiV1ProjectsProjectidDailyReports";

import type { ProjectDailyReportsPage } from "./daily-reports.types";

export async function getProjectDailyReports(
  projectId: string,
): Promise<ProjectDailyReportsPage> {
  const response = await getApiV1ProjectsProjectidDailyReports({
    projectId,
    params: { limit: 25, sortBy: "reportDate", sortDirection: "desc" },
  });
  return response.data;
}
