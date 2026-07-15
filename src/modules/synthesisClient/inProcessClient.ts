import {
  SYNTHESIS_CANONICAL_REVISION_REVIEW_ACTIONS,
  SYNTHESIS_CITATION_GRAPH_LAYOUT_ALGORITHMS,
  SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS,
  SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DECISION_ACTIONS,
  SYNTHESIS_WORKBENCH_SURFACES,
  SynthesisClientError,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
  type SynthesisCanonicalRevisionReviewRequest,
  type SynthesisCitationGraphLayoutRequest,
  type SynthesisDatabaseResetRequest,
  type SynthesisDatabaseResetResult,
  type SynthesisLiteratureDigestApplyRequest,
  type SynthesisPaperArtifactsRequest,
  type SynthesisPaperArtifactsResult,
  type SynthesisReferenceCommandResult,
  type SynthesisReferenceMatchProposalAction,
  type SynthesisReferenceMatchProposalActionRequest,
  type SynthesisReferenceMatchProposalActionsRequest,
  type SynthesisReferenceMatchProposalDecision,
  type SynthesisReferenceMatchProposalDecisionAction,
  type SynthesisReferenceMatchProposalManualTarget,
  type SynthesisRelatedItemsEchoRequest,
  type SynthesisStartupReconcileResult,
  type SynthesisTagAuditReplaceRequest,
  type SynthesisTagStagedSuggestion,
  type SynthesisTagVocabularySnapshot,
  type SynthesisTopicApplyRequest,
  type SynthesisTopicApplyResult,
  type SynthesisTopicReportRequest,
  type SynthesisTopicReportResult,
  type SynthesisWorkflowTopicOptionsRequest,
  type SynthesisWorkflowTopicOptionsResult,
  type SynthesisGraphCommandResult,
  type SynthesisWorkbenchPaperDigestResult,
  type SynthesisWorkbenchProjection,
  type SynthesisWorkbenchSurfaceName,
  type SynthesisWorkbenchTopicDetailResult,
} from "../../../packages/synthesis-contracts/src/index";
import { isTransientStorageBusyError } from "../guardedSqlite";

export interface LegacySynthesisPort {
  listWorkflowTopicOptions(
    request?: SynthesisWorkflowTopicOptionsRequest,
  ): Promise<SynthesisWorkflowTopicOptionsResult>;
  reconcileSynthesisRuntimeWorkStateOnStartup?(): SynthesisStartupReconcileResult;
  resetSynthesisDatabase?(
    request: SynthesisDatabaseResetRequest,
  ): Promise<SynthesisDatabaseResetResult>;
  consumeRelatedItemsSyncEcho?(
    request: SynthesisRelatedItemsEchoRequest,
  ): Promise<unknown>;
  applyLiteratureDigestSidecar?(
    request: SynthesisLiteratureDigestApplyRequest,
  ): Promise<unknown>;
  applyTopicSynthesisResult?(
    bundle: unknown,
    context?: {
      bundleReader: { readText(path: string): Promise<string> };
    },
  ): Promise<unknown>;
  getTopicReport?(request: SynthesisTopicReportRequest): Promise<unknown>;
  readPaperArtifacts?(
    request: SynthesisPaperArtifactsRequest,
  ): Promise<unknown>;
  loadTagVocabulary?(): Promise<unknown>;
  saveTagVocabulary?(request: Record<string, unknown>): Promise<unknown>;
  exportTagVocabularyForRegulator?(): Promise<unknown>;
  listStagedTagSuggestions?(): Promise<unknown>;
  stageTagSuggestions?(request: Record<string, unknown>): Promise<unknown>;
  discardStagedTagSuggestions?(
    request: Record<string, unknown>,
  ): Promise<unknown>;
  replaceTagAuditRecords?(
    request: SynthesisTagAuditReplaceRequest,
  ): Promise<unknown>;
  clearTagAuditRecord?(request: {
    libraryId: number;
    itemKey: string;
  }): Promise<unknown>;
  getSynthesisWorkbenchChromeInput?(
    state: Record<string, unknown>,
  ): Promise<unknown>;
  getSynthesisWorkbenchSurfaceInput?(
    surface: SynthesisWorkbenchSurfaceName,
    state: Record<string, unknown>,
  ): Promise<unknown>;
  getSynthesisBackgroundJobRows?(): Promise<unknown>;
  readTopicDetail?(request: { topicId: string }): Promise<unknown>;
  resolveTopicPaperDigest?(request: Record<string, unknown>): Promise<unknown>;
  recomputeCitationGraphLayout?(
    request: SynthesisCitationGraphLayoutRequest,
  ): Promise<unknown>;
  rebuildCitationGraphCacheNow?(): Promise<unknown>;
  refreshCitationGraphCacheIncrementalNow?(): Promise<unknown>;
  retryCitationGraphCacheRebuild?(): Promise<unknown>;
  refreshReferenceSidecarNow?(): Promise<unknown>;
  retryReferenceSidecarRefresh?(): Promise<unknown>;
  runAdvancedReferenceMatchingNow?(): Promise<unknown>;
  retryAdvancedReferenceMatching?(): Promise<unknown>;
  applyCanonicalRevisionReviewAction?(
    request: SynthesisCanonicalRevisionReviewRequest,
  ): Promise<unknown>;
  applyReferenceMatchProposalAction?(
    request: SynthesisReferenceMatchProposalActionRequest,
  ): Promise<unknown>;
  applyReferenceMatchProposalActions?(
    request: SynthesisReferenceMatchProposalActionsRequest,
  ): Promise<unknown>;
}

