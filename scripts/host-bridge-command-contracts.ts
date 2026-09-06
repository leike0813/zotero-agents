import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";

export type HostBridgeCommandExample = {
  kind: "shape-only" | "executable";
  value: unknown;
  prerequisites: string[];
  description?: string;
};

export type HostBridgeCommandInputContract = {
  token: string;
  required: boolean;
  requiredWhen: string[];
  schemaSource: "inline" | "target-capability" | "composition";
  schema?: Record<string, unknown>;
  examples: HostBridgeCommandExample[];
};

export type HostBridgeCommandComposition = {
  base?: { argument: string };
  constants: Record<string, unknown>;
  mappings: Array<{
    argument: string;
    field: string;
    transform:
      | "identity"
      | "trim-string"
      | "path-string"
      | "context-ref"
      | "context-ref-array"
      | "file-id";
    required: boolean;
    default?: unknown;
  }>;
};

export type HostBridgeResolvedCommandInputContract =
  HostBridgeCommandInputContract & {
    schema: Record<string, unknown>;
  };

export type HostBridgeCommandOutputBoundary = {
  strategy: "fixed" | "cursor" | "offset" | "limit" | "file" | "raw";
  section?: string;
  defaultLimit?: number;
  maxLimit?: number;
  cursorInput?: string;
  continuation?: string[];
  truncatedField?: string;
  fileField?: string;
};

export type HostBridgeCommandTarget =
  | { kind: "local" }
  | {
      kind: "capability";
      capability: string;
      method: "POST";
      path: "/bridge/v2/call";
    }
  | {
      kind: "dynamic-capability";
      method: "POST";
      path: "/bridge/v2/call";
    }
  | {
      kind: "endpoint";
      method: "GET" | "POST";
      path: string;
    };

export type HostBridgeCommandContract = {
  target: HostBridgeCommandTarget;
  auxiliaryTargets?: HostBridgeCommandTarget[];
  binding: "passthrough" | "overlay" | "object" | "none" | "raw";
  composition?: HostBridgeCommandComposition;
  approval: "none" | "zotero-ui-required" | "contract-selected";
  effect: "read" | "state-change" | "contract-selected";
  inputs: Record<string, HostBridgeCommandInputContract>;
  payloadSchemaSource: "inline" | "target-capability";
  payloadSchema: Record<string, unknown>;
  resultSchemaSource: "inline" | "target-capability-envelope";
  resultSchema: Record<string, unknown>;
  outputBoundary: HostBridgeCommandOutputBoundary;
};

type HostBridgeRawCommandContract = Omit<
  HostBridgeCommandContract,
  "payloadSchema" | "resultSchema" | "inputs"
> & {
  inputs: Record<string, HostBridgeCommandInputContract>;
  payloadSchema?: Record<string, unknown>;
  resultSchema?: Record<string, unknown>;
};

export type HostBridgeCommandContractRegistry = {
  schema: "zotero-bridge.command-contracts.v2";
  protocol: "host-bridge.v2";
  cliSchema: "zotero-bridge.cli.v5";
  commands: Record<string, HostBridgeCommandContract>;
};

export type HostBridgeCapabilityContract = {
  schema: "host-bridge.capabilities.v2";
  protocol: "host-bridge.v2";
  capabilities: Record<
    string,
    {
      category: string;
      summary: string;
      inputSchema: Record<string, unknown>;
      outputSchema: Record<string, unknown>;
      effect: "read" | "state-change";
      approval: "none" | "zotero-ui-required";
      exposure: Record<string, unknown>;
    }
  >;
};

type HostBridgeRawCommandContractRegistry = Omit<
  HostBridgeCommandContractRegistry,
  "commands"
> & {
  commands: Record<string, HostBridgeRawCommandContract>;
};

function cloneSchema<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pruneSchemaDefinitions(schema: Record<string, any>) {
  const definitions = schema.$defs;
  if (!definitions || typeof definitions !== "object") return schema;
  const kept = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (key === "$defs") continue;
      if (
        key === "$ref" &&
        typeof entry === "string" &&
        entry.startsWith("#/$defs/")
      ) {
        const name = entry
          .slice(8)
          .split("/")[0]
          .replaceAll("~1", "/")
          .replaceAll("~0", "~");
        if (!kept.has(name)) {
          kept.add(name);
          visit(definitions[name]);
        }
      } else {
        visit(entry);
      }
    }
  };
  visit(schema);
  schema.$defs = Object.fromEntries(
    [...kept].map((name) => [name, definitions[name]]),
  );
  return schema;
}

function schemaAcceptsConstant(
  property: Record<string, any>,
  constant: unknown,
) {
  return (
    (Object.prototype.hasOwnProperty.call(property, "const") &&
      JSON.stringify(property.const) === JSON.stringify(constant)) ||
    (Array.isArray(property.enum) && property.enum.includes(constant))
  );
}

