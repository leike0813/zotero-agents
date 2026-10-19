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
import searchSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/search.schema.json" with { type: "json" };
import citationAnalysisArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json" with { type: "json" };
import sourceReferenceArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json" with { type: "json" };
import literatureScoreArtifactSchema from "../contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json" with { type: "json" };
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
  searchSchema,
  sourceReferenceArtifactSchema,
  citationAnalysisArtifactSchema,
  literatureScoreArtifactSchema,
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
  addKeyword(definition: unknown): void;
  getSchema(location: string): ValidateFunction | undefined;
};

const ProtocolAjvConstructor = Ajv2020 as unknown as new (options: {
  strict: boolean;
  strictTypes: boolean;
  allErrors: boolean;
  logger: false;
}) => ProtocolAjv;

let ajv: ProtocolAjv | undefined;

function protocolAjv() {
  if (ajv) return ajv;
  ajv = new ProtocolAjvConstructor({
    strict: true,
    // Fragments inherit their instance type from the enclosing DTO.
    strictTypes: false,
    allErrors: false,
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

type ProtocolSchemaDocument = Record<string, unknown>;

type ProtocolSchemaLocation = {
  document: ProtocolSchemaDocument;
  node: unknown;
};

function asProtocolRecord(value: unknown): ProtocolSchemaDocument | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as ProtocolSchemaDocument)
    : undefined;
}

function protocolPointerSegment(segment: string) {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function resolveProtocolPointer(document: unknown, fragment: string): unknown {
  const pointer = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  let current = document;
  for (const raw of pointer.split("/").slice(1)) {
    const segment = protocolPointerSegment(raw);
    current = Array.isArray(current)
      ? (current as unknown[])[Number(segment)]
      : asProtocolRecord(current)?.[segment];
    if (current === undefined) return undefined;
  }
  return current;
}

function resolveProtocolSchemaLocation(
  location: string,
): ProtocolSchemaLocation | undefined {
  const hash = location.indexOf("#");
  const document = asProtocolRecord(
    schemaIds.get(hash < 0 ? location : location.slice(0, hash)),
  );
  if (!document) return undefined;
  return {
    document,
    node: resolveProtocolPointer(
      document,
      hash < 0 ? "#" : location.slice(hash),
    ),
  };
}

function resolveProtocolSchemaReference(
  ref: string,
  owner: ProtocolSchemaDocument,
): ProtocolSchemaLocation | undefined {
  const hash = ref.indexOf("#");
  const path = hash < 0 ? ref : ref.slice(0, hash);
  const document = path
    ? asProtocolRecord(
        schemas.find(
          (schema) => schema.$id === path || schema.$id.endsWith(`/${path}`),
        ),
      )
    : owner;
  if (!document) return undefined;
  return {
    document,
    node: resolveProtocolPointer(document, hash < 0 ? "#" : ref.slice(hash)),
  };
}

function dereferencedProtocolSchemas(
  location: ProtocolSchemaLocation,
): ProtocolSchemaLocation[] {
  const resolved: ProtocolSchemaLocation[] = [];
  const queue: ProtocolSchemaLocation[] = [location];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift() as ProtocolSchemaLocation;
    const node = asProtocolRecord(current.node);
    if (!node || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.$ref === "string") {
      const target = resolveProtocolSchemaReference(
        node.$ref,
        current.document,
      );
      if (target) queue.push(target);
      continue;
    }
    resolved.push(current);
    for (const keyword of ["oneOf", "anyOf", "allOf"]) {
      const branches = node[keyword];
      if (!Array.isArray(branches)) continue;
      for (const branch of branches)
        queue.push({ document: current.document, node: branch });
    }
  }
  return resolved;
}

function protocolSchemaStep(
  location: ProtocolSchemaLocation,
  segment: string,
): { fixed: boolean; next: ProtocolSchemaLocation[] } | undefined {
  const node = asProtocolRecord(location.node);
  if (!node) return undefined;
  const items = node.items;
  if (/^\d+$/.test(segment) && items !== undefined) {
    const item: unknown = Array.isArray(items)
      ? (items as unknown[])[Number(segment)]
      : items;
    if (item !== undefined)
      return {
        fixed: true,
        next: [{ document: location.document, node: item }],
      };
  }
  const properties = asProtocolRecord(node.properties);
  if (properties && Object.prototype.hasOwnProperty.call(properties, segment))
    return {
      fixed: true,
      next: [{ document: location.document, node: properties[segment] }],
    };
  const next: ProtocolSchemaLocation[] = [];
  const patterns = asProtocolRecord(node.patternProperties);
  if (patterns)
    for (const [pattern, schema] of Object.entries(patterns)) {
      let matches = false;
      try {
        matches = new RegExp(pattern).test(segment);
      } catch {
        matches = false;
      }
      if (matches) next.push({ document: location.document, node: schema });
    }
  if (asProtocolRecord(node.additionalProperties))
    next.push({ document: location.document, node: node.additionalProperties });
  return next.length > 0 ? { fixed: false, next } : undefined;
}

/**
 * Rewrites an Ajv instance path against the validating schema so declared
 * properties and array indices stay locatable while map user keys collapse to
 * a wildcard; an unresolvable tail truncates at the last known field.
 * shortcut: only $ref/properties/items/patternProperties/additionalProperties/
 * oneOf/anyOf/allOf are walked; another applicator truncates instead, extend
 * when one carries user map keys.
 */
function safeProtocolInstancePath(
  location: string,
  instancePath: string,
): string {
  const target = resolveProtocolSchemaLocation(location);
  const segments = instancePath.split("/").slice(1).map(protocolPointerSegment);
  if (!target || segments.length === 0) return "";
  let candidates: ProtocolSchemaLocation[] = [target];
  const safe: string[] = [];
  for (const segment of segments) {
    const next: ProtocolSchemaLocation[] = [];
    let resolved = false;
    let declared = false;
    for (const candidate of candidates)
      for (const node of dereferencedProtocolSchemas(candidate)) {
        const step = protocolSchemaStep(node, segment);
        if (!step) continue;
        next.push(...step.next);
        resolved = true;
        if (step.fixed) declared = true;
      }
    if (!resolved) break;
    safe.push(declared ? segment : "*");
    candidates = next;
  }
  return safe.length > 0 ? `/${safe.join("/")}` : "";
}

function protocolSchemaViolations(
  location: string,
  errors: readonly { keyword: string; instancePath: string }[],
) {
  return errors.slice(0, 16).map((error) => ({
    keyword: error.keyword,
    instancePath: safeProtocolInstancePath(location, error.instancePath),
  }));
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
        violations: protocolSchemaViolations(location, validate.errors ?? []),
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
        violations: protocolSchemaViolations(location, validate.errors ?? []),
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
        violations: protocolSchemaViolations(location, validate.errors ?? []),
      },
    );
  }
  return value as T;
}

export const SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/client-topic-workbench.schema.json";
