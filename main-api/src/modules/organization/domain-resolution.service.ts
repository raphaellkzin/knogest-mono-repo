import { normalizeHost } from "../../lib/security/normalization";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import { findActiveCorporationByHostHandler } from "./handlers/domain.handler";

export class DomainResolutionService {
  constructor(private readonly context: HandlerContext) {}

  resolveActiveCorporation(host: string) {
    return findActiveCorporationByHostHandler(
      this.context,
      normalizeHost(host),
    );
  }
}
