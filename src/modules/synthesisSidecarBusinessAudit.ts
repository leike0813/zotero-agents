import productionOperations from "../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json";
import type { SynthesisSidecarProductionClientCapability } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { appendRuntimeLog } from "./runtimeLogManager";

type Manifest = {
  access: Record<
    SynthesisSidecarProductionClientCapability,
    "read" | "mutation"
  >;
  semanticSuccess?: Partial<
    Record<
      SynthesisSidecarProductionClientCapability,
      { field: string; values: string[] }
    >
  >;
};

export type SynthesisSidecarBusinessOutcome =
  | "started"
  | "succeeded"
  | "failed";

export type SynthesisSidecarBusinessAuditDetails = {
  operation: SynthesisSidecarProductionClientCapability;
  trigger: "user" | "workflow" | "startup" | "periodic" | "internal";
  stage: "start" | "terminal";
  outcome: SynthesisSidecarBusinessOutcome;
  durationMs?: number;
  classification?:
    | "canceled"
    | "timeout"
    | "unavailable"
    | "conflict"
    | "invalid"
    | "internal";
  semanticStatus?: string;
};

const manifest = productionOperations as Manifest;

function stableCode(error: unknown) {
  if (!error || typeof error !== "object") return "internal" as const;
  const value = error as { code?: unknown };
  switch (value.code) {
    case "request_canceled":
    case "worker_canceled":
      return "canceled" as const;
    case "request_timeout":
    case "operation_timeout":
    case "worker_timeout":
    case "timeout":
      return "timeout" as const;
    case "basis_mismatch":
    case "conflict":
      return "conflict" as const;
    case "invalid_request":
    case "response_invalid":
      return "invalid" as const;
    case "service_unavailable":
    case "worker_unavailable":
    case "unavailable":
      return "unavailable" as const;
    default:
      return "internal" as const;
  }
}

function semanticTerminal(
  capability: SynthesisSidecarProductionClientCapability,
  result: unknown,
) {
  const rule = manifest.semanticSuccess?.[capability];
  if (!rule || !result || typeof result !== "object" || Array.isArray(result)) {
    return { succeeded: true } as const;
  }
  const candidate = (result as Record<string, unknown>)[rule.field];
  if (typeof candidate !== "string") return { succeeded: true } as const;
  return {
    succeeded: rule.values.includes(candidate),
    semanticStatus: candidate,
  };
}

function write(details: SynthesisSidecarBusinessAuditDetails) {
  appendRuntimeLog({
    level: details.outcome === "failed" ? "error" : "info",
    scope: "system",
    component: "synthesis-sidecar-business",
    operation: details.operation,
    phase: details.stage,
    stage: details.outcome,
    message: `Synthesis operation ${details.outcome}`,
    details,
  });
}

export function beginSynthesisSidecarBusinessAudit(args: {
  operation: SynthesisSidecarProductionClientCapability;
  trigger?: SynthesisSidecarBusinessAuditDetails["trigger"];
  now?: () => number;
}) {
  const now = args.now ?? Date.now;
  const startedAt = now();
  const access = manifest.access[args.operation];
  const trigger = args.trigger ?? "user";
  let terminal = false;
  if (access === "mutation") {
    write({
      operation: args.operation,
      trigger,
      stage: "start",
      outcome: "started",
    });
  }
  const finish = (
    outcome: "succeeded" | "failed",
    extra: Partial<SynthesisSidecarBusinessAuditDetails> = {},
  ) => {
    if (terminal) return;
    terminal = true;
    if (access === "read" && outcome === "succeeded") return;
    write({
      operation: args.operation,
      trigger,
      stage: "terminal",
      outcome,
      durationMs: Math.max(0, now() - startedAt),
      ...extra,
    });
  };
  return {
    succeeded(result: unknown) {
      const semantic = semanticTerminal(args.operation, result);
      finish(semantic.succeeded ? "succeeded" : "failed", {
        ...(semantic.semanticStatus
          ? { semanticStatus: semantic.semanticStatus }
          : {}),
        ...(semantic.succeeded ? {} : { classification: "conflict" }),
      });
      return semantic;
    },
    failed(error: unknown) {
      finish("failed", { classification: stableCode(error) });
    },
  };
}
