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
import { rebuildSynthesisSidecarOwner } from "../packages/synthesis-contracts/src/sidecarLifecycle.js";
import { rebuildSynthesisSidecarRuntimePointer } from "../packages/synthesis-contracts/src/sidecarRuntimeBundle.js";
import { rebuildSynthesisSidecarCallRequest } from "../packages/synthesis-contracts/src/sidecarSystem.js";
import { rebuildSynthesisSidecarTransferSnapshot } from "../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  computeSynthesisCitationGraphMetrics,
  rebuildSynthesisCitationGraphMetricsRequest,
} from "../packages/synthesis-engine/src/index.js";

const CONTRACT_SET_ROOT = path.resolve(
  import.meta.dirname,
  "../packages/synthesis-contracts/contract-set/synthesis-cross-language-v1",
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

function stableErrorCode(error: unknown) {
  if (
    error instanceof SynthesisClientError ||
    error instanceof SynthesisCanonicalJsonError
  ) {
    return error.code;
  }
  if (error instanceof SyntaxError) return "malformed_json";
  const match = /runtime bundle: ([A-Za-z0-9_]+)/.exec(String(error));
  return match?.[1] || "unknown_error";
}

function runOracle(oracle: string, inputJson: string) {
  const input = JSON.parse(inputJson) as unknown;
  switch (oracle) {
    case "canonicalJson":
      canonicalizeSynthesisContractJson(input);
      return input;
    case "sidecarCallRequest":
      return rebuildSynthesisSidecarCallRequest(input);
    case "sidecarOwner":
      return rebuildSynthesisSidecarOwner(input);
    case "runtimePointer":
      return rebuildSynthesisSidecarRuntimePointer(input);
    case "transferSnapshot":
      return rebuildSynthesisSidecarTransferSnapshot(input);
    case "citationGraphMetricsRequest":
      return rebuildSynthesisCitationGraphMetricsRequest(input);
    case "citationGraphMetricsResult":
      return computeSynthesisCitationGraphMetrics(
        rebuildSynthesisCitationGraphMetricsRequest(input),
      );
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

export function checkSynthesisCrossLanguageContracts(): SynthesisCrossLanguageContractCheck {
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
      const output = runOracle(corpusCase.oracle, corpusCase.inputJson);
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
    try {
      runOracle(corpusCase.oracle, corpusCase.inputJson);
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
  };
  return {
    ok: errors.length === 0,
    contractSetVersion: manifest.contractSetVersion,
    schemaCount: manifest.schemas.length,
    definitionCount: definitionRefs.length,
    positiveCaseCount: positiveCorpus.cases.length,
    negativeCaseCount: negativeCorpus.cases.length,
    fingerprint: hashSynthesisContractCanonicalJson(fingerprintInput),
    errors,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const result = checkSynthesisCrossLanguageContracts();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
