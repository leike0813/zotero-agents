import {
  SynthesisClientError,
  hashSynthesisContractCanonicalJson,
  rebuildTagAuditStagingEntries,
  rebuildSynthesisTopicApplyRequest,
  rebuildSynthesisTopicPlanApplyRequest,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
  type SynthesisJsonObject,
  type SynthesisJsonValue,
  type SynthesisLiteratureDigestApplyRequest,
  type SynthesisMaterializedAsset,
  type TagAuditExecutionIdentityDto,
  type TagAuditRunAbortRequestDto,
  type SynthesisTopicApplyRequest,
  type SynthesisWorkflowItemSnapshot,
  type TagAuditRunResultDto,
  type TagRegulationAcknowledgementResultDto,
} from "../../../packages/synthesis-contracts/src/index";
import type { WorkflowSynthesisApi } from "../../workflows/types";
import {
  createWorkflowHostError,
  WORKFLOW_HOST_ERROR_SCHEMA,
  type WorkflowHostErrorDetailsByCode,
} from "../../workflows/workflowHostErrorContract";
import { notifySynthesisWorkbenchSidecarChanged } from "../synthesisWorkbenchInvalidation";
import { getDefaultSynthesisClient } from "./defaultClient";
import {
  consumeTagAuditTraversalCompletionEvidence,
  resolveZoteroHostCapabilityBroker,
  type ZoteroHostCapabilityBroker,
} from "../zoteroHostCapabilityBroker";
import { pinVerifiedMutationReceipt } from "../zoteroHostMutationAuthority";

const DEFAULT_MATERIALIZATION_LIMITS = {
  maxAssets: 256,
  maxAssetBytes: 5 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
};

const TOPIC_PATH_FIELDS = [
  "artifact_manifest_path",
  "resolver_manifest_path",
  "analysis_manifest_path",
  "topic_interest_metadata_path",
  "concept_cards_proposal_path",
  "topic_graph_relation_proposals_path",
  "markdown_path",
] as const;

type TopicMaterializationContext = {
  resultContext?: {
    resolveArtifact(args: {
      fieldName?: string;
      rawPath?: unknown;
      fallbackPath?: string;
    }): Promise<{ text: string }>;
  };
  bundleReader?: {
    readText(path: string): string | Promise<string>;
  };
};

type TopicMaterializationLimits = {
  maxAssets?: number;
  maxAssetBytes?: number;
  maxTotalBytes?: number;
};

type WorkflowSynthesisHostApiOptions = {
  resolveClient?: () => Promise<SynthesisClient>;
  resolveAuditExecutionIdentity?: () => Promise<TagAuditExecutionIdentityDto>;
  resolveHostBroker?: () => ZoteroHostCapabilityBroker;
  notifyChanged?: typeof notifySynthesisWorkbenchSidecarChanged;
};

const activeTagAuditRunIds = new Set<string>();
let tagAuditBeginQueue: Promise<void> = Promise.resolve();

const SIDECAR_CONFLICT_REASONS: Readonly<
  Record<string, WorkflowHostErrorDetailsByCode["conflict"]["reason"]>
> = {
  tag_audit_operation_in_progress: "operation_in_progress",
  tag_audit_target_conflict: "concurrent_modification",
  tag_audit_vocabulary_conflict: "concurrent_modification",
  tag_audit_batch_conflict: "concurrent_modification",
  tag_audit_sequence_conflict: "concurrent_modification",
  tag_audit_coverage_conflict: "concurrent_modification",
  tag_audit_basis_conflict: "concurrent_modification",
  tag_audit_run_fenced: "ambiguous_state",
  tag_audit_run_not_found: "ambiguous_state",
  tag_audit_snapshot_mismatch: "ambiguous_state",
  basis_mismatch: "revision_mismatch",
};

function isWorkflowHostError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error as { schema?: unknown }).schema === WORKFLOW_HOST_ERROR_SCHEMA
  );
}

