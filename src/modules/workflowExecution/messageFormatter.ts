import { getString } from "../../utils/locale";
import {
  resolveAddonRef,
  resolveRuntimeAddon,
} from "../../utils/runtimeBridge";
import type { WorkflowMessageFormatter } from "../workflowExecuteMessage";

export function localizeWorkflowText(
  id: string,
  fallback: string,
  args?: Record<string, unknown>,
) {
  try {
    if (!resolveRuntimeAddon()) {
      return fallback;
    }
    const localized = args
      ? getString(id as any, { args })
      : getString(id as any);
    const addonRef = resolveAddonRef("zotero-skills");
    const unresolved = `${addonRef}-${id}`;
    if (!localized || localized === unresolved) {
      return fallback;
    }
    return localized;
  } catch {
    return fallback;
  }
}

export function createLocalizedMessageFormatter(): WorkflowMessageFormatter {
  return {
    summary: ({ workflowLabel, succeeded, failed, skipped }) => {
      if (skipped > 0) {
        return localizeWorkflowText(
          "workflow-execute-summary-with-skipped",
          `Workflow ${workflowLabel} finished. succeeded=${succeeded}, failed=${failed}, skipped=${skipped}`,
          { workflowLabel, succeeded, failed, skipped },
        );
      }
      return localizeWorkflowText(
        "workflow-execute-summary",
        `Workflow ${workflowLabel} finished. succeeded=${succeeded}, failed=${failed}`,
        { workflowLabel, succeeded, failed },
      );
    },
    failureReasonsTitle: localizeWorkflowText(
      "workflow-execute-failure-reasons-title",
      "Failure reasons:",
    ),
    overflow: (count: number) =>
      localizeWorkflowText(
        "workflow-execute-failure-overflow",
        `...and ${count} more`,
        { count },
      ),
    unknownError: localizeWorkflowText(
      "workflow-execute-unknown-error",
      "unknown error",
    ),
    startToast: ({ workflowLabel, totalJobs }) =>
      localizeWorkflowText(
        "workflow-execute-toast-start",
        `Workflow ${workflowLabel} started. jobs=${totalJobs}`,
        { workflowLabel, totalJobs },
      ),
    waitingToast: ({ workflowLabel, pendingJobs }) =>
      localizeWorkflowText(
        "workflow-execute-toast-waiting",
        `Workflow ${workflowLabel} is waiting for backend input. pending=${pendingJobs}`,
        { workflowLabel, pendingJobs },
      ),
    jobToastSuccess: ({ workflowLabel, taskLabel, index, total }) =>
      localizeWorkflowText(
        "workflow-execute-toast-job-success",
        `Workflow ${workflowLabel} job ${index}/${total} succeeded: ${taskLabel}`,
        { workflowLabel, taskLabel, index, total },
      ),
    jobToastFailed: ({ workflowLabel, taskLabel, index, total, reason }) =>
      localizeWorkflowText(
        "workflow-execute-toast-job-failed",
        `Workflow ${workflowLabel} job ${index}/${total} failed: ${taskLabel} (${reason})`,
        { workflowLabel, taskLabel, index, total, reason },
      ),
    jobToastCanceled: ({ workflowLabel, taskLabel, index, total }) =>
      localizeWorkflowText(
        "workflow-execute-toast-job-canceled",
        `Workflow ${workflowLabel} job ${index}/${total} canceled: ${taskLabel}`,
        { workflowLabel, taskLabel, index, total },
      ),
  };
}