function normalizeClientError(error: unknown): SynthesisClientError {
  if (error instanceof SynthesisClientError) {
    return error;
  }
  if (isTransientStorageBusyError(error)) {
    return new SynthesisClientError(
      "storage_busy",
      error instanceof Error
        ? error.message
        : "Synthesis storage is temporarily busy",
      {
        causeName: error instanceof Error ? error.name : typeof error,
      },
    );
  }
  return new SynthesisClientError(
    "internal",
    error instanceof Error ? error.message : "Synthesis client request failed",
    {
      causeName: error instanceof Error ? error.name : typeof error,
    },
  );
}

function requireLegacyPort<T>(port: T | undefined, operation: string): T {
  if (typeof port !== "function") {
    throw new SynthesisClientError(
      "unavailable",
      `Synthesis operation is unavailable: ${operation}`,
      { operation },
    );
  }
  return port;
}

function normalizeLegacyJson(value: unknown) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new SynthesisClientError(
      "internal",
      "Synthesis operation returned a non-JSON result",
    );
  }
  return toSynthesisJsonValue(JSON.parse(serialized), "$.response");
}

function normalizeLegacyObject(value: unknown) {
  return toSynthesisJsonObject(normalizeLegacyJson(value), "$.response");
}

async function runLegacy<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeClientError(error);
  }
}

function normalizeWorkbenchState(value: unknown) {
  return toSynthesisJsonObject(value, "$.request.state");
}

function normalizeWorkbenchSurface(value: unknown) {
  if (
    typeof value !== "string" ||
    !SYNTHESIS_WORKBENCH_SURFACES.includes(
      value as SynthesisWorkbenchSurfaceName,
    )
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Workbench surface is invalid",
      { surface: typeof value === "string" ? value : typeof value },
    );
  }
  return value as SynthesisWorkbenchSurfaceName;
}

function normalizeTopicId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Workbench topicId is required",
    );
  }
  return value.trim();
}

