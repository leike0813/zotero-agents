import type { WorkflowHostApi, WorkflowHostApiV12 } from "./types";

export type WorkflowHostContractVariant = "interactive" | "non-interactive";

export type WorkflowHostCandidateManifestEntry =
  | "value"
  | "function"
  | readonly ["value", unknown]
  | readonly ["oneOf", ...unknown[]]
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
  invalidValuePaths: string[];
};

export type WorkflowHostContractFromManifest<
  Manifest extends WorkflowHostCandidateManifest,
> = {
  readonly [Member in keyof Manifest]: Manifest[Member] extends "function"
    ? (...args: never[]) => unknown
    : Manifest[Member] extends readonly ["value", infer Value]
      ? Value
      : Manifest[Member] extends readonly ["oneOf", ...infer Values]
        ? Values[number]
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

export const WORKFLOW_HOST_API_MANIFEST = defineWorkflowHostCandidateManifest({
  version: ["value", 12],
  interactionMode: ["oneOf", "interactive", "non_interactive"],
  addon: { getConfig: "function" },
  environment: { getInfo: "function" },
  context: {
    getCurrentView: "function",
    getSelectedItems: "function",
  },
  navigation: {
    openItem: "function",
    openNote: "function",
    openCollection: "function",
    openSelection: "function",
  },
  library: {
    listItems: "function",
    traverseItems: "function",
    withItemSnapshot: "function",
    listCollections: "function",
    listSavedSearches: "function",
    getItemDetail: "function",
    getItemNotes: "function",
    getNoteDetail: "function",
    listNotePayloads: "function",
    getNotePayload: "function",
    getItemAttachments: "function",
    listAnnotations: "function",
    exportPortableItems: "function",
  },
  metadata: { translateIdentifier: "function" },
  mutations: { preview: "function", execute: "function" },
  notes: {
    create: "function",
    updateContent: "function",
    remove: "function",
    upsertPayload: "function",
  },
  images: { prepareForNoteEmbedding: "function" },
  attachments: {
    create: "function",
    updateMetadata: "function",
    replaceFile: "function",
    move: "function",
    remove: "function",
  },
  bibliography: { listFormats: "function", render: "function" },
  researchBundles: {
    materializePapers: "function",
    importPapers: "function",
  },
  statusTags: { getPolicy: "function", transition: "function" },
  file: {
    readText: "function",
    writeText: "function",
    readBytes: "function",
    writeBytes: "function",
    copy: "function",
    exists: "function",
    makeDirectory: "function",
    materializeWorkflowInputFile: "function",
    getTempDirectoryPath: "function",
    pickDirectory: "function",
    pickFile: "function",
    pickSaveFile: "function",
    pickFiles: "function",
    stat: "function",
    list: "function",
    move: "function",
    remove: "function",
  },
  archive: {
    measureEntries: "function",
    writeZipAtomic: "function",
    withExtractedZip: "function",
  },
  resources: {
    getInput: "function",
    getInputs: "function",
    get: "function",
    materializeFile: "function",
    allocateOutput: "function",
    publishOutput: "function",
    listOutputs: "function",
  },
  clipboard: {
    readText: "function",
    writeText: "function",
    hasText: "function",
    clear: "function",
  },
  editor: { openSession: "function" },
  notifications: { toast: "function" },
  logging: { appendRuntimeLog: "function" },
  synthesis: {
    workflowApply: {
      applyLiteratureDigest: "function",
      applyTopicPlan: "function",
      applyTopicSynthesisResult: "function",
    },
    topics: { getReport: "function" },
    artifacts: { readPaperArtifacts: "function" },
    tags: {
      loadVocabulary: "function",
      saveVocabulary: "function",
      exportVocabularyForRegulator: "function",
      listStagedSuggestions: "function",
      stageSuggestions: "function",
      promoteStagedSuggestions: "function",
      discardStagedSuggestions: "function",
      withAuditRun: "function",
      acknowledgeRegulation: "function",
    },
  },
} as const);

export const WORKFLOW_HOST_API_VERSION = WORKFLOW_HOST_API_MANIFEST.version[1];

type WorkflowHostManifestOf<Contract> = {
  readonly [Member in keyof Contract]: Member extends "version"
    ? readonly ["value", Contract[Member]]
    : Member extends "interactionMode"
      ? readonly ["oneOf", "interactive", "non_interactive"]
      : Contract[Member] extends (...args: infer _Args) => infer _Result
        ? "function"
        : Contract[Member] extends object
          ? WorkflowHostManifestOf<Contract[Member]>
          : never;
};

type WorkflowHostTypesEqual<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() =>
    Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() =>
        Value extends Left ? 1 : 2
      ? true
      : false
    : false;
type AssertWorkflowHostType<Condition extends true> = Condition;
type _WorkflowHostManifestMatchesApi = AssertWorkflowHostType<
  WorkflowHostTypesEqual<
    WorkflowHostManifestOf<WorkflowHostApiV12>,
    typeof WORKFLOW_HOST_API_MANIFEST
  >
>;

function isManifestValueEntry(
  entry: WorkflowHostCandidateManifestEntry,
): entry is readonly ["value", unknown] | readonly ["oneOf", ...unknown[]] {
  return Array.isArray(entry);
}

function manifestValueMatches(
  value: unknown,
  entry: readonly ["value", unknown] | readonly ["oneOf", ...unknown[]],
) {
  return entry[0] === "value"
    ? Object.is(value, entry[1])
    : entry.slice(1).some((candidate) => Object.is(value, candidate));
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
    if (entry === "function" || entry === "value" || isManifestValueEntry(entry)) {
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
  const invalidValuePaths: string[] = [];

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
          ...(entry === "function" || entry === "value" || isManifestValueEntry(entry)
            ? [path]
            : collectManifestLeafPaths(entry, path)),
        );
        continue;
      }
      actualKeys.delete(member);
      const memberValue = value[member];
      if (entry === "function") {
        if (typeof memberValue !== "function") nonFunctionPaths.push(path);
      } else if (isManifestValueEntry(entry)) {
        if (!manifestValueMatches(memberValue, entry)) invalidValuePaths.push(path);
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
  invalidValuePaths.sort();
  return {
    ok:
      missingPaths.length === 0 &&
      unexpectedPaths.length === 0 &&
      nonFunctionPaths.length === 0 &&
      nonObjectPaths.length === 0 &&
      invalidValuePaths.length === 0,
    missingPaths,
    unexpectedPaths,
    nonFunctionPaths,
    nonObjectPaths,
    invalidValuePaths,
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

type DeclaredWorkflowHostCapability = Exclude<
  keyof typeof WORKFLOW_HOST_API_MANIFEST,
  "version" | "interactionMode"
>;

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
  for (const capability of Object.keys(
    WORKFLOW_HOST_API_MANIFEST,
  ) as Array<keyof typeof WORKFLOW_HOST_API_MANIFEST>) {
    if (capability === "version" || capability === "interactionMode") continue;
    summary[capability] = Boolean(hostRecord[capability]);
  }
  return {
    ...summary,
    saveFile: typeof hostApi?.file?.pickSaveFile === "function",
  };
}

export function inspectWorkflowHostContract(
  hostApi: WorkflowHostApi,
  _variant: WorkflowHostContractVariant,
): {
  summary: WorkflowHostCapabilitySummary;
  conformance: WorkflowHostContractConformance;
} {
  const summary = summarizeWorkflowHostApiCapabilities(hostApi);
  const inspection = inspectWorkflowHostCandidate(
    hostApi,
    WORKFLOW_HOST_API_MANIFEST,
  );
  const missingCapabilities = [
    ...new Set(
      inspection.missingPaths
        .map((path) => path.split(".")[0])
        .filter(
          (capability): capability is DeclaredWorkflowHostCapability =>
            capability !== "version" && capability !== "interactionMode",
        ),
    ),
  ].sort();
  const unexpectedCapabilities = [
    ...new Set(inspection.unexpectedPaths.map((path) => path.split(".")[0])),
  ].sort();
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
        inspection.ok &&
        versionMismatch === null,
      missingCapabilities,
      unexpectedCapabilities,
      versionMismatch,
    },
  };
}
