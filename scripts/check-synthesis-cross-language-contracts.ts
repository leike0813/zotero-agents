import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import {
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../packages/synthesis-contracts/src/canonicalJson.js";
import { SynthesisClientError } from "../packages/synthesis-contracts/src/common.js";
import { rebuildSynthesisSidecarObservationEvent } from "../packages/synthesis-contracts/src/sidecarObservability.js";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
} from "../packages/synthesis-contracts/src/sidecarSystem.js";
import { SYNTHESIS_REVERSE_HOST_CAPABILITIES } from "../packages/synthesis-contracts/src/sidecarProduction.js";
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
  for (const document of registry.documents) {
    unauthorizedGenericEscapeCount += inspectRecursiveShape(
      document.schemaRef,
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

function stableErrorCode(error: unknown) {
  return error instanceof SynthesisClientError ? error.code : "unknown_error";
}

export async function checkSynthesisCrossLanguageContracts(): Promise<SynthesisCrossLanguageContractCheck> {
  const errors: string[] = [];
  const protocol = inspectProtocolRegistry(errors);
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
    ok: errors.length === 0,
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
