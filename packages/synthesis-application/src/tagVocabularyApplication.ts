import {
  SYNTHESIS_HOST_STAGED_TAG_BINDING_RESOLUTION_ID_MAX,
  SYNTHESIS_HOST_TAG_EFFECT_BATCH_MAX,
  rebuildSynthesisHostStagedTagBindingResolutionResult,
  rebuildSynthesisHostTagEffectBatchRequest,
  rebuildSynthesisHostTagEffectBatchResult,
  type SynthesisHostStagedTagBindingMigrationPort,
  type SynthesisHostTagEffect,
  type SynthesisHostTagEffectPort,
} from "../../synthesis-contracts/src/tagEffect.js";
import {
  SYNTHESIS_TAG_VOCABULARY_APPLICATION_CONTRACT_VERSION,
  rebuildSynthesisTagVocabularyApplicationAuditClearRequest,
  rebuildSynthesisTagVocabularyApplicationAuditReplaceRequest,
  rebuildSynthesisTagVocabularyApplicationCandidate,
  rebuildSynthesisTagVocabularyApplicationEntryDeleteRequest,
  rebuildSynthesisTagVocabularyApplicationEntryUpdateRequest,
  rebuildSynthesisTagVocabularyApplicationPageRequest,
  rebuildSynthesisTagVocabularyApplicationRebuildIndexRequest,
  rebuildSynthesisTagVocabularyApplicationSaveRequest,
  rebuildSynthesisTagVocabularyApplicationSelectionRequest,
  rebuildSynthesisTagVocabularyApplicationStageRequest,
  rebuildSynthesisTagVocabularyApplicationStagedPage,
  rebuildSynthesisTagVocabularyApplicationState,
  rebuildSynthesisTagVocabularyApplicationUpdateStagedRequest,
  rebuildSynthesisTagVocabularyApplicationMutationResult,
  type SynthesisTagVocabularyApplicationCandidate,
  type SynthesisTagVocabularyApplicationEntry,
  type SynthesisTagVocabularyApplicationMutationResult,
  type SynthesisTagVocabularyApplicationSnapshot,
  type SynthesisTagVocabularyApplicationStagedSuggestion,
} from "../../synthesis-contracts/src/tagVocabularyApplication.js";
import {
  SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
  SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
  SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
  rebuildSynthesisTagVocabularyIndexResultPayload,
  rebuildSynthesisTagVocabularyValidationResultPayload,
  type SynthesisTagVocabularyIndexRequest,
  type SynthesisTagVocabularyIndexResult,
  type SynthesisTagVocabularyValidationRequest,
  type SynthesisTagVocabularyValidationResult,
} from "../../synthesis-engine/src/tagVocabulary.js";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../synthesis-engine/src/canonicalJson.js";
import type {
  SynthesisTagApplicationStateRecord,
  SynthesisTagAuditRecord,
  SynthesisTagEffectRecord,
  SynthesisTagEffectStatus,
  SynthesisTagStagedSuggestionRecord,
  SynthesisTagVocabularyStateRecords,
} from "../../synthesis-repository/src/tagVocabulary.js";

const DEFAULT_PROTOCOL = {
  version: "1.0.0",
  tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
  maxTagLength: 120,
  facets: [
    "field",
    "topic",
    "method",
    "model",
    "ai_task",
    "data",
    "tool",
    "status",
  ],
};

export type SynthesisTagVocabularyApplicationRepository = {
  initializeTagVocabularyApplication(): void;
  getTagApplicationState(): SynthesisTagApplicationStateRecord | null;
  listTagVocabularyEntries(): SynthesisTagVocabularyStateRecords["entries"];
  listTagAliases(): SynthesisTagVocabularyStateRecords["aliases"];
  listTagAbbrevs(): SynthesisTagVocabularyStateRecords["abbrevs"];
  getTagProtocol(): SynthesisTagVocabularyStateRecords["protocol"] | null;
  listTagValidationWarnings(): SynthesisTagVocabularyStateRecords["warnings"];
  replaceTagVocabularyState(args: {
    expectedVocabularyHash: string | null;
    vocabularyHash: string;
    state: SynthesisTagVocabularyStateRecords;
    now: string;
  }): boolean;
  listTagStagedSuggestions(): SynthesisTagStagedSuggestionRecord[];
  replaceTagStagedSuggestions(args: {
    expectedStagedRevision: number;
    rows: SynthesisTagStagedSuggestionRecord[];
    now: string;
  }): number | null;
  promoteTagVocabularyState(args: {
    expectedVocabularyHash: string | null;
    expectedStagedRevision: number;
    vocabularyHash: string;
    state: SynthesisTagVocabularyStateRecords;
    stagedRows: SynthesisTagStagedSuggestionRecord[];
    effects: SynthesisTagEffectRecord[];
    now: string;
  }): number | null;
  promoteTagIndex(args: {
    expectedVocabularyHash: string;
    indexHash: string;
    indexJson: string;
    now: string;
  }): boolean;
  listTagEffects(args?: {
    statuses?: SynthesisTagEffectStatus[];
  }): SynthesisTagEffectRecord[];
  recordTagEffectReceipts(
    rows: Array<
      Pick<
        SynthesisTagEffectRecord,
        "effectId" | "status" | "occurredAt" | "diagnosticsJson"
      >
    >,
    timestamp: string,
  ): number;
  listTagAuditRecords(args?: { libraryId?: number }): SynthesisTagAuditRecord[];
  replaceTagAuditRecords(args: {
    libraryId: number;
    rows: SynthesisTagAuditRecord[];
    now: string;
  }): void;
  upsertTagAuditRecord(row: SynthesisTagAuditRecord, timestamp: string): void;
};

