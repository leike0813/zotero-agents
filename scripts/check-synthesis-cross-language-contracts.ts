import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import {
  SynthesisCanonicalJsonError,
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../packages/synthesis-contracts/src/canonicalJson.js";
import { SynthesisClientError } from "../packages/synthesis-contracts/src/common.js";
import { rebuildSynthesisSidecarObservationEvent } from "../packages/synthesis-contracts/src/sidecarObservability.js";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  rebuildSynthesisSidecarCallRequest,
} from "../packages/synthesis-contracts/src/sidecarSystem.js";
import { SYNTHESIS_REVERSE_HOST_CAPABILITIES } from "../packages/synthesis-contracts/src/sidecarProduction.js";
import { rebuildSynthesisSidecarTransferSnapshot } from "../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  computeSynthesisCitationGraphMetrics,
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphMetricsRequest,
} from "../packages/synthesis-engine/src/index.js";
import {
  createInProcessSynthesisTagVocabularyEngine,
  rebuildSynthesisTagVocabularyIndexRequest,
  rebuildSynthesisTagVocabularyValidationRequest,
} from "../packages/synthesis-engine/src/tagVocabulary.js";
import {
  createInProcessSynthesisConceptKbIndexEngine,
  rebuildSynthesisConceptKbIndexRequest,
  rebuildSynthesisConceptKbQueryRequest,
} from "../packages/synthesis-engine/src/conceptKbIndex.js";
import {
  createInProcessSynthesisTopicGraphIndexEngine,
  rebuildSynthesisTopicGraphIndexRequest,
} from "../packages/synthesis-engine/src/topicGraphIndex.js";
import {
  computeSynthesisReferenceBinding,
  computeSynthesisReferenceDedupe,
  rebuildSynthesisReferenceBindingRequest,
  rebuildSynthesisReferenceDedupeRequest,
} from "../packages/synthesis-engine/src/referenceMatcher.js";
import {
  createInProcessSynthesisTopicStructuredArtifactEngine,
  rebuildSynthesisTopicArtifactAssemblyRequest,
  rebuildSynthesisTopicArtifactValidationRequest,
  rebuildSynthesisTopicManifestValidationRequest,
  rebuildSynthesisTopicSectionPatchRequest,
} from "../packages/synthesis-engine/src/topicStructuredArtifact.js";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
} from "../packages/synthesis-engine/src/citationGraphBuild.js";
import {
  ComputeWorkerPoolError,
  createSynthesisSidecarComputeWorkerPool,
} from "../apps/synthesis-service/src/computeWorkerPool.js";

const CONTRACT_SET_ROOT = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-cross-language-v1",
);
const PROTOCOL_CONTRACT_ROOT = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1",
);
const WORKER_PROTOCOL_SOURCE = path.resolve(
  import.meta.dirname,
  "../native/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs",
);
const SIDECAR_OBSERVATION_CORPUS = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-sidecar-observability-v2/corpus.json",
);

type JsonObject = Record<string, unknown>;

type Manifest = {
  contractSetVersion: string;
  jsonSchemaDialect: string;
  schemas: Array<{ path: string; definitions: string[] }>;
  corpora: Array<{
    path: string;
    kind: "positive" | "negative";
    version: string;
  }>;
  capabilities: Record<string, string[]>;
};

type PositiveCase = {
  id: string;
  oracle: string;
  schemaRef: string;
  inputJson: string;
  output: unknown;
  canonicalJson: string;
  sha256: string;
};

type NegativeCase = {
  id: string;
  oracle: string;
  inputJson: string;
  errorCode: string;
  schemaRef?: string;
};

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
  value: unknown;
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
};

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
  const resolvedPath = relativePath
    ? path.posix.normalize(
        fromFile
          ? path.posix.join(path.posix.dirname(fromFile), relativePath)
          : relativePath,
      )
    : fromFile;
  return `${resolvedPath || ""}${fragment ? `#${fragment}` : ""}`;
}

