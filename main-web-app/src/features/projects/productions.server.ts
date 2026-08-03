import "server-only";

import { getApiV1ProjectsProjectidProductions } from "@/generated/clients/getApiV1ProjectsProjectidProductions";

import type { ProjectProductionsPage } from "./productions.types";

export async function getProjectProductions(
  projectId: string,
): Promise<ProjectProductionsPage> {
  const response = await getApiV1ProjectsProjectidProductions({
    projectId,
    params: {
      limit: 25,
      sortBy: "productionDate",
      sortDirection: "desc",
    },
  });
  return response.data;
}
