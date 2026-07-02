import { describe, expect, it } from "vitest";

import { ApiClientError } from "./api-client-error";

describe("ApiClientError", () => {
  it("preserves canonical API error fields without retaining a cause", () => {
    const data = {
      code: "VALIDATION_ERROR",
      details: { fields: [] },
      message: "Validation error",
    };

    const error = new ApiClientError({
      data,
      message: data.message,
      status: 400,
    });

    expect(error).toMatchObject({
      name: "ApiClientError",
      message: "Validation error",
      status: 400,
      code: "VALIDATION_ERROR",
      data,
    });
    expect(error.cause).toBeUndefined();
  });

  it("does not derive a code from an unsafe non-string value", () => {
    const error = new ApiClientError({
      data: { code: { nested: "value" } },
      message: "Request failed",
    });

    expect(error.code).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });
});
