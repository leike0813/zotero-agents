import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import ts from "typescript";
import {
  inspectSynthesisProtocolStructureCoverage,
  type StructureCoverageAxis,
  type StructureCoverageInput,
  type StructureObligation,
} from "./synthesisProtocolStructureCoverage";
import {
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src/canonicalJson.js";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src/common.js";
import {
  rebuildSynthesisProtocolDto,
  rebuildSynthesisProtocolCapabilityDto,
} from "../../packages/synthesis-contracts/src/protocolSchema.js";
import { rebuildSynthesisSidecarObservationEvent } from "../../packages/synthesis-contracts/src/sidecarObservability.js";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
} from "../../packages/synthesis-contracts/src/sidecarSystem.js";
import {
  SYNTHESIS_REVERSE_HOST_CAPABILITIES,
  rebuildSynthesisReverseHostPayload,
  type SynthesisReverseHostCapability,
} from "../../packages/synthesis-contracts/src/sidecarProduction.js";
import {
  validateSourceReferenceArtifact,
  validateCitationAnalysisArtifact,
} from "../../packages/synthesis-contracts/src/sourceReferenceArtifact.js";
import { validateLiteratureScoreArtifact } from "../../packages/synthesis-contracts/src/literatureArtifacts.js";
import {
  readSynthesisProtocolExecutionEvidence,
  readSynthesisProtocolObservations,
  appendSynthesisProtocolExecutionEvidence,
  synthesisProtocolExecutionIdentity,
  type SynthesisProtocolExecutionEvidence,
} from "./synthesisProtocolExecutionEvidence";
const PROTOCOL_CONTRACT_ROOT = path.resolve(
  import.meta.dirname,
  "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1",
);
const CANONICAL_ARTIFACT_CONTRACT_ROOT = path.resolve(
  import.meta.dirname,
  "../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1",
);
const EXTERNAL_SCHEMA_FILES = new Map([
  [
    "https://zotero-agents.local/canonical-literature-artifacts/v1/literature-score-artifact.schema.json",
    path.join(
      CANONICAL_ARTIFACT_CONTRACT_ROOT,
      "schemas/literature-score-artifact.schema.json",
    ),
  ],
  [
    "https://zotero-agents.local/canonical-literature-artifacts/v1/source-reference-artifact.schema.json",
    path.join(
      CANONICAL_ARTIFACT_CONTRACT_ROOT,
      "schemas/source-reference-artifact.schema.json",
    ),
  ],
  [
    "https://zotero-agents.local/canonical-literature-artifacts/v1/citation-analysis-artifact.schema.json",
    path.join(
      CANONICAL_ARTIFACT_CONTRACT_ROOT,
      "schemas/citation-analysis-artifact.schema.json",
    ),
  ],
]);
const WORKER_PROTOCOL_SOURCE = path.resolve(
  import.meta.dirname,
  "../../rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs",
);
const SIDECAR_OBSERVATION_CORPUS = path.resolve(
  import.meta.dirname,
  "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-observability-v2/corpus.json",
);

type JsonObject = Record<string, unknown>;

type ProtocolMapping = {
  capability: string;
  requestSchemaRef: string;
  resultSchemaRef: string;
  errorSchemaRef: string;
};

type WorkerMapping = {
  operation: string;
  runHeaderSchemaRef: string;
  inputSectionSchemaRef: string;
  outputHeaderSchemaRef: string;
  outputSectionSchemaRef: string;
  errorSchemaRef: string;
};

type ProtocolRegistry = {
  schema: string;
  jsonSchemaDialect: string;
  expected: {
    crossProcessCapabilities: number;
    deterministicWorkerOperations: number;
  };
  corpora: string[];
  documents: Array<{ name: string; schemaRef: string }>;
  opaqueLeaves: Array<{
    schemaRef: string;
    owner: string;
    schemaId: string;
    schemaVersion: string;
    codec: string;
    maxBytes: number;
    maxDepth: number;
    maxNodes: number;
    allowedSchemaFiles: string[];
  }>;
  capabilities: ProtocolMapping[];
  workers: WorkerMapping[];
};

type ProtocolCorpusCase = {
  id: string;
  schemaRef: string;
  valid: boolean;
  admitted?: boolean;
  value?: unknown;
  absent?: true;
};

type ResolvedProtocolSchema = {
  canonicalRef: string;
  schema: JsonObject;
  node: unknown;
  relativePath: string;
};

export type SynthesisCrossLanguageContractCheck = {
  ok: boolean;
  contractSetVersion: string;
  schemaCount: number;
  definitionCount: number;
  positiveCaseCount: number;
  negativeCaseCount: number;
  protocolCapabilityCount: number;
  workerOperationCount: number;
  unauthorizedGenericEscapeCount: number;
  protocolPositiveCaseCount: number;
  protocolNegativeCaseCount: number;
  fingerprint: string;
  errors: string[];
  coverage: ReturnType<typeof inspectSynthesisProtocolCoverage>;
  structureExecution: {
    truncated: boolean;
    violations: string[];
    executedCases: number;
    verificationBudget: {
      limit: number;
      attempts: number;
      exhausted: string[];
    };
    nativeObservations: {
      samples: number;
      covered: number;
      truncated: boolean;
      exhausted: string[];
    };
  };
};

type CoverageAxis = { total: number; covered: number; uncovered: string[] };
type CoverageRegistry = {
  capabilities: ProtocolMapping[];
  workers: WorkerMapping[];
};

