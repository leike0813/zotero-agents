import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020";
import capabilityContractJson from "../../host-bridge/contracts/capabilities.v2.json";
import capabilityContractSchema from "../../schemas/host-bridge-capabilities.v2.schema.json";
import type {
  HostBridgeApprovalRequirement,
  HostBridgeCapabilityCategory,
} from "./hostBridgeProtocol";

export type HostBridgeRequestEffect = "read" | "state-change";

export type HostBridgeCapabilityExposure = {
  public: boolean;
  debugOnly: boolean;
  dangerous: boolean;
  cacheView: boolean;
  rawOnly: boolean;
  mcpMirror: boolean;
  responseSizing:
    | "paged"
    | "limit-bounded"
    | "selector-bounded"
    | "file-output"
    | "bounded-diagnostic"
    | "unclassified";
};

export type HostBridgeCapabilityContractEntry = {
  category: HostBridgeCapabilityCategory;
  summary: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  effect: HostBridgeRequestEffect;
  approval: HostBridgeApprovalRequirement;
  exposure: HostBridgeCapabilityExposure;
};

export type HostBridgeCapabilityContract = {
  schema: "host-bridge.capabilities.v2";
  protocol: "host-bridge.v2";
  capabilities: Record<string, HostBridgeCapabilityContractEntry>;
};

export type HostBridgeContractViolation = {
  reason: string;
  path?: string;
  schemaPath?: string;
  expected?: unknown;
  actualType?: string;
  property?: string;
  suggestions?: string[];
};

const contract = capabilityContractJson as HostBridgeCapabilityContract;
const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  logger: false,
});
const validateContract = ajv.compile(
  capabilityContractSchema as Record<string, unknown>,
);

if (!validateContract(contract)) {
  throw new Error(
    `Invalid Host Bridge capability contract: ${ajv.errorsText(
      validateContract.errors,
    )}`,
  );
}

const inputValidators = new Map<string, ValidateFunction>();
const outputValidators = new Map<string, ValidateFunction>();
for (const [name, entry] of Object.entries(contract.capabilities)) {
  inputValidators.set(name, ajv.compile(entry.inputSchema));
  outputValidators.set(name, ajv.compile(entry.outputSchema));
}

function valueType(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function propertySuggestions(
  property: string,
  schema: Record<string, unknown>,
) {
  const properties =
    schema.properties &&
    typeof schema.properties === "object" &&
    !Array.isArray(schema.properties)
      ? Object.keys(schema.properties)
      : [];
  const lowered = property.toLowerCase();
  return properties
    .filter((candidate) => {
      const candidateLowered = candidate.toLowerCase();
      return (
        candidateLowered.includes(lowered) ||
        lowered.includes(candidateLowered) ||
        candidateLowered[0] === lowered[0]
      );
    })
    .slice(0, 3);
}

function violationFromAjv(
  error: ErrorObject,
  value: unknown,
  schema: Record<string, unknown>,
): HostBridgeContractViolation {
  const property =
    error.keyword === "additionalProperties"
      ? String(error.params.additionalProperty || "")
      : error.keyword === "required"
        ? String(error.params.missingProperty || "")
        : "";
  const expected =
    error.keyword === "type"
      ? error.params.type
      : error.keyword === "enum"
        ? error.params.allowedValues
        : undefined;
  const suggestions =
    property && error.keyword === "additionalProperties"
      ? propertySuggestions(property, schema)
      : [];
  return {
    reason: error.keyword,
    ...(error.instancePath ? { path: error.instancePath } : {}),
    ...(error.schemaPath ? { schemaPath: error.schemaPath } : {}),
    ...(expected !== undefined ? { expected } : {}),
    actualType: valueType(value),
    ...(property ? { property } : {}),
    ...(suggestions.length ? { suggestions } : {}),
  };
}

function validate(
  validator: ValidateFunction | undefined,
  value: unknown,
  schema: Record<string, unknown>,
) {
  if (!validator) {
    return [
      {
        reason: "capability_not_registered",
      },
    ] satisfies HostBridgeContractViolation[];
  }
  if (validator(value)) {
    return [];
  }
  return (validator.errors || [])
    .map((error) => violationFromAjv(error, value, schema))
    .sort((left, right) =>
      `${left.path || ""}\n${left.reason}\n${left.property || ""}`.localeCompare(
        `${right.path || ""}\n${right.reason}\n${right.property || ""}`,
      ),
    )
    .slice(0, 8);
}

export function listHostBridgeCapabilityContractEntries() {
  return Object.entries(contract.capabilities).map(([name, entry]) => ({
    name,
    ...entry,
  }));
}

export function getHostBridgeCapabilityContract(
  name: string,
): HostBridgeCapabilityContractEntry | null {
  return contract.capabilities[name] || null;
}

export function validateHostBridgeCapabilityInput(
  name: string,
  value: unknown,
) {
  const entry = getHostBridgeCapabilityContract(name);
  return entry
    ? validate(inputValidators.get(name), value ?? {}, entry.inputSchema)
    : [{ reason: "capability_not_registered" }];
}

export function validateHostBridgeCapabilityOutput(
  name: string,
  value: unknown,
) {
  const entry = getHostBridgeCapabilityContract(name);
  return entry
    ? validate(outputValidators.get(name), value ?? null, entry.outputSchema)
    : [{ reason: "capability_not_registered" }];
}

export const HOST_BRIDGE_CAPABILITY_CONTRACT_SCHEMA = contract.schema;
