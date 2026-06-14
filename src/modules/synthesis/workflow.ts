export type SynthesisResultBundle = {
  kind: "topic_synthesis";
  operation?: "create" | "update_full" | "update_patch";
  mode: "create" | "update";
  language?: string;
  base_hashes?: Record<string, string>;
  create_base_hashes_ignored?: boolean;
  topic_id?: string;
  read_section_hashes?: Record<string, string>;
  topic_definition: Record<string, unknown>;
  topic_resolver?: Record<string, unknown>;
  resolved_paper_set?: Record<string, unknown>;
  resolver_manifest_path?: string;
  resolver_diagnostics?: Record<string, unknown>;
  artifact_metadata?: Record<string, unknown>;
  analysis_manifest_path?: string;
  topic_interest_metadata_path?: string;
  concept_cards_proposal_path?: string;
  topic_graph_relation_proposals_path?: string;
  markdown: string;
  markdown_path?: string;
  timeline?: string | Record<string, unknown> | unknown[];
};

const DIRECT_WRITE_KEYS = new Set([
  "write_zotero_raw_source",
  "write_canonical_assets",
  "write_note_shards",
  "update_zotero_anchor",
  "filesystem_writes",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function requireObject(source: Record<string, unknown>, key: string) {
  const value = source[key];
  if (!isObject(value)) {
    throw new Error(`synthesis result bundle requires object field: ${key}`);
  }
  return value;
}

function requireString(source: Record<string, unknown>, key: string) {
  const value = String(source[key] || "").trim();
  if (!value) {
    throw new Error(`synthesis result bundle requires string field: ${key}`);
  }
  return value;
}

function requireTopicDefinition(source: Record<string, unknown>) {
  const definition = requireObject(source, "topic_definition");
  const id = cleanString(definition.id);
  if (!id) {
    throw new Error("synthesis result bundle requires topic_definition.id");
  }
  return {
    ...definition,
    title: cleanString(definition.title) || id,
  };
}

const UPDATE_FULL_CAS_HASHES = ["artifact", "manifest", "metadata"] as const;

function requireUpdateFullBaseHashes(source: Record<string, unknown>) {
  if (!isObject(source.base_hashes)) {
    throw new Error("update_full synthesis result bundle requires base_hashes");
  }
  const result: Record<string, string> = {};
  for (const name of UPDATE_FULL_CAS_HASHES) {
    const hash = cleanString(source.base_hashes[name]);
    if (!hash) {
      throw new Error(
        `update_full synthesis result bundle requires base_hashes.${name}`,
      );
    }
    result[name] = hash;
  }
  return result;
}

export function validateSynthesisResultBundle(input: unknown): {
  ok: true;
  bundle: SynthesisResultBundle;
} {
  if (!isObject(input)) {
    throw new Error("synthesis result bundle must be an object");
  }
  for (const key of Object.keys(input)) {
    if (DIRECT_WRITE_KEYS.has(key)) {
      throw new Error(
        `synthesis result bundle contains direct write instruction: ${key}`,
      );
    }
  }
  if (input.kind !== "topic_synthesis") {
    throw new Error("synthesis result bundle kind must be topic_synthesis");
  }
  if (typeof input.operation === "string") {
    const operation = input.operation;
    if (
      operation !== "create" &&
      operation !== "update_full" &&
      operation !== "update_patch"
    ) {
      throw new Error(
        "synthesis result bundle operation must be create, update_full, or update_patch",
      );
    }
    if (cleanString(input.markdown)) {
      throw new Error("synthesis result bundle must not embed markdown");
    }
    const analysisManifestPath = requireString(input, "analysis_manifest_path");
    const topicInterestMetadataPath = cleanString(
      input.topic_interest_metadata_path,
    );
    const relationProposalsPath = cleanString(
      input.topic_graph_relation_proposals_path,
    );
    const conceptCardsProposalPath = cleanString(
      input.concept_cards_proposal_path,
    );
    const artifactMetadata = isObject(input.artifact_metadata)
      ? input.artifact_metadata
      : {};
    const language = requireString(input, "language");
    const createBaseHashesIgnored =
      operation === "create" && isObject(input.base_hashes);
    if (operation === "update_patch") {
      if (cleanString(input.markdown_path)) {
        throw new Error("update_patch bundle must not depend on markdown_path");
      }
      return {
        ok: true,
        bundle: {
          kind: "topic_synthesis",
          operation,
          mode: "update",
          language,
          topic_id: cleanString(input.topic_id),
          topic_definition: isObject(input.topic_definition)
            ? input.topic_definition
            : {},
          resolver_manifest_path: cleanString(input.resolver_manifest_path),
          resolver_diagnostics: {},
          artifact_metadata: artifactMetadata,
          analysis_manifest_path: analysisManifestPath,
          topic_interest_metadata_path: topicInterestMetadataPath,
          concept_cards_proposal_path: conceptCardsProposalPath,
          topic_graph_relation_proposals_path: relationProposalsPath,
          markdown: "",
        },
      };
    }
    if (cleanString(input.markdown_path)) {
      throw new Error(
        "structured topic synthesis bundle must not depend on markdown_path",
      );
    }
    const baseHashes =
      operation === "update_full" ? requireUpdateFullBaseHashes(input) : {};
    return {
      ok: true,
      bundle: {
        kind: "topic_synthesis",
        operation,
        mode: operation === "create" ? "create" : "update",
        language,
        topic_definition: requireTopicDefinition(input),
        resolver_manifest_path: requireString(input, "resolver_manifest_path"),
        resolver_diagnostics: isObject(input.resolver_diagnostics)
          ? input.resolver_diagnostics
          : {},
        artifact_metadata: artifactMetadata,
        analysis_manifest_path: analysisManifestPath,
        topic_interest_metadata_path: topicInterestMetadataPath,
        concept_cards_proposal_path: conceptCardsProposalPath,
        topic_graph_relation_proposals_path: relationProposalsPath,
        markdown: "",
        ...(operation === "update_full" ? { base_hashes: baseHashes } : {}),
        ...(createBaseHashesIgnored
          ? { create_base_hashes_ignored: true }
          : {}),
      },
    };
  }
  if (input.mode !== "create" && input.mode !== "update") {
    throw new Error("synthesis result bundle mode must be create or update");
  }
  const timeline = input.timeline;
  if (
    !(
      (typeof timeline === "string" && timeline.trim()) ||
      isObject(timeline) ||
      Array.isArray(timeline)
    )
  ) {
    throw new Error("synthesis result bundle requires timeline content");
  }
  return {
    ok: true,
    bundle: {
      kind: "topic_synthesis",
      mode: input.mode,
      base_hashes: isObject(input.base_hashes)
        ? (input.base_hashes as Record<string, string>)
        : {},
      topic_definition: requireTopicDefinition(input),
      topic_resolver: requireObject(input, "topic_resolver"),
      resolved_paper_set: requireObject(input, "resolved_paper_set"),
      resolver_diagnostics: isObject(input.resolver_diagnostics)
        ? input.resolver_diagnostics
        : {},
      artifact_metadata: isObject(input.artifact_metadata)
        ? input.artifact_metadata
        : {},
      markdown: requireString(input, "markdown"),
      markdown_path:
        typeof input.markdown_path === "string"
          ? input.markdown_path.trim()
          : undefined,
      timeline,
    },
  };
}

export function decideSynthesisApply(args: {
  bundle: unknown;
  currentHashes: Record<string, string | undefined>;
}):
  | { action: "persist"; bundle: SynthesisResultBundle; mismatches: [] }
  | {
      action: "conflict";
      bundle: SynthesisResultBundle;
      mismatches: Array<{ name: string; base: string; current: string }>;
    } {
  const { bundle } = validateSynthesisResultBundle(args.bundle);
  if (bundle.operation === "update_full") {
    const baseHashes = bundle.base_hashes || {};
    const mismatches = UPDATE_FULL_CAS_HASHES.flatMap((name) => {
      const base = cleanString(baseHashes[name]);
      const current = cleanString(args.currentHashes[name]);
      return base && base !== current ? [{ name, base, current }] : [];
    });
    if (mismatches.length) {
      return { action: "conflict", bundle, mismatches };
    }
  }
  return { action: "persist", bundle, mismatches: [] };
}
