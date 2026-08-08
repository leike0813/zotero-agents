import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../packages/synthesis-contracts/src/sidecarSystem";
import {
  SYNTHESIS_PRODUCTION_SURFACES,
  inspectSynthesisProductionBaselineEvidence,
  readSynthesisProductionSurfaceCorpora,
  synthesisProductionSurfaceOperationFingerprint,
} from "./synthesisProductionSurfaceCorpora";

type CapabilityManifest = {
  schema: string;
  canonicalization: string;
  fingerprintSha256: string;
  capabilities: string[];
};

type OperationManifest = {
  schema: string;
  requestCodec: string;
  resultCodec: string;
  requestBytes: number;
  responseBytes: number;
  controlTargetBytes: number;
  deadlineMs: number;
  deadlineOverridesMs: Record<string, number>;
  workDeadlineMs: Record<string, number>;
  receiptQueryCapability: string;
  policyDefaults: OperationPolicy;
  policyOverrides: Record<string, Partial<OperationPolicy>>;
  access: Record<string, string>;
  semanticSuccess?: Record<string, { field: string; values: string[] }>;
};

type OperationPolicy = {
  requestPlane: string;
  resultPlane: string;
  workModel: string;
  receipt: string;
};

const OPERATION_MANIFEST_FIELDS = [
  "schema",
  "requestCodec",
  "resultCodec",
  "requestBytes",
  "responseBytes",
  "controlTargetBytes",
  "deadlineMs",
  "deadlineOverridesMs",
  "workDeadlineMs",
  "receiptQueryCapability",
  "policyDefaults",
  "policyOverrides",
  "access",
  "semanticSuccess",
] as const;
const OPERATION_POLICY_FIELDS = [
  "requestPlane",
  "resultPlane",
  "workModel",
  "receipt",
] as const;

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(
  ROOT,
  "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/capabilities.json",
);
const OPERATIONS_PATH = path.join(
  ROOT,
  "packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json",
);
const PORT_PATH = path.join(
  ROOT,
  "src/modules/synthesisClient/inProcessClient.ts",
);
const RUST_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/production_capabilities.rs",
);
const RUST_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs",
);
const RUST_LEGACY_COMPAT_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_compat.rs",
);
const RUST_TOPIC_WORKBENCH_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs",
);
const RUST_REFERENCE_CITATION_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs",
);
const RUST_TAG_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs",
);
const RUST_CONCEPT_TOPIC_GRAPH_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs",
);
const RUST_ARTIFACT_LIBRARY_DEBUG_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs",
);
const RUST_WEBDAV_MAINTENANCE_DISPATCH_PATH = path.join(
  ROOT,
  "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs",
);
const TOPIC_WORKBENCH_TYPED_CAPABILITIES = [
  "client.listTopics",
  "client.findTopicsByPaperRef",
  "client.readTopicDetail",
  "client.listWorkflowTopicOptions",
  "client.getSynthesisWorkbenchChromeInput",
  "client.getSynthesisWorkbenchSurfaceInput",
  "client.getSynthesisBackgroundJobRows",
  "client.applyTopicSynthesisResult",
  "client.getTopicContext",
  "client.resolveResolver",
  "client.getTopicReport",
  "client.applyLiteratureDigestSidecar",
  "client.deleteTopicArtifact",
  "client.purgeDeletedTopicArtifacts",
  "client.rejectTopicDiscoveryHint",
  "client.restoreTopicDiscoveryHint",
] as const;
const REFERENCE_CITATION_TYPED_SURFACES = new Set([
  "reference-canonical",
  "citation-graph",
]);
const REFERENCE_CITATION_TYPED_EXTENSIONS = [
  "client.consumeRelatedItemsSyncEcho",
] as const;
const ARTIFACT_LIBRARY_DEBUG_TYPED_EXTENSIONS = [
  "client.resolveTopicPaperDigest",
] as const;
function sorted(values: readonly string[]) {
  return [...values].sort();
}

function difference(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value)).sort();
}

