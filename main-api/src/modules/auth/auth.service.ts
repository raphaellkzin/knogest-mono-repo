import { normalizeEmail } from "../../lib/security/normalization";
import { hashPassword, verifyPassword } from "../../lib/security/password";
import {
  createRefreshCredential,
  hashRefreshCredential,
} from "../../lib/security/refresh-credential";
import { AppError } from "../../lib/utils/appError";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import { DomainResolutionService } from "../organization/domain-resolution.service";
import {
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_IDLE_TTL_MS,
  createAccessClaims,
} from "./auth-policy";
import {
  createSessionHandler,
  findActiveAdministratorByIdHandler,
  findSelectableCompanyHandler,
  findActiveAdministratorHandler,
  findSessionByRefreshCredentialHandler,
  listActiveSessionCompaniesHandler,
  updatePasswordHashHandler,
  updateSessionCompanyHandler,
  revokeSessionHandler,
  revokeUserSessionsHandler,
  rotateRefreshCredentialHandler,
} from "./handlers/login.handler";

const DUMMY_PASSWORD_HASH = hashPassword("dummy-password-never-used-for-login");

function authenticationFailed(): AppError {
  return new AppError({
    code: "AUTHENTICATION_FAILED",
    message: "Invalid credentials",
    statusCode: 401,
  });
}

export class AuthService {
  constructor(private readonly context: HandlerContext) {}

