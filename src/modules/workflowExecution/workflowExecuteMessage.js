function truncateLine(input, maxLength = 160) {
    const text = input.replace(/\s+/g, " ").trim();
    if (!text) {
        return "unknown error";
    }
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength)}...`;
}
const defaultFormatter = {
    summary: ({ workflowLabel, succeeded, failed, skipped }) => {
        const skippedPart = skipped > 0 ? `, skipped=${skipped}` : "";
        return `Workflow ${workflowLabel} finished. succeeded=${succeeded}, failed=${failed}${skippedPart}`;
    },
    failureReasonsTitle: "Failure reasons:",
    overflow: (count) => `...and ${count} more`,
    unknownError: "unknown error",
    startToast: ({ workflowLabel, totalJobs }) => `Workflow ${workflowLabel} started. jobs=${totalJobs}`,
    waitingToast: ({ workflowLabel, pendingJobs }) => `Workflow ${workflowLabel} is waiting for backend input. pending=${pendingJobs}`,
    jobToastSuccess: ({ workflowLabel, taskLabel, index, total }) => `Workflow ${workflowLabel} job ${index}/${total} succeeded: ${taskLabel}`,
    jobToastFailed: ({ workflowLabel, taskLabel, index, total, reason }) => `Workflow ${workflowLabel} job ${index}/${total} failed: ${taskLabel} (${reason})`,
    jobToastCanceled: ({ workflowLabel, taskLabel, index, total }) => `Workflow ${workflowLabel} job ${index}/${total} canceled: ${taskLabel}`,
};
function resolveFormatter(formatter) {
    if (!formatter) {
        return defaultFormatter;
    }
    return {
        ...defaultFormatter,
        ...formatter,
    };
}
export function normalizeErrorMessage(error, formatter) {
    const resolved = resolveFormatter(formatter);
    if (error instanceof Error) {
        return truncateLine(error.message || error.name);
    }
    if (typeof error === "string") {
        return truncateLine(error);
    }
    if (error && typeof error === "object") {
        const rec = error;
        if (typeof rec.message === "string" && rec.message.trim()) {
            return truncateLine(rec.message);
        }
    }
    try {
        const serialized = JSON.stringify(error);
        if (serialized === "{}") {
            const fallback = String(error);
            return truncateLine(fallback !== "[object Object]" ? fallback : resolved.unknownError);
        }
        return truncateLine(serialized);
    }
    catch {
        const normalized = String(error);
        return truncateLine(normalized || resolved.unknownError);
    }
}
export function buildWorkflowFinishMessage(args, formatter) {
    const resolved = resolveFormatter(formatter);
    const skipped = Math.max(0, args.skipped || 0);
    const base = resolved.summary({
        workflowLabel: args.workflowLabel,
        succeeded: args.succeeded,
        failed: args.failed,
        skipped,
    });
    const reasons = args.failureReasons.filter(Boolean);
    if (args.failed <= 0 || reasons.length === 0) {
        return base;
    }
    const visibleReasons = reasons.slice(0, 3);
    const overflow = reasons.length - visibleReasons.length;
    const details = visibleReasons
        .map((reason, index) => `${index + 1}. ${truncateLine(reason)}`)
        .join("\n");
    if (overflow > 0) {
        return `${base}\n${resolved.failureReasonsTitle}\n${details}\n${resolved.overflow(overflow)}`;
    }
    return `${base}\n${resolved.failureReasonsTitle}\n${details}`;
}
export function buildWorkflowStartToastMessage(args, formatter) {
    const resolved = resolveFormatter(formatter);
    return resolved.startToast(args);
}
export function buildWorkflowWaitingToastMessage(args, formatter) {
    const resolved = resolveFormatter(formatter);
    return resolved.waitingToast(args);
}
export function buildWorkflowJobToastMessage(args, formatter) {
    const resolved = resolveFormatter(formatter);
    if (args.terminalState === "canceled") {
        return resolved.jobToastCanceled(args);
    }
    if (args.succeeded) {
        return resolved.jobToastSuccess(args);
    }
    return resolved.jobToastFailed({
        ...args,
        reason: String(args.reason || resolved.unknownError),
    });
}
