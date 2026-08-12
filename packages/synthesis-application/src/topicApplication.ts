import {
  rebuildSynthesisTopicApplicationApplyRequest,
  rebuildSynthesisTopicApplicationDetailRequest,
  rebuildSynthesisTopicApplicationListRequest,
  type SynthesisTopicApplicationApplyResult,
  type SynthesisTopicApplicationRecord,
} from "../../synthesis-contracts/src/topicApplication.js";
import type {
  SynthesisJsonObject,
  SynthesisJsonValue,
} from "../../synthesis-contracts/src/common.js";
import type {
  SynthesisConceptCardsProposal,
  SynthesisResolvedPaperSet,
  SynthesisTopicDefinition,
  SynthesisTopicDiscoveryProjection,
  SynthesisTopicGraphProjection,
  SynthesisTopicInterestMetadata,
  SynthesisTopicRelationProposals,
  SynthesisTopicResolver,
} from "../../synthesis-contracts/src/topicDomain.js";
import {
  SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
  SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
  SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
  SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
  SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
  type SynthesisTopicJsonObject,
  type SynthesisTopicJsonValue,
  type SynthesisTopicStructuredArtifactEngine,
} from "../../synthesis-engine/src/index.js";
import type {
  SynthesisOperationRecord,
  SynthesisOperationStatusUpdate,
  SynthesisTopicApplicationProjectionRecord,
  SynthesisTopicApplicationStateRecord,
} from "../../synthesis-repository/src/index.js";
import {
  canonicalSynthesisTopicPathId,
  computeSynthesisTopicCurrentHashes,
  rebuildSynthesisTopicCanonicalSnapshot,
  type SynthesisTopicCanonicalStore,
} from "./topicCanonical.js";
import {
  decideSynthesisApply,
  validateSynthesisResultBundle,
  type SynthesisResultBundle,
} from "./topicApplyDecision.js";

export type SynthesisTopicApplicationRepository = {
  initializeTopicApplication(): void;
  getTopicApplicationState(
    topicId: string,
  ): SynthesisTopicApplicationStateRecord | null;
  listTopicApplicationStates(args?: { offset?: number; limit?: number }): {
    rows: SynthesisTopicApplicationStateRecord[];
    total: number;
  };
  upsertTopicApplicationState(
    record: SynthesisTopicApplicationStateRecord,
  ): void;
  getTopicApplicationProjection(
    topicId: string,
  ): SynthesisTopicApplicationProjectionRecord | null;
  upsertTopicApplicationProjection(
    record: SynthesisTopicApplicationProjectionRecord,
  ): void;
  upsertOperation(record: SynthesisOperationRecord): void;
  updateOperationStatus(
    args: SynthesisOperationStatusUpdate,
  ): SynthesisOperationRecord | null;
};

export type SynthesisTopicApplication = {
  list(request?: unknown): ReturnType<typeof projectList>;
  detail(request: unknown):
    | { status: "absent" | "invalid"; topicId: string; diagnostics: string[] }
    | {
        status: "ready";
        topicId: string;
        topic: SynthesisTopicApplicationRecord;
        snapshot: ReturnType<typeof rebuildSynthesisTopicCanonicalSnapshot>;
      };
  apply(request: unknown): Promise<SynthesisTopicApplicationApplyResult>;
  stopAdmission(): void;
  shutdown(): Promise<void>;
};

type Options = {
  canonicalStore: SynthesisTopicCanonicalStore;
  repository: SynthesisTopicApplicationRepository;
  engine: SynthesisTopicStructuredArtifactEngine;
  now?: () => string;
  createOperationId?: (topicId: string) => string;
};

const cleanString = (value: unknown) => String(value ?? "").trim();

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function jsonObject(value: unknown, location: string): SynthesisJsonObject {
  if (!isObject(value)) throw new Error(`${location} must be an object`);
  return JSON.parse(
    canonicalizeSynthesisEngineJson(value),
  ) as SynthesisJsonObject;
}

