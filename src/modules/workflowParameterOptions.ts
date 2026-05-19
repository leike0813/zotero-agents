import type {
  WorkflowParameterOption,
  WorkflowParameterOptionsSource,
} from "../workflows/types";
import { listZoteroCollections } from "./zoteroHostCapabilityBroker";

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

export async function resolveWorkflowParameterOptionsSource(
  source: WorkflowParameterOptionsSource | undefined,
): Promise<WorkflowParameterOptionsResult> {
  if (!source || typeof source !== "object") {
    return { options: [], diagnostics: [] };
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
      source.library === "current" || source.library === "user" || source.library == null
        ? undefined
        : normalizeLibraryId(source.library);
    const collections = await listZoteroCollections({
      libraryId: requestedLibrary || undefined,
    });
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
      const key = normalizeString(collection.key);
      const libraryId = normalizeLibraryId(collection.libraryId);
      if (!key || !libraryId) {
        continue;
      }
      const path = Array.isArray(collection.path) && collection.path.length > 0
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
          collectionId: collection.id,
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