function normalizeCitationGraphLayoutRequest(
  value: unknown,
): SynthesisCitationGraphLayoutRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  const algorithm = request.algorithm;
  if (
    typeof algorithm !== "string" ||
    !SYNTHESIS_CITATION_GRAPH_LAYOUT_ALGORITHMS.includes(
      algorithm as SynthesisCitationGraphLayoutRequest["algorithm"],
    )
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Citation Graph layout algorithm is invalid",
      {
        algorithm: typeof algorithm === "string" ? algorithm : typeof algorithm,
      },
    );
  }
  if (request.force !== undefined && typeof request.force !== "boolean") {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Citation Graph layout force must be a boolean",
      { field: "force" },
    );
  }
  return request.force === undefined
    ? {
        algorithm:
          algorithm as SynthesisCitationGraphLayoutRequest["algorithm"],
      }
    : {
        algorithm:
          algorithm as SynthesisCitationGraphLayoutRequest["algorithm"],
        force: request.force as boolean,
      };
}

function normalizeRequiredString(
  value: unknown,
  location: string,
  label: string,
) {
  if (typeof value !== "string" || !value.trim()) {
    throw new SynthesisClientError("invalid_request", `${label} is required`, {
      field: location,
    });
  }
  return value.trim();
}

function normalizeStringEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  location: string,
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new SynthesisClientError("invalid_request", `${label} is invalid`, {
      field: location,
      value: typeof value === "string" ? value : typeof value,
    });
  }
  return value as T;
}

function normalizeCanonicalRevisionReviewRequest(
  value: unknown,
): SynthesisCanonicalRevisionReviewRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    reviewItemId: normalizeRequiredString(
      request.reviewItemId,
      "reviewItemId",
      "Synthesis canonical revision reviewItemId",
    ),
    action: normalizeStringEnum(
      request.action,
      SYNTHESIS_CANONICAL_REVISION_REVIEW_ACTIONS,
      "action",
      "Synthesis canonical revision action",
    ),
  };
}

function normalizeReferenceMatchProposalActionRequest(
  value: unknown,
): SynthesisReferenceMatchProposalActionRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    proposalId: normalizeRequiredString(
      request.proposalId,
      "proposalId",
      "Synthesis Reference match proposalId",
    ),
    action: normalizeStringEnum(
      request.action,
      SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS,
      "action",
      "Synthesis Reference match proposal action",
    ),
  };
}

function normalizeReferenceMatchProposalManualTarget(
  value: unknown,
  location: string,
): SynthesisReferenceMatchProposalManualTarget {
  const target = toSynthesisJsonObject(value, location);
  if (target.kind === "zotero_item") {
    if (
      typeof target.libraryId !== "number" ||
      !Number.isInteger(target.libraryId) ||
      target.libraryId <= 0
    ) {
      throw new SynthesisClientError(
        "invalid_request",
        "Synthesis Reference match proposal target libraryId must be a positive integer",
        { field: `${location}.libraryId` },
      );
    }
    return {
      kind: "zotero_item",
      libraryId: target.libraryId,
      itemKey: normalizeRequiredString(
        target.itemKey,
        `${location}.itemKey`,
        "Synthesis Reference match proposal target itemKey",
      ),
    };
  }
  if (target.kind === "canonical_reference") {
    return {
      kind: "canonical_reference",
      canonicalReferenceId: normalizeRequiredString(
        target.canonicalReferenceId,
        `${location}.canonicalReferenceId`,
        "Synthesis Reference match proposal target canonicalReferenceId",
      ),
    };
  }
  throw new SynthesisClientError(
    "invalid_request",
    "Synthesis Reference match proposal target kind is invalid",
    {
      field: `${location}.kind`,
      value: typeof target.kind === "string" ? target.kind : typeof target.kind,
    },
  );
}

