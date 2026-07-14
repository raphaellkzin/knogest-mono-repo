"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { postApiV1Projects } from "@/generated/clients/postApiV1Projects";
import { ApiClientError } from "@/lib/api/server-client";
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
    "fuelAgreements",
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
        data: command,
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
