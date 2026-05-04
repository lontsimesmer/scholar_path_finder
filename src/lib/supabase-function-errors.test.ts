import { describe, expect, it } from "vitest";

import { readSupabaseFunctionError } from "@/lib/supabase-function-errors";

describe("readSupabaseFunctionError", () => {
  it("extracts the error code and message from a Supabase function response", async () => {
    const result = await readSupabaseFunctionError({
      context: new Response(
        JSON.stringify({
          code: "forbidden",
          error: "Admin access is required",
        }),
      ),
      message: "edge function returned a non-2xx status code",
    });

    expect(result).toEqual({
      code: "forbidden",
      message: "Admin access is required",
    });
  });

  it("falls back to the generic error message when the response body is not JSON", async () => {
    const result = await readSupabaseFunctionError({
      context: new Response("not-json"),
      message: "edge function returned a non-2xx status code",
    });

    expect(result).toEqual({
      code: null,
      message: "edge function returned a non-2xx status code",
    });
  });
});
