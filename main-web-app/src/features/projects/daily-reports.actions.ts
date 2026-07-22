"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getApiV1ProjectsProjectidDailyReports } from "@/generated/clients/getApiV1ProjectsProjectidDailyReports";
import { getApiV1ProjectsProjectidDailyReportsOptions } from "@/generated/clients/getApiV1ProjectsProjectidDailyReportsOptions";
import { getApiV1ProjectsProjectidDailyReportsReportid } from "@/generated/clients/getApiV1ProjectsProjectidDailyReportsReportid";
import { postApiV1ProjectsProjectidDailyReports } from "@/generated/clients/postApiV1ProjectsProjectidDailyReports";
import { postApiV1ProjectsProjectidDailyReportsReportidFinalize } from "@/generated/clients/postApiV1ProjectsProjectidDailyReportsReportidFinalize";
import { putApiV1ProjectsProjectidDailyReportsReportid } from "@/generated/clients/putApiV1ProjectsProjectidDailyReportsReportid";
import { ApiClientError } from "@/lib/api/api-client-error";

import type {
  ProjectDailyReportCommand,
  ProjectDailyReportMutationResult,
} from "./daily-reports.types";

const uuid = z.string().uuid();
const optionsInput = z.object({
  projectId: uuid,
  reportDate: z.iso.date(),
  shift: z.enum(["day", "night"]),
});

export async function getProjectDailyReportOptionsAction(input: {
  projectId: string;
  reportDate: string;
  shift: "day" | "night";
}) {
  const parsed = optionsInput.parse(input);
  const response = await getApiV1ProjectsProjectidDailyReportsOptions({
    projectId: parsed.projectId,
    params: { reportDate: parsed.reportDate, shift: parsed.shift },
  });
  return response.data;
}

export async function getProjectDailyReportAction(
  projectId: string,
  reportId: string,
) {
  const response = await getApiV1ProjectsProjectidDailyReportsReportid({
    projectId: uuid.parse(projectId),
    reportId: uuid.parse(reportId),
  });
  return response.data;
}

export async function getMoreProjectDailyReportsAction(
  projectId: string,
  cursor: string,
) {
  const response = await getApiV1ProjectsProjectidDailyReports({
    projectId: uuid.parse(projectId),
    params: {
      cursor: z.string().min(1).max(2048).parse(cursor),
      limit: 25,
      sortBy: "reportDate",
      sortDirection: "desc",
    },
  });
  return response.data;
}

export async function saveProjectDailyReportAction(input: {
  projectId: string;
  reportId?: string;
  command: ProjectDailyReportCommand;
}): Promise<ProjectDailyReportMutationResult> {
  const projectId = uuid.parse(input.projectId);
  try {
    const response = input.reportId
      ? await putApiV1ProjectsProjectidDailyReportsReportid({
          projectId,
          reportId: uuid.parse(input.reportId),
          data: input.command,
        })
      : await postApiV1ProjectsProjectidDailyReports({
          projectId,
          data: input.command,
        });
    revalidatePath(`/home/obras/${projectId}`);
    return { kind: "success", report: response.data };
  } catch (error) {
    return failure(error);
  }
}

export async function finalizeProjectDailyReportAction(
  projectId: string,
  reportId: string,
): Promise<ProjectDailyReportMutationResult> {
  const parsedProjectId = uuid.parse(projectId);
  try {
    const response =
      await postApiV1ProjectsProjectidDailyReportsReportidFinalize({
        projectId: parsedProjectId,
        reportId: uuid.parse(reportId),
      });
    revalidatePath(`/home/obras/${parsedProjectId}`);
    return { kind: "success", report: response.data };
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown): ProjectDailyReportMutationResult {
  if (!(error instanceof ApiClientError))
    return {
      kind: "failure",
      code: "DAILY_REPORT_ACTION_FAILED",
      message: "Não foi possível concluir a operação do RDO.",
    };
  const envelope =
    error.data && typeof error.data === "object"
      ? (error.data as Record<string, unknown>)
      : {};
  return {
    kind: "failure",
    code:
      typeof envelope.code === "string"
        ? envelope.code
        : "DAILY_REPORT_ACTION_FAILED",
    message:
      typeof envelope.message === "string" ? envelope.message : error.message,
    requestId:
      typeof envelope.requestId === "string" ? envelope.requestId : undefined,
    details:
      envelope.details && typeof envelope.details === "object"
        ? (envelope.details as Record<string, unknown>)
        : undefined,
  };
}
