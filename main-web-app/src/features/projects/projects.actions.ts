"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { postApiV1Projects } from "@/generated/clients/postApiV1Projects";
import client, { ApiClientError } from "@/lib/api/server-client";
import { configureZodPortugueseErrors } from "@/lib/zod-locale";
import { projectCommandSchema, type ProjectCommand } from "./projects-schema";

const viaCepSchema = z
  .object({
    erro: z.boolean().optional(),
    logradouro: z.string().optional(),
    bairro: z.string().optional(),
    localidade: z.string().optional(),
    uf: z.string().optional(),
  })
  .passthrough();

const fieldSchema = z.object({ path: z.string(), code: z.string() });
const resourceSchema = z.object({
  kind: z.enum([
    "client",
    "manager",
    "technicalResponsibility",
    "employee",
    "machine",
    "fuelSupplier",
    "fuelType",
    "supplier",
    "suppliedItem",
    "measurementUnit",
    "supplierOffer",
    "workspace",
    "jobRole",
  ]),
  id: z.string(),
  section: z.enum([
    "identity",
    "accountability",
    "schedule",
    "employees",
    "machines",
    "fuelOffers",
    "materialOffers",
    "supplierOffers",
  ]),
  reason: z.string(),
});
const detailsSchema = z
  .object({
    fields: z.array(fieldSchema).default([]),
    resources: z.array(resourceSchema).default([]),
  })
  .passthrough();

export type ProjectSubmissionResult =
  | { kind: "success"; projectId: string; status: "planned" }
  | {
      kind: "recoverable-conflict";
      code: string;
      fields: z.infer<typeof fieldSchema>[];
      resources: z.infer<typeof resourceSchema>[];
      requestId?: string;
    }
  | { kind: "unknown-outcome" }
  | { kind: "terminal-failure"; code: string; requestId?: string };

export type ProjectCepLookupResult =
  | {
      kind: "success";
      address: {
        street: string;
        neighborhood: string;
        city: string;
        state: string;
      };
    }
  | { kind: "failure"; message: string };

const readinessDecimal = (scale: number) => {
  const pattern = new RegExp(`^\\d{1,16}\\.\\d{${scale}}$`, "u");
  return z.string().regex(pattern);
};

const projectReadinessActionSchema = z
  .object({
    plannedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).optional(),
    productionMetricTargets: z
      .array(
        z.object({
          metricCode: z.enum(["cut", "fill", "finishing", "top_soil"]),
          targetTotal: readinessDecimal(2),
        }),
      )
      .min(1)
      .max(4)
      .optional(),
    fuelOffers: z
      .array(
        z.union([
          z.object({
            mode: z.literal("existing").optional(),
            sourceOfferId: z.string().uuid(),
            conversionToBase: readinessDecimal(6).optional(),
            price: readinessDecimal(4),
          }),
          z.object({
            mode: z.enum(["projectOnly", "companyCatalog"]),
            supplierId: z.string().uuid(),
            itemId: z.string().uuid(),
            purchaseUnitId: z.string().uuid(),
            conversionToBase: readinessDecimal(6),
            price: readinessDecimal(4),
          }),
        ]),
      )
      .max(10)
      .optional(),
    materialOffers: z
      .array(
        z.union([
          z.object({
            mode: z.literal("existing").optional(),
            sourceOfferId: z.string().uuid(),
            conversionToBase: readinessDecimal(6).optional(),
            price: readinessDecimal(4),
          }),
          z.object({
            mode: z.enum(["projectOnly", "companyCatalog"]),
            supplierId: z.string().uuid(),
            itemId: z.string().uuid(),
            purchaseUnitId: z.string().uuid(),
            conversionToBase: readinessDecimal(6),
            price: readinessDecimal(4),
          }),
        ]),
      )
      .max(50)
      .optional(),
    accountability: z
      .object({
        clientId: z.string().uuid(),
        managerEmploymentId: z.string().uuid(),
        technicalResponsibilityEmploymentIds: z
          .array(z.string().uuid())
          .min(1)
          .max(20),
      })
      .optional(),
    employeeAllocations: z
      .array(
        z.object({
          employmentId: z.string().uuid(),
          confirmedJobRoleId: z.string().uuid().optional(),
          confirmedJobRolePeriodId: z.string().uuid().nullable().optional(),
          confirmedJobRoleName: z.string().min(1).max(120).nullable().optional(),
          expectedDailyWorkloadMinutes: z.number().int().min(1).max(1440),
          compensationMode: z.enum([
            "daily",
            "hourly",
            "weekly",
            "fortnightly",
            "monthly",
          ]),
          compensationValue: readinessDecimal(2),
          overtimeRate: readinessDecimal(2),
        }),
      )
      .max(200)
      .optional(),
    machineAllocations: z
      .array(
        z.object({
          machineId: z.string().uuid(),
          startMeterReadingId: z.string().uuid(),
          operatorEmploymentId: z.string().uuid(),
        }),
      )
      .max(100)
      .optional(),
    compensationPaymentTerms: z
      .array(
        z.object({
          compensationMode: z.enum([
            "daily",
            "hourly",
            "weekly",
            "fortnightly",
            "monthly",
          ]),
          daysAfterPeriodEnd: z.number().int().min(0).max(60),
        }),
      )
      .max(5)
      .optional(),
  })
  .strict();