function parseJsonObject(text: string, location: string) {
  try {
    return jsonObject(JSON.parse(text), location);
  } catch {
    throw new Error(`${location} must contain a JSON object`);
  }
}

function parseStoredJson<T>(text: string) {
  return JSON.parse(text) as T;
}

function recordProjection(
  record: SynthesisTopicApplicationStateRecord,
  projection?: SynthesisTopicApplicationProjectionRecord | null,
): SynthesisTopicApplicationRecord {
  return {
    topicId: record.topicId,
    pathId: record.pathId,
    title: record.title,
    definition: record.definition,
    language: record.language,
    operation: record.operation,
    manifestHash: record.manifestHash,
    artifactHash: record.artifactHash,
    metadataHash: record.metadataHash,
    bundleHash: record.bundleHash,
    paperCount: record.paperCount,
    updatedAt: record.updatedAt ?? "",
    topicDefinition: parseStoredJson<SynthesisTopicDefinition>(
      record.topicDefinitionJson,
    ),
    topicResolver: parseStoredJson<SynthesisTopicResolver>(
      record.topicResolverJson,
    ),
    resolvedPaperSet: parseStoredJson<SynthesisResolvedPaperSet>(
      record.resolvedPaperSetJson,
    ),
    projection: {
      ...(projection
        ? {
            topicGraph: parseStoredJson<SynthesisTopicGraphProjection>(
              projection.topicGraphJson,
            ),
            concepts: parseStoredJson<SynthesisConceptCardsProposal>(
              projection.conceptsJson,
            ),
            interestMetadata: parseStoredJson<SynthesisTopicInterestMetadata>(
              projection.interestMetadataJson,
            ),
            discovery: parseStoredJson<SynthesisTopicDiscoveryProjection>(
              projection.discoveryJson,
            ),
          }
        : {}),
      freshness: "unknown",
      source_materials_status: "missing",
      source_materials_percent: 0,
      stale_reasons: [],
      dirty_reasons: [],
      missing_sections: [],
    },
  };
}

function projectList(
  repository: SynthesisTopicApplicationRepository,
  request: unknown = {},
) {
  const normalized = rebuildSynthesisTopicApplicationListRequest(request);
  const offset = Number(normalized.cursor || 0);
  const page = repository.listTopicApplicationStates({
    offset,
    limit: normalized.limit,
  });
  const next = offset + page.rows.length;
  return {
    topics: page.rows.map((row) =>
      recordProjection(
        row,
        repository.getTopicApplicationProjection(row.topicId),
      ),
    ),
    cursor: normalized.cursor,
    nextCursor: next < page.total ? String(next) : "",
    hasMore: next < page.total,
    returned: page.rows.length,
    total: page.total,
    limit: normalized.limit,
  };
}

function topicIdFromBundle(bundle: SynthesisResultBundle) {
  const id = cleanString(bundle.topic_id || bundle.topic_definition.id);
  if (!id) throw new Error("topic id is required");
  return id;
}

function titleFromDefinition(
  definition: Record<string, unknown>,
  topicId: string,
) {
  return cleanString(definition.title) || topicId;
}

function definitionText(definition: Record<string, unknown>) {
  return cleanString(definition.definition);
}

function paperCount(artifact: SynthesisTopicJsonObject) {
  return Array.isArray(artifact.source_papers)
    ? artifact.source_papers.length
    : 0;
}

function assetReader(
  assets: Array<{ id: string; mediaType: string; text: string }>,
) {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const readValue = (id: unknown, location: string) => {
    const key = cleanString(id);
    const asset = byId.get(key);
    if (!asset || asset.mediaType !== "application/json") {
      throw new Error(`${location} references a missing JSON asset`);
    }
    try {
      return JSON.parse(asset.text) as SynthesisJsonValue;
    } catch {
      throw new Error(`${location} must contain JSON`);
    }
  };
  const readJson = (id: unknown, location: string) =>
    jsonObject(readValue(id, location), location);
  return { readJson, readValue };
}

