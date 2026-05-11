import { checkBaseHashes } from "./foundation";

export type SynthesisResultBundle = {
  kind: "topic_synthesis";
  mode: "create" | "update";
  base_hashes: Record<string, string>;
  topic_definition: Record<string, unknown>;
  topic_resolver: Record<string, unknown>;
  resolved_paper_set: Record<string, unknown>;
  resolver_diagnostics: Record<string, unknown>;
  artifact_metadata: Record<string, unknown>;
  markdown: string;
  markdown_path?: string;
  timeline: string | Record<string, unknown> | unknown[];
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

export function validateSynthesisResultBundle(input: unknown): {
  ok: true;
  bundle: SynthesisResultBundle;
} {
  if (!isObject(input)) {
    throw new Error("synthesis result bundle must be an object");
  }
  for (const key of Object.keys(input)) {
    if (DIRECT_WRITE_KEYS.has(key)) {
      throw new Error(`synthesis result bundle contains direct write instruction: ${key}`);
    }
  }
  if (input.kind !== "topic_synthesis") {
    throw new Error("synthesis result bundle kind must be topic_synthesis");
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
  const bundle: SynthesisResultBundle = {
    kind: "topic_synthesis",
    mode: input.mode,
    base_hashes: requireObject(input, "base_hashes") as Record<string, string>,
    topic_definition: requireObject(input, "topic_definition"),
    topic_resolver: requireObject(input, "topic_resolver"),
    resolved_paper_set: requireObject(input, "resolved_paper_set"),
    resolver_diagnostics: requireObject(input, "resolver_diagnostics"),
    artifact_metadata: requireObject(input, "artifact_metadata"),
    markdown: requireString(input, "markdown"),
    markdown_path:
      typeof input.markdown_path === "string" ? input.markdown_path.trim() : undefined,
    timeline,
  };
  return { ok: true, bundle };
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
  const cas = checkBaseHashes({
    current: args.currentHashes,
    base: bundle.base_hashes,
  });
  const mismatches = cas.ok
    ? []
    : cas.mismatches.filter((mismatch) => mismatch.name !== "index");
  if (!mismatches.length) {
    return { action: "persist", bundle, mismatches: [] };
  }
  return {
    action: "conflict",
    bundle,
    mismatches,
  };
}
