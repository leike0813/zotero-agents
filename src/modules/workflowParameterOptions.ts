import type {
  WorkflowParameterOption,
  WorkflowParameterOptionsSource,
} from "../workflows/types";
import type { SynthesisClient } from "../../packages/synthesis-contracts/src/index";
import { getDefaultSynthesisClient } from "./synthesisClient/defaultClient";
import {
  createZoteroHostCapabilityBroker,
  type ZoteroHostCapabilityBroker,
} from "./zoteroHostCapabilityBroker";

export type WorkflowParameterOptionsResult = {
  options: WorkflowParameterOption[];
  diagnostics: Array<{
    code: string;
    message: string;
  }>;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLibraryId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function collectionRefValue(args: { libraryId: number; key: string }) {
  return `${args.libraryId}:${args.key}`;
}

function compactKeySuffix(key: string) {
  const value = normalizeString(key);
  return value.length > 6 ? value.slice(-6) : value;
}

async function resolveSynthesisTopicOptions(
  source: WorkflowParameterOptionsSource,
  client: Pick<SynthesisClient, "topics">,
): Promise<WorkflowParameterOptionsResult> {
  const result = await client.topics.listWorkflowOptions({
    filter: source.filter === "updatable" ? "updatable" : "all",
  });
  return {
    options: result.options as WorkflowParameterOption[],
    diagnostics: result.diagnostics,
  };
}

export async function resolveWorkflowParameterOptionsSource(
  source: WorkflowParameterOptionsSource | undefined,
  deps?: {
    synthesisClient?: Pick<SynthesisClient, "topics">;
    library?: Pick<ZoteroHostCapabilityBroker["library"], "listCollections">;
  },
): Promise<WorkflowParameterOptionsResult> {
  if (!source || typeof source !== "object") {
    return { options: [], diagnostics: [] };
  }
  if (source.kind === "synthesis.topics") {
    try {
      return await resolveSynthesisTopicOptions(
        source,
        deps?.synthesisClient || (await getDefaultSynthesisClient()),
      );
    } catch (error) {
      return {
        options: [],
        diagnostics: [
          {
            code: "synthesis_topics_options_failed",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  if (source.kind !== "zotero.collections") {
    return {
      options: [],
      diagnostics: [
        {
          code: "unsupported_options_source",
          message: `Unsupported workflow parameter options source: ${normalizeString(source.kind)}`,
        },
      ],
    };
  }

  try {
    const requestedLibrary =
      source.library === "current" ||
      source.library === "user" ||
      source.library == null
        ? undefined
        : normalizeLibraryId(source.library);
    const library = deps?.library || createZoteroHostCapabilityBroker().library;
    const collections = [];
    let cursor: string | undefined;
    do {
      const page = await library.listCollections({
        libraryId: requestedLibrary || undefined,
        limit: 500,
        cursor,
      });
      collections.push(...page.collections);
      cursor = page.nextCursor || undefined;
      if (!page.hasMore) break;
    } while (cursor);
    const options: WorkflowParameterOption[] = [];
    if (source.includeEmpty === true) {
      options.push({
        value: "",
        label: "Default library",
        description: "Do not target a specific Zotero collection",
        meta: {
          kind: "zotero.collection.empty",
        },
      });
    }
    for (const collection of collections) {
      const key = normalizeString(collection.ref.key);
      const libraryId = normalizeLibraryId(collection.ref.libraryId);
      if (!key || !libraryId) {
        continue;
      }
      const path =
        Array.isArray(collection.path) && collection.path.length > 0
          ? collection.path.map(normalizeString).filter(Boolean)
          : [normalizeString(collection.name) || key];
      const label = path.join(" / ");
      options.push({
        value: collectionRefValue({ libraryId, key }),
        label,
        description: `Library ${libraryId} · key ${compactKeySuffix(key)}`,
        meta: {
          kind: "zotero.collection",
          libraryId,
          collectionKey: key,
          name: normalizeString(collection.name),
          path,
        },
      });
    }
    return { options, diagnostics: [] };
  } catch (error) {
    return {
      options: [],
      diagnostics: [
        {
          code: "options_source_failed",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}