function pathFromArtifactManifest(
  bundle: SynthesisResultBundle,
  readJson: (id: unknown, location: string) => SynthesisJsonObject,
  keys: string[],
) {
  if (!bundle.artifact_manifest_path) return "";
  const manifest = readJson(bundle.artifact_manifest_path, "artifactManifest");
  for (const key of keys) {
    const value = cleanString(manifest[key]);
    if (value) return value;
  }
  return "";
}

function manifestAssetId(
  bundle: SynthesisResultBundle,
  readJson: (id: unknown, location: string) => SynthesisJsonObject,
) {
  return (
    cleanString(bundle.analysis_manifest_path) ||
    pathFromArtifactManifest(bundle, readJson, [
      "topic_analysis",
      "analysis_manifest",
    ])
  );
}

function optionalSidecar(
  bundle: SynthesisResultBundle,
  manifest: SynthesisJsonObject,
  readJson: (id: unknown, location: string) => SynthesisJsonObject,
  bundleField:
    | "topic_interest_metadata_path"
    | "concept_cards_proposal_path"
    | "topic_graph_relation_proposals_path",
  manifestKey: string,
) {
  const direct = cleanString(bundle[bundleField]);
  const sidecars = isObject(manifest.sidecars) ? manifest.sidecars : {};
  const entry = isObject(sidecars[manifestKey]) ? sidecars[manifestKey] : {};
  const id = direct || cleanString(entry.path);
  if (!id) return {};
  return readJson(id, manifestKey);
}

async function completeCandidate(args: {
  bundle: SynthesisResultBundle;
  current: ReturnType<SynthesisTopicCanonicalStore["readCurrent"]>;
  engine: SynthesisTopicStructuredArtifactEngine;
  sourceManifest: SynthesisJsonObject;
  readValue: (id: unknown, location: string) => SynthesisJsonValue;
}) {
  const sourceManifest = args.sourceManifest;
  let manifest: SynthesisTopicJsonObject;
  let sections: Record<string, SynthesisTopicJsonValue>;
  if (args.bundle.operation === "update_patch") {
    if (args.current.status !== "ready") throw new Error("topic is missing");
    const patchEntries =
      isObject(sourceManifest.patch) && isObject(sourceManifest.patch.sections)
        ? sourceManifest.patch.sections
        : {};
    const changedSections: Record<string, SynthesisTopicJsonValue> = {};
    for (const [name, entry] of Object.entries(patchEntries).sort()) {
      if (!isObject(entry)) continue;
      changedSections[name] = args.readValue(
        entry.path,
        `patch.sections.${name}`,
      ) as SynthesisTopicJsonValue;
    }
    const patched = await args.engine.applySectionPatch({
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_SECTION_PATCH_VERSION,
      currentManifest: args.current.snapshot.manifest,
      currentSections: args.current.snapshot.sections,
      patchManifest: sourceManifest as SynthesisTopicJsonObject,
      changedSections,
    });
    if (patched.status !== "applied") return { patchFailure: patched } as const;
    sections = patched.sections;
    manifest = {
      ...args.current.snapshot.manifest,
      operation: "update_patch",
      language:
        args.bundle.language ||
        args.current.snapshot.manifest.language ||
        "auto",
      sections: Object.fromEntries(
        Object.keys(sections)
          .sort()
          .map((name) => [name, { path: `current/sections/${name}.json` }]),
      ),
    };
  } else {
    const validation = await args.engine.validateManifest({
      contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
      algorithmVersion: SYNTHESIS_TOPIC_MANIFEST_VALIDATION_VERSION,
      manifest: sourceManifest,
    });
    if (!validation.ok) throw new Error(validation.errors.join("; "));
    const entries = isObject(sourceManifest.sections)
      ? sourceManifest.sections
      : {};
    sections = {};
    for (const [name, entry] of Object.entries(entries).sort()) {
      if (!isObject(entry)) throw new Error(`section ${name} is invalid`);
      sections[name] = args.readValue(
        entry.path,
        `sections.${name}`,
      ) as SynthesisTopicJsonValue;
    }
    manifest = sourceManifest as SynthesisTopicJsonObject;
  }
  const assembled = await args.engine.assembleArtifact({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_ASSEMBLY_VERSION,
    manifest,
    sections,
  });
  const validation = await args.engine.validateArtifact({
    contractVersion: SYNTHESIS_TOPIC_STRUCTURED_ARTIFACT_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_ARTIFACT_VALIDATION_VERSION,
    artifact: assembled.artifact,
    expectedLanguage: args.bundle.language,
  });
  if (!validation.ok) throw new Error(validation.errors.join("; "));
  return { manifest, sections, artifact: assembled.artifact } as const;
}

