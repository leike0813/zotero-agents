import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisClientErrorCode,
  type SynthesisGraphCommandResult,
  type SynthesisWorkbenchPaperDigestReadRequest,
  type SynthesisWorkbenchProjection,
  type SynthesisWorkbenchReadState,
} from "../../../packages/synthesis-contracts/src/index";
import type {
  SynthesisUiCacheReadiness,
  SynthesisUiSnapshotInput,
  SynthesisUiState,
} from "../synthesis/uiModel";

export type SynthesisWorkbenchGraphLayoutFailure = {
  graphHash: string;
  layoutAlgorithm: string;
  code: string;
  mutationStatus?: string;
  message: string;
  occurredAt: string;
};

const SYNTHESIS_WORKBENCH_GRAPH_FAILURE_MESSAGE_MAX = 240;

const graphMutationErrorCodes = {
  basis_mismatch: "conflict",
  graph_application_busy: "storage_busy",
  worker_busy: "storage_busy",
  worker_failed: "internal",
  invalid_request: "invalid_request",
  repair_required: "unavailable",
  stopping: "unavailable",
} as const satisfies Record<string, SynthesisClientErrorCode>;

const legacyGraphMutationSuccessStatuses = new Set([
  "completed",
  "bootstrapped",
  "skipped",
  "superseded",
]);

function graphMutationFailureMessage(status: string) {
  return `Citation Graph command failed (${status.replace(/_/g, " ")}).`;
}

function boundedGraphFailureText(value: unknown, max: number) {
  const cleaned = Array.from(typeof value === "string" ? value : "")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(cleaned).slice(0, max).join("");
}

export function createSynthesisWorkbenchGraphLayoutFailure(args: {
  graphHash: string;
  layoutAlgorithm: string;
  error: unknown;
  occurredAt?: string;
}): SynthesisWorkbenchGraphLayoutFailure {
  const errorRow =
    args.error && typeof args.error === "object"
      ? (args.error as {
          code?: unknown;
          details?: Record<string, unknown>;
          message?: unknown;
        })
      : undefined;
  const code = boundedGraphFailureText(errorRow?.code, 64) || "internal";
  const mutationStatus = boundedGraphFailureText(errorRow?.details?.status, 64);
  const message =
    boundedGraphFailureText(
      errorRow?.message ?? args.error,
      SYNTHESIS_WORKBENCH_GRAPH_FAILURE_MESSAGE_MAX,
    ) || graphMutationFailureMessage(mutationStatus || code);
  const occurredAt = boundedGraphFailureText(args.occurredAt, 64);
  return {
    graphHash: args.graphHash.trim(),
    layoutAlgorithm: args.layoutAlgorithm.trim(),
    code,
    ...(mutationStatus ? { mutationStatus } : {}),
    message,
    occurredAt: occurredAt || new Date().toISOString(),
  };
}

export function isSynthesisWorkbenchGraphApplicationBusyError(error: unknown) {
  const record =
    error && typeof error === "object"
      ? (error as {
          code?: unknown;
          status?: unknown;
          message?: unknown;
          details?: Record<string, unknown>;
        })
      : undefined;
  return [
    record?.details?.sidecarCode,
    record?.details?.code,
    record?.details?.status,
    record?.code,
    record?.status,
    record?.message,
  ].some((value) => String(value || "").includes("graph_application_busy"));
}

export function selectSynthesisWorkbenchGraphLayoutFailure(args: {
  graphHash?: unknown;
  layoutAlgorithm?: unknown;
  failure?: SynthesisWorkbenchGraphLayoutFailure;
}) {
  const graphHash =
    typeof args.graphHash === "string" ? args.graphHash.trim() : "";
  const layoutAlgorithm =
    typeof args.layoutAlgorithm === "string" ? args.layoutAlgorithm.trim() : "";
  if (
    graphHash &&
    layoutAlgorithm &&
    args.failure?.graphHash === graphHash &&
    args.failure.layoutAlgorithm === layoutAlgorithm
  ) {
    return args.failure;
  }
  return undefined;
}

export function classifySynthesisWorkbenchGraphMutationResult<
  T extends SynthesisGraphCommandResult,