export type SynthesisTagVocabularyApplicationCompute = {
  validate(
    request: SynthesisTagVocabularyValidationRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTagVocabularyValidationResult>;
  buildIndex(
    request: SynthesisTagVocabularyIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTagVocabularyIndexResult>;
};

type Options = {
  repository: SynthesisTagVocabularyApplicationRepository;
  compute: SynthesisTagVocabularyApplicationCompute;
  tagEffectPort?: SynthesisHostTagEffectPort | null;
  bindingMigrationPort?: SynthesisHostStagedTagBindingMigrationPort | null;
  legacyLibraryId?: number;
  now?: () => string;
};

const clean = (value: unknown) => String(value ?? "").trim();

export type SynthesisTagVocabularyApplicationCandidateRepository = Pick<
  SynthesisTagVocabularyApplicationRepository,
  | "getTagProtocol"
  | "listTagVocabularyEntries"
  | "listTagAliases"
  | "listTagAbbrevs"
>;

export function readSynthesisTagVocabularyApplicationCandidate(
  repository: SynthesisTagVocabularyApplicationCandidateRepository,
): SynthesisTagVocabularyApplicationCandidate {
  const protocol = repository.getTagProtocol();
  return rebuildSynthesisTagVocabularyApplicationCandidate({
    entries: repository.listTagVocabularyEntries().map((row) => ({
      tag: row.tag,
      facet: row.facet,
      note: row.note,
      deprecated: row.deprecated,
      replacement: row.replacement,
      aliases: JSON.parse(row.aliasesJson || "[]"),
      abbrev: JSON.parse(row.abbrevJson || "[]"),
      source: row.source,
      usageCount: row.usageCount,
      lastSyncedAt: row.lastSyncedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    aliases: Object.fromEntries(
      repository.listTagAliases().map((row) => [row.alias, row.tag]),
    ),
    abbrev: Object.fromEntries(
      repository
        .listTagAbbrevs()
        .map((row) => [row.abbrevKey, row.abbrevValue]),
    ),
    protocol: protocol
      ? {
          version: protocol.version,
          tagPattern: protocol.tagPattern,
          maxTagLength: protocol.maxTagLength,
          facets: JSON.parse(protocol.facetsJson),
        }
      : DEFAULT_PROTOCOL,
  });
}

export function hashSynthesisTagVocabularyApplicationCandidate(
  candidate: SynthesisTagVocabularyApplicationCandidate,
) {
  return hashSynthesisEngineCanonicalJson({
    contractVersion: SYNTHESIS_TAG_VOCABULARY_APPLICATION_CONTRACT_VERSION,
    candidate,
  });
}

function validationRequest(
  candidate: SynthesisTagVocabularyApplicationCandidate,
): SynthesisTagVocabularyValidationRequest {
  return {
    contractVersion: SYNTHESIS_TAG_VOCABULARY_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TAG_VOCABULARY_VALIDATION_VERSION,
    entries: candidate.entries.map(
      ({ tag, facet, note, deprecated, replacement, aliases, abbrev }) => ({
        tag,
        facet,
        ...(note ? { note } : {}),
        ...(deprecated ? { deprecated: true } : {}),
        ...(replacement ? { replacement } : {}),
        aliases,
        abbrev,
      }),
    ),
    aliases: candidate.aliases,
    abbrev: candidate.abbrev,
    protocol: candidate.protocol,
  };
}

export function synthesisTagVocabularyStateRecordsFromCandidate(
  candidate: SynthesisTagVocabularyApplicationCandidate,
  timestamp: string,
  warnings: SynthesisTagVocabularyValidationResult["warnings"] = [],
): SynthesisTagVocabularyStateRecords {
  return {
    entries: candidate.entries.map((row) => ({
      tag: row.tag,
      facet: row.facet,
      note: row.note,
      source: row.source,
      deprecated: row.deprecated,
      replacement: row.replacement,
      aliasesJson: JSON.stringify(row.aliases),
      abbrevJson: JSON.stringify(row.abbrev),
      usageCount: row.usageCount,
      lastSyncedAt: row.lastSyncedAt,
      createdAt: row.createdAt || timestamp,
      updatedAt: timestamp,
    })),
    aliases: Object.entries(candidate.aliases).map(([alias, tag]) => ({
      alias,
      tag,
      updatedAt: timestamp,
    })),
    abbrevs: Object.entries(candidate.abbrev).map(
      ([abbrevKey, abbrevValue]) => ({
        abbrevKey,
        abbrevValue,
        updatedAt: timestamp,
      }),
    ),
    protocol: {
      protocolId: "default",
      version: candidate.protocol.version,
      tagPattern: candidate.protocol.tagPattern,
      maxTagLength: candidate.protocol.maxTagLength,
      facetsJson: JSON.stringify(candidate.protocol.facets),
      updatedAt: timestamp,
    },
    warnings: warnings.map((warning) => ({
      warningId: hashSynthesisEngineCanonicalJson({
        code: warning.code,
        tag: warning.tag || "",
        message: warning.message,
      }),
      code: warning.code,
      severity: warning.severity,
      tag: warning.tag,
      message: warning.message,
      updatedAt: timestamp,
    })),
  };
}

function stateRecords(
  candidate: SynthesisTagVocabularyApplicationCandidate,
  validation: SynthesisTagVocabularyValidationResult,
  timestamp: string,
) {
  return synthesisTagVocabularyStateRecordsFromCandidate(
    candidate,
    timestamp,
    validation.warnings,
  );
}

function stagedFromRecord(
  row: SynthesisTagStagedSuggestionRecord,
): SynthesisTagVocabularyApplicationStagedSuggestion {
  const values = JSON.parse(row.parentBindingsJson || "[]") as unknown[];
  if (values.some((value) => typeof value === "number")) {
    throw new Error("legacy_tag_bindings");
  }
  return rebuildSynthesisTagVocabularyApplicationStageRequest({
    expectedStagedRevision: 0,
    entries: [
      {
        tag: row.tag,
        facet: row.facet,
        note: row.note,
        sourceFlow: row.sourceFlow,
        parentBindings: values,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ],
  }).entries[0]!;
}

function stagedRecord(
  row: SynthesisTagVocabularyApplicationStagedSuggestion,
): SynthesisTagStagedSuggestionRecord {
  return {
    tag: row.tag,
    facet: row.facet,
    note: row.note,
    sourceFlow: row.sourceFlow,
    parentBindingsJson: JSON.stringify(row.parentBindings),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function emptyResult(
  status: SynthesisTagVocabularyApplicationMutationResult["status"],
  state: SynthesisTagApplicationStateRecord | null,
  warnings: string[] = [],
): SynthesisTagVocabularyApplicationMutationResult {
  return rebuildSynthesisTagVocabularyApplicationMutationResult({
    status,
    vocabularyHash: state?.vocabularyHash ?? null,
    stagedRevision: state?.stagedRevision ?? 0,
    warnings,
    changedTags: [],
    diagnostics: [],
  });
}

function mergeStaged(
  current: SynthesisTagVocabularyApplicationStagedSuggestion | undefined,
  next: SynthesisTagVocabularyApplicationStagedSuggestion,
  timestamp: string,
) {
  const refs = new Map(
    [...(current?.parentBindings || []), ...next.parentBindings].map((row) => [
      `${row.libraryId}\n${row.itemKey}`,
      row,
    ]),
  );
  return {
    ...current,
    ...next,
    note: next.note || current?.note,
    sourceFlow:
      next.sourceFlow || current?.sourceFlow || "tag-regulator-suggest",
    parentBindings: [...refs.values()].sort(
      (left, right) =>
        left.libraryId - right.libraryId ||
        left.itemKey.localeCompare(right.itemKey),
    ),
    createdAt: current?.createdAt || timestamp,
    updatedAt: timestamp,
  } satisfies SynthesisTagVocabularyApplicationStagedSuggestion;
}

function workerStatus(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return code === "worker_canceled" ? "stopping" : "worker_failed";
}

export type SynthesisTagVocabularyApplication = ReturnType<
  typeof createSynthesisTagVocabularyApplication
>;

export function createSynthesisTagVocabularyApplication(options: Options) {
  const { repository, compute } = options;
  const now = options.now ?? (() => new Date().toISOString());
  let stopping = false;
  let active: {
    controller: AbortController;
    promise: Promise<unknown>;
  } | null = null;
  repository.initializeTagVocabularyApplication();

  const state = () => repository.getTagApplicationState();
  const inspect = () => {
    const current = state();
    return rebuildSynthesisTagVocabularyApplicationState({
      vocabularyHash: current?.vocabularyHash ?? null,
      stagedRevision: current?.stagedRevision ?? 0,
      indexHash: current?.indexHash ?? null,
      indexBasisHash: current?.indexBasisHash ?? null,
      indexStale: current?.indexStale ?? true,
      entryCount: repository.listTagVocabularyEntries().length,
      stagedCount: repository.listTagStagedSuggestions().length,
      auditCount: repository.listTagAuditRecords().length,
      pendingEffectCount: repository.listTagEffects({ statuses: ["pending"] })
        .length,
    });
  };

  const loadVocabulary = (): SynthesisTagVocabularyApplicationSnapshot => {
    const current = state();
    const candidate =
      readSynthesisTagVocabularyApplicationCandidate(repository);
    return {
      ...inspect(),
      ...candidate,
      warnings: repository.listTagValidationWarnings().map((row) => ({
        code: row.code,
        severity: row.severity,
        ...(row.tag ? { tag: row.tag } : {}),
        message: row.message,
      })),
      index:
        current?.indexJson && current.indexJson !== "{}"
          ? (JSON.parse(current.indexJson) as SynthesisTagVocabularyIndexResult)
          : null,
    };
  };

  const runMutation = async <T>(
    run: (signal: AbortSignal) => Promise<T>,
    busy: T,
    stopped: T,
  ) => {
    if (stopping) return stopped;
    if (active) return busy;
    const controller = new AbortController();
    const promise = run(controller.signal);
    active = { controller, promise };
    try {
      return await promise;
    } finally {
      if (active?.promise === promise) active = null;
    }
  };

  const requireSynchronousMutationAdmission = () => {
    const code = stopping ? "stopping" : active ? "tag_vocabulary_busy" : null;
    if (code) throw Object.assign(new Error(code), { code });
  };

  const validateCandidate = async (
    candidate: SynthesisTagVocabularyApplicationCandidate,
    signal?: AbortSignal,
  ) =>
    rebuildSynthesisTagVocabularyValidationResultPayload(
      await compute.validate(validationRequest(candidate), { signal }),
    );

  const commitCandidate = async (
    expectedVocabularyHash: string | null,
    candidate: SynthesisTagVocabularyApplicationCandidate,
    signal: AbortSignal,
  ) => {
    const current = state();
    if ((current?.vocabularyHash ?? null) !== expectedVocabularyHash)
      return emptyResult("basis_mismatch", current);
    let validation: SynthesisTagVocabularyValidationResult;
    try {
      validation = await validateCandidate(candidate, signal);
    } catch (error) {
      return emptyResult(workerStatus(error), state());
    }
    if (validation.warnings.some((row) => row.severity === "error")) {
      return emptyResult(
        "engine_failed",
        current,
        validation.warnings.map((row) => row.code),
      );
    }
    const nextHash = hashSynthesisTagVocabularyApplicationCandidate(candidate);
    if (nextHash === expectedVocabularyHash)
      return emptyResult("unchanged", current);
    const timestamp = now();
    if (
      !repository.replaceTagVocabularyState({
        expectedVocabularyHash,
        vocabularyHash: nextHash,
        state: stateRecords(candidate, validation, timestamp),
        now: timestamp,
      })
    ) {
      return emptyResult("basis_mismatch", state());
    }
    return {
      ...emptyResult("committed", state()),
      changedTags: candidate.entries.map((row) => row.tag),
    };
  };

  const save = async (input: unknown) => {
    let request: ReturnType<
      typeof rebuildSynthesisTagVocabularyApplicationSaveRequest
    >;
    try {
      request = rebuildSynthesisTagVocabularyApplicationSaveRequest(input);
    } catch {
      return emptyResult("invalid_request", state());
    }
    return runMutation(
      (signal) =>
        commitCandidate(
          request.expectedVocabularyHash,
          request.candidate,
          signal,
        ),
      emptyResult("tag_vocabulary_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const validate = async (input: unknown) => {
    try {
      const candidate =
        input === undefined
          ? readSynthesisTagVocabularyApplicationCandidate(repository)
          : rebuildSynthesisTagVocabularyApplicationCandidate(input);
      return await validateCandidate(candidate);
    } catch {
      return null;
    }
  };

  const listStaged = (input: unknown) => {
    const request = rebuildSynthesisTagVocabularyApplicationPageRequest(input);
    const rows = repository.listTagStagedSuggestions().map(stagedFromRecord);
    const start = request.cursor
      ? rows.findIndex((row) => row.tag === request.cursor) + 1
      : 0;
    const entries = rows.slice(
      Math.max(0, start),
      Math.max(0, start) + request.limit,
    );
    return rebuildSynthesisTagVocabularyApplicationStagedPage({
      entries,
      nextCursor:
        start + entries.length < rows.length
          ? (entries.at(-1)?.tag ?? null)
          : null,
      stagedRevision: state()?.stagedRevision ?? 0,
    });
  };

  const stage = async (input: unknown) => {
    let request: ReturnType<
      typeof rebuildSynthesisTagVocabularyApplicationStageRequest
    >;
    try {
      request = rebuildSynthesisTagVocabularyApplicationStageRequest(input);
    } catch {
      return emptyResult("invalid_request", state());
    }
    return runMutation(
      async () => {
        const current = state();
        if ((current?.stagedRevision ?? 0) !== request.expectedStagedRevision)
          return emptyResult("basis_mismatch", current);
        const timestamp = now();
        const rows = repository
          .listTagStagedSuggestions()
          .map(stagedFromRecord);
        const byTag = new Map(rows.map((row) => [row.tag.toLowerCase(), row]));
        request.entries.forEach((row) =>
          byTag.set(
            row.tag.toLowerCase(),
            mergeStaged(byTag.get(row.tag.toLowerCase()), row, timestamp),
          ),
        );
        const next = repository.replaceTagStagedSuggestions({
          expectedStagedRevision: request.expectedStagedRevision,
          rows: [...byTag.values()].map(stagedRecord),
          now: timestamp,
        });
        if (next === null) return emptyResult("basis_mismatch", state());
        return {
          ...emptyResult("committed", state()),
          changedTags: request.entries.map((row) => row.tag),
        };
      },
      emptyResult("tag_vocabulary_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const updateStaged = async (input: unknown) => {
    let request: ReturnType<
      typeof rebuildSynthesisTagVocabularyApplicationUpdateStagedRequest
    >;
    try {
      request =
        rebuildSynthesisTagVocabularyApplicationUpdateStagedRequest(input);
    } catch {
      return emptyResult("invalid_request", state());
    }
    return runMutation(
      async () => {
        const current = state();
        if ((current?.stagedRevision ?? 0) !== request.expectedStagedRevision)
          return emptyResult("basis_mismatch", current);
        const rows = repository
          .listTagStagedSuggestions()
          .map(stagedFromRecord);
        const original = rows.find(
          (row) => row.tag.toLowerCase() === request.originalTag.toLowerCase(),
        );
        if (!original) return emptyResult("not_found", current);
        const timestamp = now();
        const survivors = rows.filter(
          (row) =>
            row.tag.toLowerCase() !== request.originalTag.toLowerCase() &&
            row.tag.toLowerCase() !== request.entry.tag.toLowerCase(),
        );
        const collision = rows.find(
          (row) =>
            row.tag.toLowerCase() === request.entry.tag.toLowerCase() &&
            row !== original,
        );
        survivors.push(
          mergeStaged(collision || original, request.entry, timestamp),
        );
        const next = repository.replaceTagStagedSuggestions({
          expectedStagedRevision: request.expectedStagedRevision,
          rows: survivors.map(stagedRecord),
          now: timestamp,
        });
        if (next === null) return emptyResult("basis_mismatch", state());
        return {
          ...emptyResult("committed", state()),
          changedTags: [request.entry.tag],
        };
      },
      emptyResult("tag_vocabulary_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const updateEntry = async (input: unknown) => {
    let request: ReturnType<
      typeof rebuildSynthesisTagVocabularyApplicationEntryUpdateRequest
    >;
    try {
      request =
        rebuildSynthesisTagVocabularyApplicationEntryUpdateRequest(input);
    } catch {
      return emptyResult("invalid_request", state());
    }
    const current = readSynthesisTagVocabularyApplicationCandidate(repository);
    const original = current.entries.find(
      (row) => row.tag === request.originalTag,
    );
    if (!original) return emptyResult("not_found", state());
    if (
      current.entries.some(
        (row) =>
          row.tag !== original.tag &&
          row.tag.toLowerCase() === request.tag.toLowerCase(),
      )
    )
      return emptyResult("conflict", state());
    const timestamp = now();
    const entries = current.entries.map((row) =>
      row.tag === original.tag
        ? {
            ...row,
            tag: request.tag,
            facet: request.facet,
            note: request.note,
            updatedAt: timestamp,
          }
        : row.replacement === original.tag
          ? { ...row, replacement: request.tag, updatedAt: timestamp }
          : row,
    );
    const aliases = Object.fromEntries(
      Object.entries(current.aliases).map(([alias, tag]) => [
        alias,
        tag === original.tag ? request.tag : tag,
      ]),
    );
    return save({
      expectedVocabularyHash: request.expectedVocabularyHash,
      candidate: { ...current, entries, aliases },
    });
  };

  const deleteEntry = async (input: unknown) => {
    let request: ReturnType<
      typeof rebuildSynthesisTagVocabularyApplicationEntryDeleteRequest
    >;
    try {
      request =
        rebuildSynthesisTagVocabularyApplicationEntryDeleteRequest(input);
    } catch {
      return emptyResult("invalid_request", state());
    }
    const current = readSynthesisTagVocabularyApplicationCandidate(repository);
    if (!current.entries.some((row) => row.tag === request.originalTag))
      return emptyResult("unchanged", state());
    const entries = current.entries
      .filter((row) => row.tag !== request.originalTag)
      .map((row) =>
        row.replacement === request.originalTag
          ? { ...row, replacement: undefined }
          : row,
      );
    const aliases = Object.fromEntries(
      Object.entries(current.aliases).filter(
        ([, tag]) => tag !== request.originalTag,
      ),
    );
    return save({
      expectedVocabularyHash: request.expectedVocabularyHash,
      candidate: { ...current, entries, aliases },
    });
  };

  const mutateStagedSelection = async (input: unknown, clearAll: boolean) => {
    let request: ReturnType<
      typeof rebuildSynthesisTagVocabularyApplicationSelectionRequest
    >;
    try {
      request = rebuildSynthesisTagVocabularyApplicationSelectionRequest(input);
    } catch {
      return emptyResult("invalid_request", state());
    }
    return runMutation(
      async () => {
        const current = state();
        if ((current?.stagedRevision ?? 0) !== request.expectedStagedRevision)
          return emptyResult("basis_mismatch", current);
        const selected = new Set(request.tags.map((tag) => tag.toLowerCase()));
        const rows = repository
          .listTagStagedSuggestions()
          .filter((row) => !clearAll && !selected.has(row.tag.toLowerCase()));
        const removed = repository
          .listTagStagedSuggestions()
          .filter((row) => clearAll || selected.has(row.tag.toLowerCase()))
          .map((row) => row.tag);
        const next = repository.replaceTagStagedSuggestions({
          expectedStagedRevision: request.expectedStagedRevision,
          rows,
          now: now(),
        });
        if (next === null) return emptyResult("basis_mismatch", state());
        return {
          ...emptyResult(removed.length ? "committed" : "unchanged", state()),
          changedTags: removed,
        };
      },
      emptyResult("tag_vocabulary_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const resolveLegacyStaged = async () => {
    const records = repository.listTagStagedSuggestions();
    const legacyIds = new Set<number>();
    for (const record of records) {
      const values = JSON.parse(record.parentBindingsJson || "[]") as unknown[];
      for (const value of values) {
        if (Number.isSafeInteger(value) && Number(value) > 0) {
          legacyIds.add(Number(value));
        }
      }
    }
    if (!legacyIds.size) {
      return {
        staged: records.map(stagedFromRecord),
        stagedRevision: state()?.stagedRevision ?? 0,
        migrated: false,
      };
    }
    const libraryId = Math.max(
      0,
      Math.floor(Number(options.legacyLibraryId) || 0),
    );
    if (!libraryId || !options.bindingMigrationPort) return null;
    const resolved = new Map<number, { libraryId: number; itemKey: string }>();
    const ids = [...legacyIds].sort((left, right) => left - right);
    for (
      let offset = 0;
      offset < ids.length;
      offset += SYNTHESIS_HOST_STAGED_TAG_BINDING_RESOLUTION_ID_MAX
    ) {
      const request = {
        libraryId,
        itemIds: ids.slice(
          offset,
          offset + SYNTHESIS_HOST_STAGED_TAG_BINDING_RESOLUTION_ID_MAX,
        ),
      };
      const result = rebuildSynthesisHostStagedTagBindingResolutionResult(
        await options.bindingMigrationPort.resolve(request),
        request,
      );
      result.resolved.forEach((row) => resolved.set(row.itemId, row.ref));
    }
    const timestamp = now();
    const migrated = records.map((record) => {
      const values = JSON.parse(record.parentBindingsJson || "[]") as unknown[];
      const parentBindings = values.flatMap((value) => {
        if (Number.isSafeInteger(value) && Number(value) > 0) {
          const ref = resolved.get(Number(value));
          return ref ? [ref] : [];
        }
        return [value];
      });
      return rebuildSynthesisTagVocabularyApplicationStageRequest({
        expectedStagedRevision: 0,
        entries: [
          {
            tag: record.tag,
            facet: record.facet,
            note: record.note,
            sourceFlow: record.sourceFlow,
            parentBindings,
            createdAt: record.createdAt,
            updatedAt: timestamp,
          },
        ],
      }).entries[0]!;
    });
    const expectedStagedRevision = state()?.stagedRevision ?? 0;
    const stagedRevision = repository.replaceTagStagedSuggestions({
      expectedStagedRevision,
      rows: migrated.map(stagedRecord),
      now: timestamp,
    });
    if (stagedRevision === null) return null;
    return { staged: migrated, stagedRevision, migrated: true };
  };

  const promote = async (input: unknown) => {
    let request: ReturnType<
      typeof rebuildSynthesisTagVocabularyApplicationSelectionRequest
    >;
    try {
      request = rebuildSynthesisTagVocabularyApplicationSelectionRequest(input);
    } catch {
      return emptyResult("invalid_request", state());
    }
    return runMutation(
      async (signal) => {
        let resolved;
        try {
          resolved = await resolveLegacyStaged();
        } catch {
          return emptyResult("invalid_request", state(), [
            "legacy_tag_bindings_unresolved",
          ]);
        }
        if (!resolved) {
          return emptyResult("invalid_request", state(), [
            "legacy_tag_bindings_unresolved",
          ]);
        }
        const currentState = state();
        const expectedStagedRevision =
          resolved.migrated &&
          resolved.stagedRevision === request.expectedStagedRevision + 1
            ? resolved.stagedRevision
            : request.expectedStagedRevision;
        if (
          (currentState?.vocabularyHash ?? null) !==
            request.expectedVocabularyHash ||
          (currentState?.stagedRevision ?? 0) !== expectedStagedRevision
        )
          return emptyResult("basis_mismatch", currentState);
        const staged = resolved.staged;
        const selected = new Set(request.tags.map((tag) => tag.toLowerCase()));
        const chosen = staged.filter((row) =>
          selected.has(row.tag.toLowerCase()),
        );
        const candidate =
          readSynthesisTagVocabularyApplicationCandidate(repository);
        const existing = new Set(
          candidate.entries.map((row) => row.tag.toLowerCase()),
        );
        const promoted = chosen.filter(
          (row) => !existing.has(row.tag.toLowerCase()),
        );
        if (!promoted.length) return emptyResult("unchanged", currentState);
        const nextCandidate = rebuildSynthesisTagVocabularyApplicationCandidate(
          {
            ...candidate,
            entries: [
              ...candidate.entries,
              ...promoted.map((row) => ({
                tag: row.tag,
                facet: row.facet,
                note: row.note,
                source: row.sourceFlow || "tag-regulator-suggest",
                deprecated: false,
                aliases: [],
                abbrev: [],
              })),
            ],
          },
        );
        let validation: SynthesisTagVocabularyValidationResult;
        try {
          validation = await validateCandidate(nextCandidate, signal);
        } catch (error) {
          return emptyResult(workerStatus(error), currentState);
        }
        if (validation.warnings.some((row) => row.severity === "error"))
          return emptyResult(
            "engine_failed",
            currentState,
            validation.warnings.map((row) => row.code),
          );
        const vocabularyHash =
          hashSynthesisTagVocabularyApplicationCandidate(nextCandidate);
        const timestamp = now();
        const effects: SynthesisTagEffectRecord[] = promoted.flatMap((row) =>
          row.parentBindings.map((parent) => ({
            effectId: `staged-tag:${hashSynthesisEngineCanonicalJson({ tag: row.tag, parent }).slice("sha256:".length)}`,
            vocabularyHash,
            stagedRevision: expectedStagedRevision + 1,
            libraryId: parent.libraryId,
            itemKey: parent.itemKey,
            tag: row.tag,
            status: "pending" as const,
            diagnosticsJson: "[]",
            createdAt: timestamp,
            updatedAt: timestamp,
          })),
        );
        const promotedKeys = new Set(
          promoted.map((row) => row.tag.toLowerCase()),
        );
        const nextRevision = repository.promoteTagVocabularyState({
          expectedVocabularyHash: request.expectedVocabularyHash,
          expectedStagedRevision,
          vocabularyHash,
          state: stateRecords(nextCandidate, validation, timestamp),
          stagedRows: staged
            .filter((row) => !promotedKeys.has(row.tag.toLowerCase()))
            .map(stagedRecord),
          effects,
          now: timestamp,
        });
        if (nextRevision === null)
          return emptyResult("basis_mismatch", state());
        const diagnostics: SynthesisTagVocabularyApplicationMutationResult["diagnostics"] =
          [];
        if (effects.length && !options.tagEffectPort)
          diagnostics.push({
            code: "staged_tag_host_effect_unavailable",
            severity: "error",
          });
        if (effects.length && options.tagEffectPort) {
          for (
            let offset = 0;
            offset < effects.length;
            offset += SYNTHESIS_HOST_TAG_EFFECT_BATCH_MAX
          ) {
            const batchEffects: SynthesisHostTagEffect[] = effects
              .slice(offset, offset + SYNTHESIS_HOST_TAG_EFFECT_BATCH_MAX)
              .map((effect) => ({
                effectId: effect.effectId,
                action: "ensure_present",
                target: {
                  libraryId: effect.libraryId,
                  itemKey: effect.itemKey,
                },
                tag: effect.tag,
                provenance: { kind: "staged_tag_promotion" },
                precondition: { target: "exists" },
                permission: {
                  scope: "synthesis.tags",
                  reason: "promote_staged_tag",
                },
              }));
            const hostRequest = rebuildSynthesisHostTagEffectBatchRequest({
              effects: batchEffects,
            });
            try {
              const result = rebuildSynthesisHostTagEffectBatchResult(
                await options.tagEffectPort.applyBatch(hostRequest),
                hostRequest,
              );
              repository.recordTagEffectReceipts(
                result.receipts.map((receipt) => ({
                  effectId: receipt.effectId,
                  status: receipt.status,
                  occurredAt: receipt.occurredAt,
                  diagnosticsJson: JSON.stringify(receipt.diagnostics),
                })),
                now(),
              );
            } catch {
              diagnostics.push({
                code: "staged_tag_host_effect_unavailable",
                severity: "error",
              });
            }
          }
        }
        return {
          ...emptyResult("committed", state()),
          changedTags: promoted.map((row) => row.tag),
          diagnostics: diagnostics.slice(0, 20),
        };
      },
      emptyResult("tag_vocabulary_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const rebuildIndex = async (input: unknown) => {
    let request: ReturnType<
      typeof rebuildSynthesisTagVocabularyApplicationRebuildIndexRequest
    >;
    try {
      request =
        rebuildSynthesisTagVocabularyApplicationRebuildIndexRequest(input);
    } catch {
      return emptyResult("invalid_request", state());
    }
    return runMutation(
      async (signal) => {
        const current = state();
        if (current?.vocabularyHash !== request.expectedVocabularyHash)
          return emptyResult("basis_mismatch", current);
        const candidate =
          readSynthesisTagVocabularyApplicationCandidate(repository);
        const indexRequest: SynthesisTagVocabularyIndexRequest = {
          ...validationRequest(candidate),
          algorithmVersion: SYNTHESIS_TAG_VOCABULARY_INDEX_VERSION,
          sourceManifestHash: request.expectedVocabularyHash,
          rebuiltAt: now(),
        };
        let result: SynthesisTagVocabularyIndexResult;
        try {
          result = rebuildSynthesisTagVocabularyIndexResultPayload(
            await compute.buildIndex(indexRequest, { signal }),
          );
        } catch (error) {
          return emptyResult(workerStatus(error), state());
        }
        const indexJson = canonicalizeSynthesisEngineJson(result);
        const indexHash = hashSynthesisEngineCanonicalJson(result);
        if (
          !repository.promoteTagIndex({
            expectedVocabularyHash: request.expectedVocabularyHash,
            indexHash,
            indexJson,
            now: now(),
          })
        )
          return emptyResult("basis_mismatch", state());
        return emptyResult("committed", state());
      },
      emptyResult("tag_vocabulary_busy", state()),
      emptyResult("stopping", state()),
    );
  };

  const exportRegulatorTags = () =>
    readSynthesisTagVocabularyApplicationCandidate(repository)
      .entries.filter((row) => !row.deprecated)
      .map((row) => row.tag)
      .sort();
  const replaceAudit = (input: unknown) => {
    requireSynchronousMutationAdmission();
    const request =
      rebuildSynthesisTagVocabularyApplicationAuditReplaceRequest(input);
    repository.replaceTagAuditRecords({
      libraryId: request.libraryId,
      rows: request.entries.map((row) => ({
        libraryId: row.libraryId,
        itemKey: row.itemKey,
        needsTagRegulation: row.needsTagRegulation,
        nonCompliantTagsJson: JSON.stringify(row.nonCompliantTags),
        auditedAt: now(),
        updatedAt: now(),
      })),
      now: now(),
    });
    return { libraryId: request.libraryId, audited: request.entries.length };
  };
  const clearAudit = (input: unknown) => {
    requireSynchronousMutationAdmission();
    const request =
      rebuildSynthesisTagVocabularyApplicationAuditClearRequest(input);
    repository.upsertTagAuditRecord(
      {
        libraryId: request.libraryId,
        itemKey: request.itemKey,
        needsTagRegulation: false,
        nonCompliantTagsJson: "[]",
        auditedAt: now(),
        updatedAt: now(),
      },
      now(),
    );
    return { ok: true as const };
  };

  const stopAdmission = () => {
    stopping = true;
    active?.controller.abort();
  };
  const shutdown = async () => {
    stopAdmission();
    await active?.promise.catch(() => undefined);
  };

  return {
    inspect,
    loadVocabulary,
    validate,
    listStaged,
    save,
    stage,
    updateStaged,
    updateEntry,
    deleteEntry,
    promote,
    discard: (input: unknown) => mutateStagedSelection(input, false),
    clearStaged: (input: unknown) => mutateStagedSelection(input, true),
    rebuildIndex,
    exportRegulatorTags,
    replaceAudit,
    clearAudit,
    stopAdmission,
    shutdown,
  };
}
