import { normalizeHost } from "../../lib/security/normalization";
import { AppError } from "../../lib/utils/appError";

export function assertTrustedOrigin(input: {
  origin?: string | null;
  host: string;
  protocol: string;
  secFetchSite?: string | null;
}) {
  if (input.secFetchSite && input.secFetchSite !== "same-origin") {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Untrusted origin",
      statusCode: 403,
    });
  }

  if (!input.origin) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Origin header is required",
      statusCode: 403,
    });
  }

  let originHost: string;
  let originProtocol: string;
  try {
    const origin = new URL(input.origin);
    originHost = normalizeHost(origin.host);
    originProtocol = origin.protocol;
  } catch {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Untrusted origin",
      statusCode: 403,
    });
  }

  const trustedProtocol = input.protocol.toLowerCase().replace(/:$/, "");
  if (
    !["http", "https"].includes(trustedProtocol) ||
    originProtocol !== `${trustedProtocol}:` ||
    originHost !== normalizeHost(input.host)
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Untrusted origin",
      statusCode: 403,
    });
  }
}