function normalizeWorkflowSynthesisError(error: unknown): Error {
  if (isWorkflowHostError(error)) {
    return error;
  }
  if (error instanceof SynthesisClientError) {
    const details = error.details || {};
    const sidecarToken = [details.sidecarReason, details.sidecarCode].find(
      (value): value is string =>
        typeof value === "string" && value in SIDECAR_CONFLICT_REASONS,
    );
    if (sidecarToken) {
      return createWorkflowHostError(
        "conflict",
        "The Synthesis request conflicts with the current state",
        { reason: SIDECAR_CONFLICT_REASONS[sidecarToken] },
      );
    }
    switch (error.code) {
      case "invalid_request":
        return createWorkflowHostError(
          "invalid_request",
          "The Synthesis request is invalid",
          { reason: "invalid_value" },
        );
      case "not_found":
        return createWorkflowHostError(
          "not_found",
          "The Synthesis resource was not found",
          { kind: "resource" },
        );
      case "conflict":
        return createWorkflowHostError(
          "conflict",
          "The Synthesis request conflicts with the current state",
          { reason: "concurrent_modification" },
        );
      case "unavailable":
      case "timeout":
      case "storage_busy":
        return createWorkflowHostError(
          "unavailable",
          "The Synthesis runtime is unavailable",
          { reason: "runtime" },
        );
    }
  }
  return createWorkflowHostError(
    "execution_failed",
    "The Synthesis operation failed",
    { phase: "adapter", recovery: "none" },
  );
}

async function guardWorkflowSynthesis<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw normalizeWorkflowSynthesisError(error);
  }
}

function beginTagAuditRunSerialized<T>(run: () => Promise<T>): Promise<T> {
  const previous = tagAuditBeginQueue;
  let release!: () => void;
  tagAuditBeginQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  return previous.then(run).finally(release);
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function getItemField(item: Record<string, unknown>, field: string) {
  const getter = item.getField;
  if (typeof getter === "function") {
    return cleanString(getter.call(item, field));
  }
  return cleanString(item[field]);
}

function creatorName(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const creator = value as Record<string, unknown>;
  return cleanString(
    [creator.firstName, creator.lastName]
      .map(cleanString)
      .filter(Boolean)
      .join(" ") || creator.name,
  );
}

function itemStringList(value: unknown, key?: string) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (key && entry && typeof entry === "object") {
        return cleanString((entry as Record<string, unknown>)[key]);
      }
      return cleanString(entry);
    })
    .filter(Boolean);
}

function fieldFromExtra(extra: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanString(
    extra.match(new RegExp(`^${escaped}\\s*:\\s*(.+)$`, "im"))?.[1],
  );
}

export function snapshotWorkflowSynthesisItem(
  input: unknown,
): SynthesisWorkflowItemSnapshot {
  const item =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const libraryId = Math.max(
    0,
    Math.floor(Number(item.libraryId ?? item.libraryID) || 0),
  );
  const itemKey = cleanString(item.itemKey ?? item.key);
  const date = getItemField(item, "date");
  const extra = getItemField(item, "extra");
  const creatorsGetter = item.getCreators;
  const tagsGetter = item.getTags;
  const collectionsGetter = item.getCollections;
  const rawCreators =
    typeof creatorsGetter === "function"
      ? creatorsGetter.call(item)
      : item.creators;
  const creators = Array.isArray(rawCreators)
    ? rawCreators.map(creatorName).filter(Boolean)
    : [];
  return {
    libraryId,
    itemKey,
    paperRef:
      cleanString(item.paperRef) ||
      (libraryId && itemKey ? `${libraryId}:${itemKey}` : ""),
    itemType: cleanString(item.itemType) || getItemField(item, "itemType"),
    title: cleanString(item.title) || getItemField(item, "title"),
    year: cleanString(item.year) || date.match(/^\s*(\d{4})/)?.[1] || "",
    date,
    creators,
    tags: itemStringList(
      typeof tagsGetter === "function" ? tagsGetter.call(item) : item.tags,
      "tag",
    ),
    collections: itemStringList(
      typeof collectionsGetter === "function"
        ? collectionsGetter.call(item)
        : item.collections,
    ),
    doi: cleanString(item.doi) || getItemField(item, "DOI"),
    arxiv:
      cleanString(item.arxiv) ||
      fieldFromExtra(extra, "arXiv") ||
      fieldFromExtra(extra, "arxiv"),
    isbn: cleanString(item.isbn) || getItemField(item, "ISBN"),
    url: cleanString(item.url) || getItemField(item, "url"),
    citekey:
      cleanString(item.citekey ?? item.citationKey) ||
      fieldFromExtra(extra, "Citation Key"),
    dateAdded: cleanString(item.dateAdded) || getItemField(item, "dateAdded"),
  };
}

