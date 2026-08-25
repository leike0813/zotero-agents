import type { WorkflowHostApi } from "./types";

export const WORKFLOW_HOST_API_VERSION = 11;

export type WorkflowHostContractVariant = "interactive" | "non-interactive";

type WorkflowHostCapabilityIdentity = Exclude<keyof WorkflowHostApi, "version">;

const WORKFLOW_HOST_CAPABILITY_IDENTITIES = [
  "addon",
  "items",
  "context",
  "library",
  "mutations",
  "metadata",
  "researchBundles",
  "prefs",
  "parents",
  "notes",
  "images",
  "attachments",
  "tags",
  "statusTags",
  "collections",
  "command",
  "editor",
  "notifications",
  "logging",
  "file",
  "archive",
  "resources",
  "synthesis",
] as const satisfies readonly WorkflowHostCapabilityIdentity[];

type DeclaredWorkflowHostCapability =
  (typeof WORKFLOW_HOST_CAPABILITY_IDENTITIES)[number];

export type WorkflowHostCapabilitySummary = Record<
  DeclaredWorkflowHostCapability,
  boolean
> & {
  saveFile: boolean;
};

export type WorkflowHostContractConformance = {
  ok: boolean;
  missingCapabilities: DeclaredWorkflowHostCapability[];
  unexpectedCapabilities: string[];
  versionMismatch: {
    expected: number;
    actual: number;
  } | null;
};

export function resolveWorkflowHostContractVersion(args: {
  explicitVersion?: unknown;
  hostApi?: { version?: unknown } | null;
  currentProjection: boolean;
}): number {
  if (
    typeof args.explicitVersion === "number" &&
    Number.isFinite(args.explicitVersion)
  ) {
    return args.explicitVersion;
  }
  if (
    typeof args.hostApi?.version === "number" &&
    Number.isFinite(args.hostApi.version)
  ) {
    return args.hostApi.version;
  }
  return args.currentProjection ? WORKFLOW_HOST_API_VERSION : 0;
}

export function summarizeWorkflowHostApiCapabilities(
  hostApi?: WorkflowHostApi | null,
): WorkflowHostCapabilitySummary {
  const hostRecord = (hostApi || {}) as Record<string, unknown>;
  const summary = {} as Record<DeclaredWorkflowHostCapability, boolean>;
  for (const capability of WORKFLOW_HOST_CAPABILITY_IDENTITIES) {
    summary[capability] = Boolean(hostRecord[capability]);
  }
  return {
    ...summary,
    saveFile: typeof hostApi?.file?.pickSaveFile === "function",
  };
}

export function inspectWorkflowHostContract(
  hostApi: WorkflowHostApi,
  variant: WorkflowHostContractVariant,
): {
  summary: WorkflowHostCapabilitySummary;
  conformance: WorkflowHostContractConformance;
} {
  const summary = summarizeWorkflowHostApiCapabilities(hostApi);
  const missingCapabilities = WORKFLOW_HOST_CAPABILITY_IDENTITIES.filter(
    (capability) =>
      !summary[capability] &&
      (capability !== "resources" || variant === "non-interactive"),
  );
  const declaredKeys = new Set<string>([
    "version",
    ...WORKFLOW_HOST_CAPABILITY_IDENTITIES,
  ]);
  const unexpectedCapabilities = Object.keys(hostApi)
    .filter((key) => !declaredKeys.has(key))
    .sort();
  const actualVersion =
    typeof hostApi.version === "number" && Number.isFinite(hostApi.version)
      ? hostApi.version
      : 0;
  const versionMismatch =
    actualVersion === WORKFLOW_HOST_API_VERSION
      ? null
      : {
          expected: WORKFLOW_HOST_API_VERSION,
          actual: actualVersion,
        };
  return {
    summary,
    conformance: {
      ok:
        missingCapabilities.length === 0 &&
        unexpectedCapabilities.length === 0 &&
        versionMismatch === null,
      missingCapabilities,
      unexpectedCapabilities,
      versionMismatch,
    },
  };
}
