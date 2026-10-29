import {
  SynthesisClientError,
  hashSynthesisContractCanonicalJson,
  rebuildTagAuditStagingEntries,
  rebuildSynthesisTopicPlanApplyRequest,
  toSynthesisJsonObject,
  type SynthesisClient,
  type TagAuditExecutionIdentityDto,
  type TagAuditRunAbortRequestDto,
  type TagAuditRunResultDto,
  type TagRegulationAcknowledgementResultDto,
} from "../../../packages/synthesis-contracts/src/index";
import {
  rebuildSynthesisEvidenceSearchRequest,
  rebuildSynthesisTopicSearchRequest,
} from "../../../packages/synthesis-contracts/src/search";
import type { WorkflowSynthesisApi } from "../../workflows/types";
import {
  createWorkflowHostError,
  WORKFLOW_HOST_ERROR_SCHEMA,
  type WorkflowHostErrorDetailsByCode,
} from "../../workflows/workflowHostErrorContract";
import { notifySynthesisWorkbenchSidecarChanged } from "../synthesis/workbench/synthesisWorkbenchInvalidation";
import { getDefaultSynthesisClient } from "./defaultClient";
import { appendRuntimeLog } from "../runtimeLogManager";
import {
  consumeTagAuditTraversalCompletionEvidence,
  resolveZoteroHostCapabilityBroker,
  type ZoteroHostCapabilityBroker,
} from "../zoteroHostCapabilityBroker";
import { pinVerifiedMutationReceipt } from "../zoteroHostMutationAuthority";

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
    const violations = Array.isArray(details.violations)
      ? details.violations.slice(0, 16).flatMap((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry))
            return [];
          const field = safeSynthesisField(entry.instancePath);
          const keyword =
            typeof entry.keyword === "string" &&
            /^[A-Za-z]{1,64}$/.test(entry.keyword)
              ? entry.keyword
              : undefined;
          return field !== undefined && keyword
            ? [{ instancePath: field, keyword }]
            : [];
        })
      : [];
    const field = violations[0]?.instancePath;
    if (error.code === "invalid_request" || error.code === "internal") {
      const capability =
        typeof details.capability === "string" &&
        /^[a-zA-Z][a-zA-Z0-9_.]{0,159}$/.test(details.capability)
          ? details.capability
          : undefined;
      const schema =
        typeof details.location === "string" &&
        /^https:\/\/zotero-agents\.local\/[A-Za-z0-9/_.#$-]{1,1024}$/.test(
          details.location,
        )
          ? details.location
          : undefined;
      appendRuntimeLog({
        level: "error",
        scope: "hook",
        component: "synthesis-workflow-client",
        stage: "synthesis-contract-validation-failed",
        message: "Synthesis contract validation failed",
        details: {
          code: error.code,
          phase: error.code === "invalid_request" ? "request" : "result",
          ...(capability ? { capability } : {}),
          ...(schema ? { schema } : {}),
          violations,
        },
      });
    }
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
          { reason: "invalid_value", ...(field ? { field } : {}) },
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

function safeSynthesisField(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 1024) return undefined;
  return /^(?:\/(?:[A-Za-z_][A-Za-z0-9_]*|\d+|\*))*$/.test(value)
    ? value
    : undefined;
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

export function createWorkflowSynthesisHostApi(
  options: WorkflowSynthesisHostApiOptions = {},
): WorkflowSynthesisApi {
  const resolveClient = options.resolveClient || getDefaultSynthesisClient;
  const notifyChanged =
    options.notifyChanged || notifySynthesisWorkbenchSidecarChanged;
  return {
    async searchEvidence(input) {
      return guardWorkflowSynthesis(async () =>
        (await resolveClient()).searchEvidence(
          rebuildSynthesisEvidenceSearchRequest(input),
        ),
      );
    },
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
      async getContext(input, delivery) {
        return guardWorkflowSynthesis(async () =>
          (await resolveClient()).topics.getContext(input, delivery),
        );
      },
      async search(input) {
        return guardWorkflowSynthesis(async () =>
          (await resolveClient()).topics.search(
            rebuildSynthesisTopicSearchRequest(input),
          ),
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
                  entries: Parameters<
                    Parameters<typeof callback>[0]["append"]
                  >[0],
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
                if (
                  traversal.outcome === "canceled" ||
                  control.signal?.aborted
                ) {
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
                const evidenceValid =
                  consumeTagAuditTraversalCompletionEvidence({
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
          },
        );
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
