type LogLevel = "debug" | "info" | "warn" | "error";

type LogDetails = Record<string, unknown> | undefined;

const serializeDetails = (details?: LogDetails) => {
  if (!details || Object.keys(details).length === 0) {
    return "";
  }

  try {
    return ` - ${JSON.stringify(details)}`;
  } catch {
    return " - [unserializable details]";
  }
};

const emit = (level: LogLevel, scope: string, message: string, details?: LogDetails) => {
  const payload = `[${scope}] ${message}${serializeDetails(details)}`;

  switch (level) {
    case "debug":
      console.debug(payload);
      return;
    case "info":
      console.log(payload);
      return;
    case "warn":
      console.warn(payload);
      return;
    case "error":
      console.error(payload);
      return;
  }
};

export const createLogger = (scope: string) => ({
  debug: (message: string, details?: LogDetails) => emit("debug", scope, message, details),
  info: (message: string, details?: LogDetails) => emit("info", scope, message, details),
  warn: (message: string, details?: LogDetails) => emit("warn", scope, message, details),
  error: (message: string, details?: LogDetails) => emit("error", scope, message, details),
});

export const getErrorMessage = (error: unknown, fallback = "Unknown error") => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
};
