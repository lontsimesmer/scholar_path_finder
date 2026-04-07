type LogLevel = "debug" | "info" | "warn" | "error";

type LogDetails = Record<string, unknown> | undefined;

const shouldLog = (level: LogLevel) =>
  level === "warn" || level === "error" || import.meta.env.DEV;

const getConsoleMethod = (level: LogLevel) => {
  switch (level) {
    case "debug":
      return console.debug;
    case "info":
      return console.info;
    case "warn":
      return console.warn;
    case "error":
      return console.error;
    default:
      return console.log;
  }
};

const buildPrefix = (scope: string, message: string) =>
  `[PowerPrestation][${scope}] ${message}`;

const emit = (level: LogLevel, scope: string, message: string, details?: LogDetails) => {
  if (!shouldLog(level)) {
    return;
  }

  const log = getConsoleMethod(level);
  const prefix = buildPrefix(scope, message);

  if (details && Object.keys(details).length > 0) {
    log(prefix, details);
    return;
  }

  log(prefix);
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