function resolverState(
  bundle: SynthesisResultBundle,
  readJson: (id: unknown, location: string) => SynthesisJsonObject,
  required: boolean,
) {
  if (bundle.topic_resolver && bundle.resolved_paper_set) {
    if (!Array.isArray(bundle.resolved_paper_set.papers)) {
      throw new Error("resolved_paper_set.papers is required");
    }
    return {
      topicResolver: bundle.topic_resolver as SynthesisJsonObject,
      resolvedPaperSet: bundle.resolved_paper_set as SynthesisJsonObject,
    };
  }
  const id =
    cleanString(bundle.resolver_manifest_path) ||
    pathFromArtifactManifest(bundle, readJson, [
      "resolver_manifest",
      "resolver",
    ]);
  if (!id) {
    if (required) throw new Error("resolver manifest asset is required");
    return null;
  }
  const resolver = readJson(id, "resolverManifest");
  const resolvedPaperSet = isObject(resolver.resolved_paper_set)
    ? resolver.resolved_paper_set
    : isObject(resolver.resolution_result) &&
        Array.isArray(resolver.resolution_result.papers)
      ? { papers: resolver.resolution_result.papers }
      : null;
  if (!resolvedPaperSet || !Array.isArray(resolvedPaperSet.papers)) {
    throw new Error("resolver manifest must contain resolved_paper_set.papers");
  }
  return {
    topicResolver: (isObject(resolver.topic_resolver)
      ? resolver.topic_resolver
      : isObject(resolver.resolver)
        ? resolver.resolver
        : {}) as SynthesisJsonObject,
    resolvedPaperSet: resolvedPaperSet as SynthesisJsonObject,
  };
}

function preflightBundleAssets(
  bundle: SynthesisResultBundle,
  assets: ReturnType<typeof assetReader>,
) {
  const manifestId = manifestAssetId(bundle, assets.readJson);
  if (!manifestId) throw new Error("analysis manifest asset is required");
  const manifest = assets.readJson(manifestId, "analysisManifest");
  const sectionEntries =
    bundle.operation === "update_patch"
      ? isObject(manifest.patch) && isObject(manifest.patch.sections)
        ? manifest.patch.sections
        : {}
      : isObject(manifest.sections)
        ? manifest.sections
        : {};
  for (const [name, entry] of Object.entries(sectionEntries)) {
    if (!isObject(entry)) throw new Error(`section ${name} is invalid`);
    assets.readValue(entry.path, `sections.${name}`);
  }
  return {
    manifest,
    resolver: resolverState(
      bundle,
      assets.readJson,
      bundle.operation !== "update_patch",
    ),
    interest: optionalSidecar(
      bundle,
      manifest,
      assets.readJson,
      "topic_interest_metadata_path",
      "topic_interest_metadata",
    ),
    concepts: optionalSidecar(
      bundle,
      manifest,
      assets.readJson,
      "concept_cards_proposal_path",
      "concept_cards_proposal",
    ),
    relations: optionalSidecar(
      bundle,
      manifest,
      assets.readJson,
      "topic_graph_relation_proposals_path",
      "topic_graph_relation_proposals",
    ),
  };
}

