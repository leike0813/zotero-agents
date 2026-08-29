import {
  SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS,
  rebuildSynthesisReferenceRefreshApplyRequest,
  rebuildSynthesisReferenceRefreshPageRequest,
  rebuildSynthesisReferenceRefreshPrepareRequest,
  type SynthesisReferenceRefreshInspectResult,
  type SynthesisReferenceRefreshMutationResult,
  type SynthesisReferenceRefreshPrepareRequest,
  type SynthesisReferenceRefreshPrepareResult,
  type SynthesisReferenceRefreshRead,
} from "../../synthesis-contracts/src/referenceRefreshApplication.js";
import {
  byteLengthSynthesisEngineText,
  canonicalizeSynthesisEngineJson,
  countSynthesisEngineJsonNodes,
  hashSynthesisEngineCanonicalJson,
} from "../../synthesis-engine/src/canonicalJson.js";
import type {
  SynthesisOperationRecord,
  SynthesisOperationStatusUpdate,
} from "../../synthesis-repository/src/index.js";
import type {
  SynthesisReferenceApplicationStateRecord,
  SynthesisReferenceArtifactRecord,
  SynthesisReferenceProjectionReplacement,
  SynthesisReferenceSourceRecord,
} from "../../synthesis-repository/src/referenceRefresh.js";
import {
  hashSynthesisReferenceProjection,
  projectSynthesisReferencePayloads,
  synthesisReferenceGraphFacts,
} from "./referenceProjection.js";

export type SynthesisReferenceRefreshRepository = {
  initializeReferenceRefreshApplication(): void;
  getReferenceApplicationState(): SynthesisReferenceApplicationStateRecord | null;
  replaceReferenceProjection(
    args: SynthesisReferenceProjectionReplacement,
  ): boolean;
  listReferenceSources(): SynthesisReferenceSourceRecord[];
  listReferenceArtifacts(
    sourceRefs?: string[],
  ): SynthesisReferenceArtifactRecord[];
  listRawReferences(): ReturnType<
    typeof projectSynthesisReferencePayloads
  >["rawReferences"];
  listCanonicalReferences(): ReturnType<
    typeof projectSynthesisReferencePayloads
  >["canonicals"];
  listReferenceBindings(): ReturnType<
    typeof projectSynthesisReferencePayloads
  >["bindings"];
  upsertOperation(record: SynthesisOperationRecord): void;
  updateOperationStatus(
    args: SynthesisOperationStatusUpdate,
  ): SynthesisOperationRecord | null;
};

type Preparation = {
  preparationId: string;
  operationId: string;
  inputHash: string;
  request: SynthesisReferenceRefreshPrepareRequest;
  reads: SynthesisReferenceRefreshRead[];
  replaceReferenceSourceRefs: string[];
};

type Options = {
  repository: SynthesisReferenceRefreshRepository;
  now?: () => string;
  createPreparationId?: () => string;
};

const OPERATION_WARNING = "reference_refresh_operation_receipt_failed";
const clean = (value: unknown) => String(value ?? "").trim();

function emptyResult<
  S extends SynthesisReferenceRefreshMutationResult["status"],
>(
  status: S,
  state: SynthesisReferenceApplicationStateRecord | null,
): SynthesisReferenceRefreshMutationResult & { status: S } {
  return {
    status,
    referenceHash: state?.referenceHash ?? null,
    inputHash: state?.inputHash ?? null,
    warnings: [],
    affectedSourceRefs: [],
  };
}

function descriptorKey(row: { paperRef: string; artifactType: string }) {
  return `${row.paperRef}\n${row.artifactType}`;
}

function descriptorChanged(
  current: SynthesisReferenceArtifactRecord | undefined,
  next: SynthesisReferenceRefreshPrepareRequest["artifacts"][number],
) {
  return (
    !current ||
    current.status !== next.status ||
    current.payloadHash !== clean(next.payloadHash) ||
    current.locator !== clean(next.locator) ||
    current.payloadType !== next.payloadType
  );
}

