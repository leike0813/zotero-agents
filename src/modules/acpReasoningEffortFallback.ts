import type { BackendInstance } from "../backends/types";
import { resolveAcpAgentFamily } from "./acpAgentFamilyResolver";
import type { AcpConnectionAdapter } from "./acpConnectionAdapter";
import { RequestError, type AcpSessionConfigCategory } from "./acpProtocol";

export type AcpReasoningEffortApplyResult =
  | { kind: "applied" }
  | { kind: "unavailable" }
  | { kind: "fallback"; error: RequestError };

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isKiloNoneInvalidParametersFallback(args: {
  backend: BackendInstance | undefined;
  category: AcpSessionConfigCategory;
  value: string;
  error: unknown;
}): args is {
  backend: BackendInstance;
  category: AcpSessionConfigCategory;
  value: string;
  error: RequestError;
} {
  return (
    !!args.backend &&
    resolveAcpAgentFamily(args.backend) === "kilo" &&
    normalize(args.category) === "thought_level" &&
    normalize(args.value) === "none" &&
    args.error instanceof RequestError &&
    args.error.code === -32602
  );
}

export async function applyAcpReasoningEffortWithFallback(args: {
  adapter: Pick<AcpConnectionAdapter, "setConfigOption">;
  backend?: BackendInstance;
  sessionId: string;
  effortId: string;
}): Promise<AcpReasoningEffortApplyResult> {
  try {
    const applied =
      (await args.adapter.setConfigOption?.({
        sessionId: args.sessionId,
        category: "thought_level",
        value: args.effortId,
      })) === true;
    return applied ? { kind: "applied" } : { kind: "unavailable" };
  } catch (error) {
    const fallbackArgs = {
      backend: args.backend,
      category: "thought_level" as const,
      value: args.effortId,
      error,
    };
    if (isKiloNoneInvalidParametersFallback(fallbackArgs)) {
      return { kind: "fallback", error: fallbackArgs.error };
    }
    throw error;
  }
}
