import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";

import {
  MUTATION_EXECUTE_INPUT_SCHEMA,
  MUTATION_EXECUTE_OUTPUT_SCHEMA,
  MUTATION_GET_OPERATION_INPUT_SCHEMA,
  MUTATION_GET_OPERATION_OUTPUT_SCHEMA,
  MUTATION_PREVIEW_INPUT_SCHEMA,
  MUTATION_PREVIEW_OUTPUT_SCHEMA,
} from "../src/schemas/zoteroHostMutationSchemas";

type JsonObject = Record<string, unknown>;

const contractPath = resolve(
  import.meta.dirname,
  "../host-bridge/contracts/capabilities.v2.json",
);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function bridgeMutationInput(schema: JsonObject): JsonObject {
  const projected = clone(schema);
  const definitions = projected.$defs as JsonObject;
  const storedFile = clone(definitions.storedAttachmentSource as JsonObject);
  const storedProperties = storedFile.properties as JsonObject;
  delete storedProperties.content;
  storedFile.required = (storedFile.required as string[]).filter(
    (property) => property !== "content",
  );
  storedProperties.fileId = { type: "string", minLength: 1 };
  storedFile.required = [...(storedFile.required as string[]), "fileId"];
  definitions.bridgeUploadSource = storedFile;
  const attachmentSource = definitions.attachmentSource as JsonObject;
  attachmentSource.oneOf = [
    { $ref: "#/$defs/bridgeUploadSource" },
    ...(attachmentSource.oneOf as JsonObject[]).slice(1),
  ];

  for (const branch of projected.oneOf as JsonObject[]) {
    const properties = branch.properties as JsonObject;
    const operation = (properties.operation as JsonObject).const;
    if (operation !== "attachments.replaceFile") continue;
    properties.source = { $ref: "#/$defs/bridgeUploadSource" };
  }
  return projected;
}

function renderedContract(contract: JsonObject) {
  const capabilities = contract.capabilities as Record<string, JsonObject>;
  const set = (
    name: string,
    inputSchema: JsonObject,
    outputSchema: JsonObject,
  ) => {
    const existing = capabilities[name];
    if (!existing) throw new Error(`Missing capability ${name}`);
    capabilities[name] = { ...existing, inputSchema, outputSchema };
  };
  set(
    "mutation.execute",
    bridgeMutationInput(MUTATION_EXECUTE_INPUT_SCHEMA),
    MUTATION_EXECUTE_OUTPUT_SCHEMA,
  );
  set(
    "mutation.preview",
    bridgeMutationInput(MUTATION_PREVIEW_INPUT_SCHEMA),
    MUTATION_PREVIEW_OUTPUT_SCHEMA,
  );
  set(
    "mutation.get_operation",
    MUTATION_GET_OPERATION_INPUT_SCHEMA,
    MUTATION_GET_OPERATION_OUTPUT_SCHEMA,
  );
  return contract;
}

function capabilityObjectRange(source: string, name: string) {
  const marker = `"${name}":`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing capability ${name}`);
  const start = source.indexOf("{", markerIndex + marker.length);
  if (start < 0) throw new Error(`Capability ${name} has no object value`);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return { start, end: index + 1 };
    }
  }
  throw new Error(`Capability ${name} has an unclosed object value`);
}

async function formatCapability(entry: JsonObject) {
  return (await format(JSON.stringify(entry), { parser: "json" }))
    .trimEnd()
    .split("\n")
    .map((line, index) => (index === 0 ? line : `    ${line}`))
    .join("\n");
}

async function renderMutationCapabilities(source: string) {
  const contract = renderedContract(JSON.parse(source) as JsonObject);
  const capabilities = contract.capabilities as Record<string, JsonObject>;
  let rendered = source;
  const names = [
    "mutation.execute",
    "mutation.preview",
    "mutation.get_operation",
  ];
  const replacements = await Promise.all(
    names.map(async (name) => ({
      range: capabilityObjectRange(source, name),
      entry: await formatCapability(capabilities[name]),
    })),
  );
  replacements.sort((left, right) => right.range.start - left.range.start);
  for (const replacement of replacements) {
    rendered =
      rendered.slice(0, replacement.range.start) +
      replacement.entry +
      rendered.slice(replacement.range.end);
  }
  return format(rendered, {
    parser: "json",
    printWidth: 80,
    tabWidth: 2,
    endOfLine: "lf",
  });
}

const check = process.argv.includes("--check");
const stdout = process.argv.includes("--stdout");
const source = await readFile(contractPath, "utf8");
const rendered = await renderMutationCapabilities(source);
if (stdout) {
  process.stdout.write(rendered);
} else if (check) {
  if (source !== rendered) {
    throw new Error("Host mutation capability projection is stale");
  }
} else {
  await writeFile(contractPath, rendered, "utf8");
}