function inputHash(request: SynthesisReferenceRefreshPrepareRequest) {
  return hashSynthesisEngineCanonicalJson({
    scope: request.scope,
    items: request.items,
    artifacts: request.artifacts,
  });
}

function sourceRecord(
  item: SynthesisReferenceRefreshPrepareRequest["items"][number],
  timestamp: string,
): SynthesisReferenceSourceRecord {
  return {
    paperRef: item.paperRef,
    libraryId: item.libraryId,
    itemKey: item.itemKey,
    title: item.title,
    year: item.year,
    metadataHash:
      item.metadataHash ??
      hashSynthesisEngineCanonicalJson({
        title: item.title,
        year: item.year,
        date: item.date,
        creators: item.creators,
        tags: item.tags,
        collections: item.collections,
        doi: item.doi,
        arxiv: item.arxiv,
        isbn: item.isbn,
        url: item.url,
        citekey: item.citekey,
      }),
    summaryJson: canonicalizeSynthesisEngineJson(item),
    updatedAt: timestamp,
  };
}

function artifactRecord(
  descriptor: SynthesisReferenceRefreshPrepareRequest["artifacts"][number],
  timestamp: string,
): SynthesisReferenceArtifactRecord {
  return {
    paperRef: descriptor.paperRef,
    artifactType: descriptor.artifactType,
    payloadType: descriptor.payloadType,
    status: descriptor.status,
    locator: descriptor.locator ?? "",
    payloadHash: descriptor.payloadHash ?? "",
    diagnosticsJson: JSON.stringify(descriptor.diagnostics),
    updatedAt: timestamp,
  };
}

function mergeByKey<T>(
  current: T[],
  next: T[],
  key: (row: T) => string,
  removed: Set<string>,
) {
  const rows = new Map(
    current
      .filter((row) => !removed.has(key(row)))
      .map((row) => [key(row), row]),
  );
  for (const row of next) rows.set(key(row), row);
  return [...rows.values()];
}

export type SynthesisReferenceRefreshApplication = ReturnType<
  typeof createSynthesisReferenceRefreshApplication
>;