function protocolMessageSlots(registry: CoverageRegistry) {
  const reverse = new Set<string>(SYNTHESIS_REVERSE_HOST_CAPABILITIES);
  return [
    ...registry.capabilities.flatMap((entry) =>
      (["request", "result", "error"] as const).map((part) => {
        const receiver =
          reverse.has(entry.capability) === (part === "request")
            ? ("typescript" as const)
            : ("rust" as const);
        return {
          id: `${entry.capability}:${part}`,
          ref: entry[`${part}SchemaRef`],
          capability: entry.capability,
          operation: undefined,
          part,
          receiver,
          producer:
            receiver === "typescript"
              ? ("rust" as const)
              : ("typescript" as const),
        };
      }),
    ),
    ...registry.workers.flatMap((entry) =>
      (
        [
          "runHeader",
          "inputSection",
          "outputHeader",
          "outputSection",
          "error",
        ] as const
      ).map((part) => {
        const receiver =
          part === "runHeader" || part === "inputSection"
            ? ("rust" as const)
            : ("typescript" as const);
        return {
          id: `${entry.operation}:${part}`,
          ref: entry[`${part}SchemaRef`],
          capability: undefined,
          operation: entry.operation,
          part,
          receiver,
          producer:
            receiver === "typescript"
              ? ("rust" as const)
              : ("typescript" as const),
        };
      }),
    ),
  ];
}

export function synthesisWorkflowProducerIds(
  workflowsRoot = path.resolve(import.meta.dirname, "../../workflows_builtin"),
) {
  const usesSynthesis = (
    file: string,
    entry: string,
    visited = new Set<string>(),
  ): boolean => {
    const identity = `${file}#${entry}`;
    if (visited.has(identity)) return false;
    visited.add(identity);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    const declarations = new Map<string, ts.Node>();
    const imports = new Map<string, { file: string; name: string }>();
    for (const statement of source.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name)
        declarations.set(statement.name.text, statement);
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name))
            declarations.set(declaration.name.text, declaration);
        }
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text.startsWith(".")
      ) {
        const dependency = path.resolve(
          path.dirname(file),
          statement.moduleSpecifier.text,
        );
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings))
          for (const binding of bindings.elements)
            imports.set(binding.name.text, {
              file: dependency,
              name: binding.propertyName?.text || binding.name.text,
            });
        if (bindings && ts.isNamespaceImport(bindings))
          imports.set(bindings.name.text, { file: dependency, name: "*" });
      }
      if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        for (const binding of statement.exportClause.elements)
          declarations.set(
            binding.name.text,
            binding.propertyName || binding.name,
          );
      }
    }
    const names = new Set<string>();
    const visit = (node: ts.Node): boolean => {
      if (ts.isPropertyAccessExpression(node) && node.name.text === "synthesis")
        return true;
      if (
        ts.isElementAccessExpression(node) &&
        node.argumentExpression &&
        ts.isStringLiteral(node.argumentExpression) &&
        node.argumentExpression.text === "synthesis"
      )
        return true;
      if (ts.isIdentifier(node) && !names.has(node.text)) {
        names.add(node.text);
        const imported = imports.get(node.text);
        if (imported && usesSynthesis(imported.file, imported.name, visited))
          return true;
        const declaration = declarations.get(node.text);
        if (declaration && declaration !== node && visit(declaration))
          return true;
      }
      return (
        ts.forEachChild(node, (child) => visit(child) || undefined) === true
      );
    };
    if (entry === "*") return visit(source);
    const imported = imports.get(entry);
    if (imported) return usesSynthesis(imported.file, imported.name, visited);
    const declaration = declarations.get(entry);
    return declaration ? visit(declaration) : visit(source);
  };
  return fs
    .readdirSync(workflowsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packageRoot = path.join(workflowsRoot, entry.name);
      const manifestPath = path.join(packageRoot, "workflow-package.json");
      if (!fs.existsSync(manifestPath)) return [];
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        workflows: string[];
      };
      return manifest.workflows.flatMap((relative) => {
        const file = path.join(packageRoot, relative);
        const workflow = JSON.parse(fs.readFileSync(file, "utf8")) as {
          id: string;
          hooks?: Record<string, string>;
        };
        return Object.entries(workflow.hooks || {}).some(([name, hook]) =>
          usesSynthesis(path.resolve(path.dirname(file), hook), name),
        )
          ? [workflow.id]
          : [];
      });
    })
    .sort();
}

