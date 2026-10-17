import fs from "node:fs";
import path from "node:path";

const contractRoot = path.resolve(
  import.meta.dirname,
  "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas",
);

/** Materialize only reachable definitions so a Skill can validate offline. */
export function synthesisWorkflowSchema(
  file: string,
  definition: string,
): Record<string, unknown> {
  const definitions: Record<string, unknown> = {};
  const documents = new Map<string, Record<string, unknown>>();
  const document = (name: string) => {
    if (!documents.has(name))
      documents.set(
        name,
        JSON.parse(fs.readFileSync(path.join(contractRoot, name), "utf8")),
      );
    return documents.get(name)!;
  };
  const visit = (value: unknown, owner: string): unknown => {
    const node = value as Record<string, unknown>;
    if (Array.isArray(node)) return node.map((entry) => visit(entry, owner));
    if (!node || typeof node !== "object") return node;
    if (typeof node.$ref === "string") {
      const [relative, fragment] = node.$ref.split("#");
      const targetFile = relative || owner;
      const name = fragment?.replace(/^\/\$defs\//, "");
      if (!name || name.includes("/"))
        throw new Error(`Unsupported workflow schema reference: ${node.$ref}`);
      const key = `${targetFile.replace(/\.schema\.json$/, "")}.${name}`;
      if (!(key in definitions)) {
        definitions[key] = {};
        definitions[key] = visit(
          (document(targetFile).$defs as Record<string, unknown>)[name],
          targetFile,
        );
      }
      return {
        ...(visit(
          Object.fromEntries(
            Object.entries(node).filter(([key]) => key !== "$ref"),
          ),
          owner,
        ) as object),
        $ref: `#/definitions/${key}`,
      };
    }
    if ("prefixItems" in node)
      throw new Error(
        "Tuple conversion requires an explicit Skill schema projection",
      );
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, visit(value, owner)]),
    );
  };
  const root = visit(
    (document(file).$defs as Record<string, unknown>)[definition],
    file,
  ) as Record<string, unknown>;
  if (!root)
    throw new Error(`Workflow schema definition missing: ${definition}`);
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    ...root,
    ...(Object.keys(definitions).length ? { definitions } : {}),
  };
}

export function topicPlannerOutputSchema() {
  const schema = synthesisWorkflowSchema(
    "client-topic-workbench.schema.json",
    "TopicPlanPayload",
  );
  const properties = schema.properties as Record<string, unknown>;
  properties.coverage_manifest_path = {
    ...(properties.coverage_manifest_path as object),
    "x-type": "artifact-manifest",
    "x-role": "coverage-manifest",
  };
  return schema;
}

export function topicFinalOutputSchema(canceled: Record<string, unknown>) {
  const definition = synthesisWorkflowSchema(
    "topic-domain.schema.json",
    "TopicDefinition",
  );
  const hashes = synthesisWorkflowSchema("topic-domain.schema.json", "HashMap");
  const branches = ["create", "update_full"].map((operation) => ({
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "operation",
      "language",
      "topic_definition",
      "artifact_manifest_path",
      ...(operation === "update_full" ? ["base_hashes"] : []),
    ],
    properties: {
      kind: { const: "topic_synthesis" },
      operation: { const: operation },
      language: { type: "string", minLength: 1 },
      topic_definition: {
        ...definition,
        $schema: undefined,
        definitions: undefined,
      },
      ...(operation === "update_full"
        ? {
            base_hashes: {
              ...hashes,
              $schema: undefined,
              definitions: undefined,
            },
          }
        : {}),
      artifact_manifest_path: {
        type: "string",
        minLength: 1,
        "x-type": "artifact-manifest",
        "x-role": "artifact-manifest",
      },
    },
  }));
  return JSON.parse(
    JSON.stringify({
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      not: {
        anyOf: [{ required: ["markdown"] }, { required: ["markdown_path"] }],
      },
      definitions: {
        ...(definition.definitions as object),
        ...(hashes.definitions as object),
      },
      oneOf: [...branches, canceled],
    }),
  );
}

export function topicCanceledOutputSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["kind", "status", "reason", "message"],
    properties: {
      kind: { const: "topic_synthesis_canceled" },
      status: { const: "canceled" },
      reason: { type: "string", minLength: 1 },
      message: { type: "string", minLength: 1 },
      duplicate_topic_id: { type: "string" },
      topic_seed: { type: "string" },
      topic_id: { type: "string" },
      retryable: { type: "boolean" },
    },
  };
}
