import { assert } from "chai";
import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

type InvariantSeverity = "fatal" | "high" | "medium" | "low";
type InvariantTestKind = "behavior" | "static_guard";

interface InvariantTestRef {
  file: string;
  marker: string;
  kind: InvariantTestKind;
}

interface SynthesisInvariant {
  id: string;
  severity: InvariantSeverity;
  statement: string;
  evidence: string;
  test_refs?: InvariantTestRef[];
}

interface SynthesisInvariantContract {
  schema: string;
  invariants: SynthesisInvariant[];
}

const ROOT_DIR = process.cwd();
const INVARIANTS_FILE = "doc/synthesis-layer/contracts/invariants.yaml";
const VALID_SEVERITIES = new Set(["fatal", "high", "medium", "low"]);
const VALID_TEST_KINDS = new Set(["behavior", "static_guard"]);
const STATIC_ONLY_ALLOWED = new Set([
  "inv.discovery.no_global_llm_nxm",
  "inv.runtime.local_async_only",
]);

function repoPath(relativePath: string): string {
  return path.join(ROOT_DIR, relativePath);
}

function readRepoText(relativePath: string): string {
  return fs.readFileSync(repoPath(relativePath), "utf8");
}

function readInvariantContract(): SynthesisInvariantContract {
  return parseYaml(readRepoText(INVARIANTS_FILE)) as SynthesisInvariantContract;
}

function extractItTitleMarkers(source: string): Set<string> {
  const markers = new Set<string>();
  const titleRegex = /\bit\s*\(\s*(["'`])([^"'`]*?)\1\s*,/g;
  let titleMatch: RegExpExecArray | null;

  while ((titleMatch = titleRegex.exec(source)) !== null) {
    const title = titleMatch[2] ?? "";
    for (const marker of title.matchAll(/\[inv\.[^\]]+\]/g)) {
      markers.add(marker[0]);
    }
  }

  return markers;
}

function listCoreTestFiles(dir = repoPath("test/core")): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listCoreTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/"));
    }
  }

  return files;
}

