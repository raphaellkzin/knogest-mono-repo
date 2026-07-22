import type { GetApiV1ProjectsProjectidDailyReportsQueryResponse } from "@/generated/models/GetApiV1ProjectsProjectidDailyReports";
import type { GetApiV1ProjectsProjectidDailyReportsOptionsQueryResponse } from "@/generated/models/GetApiV1ProjectsProjectidDailyReportsOptions";
import type { GetApiV1ProjectsProjectidDailyReportsReportidQueryResponse } from "@/generated/models/GetApiV1ProjectsProjectidDailyReportsReportid";
import type { PostApiV1ProjectsProjectidDailyReportsMutationRequest } from "@/generated/models/PostApiV1ProjectsProjectidDailyReports";

export type ProjectDailyReportsPage =
  GetApiV1ProjectsProjectidDailyReportsQueryResponse["data"];
export type ProjectDailyReportSummary = ProjectDailyReportsPage["data"][number];
export type ProjectDailyReportOptions =
  GetApiV1ProjectsProjectidDailyReportsOptionsQueryResponse["data"];
export type ProjectDailyReportDetail =
  GetApiV1ProjectsProjectidDailyReportsReportidQueryResponse["data"];
export type ProjectDailyReportCommand =
  PostApiV1ProjectsProjectidDailyReportsMutationRequest;

export type ProjectDailyReportMutationResult =
  | { kind: "success"; report: ProjectDailyReportDetail }
  | {
      kind: "failure";
      code: string;
      message: string;
      requestId?: string;
      details?: Record<string, unknown>;
    };