export function inspectSynthesisProtocolCoverage(
  registry: CoverageRegistry,
  cases: ProtocolCorpusCase[],
  evidence: SynthesisProtocolExecutionEvidence[] = [],
  structureEvidence?: StructureCoverageAxis,
  structureObligations: readonly StructureObligation[] = [],
) {
  const slots = protocolMessageSlots(registry);
  const positive = new Set(
    cases.filter((entry) => entry.valid).map((entry) => entry.schemaRef),
  );
  const negative = new Set(
    cases.filter((entry) => !entry.valid).map((entry) => entry.schemaRef),
  );
  const missing = slots.flatMap(({ id, ref }) => [
    ...(!positive.has(ref) ? [`${id}:positive`] : []),
    ...(!negative.has(ref) ? [`${id}:negative`] : []),
  ]);
  const entries: CoverageAxis = {
    total: slots.length,
    covered: slots.filter(({ ref }) => positive.has(ref) && negative.has(ref))
      .length,
    uncovered: missing,
  };
  const structure: CoverageAxis = structureEvidence || {
    total: 0,
    covered: 0,
    uncovered: ["structure:execution_missing"],
  };
  const executed = new Set(
    evidence
      .filter((entry) => entry.implementation === "native-process")
      .map((entry) => `${entry.slot}:${entry.outcome}`),
  );
  const executorOf = (entry: SynthesisProtocolExecutionEvidence) =>
    entry.implementation === "typescript-rebuilder" &&
    entry.executor === "typescript"
      ? "typescript"
      : entry.implementation === "native-process" && entry.executor === "rust"
        ? "rust"
        : undefined;
  const messages = slots.map(({ id, producer, receiver }) => {
    const receiverEvidence = evidence.filter(
      (entry) =>
        entry.slot === id &&
        (entry.executor
          ? executorOf(entry) === receiver
          : entry.implementation === "native-process"),
    );
    return {
      id,
      producer,
      receiver,
      producerExecuted: executed.has(`${id}:accepted`),
      receiverAccepted: receiverEvidence.some(
        (entry) => entry.outcome === "accepted",
      ),
      receiverRejected: receiverEvidence.some(
        (entry) => entry.outcome === "rejected",
      ),
      diverged: evidence.some(
        (entry) => entry.slot === id && entry.outcome === "diverged",
      ),
    };
  });
  const crossLanguageMissing = messages
    .filter(
      (entry) =>
        !entry.producerExecuted ||
        !entry.receiverAccepted ||
        !entry.receiverRejected ||
        entry.diverged,
    )
    .map(({ id }) => id)
    .sort();
  const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
  const receivers = Object.fromEntries(
    (["typescript", "rust"] as const).map((receiver) => {
      const obligations = structureObligations.filter((entry) =>
        entry.rootIds.some((id) => slotsById.get(id)?.receiver === receiver),
      );
      const verified = new Set(
        evidence
          .filter(
            (entry) =>
              executorOf(entry) === receiver && entry.outcome === "verified",
          )
          .map((entry) => entry.slot),
      );
      const diverged = new Set(
        evidence
          .filter((entry) => entry.outcome === "diverged")
          .map((entry) => entry.slot),
      );
      const executed = obligations
        .filter(
          ({ id }) =>
            verified.has(`structure:${id}`) && !diverged.has(`structure:${id}`),
        )
        .map(({ id }) => id);
      const covered = new Set(executed);
      return [
        receiver,
        {
          total: obligations.length,
          covered: executed.length,
          executed,
          uncovered: obligations
            .filter(({ id }) => !covered.has(id))
            .map(({ id }) => id),
        },
      ];
    }),
  );
  const missingReceiverIds = new Set(
    Object.values(receivers).flatMap((axis) => axis.uncovered),
  );
  const nativeStructureMissing = structureObligations
    .filter(
      ({ id, rootIds }) =>
        !rootIds.some((root) => slotsById.has(root)) ||
        missingReceiverIds.has(id),
    )
    .map(({ id }) => id);
  const crossLanguage = {
    total: slots.length,
    covered: slots.length - crossLanguageMissing.length,
    uncovered: crossLanguageMissing,
    structure: {
      total: structureObligations.length,
      covered: structureObligations.length - nativeStructureMissing.length,
      uncovered: nativeStructureMissing,
      receivers,
    },
    messages,
  };
  const producers = synthesisWorkflowProducerIds();
  const workflowProducers: CoverageAxis = {
    total: producers.length,
    covered: producers.filter((id) => executed.has(`workflow:${id}:persisted`))
      .length,
    uncovered: producers.filter(
      (id) => !executed.has(`workflow:${id}:persisted`),
    ),
  };
  return {
    complete:
      missing.length === 0 &&
      structure.uncovered.length === 0 &&
      crossLanguage.uncovered.length === 0 &&
      crossLanguage.structure.uncovered.length === 0 &&
      workflowProducers.uncovered.length === 0,
    entries,
    structure,
    crossLanguage,
    workflowProducers,
  };
}

function readProtocolJson(relativePath: string) {
  return JSON.parse(
    fs.readFileSync(path.join(PROTOCOL_CONTRACT_ROOT, relativePath), "utf8"),
  ) as JsonObject;
}

function duplicateStrings(values: readonly string[]) {
  return [
    ...new Set(
      values.filter((value, index) => values.indexOf(value) !== index),
    ),
  ].sort();
}

function stringDifference(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value)).sort();
}

function workerOperationsFromRust() {
  const source = fs.readFileSync(WORKER_PROTOCOL_SOURCE, "utf8");
  return [
    ...source.matchAll(/^pub const [A-Z0-9_]+_OPERATION: &str = "([^"]+)";/gm),
  ]
    .map((match) => match[1]!)
    .sort();
}

function normalizeProtocolRef(schemaRef: string, fromFile?: string) {
  const [relativePath, fragment = ""] = schemaRef.split("#", 2);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(relativePath)) {
    return `${relativePath}${fragment ? `#${fragment}` : ""}`;
  }
  const resolvedPath = relativePath
    ? path.posix.normalize(
        fromFile
          ? path.posix.join(path.posix.dirname(fromFile), relativePath)
          : relativePath,
      )
    : fromFile;
  return `${resolvedPath || ""}${fragment ? `#${fragment}` : ""}`;
}

function schemaFilePath(relativePath: string) {
  return (
    EXTERNAL_SCHEMA_FILES.get(relativePath) ||
    path.join(PROTOCOL_CONTRACT_ROOT, relativePath)
  );
}

const protocolSchemaDocuments = new Map<string, JsonObject>();

function schemaAtRef(
  schemaRef: string,
  fromFile?: string,
): ResolvedProtocolSchema | undefined {
  const canonicalRef = normalizeProtocolRef(schemaRef, fromFile);
  const [relativePath, fragment = ""] = canonicalRef.split("#", 2);
  if (!relativePath) return undefined;
  const fullPath = schemaFilePath(relativePath);
  if (!fs.existsSync(fullPath)) return undefined;
  let schema = protocolSchemaDocuments.get(fullPath);
  if (!schema) {
    schema = JSON.parse(fs.readFileSync(fullPath, "utf8")) as JsonObject;
    protocolSchemaDocuments.set(fullPath, schema);
  }
  if (!fragment) return { canonicalRef, schema, node: schema, relativePath };
  const parts = fragment
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  let node: unknown = schema;
  for (const part of parts) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as JsonObject)[part];
  }
  return { canonicalRef, schema, node, relativePath };
}

