import {
  SYNTHESIS_WORKBENCH_SURFACES,
  SynthesisClientError,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
  type SynthesisDatabaseResetRequest,
  type SynthesisDatabaseResetResult,
  type SynthesisLiteratureDigestApplyRequest,
  type SynthesisPaperArtifactsRequest,
  type SynthesisPaperArtifactsResult,
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
  type SynthesisWorkbenchPaperDigestResult,
  type SynthesisWorkbenchProjection,
  type SynthesisWorkbenchSurfaceName,
  type SynthesisWorkbenchTopicDetailResult,
} from "../../../packages/synthesis-contracts/src/index";

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
  readTopicDetail?(request: { topicId: string }): Promise<unknown>;
  resolveTopicPaperDigest?(request: Record<string, unknown>): Promise<unknown>;
}

function normalizeClientError(error: unknown): SynthesisClientError {
  if (error instanceof SynthesisClientError) {
    return error;
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
