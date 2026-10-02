export class SkillRunnerHttpError extends Error {
    name = "SkillRunnerHttpError";
    status;
    statusText;
    path;
    url;
    body;
    constructor(args) {
        super(args.message);
        this.status = args.status;
        this.statusText = args.statusText;
        this.path = args.path;
        this.url = args.url;
        this.body = args.body;
    }
}
export class SkillRunnerTerminalRunError extends Error {
    name = "SkillRunnerTerminalRunError";
    status;
    requestId;
    constructor(args) {
        const error = String(args.error || "").trim() || "unknown error";
        super(`SkillRunner job terminal failure: request_id=${args.requestId}, status=${args.status}, error=${error}`);
        this.requestId = args.requestId;
        this.status = args.status;
    }
}
export function getSkillRunnerHttpStatus(error) {
    const status = error instanceof SkillRunnerHttpError
        ? error.status
        : error && typeof error === "object" && "status" in error
            ? Number(error.status)
            : Number.NaN;
    return Number.isFinite(status) ? Math.floor(status) : undefined;
}
export function isSkillRunnerRunTerminalClientError(error) {
    const status = getSkillRunnerHttpStatus(error);
    return status === 400 || status === 404 || status === 410 || status === 422;
}
export function isSkillRunnerAuthOrConfigError(error) {
    const status = getSkillRunnerHttpStatus(error);
    return status === 401 || status === 403;
}
export function isSkillRunnerBackendRecoverableError(error) {
    const status = getSkillRunnerHttpStatus(error);
    if (status === undefined) {
        return true;
    }
    return status === 429 || status >= 500;
}
export function isSkillRunnerTerminalRunError(error) {
    return error instanceof SkillRunnerTerminalRunError;
}
export function formatSkillRunnerHttpErrorMessage(args) {
    return `${args.prefix}: path=${args.path || ""}, status=${args.status}, body=${JSON.stringify(args.body)}`;
}