function normalizeReferenceMatchProposalDecision(
  value: unknown,
  index: number,
): SynthesisReferenceMatchProposalDecision {
  const location = `$.request.decisions[${index}]`;
  const decision = toSynthesisJsonObject(value, location);
  const proposalId = normalizeRequiredString(
    decision.proposalId,
    `${location}.proposalId`,
    "Synthesis Reference match proposalId",
  );
  const action = normalizeStringEnum(
    decision.action,
    SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DECISION_ACTIONS,
    `${location}.action`,
    "Synthesis Reference match proposal decision action",
  ) as SynthesisReferenceMatchProposalDecisionAction;
  if (action === "manual_target") {
    return {
      proposalId,
      action,
      target: normalizeReferenceMatchProposalManualTarget(
        decision.target,
        `${location}.target`,
      ),
    };
  }
  return {
    proposalId,
    action: action as SynthesisReferenceMatchProposalAction,
  };
}

function normalizeReferenceMatchProposalActionsRequest(
  value: unknown,
): SynthesisReferenceMatchProposalActionsRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  if (!Array.isArray(request.decisions) || request.decisions.length === 0) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Reference match proposal decisions are required",
      { field: "decisions" },
    );
  }
  return {
    decisions: request.decisions.map((decision, index) =>
      normalizeReferenceMatchProposalDecision(decision, index),
    ),
  };
}

function mapPaperDigestRequest(value: unknown): Record<string, unknown> {
  const request = toSynthesisJsonObject(value, "$.request");
  const mapped: Record<string, unknown> = {};
  const optionalStringFields = [
    ["topicId", "topicId"],
    ["paperRef", "paper_ref"],
  ] as const;
  for (const [source, target] of optionalStringFields) {
    const field = request[source];
    if (field === undefined) continue;
    if (typeof field !== "string") {
      throw new SynthesisClientError(
        "invalid_request",
        `Synthesis Workbench ${source} must be a string`,
        { field: source },
      );
    }
    mapped[target] = field;
  }
  if (request.digestRef !== undefined) {
    mapped.digest_ref = toSynthesisJsonObject(
      request.digestRef,
      "$.request.digestRef",
    );
  }
  if (request.includeRepresentativeImage !== undefined) {
    if (typeof request.includeRepresentativeImage !== "boolean") {
      throw new SynthesisClientError(
        "invalid_request",
        "Synthesis Workbench includeRepresentativeImage must be a boolean",
        { field: "includeRepresentativeImage" },
      );
    }
    mapped.include_representative_image = request.includeRepresentativeImage;
  }
  return mapped;
}