  async login(input: {
    host: string;
    email: string;
    password: string;
    now?: Date;
  }) {
    const email = normalizeEmail(input.email);
    const now = input.now ?? new Date();

    return this.context.transaction(async (transactionContext) => {
      let resolved = null;
      try {
        resolved = await new DomainResolutionService(
          transactionContext,
        ).resolveActiveCorporation(input.host);
      } catch {
        await verifyPassword(await DUMMY_PASSWORD_HASH, input.password);
        throw authenticationFailed();
      }

      if (!resolved) {
        await verifyPassword(await DUMMY_PASSWORD_HASH, input.password);
        throw authenticationFailed();
      }

      const user = await findActiveAdministratorHandler(transactionContext, {
        corporationId: resolved.corporation.id,
        email,
      });
      const passwordHash = user?.passwordHash ?? (await DUMMY_PASSWORD_HASH);
      const verification = await verifyPassword(passwordHash, input.password);
      if (
        !user?.isActive ||
        user.role !== "MASTER_ADMIN" ||
        !verification.valid
      ) {
        throw authenticationFailed();
      }

      if (verification.needsRehash) {
        await updatePasswordHashHandler(transactionContext, {
          userId: user.id,
          passwordHash: await hashPassword(input.password),
        });
      }

      const refreshToken = createRefreshCredential();
      const session = await createSessionHandler(transactionContext, {
        corporationId: resolved.corporation.id,
        userId: user.id,
        refreshTokenHash: hashRefreshCredential(refreshToken),
        now,
        idleExpiresAt: new Date(now.getTime() + SESSION_IDLE_TTL_MS),
        absoluteExpiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS),
      });

      return {
        claims: createAccessClaims({
          userId: user.id,
          corporationId: resolved.corporation.id,
          sessionId: session.id,
          role: user.role,
          tokenVersion: 0,
        }),
        refreshToken,
      };
    });
  }

  async refresh(input: { refreshToken: string; now?: Date }) {
    const now = input.now ?? new Date();
    const presentedHash = hashRefreshCredential(input.refreshToken);

    const result = await this.context.transaction(async (transactionContext) => {
      const session = await findSessionByRefreshCredentialHandler(
        transactionContext,
        { refreshTokenHash: presentedHash },
      );

      if (!session) return null;

      if (session.consumedRefreshTokenHash === presentedHash) {
        await revokeSessionHandler(transactionContext, {
          sessionId: session.id,
          now,
          reason: "refresh-reuse-detected",
        });
        return null;
      }

      if (
        session.revokedAt ||
        session.idleExpiresAt <= now ||
        session.absoluteExpiresAt <= now ||
        !session.user.isActive ||
        !session.corporation.isActive ||
        session.refreshTokenHash !== presentedHash
      ) {
        return null;
      }

      const replacementRefreshToken = createRefreshCredential();
      const rotated = await rotateRefreshCredentialHandler(transactionContext, {
        sessionId: session.id,
        currentRefreshTokenHash: presentedHash,
        replacementRefreshTokenHash: hashRefreshCredential(
          replacementRefreshToken,
        ),
        now,
        idleExpiresAt: new Date(now.getTime() + SESSION_IDLE_TTL_MS),
      });

      if (rotated.count !== 1) {
        const replay = await findSessionByRefreshCredentialHandler(
          transactionContext,
          { refreshTokenHash: presentedHash },
        );
        if (replay) {
          await revokeSessionHandler(transactionContext, {
            sessionId: replay.id,
            now,
            reason: "refresh-race-reuse-detected",
          });
        }
        return null;
      }

      return {
        claims: createAccessClaims({
          userId: session.userId,
          corporationId: session.corporationId,
          sessionId: session.id,
          role: session.user.role,
          tokenVersion: session.refreshVersion + 1,
          ...(session.companyId ? { companyId: session.companyId } : {}),
        }),
        refreshToken: replacementRefreshToken,
      };
    });

    if (!result) throw invalidSession();
    return result;
  }

  async logout(input: { sessionId: string; now?: Date }) {
    const now = input.now ?? new Date();
    return this.context.transaction(async (transactionContext) => {
      await revokeSessionHandler(transactionContext, {
        sessionId: input.sessionId,
        now,
        reason: "logout",
      });
      return { revoked: true };
    });
  }

  async listCompanies(input: { corporationId: string }) {
    return listActiveSessionCompaniesHandler(this.context, {
      corporationId: input.corporationId,
    });
  }

  async selectCompany(input: {
    corporationId: string;
    userId: string;
    sessionId: string;
    role: "MASTER_ADMIN";
    companyId: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    return this.context.transaction(async (transactionContext) => {
      const company = await findSelectableCompanyHandler(transactionContext, {
        corporationId: input.corporationId,
        companyId: input.companyId,
      });
      if (!company) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Company not found",
          statusCode: 404,
        });
      }

      const updated = await updateSessionCompanyHandler(transactionContext, {
        sessionId: input.sessionId,
        corporationId: input.corporationId,
        companyId: company.id,
        now,
      });
      if (updated.count !== 1) throw invalidSession();

      return {
        company,
        claims: createAccessClaims({
          userId: input.userId,
          corporationId: input.corporationId,
          sessionId: input.sessionId,
          role: input.role,
          tokenVersion: 0,
          companyId: company.id,
        }),
      };
    });
  }

  async resetMasterAdministratorPassword(input: {
    actor: { type: "admin-cli"; id: string };
    corporationId: string;
    selector: { userId: string } | { email: string };
    replacementPassword: string;
    now?: Date;
  }) {
    if (
      input.replacementPassword.length < 12 ||
      input.replacementPassword.length > 1024
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Replacement password does not meet policy",
        statusCode: 400,
      });
    }
    const normalizedEmail =
      "email" in input.selector
        ? normalizeEmail(input.selector.email)
        : undefined;
    const passwordHash = await hashPassword(input.replacementPassword);
    const now = input.now ?? new Date();

    return this.context.transaction(async (transactionContext) => {
      const user =
        "userId" in input.selector
          ? await findActiveAdministratorByIdHandler(transactionContext, {
              corporationId: input.corporationId,
              userId: input.selector.userId,
            })
          : await findActiveAdministratorHandler(transactionContext, {
              corporationId: input.corporationId,
              email: normalizedEmail ?? "",
            });

      if (!user || user.role !== "MASTER_ADMIN") {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Target administrator not found",
          statusCode: 404,
        });
      }

      await updatePasswordHashHandler(transactionContext, {
        corporationId: input.corporationId,
        userId: user.id,
        passwordHash,
      });
      const revoked = await revokeUserSessionsHandler(transactionContext, {
        corporationId: input.corporationId,
        userId: user.id,
        now,
        reason: "admin-password-reset",
      });

      return {
        corporationId: input.corporationId,
        userId: user.id,
        resetAt: now.toISOString(),
        revokedSessionCount: revoked.count,
        actor: input.actor,
      };
    });
  }
}

function invalidSession(): AppError {
  return new AppError({
    code: "SESSION_INVALID",
    message: "Invalid or expired session",
    statusCode: 401,
  });
}