function duplicateValues(values: readonly string[]) {
  return [
    ...new Set(
      values.filter((value, index) => values.indexOf(value) !== index),
    ),
  ].sort();
}

function operationPolicy(
  operations: OperationManifest,
  capability: string,
): OperationPolicy {
  return {
    ...operations.policyDefaults,
    ...(operations.policyOverrides?.[capability] || {}),
  };
}

function validOperationPolicy(
  operations: OperationManifest,
  capability: string,
) {
  const override = operations.policyOverrides?.[capability];
  if (
    !override ||
    Object.keys(override).every((field) =>
      OPERATION_POLICY_FIELDS.includes(
        field as (typeof OPERATION_POLICY_FIELDS)[number],
      ),
    )
  ) {
    const policy = operationPolicy(operations, capability);
    return (
      ["control", "transfer"].includes(policy.requestPlane) &&
      ["control", "locator", "delivery"].includes(policy.resultPlane) &&
      ["bounded", "receipt"].includes(policy.workModel) &&
      ["inline", "public-maintenance-operation"].includes(policy.receipt) &&
      (policy.workModel === "receipt") ===
        (policy.receipt === "public-maintenance-operation") &&
      (policy.workModel !== "receipt" ||
        operations.access[capability] === "mutation")
    );
  }
  return false;
}

function validSemanticSuccessRules(operations: OperationManifest) {
  const receiptCapabilities = Object.keys(operations.access).filter(
    (capability) =>
      operationPolicy(operations, capability).receipt ===
      "public-maintenance-operation",
  );
  return (
    receiptCapabilities.every(
      (capability) => capability in (operations.semanticSuccess || {}),
    ) &&
    Object.entries(operations.semanticSuccess || {}).every(
      ([capability, rule]) =>
        capability in operations.access &&
        typeof rule.field === "string" &&
        rule.field.length > 0 &&
        Array.isArray(rule.values) &&
        rule.values.length > 0 &&
        rule.values.every(
          (value) => typeof value === "string" && value.length > 0,
        ),
    )
  );
}

