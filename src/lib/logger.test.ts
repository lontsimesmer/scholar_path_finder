import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger, getErrorMessage } from "@/lib/logger";

describe("logger helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts useful messages from common error shapes", () => {
    expect(getErrorMessage(new Error("native error"))).toBe("native error");
    expect(getErrorMessage("string error")).toBe("string error");
    expect(getErrorMessage({ error_description: "description" })).toBe("description");
    expect(getErrorMessage({ error: "error field" })).toBe("error field");
    expect(getErrorMessage({ msg: "message field" })).toBe("message field");
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("emits warning logs with scoped prefixes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    createLogger("scope").warn("message", { id: "1" });

    expect(warn).toHaveBeenCalledWith("[PowerPrestation][scope] message", { id: "1" });
  });
});
