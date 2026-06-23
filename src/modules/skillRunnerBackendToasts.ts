import type { BackendInstance } from "../backends/types";
import { resolveBackendDisplayName } from "../backends/displayName";
import {
  MANAGED_LOCAL_BACKEND_ID,
  normalizeManagedLocalBackendId,
} from "./skillRunnerLocalRuntimeConstants";
import {
  resolveSkillRunnerBackendAutoDisabledToastText,
  resolveSkillRunnerBackendCommunicationFailedToastText,
  resolveSkillRunnerBackendUnavailableToastText,
} from "../utils/localizationGovernance";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";

const SKILLRUNNER_BACKEND_TOAST_DEDUP_WINDOW_MS = 30_000;

export type SkillRunnerBackendToastKind =
  | "unavailable"
  | "communication-failed"
  | "auto-disabled";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function isManagedLocalSkillRunnerBackendId(backendId: unknown) {
  return (
    normalizeManagedLocalBackendId(normalizeString(backendId)) ===
    MANAGED_LOCAL_BACKEND_ID
  );
}

export function resolveSkillRunnerBackendToastDisplayName(args: {
  backendId: string;
  displayName?: string;
}) {
  return (
    resolveBackendDisplayName(args.backendId, args.displayName) ||
    normalizeString(args.displayName) ||
    normalizeString(args.backendId) ||
    "unknown"
  );
}

function resolveSkillRunnerBackendToastText(args: {
  kind: SkillRunnerBackendToastKind;
  displayName: string;
}) {
  if (args.kind === "auto-disabled") {
    return resolveSkillRunnerBackendAutoDisabledToastText(args.displayName);
  }
  if (args.kind === "communication-failed") {
    return resolveSkillRunnerBackendCommunicationFailedToastText(
      args.displayName,
    );
  }
  return resolveSkillRunnerBackendUnavailableToastText(args.displayName);
}

export function createSkillRunnerBackendToastPayload(args: {
  kind: SkillRunnerBackendToastKind;
  backendId: string;
  displayName?: string;
}) {
  const backendId = normalizeString(args.backendId);
  if (!backendId || isManagedLocalSkillRunnerBackendId(backendId)) {
    return null;
  }
  const displayName = resolveSkillRunnerBackendToastDisplayName({
    backendId,
    displayName: args.displayName,
  });
  return {
    backendId,
    displayName,
    text: resolveSkillRunnerBackendToastText({
      kind: args.kind,
      displayName,
    }),
    dedupKey: `skillrunner-backend:${args.kind}:${backendId}`,
    dedupWindowMs: SKILLRUNNER_BACKEND_TOAST_DEDUP_WINDOW_MS,
  };
}

export function createSkillRunnerBackendToastPayloadFromBackend(args: {
  kind: SkillRunnerBackendToastKind;
  backend: BackendInstance;
}) {
  return createSkillRunnerBackendToastPayload({
    kind: args.kind,
    backendId: normalizeString(args.backend.id),
    displayName: args.backend.displayName,
  });
}

export function showSkillRunnerBackendToast(args: {
  kind: SkillRunnerBackendToastKind;
  backendId: string;
  displayName?: string;
  sticky?: boolean;
}): unknown {
  const payload = createSkillRunnerBackendToastPayload(args);
  if (!payload) {
    return undefined;
  }
  return showWorkflowToast(
    {
      text: payload.text,
      type: "error",
      semantic: "runtime",
      dedupKey: payload.dedupKey,
      dedupWindowMs: payload.dedupWindowMs,
    },
    {
      sticky: args.sticky === true,
      bounded: true,
    },
  );
}