function specializePayloadSchema(
  entry: HostBridgeRawCommandContract,
  source: Record<string, any>,
) {
  const operation = entry.composition?.constants.operation;
  if (operation === undefined || !Array.isArray(source.oneOf)) {
    return pruneSchemaDefinitions(cloneSchema(source));
  }
  const selected = source.oneOf.find((branch: Record<string, any>) =>
    schemaAcceptsConstant(branch.properties?.operation || {}, operation),
  );
  if (!selected) return pruneSchemaDefinitions(cloneSchema(source));
  const specialized = cloneSchema(selected);
  specialized.properties.operation = { const: operation };
  if (source.$defs) specialized.$defs = cloneSchema(source.$defs);
  if (source.unevaluatedProperties === false) {
    specialized.unevaluatedProperties = false;
  }
  return pruneSchemaDefinitions(specialized);
}

function stripComposedFields(schema: Record<string, any>, fields: Set<string>) {
  for (const field of fields) delete schema.properties?.[field];
  if (Array.isArray(schema.required)) {
    schema.required = schema.required.filter(
      (field: string) => !fields.has(field),
    );
  }
  for (const keyword of ["anyOf", "oneOf", "allOf"]) {
    if (!Array.isArray(schema[keyword])) continue;
    if (
      schema[keyword].some((branch: Record<string, any>) =>
        branch.required?.some((field: string) => fields.has(field)),
      )
    ) {
      delete schema[keyword];
    }
  }
  return schema;
}

function compositionInputSchema(
  command: string,
  entry: HostBridgeRawCommandContract,
  argumentId: string,
  payloadSchema: Record<string, any>,
) {
  const composition = entry.composition;
  if (!composition) {
    throw new Error(`${command}:${argumentId} has no executable composition`);
  }
  if (composition.base?.argument === argumentId) {
    return pruneSchemaDefinitions(
      stripComposedFields(
        cloneSchema(payloadSchema),
        new Set([
          ...Object.keys(composition.constants),
          ...composition.mappings.map((mapping) => mapping.field),
        ]),
      ),
    );
  }
  const mapping = composition.mappings.find(
    (candidate) => candidate.argument === argumentId,
  );
  const fieldSchema = mapping
    ? (payloadSchema.properties?.[mapping.field] as
        | Record<string, any>
        | undefined)
    : undefined;
  if (!mapping || !fieldSchema) {
    throw new Error(
      `${command}:${argumentId} does not resolve to a composed payload field`,
    );
  }
  const resolved = cloneSchema(fieldSchema);
  if (payloadSchema.$defs) resolved.$defs = cloneSchema(payloadSchema.$defs);
  return pruneSchemaDefinitions(resolved);
}

function loadValidatedContract<T>(
  root: string,
  contractPath: string,
  metaSchemaPath: string,
  label: string,
) {
  const value = JSON.parse(
    readFileSync(resolve(root, contractPath), "utf8"),
  ) as T;
  const metaSchema = JSON.parse(
    readFileSync(resolve(root, metaSchemaPath), "utf8"),
  ) as Record<string, unknown>;
  const validate = new Ajv2020({
    allErrors: true,
    strict: false,
    logger: false,
  }).compile(metaSchema);
  if (!validate(value)) {
    throw new Error(
      `${label} violates its meta-schema: ${JSON.stringify(validate.errors)}`,
    );
  }
  return value;
}

export function loadHostBridgeCapabilityContracts(
  root = process.cwd(),
): HostBridgeCapabilityContract {
  const contract = loadValidatedContract<HostBridgeCapabilityContract>(
    root,
    "host-bridge/contracts/capabilities.v2.json",
    "schemas/host-bridge-capabilities.v2.schema.json",
    "Host Bridge capability contract",
  );
  if (
    contract.schema !== "host-bridge.capabilities.v2" ||
    contract.protocol !== "host-bridge.v2"
  ) {
    throw new Error("capability contract has inconsistent runtime identities");
  }
  return contract;
}