export function createInProcessSynthesisClient(
  legacy: LegacySynthesisPort,
): SynthesisClient {
  return {
    graph: {
      async recomputeCitationGraphLayout(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.recomputeCitationGraphLayout,
                "graph.recomputeCitationGraphLayout",
              )(normalizeCitationGraphLayoutRequest(request)),
            ) as SynthesisGraphCommandResult,
        );
      },
      async rebuildCitationGraphCacheNow() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.rebuildCitationGraphCacheNow,
                "graph.rebuildCitationGraphCacheNow",
              )(),
            ) as SynthesisGraphCommandResult,
        );
      },
      async refreshCitationGraphCacheIncrementalNow() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.refreshCitationGraphCacheIncrementalNow,
                "graph.refreshCitationGraphCacheIncrementalNow",
              )(),
            ) as SynthesisGraphCommandResult,
        );
      },
      async retryCitationGraphCacheRebuild() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.retryCitationGraphCacheRebuild,
                "graph.retryCitationGraphCacheRebuild",
              )(),
            ) as SynthesisGraphCommandResult,
        );
      },
    },
    references: {
      async refreshReferenceSidecarNow() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.refreshReferenceSidecarNow,
                "references.refreshReferenceSidecarNow",
              )(),
            ) as SynthesisReferenceCommandResult,
        );
      },
      async retryReferenceSidecarRefresh() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.retryReferenceSidecarRefresh,
                "references.retryReferenceSidecarRefresh",
              )(),
            ) as SynthesisReferenceCommandResult,
        );
      },
      async runAdvancedReferenceMatchingNow() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.runAdvancedReferenceMatchingNow,
                "references.runAdvancedReferenceMatchingNow",
              )(),
            ) as SynthesisReferenceCommandResult,
        );
      },
      async retryAdvancedReferenceMatching() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.retryAdvancedReferenceMatching,
                "references.retryAdvancedReferenceMatching",
              )(),
            ) as SynthesisReferenceCommandResult,
        );
      },
      async applyCanonicalRevisionReviewAction(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeCanonicalRevisionReviewRequest(request);
          const port = requireLegacyPort(
            legacy.applyCanonicalRevisionReviewAction,
            "references.applyCanonicalRevisionReviewAction",
          );
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
        });
      },
      async applyReferenceMatchProposalAction(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeReferenceMatchProposalActionRequest(request);
          const port = requireLegacyPort(
            legacy.applyReferenceMatchProposalAction,
            "references.applyReferenceMatchProposalAction",
          );
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
        });
      },
      async applyReferenceMatchProposalActions(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeReferenceMatchProposalActionsRequest(request);
          const port = requireLegacyPort(
            legacy.applyReferenceMatchProposalActions,
            "references.applyReferenceMatchProposalActions",
          );
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
        });
      },
    },
    topics: {
      async listWorkflowOptions(request) {
        try {
          return await legacy.listWorkflowTopicOptions(request);
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
      async getTopicReport(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.getTopicReport,
                "topics.getTopicReport",
              )(request),
            ) as SynthesisTopicReportResult,
        );
      },
    },
    system: {
      async reconcileRuntimeWorkOnStartup() {
        try {
          if (!legacy.reconcileSynthesisRuntimeWorkStateOnStartup) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis startup reconciliation is unavailable",
            );
          }
          return legacy.reconcileSynthesisRuntimeWorkStateOnStartup();
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    maintenance: {
      async resetDatabase(request) {
        try {
          if (!legacy.resetSynthesisDatabase) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis database reset is unavailable",
            );
          }
          return await legacy.resetSynthesisDatabase(request);
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    notifications: {
      async consumeRelatedItemsSyncEcho(request) {
        try {
          if (!legacy.consumeRelatedItemsSyncEcho) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis notification handling is unavailable",
            );
          }
          return {
            consumed: Boolean(
              await legacy.consumeRelatedItemsSyncEcho(request),
            ),
          };
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    workflowApply: {
      async applyLiteratureDigestSidecar(request) {
        return runLegacy(async () =>
          normalizeLegacyObject(
            await requireLegacyPort(
              legacy.applyLiteratureDigestSidecar,
              "workflowApply.applyLiteratureDigestSidecar",
            )(request),
          ),
        );
      },
      async applyTopicSynthesisResult(request: SynthesisTopicApplyRequest) {
        return runLegacy(async () => {
          const assets = new Map(
            request.assets.map((asset) => [asset.id, asset.text] as const),
          );
          if (assets.size !== request.assets.length) {
            throw new SynthesisClientError(
              "invalid_request",
              "Topic result contains duplicate asset ids",
            );
          }
          const result = await requireLegacyPort(
            legacy.applyTopicSynthesisResult,
            "workflowApply.applyTopicSynthesisResult",
          )(request.bundle, {
            bundleReader: {
              async readText(path) {
                const text = assets.get(path);
                if (text === undefined) {
                  throw new SynthesisClientError(
                    "invalid_request",
                    "Topic result referenced an unknown controlled asset",
                    { assetId: path },
                  );
                }
                return text;
              },
            },
          });
          return normalizeLegacyObject(result) as SynthesisTopicApplyResult;
        });
      },
    },
    artifacts: {
      async readPaperArtifacts(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.readPaperArtifacts,
                "artifacts.readPaperArtifacts",
              )(request),
            ) as SynthesisPaperArtifactsResult,
        );
      },
    },
    tags: {
      async loadTagVocabulary() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.loadTagVocabulary,
                "tags.loadTagVocabulary",
              )(),
            ) as SynthesisTagVocabularySnapshot,
        );
      },
      async saveTagVocabulary(request) {
        return runLegacy(async () =>
          normalizeLegacyJson(
            await requireLegacyPort(
              legacy.saveTagVocabulary,
              "tags.saveTagVocabulary",
            )(request),
          ),
        );
      },
      async exportTagVocabularyForRegulator() {
        return runLegacy(async () => {
          const result = normalizeLegacyJson(
            await requireLegacyPort(
              legacy.exportTagVocabularyForRegulator,
              "tags.exportTagVocabularyForRegulator",
            )(),
          );
          if (
            !Array.isArray(result) ||
            result.some((tag) => typeof tag !== "string")
          ) {
            throw new SynthesisClientError(
              "internal",
              "Tag regulator vocabulary response is invalid",
            );
          }
          return result.map((tag) => tag as string);
        });
      },
      async listStagedTagSuggestions() {
        return runLegacy(async () => {
          const result = normalizeLegacyJson(
            await requireLegacyPort(
              legacy.listStagedTagSuggestions,
              "tags.listStagedTagSuggestions",
            )(),
          );
          if (!Array.isArray(result)) {
            throw new SynthesisClientError(
              "internal",
              "Staged tag suggestion response is invalid",
            );
          }
          return result as SynthesisTagStagedSuggestion[];
        });
      },
      async stageTagSuggestions(request) {
        return runLegacy(async () =>
          normalizeLegacyJson(
            await requireLegacyPort(
              legacy.stageTagSuggestions,
              "tags.stageTagSuggestions",
            )(request),
          ),
        );
      },
      async discardStagedTagSuggestions(request) {
        return runLegacy(async () =>
          normalizeLegacyJson(
            await requireLegacyPort(
              legacy.discardStagedTagSuggestions,
              "tags.discardStagedTagSuggestions",
            )(request),
          ),
        );
      },
      async replaceTagAuditRecords(request) {
        return runLegacy(async () =>
          normalizeLegacyObject(
            await requireLegacyPort(
              legacy.replaceTagAuditRecords,
              "tags.replaceTagAuditRecords",
            )(request),
          ),
        );
      },
      async clearTagAuditRecord(request) {
        return runLegacy(async () => {
          await requireLegacyPort(
            legacy.clearTagAuditRecord,
            "tags.clearTagAuditRecord",
          )(request);
          return { ok: true as const };
        });
      },
    },
    workbench: {
      async readProgress() {
        return runLegacy(
          async () =>
            normalizeLegacyObject({
              maintenance: {
                backgroundJobs: await requireLegacyPort(
                  legacy.getSynthesisBackgroundJobRows,
                  "workbench.readProgress",
                )(),
              },
            }) as SynthesisWorkbenchProjection,
        );
      },
      async readChrome(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.getSynthesisWorkbenchChromeInput,
                "workbench.readChrome",
              )(normalizeWorkbenchState(request.state)),
            ) as SynthesisWorkbenchProjection,
        );
      },
      async readSurface(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.getSynthesisWorkbenchSurfaceInput,
                "workbench.readSurface",
              )(
                normalizeWorkbenchSurface(request.surface),
                normalizeWorkbenchState(request.state),
              ),
            ) as SynthesisWorkbenchProjection,
        );
      },
      async readTopicDetail(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.readTopicDetail,
                "workbench.readTopicDetail",
              )({ topicId: normalizeTopicId(request.topicId) }),
            ) as SynthesisWorkbenchTopicDetailResult,
        );
      },
      async readPaperDigest(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.resolveTopicPaperDigest,
                "workbench.readPaperDigest",
              )(mapPaperDigestRequest(request)),
            ) as SynthesisWorkbenchPaperDigestResult,
        );
      },
    },
  };
}
