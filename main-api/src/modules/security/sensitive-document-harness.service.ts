import { z } from "zod";

import { protectSensitiveDocument } from "../../lib/security/sensitive-document";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import { createSensitiveDocumentHarnessHandler } from "./handlers/sensitive-document-harness.handler";

const createHarnessSchema = z.object({
  corporationId: z.string().uuid(),
  companyId: z.string().uuid(),
  registryType: z.string().trim().min(1).max(64),
  document: z.string().trim().min(1).max(32),
});

export class SensitiveDocumentHarnessService {
  constructor(private readonly context: HandlerContext) {}

  async create(input: z.input<typeof createHarnessSchema>) {
    const data = createHarnessSchema.parse(input);
    return this.context.transaction(async (transactionContext) => {
      const protectedDocument = protectSensitiveDocument({
        document: data.document,
        registryType: data.registryType,
      });

      return createSensitiveDocumentHarnessHandler(transactionContext, {
        corporationId: data.corporationId,
        companyId: data.companyId,
        registryType: data.registryType,
        protectedDocument,
      });
    });
  }
}