/** Undefined means no production validator executed; it never earns evidence. */
function typescriptSchemaOutcome(
  schemaRef: string,
  value: unknown,
  onRejection?: (error: SynthesisClientError) => void,
): boolean | undefined {
  const resolved = schemaAtRef(schemaRef);
  if (!resolved) return undefined;
  const definition = schemaRef.split("#/$defs/")[1];
  if (!definition) {
    const validators = new Map([
      [
        "source-reference-artifact.schema.json",
        validateSourceReferenceArtifact,
      ],
      [
        "citation-analysis-artifact.schema.json",
        validateCitationAnalysisArtifact,
      ],
      [
        "literature-score-artifact.schema.json",
        validateLiteratureScoreArtifact,
      ],
    ]);
    const validate = validators.get(resolved.relativePath.split("/").at(-1)!);
    return validate?.(value).ok;
  }
  try {
    rebuildSynthesisProtocolDto({
      schemaId: String(resolved.schema.$id),
      definition,
      value,
      direction: "result",
    });
    return true;
  } catch (error) {
    if (
      error instanceof SynthesisClientError &&
      Array.isArray(error.details?.violations)
    ) {
      onRejection?.(error);
      return false;
    }
    return undefined;
  }
}

function inspectRecursiveShape(
  schemaRef: string,
  opaqueRefs: ReadonlySet<string>,
  opaqueAllowedSchemaFiles: ReadonlyMap<string, ReadonlySet<string>>,
  errors: string[],
  reachableRefs: Set<string>,
) {
  const root = schemaAtRef(schemaRef);
  if (!root) {
    errors.push(`protocol_schema_ref_missing:${schemaRef}`);
    return 0;
  }
  const visited = new Set<string>();
  let escapes = 0;
  const visit = (
    value: unknown,
    currentFile: string,
    location: string,
    opaque: boolean,
    closedByComposition = false,
  ) => {
    if (value === true) {
      if (!opaque) {
        escapes += 1;
        errors.push(`protocol_generic_schema:${schemaRef}:${location}`);
      }
      return;
    }
    if (
      !value ||
      value === false ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return;
    }
    const node = value as JsonObject;
    if (typeof node.$ref === "string") {
      const targetRef = normalizeProtocolRef(node.$ref, currentFile);
      if (
        opaqueRefs.has(targetRef) &&
        !opaqueAllowedSchemaFiles.get(targetRef)?.has(currentFile)
      ) {
        escapes += 1;
        errors.push(
          `protocol_opaque_use_unauthorized:${schemaRef}:${currentFile}:${location}`,
        );
      }
      const key = `${targetRef}:${opaque}`;
      if (visited.has(key)) return;
      visited.add(key);
      reachableRefs.add(targetRef);
      const target = schemaAtRef(targetRef);
      if (!target) {
        errors.push(`protocol_schema_ref_missing:${targetRef}`);
        return;
      }
      visit(
        target.node,
        target.relativePath,
        targetRef,
        opaque || opaqueRefs.has(targetRef),
        closedByComposition,
      );
      return;
    }
    if (node.type === "object" || node.properties || node.patternProperties) {
      if (
        node.additionalProperties !== false &&
        node.unevaluatedProperties !== false &&
        !closedByComposition &&
        !opaque
      ) {
        escapes += 1;
        errors.push(`protocol_open_object:${schemaRef}:${location}`);
      }
      for (const [name, child] of Object.entries(
        (node.properties as JsonObject) || {},
      )) {
        visit(child, currentFile, `${location}.properties.${name}`, opaque);
      }
      for (const [name, child] of Object.entries(
        (node.patternProperties as JsonObject) || {},
      )) {
        visit(
          child,
          currentFile,
          `${location}.patternProperties.${name}`,
          opaque,
        );
      }
      if (node.additionalProperties && node.additionalProperties !== false) {
        visit(
          node.additionalProperties,
          currentFile,
          `${location}.additionalProperties`,
          opaque,
        );
      }
    }
    if (node.type === "array" || node.items !== undefined) {
      if (
        (node.items === undefined || node.items === true) &&
        node.maxItems !== 0
      ) {
        if (!opaque) {
          escapes += 1;
          errors.push(`protocol_open_array:${schemaRef}:${location}`);
        }
      } else {
        visit(node.items, currentFile, `${location}.items`, opaque);
      }
    }
    for (const keyword of ["allOf", "anyOf", "oneOf", "prefixItems"] as const) {
      const branches = node[keyword];
      if (Array.isArray(branches)) {
        branches.forEach((branch, index) =>
          visit(
            branch,
            currentFile,
            `${location}.${keyword}[${index}]`,
            opaque,
            keyword === "allOf" && node.unevaluatedProperties === false,
          ),
        );
      }
    }
    for (const keyword of ["if", "then", "else", "not"] as const) {
      if (node[keyword] !== undefined) {
        visit(
          node[keyword],
          currentFile,
          `${location}.${keyword}`,
          opaque,
          true,
        );
      }
    }
  };
  reachableRefs.add(root.canonicalRef);
  visit(
    root.node,
    root.relativePath,
    root.canonicalRef,
    opaqueRefs.has(root.canonicalRef),
  );
  return escapes;
}

function protocolSchemaFiles() {
  const root = path.join(PROTOCOL_CONTRACT_ROOT, "schemas");
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".schema.json"))
    .map((entry) => `schemas/${entry.name}`)
    .sort();
}

