import { z } from "zod";

import {
  normalizeEmail,
  normalizeHost,
} from "../../lib/security/normalization";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import { AuthFoundationService } from "../auth/auth-foundation.service";
import {
  createCompanyHandler,
  createCorporationHandler,
  createDomainHandler,
} from "./handlers/organization.handler";

const provisionSchema = z.object({
  corporationName: z.string().trim().min(1).max(160),
  domainHost: z.string().transform(normalizeHost),
  adminEmail: z.string().transform(normalizeEmail),
  adminPassword: z.string().min(12).max(1024),
  companyNames: z.array(z.string().trim().min(1).max(160)).max(3),
});

export class OrganizationService {
  constructor(private readonly context: HandlerContext) {}

  async provision(input: z.input<typeof provisionSchema>) {
    const data = provisionSchema.parse(input);
    return this.context.transaction(async (transactionContext) => {
      const corporation = await createCorporationHandler(
        transactionContext,
        data.corporationName,
      );
      const domain = await createDomainHandler(transactionContext, {
        corporationId: corporation.id,
        host: data.domainHost,
      });
      const administrator = await new AuthFoundationService(
        transactionContext,
      ).createMasterAdministrator({
        corporationId: corporation.id,
        email: data.adminEmail,
        password: data.adminPassword,
      });
      const companies = [];
      for (const name of data.companyNames) {
        companies.push(
          await createCompanyHandler(transactionContext, {
            corporationId: corporation.id,
            name,
          }),
        );
      }
      return { corporation, domain, administrator, companies };
    });
  }

  async addCompany(input: { corporationId: string; companyName: string }) {
    const data = z
      .object({
        corporationId: z.string().uuid(),
        companyName: z.string().trim().min(1).max(160),
      })
      .parse(input);
    return createCompanyHandler(this.context, {
      corporationId: data.corporationId,
      name: data.companyName,
    });
  }
}
