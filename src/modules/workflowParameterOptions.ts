import type {
  WorkflowParameterOption,
  WorkflowParameterOptionsSource,
} from "../workflows/types";
import { getDefaultSynthesisService } from "./synthesis/service";
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

async function resolveSynthesisTopicOptions(
  source: WorkflowParameterOptionsSource,
): Promise<WorkflowParameterOptionsResult> {
  const service = getDefaultSynthesisService();
  const filter = normalizeString(source.filter) || "all";
  if (filter === "updatable") {
    const snapshot = await service.getSynthesisSnapshot();
    const rows = Array.isArray(snapshot?.artifacts?.rows)
      ? snapshot.artifacts.rows
      : [];
    const options: WorkflowParameterOption[] = [];
    for (const row of rows) {
      const topicId = normalizeString(row.id);
      const intent = row.updateIntent;
      if (!topicId || !intent || intent.blocked === true) {
        continue;
      }
      const title = normalizeString(row.title) || topicId;
      const actionLabel = normalizeString(intent.actionLabel) || "Update";
      const freshness = normalizeString(row.freshness);
      const coverage = normalizeString(row.coverage);
      options.push({
        value: topicId,
        label: title,
        description: [
          actionLabel,
          freshness ? `freshness ${freshness}` : "",
          coverage ? `coverage ${coverage}` : "",
          topicId,
        ].filter(Boolean).join(" · "),
        meta: {
          kind: "synthesis.topic",
          topicId,
          title,
          actionLabel,
          freshness: freshness || undefined,
          coverage: coverage || undefined,
        },
      });
    }
    return { options, diagnostics: [] };
  }

  const result = await service.listTopics();
  const topics = Array.isArray(result?.topics) ? result.topics : [];
  const options: WorkflowParameterOption[] = [];
  for (const topic of topics) {
    const topicId = normalizeString(topic.topic_id);
    if (!topicId) {
      continue;
    }
    const title = normalizeString(topic.title) || topicId;
    const status = normalizeString(topic.status);
    const updatedAt = normalizeString(topic.updated_at);
    const description = [
      status ? `status ${status}` : "",
      updatedAt ? `updated ${updatedAt}` : "",
      topicId,
    ].filter(Boolean).join(" · ");
    options.push({
      value: topicId,
      label: title,
      description,
      meta: {
        kind: "synthesis.topic",
        topicId,
        title,
        status: status || undefined,
        updatedAt: updatedAt || undefined,
      },
    });
  }
  return { options, diagnostics: [] };
}

export async function resolveWorkflowParameterOptionsSource(
  source: WorkflowParameterOptionsSource | undefined,
): Promise<WorkflowParameterOptionsResult> {
  if (!source || typeof source !== "object") {
    return { options: [], diagnostics: [] };
  }
  if (source.kind === "synthesis.topics") {
    try {
      return await resolveSynthesisTopicOptions(source);
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
