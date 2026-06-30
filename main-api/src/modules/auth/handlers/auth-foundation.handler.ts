import { AppError } from "../../../lib/utils/appError";
import type { HandlerContext } from "../../../lib/utils/handler.dto";

export async function createMasterAdministratorHandler(
  context: HandlerContext,
  data: { corporationId: string; email: string; passwordHash: string },
) {
  try {
    return await context.prisma.user.create({
      data,
      select: { id: true, email: true, role: true },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Administrator email already exists in this Corporation",
        statusCode: 409,
      });
    }
    throw error;
  }
}