function inspectProtocolRegistry(
  errors: string[],
  onWitness?: StructureCoverageInput["onWitness"],
  onStructureInput?: (input: StructureCoverageInput) => void,
) {
  protocolSchemaDocuments.clear();
  const registry = readProtocolJson(
    "registry.json",
  ) as unknown as ProtocolRegistry;
  const declaredCapabilities = registry.capabilities.map(
    (entry) => entry.capability,
  );
  const expectedCapabilities = [
    ...SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
    ...SYNTHESIS_SIDECAR_CAPABILITIES,
    ...SYNTHESIS_REVERSE_HOST_CAPABILITIES,
  ].sort();
  const declaredWorkers = registry.workers
    .map((entry) => entry.operation)
    .sort();
  const expectedWorkers = workerOperationsFromRust();
  if (
    registry.schema !== "synthesis-sidecar-protocol-registry.v1" ||
    registry.jsonSchemaDialect !==
      "https://json-schema.org/draft/2020-12/schema"
  ) {
    errors.push("protocol_registry_identity_invalid");
  }
  if (
    registry.expected.crossProcessCapabilities !==
      expectedCapabilities.length ||
    registry.expected.deterministicWorkerOperations !== expectedWorkers.length
  ) {
    errors.push("protocol_registry_expected_counts_invalid");
  }
  const systemCapabilitySchema = schemaAtRef(
    "schemas/system.schema.json#/$defs/Capability",
  )?.node as JsonObject | undefined;
  if (
    canonicalizeSynthesisContractJson(systemCapabilitySchema?.enum || []) !==
    canonicalizeSynthesisContractJson([...SYNTHESIS_SIDECAR_CAPABILITIES])
  ) {
    errors.push("protocol_operational_capabilities_drift");
  }
  for (const ref of [
    "schemas/system.schema.json#/$defs/HandshakeResult/properties/capabilities",
    "schemas/lifecycle.schema.json#/$defs/DiscoveryBase/properties/capabilities",
  ]) {
    const capabilities = schemaAtRef(ref)?.node as JsonObject | undefined;
    if (
      capabilities?.minItems !== SYNTHESIS_SIDECAR_CAPABILITIES.length ||
      capabilities?.maxItems !== SYNTHESIS_SIDECAR_CAPABILITIES.length
    ) {
      errors.push(`protocol_operational_capability_count_drift:${ref}`);
    }
  }
  for (const duplicate of duplicateStrings(declaredCapabilities)) {
    errors.push(`protocol_capability_duplicate:${duplicate}`);
  }
  for (const capability of stringDifference(
    expectedCapabilities,
    declaredCapabilities,
  )) {
    errors.push(`protocol_capability_unmapped:${capability}`);
  }
  for (const capability of stringDifference(
    declaredCapabilities,
    expectedCapabilities,
  )) {
    errors.push(`protocol_capability_unknown:${capability}`);
  }
  for (const duplicate of duplicateStrings(declaredWorkers)) {
    errors.push(`protocol_worker_duplicate:${duplicate}`);
  }
  for (const operation of stringDifference(expectedWorkers, declaredWorkers)) {
    errors.push(`protocol_worker_unmapped:${operation}`);
  }
  for (const operation of stringDifference(declaredWorkers, expectedWorkers)) {
    errors.push(`protocol_worker_unknown:${operation}`);
  }
  const opaqueRefs = new Set(
    registry.opaqueLeaves.map((entry) => entry.schemaRef),
  );
  const opaqueAllowedSchemaFiles = new Map(
    registry.opaqueLeaves.map((entry) => [
      entry.schemaRef,
      new Set(entry.allowedSchemaFiles),
    ]),
  );
  const reachableRefs = new Set<string>();
  let unauthorizedGenericEscapeCount = 0;
  for (const leaf of registry.opaqueLeaves) {
    if (
      !leaf.owner ||
      !leaf.schemaId ||
      !leaf.schemaVersion ||
      !leaf.codec ||
      !Number.isSafeInteger(leaf.maxBytes) ||
      leaf.maxBytes < 1 ||
      !Number.isSafeInteger(leaf.maxDepth) ||
      leaf.maxDepth < 1 ||
      !Number.isSafeInteger(leaf.maxNodes) ||
      leaf.maxNodes < 1 ||
      !Array.isArray(leaf.allowedSchemaFiles) ||
      leaf.allowedSchemaFiles.length === 0
    ) {
      unauthorizedGenericEscapeCount += 1;
      errors.push(`protocol_opaque_leaf_metadata_invalid:${leaf.schemaRef}`);
    }
  }
  for (const schemaRef of opaqueRefs) {
    unauthorizedGenericEscapeCount += inspectRecursiveShape(
      schemaRef,
      opaqueRefs,
      opaqueAllowedSchemaFiles,
      errors,
      reachableRefs,
    );
  }
  for (const mapping of registry.capabilities) {
    for (const schemaRef of [
      mapping.requestSchemaRef,
      mapping.resultSchemaRef,
      mapping.errorSchemaRef,
    ]) {
      unauthorizedGenericEscapeCount += inspectRecursiveShape(
        schemaRef,
        opaqueRefs,
        opaqueAllowedSchemaFiles,
        errors,
        reachableRefs,
      );
    }
  }
  for (const mapping of registry.workers) {
    for (const schemaRef of [
      mapping.runHeaderSchemaRef,
      mapping.inputSectionSchemaRef,
      mapping.outputHeaderSchemaRef,
      mapping.outputSectionSchemaRef,
      mapping.errorSchemaRef,
    ]) {
      unauthorizedGenericEscapeCount += inspectRecursiveShape(
        schemaRef,
        opaqueRefs,
        opaqueAllowedSchemaFiles,
        errors,
        reachableRefs,
      );
    }
  }
  for (const document of registry.documents) {
    unauthorizedGenericEscapeCount += inspectRecursiveShape(
      document.schemaRef,
      opaqueRefs,
      opaqueAllowedSchemaFiles,
      errors,
      reachableRefs,
    );
  }
  const protocolCases = registry.corpora.flatMap((relativePath) => {
    const document = readProtocolJson(relativePath);
    if (!Array.isArray(document.cases)) {
      errors.push(`protocol_corpus_cases_invalid:${relativePath}`);
      return [];
    }
    return document.cases.filter((entry): entry is ProtocolCorpusCase => {
      const row = entry as Partial<ProtocolCorpusCase> | null;
      const valid =
        row &&
        typeof row === "object" &&
        typeof row.id === "string" &&
        typeof row.schemaRef === "string" &&
        typeof row.valid === "boolean" &&
        (("value" in row && row.absent === undefined) ||
          (!("value" in row) && row.absent === true && row.valid));
      if (!valid)
        errors.push(
          `protocol_corpus_case_invalid:${relativePath}:${row?.id || "unknown"}`,
        );
      return Boolean(valid);
    });
  });
  for (const corpusCase of protocolCases) {
    unauthorizedGenericEscapeCount += inspectRecursiveShape(
      corpusCase.schemaRef,
      opaqueRefs,
      opaqueAllowedSchemaFiles,
      errors,
      reachableRefs,
    );
  }
  const schemaFiles = protocolSchemaFiles();
  const schemaDocuments = schemaFiles.map((relativePath) => ({
    relativePath,
    document: readProtocolJson(relativePath),
  }));
  const schemaIds = new Set<string>();
  // Fragment probes inherit their type from the enclosing production schema.
  const protocolAjv = new Ajv2020({
    strict: true,
    strictTypes: false,
    allErrors: false,
  });
  for (const [schemaRef, fullPath] of EXTERNAL_SCHEMA_FILES) {
    try {
      protocolAjv.addSchema(
        JSON.parse(fs.readFileSync(fullPath, "utf8")) as JsonObject,
      );
    } catch (error) {
      errors.push(`external_schema_invalid:${schemaRef}:${String(error)}`);
    }
  }
  for (const { relativePath, document } of schemaDocuments) {
    if (document.$schema !== registry.jsonSchemaDialect) {
      errors.push(`protocol_schema_dialect_invalid:${relativePath}`);
    }
    if (typeof document.$id !== "string" || schemaIds.has(document.$id)) {
      errors.push(`protocol_schema_id_invalid:${relativePath}`);
    } else {
      schemaIds.add(document.$id);
    }
    try {
      protocolAjv.addSchema(document);
    } catch (error) {
      errors.push(`protocol_schema_invalid:${relativePath}:${String(error)}`);
    }
    for (const definition of Object.keys(
      (document.$defs as JsonObject) || {},
    )) {
      const definitionRef = `${relativePath}#/$defs/${definition}`;
      if (!reachableRefs.has(definitionRef)) {
        errors.push(`protocol_schema_definition_orphan:${definitionRef}`);
      }
    }
  }
  const caseIds = protocolCases.map((entry) => entry.id);
  for (const duplicate of duplicateStrings(caseIds)) {
    errors.push(`protocol_corpus_case_duplicate:${duplicate}`);
  }
  const compiledValidators = new Map<
    string,
    ReturnType<typeof protocolAjv.getSchema>
  >();
  const validator = (schemaRef: string) => {
    if (compiledValidators.has(schemaRef))
      return compiledValidators.get(schemaRef);
    const resolved = schemaAtRef(schemaRef);
    const schemaId = resolved?.schema.$id;
    const fragment = schemaRef.split("#", 2)[1] || "";
    const validate =
      typeof schemaId === "string"
        ? protocolAjv.getSchema(`${schemaId}#${fragment}`)
        : undefined;
    compiledValidators.set(schemaRef, validate);
    return validate;
  };
  const validatedCases: ProtocolCorpusCase[] = [];
  let diagnosticAjv: Ajv2020 | undefined;
  const diagnosticValidators = new Map<
    string,
    ReturnType<typeof protocolAjv.getSchema>
  >();
  const diagnosticErrors = (schemaRef: string, value: unknown) => {
    // Small negative probes need all failing keywords for constraint attribution;
    // large union pages retain the bounded production short-circuit path.
    const pending = [value];
    let remaining = 1024;
    while (pending.length && remaining-- > 0) {
      const current = pending.pop();
      if (typeof current === "string" && current.length > 65536)
        return undefined;
      if (current && typeof current === "object") {
        const children = Object.values(current);
        if (children.length > remaining) return undefined;
        pending.push(...children);
      }
    }
    if (pending.length) return undefined;
    if (!diagnosticAjv) {
      diagnosticAjv = new Ajv2020({
        strict: true,
        strictTypes: false,
        allErrors: true,
      });
      for (const fullPath of EXTERNAL_SCHEMA_FILES.values())
        diagnosticAjv.addSchema(JSON.parse(fs.readFileSync(fullPath, "utf8")));
      for (const { document } of schemaDocuments)
        diagnosticAjv.addSchema(document);
    }
    let detailed = diagnosticValidators.get(schemaRef);
    if (!detailed) {
      const resolved = schemaAtRef(schemaRef);
      const fragment = schemaRef.split("#", 2)[1] || "";
      detailed = diagnosticAjv.getSchema(`${resolved?.schema.$id}#${fragment}`);
      diagnosticValidators.set(schemaRef, detailed);
    }
    if (!detailed || detailed(value)) return undefined;
    return detailed.errors || [];
  };
  for (const corpusCase of protocolCases) {
    if (corpusCase.absent) {
      const section = registry.workers.some(
        (worker) =>
          worker.inputSectionSchemaRef === corpusCase.schemaRef ||
          worker.outputSectionSchemaRef === corpusCase.schemaRef,
      );
      if (!section || schemaAtRef(corpusCase.schemaRef)?.node !== false)
        errors.push(`protocol_absence_case_invalid:${corpusCase.id}`);
      else validatedCases.push(corpusCase);
      continue;
    }
    const validate = validator(corpusCase.schemaRef);
    if (!validate) {
      errors.push(`protocol_corpus_schema_missing:${corpusCase.id}`);
      continue;
    }
    const accepted = validate(corpusCase.value);
    if (accepted !== corpusCase.valid) {
      errors.push(
        `${corpusCase.valid ? "protocol_positive_rejected" : "protocol_negative_admitted"}:${corpusCase.id}`,
      );
      continue;
    }
    validatedCases.push(corpusCase);
  }
  const identity = synthesisProtocolExecutionIdentity();
  const receiverEvidence: SynthesisProtocolExecutionEvidence[] = [];
  const slots = protocolMessageSlots(registry);
  for (const slot of slots.filter((entry) => entry.receiver === "typescript")) {
    for (const sample of validatedCases.filter(
      (entry) => !entry.absent && entry.schemaRef === slot.ref,
    )) {
      let accepted = true;
      let validated = true;
      try {
        if (slot.capability && slot.part === "request") {
          rebuildSynthesisReverseHostPayload(
            slot.capability as SynthesisReverseHostCapability,
            sample.value,
          );
        } else if (slot.capability && slot.part === "result") {
          rebuildSynthesisProtocolCapabilityDto({
            capability: slot.capability,
            direction: "result",
            value: sample.value,
          });
        } else {
          const outcome = typescriptSchemaOutcome(slot.ref, sample.value);
          accepted = outcome === true;
          validated = outcome !== undefined;
        }
      } catch (error) {
        if (!(error instanceof SynthesisClientError)) throw error;
        const expected =
          slot.operation || slot.part === "request"
            ? "invalid_request"
            : "internal";
        accepted = false;
        validated = error.code === expected;
      }
      if (validated && accepted === sample.valid)
        receiverEvidence.push({
          identity: identity ?? "typescript-only",
          slot: slot.id,
          outcome: accepted ? "accepted" : "rejected",
          implementation: "typescript-rebuilder",
          executor: "typescript",
        });
      else if (validated)
        errors.push(
          `protocol_typescript_receiver_disagreement:${slot.id}:${sample.id}`,
        );
    }
  }
  const structureInput: StructureCoverageInput = {
    onWitness(witness) {
      onWitness?.(witness);
      const local = typescriptSchemaOutcome(witness.schemaRef, witness.value);
      if (local !== witness.expectValid) {
        // A context-dependent predicate may compile only inside its production DTO.
        if (
          local !== undefined ||
          witness.expectValid ||
          witness.root.valid ||
          !witness.keyword
        )
          return;
        if (
          typescriptSchemaOutcome(
            witness.root.schemaRef,
            witness.root.seedValue,
          ) !== true
        )
          return;
        let attributed = false;
        const root = typescriptSchemaOutcome(
          witness.root.schemaRef,
          witness.root.value,
          (error) => {
            attributed = (
              error.details!.violations as {
                keyword: string;
                instancePath: string;
              }[]
            ).some(
              (violation) =>
                violation.keyword === witness.keyword &&
                violation.instancePath === witness.instancePath,
            );
          },
        );
        if (root !== false || !attributed) return;
      }
      if (!witness.expectValid && !witness.schemaRef.includes("#/$defs/")) {
        let seed: unknown = witness.root.seedValue;
        for (const segment of witness.instancePath.split("/").slice(1)) {
          const key = segment.replace(/~1/g, "/").replace(/~0/g, "~");
          seed =
            seed && typeof seed === "object"
              ? (seed as Record<string, unknown>)[key]
              : undefined;
        }
        if (typescriptSchemaOutcome(witness.schemaRef, seed) !== true) return;
      }
      receiverEvidence.push({
        identity: identity ?? "typescript-only",
        slot: `structure:${witness.obligationId}`,
        outcome: "verified",
        implementation: "typescript-rebuilder",
        executor: "typescript",
      });
    },
    maxVisits: 100_000,
    maxVerificationAttempts: 128,
    maxProbeRows:
      process.env.SYNTHESIS_PROTOCOL_STRESS === "1" ? 1_250_001 : 4096,
    maxProbeBytes:
      (process.env.SYNTHESIS_PROTOCOL_STRESS === "1" ? 512 : 8) * 1024 * 1024,
    roots: slots,
    resolveSchema: schemaAtRef,
    validate(schemaRef, value) {
      const validate = validator(schemaRef);
      if (!validate) return { valid: false };
      const valid = validate(value);
      const validationErrors = (validate.errors || []).map((entry) => ({
        ...entry,
      }));
      const resolved = schemaAtRef(schemaRef);
      const definition = schemaRef.split("#/$defs/")[1];
      if (resolved && definition && !definition.includes("/")) {
        let rebuilt = true;
        try {
          rebuildSynthesisProtocolDto({
            schemaId: String(resolved.schema.$id),
            definition,
            value,
            direction: "request",
          });
        } catch (error) {
          if (!(error instanceof SynthesisClientError)) throw error;
          rebuilt = false;
        }
        if (rebuilt !== valid) {
          errors.push(`protocol_typescript_schema_disagreement:${schemaRef}`);
          return { valid: false, errors: [] };
        }
      }
      return {
        valid,
        errors: valid
          ? validationErrors
          : diagnosticErrors(schemaRef, value) || validationErrors,
      };
    },
    corpus: protocolCases
      .filter((entry) => !entry.absent)
      .map((entry) => ({ ...entry, value: entry.value })),
  };
  onStructureInput?.(structureInput);
  const structure = inspectSynthesisProtocolStructureCoverage(structureInput);
  const observed = readSynthesisProtocolObservations();
  let observedStructure:
    | ReturnType<typeof inspectSynthesisProtocolStructureCoverage>
    | undefined;
  if (identity && observed.length)
    observedStructure = inspectSynthesisProtocolStructureCoverage({
      ...structureInput,
      onlyObservedValues: true,
      maxVerificationAttempts: Math.max(128, observed.length),
      maxProbeRows: 4096,
      maxProbeBytes: 512 * 1024,
      corpus: observed,
      onWitness(witness) {
        const receivers = new Set(
          slots
            .filter((slot) => slot.ref === witness.root.schemaRef)
            .map((slot) => slot.receiver),
        );
        if (witness.expectValid && witness.root.valid && receivers.size === 1)
          appendSynthesisProtocolExecutionEvidence(
            identity,
            `structure:${witness.obligationId}`,
            "verified",
            [...receivers][0],
          );
      },
    });
  return {
    registry,
    schemaDocuments,
    corpusDocuments: registry.corpora.map((relativePath) => ({
      relativePath,
      document: readProtocolJson(relativePath),
    })),
    protocolCapabilityCount: declaredCapabilities.length,
    workerOperationCount: declaredWorkers.length,
    unauthorizedGenericEscapeCount,
    protocolPositiveCaseCount: protocolCases.filter((entry) => entry.valid)
      .length,
    protocolNegativeCaseCount: protocolCases.filter((entry) => !entry.valid)
      .length,
    coverage: inspectSynthesisProtocolCoverage(
      registry,
      validatedCases,
      [...readSynthesisProtocolExecutionEvidence(), ...receiverEvidence],
      structure.structure,
      structure.obligations,
    ),
    structureExecution: {
      truncated: structure.truncated,
      verificationBudget: structure.verificationBudget,
      violations: structure.violations,
      executedCases: structure.negatives.filter(
        (entry) => entry.outcome !== "skipped",
      ).length,
      nativeObservations: {
        samples: observed.length,
        covered: observedStructure?.covered.length ?? 0,
        truncated: observedStructure?.truncated ?? false,
        exhausted: observedStructure?.verificationBudget.exhausted ?? [],
      },
    },
  };
}

