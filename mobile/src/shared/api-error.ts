import { isAxiosError } from "axios";

import type { IProblemDetails } from "@/features/auth/types";

export type ApiFieldErrors = Record<string, string[]>;

export class ApiRequestError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly fieldErrors: ApiFieldErrors;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      fieldErrors?: ApiFieldErrors;
    } = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
  }
}

export function toApiRequestError(
  error: unknown,
  fallbackMessage: string,
): ApiRequestError {
  if (!isAxiosError<IProblemDetails>(error)) {
    return new ApiRequestError(
      error instanceof Error ? error.message : fallbackMessage,
    );
  }

  const response = error.response;
  const problem = response?.data;
  const fieldErrors = normalizeFieldErrors(problem?.errors);
  const message =
    problem?.detail?.trim() ||
    firstFieldError(fieldErrors) ||
    problem?.title?.trim() ||
    (!response ? networkMessage(error.code) : undefined) ||
    fallbackMessage;

  return new ApiRequestError(message, {
    status: response?.status,
    code: problem?.code,
    fieldErrors,
  });
}

function normalizeFieldErrors(
  errors: IProblemDetails["errors"],
): ApiFieldErrors {
  if (!errors || typeof errors !== "object") return {};

  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      (Array.isArray(messages) ? messages : [messages]).filter(
        (message): message is string => typeof message === "string",
      ),
    ]),
  );
}

function firstFieldError(fieldErrors: ApiFieldErrors): string | undefined {
  return Object.values(fieldErrors).flat().find((message) => message.trim());
}

function networkMessage(code?: string): string | undefined {
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
    return "The request timed out. Please try again.";
  }

  return "Unable to reach the server. Check your connection and try again.";
}