function schemaAtRef(
  schemaRef: string,
  fromFile?: string,
): ResolvedProtocolSchema | undefined {
  const canonicalRef = normalizeProtocolRef(schemaRef, fromFile);
  const [relativePath, fragment = ""] = canonicalRef.split("#", 2);
  if (!relativePath) return undefined;
  const fullPath = path.join(PROTOCOL_CONTRACT_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return undefined;
  const schema = JSON.parse(fs.readFileSync(fullPath, "utf8")) as JsonObject;
  if (!fragment) return { canonicalRef, schema, node: schema, relativePath };
  const parts = fragment
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  let node: unknown = schema;
  for (const part of parts) {
    if (!node || typeof node !== "object" || Array.isArray(node))
      return undefined;
    node = (node as JsonObject)[part];
  }
  return { canonicalRef, schema, node, relativePath };
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

function inspectProtocolRegistry(errors: string[]) {
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
    registry.expected.crossProcessCapabilities !== 119 ||
    registry.expected.deterministicWorkerOperations !== 15
  ) {
    errors.push("protocol_registry_expected_counts_invalid");
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
  const schemaFiles = protocolSchemaFiles();
  const schemaDocuments = schemaFiles.map((relativePath) => ({
    relativePath,
    document: readProtocolJson(relativePath),
  }));
  const schemaIds = new Set<string>();
  const protocolAjv = new Ajv2020({ strict: true, allErrors: true });
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
  const protocolCases = registry.corpora.flatMap((relativePath) => {
    const document = readProtocolJson(relativePath);
    return Array.isArray(document.cases)
      ? (document.cases as unknown as ProtocolCorpusCase[])
      : [];
  });
  const caseIds = protocolCases.map((entry) => entry.id);
  for (const duplicate of duplicateStrings(caseIds)) {
    errors.push(`protocol_corpus_case_duplicate:${duplicate}`);
  }
  const validator = (schemaRef: string) => {
    const resolved = schemaAtRef(schemaRef);
    const schemaId = resolved?.schema.$id;
    const fragment = schemaRef.split("#", 2)[1] || "";
    return typeof schemaId === "string"
      ? protocolAjv.getSchema(`${schemaId}#${fragment}`)
      : undefined;
  };
  for (const corpusCase of protocolCases) {
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
    if (!corpusCase.valid) continue;
    const nestedObjectPaths: Array<Array<string | number>> = [];
    const collect = (value: unknown, path: Array<string | number>) => {
      if (Array.isArray(value)) {
        value.forEach((entry, index) => collect(entry, [...path, index]));
      } else if (value && typeof value === "object") {
        if (path.length > 0) nestedObjectPaths.push(path);
        for (const [field, entry] of Object.entries(value)) {
          collect(entry, [...path, field]);
        }
      }
    };
    collect(corpusCase.value, []);
    nestedObjectPaths.forEach((pathParts, index) => {
      const mutation = structuredClone(corpusCase.value) as unknown;
      let target = mutation as JsonObject | unknown[];
      for (const part of pathParts) {
        target = (target as Record<string | number, JsonObject | unknown[]>)[
          part
        ];
      }
      if (!Array.isArray(target)) {
        (target as JsonObject).__unexpected = true;
        if (validate(mutation)) {
          errors.push(
            `protocol_generated_negative_admitted:${corpusCase.id}:${index}`,
          );
        }
      }
    });
  }
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
  };
}

function readJson(relativePath: string) {
  return JSON.parse(
    fs.readFileSync(path.join(CONTRACT_SET_ROOT, relativePath), "utf8"),
  ) as JsonObject;
}

function sortedFiles(relativeDir: string) {
  return fs
    .readdirSync(path.join(CONTRACT_SET_ROOT, relativeDir), {
      withFileTypes: true,
    })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => `${relativeDir}/${entry.name}`)
    .sort();
}