export type ProjectReadinessActionInput = z.infer<
  typeof projectReadinessActionSchema
>;

export type ProjectReadinessMutationResult =
  | { kind: "success" }
  | {
      kind: "recoverable-conflict";
      code: string;
      blockers?: { section: string; message: string }[];
      requestId?: string;
    }
  | { kind: "terminal-failure"; code: string; requestId?: string };

export async function lookupProjectAddressByCepAction(
  postalCode: string,
): Promise<ProjectCepLookupResult> {
  const digits = postalCode.replace(/\D/g, "");
  if (!/^\d{8}$/u.test(digits))
    return { kind: "failure", message: "Informe um CEP com 8 dígitos." };

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok)
      return {
        kind: "failure",
        message: "Não foi possível consultar o CEP agora.",
      };

    const parsed = viaCepSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.erro)
      return { kind: "failure", message: "CEP não encontrado." };

    return {
      kind: "success",
      address: {
        street: parsed.data.logradouro ?? "",
        neighborhood: parsed.data.bairro ?? "",
        city: parsed.data.localidade ?? "",
        state: parsed.data.uf ?? "",
      },
    };
  } catch {
    return {
      kind: "failure",
      message: "Não foi possível consultar o CEP agora.",
    };
  }
}

export async function finalizeProjectAction(input: {
  idempotencyKey: string;
  expectedCompanyId: string;
  command: ProjectCommand;
}): Promise<ProjectSubmissionResult> {
  configureZodPortugueseErrors();
  const key = z.string().uuid().parse(input.idempotencyKey).toLowerCase();
  const expectedCompanyId = z.string().uuid().parse(input.expectedCompanyId);
  const command = projectCommandSchema.parse(input.command);
  try {
    const response = await postApiV1Projects(
      {
        data: command as never,
        headers: {
          "content-type": "application/json",
          "idempotency-key": key,
          "x-expected-company-id": expectedCompanyId,
        },
      },
      { skipAuthRefresh: true },
    );
    revalidatePath("/home/obras");
    return {
      kind: "success",
      projectId: response.data.projectId,
      status: response.data.status,
    };
  } catch (error) {
    if (!(error instanceof ApiClientError)) return { kind: "unknown-outcome" };
    const envelope =
      error.data && typeof error.data === "object"
        ? (error.data as Record<string, unknown>)
        : {};
    const code =
      typeof envelope.code === "string"
        ? envelope.code
        : "PROJECT_FINALIZATION_FAILED";
    const requestId =
      typeof envelope.requestId === "string" ? envelope.requestId : undefined;
    const parsedDetails = detailsSchema.safeParse(envelope.details);
    if (
      [
        "PROJECT_RESOURCE_CONFLICT",
        "VALIDATION_ERROR",
        "PROJECT_WIZARD_COLLECTION_LIMIT_EXCEEDED",
      ].includes(code) &&
      parsedDetails.success
    )
      return {
        kind: "recoverable-conflict",
        code,
        fields: parsedDetails.data.fields,
        resources: parsedDetails.data.resources,
        requestId,
      };
    return { kind: "terminal-failure", code, requestId };
  }
}

function parseProjectError(error: unknown): ProjectReadinessMutationResult {
  if (!(error instanceof ApiClientError))
    return { kind: "terminal-failure", code: "UNKNOWN_ERROR" };
  const envelope =
    error.data && typeof error.data === "object"
      ? (error.data as Record<string, unknown>)
      : {};
  const code =
    typeof envelope.code === "string" ? envelope.code : "PROJECT_ACTION_FAILED";
  const requestId =
    typeof envelope.requestId === "string" ? envelope.requestId : undefined;
  const details =
    envelope.details && typeof envelope.details === "object"
      ? (envelope.details as Record<string, unknown>)
      : {};
  const blockers = Array.isArray(details.blockers)
    ? details.blockers
        .filter(
          (item): item is { section: string; message: string } =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as Record<string, unknown>).section === "string" &&
            typeof (item as Record<string, unknown>).message === "string",
        )
        .map((item) => ({ section: item.section, message: item.message }))
    : undefined;
  if (error.status === 400 || error.status === 409)
    return { kind: "recoverable-conflict", code, blockers, requestId };
  return { kind: "terminal-failure", code, requestId };
}

export async function saveProjectReadinessAction(
  projectId: string,
  input: ProjectReadinessActionInput,
): Promise<ProjectReadinessMutationResult> {
  configureZodPortugueseErrors();
  const id = z.string().uuid().parse(projectId);
  const command = projectReadinessActionSchema.parse(input);
  try {
    await client({
      url: `/api/v1/projects/${id}/readiness`,
      method: "PUT",
      data: command,
      headers: { "content-type": "application/json" },
    });
    revalidatePath(`/home/obras/${id}`);
    revalidatePath("/home/obras");
    return { kind: "success" };
  } catch (error) {
    return parseProjectError(error);
  }
}

export async function activateProjectAction(
  projectId: string,
): Promise<ProjectReadinessMutationResult> {
  const id = z.string().uuid().parse(projectId);
  try {
    await client({
      url: `/api/v1/projects/${id}/activate`,
      method: "POST",
    });
    revalidatePath(`/home/obras/${id}`);
    revalidatePath("/home/obras");
    return { kind: "success" };
  } catch (error) {
    return parseProjectError(error);
  }
}