export function loadHostBridgeCommandContracts(
  root = process.cwd(),
): HostBridgeCommandContractRegistry {
  const registry = loadValidatedContract<HostBridgeRawCommandContractRegistry>(
    root,
    "host-bridge/contracts/cli-commands.v2.json",
    "schemas/host-bridge-cli-command-contracts.v2.schema.json",
    "Zotero Bridge command contract",
  );
  if (registry.schema !== "zotero-bridge.command-contracts.v2") {
    throw new Error(`unexpected command-contract schema: ${registry.schema}`);
  }
  if (
    registry.protocol !== "host-bridge.v2" ||
    registry.cliSchema !== "zotero-bridge.cli.v5"
  ) {
    throw new Error("command contract has inconsistent runtime identities");
  }
  const capabilities = loadHostBridgeCapabilityContracts(root);
  const commands = Object.fromEntries(
    Object.entries(registry.commands).map(([command, entry]) => {
      for (const target of [entry.target, ...(entry.auxiliaryTargets || [])]) {
        if (
          target.kind === "capability" &&
          !capabilities.capabilities[target.capability]
        ) {
          throw new Error(
            `${command} references unknown capability ${target.capability}`,
          );
        }
      }
      const compatibleBinding =
        (entry.target.kind === "local" && entry.binding === "none") ||
        (entry.target.kind === "dynamic-capability" &&
          entry.binding === "raw") ||
        (entry.target.kind === "endpoint" &&
          entry.target.method === "GET" &&
          entry.binding === "none") ||
        ((entry.target.kind === "capability" ||
          (entry.target.kind === "endpoint" &&
            entry.target.method === "POST")) &&
          ["passthrough", "overlay", "object"].includes(entry.binding));
      if (!compatibleBinding) {
        throw new Error(
          `${command} has incompatible target and binding ${entry.binding}`,
        );
      }
      for (const [argumentId, input] of Object.entries(entry.inputs)) {
        if (
          ["target-capability", "composition"].includes(input.schemaSource) &&
          entry.target.kind !== "capability"
        ) {
          throw new Error(
            `${command}:${argumentId} cannot inherit from a non-capability target`,
          );
        }
      }
      if (
        entry.target.kind === "capability" &&
        ["overlay", "object"].includes(entry.binding)
      ) {
        if (!entry.composition) {
          throw new Error(`${command} requires executable composition`);
        }
        if (
          entry.binding === "overlay" &&
          (!entry.composition.base ||
            !entry.inputs[entry.composition.base.argument])
        ) {
          throw new Error(
            `${command} overlay base must name a structured input`,
          );
        }
        const fields = new Set(Object.keys(entry.composition.constants));
        for (const mapping of entry.composition.mappings) {
          if (fields.has(mapping.field)) {
            throw new Error(
              `${command} composes payload field ${mapping.field} more than once`,
            );
          }
          fields.add(mapping.field);
        }
      } else if (entry.composition) {
        throw new Error(
          `${command} declares composition for an incompatible target or binding`,
        );
      }
      let payloadSchema: Record<string, unknown>;
      if (
        entry.payloadSchemaSource === "inline" &&
        entry.payloadSchema &&
        entry.target.kind !== "capability"
      ) {
        payloadSchema = entry.payloadSchema;
      } else if (
        entry.payloadSchemaSource === "target-capability" &&
        entry.target.kind === "capability" &&
        !entry.payloadSchema
      ) {
        const capability = capabilities.capabilities[entry.target.capability];
        if (!capability) {
          throw new Error(
            `${command} references unknown capability ${entry.target.capability}`,
          );
        }
        payloadSchema = specializePayloadSchema(entry, capability.inputSchema);
      } else {
        throw new Error(`${command} has an invalid payload schema source`);
      }
      const inputs = Object.fromEntries(
        Object.entries(entry.inputs).map(([argumentId, input]) => {
          let schema = input.schema;
          if (
            input.schemaSource === "target-capability" &&
            entry.target.kind === "capability"
          ) {
            schema =
              capabilities.capabilities[entry.target.capability].inputSchema;
          } else if (input.schemaSource === "composition") {
            schema = compositionInputSchema(
              command,
              entry,
              argumentId,
              payloadSchema,
            );
          }
          if (!schema) {
            throw new Error(
              `${command}:${argumentId} has no resolved structured input schema`,
            );
          }
          return [argumentId, { ...input, schema }];
        }),
      );

      let resultSchema: Record<string, unknown>;
      if (entry.resultSchemaSource === "inline" && entry.resultSchema) {
        resultSchema = entry.resultSchema;
      } else if (
        entry.resultSchemaSource === "target-capability-envelope" &&
        entry.target.kind === "capability" &&
        !entry.resultSchema
      ) {
        const capability = capabilities.capabilities[entry.target.capability];
        if (!capability) {
          throw new Error(
            `${command} references unknown capability ${entry.target.capability}`,
          );
        }
        resultSchema = {
          type: "object",
          properties: {
            capability: { const: entry.target.capability },
            approval: { type: "string", minLength: 1 },
            data: capability.outputSchema,
          },
          required: ["capability", "approval", "data"],
          additionalProperties: false,
        };
      } else {
        throw new Error(`${command} has an invalid result schema source`);
      }
      return [
        command,
        {
          ...entry,
          inputs,
          payloadSchema,
          resultSchema,
        } satisfies HostBridgeCommandContract,
      ];
    }),
  );
  return { ...registry, commands };
}
