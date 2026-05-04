import { getErrorMessage } from "@/lib/logger";

type SupabaseFunctionErrorPayload = {
  code?: string;
  error?: string;
  message?: string;
};

const hasResponseContext = (error: unknown): error is { context: Response } =>
  typeof error === "object" &&
  error !== null &&
  "context" in error &&
  error.context instanceof Response;

export const readSupabaseFunctionError = async (error: unknown) => {
  if (!hasResponseContext(error)) {
    return {
      code: null,
      message: getErrorMessage(error),
    };
  }

  try {
    const payload = (await error.context.clone().json()) as SupabaseFunctionErrorPayload;
    return {
      code: payload.code ?? null,
      message: payload.error ?? payload.message ?? getErrorMessage(error),
    };
  } catch {
    return {
      code: null,
      message: getErrorMessage(error),
    };
  }
};