function stableErrorCode(error: unknown) {
  return error instanceof SynthesisClientError ? error.code : "unknown_error";
}

export async function checkSynthesisCrossLanguageContracts(
  onWitness?: StructureCoverageInput["onWitness"],
  onStructureInput?: (input: StructureCoverageInput) => void,
): Promise<SynthesisCrossLanguageContractCheck> {
  const errors: string[] = [];
  const protocol = inspectProtocolRegistry(errors, onWitness, onStructureInput);
  const currentObservationCorpus = JSON.parse(
    fs.readFileSync(SIDECAR_OBSERVATION_CORPUS, "utf8"),
  ) as {
    schema: string;
    positive: Array<{ id: string; value: unknown }>;
    negative: Array<{ id: string; value: unknown }>;
  };
  if (
    currentObservationCorpus.schema !==
    "synthesis-sidecar-observation-corpus.v2"
  ) {
    errors.push("sidecar_observation_corpus_schema_invalid");
  }
  for (const corpusCase of currentObservationCorpus.positive) {
    try {
      const rebuilt = rebuildSynthesisSidecarObservationEvent(corpusCase.value);
      if (
        canonicalizeSynthesisContractJson(rebuilt) !==
        canonicalizeSynthesisContractJson(corpusCase.value)
      ) {
        errors.push(`sidecar_observation_positive_mismatch:${corpusCase.id}`);
      }
    } catch (error) {
      errors.push(
        `sidecar_observation_positive_failed:${corpusCase.id}:${stableErrorCode(error)}`,
      );
    }
  }
  for (const corpusCase of currentObservationCorpus.negative) {
    try {
      rebuildSynthesisSidecarObservationEvent(corpusCase.value);
      errors.push(`sidecar_observation_negative_admitted:${corpusCase.id}`);
    } catch (error) {
      if (stableErrorCode(error) !== "invalid_request") {
        errors.push(
          `sidecar_observation_negative_code:${corpusCase.id}:${stableErrorCode(error)}`,
        );
      }
    }
  }
  const definitionCount = protocol.schemaDocuments.reduce(
    (total, entry) =>
      total + Object.keys((entry.document.$defs as JsonObject) || {}).length,
    0,
  );
  return {
    ok: errors.length === 0 && protocol.coverage.complete,
    contractSetVersion: "synthesis-sidecar-protocol-registry.v1",
    schemaCount: protocol.schemaDocuments.length,
    definitionCount,
    positiveCaseCount:
      protocol.protocolPositiveCaseCount +
      currentObservationCorpus.positive.length,
    negativeCaseCount:
      protocol.protocolNegativeCaseCount +
      currentObservationCorpus.negative.length,
    protocolCapabilityCount: protocol.protocolCapabilityCount,
    workerOperationCount: protocol.workerOperationCount,
    unauthorizedGenericEscapeCount: protocol.unauthorizedGenericEscapeCount,
    protocolPositiveCaseCount: protocol.protocolPositiveCaseCount,
    protocolNegativeCaseCount: protocol.protocolNegativeCaseCount,
    fingerprint: hashSynthesisContractCanonicalJson({
      registry: protocol.registry,
      schemas: protocol.schemaDocuments,
      corpora: protocol.corpusDocuments,
      observationCorpus: currentObservationCorpus,
    }),
    errors,
    coverage: protocol.coverage,
    structureExecution: protocol.structureExecution,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const result = await checkSynthesisCrossLanguageContracts();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