function resolveWorkflowItem(input: unknown) {
  if (input && typeof input === "object") return input;
  const runtime = globalThis as typeof globalThis & {
    Zotero?: {
      Items?: {
        get?: (id: number) => unknown;
        getByLibraryAndKey?: (libraryId: number, key: string) => unknown;
      };
      Libraries?: { userLibraryID?: number };
    };
  };
  if (typeof input === "number") {
    return runtime.Zotero?.Items?.get?.(input) || {};
  }
  const key = cleanString(input);
  const libraryId = Number(runtime.Zotero?.Libraries?.userLibraryID) || 0;
  return key && libraryId
    ? runtime.Zotero?.Items?.getByLibraryAndKey?.(libraryId, key) || {}
    : {};
}

function mediaTypeForPath(
  path: string,
): SynthesisMaterializedAsset["mediaType"] {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return "text/markdown";
  }
  return "text/plain";
}

function invalidMaterialization(
  message: string,
  details?: SynthesisJsonObject,
) {
  return new SynthesisClientError("invalid_request", message, details);
}

export async function materializeTopicApplyRequest(
  rawBundle: unknown,
  context: TopicMaterializationContext = {},
  inputLimits: TopicMaterializationLimits = {},
): Promise<SynthesisTopicApplyRequest> {
  const limits = {
    ...DEFAULT_MATERIALIZATION_LIMITS,
    ...inputLimits,
  };
  const compactBundle =
    rawBundle && typeof rawBundle === "object" && !Array.isArray(rawBundle)
      ? Object.fromEntries(
          Object.entries(rawBundle).filter(([, value]) => value !== undefined),
        )
      : rawBundle;
  const bundle = toSynthesisJsonObject(compactBundle, "$.bundle");
  const assets: SynthesisMaterializedAsset[] = [];
  const assetIdsByPath = new Map<string, string>();
  let totalBytes = 0;

  const addAsset = async (
    rawPath: string,
    fieldName: string,
    isManifest = false,
  ): Promise<string> => {
    const existing = assetIdsByPath.get(rawPath);
    if (existing) return existing;
    if (assets.length >= limits.maxAssets) {
      throw invalidMaterialization("Topic result contains too many assets", {
        limit: limits.maxAssets,
      });
    }
    const id = `asset/${String(assets.length + 1).padStart(4, "0")}`;
    assetIdsByPath.set(rawPath, id);
    const asset: SynthesisMaterializedAsset = {
      id,
      mediaType: mediaTypeForPath(rawPath),
      text: "",
    };
    assets.push(asset);
    let text: string;
    try {
      if (context.resultContext?.resolveArtifact) {
        const resolved = await context.resultContext.resolveArtifact({
          fieldName,
          rawPath,
          fallbackPath: rawPath,
        });
        text = String(resolved.text);
      } else if (context.bundleReader?.readText) {
        text = String(await context.bundleReader.readText(rawPath));
      } else {
        throw new Error("asset reader unavailable");
      }
    } catch {
      throw invalidMaterialization("Topic result asset could not be read", {
        fieldName,
      });
    }
    if (isManifest) {
      let manifest: unknown;
      try {
        manifest = JSON.parse(text);
      } catch {
        throw invalidMaterialization(
          "Topic artifact manifest is not valid JSON",
          {
            fieldName,
          },
        );
      }
      const manifestObject = toSynthesisJsonObject(
        manifest,
        "$.artifactManifest",
      );
      for (const key of Object.keys(manifestObject).sort()) {
        const nestedPath = manifestObject[key];
        if (typeof nestedPath !== "string" || !cleanString(nestedPath)) {
          throw invalidMaterialization(
            "Topic artifact manifest values must be paths",
            { fieldName: key },
          );
        }
        manifestObject[key] = await addAsset(cleanString(nestedPath), key);
      }
      text = JSON.stringify(manifestObject);
    } else if (
      asset.mediaType === "application/json" &&
      (fieldName === "analysis_manifest_path" ||
        fieldName === "topic_analysis" ||
        fieldName === "analysis_manifest")
    ) {
      let analysisManifest: SynthesisJsonObject;
      try {
        analysisManifest = toSynthesisJsonObject(
          JSON.parse(text),
          "$.analysisManifest",
        );
      } catch {
        throw invalidMaterialization(
          "Topic analysis manifest is not valid JSON",
          { fieldName },
        );
      }
      const rewriteEntryPaths = async (entries: unknown, location: string) => {
        if (!entries || Array.isArray(entries) || typeof entries !== "object") {
          return;
        }
        for (const key of Object.keys(entries).sort()) {
          const entry = (entries as SynthesisJsonObject)[key];
          if (!entry || Array.isArray(entry) || typeof entry !== "object") {
            continue;
          }
          const nestedPath = entry.path;
          if (typeof nestedPath === "string" && cleanString(nestedPath)) {
            entry.path = await addAsset(
              cleanString(nestedPath),
              `${location}.${key}.path`,
            );
          }
        }
      };
      await rewriteEntryPaths(analysisManifest.sections, "sections");
      const patch = analysisManifest.patch;
      if (patch && !Array.isArray(patch) && typeof patch === "object") {
        await rewriteEntryPaths(patch.sections, "patch.sections");
      }
      await rewriteEntryPaths(analysisManifest.sidecars, "sidecars");
      text = JSON.stringify(analysisManifest);
    }
    const bytes = new TextEncoder().encode(text).byteLength;
    if (bytes > limits.maxAssetBytes) {
      throw invalidMaterialization(
        "Topic result asset exceeds its size limit",
        {
          fieldName,
          limit: limits.maxAssetBytes,
        },
      );
    }
    totalBytes += bytes;
    if (totalBytes > limits.maxTotalBytes) {
      throw invalidMaterialization(
        "Topic result assets exceed the total size limit",
        {
          limit: limits.maxTotalBytes,
        },
      );
    }
    asset.text = text;
    return id;
  };

  for (const fieldName of TOPIC_PATH_FIELDS) {
    const rawPath = bundle[fieldName];
    if (rawPath === undefined) continue;
    if (typeof rawPath !== "string" || !cleanString(rawPath)) {
      throw invalidMaterialization("Topic result asset path is invalid", {
        fieldName,
      });
    }
    bundle[fieldName] = await addAsset(
      cleanString(rawPath),
      fieldName,
      fieldName === "artifact_manifest_path",
    );
  }

  const rewriteKnownLocators = (
    value: SynthesisJsonValue,
  ): SynthesisJsonValue => {
    if (typeof value === "string") {
      return assetIdsByPath.get(value) || value;
    }
    if (Array.isArray(value)) {
      return value.map(rewriteKnownLocators);
    }
    if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        value[key] = rewriteKnownLocators(entry);
      }
    }
    return value;
  };
  rewriteKnownLocators(bundle);

  return rebuildSynthesisTopicApplyRequest({ bundle, assets });
}