function failureResult(args: {
  status: SynthesisTopicApplicationApplyResult["status"];
  topicId: string;
  operationId: string;
  mismatches?: Array<{ name: string; base: string; current: string }>;
}): SynthesisTopicApplicationApplyResult {
  return {
    ok: false,
    status: args.status,
    topicId: args.topicId,
    operationId: args.operationId,
    hashes: {},
    mismatches: args.mismatches ?? [],
    warnings: [],
  };
}

export function createSynthesisTopicApplication(
  options: Options,
): SynthesisTopicApplication {
  const now = options.now ?? (() => new Date().toISOString());
  let sequence = 0;
  let accepting = true;
  const activeApplies = new Set<
    Promise<SynthesisTopicApplicationApplyResult>
  >();
  let shutdownPromise: Promise<void> | null = null;
  options.repository.initializeTopicApplication();
  const updateOperation = (
    operationId: string,
    status: SynthesisOperationStatusUpdate["status"],
    phase: string,
    diagnostics: string[] = [],
  ) =>
    options.repository.updateOperationStatus({
      operationId,
      status,
      phase,
      diagnosticsJson: JSON.stringify(diagnostics),
    });
  const application: Omit<SynthesisTopicApplication, "shutdown"> = {
    list(request = {}) {
      return projectList(options.repository, request);
    },
    detail(rawRequest) {
      const request = rebuildSynthesisTopicApplicationDetailRequest(rawRequest);
      const state = options.repository.getTopicApplicationState(
        request.topicId,
      );
      const current = options.canonicalStore.readCurrent(request);
      if (!state || current.status === "absent") {
        return { status: "absent", topicId: request.topicId, diagnostics: [] };
      }
      if (current.status !== "ready") {
        return {
          status: "invalid",
          topicId: request.topicId,
          diagnostics: current.diagnostics,
        };
      }
      return {
        status: "ready",
        topicId: request.topicId,
        topic: recordProjection(
          state,
          options.repository.getTopicApplicationProjection(request.topicId),
        ),
        snapshot: current.snapshot,
      };
    },
    async apply(rawRequest) {
      if (!accepting) {
        return failureResult({
          status: "repair_required",
          topicId: "",
          operationId: "",
        });
      }
      let request;
      let bundle: SynthesisResultBundle;
      let topicId = "";
      let assets: ReturnType<typeof assetReader>;
      let prepared: ReturnType<typeof preflightBundleAssets>;
      try {
        request = rebuildSynthesisTopicApplicationApplyRequest(rawRequest);
        bundle = validateSynthesisResultBundle(request.bundle).bundle;
        if (!bundle.operation)
          throw new Error("structured operation is required");
        topicId = topicIdFromBundle(bundle);
        assets = assetReader(request.assets);
        prepared = preflightBundleAssets(bundle, assets);
      } catch {
        return failureResult({
          status: "invalid_request",
          topicId,
          operationId: "",
        });
      }
      const operationId = options.createOperationId
        ? options.createOperationId(topicId)
        : `topic-apply-${canonicalSynthesisTopicPathId(topicId)}-${cleanString(now()).replace(/[^0-9]/g, "")}-${sequence++}`;
      options.repository.upsertOperation({
        operationId,
        operationType: "topic_apply",
        scopeKind: "topic",
        scopeRef: topicId,
        status: "running",
        phase: "validation",
        label: `Apply Topic ${topicId}`,
        progressMode: "determinate",
        processedCount: 0,
        totalCount: 4,
      });
      try {
        const current = options.canonicalStore.readCurrent({ topicId });
        if (bundle.operation === "create" && current.status !== "absent") {
          updateOperation(operationId, "failed", "topic_exists");
          return failureResult({
            status: "topic_exists",
            topicId,
            operationId,
          });
        }
        if (bundle.operation !== "create" && current.status === "absent") {
          updateOperation(operationId, "failed", "topic_missing");
          return failureResult({
            status: "topic_missing",
            topicId,
            operationId,
          });
        }
        if (current.status === "invalid") {
          updateOperation(operationId, "failed", "canonical_invalid");
          return failureResult({
            status: "repair_required",
            topicId,
            operationId,
          });
        }
        const resolver =
          prepared.resolver ??
          (() => {
            const state = options.repository.getTopicApplicationState(topicId);
            if (!state) throw new Error("current Topic resolver is missing");
            return {
              topicResolver: parseStoredJson(state.topicResolverJson),
              resolvedPaperSet: parseStoredJson(state.resolvedPaperSetJson),
            };
          })();
        const currentHashes =
          current.status === "ready"
            ? computeSynthesisTopicCurrentHashes(current.snapshot)
            : undefined;
        const decision = decideSynthesisApply({
          bundle,
          currentHashes: {
            manifest: currentHashes?.manifestHash,
            artifact: currentHashes?.artifactHash,
            metadata: currentHashes?.metadataHash,
          },
        });
        if (decision.action === "conflict") {
          updateOperation(operationId, "failed", "basis_conflict");
          return failureResult({
            status: "conflict",
            topicId,
            operationId,
            mismatches: decision.mismatches,
          });
        }
        updateOperation(operationId, "running", "assembly");
        const candidate = await completeCandidate({
          bundle,
          current,
          engine: options.engine,
          sourceManifest: prepared.manifest,
          readValue: assets.readValue,
        });
        if ("patchFailure" in candidate && candidate.patchFailure) {
          const patchFailure = candidate.patchFailure;
          updateOperation(operationId, "failed", "patch_conflict");
          return failureResult({
            status: "patch_conflict",
            topicId,
            operationId,
            mismatches:
              patchFailure.status === "conflict" ? patchFailure.mismatches : [],
          });
        }
        const timestamp = now();
        const createdAt =
          current.status === "ready"
            ? cleanString(current.snapshot.metadata.created_at) || timestamp
            : timestamp;
        const metadata = {
          schema_id: "synthesis.topic_artifact_metadata",
          schema_version: "1.0.0",
          created_at: createdAt,
          updated_at: timestamp,
          data: {
            topic_id: topicId,
            title: titleFromDefinition(bundle.topic_definition, topicId),
            definition: definitionText(bundle.topic_definition),
            language: bundle.language || "auto",
            operation: bundle.operation,
            artifact_metadata: (bundle.artifact_metadata ||
              {}) as SynthesisJsonValue,
          },
        } as SynthesisTopicJsonObject;
        const hashes = computeSynthesisTopicCurrentHashes({
          manifest: candidate.manifest,
          artifact: candidate.artifact,
          metadata,
          sections: candidate.sections,
        });
        const snapshot = rebuildSynthesisTopicCanonicalSnapshot({
          topicId,
          pathId: canonicalSynthesisTopicPathId(topicId),
          manifest: {
            ...candidate.manifest,
            artifact_hash: hashes.artifactHash,
            metadata_hash: hashes.metadataHash,
            section_hashes: hashes.sectionHashes,
          },
          artifact: candidate.artifact,
          metadata,
          sections: candidate.sections,
        });
        updateOperation(operationId, "running", "promotion");
        const expectedBasis =
          current.status === "ready"
            ? {
                manifestHash: currentHashes!.manifestHash,
                artifactHash: currentHashes!.artifactHash,
              }
            : null;
        const promoted = options.canonicalStore.promote({
          expectedBasis,
          snapshot,
        });
        if (promoted.status !== "promoted") {
          const status =
            promoted.status === "basis_mismatch" ? "conflict" : promoted.status;
          updateOperation(operationId, "failed", status);
          return failureResult({ status, topicId, operationId });
        }
        const committedHashes = computeSynthesisTopicCurrentHashes(snapshot);
        const warnings: string[] = [];
        try {
          updateOperation(operationId, "running", "projection");
          const state: SynthesisTopicApplicationStateRecord = {
            topicId,
            pathId: snapshot.pathId,
            title: titleFromDefinition(bundle.topic_definition, topicId),
            definition: definitionText(bundle.topic_definition),
            language: bundle.language || "auto",
            operation: bundle.operation,
            manifestHash: committedHashes.manifestHash,
            artifactHash: committedHashes.artifactHash,
            metadataHash: committedHashes.metadataHash,
            bundleHash: hashSynthesisEngineCanonicalJson(request.bundle),
            paperCount: paperCount(snapshot.artifact),
            topicDefinitionJson: canonicalizeSynthesisEngineJson(
              bundle.topic_definition,
            ),
            topicResolverJson: canonicalizeSynthesisEngineJson(
              resolver.topicResolver,
            ),
            resolvedPaperSetJson: canonicalizeSynthesisEngineJson(
              resolver.resolvedPaperSet,
            ),
            createdAt,
            updatedAt: timestamp,
          };
          options.repository.upsertTopicApplicationState(state);
          options.repository.upsertTopicApplicationProjection({
            topicId,
            topicGraphJson: canonicalizeSynthesisEngineJson({
              topic: {
                topic_id: topicId,
                title: state.title,
                definition: state.definition,
                artifact_hash: state.artifactHash,
              },
              relations: prepared.relations,
            }),
            conceptsJson: canonicalizeSynthesisEngineJson(prepared.concepts),
            interestMetadataJson: canonicalizeSynthesisEngineJson(
              prepared.interest,
            ),
            discoveryJson: canonicalizeSynthesisEngineJson({
              source_paper_refs: Array.isArray(snapshot.artifact.source_papers)
                ? snapshot.artifact.source_papers
                    .filter(
                      (
                        paper,
                      ): paper is { [key: string]: SynthesisTopicJsonValue } =>
                        isObject(paper),
                    )
                    .map((paper) => cleanString(paper.paper_ref))
                    .filter(Boolean)
                : [],
            }),
            updatedAt: timestamp,
          });
        } catch {
          warnings.push("topic_projection_failed");
        }
        try {
          updateOperation(operationId, "completed", "completed", warnings);
        } catch {
          warnings.push("topic_operation_receipt_failed");
        }
        return {
          ok: true,
          status: "persisted",
          topicId,
          operationId,
          hashes: {
            manifest: committedHashes.manifestHash,
            artifact: committedHashes.artifactHash,
            metadata: committedHashes.metadataHash,
          },
          mismatches: [],
          warnings,
        };
      } catch (error) {
        try {
          updateOperation(operationId, "failed", "invalid_request");
        } catch {
          // A failed operation receipt must not hide the original rejection.
        }
        const failed = failureResult({
          status: "invalid_request",
          topicId,
          operationId,
        });
        failed.warnings = ["topic_apply_invalid"];
        return failed;
      }
    },
    stopAdmission() {
      accepting = false;
    },
  };
  const apply = application.apply;
  const trackedApply = (request: unknown) => {
    if (!accepting) return apply(request);
    const active = apply(request);
    activeApplies.add(active);
    void active.then(
      () => activeApplies.delete(active),
      () => activeApplies.delete(active),
    );
    return active;
  };
  const shutdown = () => {
    if (shutdownPromise) return shutdownPromise;
    application.stopAdmission();
    shutdownPromise = Promise.allSettled([...activeApplies]).then(
      () => undefined,
    );
    return shutdownPromise;
  };
  return { ...application, apply: trackedApply, shutdown };
}