>(result: T): T {
  const status = typeof result.status === "string" ? result.status.trim() : "";
  if (status === "promoted" || status === "unchanged") {
    return result;
  }
  if (status) {
    const code =
      graphMutationErrorCodes[status as keyof typeof graphMutationErrorCodes];
    if (code) {
      throw new SynthesisClientError(
        code,
        graphMutationFailureMessage(status),
        { status },
      );
    }
    if (result.ok === true && legacyGraphMutationSuccessStatuses.has(status)) {
      return result;
    }
    throw new SynthesisClientError(
      "internal",
      graphMutationFailureMessage(status),
      { status },
    );
  }
  if (result.ok === false) {
    throw new SynthesisClientError(
      "internal",
      "Citation Graph command failed.",
      { ok: false },
    );
  }
  if (
    typeof result.failed === "number" &&
    Number.isFinite(result.failed) &&
    result.failed > 0
  ) {
    throw new SynthesisClientError(
      "internal",
      "Citation Graph command failed.",
      { failed: result.failed },
    );
  }
  return result;
}

export function resolveSynthesisWorkbenchGraphLayoutStatus(args: {
  graphHash?: unknown;
  layoutAlgorithm?: unknown;
  layoutStatus?: unknown;
  failure?: SynthesisWorkbenchGraphLayoutFailure;
}): SynthesisUiCacheReadiness {
  const layoutStatus: SynthesisUiCacheReadiness =
    args.layoutStatus === "ready" ||
    args.layoutStatus === "refreshing" ||
    args.layoutStatus === "stale" ||
    args.layoutStatus === "failed"
      ? args.layoutStatus
      : "missing";
  if (layoutStatus === "ready") {
    return "ready";
  }
  if (selectSynthesisWorkbenchGraphLayoutFailure(args)) {
    return "failed";
  }
  return layoutStatus;
}

export function toSynthesisWorkbenchReadState(
  state: SynthesisUiState,
  options?: {
    graphWindowCursor?: string;
    expectedGraphHash?: string;
  },
): SynthesisWorkbenchReadState {
  const omitUndefinedObjectProperties = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(omitUndefinedObjectProperties);
    }
    if (
      !value ||
      typeof value !== "object" ||
      Object.getPrototypeOf(value) !== Object.prototype
    ) {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, omitUndefinedObjectProperties(entry)]),
    );
  };
  return toSynthesisJsonObject(
    omitUndefinedObjectProperties(
      options
        ? {
            ...state,
            graph: {
              ...state.graph,
              ...(options.graphWindowCursor
                ? { windowCursor: options.graphWindowCursor }
                : {}),
              ...(options.expectedGraphHash
                ? { expectedGraphHash: options.expectedGraphHash }
                : {}),
            },
          }
        : state,
    ),
    "$.workbench.state",
  );
}

export function toSynthesisUiSnapshotInput(
  projection: SynthesisWorkbenchProjection,
): SynthesisUiSnapshotInput {
  return projection as unknown as SynthesisUiSnapshotInput;
}

export function toSynthesisWorkbenchPaperDigestReadRequest(
  args: Record<string, unknown>,
): SynthesisWorkbenchPaperDigestReadRequest {
  const topicId = typeof args.topicId === "string" ? args.topicId.trim() : "";
  const paperRefValue = args.paper_ref ?? args.paperRef;
  const paperRef =
    typeof paperRefValue === "string" ? paperRefValue.trim() : "";
  const digestRefValue = args.digest_ref ?? args.digestRef;
  const includeRepresentativeImageValue =
    args.include_representative_image ?? args.includeRepresentativeImage;

  return {
    ...(topicId ? { topicId } : {}),
    ...(paperRef ? { paperRef } : {}),
    ...(digestRefValue !== undefined
      ? {
          digestRef: toSynthesisJsonObject(
            digestRefValue,
            "$.workbench.digestRef",
          ),
        }
      : {}),
    ...(typeof includeRepresentativeImageValue === "boolean"
      ? { includeRepresentativeImage: includeRepresentativeImageValue }
      : {}),
  };
}
