"use server";

import { revalidatePath } from "next/cache";

import { postApiV1Machines } from "@/generated/clients/postApiV1Machines";
import { patchApiV1MachinesMachineidLoadSpecification } from "@/generated/clients/patchApiV1MachinesMachineidLoadSpecification";
import type { PostApiV1MachinesMutationRequest } from "@/generated/models/PostApiV1Machines";
import { ApiClientError } from "@/lib/api/server-client";
import type { MachineActionState } from "./machines-action-state";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

function optionalPayloadString(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  return value.length > 0 ? value : undefined;
}

function decimalPayloadValue(formData: FormData, key: string) {
  return optionalString(formData, key).replace(",", ".");
}

function nullableDecimalPayloadValue(formData: FormData, key: string) {
  const value = decimalPayloadValue(formData, key);
  return value.length > 0 ? value : null;
}

function payload(formData: FormData): PostApiV1MachinesMutationRequest {
  const type = optionalString(formData, "type");
  const isWhiteLine = type === "WHITE_LINE";
  return {
    companyTag: optionalPayloadString(formData, "companyTag"),
    description: optionalPayloadString(formData, "description"),
    initialMeterReading: decimalPayloadValue(formData, "initialMeterReading"),
    meterType:
      optionalString(formData, "meterType") === "ODOMETER"
        ? "ODOMETER"
        : "HOUR_METER",
    manufacturer: optionalString(formData, "manufacturer"),
    model: optionalString(formData, "model"),
    loadVolumeM3: isWhiteLine
      ? optionalPayloadString(formData, "loadVolumeM3")?.replace(",", ".")
      : undefined,
    maxSupportedWeightT: isWhiteLine
      ? optionalPayloadString(formData, "maxSupportedWeightT")?.replace(
          ",",
          ".",
        )
      : undefined,
    name: optionalString(formData, "name"),
    plate: optionalPayloadString(formData, "plate"),
    type: type === "WHITE_LINE" ? "WHITE_LINE" : "YELLOW_LINE",
  };
}

function failureMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code === "MACHINE_IDENTIFIER_CONFLICT") {
      return "Placa ou patrimônio já está em uso nesta empresa.";
    }
    if (error.code === "VALIDATION_ERROR") {
      return "Revise cadastro, identificadores e leitura inicial.";
    }
    if (error.code === "MACHINE_LOAD_SPEC_NOT_APPLICABLE") {
      return "Volume de carga e peso máximo são permitidos somente para máquinas de linha branca.";
    }
    if (error.status === 401 || error.status === 403) {
      return "Sua sessão não tem permissão para concluir esta operação.";
    }
    return error.message;
  }
  return "Não foi possível cadastrar a máquina agora.";
}

export async function updateMachineLoadSpecificationAction(
  machineId: string,
  _state: MachineActionState,
  formData: FormData,
): Promise<MachineActionState> {
  try {
    await patchApiV1MachinesMachineidLoadSpecification({
      machineId,
      data: {
        loadVolumeM3: nullableDecimalPayloadValue(formData, "loadVolumeM3"),
        maxSupportedWeightT: nullableDecimalPayloadValue(
          formData,
          "maxSupportedWeightT",
        ),
      },
    });
    revalidatePath(`/home/maquinas/${machineId}`);
    revalidatePath("/home/maquinas");
    return { ok: true, message: "Capacidade da máquina atualizada." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function createMachineAction(
  _state: MachineActionState,
  formData: FormData,
): Promise<MachineActionState> {
  try {
    await postApiV1Machines({ data: payload(formData) });
    revalidatePath("/home/maquinas");
    return { ok: true, message: "Máquina cadastrada." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}
