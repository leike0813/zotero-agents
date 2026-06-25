function truncateLine(input: string, maxLength = 160) {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) {
    return "unknown error";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

export type WorkflowMessageFormatter = {
  summary: (args: {
    workflowLabel: string;
    succeeded: number;
    failed: number;
    skipped: number;
  }) => string;
  failureReasonsTitle: string;
  overflow: (count: number) => string;
  unknownError: string;
  startToast: (args: { workflowLabel: string; totalJobs: number }) => string;
  waitingToast: (args: {
    workflowLabel: string;
    pendingJobs: number;
  }) => string;
  jobToastSuccess: (args: {
    workflowLabel: string;
    taskLabel: string;
    index: number;
    total: number;
  }) => string;
  jobToastFailed: (args: {
    workflowLabel: string;
    taskLabel: string;
    index: number;
    total: number;
    reason: string;
  }) => string;
  jobToastCanceled: (args: {
    workflowLabel: string;
    taskLabel: string;
    index: number;
    total: number;
  }) => string;
};

const defaultFormatter: WorkflowMessageFormatter = {
  summary: ({ workflowLabel, succeeded, failed, skipped }) => {
    const skippedPart = skipped > 0 ? `, skipped=${skipped}` : "";
    return `Workflow ${workflowLabel} finished. succeeded=${succeeded}, failed=${failed}${skippedPart}`;
  },
  failureReasonsTitle: "Failure reasons:",
  overflow: (count) => `...and ${count} more`,
  unknownError: "unknown error",
  startToast: ({ workflowLabel, totalJobs }) =>
    `Workflow ${workflowLabel} started. jobs=${totalJobs}`,
  waitingToast: ({ workflowLabel, pendingJobs }) =>
    `Workflow ${workflowLabel} is waiting for backend input. pending=${pendingJobs}`,
  jobToastSuccess: ({ workflowLabel, taskLabel, index, total }) =>
    `Workflow ${workflowLabel} job ${index}/${total} succeeded: ${taskLabel}`,
  jobToastFailed: ({ workflowLabel, taskLabel, index, total, reason }) =>
    `Workflow ${workflowLabel} job ${index}/${total} failed: ${taskLabel} (${reason})`,
  jobToastCanceled: ({ workflowLabel, taskLabel, index, total }) =>
    `Workflow ${workflowLabel} job ${index}/${total} canceled: ${taskLabel}`,
};

function resolveFormatter(
  formatter?: Partial<WorkflowMessageFormatter>,
): WorkflowMessageFormatter {
  if (!formatter) {
    return defaultFormatter;
  }
  return {
    ...defaultFormatter,
    ...formatter,
  };
}

export function normalizeErrorMessage(
  error: unknown,
  formatter?: Partial<WorkflowMessageFormatter>,
) {
  const resolved = resolveFormatter(formatter);
  if (error instanceof Error) {
    return truncateLine(error.message || error.name);
  }
  if (typeof error === "string") {
    return truncateLine(error);
  }
  try {
    return truncateLine(JSON.stringify(error));
  } catch {
    const normalized = String(error);
    return truncateLine(normalized || resolved.unknownError);
  }
}

export function buildWorkflowFinishMessage(
  args: {
    workflowLabel: string;
    succeeded: number;
    failed: number;
    skipped?: number;
    failureReasons: string[];
  },
  formatter?: Partial<WorkflowMessageFormatter>,
) {
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

export function buildWorkflowStartToastMessage(
  args: {
    workflowLabel: string;
    totalJobs: number;
  },
  formatter?: Partial<WorkflowMessageFormatter>,
) {
  const resolved = resolveFormatter(formatter);
  return resolved.startToast(args);
}

export function buildWorkflowWaitingToastMessage(
  args: {
    workflowLabel: string;
    pendingJobs: number;
  },
  formatter?: Partial<WorkflowMessageFormatter>,
) {
  const resolved = resolveFormatter(formatter);
  return resolved.waitingToast(args);
}

export function buildWorkflowJobToastMessage(
  args: {
    workflowLabel: string;
    taskLabel: string;
    index: number;
    total: number;
    succeeded: boolean;
    terminalState?: "succeeded" | "failed" | "canceled";
    reason?: string;
  },
  formatter?: Partial<WorkflowMessageFormatter>,
) {
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
