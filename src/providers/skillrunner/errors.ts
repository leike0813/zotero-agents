export type SkillRunnerHttpErrorArgs = {
  message: string;
  status: number;
  statusText?: string;
  path?: string;
  url?: string;
  body?: unknown;
};

export class SkillRunnerHttpError extends Error {
  readonly name = "SkillRunnerHttpError";

  readonly status: number;

  readonly statusText?: string;

  readonly path?: string;

  readonly url?: string;

  readonly body?: unknown;

  constructor(args: SkillRunnerHttpErrorArgs) {
    super(args.message);
    this.status = args.status;
    this.statusText = args.statusText;
    this.path = args.path;
    this.url = args.url;
    this.body = args.body;
  }
}

export class SkillRunnerTerminalRunError extends Error {
  readonly name = "SkillRunnerTerminalRunError";

  readonly status: "failed" | "canceled";

  readonly requestId: string;

  constructor(args: {
    requestId: string;
    status: "failed" | "canceled";
    error?: string;
  }) {
    const error = String(args.error || "").trim() || "unknown error";
    super(
      `SkillRunner job terminal failure: request_id=${args.requestId}, status=${args.status}, error=${error}`,
    );
    this.requestId = args.requestId;
    this.status = args.status;
  }
}

export function getSkillRunnerHttpStatus(error: unknown) {
  const status =
    error instanceof SkillRunnerHttpError
      ? error.status
      : error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : Number.NaN;
  return Number.isFinite(status) ? Math.floor(status) : undefined;
}

export function isSkillRunnerRunTerminalClientError(error: unknown) {
  const status = getSkillRunnerHttpStatus(error);
  return status === 400 || status === 404 || status === 410 || status === 422;
}

export function isSkillRunnerAuthOrConfigError(error: unknown) {
  const status = getSkillRunnerHttpStatus(error);
  return status === 401 || status === 403;
}

export function isSkillRunnerBackendRecoverableError(error: unknown) {
  const status = getSkillRunnerHttpStatus(error);
  if (status === undefined) {
    return true;
  }
  return status === 429 || status >= 500;
}

export function isSkillRunnerTerminalRunError(error: unknown) {
  return error instanceof SkillRunnerTerminalRunError;
}

export function formatSkillRunnerHttpErrorMessage(args: {
  prefix: string;
  path?: string;
  status: number;
  body?: unknown;
}) {
  return `${args.prefix}: path=${args.path || ""}, status=${args.status}, body=${JSON.stringify(args.body)}`;
}
