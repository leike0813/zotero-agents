import type { WorkflowHostApi } from "./types";

export const WORKFLOW_HOST_API_VERSION = 11;

export type WorkflowHostContractVariant = "interactive" | "non-interactive";

export type WorkflowHostCandidateManifestEntry =
  | "value"
  | "function"
  | WorkflowHostCandidateManifest;

export type WorkflowHostCandidateManifest = Readonly<{
  [member: string]: WorkflowHostCandidateManifestEntry;
}>;

export type WorkflowHostCandidateInspection = {
  ok: boolean;
  missingPaths: string[];
  unexpectedPaths: string[];
  nonFunctionPaths: string[];
  nonObjectPaths: string[];
};

export type WorkflowHostContractFromManifest<
  Manifest extends WorkflowHostCandidateManifest,
> = {
  readonly [Member in keyof Manifest]: Manifest[Member] extends "function"
    ? (...args: never[]) => unknown
    : Manifest[Member] extends "value"
      ? unknown
      : Manifest[Member] extends WorkflowHostCandidateManifest
        ? WorkflowHostContractFromManifest<Manifest[Member]>
        : never;
};

export type WorkflowHostBidirectionalExact<Expected, Candidate> =
  Candidate extends Expected
    ? Expected extends Candidate
      ? Candidate
      : never
    : never;

export function defineWorkflowHostCandidateManifest<
  const Manifest extends WorkflowHostCandidateManifest,
>(manifest: Manifest): Manifest {
  return manifest;
}

function isContractObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function memberPath(prefix: string, member: string): string {
  return prefix ? `${prefix}.${member}` : member;
}

function collectManifestLeafPaths(
  manifest: WorkflowHostCandidateManifest,
  prefix: string,
): string[] {
  const paths: string[] = [];
  for (const [member, entry] of Object.entries(manifest)) {
    const path = memberPath(prefix, member);
    if (entry === "function" || entry === "value") {
      paths.push(path);
    } else {
      paths.push(...collectManifestLeafPaths(entry, path));
    }
  }
  return paths;
}

export function inspectWorkflowHostCandidate(
  candidate: unknown,
  manifest: WorkflowHostCandidateManifest,
): WorkflowHostCandidateInspection {
  const missingPaths: string[] = [];
  const unexpectedPaths: string[] = [];
  const nonFunctionPaths: string[] = [];
  const nonObjectPaths: string[] = [];

  const visit = (
    value: unknown,
    expected: WorkflowHostCandidateManifest,
    prefix: string,
  ): void => {
    if (!isContractObject(value)) {
      if (prefix) nonObjectPaths.push(prefix);
      else missingPaths.push(...collectManifestLeafPaths(expected, prefix));
      return;
    }
    const actualKeys = new Set(Object.keys(value));
    for (const [member, entry] of Object.entries(expected)) {
      const path = memberPath(prefix, member);
      if (!actualKeys.has(member)) {
        missingPaths.push(
          ...(entry === "function" || entry === "value"
            ? [path]
            : collectManifestLeafPaths(entry, path)),
        );
        continue;
      }
      actualKeys.delete(member);
      const memberValue = value[member];
      if (entry === "function") {
        if (typeof memberValue !== "function") nonFunctionPaths.push(path);
      } else if (entry !== "value") {
        if (!isContractObject(memberValue)) nonObjectPaths.push(path);
        else visit(memberValue, entry, path);
      }
    }
    for (const member of actualKeys) {
      unexpectedPaths.push(memberPath(prefix, member));
    }
  };

  visit(candidate, manifest, "");
  missingPaths.sort();
  unexpectedPaths.sort();
  nonFunctionPaths.sort();
  nonObjectPaths.sort();
  return {
    ok:
      missingPaths.length === 0 &&
      unexpectedPaths.length === 0 &&
      nonFunctionPaths.length === 0 &&
      nonObjectPaths.length === 0,
    missingPaths,
    unexpectedPaths,
    nonFunctionPaths,
    nonObjectPaths,
  };
}

function collectCandidateShape(
  candidate: unknown,
  prefix = "",
  output = new Map<string, string>(),
): Map<string, string> {
  if (!isContractObject(candidate)) {
    if (prefix) output.set(prefix, candidate === null ? "null" : typeof candidate);
    return output;
  }
  for (const [member, value] of Object.entries(candidate)) {
    const path = memberPath(prefix, member);
    if (isContractObject(value)) collectCandidateShape(value, path, output);
    else output.set(path, typeof value === "function" ? "function" : "value");
  }
  return output;
}

export function inspectWorkflowHostContractVariants(
  manifest: WorkflowHostCandidateManifest,
  variants: Readonly<Record<WorkflowHostContractVariant, unknown>>,
): {
  ok: boolean;
  variants: Record<WorkflowHostContractVariant, WorkflowHostCandidateInspection>;
  variantShapeMismatchPaths: string[];
} {
  const inspections = {
    interactive: inspectWorkflowHostCandidate(variants.interactive, manifest),
    "non-interactive": inspectWorkflowHostCandidate(
      variants["non-interactive"],
      manifest,
    ),
  };
  const interactiveShape = collectCandidateShape(variants.interactive);
  const nonInteractiveShape = collectCandidateShape(variants["non-interactive"]);
  const paths = new Set([
    ...interactiveShape.keys(),
    ...nonInteractiveShape.keys(),
  ]);
  const variantShapeMismatchPaths = [...paths]
    .filter(
      (path) => interactiveShape.get(path) !== nonInteractiveShape.get(path),
    )
    .sort();
  return {
    ok:
      inspections.interactive.ok &&
      inspections["non-interactive"].ok &&
      variantShapeMismatchPaths.length === 0,
    variants: inspections,
    variantShapeMismatchPaths,
  };
}

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