function sameStrings(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function rebuildFrozenV1RuntimePointer(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "Invalid Synthesis sidecar runtime bundle: pointer_not_object",
    );
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== "bundleId" || keys[1] !== "schema") {
    throw new Error(
      "Invalid Synthesis sidecar runtime bundle: pointer_unknown_field",
    );
  }
  if (
    record.schema !== "synthesis-sidecar-runtime-pointer.v1" ||
    typeof record.bundleId !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.bundleId)
  ) {
    throw new Error(
      "Invalid Synthesis sidecar runtime bundle: pointer_schema_invalid",
    );
  }
  return {
    schema: "synthesis-sidecar-runtime-pointer.v1",
    bundleId: record.bundleId,
  };
}

function rebuildFrozenV1SidecarOwner(value: unknown) {
  const invalid = () => {
    throw new SynthesisClientError(
      "invalid_request",
      "Frozen v1 owner corpus entry is invalid",
    );
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid();
  }
  const record = value as Record<string, unknown>;
  if (
    !sameStrings(Object.keys(record).sort(), [
      "createdAtMs",
      "leaseNonce",
      "pid",
      "profileId",
      "schema",
      "serviceInstanceId",
      "supervisorInstanceId",
    ]) ||
    record.schema !== "synthesis-sidecar-owner.v1" ||
    typeof record.profileId !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.profileId) ||
    !["supervisorInstanceId", "serviceInstanceId", "leaseNonce"].every(
      (field) =>
        typeof record[field] === "string" &&
        /^[A-Za-z0-9._:-]+$/.test(record[field]),
    ) ||
    !Number.isSafeInteger(record.pid) ||
    Number(record.pid) < 2 ||
    !Number.isSafeInteger(record.createdAtMs) ||
    Number(record.createdAtMs) < 0
  ) {
    return invalid();
  }
  return {
    schema: "synthesis-sidecar-owner.v1",
    profileId: record.profileId,
    supervisorInstanceId: record.supervisorInstanceId,
    serviceInstanceId: record.serviceInstanceId,
    leaseNonce: record.leaseNonce,
    pid: record.pid,
    createdAtMs: record.createdAtMs,
  };
}

function stableErrorCode(error: unknown) {
  if (
    error instanceof SynthesisClientError ||
    error instanceof SynthesisCanonicalJsonError ||
    error instanceof ComputeWorkerPoolError
  ) {
    return error.code;
  }
  if (error instanceof SyntaxError) return "malformed_json";
  const match = /runtime bundle: ([A-Za-z0-9_]+)/.exec(String(error));
  return match?.[1] || "unknown_error";
}

async function runOracle(oracle: string, inputJson: string) {
  const input = JSON.parse(inputJson) as unknown;
  switch (oracle) {
    case "canonicalJson":
      canonicalizeSynthesisContractJson(input);
      return input;
    case "sidecarCallRequest":
      return rebuildSynthesisSidecarCallRequest(input);
    case "sidecarOwner":
      return rebuildFrozenV1SidecarOwner(input);
    case "runtimePointer":
      return rebuildFrozenV1RuntimePointer(input);
    case "transferSnapshot":
      return rebuildSynthesisSidecarTransferSnapshot(input);
    case "citationGraphMetricsRequest":
      return rebuildSynthesisCitationGraphMetricsRequest(input);
    case "citationGraphLayoutRequest":
      return rebuildSynthesisCitationGraphLayoutRequest(input);
    case "citationGraphMetricsResult":
      return computeSynthesisCitationGraphMetrics(
        rebuildSynthesisCitationGraphMetricsRequest(input),
      );
    case "tagVocabularyValidationResult": {
      const request = rebuildSynthesisTagVocabularyValidationRequest(input);
      return createInProcessSynthesisTagVocabularyEngine().validate(request);
    }
    case "conceptKbQueryResult": {
      const request = rebuildSynthesisConceptKbQueryRequest(input);
      return createInProcessSynthesisConceptKbIndexEngine().query(request);
    }
    case "topicGraphIndexResult": {
      const request = rebuildSynthesisTopicGraphIndexRequest(input);
      return createInProcessSynthesisTopicGraphIndexEngine().buildIndex(
        request,
      );
    }
    default:
      throw new Error(`unknown_oracle:${oracle}`);
  }
}

