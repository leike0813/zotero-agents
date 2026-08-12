import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";

import registry from "../contract-set/synthesis-sidecar-protocol-v1/registry.json" with { type: "json" };
import artifactLibraryDebugSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/client-artifact-library-debug.schema.json" with { type: "json" };
import citationGraphSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/client-citation-graph.schema.json" with { type: "json" };
import conceptTopicGraphSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/client-concept-topic-graph.schema.json" with { type: "json" };
import referenceCanonicalSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json" with { type: "json" };
import tagSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/client-tag.schema.json" with { type: "json" };
import topicWorkbenchSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json" with { type: "json" };
import workflowReviewSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/client-workflow-review.schema.json" with { type: "json" };
import webDavMaintenanceSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json" with { type: "json" };
import commonSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json" with { type: "json" };
import computeSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/compute.schema.json" with { type: "json" };
import reverseHostSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json" with { type: "json" };
import systemSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/system.schema.json" with { type: "json" };
import topicDomainSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json" with { type: "json" };
import transferSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/transfer.schema.json" with { type: "json" };
import workerSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/worker.schema.json" with { type: "json" };
import lifecycleSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json" with { type: "json" };
import runtimeBundleSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/runtime-bundle.schema.json" with { type: "json" };
import observabilitySchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json" with { type: "json" };
import {
  SynthesisClientError,
  toSynthesisJsonValue,
  type SynthesisJsonObject,
  type SynthesisJsonValue,
} from "./common.js";

const schemas = [
  commonSchema,
  workerSchema,
  topicDomainSchema,
  webDavMaintenanceSchema,
  artifactLibraryDebugSchema,
  citationGraphSchema,
  conceptTopicGraphSchema,
  referenceCanonicalSchema,
  tagSchema,
  topicWorkbenchSchema,
  workflowReviewSchema,
  computeSchema,
  reverseHostSchema,
  systemSchema,
  transferSchema,
  lifecycleSchema,
  runtimeBundleSchema,
  observabilitySchema,
] as const;

const schemaIds = new Map(
  schemas.map((schema) => [schema.$id, schema] as const),
);
const validators = new Map<string, ValidateFunction>();
const schemaIdsByRegistryPath = new Map(
  schemas.map((schema) => [
    `schemas/${schema.$id.slice(schema.$id.lastIndexOf("/") + 1)}`,
    schema.$id,
  ]),
);
const capabilityContracts = new Map(
  registry.capabilities.map((contract) => [contract.capability, contract]),
);
const workerContracts = new Map(
  registry.workers.map((contract) => [contract.operation, contract]),
);
type ProtocolAjv = {
  addSchema(schema: unknown): void;
  getSchema(location: string): ValidateFunction | undefined;
};

const ProtocolAjvConstructor = Ajv2020 as unknown as new (options: {
  strict: boolean;
  allErrors: boolean;
  logger: false;
}) => ProtocolAjv;

let ajv: ProtocolAjv | undefined;

function protocolAjv() {
  if (ajv) return ajv;
  ajv = new ProtocolAjvConstructor({
    strict: true,
    allErrors: true,
    logger: false,
  });
  for (const schema of schemas) ajv.addSchema(schema);
  return ajv;
}

function rebuildProtocolJsonValue(args: {
  value: unknown;
  location: string;
  direction: "request" | "result";
  details?: SynthesisJsonObject;
}) {
  try {
    return toSynthesisJsonValue(args.value, args.location);
  } catch (error) {
    if (
      args.direction === "request" ||
      !(error instanceof SynthesisClientError)
    ) {
      throw error;
    }
    throw new SynthesisClientError(
      "internal",
      "Synthesis protocol result is not JSON-safe",
      { ...args.details, location: args.location },
    );
  }
}