function compactOptionalJsonFields(input: Record<string, unknown>) {
  const output: SynthesisJsonObject = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = toSynthesisJsonValue(
        omitUndefinedObjectFields(value),
        `$.${key}`,
      );
    }
  }
  return output;
}

function omitUndefinedObjectFields(
  value: unknown,
  seen = new Set<object>(),
): unknown {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis workflow input is cyclic",
    );
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => omitUndefinedObjectFields(entry, seen));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, omitUndefinedObjectFields(entry, seen)]),
    );
  } finally {
    seen.delete(value);
  }
}

export function createWorkflowSynthesisHostApi(
  options: WorkflowSynthesisHostApiOptions = {},
): WorkflowSynthesisApi {
  const resolveClient = options.resolveClient || getDefaultSynthesisClient;
  const notifyChanged =
    options.notifyChanged || notifySynthesisWorkbenchSidecarChanged;
  return {
    workflowApply: {
      async applyLiteratureDigest(input) {
        return guardWorkflowSynthesis(async () => {
          const result = await (
            await resolveClient()
          ).workflowApply.applyLiteratureDigestSidecar(input);
          const sourceRef = cleanString(result.sourceRef || result.source_ref);
          notifyChanged({
            invalidatedSurfaces: ["index", "graph"],
            sourceRefs: sourceRef ? [sourceRef] : [],
            reason: "literature_digest_apply",
          });
          return result;
        });
      },
      async applyTopicPlan(input) {
        return guardWorkflowSynthesis(async () => {
          const result = await (
            await resolveClient()
          ).workflowApply.applyTopicPlan(
            rebuildSynthesisTopicPlanApplyRequest(input),
          );
          if (result.status === "persisted") {
            notifyChanged({
              invalidatedSurfaces: ["home", "topics", "graph"],
              reason: "topic_plan_apply",
            });
          }
          return result;
        });
      },
      async applyTopicSynthesisResult(input) {
        return guardWorkflowSynthesis(async () => {
          const result = await (
            await resolveClient()
          ).workflowApply.applyTopicSynthesisResult(input);
          if (result.status === "persisted") {
            notifyChanged({
              invalidatedSurfaces: [
                "home",
                "topics",
                "concepts",
                "graph",
                "review",
              ],
              reason: "topic_synthesis_apply",
            });
          }
          return result;
        });
      },
    },
    topics: {
      async getReport(input) {
        return guardWorkflowSynthesis(async () =>
          (await resolveClient()).topics.getTopicReport(input),
        );
      },
    },
    artifacts: {
      async readPaperArtifacts(input) {
        return guardWorkflowSynthesis(async () =>
          (await resolveClient()).artifacts.readPaperArtifacts(input),
        );
      },
    },
    tags: {
      async loadVocabulary() {
        return guardWorkflowSynthesis(async () =>
          (await resolveClient()).tags.loadTagVocabulary(),
        );
      },
      async saveVocabulary(input) {
        return guardWorkflowSynthesis(async () => {
          const result = await (
            await resolveClient()
          ).tags.saveTagVocabulary(input);
          if (result.status === "committed") {
            notifyChanged({
              invalidatedSurfaces: ["tags"],
              reason: "tag_vocabulary_save",
            });
          }
          return result;
        });
      },
      async exportVocabularyForRegulator() {
        return guardWorkflowSynthesis(async () =>
          (await resolveClient()).tags.exportTagVocabularyForRegulator(),
        );
      },
      async listStagedSuggestions() {
        return guardWorkflowSynthesis(async () =>
          (await resolveClient()).tags.listStagedTagSuggestions(),
        );
      },
      async stageSuggestions(input) {
        return guardWorkflowSynthesis(async () => {
          const result = await (
            await resolveClient()
          ).tags.stageTagSuggestions(input);
          notifyChanged({
            invalidatedSurfaces: ["tags"],
            reason: "tag_suggestions_stage",
          });
          return result;
        });
      },
      async promoteStagedSuggestions(input) {
        return guardWorkflowSynthesis(async () => {
          const result = await (
            await resolveClient()
          ).tags.promoteStagedTagSuggestions(input);
          if (result.promoted.length > 0) {
            notifyChanged({
              invalidatedSurfaces: ["tags"],
              reason: "tag_suggestions_promote",
            });
          }
          return result;
        });
      },
      async discardStagedSuggestions(input) {
        return guardWorkflowSynthesis(async () => {
          const result = await (
            await resolveClient()
          ).tags.discardStagedTagSuggestions(input);
          if (result.discarded.length > 0) {
            notifyChanged({
              invalidatedSurfaces: ["tags"],
              reason: "tag_suggestions_discard",
            });
          }
          return result;
        });
      },
      async withAuditRun(input, control, callback) {
        if (!options.resolveAuditExecutionIdentity) {
          throw createWorkflowHostError(
            "unavailable",
            "Trusted tag-audit execution identity is unavailable",
            { reason: "capability" },
          );
        }
        return guardWorkflowSynthesis(
          async (): Promise<TagAuditRunResultDto> => {
          const client = await resolveClient();
          const identity = await options.resolveAuditExecutionIdentity!();
          const begun = await beginTagAuditRunSerialized(async () => {
            const result = await client.tags.beginTagAuditRun({
              ...input,
              executionIdentity: identity,
              activeRunIds: Array.from(activeTagAuditRunIds),
            });
            activeTagAuditRunIds.add(result.run.auditRunId);
            return result;
          });
          const run = begun.run;
          try {
            let sequence = 0;
            let stagedItems = 0;
            const abort = async (
              reason: TagAuditRunAbortRequestDto["reason"],
            ) => {
              try {
                await (
                  await resolveClient()
                ).tags.abortTagAuditRun({ run, reason });
              } catch {
                // The original outcome/error remains primary; cleanup is best effort.
              }
            };
            const writer = {
              async append(
                entries: Parameters<Parameters<typeof callback>[0]["append"]>[0],
              ) {
                if (control.signal?.aborted) {
                  throw createWorkflowHostError(
                    "canceled",
                    "Tag-audit run was canceled",
                    { reason: "caller_signal" },
                  );
                }
                const normalized = rebuildTagAuditStagingEntries(entries);
                if (
                  normalized.some(
                    (entry) => entry.target.libraryId !== input.libraryId,
                  )
                ) {
                  throw createWorkflowHostError(
                    "invalid_request",
                    "Tag-audit entry targets a different library",
                    { reason: "invalid_value" },
                  );
                }
                const appended = await (
                  await resolveClient()
                ).tags.appendTagAuditRun({
                  run,
                  sequence,
                  batchDigest: hashSynthesisContractCanonicalJson(normalized),
                  entries: normalized,
                });
                sequence += 1;
                stagedItems = appended.stagedItems;
              },
            };
            try {
              const traversal = await callback(writer);
              if (traversal.outcome === "canceled" || control.signal?.aborted) {
                await abort("canceled");
                return { outcome: "canceled", auditedItems: stagedItems };
              }
              if (traversal.outcome === "resource_limited") {
                await abort("resource_limited");
                return {
                  outcome: "resource_limited",
                  auditedItems: stagedItems,
                  limit:
                    traversal.reason === "max_items"
                      ? "items"
                      : traversal.reason === "max_pages"
                        ? "pages"
                        : "duration",
                };
              }
              const evidenceValid = consumeTagAuditTraversalCompletionEvidence({
                evidence: traversal.completionEvidence,
                libraryId: input.libraryId,
                visitedItems: traversal.visitedItems,
                visitedBatches: traversal.visitedBatches,
              });
              if (!evidenceValid || traversal.visitedItems !== stagedItems) {
                await abort("conflicted");
                return {
                  outcome: "conflicted",
                  auditedItems: stagedItems,
                  conflictCount: 1,
                  conflicts: [],
                  retryable: true,
                } as const;
              }
              const published = await (
                await resolveClient()
              ).tags.promoteTagAuditRun({
                run,
                visitedItems: traversal.visitedItems,
                coverageDigest: traversal.completionEvidence.coverageDigest,
                evidenceId: traversal.completionEvidence.evidenceId,
              });
              if (published.outcome === "published") {
                notifyChanged({
                  invalidatedSurfaces: ["tags"],
                  reason: "tag_audit_publish",
                });
              }
              return published;
            } catch (error) {
              await abort(control.signal?.aborted ? "canceled" : "failed");
              throw error;
            }
          } finally {
            activeTagAuditRunIds.delete(run.auditRunId);
          }
        });
      },
      async acknowledgeRegulation(input, control = {}) {
        if (control.signal?.aborted) {
          throw createWorkflowHostError(
            "canceled",
            "Tag regulation acknowledgement was canceled",
            { reason: "caller_signal" },
          );
        }
        return guardWorkflowSynthesis(
          async (): Promise<TagRegulationAcknowledgementResultDto> => {
            const pinned = pinVerifiedMutationReceipt(input.mutationReceipt);
            if (!pinned) {
              return { outcome: "conflict", reason: "receipt_invalid" };
            }
            try {
              const receipt = pinned.receipt;
              if (receipt.operation !== "item.updateTags") {
                return { outcome: "conflict", reason: "wrong_operation" };
              }
              const target = {
                libraryId: input.target.libraryId,
                itemKey: input.target.key,
              };
              const changes = receipt.changes.filter(
                (change) => change.entity.kind === "item",
              );
              if (
                changes.length !== 1 ||
                changes[0]!.entity.kind !== "item" ||
                changes[0]!.entity.ref.libraryId !== target.libraryId ||
                changes[0]!.entity.ref.key !== target.itemKey
              ) {
                return { outcome: "conflict", reason: "wrong_target" };
              }
              const semantic = toSynthesisJsonObject(
                pinned.semanticInput,
                "tagRegulationReceipt.semanticInput",
              );
              if (
                semantic.operation !== "item.updateTags" ||
                !Array.isArray(semantic.add) ||
                !Array.isArray(semantic.remove)
              ) {
                return {
                  outcome: "conflict",
                  reason: "receipt_delta_inconsistent",
                };
              }
              const client = await resolveClient();
              const prepared =
                await client.tags.prepareTagRegulationAcknowledgement({
                  target,
                  receiptId: receipt.receiptId,
                });
              if (prepared.outcome !== "ready") return prepared;
              const change = changes[0]!;
              if (change.before?.revision !== prepared.auditedRevision) {
                return {
                  outcome: "conflict",
                  reason: "audited_revision_mismatch",
                };
              }
              const broker = (
                options.resolveHostBroker || resolveZoteroHostCapabilityBroker
              )();
              const current = await broker.library.getItemAuditState(
                input.target,
                control,
              );
              if (change.after.revision !== current.revision) {
                return { outcome: "stale", reason: "item_revision_changed" };
              }
              const add = new Set(semantic.add.map(String));
              const remove = new Set(semantic.remove.map(String));
              if (
                current.tags.some((tag) => remove.has(tag)) ||
                Array.from(add).some((tag) => !current.tags.includes(tag))
              ) {
                return {
                  outcome: "conflict",
                  reason: "receipt_delta_inconsistent",
                };
              }
              const acknowledged =
                await client.tags.commitTagRegulationAcknowledgement({
                  schema: "zotero-agents.tag-regulation-verified-commit.v1",
                  target,
                  receiptId: receipt.receiptId,
                  expectedSnapshotRevision: prepared.snapshotRevision,
                  auditedRevision: prepared.auditedRevision,
                  currentRevision: current.revision,
                  finalTagDigest: current.tagDigest,
                  finalTags: current.tags,
                  vocabularyHash: prepared.vocabularyHash,
                });
              if (acknowledged.outcome === "acknowledged") {
                notifyChanged({
                  invalidatedSurfaces: ["tags"],
                  reason: "tag_regulation_acknowledge",
                });
              }
              return acknowledged;
            } finally {
              pinned.release();
            }
          },
        );
      },
    },
  };
}
