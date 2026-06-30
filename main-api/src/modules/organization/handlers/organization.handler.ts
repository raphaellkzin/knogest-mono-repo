import { AppError } from "../../../lib/utils/appError";
import type { HandlerContext } from "../../../lib/utils/handler.dto";

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createCorporationHandler(
  context: HandlerContext,
  name: string,
) {
  return context.prisma.corporation.create({
    data: { name },
    select: { id: true, name: true },
  });
}

export async function createDomainHandler(
  context: HandlerContext,
  data: { corporationId: string; host: string },
) {
  try {
    return await context.prisma.domain.create({
      data,
      select: { id: true, host: true },
    });
  } catch (error) {
    if (isUniqueError(error)) {
      throw new AppError({
        code: "CONFLICT",
        message: "Domain already assigned",
        statusCode: 409,
      });
    }
    throw error;
  }
}

export async function createCompanyHandler(
  context: HandlerContext,
  data: { corporationId: string; name: string },
) {
  try {
    return await context.prisma.company.create({
      data,
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isUniqueError(error)) {
      throw new AppError({
        code: "CONFLICT",
        message: "Company already exists",
        statusCode: 409,
      });
    }
    throw error;
  }
}