function extractPortCapabilities() {
  const source = fs.readFileSync(PORT_PATH, "utf8");
  const sourceFile = ts.createSourceFile(
    PORT_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === "SynthesisClientPort",
  );
  if (!declaration) {
    return [];
  }
  return declaration.members
    .map((member) =>
      member.name &&
      (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
        ? `client.${member.name.text}`
        : "",
    )
    .filter(Boolean);
}

function extractRustDispatcherCapabilities(source: string) {
  const registrations =
    source.match(/register_production_client_handlers!\((.*?)\n\);/s)?.[1] ||
    "";
  const direct =
    source.match(
      /DIRECT_PRODUCTION_CLIENT_CAPABILITIES:\s*&\[&str\]\s*=\s*&\[(.*?)\];/s,
    )?.[1] || "";
  return [
    ...registrations.matchAll(/\(\s*"(client\.[A-Za-z0-9_]+)"/g),
    ...direct.matchAll(/"(client\.[A-Za-z0-9_]+)"/g),
  ].map((match) => match[1]!);
}

type ProductionCapabilityInspectionOptions = {
  surfaceCorpora?: ReturnType<typeof readSynthesisProductionSurfaceCorpora>;
  readyCapabilities?: string[];
  rustReadyCapabilities?: string[];
  rustDispatcherCapabilities?: string[];
};

export function inspectSynthesisProductionCapabilities(
  options: ProductionCapabilityInspectionOptions = {},
) {
  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8"),
  ) as CapabilityManifest;
  const manifestCapabilities = manifest.capabilities || [];
  const operations = JSON.parse(
    fs.readFileSync(OPERATIONS_PATH, "utf8"),
  ) as OperationManifest;
  const operationCapabilities = Object.keys(operations.access || {});
  const typescriptCapabilities = [
    ...SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  ];
  const portCapabilities = extractPortCapabilities();
  const canonical = `${sorted(manifestCapabilities).join("\n")}\n`;
  const actualFingerprint = createHash("sha256")
    .update(canonical)
    .digest("hex");
  const rustSource = fs.readFileSync(RUST_PATH, "utf8");
  const rustDispatchSource = fs.readFileSync(RUST_DISPATCH_PATH, "utf8");
  const legacyCompatModulePresent = fs.existsSync(
    RUST_LEGACY_COMPAT_DISPATCH_PATH,
  );
  const rustTopicWorkbenchDispatchSource = fs.existsSync(
    RUST_TOPIC_WORKBENCH_DISPATCH_PATH,
  )
    ? fs.readFileSync(RUST_TOPIC_WORKBENCH_DISPATCH_PATH, "utf8")
    : "";
  const rustReferenceCitationDispatchSource = fs.existsSync(
    RUST_REFERENCE_CITATION_DISPATCH_PATH,
  )
    ? fs.readFileSync(RUST_REFERENCE_CITATION_DISPATCH_PATH, "utf8")
    : "";
  const rustTagDispatchSource = fs.existsSync(RUST_TAG_DISPATCH_PATH)
    ? fs.readFileSync(RUST_TAG_DISPATCH_PATH, "utf8")
    : "";
  const rustConceptTopicGraphDispatchSource = fs.existsSync(
    RUST_CONCEPT_TOPIC_GRAPH_DISPATCH_PATH,
  )
    ? fs.readFileSync(RUST_CONCEPT_TOPIC_GRAPH_DISPATCH_PATH, "utf8")
    : "";
  const rustArtifactLibraryDebugDispatchSource = fs.existsSync(
    RUST_ARTIFACT_LIBRARY_DEBUG_DISPATCH_PATH,
  )
    ? fs.readFileSync(RUST_ARTIFACT_LIBRARY_DEBUG_DISPATCH_PATH, "utf8")
    : "";
  const rustWebDavMaintenanceDispatchSource = fs.existsSync(
    RUST_WEBDAV_MAINTENANCE_DISPATCH_PATH,
  )
    ? fs.readFileSync(RUST_WEBDAV_MAINTENANCE_DISPATCH_PATH, "utf8")
    : "";
  const surfaceCorpora =
    options.surfaceCorpora ?? readSynthesisProductionSurfaceCorpora(ROOT);
  const referenceCitationTypedCapabilities = surfaceCorpora
    .filter((surface) => REFERENCE_CITATION_TYPED_SURFACES.has(surface.id))
    .flatMap((surface) =>
      surface.corpus.operations.map((operation) => operation.id),
    )
    .concat(REFERENCE_CITATION_TYPED_EXTENSIONS);
  const tagTypedCapabilities = surfaceCorpora
    .find((surface) => surface.id === "tag")!
    .corpus.operations.map((operation) => operation.id);
  const conceptTopicGraphTypedCapabilities = surfaceCorpora
    .find((surface) => surface.id === "concept-topic-graph")!
    .corpus.operations.map((operation) => operation.id);
  const artifactLibraryDebugTypedCapabilities = surfaceCorpora
    .find((surface) => surface.id === "artifact-library-debug")!
    .corpus.operations.map((operation) => operation.id)
    .concat(ARTIFACT_LIBRARY_DEBUG_TYPED_EXTENSIONS);
  const webDavMaintenanceTypedCapabilities = surfaceCorpora
    .find((surface) => surface.id === "webdav-maintenance")!
    .corpus.operations.map((operation) => operation.id);
  const rustReadyBlock =
    rustSource.match(
      /READY_PRODUCTION_CLIENT_CAPABILITIES:\s*&\[&str\]\s*=\s*&\[(.*?)\];/s,
    )?.[1] || "";
  const parsedRustReadyCapabilities = [
    ...rustReadyBlock.matchAll(/"(client\.[A-Za-z0-9_]+)"/g),
  ].map((match) => match[1]!);
  const rustReadyCapabilities =
    options.rustReadyCapabilities ?? parsedRustReadyCapabilities;
  const readyCapabilities = options.readyCapabilities ?? [
    ...SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
  ];
  const corpusCapabilities = surfaceCorpora.flatMap(({ corpus }) =>
    corpus.operations.map((operation) => operation.id),
  );
  const evidenceGaps = surfaceCorpora.flatMap(({ corpus, evidencePath }) => {
    const source = fs.readFileSync(path.join(ROOT, evidencePath), "utf8");
    return corpus.operations
      .map((operation) => operation.id)
      .filter((capability) => !source.includes(`"${capability}"`));
  });
  const rustDispatcherCapabilities = options.rustDispatcherCapabilities ?? [
    ...extractRustDispatcherCapabilities(rustTopicWorkbenchDispatchSource),
    ...extractRustDispatcherCapabilities(rustReferenceCitationDispatchSource),
    ...extractRustDispatcherCapabilities(rustTagDispatchSource),
    ...extractRustDispatcherCapabilities(rustConceptTopicGraphDispatchSource),
    ...extractRustDispatcherCapabilities(
      rustArtifactLibraryDebugDispatchSource,
    ),
    ...extractRustDispatcherCapabilities(rustWebDavMaintenanceDispatchSource),
  ];
  const rustTopicWorkbenchDispatcherCapabilities =
    extractRustDispatcherCapabilities(rustTopicWorkbenchDispatchSource);
  const rustReferenceCitationDispatcherCapabilities =
    extractRustDispatcherCapabilities(rustReferenceCitationDispatchSource);
  const rustTagDispatcherCapabilities = extractRustDispatcherCapabilities(
    rustTagDispatchSource,
  );
  const rustConceptTopicGraphDispatcherCapabilities =
    extractRustDispatcherCapabilities(rustConceptTopicGraphDispatchSource);
  const rustArtifactLibraryDebugDispatcherCapabilities =
    extractRustDispatcherCapabilities(rustArtifactLibraryDebugDispatchSource);
  const rustWebDavMaintenanceDispatcherCapabilities =
    extractRustDispatcherCapabilities(rustWebDavMaintenanceDispatchSource);
  const dispatcherCapabilities = [...new Set(rustDispatcherCapabilities)];

  return {
    capabilityCount: manifestCapabilities.length,
    operationCount: operationCapabilities.length,
    fingerprint: actualFingerprint,
    errors: {
      manifestIdentity:
        manifest.schema === "synthesis-production-client-capabilities.v1" &&
        manifest.canonicalization === "sorted-newline-terminated"
          ? []
          : ["invalid manifest identity"],
      duplicates: duplicateValues(manifestCapabilities),
      missingFromManifest: difference(portCapabilities, manifestCapabilities),
      unknownInManifest: difference(manifestCapabilities, portCapabilities),
      missingFromTypescript: difference(
        manifestCapabilities,
        typescriptCapabilities,
      ),
      unknownInTypescript: difference(
        typescriptCapabilities,
        manifestCapabilities,
      ),
      typescriptDuplicates: duplicateValues(typescriptCapabilities),
      fingerprint:
        actualFingerprint === manifest.fingerprintSha256 &&
        actualFingerprint ===
          SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT
          ? []
          : ["TypeScript or manifest fingerprint mismatch"],
      rustBinding:
        rustSource.includes(
          `PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT: &str =\n    "${actualFingerprint}"`,
        ) &&
        rustSource.includes("synthesis-production-client-v1/capabilities.json")
          ? []
          : ["Rust production capability binding mismatch"],
      readyNotDeclared: difference(readyCapabilities, manifestCapabilities),
      readyRustBinding: [
        ...difference(readyCapabilities, rustReadyCapabilities),
        ...difference(rustReadyCapabilities, readyCapabilities),
      ],
      readyDuplicates: duplicateValues(readyCapabilities),
      rustReadyDuplicates: duplicateValues(rustReadyCapabilities),
      readyDispatcherBinding:
        rustDispatchSource.includes(
          "production_client_operations\n        .get(capability)",
        ) &&
        rustDispatchSource.includes(
          "dispatch_typed_client(&state.applications, capability",
        )
          ? []
          : ["Rust dispatcher is not bound to the closed operation registry"],
      legacyCompatModule: legacyCompatModulePresent
        ? ["legacy Rust production compatibility dispatcher is retained"]
        : [],
      dispatcherMissing: difference(
        manifestCapabilities,
        dispatcherCapabilities,
      ),
      dispatcherUnknown: difference(
        dispatcherCapabilities,
        manifestCapabilities,
      ),
      dispatcherDuplicates: duplicateValues(rustDispatcherCapabilities),
      typedTopicWorkbenchOwnership: [
        ...difference(
          TOPIC_WORKBENCH_TYPED_CAPABILITIES,
          rustTopicWorkbenchDispatcherCapabilities,
        ).map((capability) => `typed owner missing: ${capability}`),
        ...difference(
          rustTopicWorkbenchDispatcherCapabilities,
          TOPIC_WORKBENCH_TYPED_CAPABILITIES,
        ).map((capability) => `typed owner unknown: ${capability}`),
      ],
      typedReferenceCitationOwnership: [
        ...difference(
          referenceCitationTypedCapabilities,
          rustReferenceCitationDispatcherCapabilities,
        ).map((capability) => `typed owner missing: ${capability}`),
        ...difference(
          rustReferenceCitationDispatcherCapabilities,
          referenceCitationTypedCapabilities,
        ).map((capability) => `typed owner unknown: ${capability}`),
      ],
      typedTagOwnership: [
        ...difference(tagTypedCapabilities, rustTagDispatcherCapabilities).map(
          (capability) => `typed owner missing: ${capability}`,
        ),
        ...difference(rustTagDispatcherCapabilities, tagTypedCapabilities).map(
          (capability) => `typed owner unknown: ${capability}`,
        ),
      ],
      typedConceptTopicGraphOwnership: [
        ...difference(
          conceptTopicGraphTypedCapabilities,
          rustConceptTopicGraphDispatcherCapabilities,
        ).map((capability) => `typed owner missing: ${capability}`),
        ...difference(
          rustConceptTopicGraphDispatcherCapabilities,
          conceptTopicGraphTypedCapabilities,
        ).map((capability) => `typed owner unknown: ${capability}`),
      ],
      typedArtifactLibraryDebugOwnership: [
        ...difference(
          artifactLibraryDebugTypedCapabilities,
          rustArtifactLibraryDebugDispatcherCapabilities,
        ).map((capability) => `typed owner missing: ${capability}`),
        ...difference(
          rustArtifactLibraryDebugDispatcherCapabilities,
          artifactLibraryDebugTypedCapabilities,
        ).map((capability) => `typed owner unknown: ${capability}`),
      ],
      typedWebDavMaintenanceOwnership: [
        ...difference(
          webDavMaintenanceTypedCapabilities,
          rustWebDavMaintenanceDispatcherCapabilities,
        ).map((capability) => `typed owner missing: ${capability}`),
        ...difference(
          rustWebDavMaintenanceDispatcherCapabilities,
          webDavMaintenanceTypedCapabilities,
        ).map((capability) => `typed owner unknown: ${capability}`),
      ],
      surfaceCorpusIdentity: surfaceCorpora.flatMap(
        ({ id, schema, operations, operationFingerprint, corpus }) =>
          corpus.schema === schema &&
          corpus.operations.length === operations &&
          synthesisProductionSurfaceOperationFingerprint(corpus.operations) ===
            operationFingerprint
            ? []
            : [`invalid surface corpus: ${id}`],
      ),
      surfaceCorpusSet: [
        ...difference(
          SYNTHESIS_PRODUCTION_SURFACES.map((surface) => surface.id),
          surfaceCorpora.map((surface) => surface.id),
        ),
        ...difference(
          surfaceCorpora.map((surface) => surface.id),
          SYNTHESIS_PRODUCTION_SURFACES.map((surface) => surface.id),
        ),
      ],
      surfaceCorpusDuplicates: duplicateValues(corpusCapabilities),
      surfaceBaselineEvidence: inspectSynthesisProductionBaselineEvidence(
        surfaceCorpora,
        ROOT,
      ),
      missingFromSurfaceCorpora: difference(
        manifestCapabilities,
        corpusCapabilities,
      ),
      unknownInSurfaceCorpora: difference(
        corpusCapabilities,
        manifestCapabilities,
      ),
      missingBoundaryCases: surfaceCorpora.flatMap(({ corpus }) =>
        corpus.operations
          .filter((operation) =>
            ["invalid_args", "oversized", "expired"].some(
              (name) => !operation.cases.includes(name),
            ),
          )
          .map((operation) => operation.id),
      ),
      missingMutationReopen: surfaceCorpora.flatMap(({ corpus }) =>
        corpus.operations
          .filter(
            (operation) =>
              operation.access === "mutation" &&
              !operation.cases.includes("reopen"),
          )
          .map((operation) => operation.id),
      ),
      missingSurfaceEvidence: evidenceGaps,
      operationMetadata:
        sorted(Object.keys(operations)).join("\n") ===
          sorted(OPERATION_MANIFEST_FIELDS).join("\n") &&
        operations.schema === "synthesis-production-client-operations.v2" &&
        operations.requestCodec === "synthesis-client-args.v1" &&
        operations.resultCodec === "synthesis-client-result.v1" &&
        Number.isSafeInteger(operations.requestBytes) &&
        operations.requestBytes > 0 &&
        operations.requestBytes <= 8 * 1024 * 1024 &&
        Number.isSafeInteger(operations.responseBytes) &&
        operations.responseBytes > 0 &&
        operations.responseBytes <= 8 * 1024 * 1024 &&
        Number.isSafeInteger(operations.controlTargetBytes) &&
        operations.controlTargetBytes > 0 &&
        operations.controlTargetBytes <= operations.requestBytes &&
        operations.controlTargetBytes <= operations.responseBytes &&
        Number.isSafeInteger(operations.deadlineMs) &&
        operations.deadlineMs >= 100 &&
        operations.deadlineMs <= 60_000 &&
        Object.entries(operations.deadlineOverridesMs || {}).every(
          ([capability, deadline]) =>
            capability in operations.access &&
            Number.isSafeInteger(deadline) &&
            deadline >= 100 &&
            deadline <= 60_000,
        ) &&
        Object.entries(operations.workDeadlineMs || {}).every(
          ([capability, deadline]) =>
            capability in operations.access &&
            operationPolicy(operations, capability).receipt ===
              "public-maintenance-operation" &&
            Number.isSafeInteger(deadline) &&
            deadline >= 100 &&
            deadline <= 30 * 60_000,
        ) &&
        Object.keys(operations.access).every(
          (capability) =>
            (operationPolicy(operations, capability).receipt ===
              "public-maintenance-operation") ===
            capability in (operations.workDeadlineMs || {}),
        ) &&
        operations.receiptQueryCapability ===
          "client.getPublicMaintenanceOperation" &&
        operations.policyDefaults?.requestPlane === "control" &&
        operations.policyDefaults?.resultPlane === "control" &&
        operations.policyDefaults?.workModel === "bounded" &&
        operations.policyDefaults?.receipt === "inline" &&
        sorted(Object.keys(operations.policyDefaults || {})).join("\n") ===
          sorted(OPERATION_POLICY_FIELDS).join("\n") &&
        Object.keys(operations.policyOverrides || {}).every(
          (capability) => capability in operations.access,
        ) &&
        difference(manifestCapabilities, operationCapabilities).length === 0 &&
        difference(operationCapabilities, manifestCapabilities).length === 0 &&
        operationCapabilities.every((capability) =>
          ["read", "mutation"].includes(operations.access[capability]!),
        ) &&
        operationCapabilities.every((capability) =>
          validOperationPolicy(operations, capability),
        ) &&
        validSemanticSuccessRules(operations)
          ? []
          : ["invalid production operation metadata"],
    },
  };
}

function runCli() {
  const report = inspectSynthesisProductionCapabilities();
  const ok = Object.values(report.errors).every(
    (values) => values.length === 0,
  );
  process.stdout.write(`${JSON.stringify({ ok, ...report }, null, 2)}\n`);
  if (!ok) {
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  runCli();
}
