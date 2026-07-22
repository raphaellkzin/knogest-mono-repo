// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { copyTextToClipboard } from "./copy-to-clipboard";

describe("copyTextToClipboard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the modern clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await expect(copyTextToClipboard("RDO")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("RDO");
  });

  it("falls back to a temporary textarea when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    await expect(copyTextToClipboard("RDO móvel")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("returns false when both copy mechanisms fail", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    await expect(copyTextToClipboard("RDO")).resolves.toBe(false);
  });
});
