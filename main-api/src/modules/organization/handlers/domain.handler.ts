import type { HandlerContext } from "../../../lib/utils/handler.dto";

export function findActiveCorporationByHostHandler(
  context: HandlerContext,
  host: string,
) {
  return context.prisma.domain.findFirst({
    where: {
      host,
      isActive: true,
      corporation: { isActive: true },
    },
    select: {
      id: true,
      host: true,
      corporation: { select: { id: true, isActive: true } },
    },
  });
}