function extractFunctionBlock(source: string, functionName: string): string {
  const asyncStart = source.indexOf(`async function ${functionName}`);
  const syncStart = source.indexOf(`function ${functionName}`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  assert.isAtLeast(start, 0, `${functionName} should exist`);

  let depth = 0;
  let sawBody = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
      sawBody = true;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (sawBody && depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  assert.fail(`Could not extract ${functionName}`);
}

describe("Synthesis invariant guards", function () {
  it("declares executable test_refs for every Synthesis invariant", function () {
    const contract = readInvariantContract();
    assert.equal(contract.schema, "synthesis.invariants.v2");
    assert.isArray(contract.invariants);
    assert.isAbove(contract.invariants.length, 0);

    const ids = new Set<string>();
    const markerCache = new Map<string, Set<string>>();

    for (const invariant of contract.invariants) {
      assert.match(invariant.id, /^inv\.[a-z0-9_]+(\.[a-z0-9_]+)+$/);
      assert.isFalse(
        ids.has(invariant.id),
        `duplicate invariant id ${invariant.id}`,
      );
      ids.add(invariant.id);

      assert.isTrue(
        VALID_SEVERITIES.has(invariant.severity),
        `${invariant.id} has invalid severity`,
      );
      assert.isString(invariant.statement);
      assert.isNotEmpty(
        invariant.statement.trim(),
        `${invariant.id} lacks statement`,
      );
      assert.isString(invariant.evidence);
      assert.isNotEmpty(
        invariant.evidence.trim(),
        `${invariant.id} lacks evidence`,
      );

      const kinds = new Set<InvariantTestKind>();
      for (const ref of invariant.test_refs ?? []) {
        assert.isString(ref.file, `${invariant.id} test_ref lacks file`);
        assert.isTrue(
          fs.existsSync(repoPath(ref.file)),
          `${ref.file} does not exist`,
        );
        assert.equal(ref.marker, `[${invariant.id}]`);
        assert.isTrue(
          VALID_TEST_KINDS.has(ref.kind),
          `${invariant.id} has invalid test_ref kind ${ref.kind}`,
        );
        kinds.add(ref.kind);

        const markers =
          markerCache.get(ref.file) ??
          extractItTitleMarkers(readRepoText(ref.file));
        markerCache.set(ref.file, markers);
        assert.isTrue(
          markers.has(ref.marker),
          `${ref.marker} must appear in an it(...) title in ${ref.file}`,
        );
      }

      if (kinds.size === 1 && kinds.has("static_guard")) {
        assert.isTrue(
          STATIC_ONLY_ALLOWED.has(invariant.id),
          `${invariant.id} may not rely only on static_guard evidence`,
        );
      }
    }
  });

  it("keeps invariant test markers reversible from test titles", function () {
    const contract = readInvariantContract();
    const refs = new Set<string>();
    const ids = new Set(contract.invariants.map((invariant) => invariant.id));
    let activeMarkerCount = 0;

    for (const invariant of contract.invariants) {
      for (const ref of invariant.test_refs ?? []) {
        refs.add(`${ref.file}::${ref.marker}`);
      }
    }

    for (const file of listCoreTestFiles()) {
      const markers = extractItTitleMarkers(readRepoText(file));
      for (const marker of markers) {
        const id = marker.slice(1, -1);
        if (!ids.has(id)) {
          continue;
        }
        activeMarkerCount += 1;
        if (refs.size > 0) {
          assert.isTrue(
            refs.has(`${file}::${marker}`),
            `${marker} in ${file} must be listed as a test_ref`,
          );
        }
      }
    }
    assert.isAtLeast(activeMarkerCount, 1);
  });

  it("keeps topic discovery apply-time token overlap only [inv.discovery.no_global_llm_nxm]", function () {
    const serviceSource = readRepoText("src/modules/synthesis/service.ts");
    const repositorySource = readRepoText(
      "src/modules/synthesis/repository.ts",
    );
    const discoveryRepositorySlice = repositorySource.slice(
      repositorySource.indexOf("TOPIC_DISCOVERY_POLICY_METHOD"),
      repositorySource.indexOf(
        "export function getSynthesisRepositoryDatabasePath",
      ),
    );

    assert.include(
      discoveryRepositorySlice,
      "discovery.apply_time_token_overlap.v1",
    );
    assert.include(discoveryRepositorySlice, "scoreDiscoveryPair");
    assert.include(discoveryRepositorySlice, "discoveryTextContains");

    const forbidden =
      /\b(LLM|llm|embedding|embeddings|BM25|bm25|semanticSearch|semantic_search|pairwiseJudge|pairwise_judge)\b/;
    assert.notMatch(serviceSource, forbidden);
    assert.notMatch(discoveryRepositorySlice, forbidden);
  });

  it("keeps runtime coordination local async only [inv.runtime.local_async_only]", function () {
    assert.isFalse(
      fs.existsSync(repoPath("src/modules/synthesis/updateEvents.ts")),
    );
    const runtimeSources = [
      readRepoText("src/modules/synthesis/service.ts"),
      readRepoText("src/modules/synthesis/repository.ts"),
    ].join("\n");

    assert.notMatch(
      runtimeSources,
      /\b(bullmq|redis|ioredis|amqplib|rabbitmq|kafka|sqs|pubsub|agenda|temporalio|@temporalio)\b/i,
    );
    assert.include(runtimeSources, "synt_operation");
    assert.include(runtimeSources, "synt_cache_basis");
    assert.include(runtimeSources, "upsertOperation");
    assert.include(runtimeSources, "upsertCacheBasis");
    assert.notInclude(runtimeSources, "CREATE TABLE IF NOT EXISTS synt_work_item");
    assert.notInclude(runtimeSources, "CREATE TABLE IF NOT EXISTS synt_work_run");
    assert.notInclude(runtimeSources, "enqueueSynthesisWork,");
    assert.notInclude(runtimeSources, "recordSynthesisUpdateEvent,");
    assert.notInclude(runtimeSources, "runSynthesisStartupReconcile,");
    assert.notInclude(runtimeSources, "enqueueIfStale");
    assert.notInclude(runtimeSources, "markReferenceCacheRefreshQueued");
    assert.notInclude(runtimeSources, "literatureJobDebounce");
    assert.notInclude(runtimeSources, "literatureJobRetry");
    assert.notInclude(runtimeSources, "scheduleLiteratureRetry");
    assert.match(runtimeSources, /LibraryWriteLock|runExclusive/);
  });

  it("keeps reference sidecar refresh separated from graph rebuild and legacy readiness sources", function () {
    const serviceSource = readRepoText("src/modules/synthesis/service.ts");
    const workbenchSource = readRepoText(
      "src/modules/synthesisWorkbenchTab.ts",
    );
    const appSource = readRepoText("src/synthesisWorkbenchApp.ts");
    const refreshStart = serviceSource.indexOf(
      "async function refreshReferenceSidecarNow",
    );
    const graphRebuildStart = serviceSource.indexOf(
      "async function rebuildCitationGraphCacheNow",
    );
    const advancedMatchingStart = serviceSource.indexOf(
      "async function runAdvancedReferenceMatchingNow",
    );
    const graphRetryStart = serviceSource.indexOf(
      "async function retryCitationGraphCacheRebuild",
    );
    assert.isAtLeast(refreshStart, 0);
    assert.isAbove(graphRebuildStart, refreshStart);
    assert.isAbove(advancedMatchingStart, refreshStart);
    assert.isAbove(graphRebuildStart, advancedMatchingStart);
    assert.isAbove(graphRetryStart, graphRebuildStart);
    const refreshEnd = Math.min(graphRebuildStart, advancedMatchingStart);
    const refreshBlock = serviceSource.slice(refreshStart, refreshEnd);
    const graphStaleHelperStart = serviceSource.indexOf(
      "function markCitationGraphLibraryCacheStale",
    );
    const graphStaleHelperEnd = serviceSource.indexOf(
      "function replaceReferenceSidecarForSourceRef",
      graphStaleHelperStart,
    );
    const relatedStaleHelperStart = serviceSource.indexOf(
      "function markRelatedItemsSyncCacheStaleForSidecarChange",
    );
    const relatedStaleHelperEnd = serviceSource.indexOf(
      "function relatedItemsEdgesFromGraphRecords",
      relatedStaleHelperStart,
    );
    assert.isAtLeast(graphStaleHelperStart, 0);
    assert.isAbove(graphStaleHelperEnd, graphStaleHelperStart);
    assert.isAtLeast(relatedStaleHelperStart, 0);
    assert.isAbove(relatedStaleHelperEnd, relatedStaleHelperStart);
    const graphStaleHelperBlock = serviceSource.slice(
      graphStaleHelperStart,
      graphStaleHelperEnd,
    );
    const relatedStaleHelperBlock = serviceSource.slice(
      relatedStaleHelperStart,
      relatedStaleHelperEnd,
    );
    const graphRebuildBlock = serviceSource.slice(
      graphRebuildStart,
      graphRetryStart,
    );
    const advancedMatchingBlock = serviceSource.slice(
      advancedMatchingStart,
      graphRebuildStart,
    );
    const debugSnapshotStart = serviceSource.indexOf(
      "async function debugSynthesisSnapshot",
    );
    const debugCacheListStart = serviceSource.indexOf(
      "async function debugSynthesisCacheList",
    );
    const debugOperationsStart = serviceSource.indexOf(
      "async function debugSynthesisOperationsList",
    );
    const debugPaperInspectStart = serviceSource.indexOf(
      "async function debugSynthesisPaperInspect",
    );
    assert.isAtLeast(debugSnapshotStart, 0);
    assert.isAbove(debugCacheListStart, debugSnapshotStart);
    assert.isAbove(debugOperationsStart, debugCacheListStart);
    assert.isAbove(debugPaperInspectStart, debugOperationsStart);
    const debugSnapshotBlock = serviceSource.slice(
      debugSnapshotStart,
      debugCacheListStart,
    );
    const debugOperationsBlock = serviceSource.slice(
      debugOperationsStart,
      debugPaperInspectStart,
    );
    const sendSnapshotBlock = extractFunctionBlock(
      workbenchSource,
      "sendSnapshot",
    );
    const notifyProgressBlock = extractFunctionBlock(
      workbenchSource,
      "notifyWorkbenchCommandProgress",
    );
    const progressRefreshBlock = extractFunctionBlock(
      workbenchSource,
      "refreshWorkbenchCommandProgress",
    );

    const legacyProjectionFile = ["citation", "graph-index.json"].join("-");
    const legacyGraphManifest = ["citation-graph", "manifest.json"].join("/");
    for (const forbidden of [
      "rebuildCitationGraphCacheFromSidecar",
      ["replace", "IndexState"].join(""),
      ["refreshReference", "SidecarProjection"].join(""),
      ["list", "Paper", "RegistryFacts"].join(""),
      "buildReferenceMatcherIndex",
      "resolveReferenceWithPolicy",
      "dedupeCanonicalReferences",
      "upsertReferenceMatchProposal",
      ["reference-sidecar", "state.json"].join("-"),
      legacyProjectionFile,
      legacyGraphManifest,
    ]) {
      assert.notInclude(refreshBlock, forbidden);
    }
    for (const forbidden of [
      `from "./${["literature", "Registry"].join("")}"`,
      `.${["list", "ZoteroBindings"].join("")}(`,
      `.${["list", "Paper", "RegistryFacts"].join("")}(`,
      `.${["replace", "IndexState"].join("")}(`,
      `.${["refreshReference", "SidecarProjection"].join("")}(`,
    ]) {
      assert.notInclude(serviceSource, forbidden);
    }

    assert.include(refreshBlock, 'cacheKey: "reference-sidecar:library"');
    assert.include(refreshBlock, "markCitationGraphLibraryCacheStale");
    assert.include(graphStaleHelperBlock, 'cacheKey: "citation-graph:library"');
    assert.include(graphStaleHelperBlock, 'status: "stale"');
    assert.include(
      relatedStaleHelperBlock,
      'cacheKey: "related-items-sync:global"',
    );
    assert.include(relatedStaleHelperBlock, 'status: "stale"');
    assert.include(refreshBlock, "markRelatedItemsSyncCacheStaleForSidecarChange");
    assert.notInclude(refreshBlock, "refreshCitationGraphCacheIncremental");
    assert.notInclude(refreshBlock, "syncRelatedItemsAfterSynthesisUpdate");
    assert.notInclude(refreshBlock, "replaceCitationGraphState(");
    assert.include(advancedMatchingBlock, "buildReferenceMatcherIndex");
    assert.include(advancedMatchingBlock, "resolveReferenceWithPolicy");
    assert.match(
      advancedMatchingBlock,
      /\bdedupeCanonicalReferencesClustered\s*\(/,
    );
    assert.notMatch(advancedMatchingBlock, /\bdedupeCanonicalReferences\s*\(/);
    assert.include(advancedMatchingBlock, "upsertReferenceMatchProposal");
    assert.include(advancedMatchingBlock, "refreshCitationGraphCacheIncremental");
    assert.notMatch(
      readRepoText("src/modules/synthesis/referenceMatcher.ts"),
      /export function dedupeCanonicalReferences\s*\(/,
    );
    assert.notMatch(refreshBlock, /\bdedupeCanonicalReferencesClustered\s*\(/);
    assert.include(graphRebuildBlock, "rebuildCitationGraphCacheFromSidecar");
    assert.notInclude(graphRebuildBlock, "listReferenceMatchProposals");
    assert.include(workbenchSource, "rebuildCitationGraphCacheNow");
    assert.include(workbenchSource, "manualRecomputeLayout");
    assert.include(appSource, 'command: "rebuildCitationGraphCacheNow"');
    assert.include(debugSnapshotBlock, "includeUiSnapshot");
    assert.include(debugSnapshotBlock, "include_ui_snapshot");
    assert.notInclude(debugSnapshotBlock, "getSynthesisSnapshotInput(");
    assert.notInclude(debugOperationsBlock, "getSynthesisSnapshotInput(");
    assert.notInclude(debugOperationsBlock, "getSynthesisSnapshot(");
    assert.include(debugOperationsBlock, "synthesisDebugBackgroundJobs");
    assert.notInclude(notifyProgressBlock, "getSynthesisSnapshotInput(");
    assert.notInclude(progressRefreshBlock, "getSynthesisSnapshotInput(");
    assert.include(progressRefreshBlock, "getSynthesisBackgroundJobRows");
    assert.notInclude(sendSnapshotBlock, "buildDefaultSnapshotInput(error)");
    assert.notInclude(appSource, "actionToBackgroundJob");
    assert.notInclude(appSource, "applyLiteratureCleanupAction");
  });

  it("keeps related-items sync independent from graph rebuild and digest auto matching", function () {
    const serviceSource = readRepoText("src/modules/synthesis/service.ts");
    const digestWorkflow = readRepoText(
      "workflows_builtin/literature-workbench-package/literature-analysis/workflow.json",
    );
    const digestApply = readRepoText(
      "workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs",
    );
    const syncBlock = extractFunctionBlock(
      serviceSource,
      "syncRelatedItemsFromAcceptedEdges",
    );
    const publicSyncBlock = extractFunctionBlock(
      serviceSource,
      "syncRelatedItemsNow",
    );

    assert.notInclude(digestWorkflow, "auto_reference_matching");
    assert.notInclude(digestApply, "auto_reference_matching");
    assert.notInclude(digestApply, "applyReferenceMatchingToNote");
    assert.notInclude(syncBlock, "rebuildCitationGraphCacheFromSidecar");
    assert.notInclude(publicSyncBlock, "rebuildCitationGraphCacheFromSidecar");
    assert.include(
      serviceSource,
      "loadAcceptedLibraryCitationEdgesForRelatedItems",
    );
    assert.include(serviceSource, "yieldToEventLoop");
  });

  it("keeps review candidate generation bounded [inv.review.queue_bounded]", function () {
    const matcherSource = readRepoText(
      "src/modules/synthesis/referenceMatcher.ts",
    );

    assert.include(
      matcherSource,
      "suggestedCandidates: candidates.slice(0, 3)",
    );
    assert.include(
      matcherSource,
      "suggested_candidates: candidates.slice(0, 3)",
    );
    assert.include(matcherSource, "maxCandidatePairs");
    assert.include(matcherSource, "maxBlockSize");
    assert.include(matcherSource, "cluster_dedupe_pair_budget_exceeded");
    assert.isFalse(
      fs.existsSync(
        repoPath(`src/modules/synthesis/${["literature", "Registry"].join("")}.ts`),
      ),
    );
  });
});
