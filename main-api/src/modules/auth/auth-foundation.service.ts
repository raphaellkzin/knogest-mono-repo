import { normalizeEmail } from "../../lib/security/normalization";
import { hashPassword } from "../../lib/security/password";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import { createMasterAdministratorHandler } from "./handlers/auth-foundation.handler";

export class AuthFoundationService {
  constructor(private readonly context: HandlerContext) {}

  async createMasterAdministrator(input: {
    corporationId: string;
    email: string;
    password: string;
  }) {
    const passwordHash = await hashPassword(input.password);
    return createMasterAdministratorHandler(this.context, {
      corporationId: input.corporationId,
      email: normalizeEmail(input.email),
      passwordHash,
    });
  }
}
