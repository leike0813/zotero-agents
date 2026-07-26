import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  schema: Record<string, unknown>;
  examples: HostBridgeCommandExample[];
};

export type HostBridgeCommandContract = {
  inputs: Record<string, HostBridgeCommandInputContract>;
  payloadSchema: Record<string, unknown>;
  resultSchema: Record<string, unknown>;
  outputBoundary: HostBridgeCommandOutputBoundary;
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

export type HostBridgeCommandContractRegistry = {
  schema: "zotero-bridge.command-contracts.v1";
  commands: Record<string, HostBridgeCommandContract>;
};

function schemaForBoundaryField(field: string) {
  if (field === "hasMore" || field === "truncated") {
    return { type: "boolean" };
  }
  if (field === "nextCursor") {
    return { type: ["string", "null"] };
  }
  if (
    field === "returned" ||
    field === "total" ||
    field === "limit" ||
    field === "offset" ||
    field === "nextOffset" ||
    field === "totalChars" ||
    field === "maxChars"
  ) {
    return { type: "integer", minimum: 0 };
  }
  return { type: "object", additionalProperties: true };
}

function fileDescriptorSchema() {
  return {
    type: "object",
    properties: {
      fileId: { type: "string" },
      displayName: { type: "string" },
      contentType: { type: "string" },
      size: { type: "integer", minimum: 0 },
      sha256: { type: "string" },
      expiresAt: { type: "string" },
    },
    required: ["fileId", "displayName", "contentType", "expiresAt"],
    additionalProperties: false,
  };
}

function ensureSchemaPath(
  root: Record<string, unknown>,
  path: string,
  leafSchema: Record<string, unknown>,
) {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;
  let schema = root;
  for (const [index, part] of parts.entries()) {
    const properties = (schema.properties ||= {}) as Record<
      string,
      Record<string, unknown>
    >;
    if (index === parts.length - 1) {
      properties[part] ||= leafSchema;
      return;
    }
    properties[part] ||= {
      type: "object",
      properties: {},
      additionalProperties: true,
    };
    schema = properties[part];
    schema.properties ||= {};
  }
}

function applyOutputBoundarySchema(
  resultSchema: Record<string, unknown>,
  boundary: HostBridgeCommandOutputBoundary,
) {
  resultSchema.properties ||= {};
  const properties = resultSchema.properties as Record<string, unknown>;
  const capabilityEnvelopeFields = ["capability", "approval", "data"];
  if (
    capabilityEnvelopeFields.every((field) =>
      Object.prototype.hasOwnProperty.call(properties, field),
    )
  ) {
    for (const field of Object.keys(properties)) {
      if (!capabilityEnvelopeFields.includes(field)) {
        delete properties[field];
      }
    }
  }
  const governedPaths = [
    boundary.section,
    boundary.fileField,
    boundary.truncatedField,
    ...(boundary.continuation || []),
  ].filter((value): value is string => Boolean(value));
  for (const path of governedPaths) {
    const parts = path.split(".").filter(Boolean);
    if (parts[0] === "data" && parts[1]) {
      delete properties[parts[1]];
    }
  }
  if (boundary.strategy === "cursor") {
    if (boundary.section && boundary.section !== "pagination") {
      ensureSchemaPath(resultSchema, boundary.section, { type: "array" });
    }
    for (const field of boundary.continuation || []) {
      const leaf = field.split(".").at(-1) || field;
      ensureSchemaPath(resultSchema, field, schemaForBoundaryField(leaf));
    }
  } else if (boundary.strategy === "offset") {
    for (const field of boundary.continuation || []) {
      const leaf = field.split(".").at(-1) || field;
      ensureSchemaPath(resultSchema, field, schemaForBoundaryField(leaf));
    }
  } else if (boundary.strategy === "limit") {
    if (boundary.section) {
      ensureSchemaPath(resultSchema, boundary.section, { type: "array" });
    }
    if (boundary.truncatedField) {
      ensureSchemaPath(resultSchema, boundary.truncatedField, {
        type: "boolean",
      });
    }
    if (boundary.fileField) {
      ensureSchemaPath(
        resultSchema,
        boundary.fileField,
        fileDescriptorSchema(),
      );
    }
  } else if (boundary.strategy === "file" && boundary.fileField) {
    ensureSchemaPath(resultSchema, boundary.fileField, fileDescriptorSchema());
  }
}

export function loadHostBridgeCommandContracts(
  root = process.cwd(),
): HostBridgeCommandContractRegistry {
  const registry = JSON.parse(
    readFileSync(
      resolve(root, "schemas/host-bridge-cli-command-contracts.v1.json"),
      "utf8",
    ),
  ) as HostBridgeCommandContractRegistry;
  if (registry.schema !== "zotero-bridge.command-contracts.v1") {
    throw new Error(`unexpected command-contract schema: ${registry.schema}`);
  }
  const boundaries = JSON.parse(
    readFileSync(
      resolve(root, "schemas/host-bridge-cli-output-boundaries.v1.json"),
      "utf8",
    ),
  ) as {
    schema: string;
    commands: Record<string, HostBridgeCommandOutputBoundary>;
  };
  if (boundaries.schema !== "zotero-bridge.output-boundaries.v1") {
    throw new Error(`unexpected output-boundary schema: ${boundaries.schema}`);
  }
  const contractCommands = Object.keys(registry.commands).sort();
  const boundaryCommands = Object.keys(boundaries.commands).sort();
  if (JSON.stringify(contractCommands) !== JSON.stringify(boundaryCommands)) {
    throw new Error(
      "command contracts and output boundaries must cover the same commands",
    );
  }
  for (const command of contractCommands) {
    const boundary = boundaries.commands[command];
    registry.commands[command].outputBoundary = boundary;
    applyOutputBoundarySchema(
      registry.commands[command].resultSchema,
      boundary,
    );
  }
  return registry;
}
