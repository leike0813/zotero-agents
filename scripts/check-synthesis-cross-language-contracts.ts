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
import { rebuildSynthesisSidecarCallRequest } from "../packages/synthesis-contracts/src/sidecarSystem.js";
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

export type SynthesisCrossLanguageContractCheck = {
  ok: boolean;
  contractSetVersion: string;
  schemaCount: number;
  definitionCount: number;
  positiveCaseCount: number;
  negativeCaseCount: number;
  fingerprint: string;
  errors: string[];
};

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
    canonicals: ["a", "b"].map((id) => ({
      canonicalReferenceId: `canonical:${id}`,
      title: "Exact Reference Matching Work",
      normalizedTitle: "exact reference matching work",
      year: "2024",
      authors: ["Alpha"],
      acceptedBinding: false,
      stickyRepresentative: id === "a",
      rawReferenceIds: [`raw:${id}`],
      rawHashes: [`hash:${id}`],
      rawReferences: ["Exact Reference Matching Work"],
      sourceRefs: [`1:${id.toUpperCase()}`],
      identifiers: [{ kind: "doi", value: "10.1000/exact" }],
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