function validatorForRef(
  ajv: Ajv2020,
  schemas: Map<string, JsonObject>,
  schemaRef: string,
): ValidateFunction | undefined {
  const [schemaPath, fragment = ""] = schemaRef.split("#", 2);
  const schema = schemas.get(schemaPath);
  const id = typeof schema?.$id === "string" ? schema.$id : "";
  return id ? ajv.getSchema(`${id}#${fragment}`) : undefined;
}

async function checkRustDeterministicParity(args: {
  ajv: Ajv2020;
  schemas: Map<string, JsonObject>;
  positiveCases: PositiveCase[];
  errors: string[];
}) {
  const findInput = (oracle: string) => {
    const corpusCase = args.positiveCases.find(
      (entry) => entry.oracle === oracle,
    );
    if (!corpusCase) throw new Error(`corpus_oracle_missing:${oracle}`);
    return JSON.parse(corpusCase.inputJson) as Record<string, unknown>;
  };

  const tagValidation = rebuildSynthesisTagVocabularyValidationRequest(
    findInput("tagVocabularyValidationResult"),
  );
  const tagIndex = rebuildSynthesisTagVocabularyIndexRequest({
    ...tagValidation,
    algorithmVersion: "tag-vocabulary-index.v1",
    sourceManifestHash: `sha256:${"a".repeat(64)}`,
    rebuiltAt: "2026-07-19T00:00:00.000Z",
  });
  const conceptQuery = rebuildSynthesisConceptKbQueryRequest(
    findInput("conceptKbQueryResult"),
  );
  const { labels: _labels, ...conceptSource } = conceptQuery;
  const conceptIndex = rebuildSynthesisConceptKbIndexRequest({
    ...conceptSource,
    algorithmVersion: "concept-kb-index.v1",
    sourceManifestHash: `sha256:${"b".repeat(64)}`,
    rebuiltAt: "2026-07-19T00:00:00.000Z",
  });
  const topicGraphIndex = rebuildSynthesisTopicGraphIndexRequest(
    findInput("topicGraphIndexResult"),
  );
  const tagEngine = createInProcessSynthesisTagVocabularyEngine();
  const conceptEngine = createInProcessSynthesisConceptKbIndexEngine();
  const topicEngine = createInProcessSynthesisTopicGraphIndexEngine();
  const topicArtifactEngine =
    createInProcessSynthesisTopicStructuredArtifactEngine();
  const referenceBinding = rebuildSynthesisReferenceBindingRequest({
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "reference-binding.v1",
    policyId: "production",
    papers: [
      {
        paperRef: "1:A",
        title: "Exact Reference Matching Work",
        authors: ["Alpha"],
        identifiers: [{ kind: "doi", value: "10.1000/exact" }],
      },
    ],
    references: [
      {
        canonicalReferenceId: "canonical:1",
        reference: {
          title: "Exact Reference Matching Work",
          rawReference: "doi:10.1000/exact",
        },
      },
    ],
  });
  const referenceDedupe = rebuildSynthesisReferenceDedupeRequest({
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "canonical-cluster-dedupe.v1",
    canonicals: [
      "Robust object detection for small targets",
      "Robust object detection for small target",
      "Robust object detection of small targets",
    ].map((title, index) => ({
      canonicalReferenceId: `canonical:${index}`,
      title,
      normalizedTitle: "",
      year: "2024",
      authors: ["Alpha"],
      acceptedBinding: false,
      stickyRepresentative: false,
      rawReferenceIds: [`raw:${index}`],
      rawHashes: [`hash:${index}`],
      rawReferences: [title],
      sourceRefs: [`1:${index}`],
      identifiers: [],
      titleCandidates: [],
    })),
  });
  const topicManifest = rebuildSynthesisTopicManifestValidationRequest({
    contractVersion: "synthesis-topic-structured-artifact.v1",
    algorithmVersion: "topic-analysis-manifest-validation.v1",
    manifest: {},
  });
  const topicAssembly = rebuildSynthesisTopicArtifactAssemblyRequest({
    contractVersion: "synthesis-topic-structured-artifact.v1",
    algorithmVersion: "topic-structured-artifact-assembly.v1",
    manifest: { language: "en" },
    sections: { topic: { title: "Contract parity" } },
  });
  const topicValidation = rebuildSynthesisTopicArtifactValidationRequest({
    contractVersion: "synthesis-topic-structured-artifact.v1",
    algorithmVersion: "topic-structured-artifact-validation.v1",
    artifact: { schema_id: "invalid" },
  });
  const topicPatch = rebuildSynthesisTopicSectionPatchRequest({
    contractVersion: "synthesis-topic-structured-artifact.v1",
    algorithmVersion: "topic-section-patch.v1",
    currentManifest: { section_hashes: { claims: "sha256:old" } },
    currentSections: { claims: [{ id: "old" }] },
    patchManifest: {
      base: {
        read_section_hashes: { claims: "sha256:old" },
        replace_section_hashes: { claims: "sha256:old" },
      },
      patch: { sections: { claims: { hash: "sha256:new" } } },
    },
    changedSections: { claims: [{ id: "new" }] },
  });
  const graphBuild = rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "full", sourceIds: [] },
    rolePriority: [],
    libraryNodes: [
      { nodeId: "paper:A", title: "Contract parity", authors: [], aliases: [] },
    ],
    references: [],
  });
  const graphLayout = rebuildSynthesisCitationGraphLayoutRequest({
    graphHash: `sha256:${"c".repeat(64)}`,
    algorithm: "components",
    nodes: [
      {
        nodeId: "paper:B",
        kind: "library_paper",
        initialX: 1,
        initialY: 1,
      },
      {
        nodeId: "paper:A",
        kind: "library_paper",
        initialX: 0,
        initialY: 0,
      },
    ],
    edges: [
      {
        edgeId: "edge:A-B",
        source: "paper:A",
        target: "paper:B",
      },
    ],
  });
  const graphEngine = createInProcessSynthesisCitationGraphBuildEngine();
  const pool = createSynthesisSidecarComputeWorkerPool();
  const cases = [
    {
      id: "tag-vocabulary-validation",
      schemaRef:
        "schemas/compute.schema.json#/$defs/tagVocabularyValidationResult",
      typescript: () => tagEngine.validate(tagValidation),
      rust: () => pool.runTagVocabularyValidation(tagValidation),
    },
    {
      id: "tag-vocabulary-index",
      schemaRef: "schemas/compute.schema.json#/$defs/tagVocabularyIndexResult",
      typescript: () => tagEngine.buildIndex(tagIndex),
      rust: () => pool.runTagVocabularyIndex(tagIndex),
    },
    {
      id: "concept-kb-index",
      schemaRef: "schemas/compute.schema.json#/$defs/conceptKbIndexResult",
      typescript: () => conceptEngine.buildIndex(conceptIndex),
      rust: () => pool.runConceptKbIndex(conceptIndex),
    },
    {
      id: "concept-kb-query",
      schemaRef: "schemas/compute.schema.json#/$defs/conceptKbQueryResult",
      typescript: () => conceptEngine.query(conceptQuery),
      rust: () => pool.runConceptKbQuery(conceptQuery),
    },
    {
      id: "topic-graph-index",
      schemaRef: "schemas/compute.schema.json#/$defs/topicGraphIndexResult",
      typescript: () => topicEngine.buildIndex(topicGraphIndex),
      rust: () => pool.runTopicGraphIndex(topicGraphIndex),
    },
    {
      id: "reference-binding",
      schemaRef: "schemas/compute.schema.json#/$defs/versionedDomainResult",
      typescript: () => computeSynthesisReferenceBinding(referenceBinding),
      rust: () => pool.runReferenceBinding(referenceBinding),
    },
    {
      id: "reference-canonical-dedupe",
      schemaRef: "schemas/compute.schema.json#/$defs/versionedDomainResult",
      typescript: () => computeSynthesisReferenceDedupe(referenceDedupe),
      rust: () => pool.runReferenceCanonicalDedupe(referenceDedupe),
    },
    {
      id: "topic-manifest-validation",
      schemaRef: "schemas/compute.schema.json#/$defs/versionedDomainResult",
      typescript: () => topicArtifactEngine.validateManifest(topicManifest),
      rust: () => pool.runTopicManifestValidation(topicManifest),
    },
    {
      id: "topic-artifact-assembly",
      schemaRef: "schemas/compute.schema.json#/$defs/versionedDomainResult",
      typescript: () => topicArtifactEngine.assembleArtifact(topicAssembly),
      rust: () => pool.runTopicArtifactAssembly(topicAssembly),
    },
    {
      id: "topic-artifact-validation",
      schemaRef: "schemas/compute.schema.json#/$defs/versionedDomainResult",
      typescript: () => topicArtifactEngine.validateArtifact(topicValidation),
      rust: () => pool.runTopicArtifactValidation(topicValidation),
    },
    {
      id: "topic-section-patch",
      schemaRef: "schemas/compute.schema.json#/$defs/versionedDomainResult",
      typescript: () => topicArtifactEngine.applySectionPatch(topicPatch),
      rust: () => pool.runTopicSectionPatch(topicPatch),
    },
    {
      id: "citation-graph-build",
      schemaRef: "schemas/compute.schema.json#/$defs/graphBuildResult",
      typescript: () => graphEngine.compute(graphBuild),
      rust: () => pool.runCitationGraphBuild(graphBuild),
    },
  ];

  try {
    try {
      const first = await pool.runCitationGraphLayout(graphLayout);
      const second = await pool.runCitationGraphLayout(graphLayout);
      const third = await pool.runCitationGraphLayout(graphLayout);
      if (
        canonicalizeSynthesisContractJson(first) !==
          canonicalizeSynthesisContractJson(second) ||
        canonicalizeSynthesisContractJson(second) !==
          canonicalizeSynthesisContractJson(third) ||
        hashSynthesisContractCanonicalJson(first) !==
          hashSynthesisContractCanonicalJson(second) ||
        hashSynthesisContractCanonicalJson(second) !==
          hashSynthesisContractCanonicalJson(third)
      ) {
        args.errors.push("rust_result_mismatch:citation-graph-layout");
      }
      const validate = validatorForRef(
        args.ajv,
        args.schemas,
        "schemas/compute.schema.json#/$defs/layoutResult",
      );
      if (!validate) {
        args.errors.push("rust_schema_missing:citation-graph-layout");
      } else if (!validate(first)) {
        args.errors.push("rust_schema_mismatch:citation-graph-layout");
      }
    } catch (error) {
      args.errors.push(
        `rust_oracle_failed:citation-graph-layout:${stableErrorCode(error)}`,
      );
    }
    for (const parityCase of cases) {
      try {
        const [typescriptResult, rustResult] = await Promise.all([
          parityCase.typescript(),
          parityCase.rust(),
        ]);
        const typescriptCanonical =
          canonicalizeSynthesisContractJson(typescriptResult);
        const rustCanonical = canonicalizeSynthesisContractJson(rustResult);
        if (typescriptCanonical !== rustCanonical) {
          args.errors.push(`rust_result_mismatch:${parityCase.id}`);
        }
        if (
          hashSynthesisContractCanonicalJson(typescriptResult) !==
          hashSynthesisContractCanonicalJson(rustResult)
        ) {
          args.errors.push(`rust_hash_mismatch:${parityCase.id}`);
        }
        const validate = validatorForRef(
          args.ajv,
          args.schemas,
          parityCase.schemaRef,
        );
        if (!validate) {
          args.errors.push(`rust_schema_missing:${parityCase.id}`);
        } else {
          if (!validate(typescriptResult)) {
            args.errors.push(`typescript_schema_mismatch:${parityCase.id}`);
          }
          if (!validate(rustResult)) {
            args.errors.push(`rust_schema_mismatch:${parityCase.id}`);
          }
        }
      } catch (error) {
        args.errors.push(
          `rust_oracle_failed:${parityCase.id}:${stableErrorCode(error)}`,
        );
      }
    }
  } finally {
    await pool.shutdown();
  }
}

