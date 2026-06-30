import { normalizeHost } from "../../lib/security/normalization";
import { AppError } from "../../lib/utils/appError";

export function assertTrustedOrigin(input: {
  origin?: string | null;
  host: string;
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
  try {
    originHost = normalizeHost(new URL(input.origin).host);
  } catch {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Untrusted origin",
      statusCode: 403,
    });
  }

  if (originHost !== normalizeHost(input.host)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Untrusted origin",
      statusCode: 403,
    });
  }
}