export function createSynthesisReferenceRefreshApplication(options: Options) {
  const repository = options.repository;
  const now = options.now ?? (() => new Date().toISOString());
  let sequence = 0;
  const createPreparationId =
    options.createPreparationId ??
    (() => `reference-refresh:${now()}:${++sequence}`);
  let preparation: Preparation | null = null;
  let stopping = false;
  let activeApply: Promise<SynthesisReferenceRefreshMutationResult> | null =
    null;
  repository.initializeReferenceRefreshApplication();

  const inspect = (): SynthesisReferenceRefreshInspectResult => {
    const state = repository.getReferenceApplicationState();
    return {
      referenceHash: state?.referenceHash ?? null,
      inputHash: state?.inputHash ?? null,
      sourceCount: state?.sourceCount ?? 0,
      referenceCount: state?.referenceCount ?? 0,
      canonicalCount: state?.canonicalCount ?? 0,
      bindingCount: state?.bindingCount ?? 0,
      referenceReady: state?.referenceReady ?? false,
      graphReady: state?.graphReady ?? false,
      relatedItemsReady: state?.relatedItemsReady ?? false,
    };
  };

  const prepareRefresh = async (
    requestInput: unknown,
  ): Promise<SynthesisReferenceRefreshPrepareResult> => {
    if (stopping) {
      return emptyResult("stopping", repository.getReferenceApplicationState());
    }
    if (preparation || activeApply) {
      return emptyResult(
        "reference_refresh_busy",
        repository.getReferenceApplicationState(),
      );
    }
    let request: SynthesisReferenceRefreshPrepareRequest;
    try {
      if (
        byteLengthSynthesisEngineText(JSON.stringify(requestInput)) >
          SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.preparationBytes ||
        countSynthesisEngineJsonNodes(requestInput) >
          SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.preparationJsonNodes
      ) {
        return emptyResult(
          "invalid_request",
          repository.getReferenceApplicationState(),
        );
      }
      request = rebuildSynthesisReferenceRefreshPrepareRequest(requestInput);
    } catch {
      return emptyResult(
        "invalid_request",
        repository.getReferenceApplicationState(),
      );
    }
    let state: SynthesisReferenceApplicationStateRecord | null;
    try {
      state = repository.getReferenceApplicationState();
    } catch {
      return emptyResult("repair_required", null);
    }
    if ((state?.referenceHash ?? null) !== request.expectedReferenceHash) {
      return emptyResult("basis_mismatch", state);
    }
    const nextInputHash = inputHash(request);
    if (
      request.scope.kind === "full" &&
      state?.inputHash === nextInputHash &&
      !request.force
    ) {
      return emptyResult("unchanged", state);
    }
    let currentArtifacts: Map<string, SynthesisReferenceArtifactRecord>;
    try {
      currentArtifacts = new Map(
        repository
          .listReferenceArtifacts(request.items.map((item) => item.paperRef))
          .map((row) => [descriptorKey(row), row]),
      );
    } catch {
      return emptyResult("repair_required", state);
    }
    const descriptors = new Map(
      request.artifacts.map((row) => [descriptorKey(row), row]),
    );
    const replaceReferenceSourceRefs = request.items
      .map((item) => item.paperRef)
      .filter((paperRef) => {
        const descriptor = descriptors.get(`${paperRef}\nreferences`)!;
        return (
          request.force ||
          descriptorChanged(
            currentArtifacts.get(`${paperRef}\nreferences`),
            descriptor,
          )
        );
      });
    const reads = replaceReferenceSourceRefs
      .flatMap((paperRef): SynthesisReferenceRefreshRead[] => {
        const references = descriptors.get(`${paperRef}\nreferences`)!;
        const citation = descriptors.get(`${paperRef}\ncitation_analysis`)!;
        return [citation, references]
          .filter(
            (descriptor) =>
              descriptor.status === "available" &&
              descriptor.locator &&
              descriptor.payloadHash,
          )
          .map((descriptor) => ({
            paperRef,
            artifactType: descriptor.artifactType as
              | "references"
              | "citation_analysis",
            locator: descriptor.locator!,
            expectedHash: descriptor.payloadHash!,
          }));
      })
      .sort(
        (left, right) =>
          left.paperRef.localeCompare(right.paperRef) ||
          left.artifactType.localeCompare(right.artifactType),
      );
    if (
      !request.force &&
      !replaceReferenceSourceRefs.length &&
      request.scope.kind === "sources" &&
      request.items.every((item) =>
        request.artifacts
          .filter((artifact) => artifact.paperRef === item.paperRef)
          .every(
            (artifact) =>
              !descriptorChanged(
                currentArtifacts.get(descriptorKey(artifact)),
                artifact,
              ),
          ),
      )
    ) {
      return emptyResult("unchanged", state);
    }
    const preparationId = createPreparationId();
    const operationId = preparationId;
    try {
      repository.upsertOperation({
        operationId,
        operationType: "reference_sidecar_refresh",
        scopeKind: request.scope.kind,
        scopeRef:
          request.scope.kind === "full"
            ? "library"
            : request.scope.sourceRefs.join(","),
        status: "running",
        label: "Reference refresh preparation",
        phase: "prepared",
        progressMode: "determinate",
        processedCount: 0,
        totalCount: reads.length,
        basisKind: "reference_hash",
        basisValue: request.expectedReferenceHash ?? "",
        sourceHash: nextInputHash,
        createdAt: now(),
        startedAt: now(),
        updatedAt: now(),
      });
    } catch {
      return emptyResult("repair_required", state);
    }
    preparation = {
      preparationId,
      operationId,
      inputHash: nextInputHash,
      request,
      reads,
      replaceReferenceSourceRefs,
    };
    return {
      ...emptyResult("prepared", state),
      status: "prepared",
      inputHash: nextInputHash,
      preparationId,
      reads,
    };
  };

  const runApply = async (
    prepared: Preparation,
    requestInput: unknown,
  ): Promise<SynthesisReferenceRefreshMutationResult> => {
    await Promise.resolve();
    let request: ReturnType<
      typeof rebuildSynthesisReferenceRefreshApplyRequest
    >;
    try {
      if (
        byteLengthSynthesisEngineText(JSON.stringify(requestInput)) >
          SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.materializedBatchBytes ||
        countSynthesisEngineJsonNodes(requestInput) >
          SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.materializedBatchJsonNodes
      ) {
        throw new Error("reference_refresh_payload_too_large");
      }
      request = rebuildSynthesisReferenceRefreshApplyRequest(requestInput);
    } catch {
      repository.updateOperationStatus({
        operationId: prepared.operationId,
        status: "failed",
        phase: "invalid_request",
      });
      return emptyResult(
        "invalid_request",
        repository.getReferenceApplicationState(),
      );
    }
    if (request.preparationId !== prepared.preparationId) {
      return emptyResult(
        "preparation_missing",
        repository.getReferenceApplicationState(),
      );
    }
    const plannedKeys = prepared.reads.map(
      (read) => `${read.locator}\n${read.expectedHash}`,
    );
    const payloadKeys = request.payloads.map(
      (payload) => `${payload.locator}\n${payload.expectedHash}`,
    );
    const payloadByKey = new Map(
      request.payloads.map((payload) => [
        `${payload.locator}\n${payload.expectedHash}`,
        payload,
      ]),
    );
    if (
      payloadKeys.length !== plannedKeys.length ||
      new Set(payloadKeys).size !== payloadKeys.length ||
      plannedKeys.some((key) => !payloadByKey.has(key)) ||
      request.payloads.some(
        (payload) =>
          payload.result.status !== "available" ||
          payload.result.payloadHash !== payload.expectedHash ||
          !payload.result.content ||
          payload.result.content.kind !== "json",
      )
    ) {
      repository.updateOperationStatus({
        operationId: prepared.operationId,
        status: "failed",
        phase: "payload_stale",
      });
      return emptyResult(
        "payload_stale",
        repository.getReferenceApplicationState(),
      );
    }
    const current = repository.getReferenceApplicationState();
    if (
      (current?.referenceHash ?? null) !==
      prepared.request.expectedReferenceHash
    ) {
      return emptyResult("basis_mismatch", current);
    }
    const timestamp = now();
    const descriptors = new Map(
      prepared.request.artifacts.map((row) => [descriptorKey(row), row]),
    );
    const plannedBySource = new Map<string, Record<string, unknown>>();
    for (const read of prepared.reads) {
      const payload = payloadByKey.get(
        `${read.locator}\n${read.expectedHash}`,
      )!;
      const source = plannedBySource.get(read.paperRef) ?? {};
      source[read.artifactType] = (
        payload.result.content as { kind: "json"; value: unknown }
      ).value;
      plannedBySource.set(read.paperRef, source);
    }
    let projected: ReturnType<typeof projectSynthesisReferencePayloads>;
    try {
      projected = projectSynthesisReferencePayloads({
        items: prepared.request.items,
        sources: prepared.replaceReferenceSourceRefs.map((paperRef) => ({
          paperRef,
          referencesArtifactHash:
            descriptors.get(`${paperRef}\nreferences`)?.payloadHash ?? "",
          referencesPayload: plannedBySource.get(paperRef)?.references,
          citationAnalysisPayload:
            plannedBySource.get(paperRef)?.citation_analysis,
        })),
        timestamp,
      });
    } catch {
      return emptyResult("projection_failed", current);
    }
    const nextSources = prepared.request.items.map((item) =>
      sourceRecord(item, timestamp),
    );
    const nextArtifacts = prepared.request.artifacts.map((artifact) =>
      artifactRecord(artifact, timestamp),
    );
    const currentSources = repository.listReferenceSources();
    const currentArtifacts = repository.listReferenceArtifacts();
    const currentRaw = repository.listRawReferences();
    const currentBindings = repository.listReferenceBindings();
    const sourceScope = new Set(
      prepared.request.items.map((item) => item.paperRef),
    );
    const removedSourceKeys = new Set(
      prepared.request.scope.kind === "full"
        ? currentSources
            .filter((row) => !sourceScope.has(row.paperRef))
            .map((row) => row.paperRef)
        : [],
    );
    const replacementSources = new Set(prepared.replaceReferenceSourceRefs);
    const finalSources = mergeByKey(
      currentSources,
      nextSources,
      (row) => row.paperRef,
      removedSourceKeys,
    );
    const removedArtifactKeys = new Set(
      currentArtifacts
        .filter(
          (row) =>
            removedSourceKeys.has(row.paperRef) ||
            sourceScope.has(row.paperRef),
        )
        .map(descriptorKey),
    );
    const finalArtifacts = mergeByKey(
      currentArtifacts,
      nextArtifacts,
      descriptorKey,
      removedArtifactKeys,
    );
    const finalRaw = [
      ...currentRaw.filter(
        (row) =>
          !replacementSources.has(row.sourceRef) &&
          !removedSourceKeys.has(row.sourceRef),
      ),
      ...projected.rawReferences,
    ];
    const finalBindings = mergeByKey(
      currentBindings,
      projected.bindings,
      (row) => row.bindingId,
      new Set(),
    );
    const finalCanonicalIds = new Set(
      finalRaw.map((row) => clean(row.canonicalReferenceId)).filter(Boolean),
    );
    const protectedCanonicalIds = new Set(
      currentBindings
        .filter(
          (row) =>
            clean(row.reviewer) !== "reference-refresh-application" ||
            row.status === "rejected",
        )
        .map((row) => row.canonicalReferenceId),
    );
    const reviews = Array.from(
      new Set(
        currentRaw
          .filter((row) => replacementSources.has(row.sourceRef))
          .map((row) => clean(row.canonicalReferenceId))
          .filter(
            (canonicalReferenceId) =>
              canonicalReferenceId &&
              protectedCanonicalIds.has(canonicalReferenceId) &&
              !finalCanonicalIds.has(canonicalReferenceId),
          ),
      ),
    ).map((canonicalReferenceId) => ({
      reviewId: `canonical-revision:${hashSynthesisEngineCanonicalJson({
        canonicalReferenceId,
        sourceRefs: prepared.replaceReferenceSourceRefs,
        inputHash: prepared.inputHash,
      }).slice(7, 31)}`,
      sourceRef:
        currentRaw.find(
          (row) => row.canonicalReferenceId === canonicalReferenceId,
        )?.sourceRef ?? "",
      canonicalReferenceId,
      status: "open",
      reason: "protected_stale_canonical_revision",
      payloadJson: canonicalizeSynthesisEngineJson({
        canonicalReferenceId,
        inputHash: prepared.inputHash,
      }),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const referenceHash = hashSynthesisReferenceProjection({
      sources: finalSources,
      artifacts: finalArtifacts,
      rawReferences: finalRaw,
      bindings: finalBindings,
    });
    const graphFactsChanged =
      canonicalizeSynthesisEngineJson(
        synthesisReferenceGraphFacts(currentRaw),
      ) !==
      canonicalizeSynthesisEngineJson(synthesisReferenceGraphFacts(finalRaw));
    let promoted: boolean;
    try {
      promoted = repository.replaceReferenceProjection({
        expectedReferenceHash: prepared.request.expectedReferenceHash,
        referenceHash,
        inputHash: prepared.inputHash,
        scope: prepared.request.scope.kind,
        sourceRefs: prepared.request.items.map((item) => item.paperRef),
        replaceReferenceSourceRefs: prepared.replaceReferenceSourceRefs,
        sources: nextSources,
        artifacts: nextArtifacts,
        rawReferences: projected.rawReferences,
        canonicals: projected.canonicals,
        bindings: projected.bindings,
        reviews,
        graphFactsChanged,
        now: timestamp,
      });
    } catch {
      return emptyResult(
        "repair_required",
        repository.getReferenceApplicationState(),
      );
    }
    if (!promoted) {
      return emptyResult(
        "basis_mismatch",
        repository.getReferenceApplicationState(),
      );
    }
    const result: SynthesisReferenceRefreshMutationResult = {
      status: "promoted",
      referenceHash,
      inputHash: prepared.inputHash,
      warnings: [],
      affectedSourceRefs: prepared.replaceReferenceSourceRefs.slice(
        0,
        SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.deltaSources,
      ),
    };
    try {
      repository.updateOperationStatus({
        operationId: prepared.operationId,
        status: "completed",
        phase: "commit",
        processedCount: prepared.reads.length,
        totalCount: prepared.reads.length,
      });
    } catch {
      result.warnings.push(OPERATION_WARNING);
    }
    return result;
  };

  const applyRefresh = async (
    requestInput: unknown,
  ): Promise<SynthesisReferenceRefreshMutationResult> => {
    if (stopping) {
      return emptyResult("stopping", repository.getReferenceApplicationState());
    }
    if (activeApply) {
      return emptyResult(
        "reference_refresh_busy",
        repository.getReferenceApplicationState(),
      );
    }
    let preparationId = "";
    if (
      requestInput &&
      typeof requestInput === "object" &&
      !Array.isArray(requestInput)
    ) {
      preparationId = clean(
        (requestInput as { preparationId?: unknown }).preparationId,
      );
    }
    if (!preparation || preparation.preparationId !== preparationId) {
      return emptyResult(
        "preparation_missing",
        repository.getReferenceApplicationState(),
      );
    }
    const prepared = preparation;
    preparation = null;
    const running = runApply(prepared, requestInput);
    activeApply = running;
    try {
      return await running;
    } finally {
      activeApply = null;
    }
  };

  const discardPreparation = () => {
    if (!preparation) return false;
    const discarded = preparation;
    preparation = null;
    try {
      repository.updateOperationStatus({
        operationId: discarded.operationId,
        status: "canceled",
        phase: "discarded",
      });
    } catch {
      // The in-memory lease remains discarded even if the receipt is damaged.
    }
    return true;
  };

  const readPage = <T>(rows: T[], requestInput: unknown) => {
    const request = rebuildSynthesisReferenceRefreshPageRequest(requestInput);
    const offset = request.cursor ? Number(request.cursor) : 0;
    const pageRows = rows.slice(offset, offset + request.limit);
    const nextOffset = offset + pageRows.length;
    return {
      rows: pageRows,
      cursor: request.cursor,
      nextCursor: nextOffset < rows.length ? String(nextOffset) : "",
      hasMore: nextOffset < rows.length,
      returned: pageRows.length,
      total: rows.length,
      limit: request.limit,
    };
  };

  return {
    inspect,
    readSources: (requestInput: unknown = {}) =>
      readPage(repository.listReferenceSources(), requestInput),
    readReferences: (requestInput: unknown = {}) =>
      readPage(repository.listRawReferences(), requestInput),
    prepareRefresh,
    applyRefresh,
    discardPreparation,
    stopAdmission() {
      stopping = true;
    },
    async shutdown() {
      stopping = true;
      discardPreparation();
      if (activeApply) await activeApply;
    },
  };
}