export function rebuildSynthesisProtocolDto<T>(args: {
  schemaId: string;
  definition: string;
  value: unknown;
  direction: "request" | "result";
}): T {
  const schema = schemaIds.get(args.schemaId);
  const location = `${args.schemaId}#/$defs/${args.definition}`;
  if (!schema) {
    throw new SynthesisClientError(
      "internal",
      "Protocol schema is unavailable",
      {
        location,
      },
    );
  }
  const value: SynthesisJsonValue = rebuildProtocolJsonValue({
    value: args.value,
    location,
    direction: args.direction,
  });
  let validate = validators.get(location);
  if (!validate) {
    validate = protocolAjv().getSchema(location);
    if (!validate) {
      throw new SynthesisClientError(
        "internal",
        "Protocol definition is unavailable",
        {
          location,
        },
      );
    }
    validators.set(location, validate);
  }
  if (!validate(value)) {
    throw new SynthesisClientError(
      args.direction === "request" ? "invalid_request" : "internal",
      `Synthesis protocol ${args.direction} is invalid`,
      {
        location,
        violations: (validate.errors ?? []).slice(0, 16).map((error) => ({
          keyword: error.keyword,
          instancePath: error.instancePath,
        })),
      },
    );
  }
  return value as T;
}

function registryLocation(schemaRef: string) {
  const [schemaPath, fragment] = schemaRef.split("#", 2);
  const schemaId = schemaIdsByRegistryPath.get(schemaPath);
  if (!schemaId || !fragment) {
    throw new SynthesisClientError(
      "internal",
      "Protocol registry schema reference is unavailable",
      { schemaRef },
    );
  }
  return `${schemaId}#${fragment}`;
}

export function rebuildSynthesisProtocolCapabilityDto<T>(args: {
  capability: string;
  value: unknown;
  direction: "request" | "result";
}): T {
  const contract = capabilityContracts.get(args.capability);
  if (!contract) {
    throw new SynthesisClientError(
      args.direction === "request" ? "invalid_request" : "internal",
      "Synthesis protocol capability is unavailable",
      { capability: args.capability },
    );
  }
  const location = registryLocation(
    args.direction === "request"
      ? contract.requestSchemaRef
      : contract.resultSchemaRef,
  );
  const value: SynthesisJsonValue = rebuildProtocolJsonValue({
    value: args.value,
    location: `$.${args.capability}.${args.direction}`,
    direction: args.direction,
    details: { capability: args.capability },
  });
  let validate = validators.get(location);
  if (!validate) {
    validate = protocolAjv().getSchema(location);
    if (!validate) {
      throw new SynthesisClientError(
        "internal",
        "Protocol capability definition is unavailable",
        { capability: args.capability, location },
      );
    }
    validators.set(location, validate);
  }
  if (!validate(value)) {
    throw new SynthesisClientError(
      args.direction === "request" ? "invalid_request" : "internal",
      `Synthesis protocol capability ${args.direction} is invalid`,
      {
        capability: args.capability,
        location,
        violations: (validate.errors ?? []).slice(0, 16).map((error) => ({
          keyword: error.keyword,
          instancePath: error.instancePath,
        })),
      },
    );
  }
  return value as T;
}

export function rebuildSynthesisProtocolWorkerDto<T>(args: {
  operation: string;
  part: "runHeader" | "inputSection" | "outputHeader" | "outputSection";
  value: unknown;
}): T {
  const contract = workerContracts.get(args.operation);
  if (!contract) {
    throw new SynthesisClientError(
      "invalid_request",
      "Worker operation is unavailable",
      {
        operation: args.operation,
      },
    );
  }
  const reference = {
    runHeader: contract.runHeaderSchemaRef,
    inputSection: contract.inputSectionSchemaRef,
    outputHeader: contract.outputHeaderSchemaRef,
    outputSection: contract.outputSectionSchemaRef,
  }[args.part];
  const location = registryLocation(reference);
  const value: SynthesisJsonValue = toSynthesisJsonValue(
    args.value,
    `$.worker.${args.operation}.${args.part}`,
  );
  let validate = validators.get(location);
  if (!validate) {
    validate = protocolAjv().getSchema(location);
    if (!validate) {
      throw new SynthesisClientError(
        "internal",
        "Worker protocol definition is unavailable",
        {
          operation: args.operation,
          location,
        },
      );
    }
    validators.set(location, validate);
  }
  if (!validate(value)) {
    throw new SynthesisClientError(
      "invalid_request",
      "Worker protocol DTO is invalid",
      {
        operation: args.operation,
        part: args.part,
        location,
        violations: (validate.errors ?? []).slice(0, 16).map((error) => ({
          keyword: error.keyword,
          instancePath: error.instancePath,
        })),
      },
    );
  }
  return value as T;
}

export const SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/client-topic-workbench.schema.json";