export async function checkSynthesisCrossLanguageContracts(): Promise<SynthesisCrossLanguageContractCheck> {
  const errors: string[] = [];
  const protocol = inspectProtocolRegistry(errors);
  const manifest = readJson("manifest.json") as Manifest;
  const expectedSchemas = manifest.schemas.map((entry) => entry.path).sort();
  const expectedCorpora = manifest.corpora.map((entry) => entry.path).sort();
  if (!sameStrings(expectedSchemas, sortedFiles("schemas"))) {
    errors.push("schema_inventory_mismatch");
  }
  if (!sameStrings(expectedCorpora, sortedFiles("corpus"))) {
    errors.push("corpus_inventory_mismatch");
  }
  if (
    manifest.jsonSchemaDialect !==
    "https://json-schema.org/draft/2020-12/schema"
  ) {
    errors.push("schema_dialect_invalid");
  }

  const ajv = new Ajv2020({ strict: true, allErrors: true });
  const schemas = new Map<string, JsonObject>();
  const definitionRefs: string[] = [];
  for (const entry of manifest.schemas) {
    const schema = readJson(entry.path);
    schemas.set(entry.path, schema);
    const definitions = Object.keys((schema.$defs as JsonObject) || {}).sort();
    const listed = [...entry.definitions].sort();
    if (!sameStrings(definitions, listed)) {
      errors.push(`definition_inventory_mismatch:${entry.path}`);
    }
    for (const definition of listed) {
      definitionRefs.push(`${entry.path}#/$defs/${definition}`);
    }
    try {
      ajv.addSchema(schema);
    } catch (error) {
      errors.push(`schema_invalid:${entry.path}:${String(error)}`);
    }
  }

  const mappedRefs = Object.values(manifest.capabilities).flat();
  const duplicateRefs = mappedRefs.filter(
    (value, index) => mappedRefs.indexOf(value) !== index,
  );
  if (duplicateRefs.length) errors.push("capability_definition_duplicate");
  if (!sameStrings([...definitionRefs].sort(), [...mappedRefs].sort())) {
    errors.push("capability_definition_inventory_mismatch");
  }

  const positiveCorpus = readJson("corpus/positive.json") as unknown as {
    version: string;
    cases: PositiveCase[];
  };
  const negativeCorpus = readJson("corpus/negative.json") as unknown as {
    version: string;
    cases: NegativeCase[];
  };
  const corpusVersions = new Map(
    manifest.corpora.map((entry) => [entry.path, entry.version]),
  );
  if (
    corpusVersions.get("corpus/positive.json") !== positiveCorpus.version ||
    corpusVersions.get("corpus/negative.json") !== negativeCorpus.version
  ) {
    errors.push("corpus_version_mismatch");
  }

  const caseIds = [
    ...positiveCorpus.cases.map((entry) => entry.id),
    ...negativeCorpus.cases.map((entry) => entry.id),
  ];
  if (new Set(caseIds).size !== caseIds.length)
    errors.push("corpus_case_duplicate");

  for (const corpusCase of positiveCorpus.cases) {
    try {
      const output = await runOracle(corpusCase.oracle, corpusCase.inputJson);
      if (
        canonicalizeSynthesisContractJson(output) !==
        canonicalizeSynthesisContractJson(corpusCase.output)
      ) {
        errors.push(`positive_output_mismatch:${corpusCase.id}`);
      }
      const canonical = canonicalizeSynthesisContractJson(output);
      if (canonical !== corpusCase.canonicalJson) {
        errors.push(`positive_canonical_mismatch:${corpusCase.id}`);
      }
      if (hashSynthesisContractCanonicalJson(output) !== corpusCase.sha256) {
        errors.push(`positive_hash_mismatch:${corpusCase.id}`);
      }
      const validate = validatorForRef(ajv, schemas, corpusCase.schemaRef);
      if (!validate) {
        errors.push(`positive_schema_missing:${corpusCase.id}`);
      } else if (!validate(output)) {
        errors.push(`positive_schema_mismatch:${corpusCase.id}`);
      }
    } catch (error) {
      errors.push(
        `positive_oracle_failed:${corpusCase.id}:${stableErrorCode(error)}`,
      );
    }
  }

  for (const corpusCase of negativeCorpus.cases) {
    if (corpusCase.schemaRef) {
      const validate = validatorForRef(ajv, schemas, corpusCase.schemaRef);
      if (!validate) {
        errors.push(`negative_schema_missing:${corpusCase.id}`);
      } else if (validate(JSON.parse(corpusCase.inputJson))) {
        errors.push(`negative_schema_admitted:${corpusCase.id}`);
      }
      continue;
    }
    try {
      await runOracle(corpusCase.oracle, corpusCase.inputJson);
      errors.push(`negative_case_admitted:${corpusCase.id}`);
    } catch (error) {
      const actual = stableErrorCode(error);
      if (actual !== corpusCase.errorCode) {
        errors.push(
          `negative_error_mismatch:${corpusCase.id}:${actual}:${corpusCase.errorCode}`,
        );
      }
    }
  }

  const observationCorpus = JSON.parse(
    fs.readFileSync(SIDECAR_OBSERVATION_CORPUS, "utf8"),
  ) as {
    schema: string;
    positive: Array<{ id: string; value: unknown }>;
    negative: Array<{ id: string; value: unknown }>;
  };
  if (observationCorpus.schema !== "synthesis-sidecar-observation-corpus.v2") {
    errors.push("sidecar_observation_corpus_schema_invalid");
  }
  for (const corpusCase of observationCorpus.positive) {
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
  for (const corpusCase of observationCorpus.negative) {
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

  await checkRustDeterministicParity({
    ajv,
    schemas,
    positiveCases: positiveCorpus.cases,
    errors,
  });

  const fingerprintInput = {
    protocolRegistry: protocol.registry,
    protocolSchemas: protocol.schemaDocuments,
    protocolCorpora: protocol.corpusDocuments,
    manifest,
    schemas: manifest.schemas.map((entry) => ({
      path: entry.path,
      document: schemas.get(entry.path),
    })),
    corpora: manifest.corpora.map((entry) => ({
      path: entry.path,
      document: readJson(entry.path),
    })),
    sidecarObservation: observationCorpus,
  };
  return {
    ok: errors.length === 0,
    contractSetVersion: manifest.contractSetVersion,
    schemaCount: manifest.schemas.length,
    definitionCount: definitionRefs.length,
    positiveCaseCount:
      positiveCorpus.cases.length + observationCorpus.positive.length,
    negativeCaseCount:
      negativeCorpus.cases.length + observationCorpus.negative.length,
    protocolCapabilityCount: protocol.protocolCapabilityCount,
    workerOperationCount: protocol.workerOperationCount,
    unauthorizedGenericEscapeCount: protocol.unauthorizedGenericEscapeCount,
    protocolPositiveCaseCount: protocol.protocolPositiveCaseCount,
    protocolNegativeCaseCount: protocol.protocolNegativeCaseCount,
    fingerprint: hashSynthesisContractCanonicalJson(fingerprintInput),
    errors,
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
