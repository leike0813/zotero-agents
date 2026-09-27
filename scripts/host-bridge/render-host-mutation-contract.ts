import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";
import { HOST_BRIDGE_NOTE_DETAIL_OUTPUT_SCHEMA } from "../../src/modules/hostBridge/server/hostBridgeCapabilityContract";

import {
  MUTATION_EXECUTE_INPUT_SCHEMA,
  MUTATION_GET_OPERATION_INPUT_SCHEMA,
  MUTATION_GET_OPERATION_OUTPUT_SCHEMA,
  MUTATION_PUBLIC_EXECUTION_OUTPUT_SCHEMAS_BY_OPERATION,
  MUTATION_PUBLIC_INPUT_SCHEMAS_BY_OPERATION,
  MUTATION_PUBLIC_PREVIEW_OUTPUT_SCHEMAS_BY_OPERATION,
} from "../../src/schemas/zoteroHostMutationSchemas";

type JsonObject = Record<string, unknown>;

const contractPath = resolve(
  import.meta.dirname,
  "../../contracts/host-bridge/capabilities.v2.json",
);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function bridgeMutationInput(
  schema: JsonObject,
  operation: string,
): JsonObject {
  const projected = clone(schema);
  const definitions = (projected.$defs ||= clone(
    MUTATION_EXECUTE_INPUT_SCHEMA.$defs,
  )) as JsonObject;
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

  const properties = projected.properties as JsonObject;
  if (
    operation === "attachments.create" ||
    operation === "attachments.replaceFile"
  ) {
    properties.source = { $ref: "#/$defs/bridgeUploadSource" };
  }
  return projected;
}

function renderedContract(contract: JsonObject) {
  const capabilities = contract.capabilities as Record<string, JsonObject>;
  capabilities["library.get_note_detail"].outputSchema =
    HOST_BRIDGE_NOTE_DETAIL_OUTPUT_SCHEMA;
  const executeEntry =
    capabilities["mutation.execute"] || capabilities["item.create"];
  if (!executeEntry) {
    throw new Error("Missing canonical mutation template capabilities");
  }
  delete capabilities["mutation.execute"];
  delete capabilities["mutation.preview"];
  for (const operation of Object.keys(
    MUTATION_PUBLIC_INPUT_SCHEMAS_BY_OPERATION,
  )) {
    capabilities[operation] = {
      ...executeEntry,
      summary: `Execute ${operation} after Zotero-side approval; set dryRun for an effect-free preview.`,
      inputSchema: bridgeMutationInput(
        MUTATION_PUBLIC_INPUT_SCHEMAS_BY_OPERATION[operation] as JsonObject,
        operation,
      ),
      outputSchema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        oneOf: [
          MUTATION_PUBLIC_PREVIEW_OUTPUT_SCHEMAS_BY_OPERATION[operation],
          MUTATION_PUBLIC_EXECUTION_OUTPUT_SCHEMAS_BY_OPERATION[operation],
        ],
        $defs:
          MUTATION_PUBLIC_EXECUTION_OUTPUT_SCHEMAS_BY_OPERATION[operation]
            .$defs,
      },
      effect: "state-change",
      approval: executeEntry.approval,
    };
  }
  capabilities["mutation.get_operation"] = {
    ...capabilities["mutation.get_operation"],
    inputSchema: MUTATION_GET_OPERATION_INPUT_SCHEMA,
    outputSchema: MUTATION_GET_OPERATION_OUTPUT_SCHEMA,
  };
  return contract;
}

async function renderMutationCapabilities(source: string) {
  const contract = renderedContract(JSON.parse(source) as JsonObject);
  return format(JSON.stringify(contract), {
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
