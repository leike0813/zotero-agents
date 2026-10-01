import type {
  Provider,
  ProviderExecuteArgs,
  ProviderSupportsArgs,
} from "../types";
import type { ProviderExecutionResult } from "../contracts";
import {
  BUILTIN_PI_BACKEND_TYPE,
  BUILTIN_PI_REQUEST_KIND,
} from "../../config/defaults";

/**
 * Durable owner projection consumed by the synchronous Workflow terminal
 * resolution. The Pi Skill Run owner publishes each state change here; the
 * reader is a plain map lookup and never triggers durable work.
 */
export type PiSkillRunProviderProjection = {
  requestId: string;
  status:
    | "queued"
    | "running"
    | "waiting_user"
    | "waiting_permission"
    | "suspended"
    | "recovery_required"
    | "state_unknown"
    | "succeeded"
    | "failed"
    | "canceled";
  error?: string;
  applyState?: "pending" | "claimed" | "succeeded" | "failed" | "skipped";
  applyError?: string;
};

const projections = new Map<string, PiSkillRunProviderProjection>();

/** Publishes one owner state change; `null` removes the projection. */
export function updatePiSkillRunProviderProjection(
  requestId: string,
  projection: PiSkillRunProviderProjection | null,
) {
  const normalized = String(requestId || "").trim();
  if (!normalized) {
    return;
  }
  if (projection) {
    projections.set(normalized, projection);
    return;
  }
  projections.delete(normalized);
}

export function readPiSkillRunProviderProjection(
  requestId: string,
): PiSkillRunProviderProjection | undefined {
  const normalized = String(requestId || "").trim();
  return normalized ? projections.get(normalized) : undefined;
}

export function resetPiSkillRunProviderProjectionsForTests() {
  projections.clear();
}

/** The only owner surface the provider needs: dispatch one Skill Run. */
type PiSkillRunCoordinatorLike = {
  execute(args: ProviderExecuteArgs): Promise<ProviderExecutionResult>;
};

type PiSkillRunModule = {
  getPiSkillRunCoordinator?: () => PiSkillRunCoordinatorLike | null | undefined;
};

const COORDINATOR_UNAVAILABLE_CODE = "pi_skill_run_coordinator_unavailable";

async function resolvePiSkillRunCoordinator(): Promise<PiSkillRunCoordinatorLike | null> {
  const loaded = (await import("../../modules/piSkillRun").catch(
    () => undefined,
  )) as PiSkillRunModule | undefined;
  return loaded?.getPiSkillRunCoordinator?.() ?? null;
}

export class BuiltinPiProvider implements Provider {
  readonly id = BUILTIN_PI_BACKEND_TYPE;

  supports(args: ProviderSupportsArgs) {
    return (
      String(args.backend.type || "").trim() === BUILTIN_PI_BACKEND_TYPE &&
      String(args.requestKind || "").trim() === BUILTIN_PI_REQUEST_KIND
    );
  }

  async execute(args: ProviderExecuteArgs): Promise<ProviderExecutionResult> {
    if (!this.supports(args)) {
      throw new Error(
        "Unsupported request kind/backend for BuiltinPiProvider: requestKind=" +
          args.requestKind +
          ", backendType=" +
          args.backend.type,
      );
    }
    const coordinator = await resolvePiSkillRunCoordinator();
    if (!coordinator) {
      const error = new Error(COORDINATOR_UNAVAILABLE_CODE) as Error & {
        code?: string;
      };
      error.code = COORDINATOR_UNAVAILABLE_CODE;
      throw error;
    }
    return coordinator.execute(args);
  }
}
