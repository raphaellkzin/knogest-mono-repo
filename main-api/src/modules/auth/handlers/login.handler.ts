import type { HandlerContext } from "../../../lib/utils/handler.dto";

export function findActiveAdministratorHandler(
  context: HandlerContext,
  input: { corporationId: string; email: string },
) {
  return context.prisma.user.findUnique({
    where: {
      corporationId_email: {
        corporationId: input.corporationId,
        email: input.email,
      },
    },
    select: {
      id: true,
      corporationId: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
    },
  });
}

export function updatePasswordHashHandler(
  context: HandlerContext,
  input: { userId: string; passwordHash: string; corporationId?: string },
) {
  return context.prisma.user.update({
    where: input.corporationId
      ? {
          corporationId_id: {
            corporationId: input.corporationId,
            id: input.userId,
          },
        }
      : { id: input.userId },
    data: { passwordHash: input.passwordHash },
    select: { id: true },
  });
}

export function findActiveAdministratorByIdHandler(
  context: HandlerContext,
  input: { corporationId: string; userId: string },
) {
  return context.prisma.user.findFirst({
    where: {
      id: input.userId,
      corporationId: input.corporationId,
      role: "MASTER_ADMIN",
      isActive: true,
      corporation: { isActive: true },
    },
    select: {
      id: true,
      corporationId: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
    },
  });
}

export function createSessionHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    userId: string;
    refreshTokenHash: string;
    now: Date;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
  },
) {
  return context.prisma.session.create({
    data: {
      corporationId: input.corporationId,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      createdAt: input.now,
      lastUsedAt: input.now,
      idleExpiresAt: input.idleExpiresAt,
      absoluteExpiresAt: input.absoluteExpiresAt,
    },
    select: { id: true },
  });
}

export function findValidSessionHandler(
  context: HandlerContext,
  input: { sessionId: string; now: Date },
) {
  return context.prisma.session.findFirst({
    where: {
      id: input.sessionId,
      revokedAt: null,
      idleExpiresAt: { gt: input.now },
      absoluteExpiresAt: { gt: input.now },
      user: { isActive: true },
      corporation: { isActive: true },
    },
    select: {
      id: true,
      corporationId: true,
      userId: true,
      companyId: true,
      company: { select: { id: true, name: true } },
      user: { select: { role: true } },
    },
  });
}

export function listActiveSessionCompaniesHandler(
  context: HandlerContext,
  input: { corporationId: string },
) {
  return context.prisma.company.findMany({
    where: { corporationId: input.corporationId, isActive: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 10,
    select: { id: true, name: true },
  });
}

export function findSelectableCompanyHandler(
  context: HandlerContext,
  input: { corporationId: string; companyId: string },
) {
  return context.prisma.company.findFirst({
    where: {
      id: input.companyId,
      corporationId: input.corporationId,
      isActive: true,
    },
    select: { id: true, name: true },
  });
}

export function updateSessionCompanyHandler(
  context: HandlerContext,
  input: {
    sessionId: string;
    corporationId: string;
    companyId: string;
    now: Date;
  },
) {
  return context.prisma.session.updateMany({
    where: {
      id: input.sessionId,
      corporationId: input.corporationId,
      revokedAt: null,
      idleExpiresAt: { gt: input.now },
      absoluteExpiresAt: { gt: input.now },
    },
    data: { companyId: input.companyId, lastUsedAt: input.now },
  });
}

export function findSessionByRefreshCredentialHandler(
  context: HandlerContext,
  input: { refreshTokenHash: string },
) {
  return context.prisma.session.findFirst({
    where: {
      OR: [
        { refreshTokenHash: input.refreshTokenHash },
        { consumedRefreshTokenHash: input.refreshTokenHash },
      ],
    },
    select: {
      id: true,
      corporationId: true,
      userId: true,
      companyId: true,
      refreshTokenHash: true,
      consumedRefreshTokenHash: true,
      refreshVersion: true,
      revokedAt: true,
      idleExpiresAt: true,
      absoluteExpiresAt: true,
      user: { select: { role: true, isActive: true } },
      corporation: { select: { isActive: true } },
    },
  });
}

export function rotateRefreshCredentialHandler(
  context: HandlerContext,
  input: {
    sessionId: string;
    currentRefreshTokenHash: string;
    replacementRefreshTokenHash: string;
    now: Date;
    idleExpiresAt: Date;
  },
) {
  return context.prisma.session.updateMany({
    where: {
      id: input.sessionId,
      refreshTokenHash: input.currentRefreshTokenHash,
      revokedAt: null,
      idleExpiresAt: { gt: input.now },
      absoluteExpiresAt: { gt: input.now },
    },
    data: {
      refreshTokenHash: input.replacementRefreshTokenHash,
      consumedRefreshTokenHash: input.currentRefreshTokenHash,
      refreshConsumedAt: input.now,
      refreshVersion: { increment: 1 },
      lastUsedAt: input.now,
      idleExpiresAt: input.idleExpiresAt,
    },
  });
}

export function revokeSessionHandler(
  context: HandlerContext,
  input: { sessionId: string; now: Date; reason: string },
) {
  return context.prisma.session.updateMany({
    where: { id: input.sessionId, revokedAt: null },
    data: {
      revokedAt: input.now,
      revocationReason: input.reason,
      refreshTokenHash: null,
    },
  });
}

export function revokeUserSessionsHandler(
  context: HandlerContext,
  input: { corporationId: string; userId: string; now: Date; reason: string },
) {
  return context.prisma.session.updateMany({
    where: {
      corporationId: input.corporationId,
      userId: input.userId,
      revokedAt: null,
    },
    data: {
      revokedAt: input.now,
      revocationReason: input.reason,
      refreshTokenHash: null,
    },
  });
}
