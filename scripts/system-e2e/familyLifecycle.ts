export type FamilyDeclaration = {
  familyId: string;
  owner: string;
  namespace: string[];
  ownedState: string[];
  carryOver?: string[];
};

export type Phase1FamilyId = "SL" | "RH" | "PA" | "PM" | "CG" | "HB";

export const PHASE1_FAMILY_DECLARATIONS: Record<
  Phase1FamilyId,
  FamilyDeclaration
> = {
  SL: {
    familyId: "SL",
    owner: "synthesis-sidecar-runtime-lifecycle",
    namespace: ["system-e2e:sl:"],
    ownedState: [
      "sidecar-process",
      "sidecar-discovery",
      "sidecar-launch-input",
      "sidecar-ready-generation",
    ],
    carryOver: ["sidecar-ready-generation"],
  },
  RH: {
    familyId: "RH",
    owner: "reverse-host-boundary",
    namespace: ["system-e2e:rh:"],
    ownedState: [
      "synthetic-reference-items",
      "reference-refresh-operation",
      "reference-checkpoint",
    ],
    carryOver: [],
  },
  PA: {
    familyId: "PA",
    owner: "provenance-and-canonical-artifact-classification",
    namespace: ["system-e2e:pa:"],
    ownedState: ["historical-topic-source", "malformed-artifact"],
    carryOver: [],
  },
  PM: {
    familyId: "PM",
    owner: "public-maintenance-lifecycle",
    namespace: ["system-e2e:pm:"],
    ownedState: [
      "synthetic-reference-items",
      "maintenance-operation",
      "maintenance-checkpoint",
      "reference-checkpoint",
    ],
    carryOver: ["maintenance-operation"],
  },
  CG: {
    familyId: "CG",
    owner: "citation-graph-application",
    namespace: ["system-e2e:cg:"],
    ownedState: [
      "citation-graph-view",
      "citation-graph-rebuild",
      "graph-basis-items",
    ],
    carryOver: [],
  },
  HB: {
    familyId: "HB",
    owner: "host-bridge-canonical-mutation-authority",
    namespace: ["system-e2e:hb:"],
    ownedState: [
      "synthetic-note",
      "canonical-mutation-operation",
      "host-bridge-owner",
    ],
    carryOver: ["canonical-mutation-operation"],
  },
};

export function resolvePhase1FamilySelection(
  requested?: string,
): Phase1FamilyId[] {
  const available = Object.keys(PHASE1_FAMILY_DECLARATIONS) as Phase1FamilyId[];
  const values = String(requested || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) return available;
  const selected = new Set(values);
  if (values.some((value) => !(value in PHASE1_FAMILY_DECLARATIONS))) {
    throw new Error("family_selection_invalid");
  }
  return available.filter((familyId) => selected.has(familyId));
}

type HealthGateResult = {
  status: "passed" | "failed" | "indeterminate";
  hostResponsive: boolean;
  pluginResponsive: boolean;
  sidecarReady: boolean;
  undeclaredOperations: number;
  managedProcesses: number;
  residualOwnedState: string[];
};

function nonemptyStrings(values: unknown): values is string[] {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.every((value) => typeof value === "string" && value.trim())
  );
}

export function validateFamilyDeclarations(declarations: FamilyDeclaration[]) {
  const ids = new Set<string>();
  for (const declaration of declarations) {
    if (
      !declaration.familyId?.trim() ||
      !declaration.owner?.trim() ||
      !nonemptyStrings(declaration.namespace) ||
      !nonemptyStrings(declaration.ownedState) ||
      ids.has(declaration.familyId)
    ) {
      throw new Error("family_declaration_invalid");
    }
    ids.add(declaration.familyId);
    if (
      (declaration.carryOver || []).some(
        (state) => !declaration.ownedState.includes(state),
      )
    ) {
      throw new Error("family_carry_over_not_owned");
    }
  }
  return declarations;
}

function healthPassed(result: HealthGateResult) {
  return (
    result.status === "passed" &&
    result.hostResponsive &&
    result.pluginResponsive &&
    result.sidecarReady &&
    result.undeclaredOperations === 0 &&
    result.managedProcesses === 0 &&
    result.residualOwnedState.length === 0
  );
}

export async function runFamilyLifecycle(args: {
  declaration: FamilyDeclaration;
  execute: () => void | Promise<void>;
  cleanup: () =>
    | "passed"
    | "failed"
    | "indeterminate"
    | Promise<"passed" | "failed" | "indeterminate">;
  healthGate: () => HealthGateResult | Promise<HealthGateResult>;
}) {
  validateFamilyDeclarations([args.declaration]);
  const transitions = ["family-start", "family-cases"];
  let result: "passed" | "failed" = "passed";
  try {
    await args.execute();
  } catch {
    result = "failed";
  }
  transitions.push("family-cleanup");
  const cleanup = await args.cleanup();
  if (cleanup !== "passed") {
    return {
      result: "failed" as const,
      abort: true,
      abortCode:
        cleanup === "indeterminate"
          ? "family_cleanup_indeterminate"
          : "family_cleanup_failed",
      cleanup,
      health: "indeterminate" as const,
      transitions,
    };
  }
  transitions.push("health-gate");
  const health = await args.healthGate();
  transitions.push("family-end");
  if (!healthPassed(health)) {
    return {
      result: "failed" as const,
      abort: true,
      abortCode:
        health.status === "indeterminate"
          ? "suite_health_indeterminate"
          : "suite_health_failed",
      cleanup,
      health: health.status,
      transitions,
    };
  }
  return {
    result,
    abort: false,
    cleanup,
    health: health.status,
    transitions,
  };
}
