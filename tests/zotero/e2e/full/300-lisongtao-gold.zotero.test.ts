import { assert } from "chai";
import { config } from "../../../../package.json";
import { SYNTHESIS_EVIDENCE_SOURCE_MAX_UTF16 } from "../../../../packages/synthesis-contracts/src/search";
import type {
  SynthesisSemanticEvidenceContextResult,
  SynthesisSemanticEvidenceSearchRequest,
} from "../../../../packages/synthesis-contracts/src/retrieval";
import {
  listSidecarDiscoveries,
  readSystemE2ESidecarConnection,
  waitUntil as waitUntilBounded,
} from "../../../../scripts/system-e2e/healthGate";
import {
  createNativeSynthesisClientComposition,
  createNativeSynthesisLibraryLexicalPort,
  createNativeSynthesisLibraryRetrievalPort,
  createNativeSynthesisRetrievalPort,
} from "../../../../src/modules/synthesisClient/nativeComposition";
import {
  createZoteroHostCapabilityBroker,
  resolveZoteroHostCapabilityBroker,
} from "../../../../src/modules/zoteroHostCapabilityBroker";
import { ensureZoteroMcpServer } from "../../../../src/modules/hostBridge/mcp/zoteroMcpServer";
import { createDefaultSynthesisUiState } from "../../../../src/modules/synthesis/uiModel";
import { createZoteroSynthesisHostReadPort } from "../../../../src/modules/synthesis/libraryAdapter";
import { toSynthesisWorkbenchReadState } from "../../../../src/modules/synthesisClient/workbenchUiAdapter";
import type { SynthesisWorkbenchSidecarStatus } from "../../../../src/shared/synthesisWorkbenchWireContract";
import { renderPayloadBlock } from "../../../../src/modules/zoteroHost/notePayloadCodec";
import { managedArtifactContent } from "../../../../src/modules/zoteroHost/zoteroManagedNotes";
import {
  getConfiguredContentFeedUrls,
  getContentPackageStatus,
  installContentPackageFromFeed,
} from "../../../../src/modules/workflow/catalog/contentPackageSubscription";
import { resolveHostBridgeCliBinary } from "../../../../src/modules/hostBridge/cli/hostBridgeCliResolver";
import { getHostBridgeToken } from "../../../../src/modules/hostBridge/server/hostBridgeAuth";
import { getHostBridgeServerStatus } from "../../../../src/modules/hostBridge/server/hostBridgeServer";
import {
  getAcpWebSocketBridgeSnapshot,
  shutdownAcpWebSocketBridgeService,
} from "../../../../src/modules/acp/transport/acpWebSocketBridgeService";
import { setDefaultSynthesisClientCompositionFactoryForTests } from "../../../../src/modules/synthesisClient/defaultClient";
import {
  createBackendsPrefsDocument,
  loadBackendsRegistry,
} from "../../../../src/backends/registry";
import type { BackendInstance } from "../../../../src/backends/types";
import { materializeHostBridgePluginSkillBundle } from "../../../../src/modules/hostBridge/cli/hostBridgePluginSkillBundle";
import {
  connectAcpConversation,
  deleteActiveAcpConversation,
  disconnectAcpConversation,
  sendAcpConversationPrompt,
  setActiveAcpBackend,
} from "../../../../src/modules/acp/chat/acpSessionManager";
import {
  getAcpConversationSnapshot,
  readAcpConversationTranscriptPage,
} from "../../../../src/modules/acp/chat/acpChatWorkspaceDataPlane";
import { buildSubprocessEnvironment } from "../../../../src/platform/env";
import { executeOneShotSubprocess } from "../../../../src/platform/subprocess";
import { clearPref, getPref, setPref } from "../../../../src/utils/prefs";
import { setDebugModeOverrideForTests } from "../../../../src/modules/debugMode";
import {
  saveSynthesisEmbeddingPrefs,
  testSynthesisEmbeddingConnection,
} from "../../../../src/modules/synthesis/synthesisEmbeddingPrefs";

import {
  ensureRuntimeDirectoryExclusive,
  getRuntimePersistencePaths,
  removeRuntimePath,
  reserveRuntimeTemporaryDirectory,
  writeRuntimeTextFile,
} from "../../../../src/modules/runtimePersistence";
import { createWorkflowHostApi } from "../../../../src/workflows/hostApi";
import { loadWorkflowManifests } from "../../../../src/workflows/loader";
import { executeApplyResult } from "../../../../src/workflows/runtime";
import gold from "../../../fixtures/zotero-e2e/lisongtao-v1.json";
import { syntheticTopicApplyRequest } from "../../../fixtures/synthesisSyntheticDatasets";
import {
  readDiagnosticsEnv,
  writeDiagnosticsText,
} from "../../testDiagnosticsOutput";
import { systemE2ECase } from "../../systemE2ECases";

type WorkbenchFrame = HTMLElement & { contentDocument?: Document };

type NativeSidecarComposition = Awaited<
  ReturnType<typeof createNativeSynthesisClientComposition>
>;

type SyntheticTagFixture = {
  baselineStagedTags: Set<string>;
  tags: string[];
};

const INDEX_PAGE_LIMIT = 100;
const LARGE_TAG_COUNT = 1_000;
const SYNTHETIC_INDEX_PARENT_COUNT = 125;
const MAX_MOUNTED_TAG_ROWS = 256;
const SIDECAR_HEALTH_PERIOD_MS = 60_000;
const HOST_FACTS_SETTLE_MS = 250;

async function waitUntil<Value>(
  read: () => Value | null | undefined,
  timeoutMs = 60_000,
) {
  return waitUntilBounded(read, timeoutMs, "synthesis-e2e-condition");
}

async function resolveHostBridgeCliForE2E() {
  const injectedPath = readDiagnosticsEnv("ZOTERO_BRIDGE_CLI");
  if (!injectedPath) return resolveHostBridgeCliBinary();
  assert.isTrue(
    await IOUtils.exists(injectedPath),
    "ZOTERO_BRIDGE_CLI must point to the runner-built CLI",
  );
  return { available: true as const, binaryPath: injectedPath };
}

async function connectNativeSidecar(
  readStatus: () => SynthesisWorkbenchSidecarStatus | undefined,
) {
  const status = await waitUntilBounded(
    () => {
      const current = readStatus();
      return current?.lifecycle === "ready" && current.serviceInstanceId
        ? current
        : null;
    },
    60_000,
    "native-sidecar-ready",
  );
  const found = await waitUntilBounded(
    async () => {
      const discoveries = await listSidecarDiscoveries();
      return (
        discoveries.find(
          ({ discovery }) =>
            discovery.lifecycleState === "ready" &&
            discovery.serviceInstanceId === status.serviceInstanceId,
        ) || null
      );
    },
    30_000,
    "native-sidecar-discovery",
  );
  const connection = await readSystemE2ESidecarConnection(found);
  return {
    discovery: found,
    connection,
    composition: createNativeSynthesisClientComposition({
      getReadyConnection: () => connection,
    }),
  };
}

async function observeNativeSidecarHealth(
  readStatus: () => SynthesisWorkbenchSidecarStatus | undefined,
) {
  const status = await waitUntilBounded(
    () => {
      const current = readStatus();
      return current?.lifecycle === "ready" && current.healthObservedAt
        ? current
        : null;
    },
    60_000,
    "production-sidecar-health",
  );
  assert.equal(status.lifecycle, "ready");
  if (!status.serviceInstanceId || !status.healthObservedAt) {
    throw new Error("native_sidecar_health_identity_missing");
  }
  const found = await waitUntilBounded(
    async () => {
      const discoveries = await listSidecarDiscoveries();
      return (
        discoveries.find(
          ({ discovery }) =>
            discovery.lifecycleState === "ready" &&
            discovery.serviceInstanceId === status.serviceInstanceId,
        ) || null
      );
    },
    30_000,
    "native-sidecar-health-discovery",
  );
  return {
    discovery: found,
    healthObservedAt: status.healthObservedAt,
    serviceInstanceId: status.serviceInstanceId,
  };
}

type SignedEvidenceRef = {
  publication: string;
  identity: string;
  fragmentId: string;
  sourceVersion: string;
};

async function verifyEvidenceReferenceContext(
  composition: NativeSidecarComposition,
  evidenceRef: SignedEvidenceRef,
) {
  const context = await composition.client.readSemanticContext({ evidenceRef });
  assert.isNotEmpty(context.results, "signed evidence context must be readable");
  assert.isTrue(
    context.results.some((passage) =>
      passage.evidenceRef.publication === evidenceRef.publication &&
      passage.evidenceRef.identity === evidenceRef.identity &&
      passage.evidenceRef.fragmentId === evidenceRef.fragmentId &&
      passage.evidenceRef.sourceVersion === evidenceRef.sourceVersion,
    ),
    "semantic context must return the requested signed evidence ref",
  );
}

async function assertSignedEvidenceResults(
  result: any,
  item: Zotero.Item,
  publicationRef: { value?: string },
  composition: NativeSidecarComposition,
) {
  assert.equal(result.status, "completed");
  assert.equal(result.method, "vector");
  assert.equal(result.coverage.vector, "complete");
  assert.isEmpty(result.issues);
  assert.isNotEmpty(result.results);
  const firstRef = result.results[0].evidenceRef as SignedEvidenceRef;
  if (!publicationRef.value) {
    publicationRef.value = firstRef.publication;
    await verifyEvidenceReferenceContext(composition, firstRef);
  }
  for (const passage of result.results) {
    assert.isString(passage.evidenceRef.publication);
    assert.equal(passage.evidenceRef.publication, publicationRef.value);
    assert.isNotEmpty(passage.evidenceRef.identity);
    assert.isNotEmpty(passage.evidenceRef.fragmentId);
    assert.isNotEmpty(passage.evidenceRef.sourceVersion);
    assert.equal(passage.evidenceRef.identity, `${item.libraryID}:${item.key}`);
    assert.equal(passage.evidenceRef.sourceVersion, passage.sourceVersion);
  }
}

type SemanticContextSourceKind = "metadata" | "fulltext" | "analysis" | "topic";

type SemanticContextPassage = {
  kind: SemanticContextSourceKind;
  evidenceRef: SignedEvidenceRef;
  content: string;
};

function assertSemanticContextMatch(
  context: SynthesisSemanticEvidenceContextResult,
  passage: SemanticContextPassage,
) {
  assert.equal(context.status, "completed");
  const matches = context.results.filter((row) => row.match === true);
  assert.lengthOf(
    matches,
    1,
    `${passage.kind} context must resolve exactly one match`,
  );
  const matched = matches[0]!;
  assert.equal(matched.content, passage.content);
  assert.deepEqual(matched.evidenceRef, passage.evidenceRef);
  assert.equal(matched.source.kind, passage.kind);
}

async function collectSemanticContextPassages(
  composition: NativeSidecarComposition,
  requests: Array<{
    kind: SemanticContextSourceKind;
    request: SynthesisSemanticEvidenceSearchRequest;
  }>,
) {
  const passages: SemanticContextPassage[] = [];
  for (const { kind, request } of requests) {
    const result = await composition.client.searchSemanticEvidence(request);
    assert.equal(result.status, "completed");
    const passage = result.results.find((row) => row.source.kind === kind);
    assert.isOk(passage, `${kind} search must return a passage`);
    passages.push({
      kind,
      evidenceRef: passage!.evidenceRef,
      content: passage!.content,
    });
  }
  return passages;
}

async function runSemanticContextReadbacks(
  passages: SemanticContextPassage[],
  workbenchClientContext: (
    evidenceRef: SignedEvidenceRef,
  ) => Promise<SynthesisSemanticEvidenceContextResult>,
  cliProfilePath: string,
) {
  const cli = await resolveHostBridgeCliForE2E();
  if (!cli.available) throw new Error(cli.code);
  const bridge = getHostBridgeServerStatus();
  assert.equal(bridge.status, "running");
  const mcpEndpoint = bridge.endpoint.replace(/\/bridge\/v2\/?$/, "/mcp");
  const token = getHostBridgeToken();
  const invokeCli = async (passage: SemanticContextPassage) => {
    const result = await executeOneShotSubprocess({
      command: cli.binaryPath,
      args: [
        "--endpoint",
        bridge.endpoint,
        "--profile",
        cliProfilePath,
        "synthesis",
        "evidence",
        "context",
        "--query",
        JSON.stringify({ evidenceRef: passage.evidenceRef }),
      ],
      environment: buildSubprocessEnvironment({
        ZOTERO_BRIDGE_TOKEN: token,
      }),
      timeoutMs: 120_000,
    });
    assert.equal(result.outcome, "exited");
    assert.equal(result.exitCode, 0, result.stderr);
    const envelope = JSON.parse(result.stdout);
    assert.isTrue(envelope.ok, JSON.stringify(envelope.error));
    return envelope.data?.data ?? envelope.data;
  };
  const invokeMcp = async (passage: SemanticContextPassage) => {
    const response = await fetch(mcpEndpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `semantic-context-${Date.now()}-${Math.random()}`,
        method: "tools/call",
        params: {
          name: "synthesis.read_semantic_context",
          arguments: { evidenceRef: passage.evidenceRef },
        },
      }),
    });
    assert.equal(response.status, 200);
    const envelope = await response.json();
    assert.isUndefined(envelope.error, JSON.stringify(envelope.error));
    return envelope.result?.structuredContent?.data;
  };
  const routes: Array<{
    route: string;
    elapsedMs: number;
    sources: Array<{ kind: SemanticContextSourceKind; elapsedMs: number }>;
  }> = [];
  const overallStartedAt = Date.now();
  for (const [route, invoke] of [
    ["cli", invokeCli],
    ["mcp", invokeMcp],
    [
      "workbench-client",
      async (passage: SemanticContextPassage) =>
        await workbenchClientContext(passage.evidenceRef),
    ],
  ] as const) {
    const startedAt = Date.now();
    const sources: Array<{
      kind: SemanticContextSourceKind;
      elapsedMs: number;
    }> = [];
    for (const passage of passages) {
      const sourceStartedAt = Date.now();
      assertSemanticContextMatch(await invoke(passage), passage);
      sources.push({
        kind: passage.kind,
        elapsedMs: Date.now() - sourceStartedAt,
      });
    }
    routes.push({
      route,
      elapsedMs: Date.now() - startedAt,
      sources,
    });
  }
  return { totalElapsedMs: Date.now() - overallStartedAt, routes };
}

async function runSerialLibraryItemSearches(args: {
  mcpEndpoint: string;
  token: string;
  itemRefs: Array<{ libraryId: number; key: string }>;
}) {
  // These queries deliberately avoid the mock embedding fixture's 11.5s phrase.
  const queries = [
    "卫星遥感与土壤水分估算研究",
    "全文：通过遥感",
    "土壤湿度变化机制",
    "城市道路交通流量预测研究",
  ];
  const overallStartedAt = Date.now();
  const calls: Array<{
    index: number;
    query: string;
    method: string;
    status: string;
    vectorCoverage: { status: string; reason?: string } | undefined;
    issues: unknown[];
    elapsedMs: number;
  }> = [];
  for (let round = 0; round < 4; round += 1) {
    for (const query of queries) {
      const index = calls.length + 1;
      const startedAt = Date.now();
      const response = await fetch(args.mcpEndpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${args.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `library-item-search-${index}`,
          method: "tools/call",
          params: {
            name: "library.search_items",
            arguments: {
              query,
              limit: 8,
              itemRefs: args.itemRefs,
              sourceKinds: ["metadata", "fulltext", "analysis"],
            },
          },
        }),
      });
      assert.equal(response.status, 200);
      const envelope = await response.json();
      assert.isUndefined(envelope.error, JSON.stringify(envelope.error));
      const result = envelope.result?.structuredContent?.data;
      assert.isOk(result, `library item search ${index} returned no result`);
      assert.equal(result.method === "lexical", false, JSON.stringify(result));
      assert.equal(
        result.coverage?.vector?.status,
        "complete",
        JSON.stringify(result),
      );
      calls.push({
        index,
        query,
        method: result.method,
        status: result.status,
        vectorCoverage: result.coverage?.vector,
        issues: result.issues ?? [],
        elapsedMs: Date.now() - startedAt,
      });
    }
  }
  return {
    totalElapsedMs: Date.now() - overallStartedAt,
    delayFreeQueries: true,
    calls,
  };
}

async function runSemanticSearchBursts(
  request: SynthesisSemanticEvidenceSearchRequest,
  item: Zotero.Item,
  publicationRef: { value?: string },
  composition: NativeSidecarComposition,
  workbenchClientSearch: () => Promise<unknown>,
  cliProfilePath: string,
) {
  const cli = await resolveHostBridgeCliForE2E();
  if (!cli.available) throw new Error(cli.code);
  const bridge = getHostBridgeServerStatus();
  assert.equal(bridge.status, "running");
  const mcpEndpoint = bridge.endpoint.replace(/\/bridge\/v2\/?$/, "/mcp");
  const token = getHostBridgeToken();
  const invokeCli = async () => {
    const result = await executeOneShotSubprocess({
      command: cli.binaryPath,
      args: [
        "--endpoint",
        bridge.endpoint,
        "--profile",
        cliProfilePath,
        "synthesis",
        "evidence",
        "semantic-search",
        "--query",
        JSON.stringify(request),
      ],
      environment: buildSubprocessEnvironment({
        ZOTERO_BRIDGE_TOKEN: token,
      }),
      timeoutMs: 120_000,
    });
    assert.equal(result.outcome, "exited");
    assert.equal(result.exitCode, 0, result.stderr);
    const envelope = JSON.parse(result.stdout);
    assert.isTrue(envelope.ok, JSON.stringify(envelope.error));
    await assertSignedEvidenceResults(
      envelope.data?.data ?? envelope.data,
      item,
      publicationRef,
      composition,
    );
  };
  const invokeMcp = async () => {
    const response = await fetch(mcpEndpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `semantic-search-${Date.now()}-${Math.random()}`,
        method: "tools/call",
        params: {
          name: "synthesis.search_semantic_evidence",
          arguments: request,
        },
      }),
    });
    assert.equal(response.status, 200);
    const envelope = await response.json();
    assert.isUndefined(envelope.error, JSON.stringify(envelope.error));
    await assertSignedEvidenceResults(
      envelope.result?.structuredContent?.data,
      item,
      publicationRef,
      composition,
    );
  };
  const invokeWorkbenchClient = async () =>
    await assertSignedEvidenceResults(
      await workbenchClientSearch(),
      item,
      publicationRef,
      composition,
    );
  const bursts = [] as Array<{
    route: string;
    size: number;
    temperature: "cold" | "warm";
    elapsedMs: number;
  }>;
  for (const [route, invoke] of [
    ["cli", invokeCli],
    ["mcp", invokeMcp],
    ["workbench-client", invokeWorkbenchClient],
  ] as const) {
    for (const size of [1, 3, 6]) {
      const startedAt = Date.now();
      await Promise.all(Array.from({ length: size }, () => invoke()));
      bursts.push({
        route,
        size,
        temperature: "warm",
        elapsedMs: Date.now() - startedAt,
      });
    }
  }
  return bursts;
}

function bindTestDefaultSynthesisClient(
  connection: Awaited<ReturnType<typeof readSystemE2ESidecarConnection>>,
) {
  setDefaultSynthesisClientCompositionFactoryForTests(
    () =>
      createNativeSynthesisClientComposition({
        getReadyConnection: () => connection,
      }),
  );
  return () => setDefaultSynthesisClientCompositionFactoryForTests(null);
}

async function waitForAutomaticHealthAfter(
  readStatus: () => SynthesisWorkbenchSidecarStatus | undefined,
  previousHealthObservedAt: string,
  serviceInstanceId: string,
) {
  const status = await waitUntilBounded(
    () => {
      const current = readStatus();
      return current?.lifecycle === "ready" &&
        current.serviceInstanceId === serviceInstanceId &&
        current.healthObservedAt &&
        Date.parse(current.healthObservedAt) >=
          Date.parse(previousHealthObservedAt) + SIDECAR_HEALTH_PERIOD_MS
        ? current
        : null;
    },
    SIDECAR_HEALTH_PERIOD_MS + 10_000,
    "automatic-sidecar-health-observation",
  );
  if (!status.healthObservedAt) {
    throw new Error("automatic_sidecar_health_timestamp_missing");
  }
  const found = await waitUntilBounded(
    async () => {
      const discoveries = await listSidecarDiscoveries();
      return (
        discoveries.find(
          ({ discovery }) =>
            discovery.lifecycleState === "ready" &&
            discovery.serviceInstanceId === serviceInstanceId,
        ) || null
      );
    },
    30_000,
    "automatic-sidecar-health-discovery",
  );
  return {
    discovery: found,
    healthObservedAt: status.healthObservedAt,
    serviceInstanceId,
  };
}

async function createSyntheticIndexParents(items: Zotero.Item[]) {
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await Zotero.DB.executeTransaction(async () => {
    for (let index = 0; index < SYNTHETIC_INDEX_PARENT_COUNT; index += 1) {
      const item = new Zotero.Item("journalArticle");
      item.setField(
        "title",
        `Synthetic E2E Index Parent ${stamp} ${String(index).padStart(3, "0")}`,
      );
      item.setField("date", "2026");
      await item.save();
      items.push(item);
      const note = new Zotero.Item("note");
      note.libraryID = item.libraryID;
      note.parentItemID = item.id;
      note.setNote(
        renderPayloadBlock({
          payloadType: "references-json",
          payload: {
            schema: "source_reference_artifact.v1",
            references: [
              {
                sourceReferenceId: `system-e2e-index-navigation-${stamp}-${index}`,
                extraction: {
                  raw: `Synthetic Index navigation reference ${index}`,
                  confidence: 1,
                },
                bibliography: {
                  title: `Synthetic Index navigation reference ${index}`,
                  authors: [],
                  year: null,
                },
                matching: {},
              },
            ],
          },
          payloadFormat: "json",
        }),
      );
      await note.save();
      items.push(note);
    }
  });
}

function createSyntheticTagFixture(): SyntheticTagFixture {
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    baselineStagedTags: new Set(),
    tags: Array.from(
      { length: LARGE_TAG_COUNT },
      (_, index) =>
        `topic:zs-e2e-staged-${stamp}-${String(index).padStart(4, "0")}`,
    ),
  };
}

async function seedSyntheticTags(
  composition: NativeSidecarComposition,
  fixture: SyntheticTagFixture,
) {
  const baseline = await composition.client.tags.listStagedTagSuggestions();
  for (const entry of baseline) fixture.baselineStagedTags.add(entry.tag);
  await composition.client.tags.stageTagSuggestions({
    entries: fixture.tags.map((tag) => ({
      tag,
      facet: "topic",
      source_flow: "system-e2e-index-navigation",
    })),
  });
  await waitUntilBounded(
    async () => {
      const staged = await composition.client.tags.listStagedTagSuggestions();
      const stagedSet = new Set(staged.map((entry) => entry.tag));
      return fixture.tags.every((tag) => stagedSet.has(tag)) ? true : null;
    },
    30_000,
    "synthetic-tag-fixtures-visible",
  );
}

async function cleanupSyntheticTags(
  composition: NativeSidecarComposition,
  fixture: SyntheticTagFixture,
) {
  const staged = await composition.client.tags.listStagedTagSuggestions();
  const stagedSet = new Set(fixture.tags);
  const ownedStaged = staged
    .map((entry) => entry.tag)
    .filter((tag) => stagedSet.has(tag));
  if (ownedStaged.length) {
    await composition.client.tags.discardStagedTagSuggestions({
      tags: ownedStaged,
    });
  }
  const stagedAfter = await composition.client.tags.listStagedTagSuggestions();
  const stagedAfterSet = new Set(stagedAfter.map((entry) => entry.tag));
  assert.isFalse(fixture.tags.some((tag) => stagedAfterSet.has(tag)));
  for (const tag of fixture.baselineStagedTags) {
    assert.isTrue(
      stagedAfterSet.has(tag),
      `baseline staged tag removed: ${tag}`,
    );
  }
}

async function eraseSyntheticItems(items: Zotero.Item[]) {
  const ids = items.map((item) => item.id).filter(Boolean);
  await Zotero.Items.erase(ids);
  await waitUntilBounded(
    () => ids.every((id) => !Zotero.Items.get(id)) || null,
    10_000,
    "synthetic-index-items-erased",
  );
  items.length = 0;
}

async function readGoldLibraryFacts() {
  const libraryId = Zotero.Libraries.userLibraryID;
  const itemTypes = (await Zotero.DB.queryAsync(
    `SELECT it.typeName AS typeName, COUNT(*) AS count
       FROM items i
       JOIN itemTypes it USING (itemTypeID)
       LEFT JOIN deletedItems d USING (itemID)
      WHERE i.libraryID = ? AND d.itemID IS NULL
        AND it.typeName IN ('journalArticle', 'thesis', 'conferencePaper', 'bookSection')
      GROUP BY it.typeName`,
    [libraryId],
  )) as Array<{ typeName: string; count: number }>;
  const scalar = (sql: string) => Zotero.DB.valueQueryAsync(sql, [libraryId]);
  return {
    itemTypes: Object.fromEntries(
      itemTypes.map((row) => [row.typeName, Number(row.count)]),
    ),
    attachments: Number(
      await scalar(
        "SELECT COUNT(*) FROM items i JOIN itemAttachments a USING (itemID) LEFT JOIN deletedItems d USING (itemID) WHERE i.libraryID = ? AND d.itemID IS NULL",
      ),
    ),
    notes: Number(
      await scalar(
        "SELECT COUNT(*) FROM items i JOIN itemNotes n USING (itemID) LEFT JOIN deletedItems d USING (itemID) WHERE i.libraryID = ? AND d.itemID IS NULL",
      ),
    ),
    collections: Number(
      await scalar(
        "SELECT COUNT(*) FROM collections WHERE libraryID = ? AND collectionID NOT IN (SELECT collectionID FROM deletedCollections)",
      ),
    ),
    tags: Number(
      await scalar(
        "SELECT COUNT(DISTINCT tagID) FROM itemTags JOIN items USING (itemID) WHERE libraryID = ?",
      ),
    ),
  };
}

describe("Synthesis E2E gold library", function () {
  this.timeout(900_000);
  let cleanupAfterCase: (() => Promise<void>) | undefined;
  let removeStatusListener: (() => void) | undefined;
  const previousChannel = getPref("contentFeedChannel");
  const previousMirror = getPref("contentDevFeedMirrorUrl");
  let contentSettingsChanged = false;

  before(async function () {
    const channel = readDiagnosticsEnv("ZOTERO_TEST_CONTENT_CHANNEL");
    if (!channel) return;
    assert.oneOf(channel, ["stable", "beta", "dev"]);
    const version = readDiagnosticsEnv("ZOTERO_TEST_CONTENT_VERSION");
    assert.isNotEmpty(version);
    contentSettingsChanged = true;
    if (channel === "dev") {
      setDebugModeOverrideForTests(true);
      const primary = getConfiguredContentFeedUrls("dev").find(
        (source) => source.kind === "primary",
      )!;
      setPref("contentDevFeedMirrorUrl", primary.url);
    }
    setPref("contentFeedChannel", channel);
    if (readDiagnosticsEnv("ZOTERO_E2E_GOLD_ID")) {
      const current = (await getContentPackageStatus()).installed?.package;
      if (current?.channel === channel && current.version === version) return;
    }
    const installed = await installContentPackageFromFeed({
      channel: channel as "stable" | "beta" | "dev",
    });
    if (!installed.ok)
      throw new Error(`content_install:${installed.code}:${installed.message}`);
    assert.equal(installed.installed.package.version, version);
    assert.equal(installed.installed.package.channel, channel);
  });

  systemE2ECase(
    "retrieval-semantic-search-01",
    undefined,
    "retrieval-semantic-search-01 builds every selected retrieval source from real preferences and searches synthetic Chinese papers",
    async function () {
      const liveOllama =
        readDiagnosticsEnv("ZOTERO_E2E_RETRIEVAL_LIVE_OLLAMA") === "1";
      const useGold = Boolean(readDiagnosticsEnv("ZOTERO_E2E_GOLD_ID"));
      if (liveOllama) {
        assert.isFalse(useGold, "live Ollama requires the synthetic seed");
        assert.notEqual(readDiagnosticsEnv("ZOTERO_E2E_FIXTURE"), "gold");
        assert.equal(
          readDiagnosticsEnv("ZOTERO_E2E_FIXTURE_ID"),
          "foundation-v1",
          "live Ollama only accepts the committed synthetic E2E seed",
        );
      }
      const embeddingEndpoint = liveOllama
        ? "http://192.168.13.111:11434/v1/embeddings"
        : readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_EVENT_URL").replace(
            /\/events$/,
            "/embeddings",
          );
      if (!liveOllama) {
        assert.match(
          embeddingEndpoint,
          /^http:\/\/127\.0\.0\.1:\d+\/embeddings$/,
        );
      }
      const oldPrefs = (
        [
          "synthesisEmbeddingEnabled",
          "synthesisEmbeddingConnectionsJson",
          "synthesisEmbeddingSelectionJson",
          "synthesisEmbeddingPendingScopeJson",
          "synthesisEmbeddingConnectionTestJson",
        ] as const
      ).map((key) => [key, getPref(key)] as const);
      const connection = {
        id: `e2e-${Date.now()}`,
        name: "System E2E embedding fixture",
        protocol: "openai" as const,
        baseUrl: embeddingEndpoint,
        embeddingUrl: embeddingEndpoint,
        modelId: liveOllama ? "qwen3-embedding:4b" : "zotero-e2e-fixture",
        dimensions: liveOllama ? 2560 : 3,
        queryPrefix: "",
        documentPrefix: "",
        discovery: { protocol: "none" as const },
        auth: { type: "none" as const },
      };
      const items: Zotero.Item[] = [];
      let topicClient: NativeSidecarComposition | undefined;
      let restoreHostBridgeSynthesisResolver: (() => void) | undefined;
      let topicId: string | undefined;
      const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
      const plugin = (Zotero as any)[config.addonInstance];
      let preferences: Window | undefined;
      const openExplorer = async () => {
        await plugin.hooks.onPrefsEvent("openSynthesisWorkbench", {
          window: mainWindow,
        });
        const doc = await waitUntil(() => {
          const shell = mainWindow.document.querySelector<WorkbenchFrame>(
            '[data-zs-role="workspace-frame"]',
          );
          const frame = shell?.contentDocument?.querySelector<WorkbenchFrame>(
            '[data-zs-role="synthesis-workbench-frame"]',
          );
          const doc = frame?.contentDocument;
          return doc?.querySelector('[data-synthesis-tab="retrieval"]')
            ? doc
            : null;
        });
        doc
          .querySelector<HTMLButtonElement>('[data-synthesis-tab="retrieval"]')!
          .click();
        await waitUntil(() => doc.querySelector(".retrieval-explorer"));
        return doc;
      };
      const fixture = await reserveRuntimeTemporaryDirectory({
        category: "semantic-search",
      });
      const cliProfilePath = PathUtils.join(
        fixture.path,
        "isolated-bridge-profile.json",
      );
      const networkTimeout = "network.http.network-changed.timeout";
      const previousTimeout = Services.prefs.prefHasUserValue(networkTimeout)
        ? Services.prefs.getIntPref(networkTimeout)
        : undefined;
      try {
        // Keep Gecko's link-change pruning from interrupting the silent 11.5s loopback fixture.
        if (!liveOllama) Services.prefs.setIntPref(networkTimeout, 90);
        let paperIndex = 0;
        for (const [title, abstract, fullText] of [
          [
            "卫星遥感与土壤水分估算研究",
            "本文使用卫星影像分析土壤含水量，评估不同地表条件下的水分变化。",
            "全文：通过遥感反演和地面观测估算农田土壤湿度，为灌溉决策提供依据。",
          ],
          [
            "城市道路交通流量预测研究",
            "本文分析城市道路车辆流量和通勤变化。",
            "全文：使用交通传感器研究高峰拥堵。",
          ],
          [
            "区域气候降水变化研究",
            "本文分析气温和降水的长期趋势。",
            "全文：比较不同区域气候与降雨量。",
          ],
        ]) {
          const paper = new Zotero.Item("journalArticle");
          paper.setField("title", title);
          paper.setField("abstractNote", abstract);
          paper.setField("date", "2025");
          await paper.saveTx();
          items.push(paper);
          const markdownPath = PathUtils.join(
            fixture.path,
            `p${paperIndex++}.md`,
          );
          await writeRuntimeTextFile(
            markdownPath,
            `# ${title}\n\n${abstract}\n\n${fullText}\n`,
          );
          await Zotero.Attachments.importFromFile({
            file: markdownPath,
            parentItemID: paper.id,
            title: `synthetic-paper-${paperIndex}.md`,
            contentType: "text/markdown",
          });
          if (paperIndex === 1) {
            const note = new Zotero.Item("note");
            note.libraryID = paper.libraryID;
            note.parentItemID = paper.id;
            note.setNote(
              managedArtifactContent(
                "digest",
                "分析内容",
                "# 分析内容\n\n分析来源检索标记：土壤湿度变化机制。",
              ).content,
            );
            await note.saveTx();
            items.push(note);
          }
        }
        const status = saveSynthesisEmbeddingPrefs({
          enabled: true,
          connections: [connection],
          primaryConnectionId: connection.id,
          fallbackConnectionIds: [],
        });
        assert.isTrue(status.ok);
        const verified = await testSynthesisEmbeddingConnection({
          connectionId: connection.id,
        });
        assert.isTrue(verified.ok, JSON.stringify(verified.diagnostics));
        preferences = (Zotero.Utilities.Internal as any).openPreferences(
          `zotero-prefpane-${config.addonRef}`,
        ) as Window;
        const preferenceControl = <T extends Element>(suffix: string) => {
          const control = preferences!.document.getElementById(
            `zotero-prefpane-${config.addonRef}-retrieval-${suffix}`,
          ) as T | null;
          assert.isOk(control, `retrieval preference missing: ${suffix}`);
          return control!;
        };
        const selectedSources = [
          "source-metadata",
          "source-fulltext",
          "source-analysis",
          "include-topics",
        ];
        for (const suffix of selectedSources) {
          await waitUntil(() =>
            preferences!.document.getElementById(
              `zotero-prefpane-${config.addonRef}-retrieval-${suffix}`,
            ),
          );
          const checkbox = preferenceControl<HTMLInputElement>(suffix);
          checkbox.checked = true;
          checkbox.dispatchEvent(
            new preferences!.Event("change", { bubbles: true }),
          );
        }
        preferenceControl<XUL.Button>("save").doCommand();
        await waitUntil(() => {
          const scope = JSON.parse(
            String(getPref("synthesisEmbeddingPendingScopeJson") || "null"),
          );
          return scope?.sourceKinds?.length === 3 && scope.includeTopics
            ? scope
            : null;
        });
        const savedScope = JSON.parse(
          String(getPref("synthesisEmbeddingPendingScopeJson")),
        );
        assert.deepEqual(savedScope.sourceKinds, [
          "metadata",
          "fulltext",
          "analysis",
        ]);
        assert.isTrue(savedScope.includeTopics);
        preferences.close();
        preferences = undefined;
        const first = await openExplorer();
        const ready = await waitUntil(async () =>
          (await listSidecarDiscoveries()).find(
            ({ discovery }) => discovery.lifecycleState === "ready",
          ),
        );
        const connectionInfo = await readSystemE2ESidecarConnection(ready);
        topicClient = createNativeSynthesisClientComposition({
          getReadyConnection: () => connectionInfo,
        });
        const retrieval = createNativeSynthesisRetrievalPort({
          getReadyConnection: () => connectionInfo,
        });
        const previousPublicationBasis = (await retrieval.getState()).publication;
        const topicRequest = syntheticTopicApplyRequest({
          name: "2k",
          paperRefs: [`${items[0].libraryID}:${items[0].key}`],
        });
        const topic = topicRequest.bundle.topic_definition;
        const applied =
          await topicClient.client.workflowApply.applyTopicSynthesisResult(
            topicRequest,
          );
        assert.equal(applied.status, "persisted");
        topicId = topic.id;
        first
          .querySelector<HTMLElement>(".retrieval-settings summary")!
          .click();
        const build = await waitUntil(() =>
          first.querySelector<HTMLButtonElement>(
            '[data-synthesis-command="retrievalRebuildIndex"]:enabled, [data-synthesis-command="retrievalBuildIndex"]:enabled',
          ),
        );
        let largeAnalysis:
          | { identity: string; contentLength: number }
          | undefined;
        if (useGold) {
          const libraryId = Zotero.Libraries.userLibraryID;
          const host = createZoteroSynthesisHostReadPort({ libraryId });
          let cursor: string | undefined;
          do {
            const page = await host.evidence.listSources({
              scope: { libraryIds: [libraryId] },
              sourceKinds: ["analysis"],
              scanMode: "retrieval",
              cursor,
            });
            assert.isEmpty(page.issues, JSON.stringify(page.issues));
            const [large] = page.descriptors
              .filter(
                (descriptor) =>
                  descriptor.source.kind === "analysis" &&
                  descriptor.source.artifactType === "citation-analysis" &&
                  descriptor.contentLength >
                    SYNTHESIS_EVIDENCE_SOURCE_MAX_UTF16,
              )
              .sort((a, b) => b.contentLength - a.contentLength);
            if (large) {
              largeAnalysis = {
                identity: `${large.itemRef.libraryId}:${large.itemRef.key}`,
                contentLength: large.contentLength,
              };
            }
            cursor = page.nextCursor ?? undefined;
          } while (cursor && !largeAnalysis);
          assert.exists(largeAnalysis, "gold large citation-analysis source");
        }
        const buildStarted = Date.now();
        build.click();
        await waitUntilBounded(
          async () => {
            if (
              first.querySelector(
                ".retrieval-panel .home-service-task .zs-badge--danger",
              )
            ) {
              const recent = await topicClient!.client.debug.listOperations({
                limit: 20,
              });
              const operation = recent.rows.find(
                (row) =>
                  row.status === "failed" &&
                  /^client\.(?:rebuild|build)RetrievalIndex$/.test(
                    row.operationType,
                  ),
              );
              const terminal = operation
                ? await retrieval.getOperation({
                    operation_id: operation.operationId,
                  })
                : null;
              throw new Error(
                `index_maintenance_failed:${JSON.stringify(terminal?.receipt?.diagnostics ?? [])}`,
              );
            }
            return first.querySelector(
              '[data-synthesis-command="retrievalUpdateIndex"]:enabled',
            );
          },
          useGold ? 600_000 : 120_000,
          "index-publication",
        );
        const rebuildMs = Date.now() - buildStarted;
        const currentPublicationBasis = await retrieval.getState();
        assert.equal(currentPublicationBasis.status, "ready");
        if (typeof currentPublicationBasis.publication !== "string") {
          throw new Error("retrieval_publication_basis_missing");
        }
        assert.notEqual(
          currentPublicationBasis.publication,
          previousPublicationBasis,
        );
        const publicationRef: { value?: string } = {};
        const searchRequest: SynthesisSemanticEvidenceSearchRequest = {
          query: "利用卫星影像评估土壤含水量",
          target: "paper",
          itemRefs: [{ libraryId: items[0].libraryID, key: items[0].key }],
          sourceKinds: ["metadata", "fulltext", "analysis"],
          limit: 8,
        };
        const previousBackendsConfig = getPref("backendsConfigJson");
        const configuredBackends = await loadBackendsRegistry();
        const workflowDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
        const acpFixturePath = PathUtils.join(
          PathUtils.parent(workflowDir),
          "tests",
          "fixtures",
          "acp",
          "acp-composer-reply-agent.mjs",
        );
        const acpEvidencePath = PathUtils.join(
          fixture.path,
          "acp-semantic.ndjson",
        );
        const acpBackendId = `e2e-semantic-acp-${Date.now()}`;
        const acpBackend: BackendInstance = {
          id: acpBackendId,
          displayName: "System E2E semantic search ACP fixture",
          type: "acp",
          baseUrl: "local://retrieval-semantic-search-01",
          command: readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH"),
          args: [acpFixturePath],
          env: { ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: acpEvidencePath },
          auth: { kind: "none" },
          acp: { agentFamily: "codex" },
        };
        let acpConversationId = "";
        const ownsAcpBridge = Zotero.isWin && !getAcpWebSocketBridgeSnapshot();
        let acpWorkspaceDir = "";
        let acpSearchBursts: Array<{
          size: number;
          temperature: "cold" | "warm";
          elapsedMs: number;
          toolElapsedMs: number[];
        }> = [];
        let semanticContextPassages: SemanticContextPassage[] = [];
        let acpContext:
          | {
              elapsedMs: number;
              contexts: Array<{
                sourceKind: SemanticContextSourceKind;
                matchCount: number;
                sourceKindMatches: boolean;
                contentMatches: boolean;
                refMatches: boolean;
                elapsedMs: number;
              }>;
            }
          | undefined;
        try {
          assert.isTrue(await IOUtils.exists(acpFixturePath));
          assert.isNotEmpty(acpBackend.command);
          const skillBundle = await materializeHostBridgePluginSkillBundle();
          assert.isTrue(
            skillBundle.ok,
            skillBundle.ok ? undefined : skillBundle.error,
          );
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([
                ...configuredBackends.backends,
                acpBackend,
              ]),
            ),
          );
          await setActiveAcpBackend({ backendId: acpBackendId });
          await connectAcpConversation({ backendId: acpBackendId });
          let acpSnapshot = getAcpConversationSnapshot(acpBackendId);
          acpConversationId = acpSnapshot.conversationId;
          acpWorkspaceDir = acpSnapshot.agentWorkspaceDir;
          assert.isNotEmpty(acpConversationId);
          assert.isNotEmpty(acpSnapshot.sessionId);
          assert.equal(acpSnapshot.status, "connected");
          const injected = acpSnapshot.diagnostics.find(
            (entry) => entry.kind === "acp_chat_injected_skills_ready",
          ) as
            | { raw?: { targetDirsBySkill?: Record<string, string[]> } }
            | undefined;
          assert.isOk(injected, "ACP Chat must report injected Skill targets");
          const skillId = "zotero-bridge-cli";
          const skillDir = injected!.raw?.targetDirsBySkill?.[skillId]?.[0];
          assert.isNotEmpty(skillDir, "current ACP Chat Skill copy is missing");
          const skillFile = PathUtils.join(skillDir!, "SKILL.md");
          assert.isTrue(await IOUtils.exists(skillFile));
          const injectionManifest = JSON.parse(
            await IOUtils.readUTF8(
              PathUtils.join(
                getRuntimePersistencePaths().acpChatRoot,
                "injected-skills-manifest.json",
              ),
            ),
          );
          const ownedTarget = injectionManifest.targets.find(
            (target: { relativeRoot: string; skillId: string }) =>
              target.skillId === skillId &&
              PathUtils.join(
                acpWorkspaceDir,
                ...target.relativeRoot.split("/"),
                skillId,
              ) === skillDir,
          );
          assert.isOk(
            ownedTarget,
            "selected ACP Skill copy must be owned by the current injection manifest",
          );
          const relativeSkillFile = `${ownedTarget.relativeRoot}/${skillId}/SKILL.md`;
          const bridgeBeforeAcp = getHostBridgeServerStatus();
          assert.equal(bridgeBeforeAcp.status, "running");
          restoreHostBridgeSynthesisResolver =
            bindTestDefaultSynthesisClient(connectionInfo);
          await writeRuntimeTextFile(
            cliProfilePath,
            JSON.stringify({ endpoint: bridgeBeforeAcp.endpoint }),
          );
          for (const size of [1, 3, 6]) {
            const startedAt = Date.now();
            await sendAcpConversationPrompt({
              backendId: acpBackendId,
              conversationId: acpConversationId,
              message: `system-e2e:semantic-search ${JSON.stringify({
                size,
                skillId,
                skillPath: relativeSkillFile,
                request: searchRequest,
              })}`,
            });
            acpSnapshot = getAcpConversationSnapshot(
              acpBackendId,
              acpConversationId,
            );
            assert.equal(acpSnapshot.status, "connected");
            assert.isFalse(acpSnapshot.busy);
            const transcriptPage = await readAcpConversationTranscriptPage({
              backendId: acpBackendId,
              conversationId: acpConversationId,
              limit: 80,
            });
            const assistantResult = [...transcriptPage.items]
              .reverse()
              .find(
                (entry) =>
                  entry.kind === "message" && entry.role === "assistant",
              );
            assert.isOk(
              assistantResult,
              `ACP transcript page has no assistant result (total=${transcriptPage.total}, eventSeq=${transcriptPage.eventSeq})`,
            );
            const result = JSON.parse(
              (assistantResult as { text: string }).text,
            );
            assert.isUndefined(
              result.error?.code,
              `ACP burst of ${size} failed: ${JSON.stringify(result.error)}`,
            );
            assert.equal(result.size, size);
            assert.equal(result.skill.id, skillId);
            assert.equal(result.skill.path, relativeSkillFile);
            assert.isNotEmpty(result.skill.sha256);
            assert.lengthOf(result.calls, size);
            for (const call of result.calls) {
              assert.equal(call.status, "completed");
              assert.equal(call.httpStatus, 200);
              assert.equal(call.method, "vector");
              assert.equal(call.coverage.vector, "complete");
              assert.isEmpty(call.issues);
              assert.isNotEmpty(call.evidenceRefs);
              for (const ref of call.evidenceRefs) {
                if (!publicationRef.value) {
                  publicationRef.value = ref.publication;
                  await verifyEvidenceReferenceContext(
                    topicClient,
                    ref,
                  );
                }
                assert.equal(ref.publication, publicationRef.value);
                assert.equal(
                  ref.identity,
                  `${items[0].libraryID}:${items[0].key}`,
                );
                assert.isNotEmpty(ref.fragmentId);
                assert.isNotEmpty(ref.sourceVersion);
              }
            }
            const toolCalls = transcriptPage.items.filter(
              (entry) => entry.kind === "tool_call",
            );
            assert.isAtLeast(toolCalls.length, size);
            assert.isTrue(
              toolCalls.every((entry) => entry.state === "completed"),
              "ACP Chat must project each real MCP call as a tool call",
            );
            acpSearchBursts.push({
              size,
              temperature: acpSearchBursts.length ? "warm" : "cold",
              elapsedMs: Date.now() - startedAt,
              toolElapsedMs: result.calls.map(
                (call: { elapsedMs: number }) => call.elapsedMs,
              ),
            });
          }
          semanticContextPassages = await collectSemanticContextPassages(
            topicClient!,
            [
              {
                kind: "metadata",
                request: {
                  query: "卫星遥感与土壤水分估算研究",
                  target: "paper",
                  itemRefs: [
                    { libraryId: items[0].libraryID, key: items[0].key },
                  ],
                  sourceKinds: ["metadata"],
                  limit: 8,
                },
              },
              {
                kind: "fulltext",
                request: {
                  query: "全文：通过遥感",
                  target: "paper",
                  itemRefs: [
                    { libraryId: items[0].libraryID, key: items[0].key },
                  ],
                  sourceKinds: ["fulltext"],
                  limit: 8,
                },
              },
              {
                kind: "analysis",
                request: {
                  query: "土壤湿度变化机制",
                  target: "paper",
                  itemRefs: [
                    { libraryId: items[0].libraryID, key: items[0].key },
                  ],
                  sourceKinds: ["analysis"],
                  limit: 8,
                },
              },
              {
                kind: "topic",
                request: {
                  query: topic.definition,
                  target: "topic",
                  topicIds: [topic.id],
                  limit: 8,
                },
              },
            ],
          );
          const acpContextStartedAt = Date.now();
          await sendAcpConversationPrompt({
            backendId: acpBackendId,
            conversationId: acpConversationId,
            message: `system-e2e:semantic-context ${JSON.stringify({
              requests: semanticContextPassages.map((passage) => ({
                sourceKind: passage.kind,
                evidenceRef: passage.evidenceRef,
                expectedContent: passage.content,
              })),
            })}`,
          });
          acpSnapshot = getAcpConversationSnapshot(
            acpBackendId,
            acpConversationId,
          );
          assert.equal(acpSnapshot.status, "connected");
          assert.isFalse(acpSnapshot.busy);
          const contextPage = await readAcpConversationTranscriptPage({
            backendId: acpBackendId,
            conversationId: acpConversationId,
            limit: 80,
          });
          const contextAssistant = [...contextPage.items]
            .reverse()
            .find(
              (entry) => entry.kind === "message" && entry.role === "assistant",
            );
          assert.isOk(contextAssistant, "ACP context result is missing");
          const contextResult = JSON.parse(
            (contextAssistant as { text: string }).text,
          );
          assert.isUndefined(
            contextResult.error?.code,
            `ACP context readback failed: ${JSON.stringify(contextResult.error)}`,
          );
          assert.lengthOf(contextResult.contexts, 4);
          for (const [index, context] of contextResult.contexts.entries()) {
            assert.equal(
              context.sourceKind,
              semanticContextPassages[index]!.kind,
            );
            assert.equal(context.matchCount, 1);
            assert.isTrue(context.sourceKindMatches);
            assert.isTrue(context.contentMatches);
            assert.isTrue(context.refMatches);
          }
          acpContext = {
            elapsedMs: Date.now() - acpContextStartedAt,
            contexts: contextResult.contexts,
          };
          const bridgeAfterAcp = getHostBridgeServerStatus();
          assert.isAtLeast(
            bridgeAfterAcp.requestCount,
            bridgeBeforeAcp.requestCount + 10,
            "ACP fixture must make ten real Host Bridge MCP requests",
          );
        } finally {
          if (!acpConversationId) {
            try {
              const partialSnapshot = getAcpConversationSnapshot(acpBackendId);
              acpConversationId = partialSnapshot.conversationId;
              acpWorkspaceDir = partialSnapshot.agentWorkspaceDir;
            } catch {
              // Backend setup may fail before the ACP session manager creates a conversation.
            }
          }
          try {
            if (acpConversationId) {
              await disconnectAcpConversation({
                backendId: acpBackendId,
                conversationId: acpConversationId,
              });
              await deleteActiveAcpConversation({
                backendId: acpBackendId,
                conversationId: acpConversationId,
              });
            }
          } finally {
            try {
              if (ownsAcpBridge) await shutdownAcpWebSocketBridgeService();
              if (acpWorkspaceDir) await removeRuntimePath(acpWorkspaceDir);
            } finally {
              try {
                restoreHostBridgeSynthesisResolver?.();
              } finally {
                if (previousBackendsConfig == null)
                  clearPref("backendsConfigJson");
                else setPref("backendsConfigJson", previousBackendsConfig);
              }
            }
          }
        }
        restoreHostBridgeSynthesisResolver =
          bindTestDefaultSynthesisClient(connectionInfo);
        let searchBursts: Awaited<ReturnType<typeof runSemanticSearchBursts>>;
        let semanticContextReadbacks: Awaited<
          ReturnType<typeof runSemanticContextReadbacks>
        >;
        let libraryItemSearches: Awaited<
          ReturnType<typeof runSerialLibraryItemSearches>
        >;
        try {
          searchBursts = await runSemanticSearchBursts(
            searchRequest,
            items[0],
            publicationRef,
            topicClient,
            () => topicClient!.client.searchSemanticEvidence(searchRequest),
            cliProfilePath,
          );
          semanticContextReadbacks = await runSemanticContextReadbacks(
            semanticContextPassages,
            (evidenceRef) =>
              topicClient!.client.readSemanticContext({ evidenceRef }),
            cliProfilePath,
          );
          const libraryBroker = createZoteroHostCapabilityBroker(undefined, {
            lexicalPort: createNativeSynthesisLibraryLexicalPort({
              getReadyConnection: () => connectionInfo,
            }),
            retrievalPort: createNativeSynthesisLibraryRetrievalPort({
              getReadyConnection: () => connectionInfo,
            }),
          });
          try {
            const bridge = getHostBridgeServerStatus();
            assert.equal(bridge.status, "running");
            await ensureZoteroMcpServer({
              hostBridgeStatus: bridge,
              resolveZoteroHostCapabilityBroker: () => libraryBroker,
            });
            libraryItemSearches = await runSerialLibraryItemSearches({
              mcpEndpoint: bridge.endpoint.replace(/\/bridge\/v2\/?$/, "/mcp"),
              token: getHostBridgeToken(),
              itemRefs: items
                .filter((item) => item.isRegularItem())
                .map((item) => ({ libraryId: item.libraryID, key: item.key })),
            });
            assert.lengthOf(libraryItemSearches.calls, 16);
          } finally {
            await ensureZoteroMcpServer({
              hostBridgeStatus: getHostBridgeServerStatus(),
              resolveZoteroHostCapabilityBroker,
            });
          }
        } finally {
          restoreHostBridgeSynthesisResolver?.();
          restoreHostBridgeSynthesisResolver = undefined;
        }
        const sidecarAfterBursts = await retrieval.getState();
        assert.equal(sidecarAfterBursts.status, "ready");
        assert.equal(
          sidecarAfterBursts.publication,
          currentPublicationBasis.publication,
        );
        assert.equal(
          (await listSidecarDiscoveries()).find(
            ({ discovery }) =>
              discovery.serviceInstanceId ===
              connectionInfo.discovery.serviceInstanceId,
          )?.discovery.lifecycleState,
          "ready",
        );
        const manifestPath = readDiagnosticsEnv(
          "ZOTERO_SYSTEM_E2E_MANIFEST_PATH",
        );
        assert.isNotEmpty(manifestPath);
        let highOffset: number | undefined;
        if (largeAnalysis) {
          const { publication } = await retrieval.explore({
            operation: "browse",
            limit: 1,
          });
          let cursor: string | undefined;
          do {
            const page = await retrieval.explore({
              operation: "fragments",
              publication,
              identity: largeAnalysis.identity,
              ...(cursor ? { cursor } : {}),
              limit: 10,
            });
            assert.isEmpty(page.issues, JSON.stringify(page.issues));
            highOffset = page.rows.find(
              (row) =>
                row.sourceKind === "analysis" &&
                (row.start ?? 0) > SYNTHESIS_EVIDENCE_SOURCE_MAX_UTF16 &&
                row.preview,
            )?.start;
            cursor = page.nextCursor ?? undefined;
          } while (cursor && highOffset === undefined);
          assert.isNumber(highOffset, "verified high-offset analysis preview");
        }
        const publishedScope = await waitUntil(() => {
          const scope = first.querySelector<HTMLElement>(
            '[data-retrieval-scope="published"] .retrieval-maintenance-value',
          )?.textContent;
          return scope &&
            /metadata|元数据/i.test(scope) &&
            /full text|全文/i.test(scope) &&
            /analysis|分析/i.test(scope) &&
            /topic|主题/i.test(scope)
            ? scope
            : null;
        });
        assert.isNotEmpty(publishedScope);
        await (mainWindow as any).Zotero_Tabs.close("zotero-skills-workspace");
        await waitUntil(
          () =>
            !first.querySelector(".retrieval-explorer") ||
            !mainWindow.document.querySelector(
              '[data-zs-role="workspace-frame"]',
            ),
        );
        let doc = await openExplorer();
        const title = "城市道路交通流量预测研究";
        if (!useGold) {
          doc
            .querySelector<HTMLButtonElement>("#retrieval-browse-tab")!
            .click();
          await waitUntilBounded(
            () =>
              Array.from(
                doc.querySelectorAll(".retrieval-item .retrieval-title"),
              ).find((entry) => entry.textContent === title),
            30_000,
            "published-paper-title",
          );
          doc
            .querySelector<HTMLButtonElement>("#retrieval-search-tab")!
            .click();
        }
        const submitQuery = async (query: string) => {
          const search = doc.querySelector<HTMLInputElement>(
            ".retrieval-query input",
          )!;
          search.value = query;
          const event = doc.createEvent("Event");
          event.initEvent("input", true, false);
          search.dispatchEvent(event);
          await Promise.resolve();
          const submit = await waitUntil(() =>
            doc.querySelector<HTMLButtonElement>(
              '.retrieval-tools button[type="submit"]:enabled',
            ),
          );
          const startedAt = Date.now();
          const frame = doc.defaultView!;
          let requestId: number | undefined;
          let settled = false;
          const observe = (event: MessageEvent) => {
            if (event.data?.type !== "synthesis:chrome") return;
            const slot = event.data.payload?.retrievalExplorer?.search;
            if (!slot || JSON.parse(slot.owner).query !== query) return;
            if (slot.status === "loading") requestId = slot.requestId;
            else if (slot.requestId === requestId) settled = true;
          };
          frame.addEventListener("message", observe);
          try {
            submit.click();
            await waitUntilBounded(() => settled, 65_000, "workbench-search-settled");
          } finally {
            frame.removeEventListener("message", observe);
          }
          return startedAt;
        };
        const workbenchSearchTimings: Array<{
          temperature: "cold" | "warm";
          elapsedMs: number;
        }> = [];
        for (const [query, expected, sourceKind] of [
          [title, title, "metadata"],
          [
            "利用卫星影像评估土壤含水量",
            "卫星遥感与土壤水分估算研究",
            "fulltext",
          ],
          ["土壤湿度变化机制", "卫星遥感与土壤水分估算研究", "analysis"],
        ] as const) {
          const startedAt = await submitQuery(query);
          const excerpt = await waitUntilBounded(
            () => {
              const error = doc.querySelector(
                "#retrieval-search-panel [role=alert] code",
              );
              if (error)
                throw new Error("semantic_search_failed: " + error.textContent);
              const patterns = {
                metadata: /metadata|元数据/i,
                fulltext: /full text|全文/i,
                analysis: /analysis|分析/i,
              };
              const rows = Array.from(doc.querySelectorAll(".retrieval-result-row"));
              const row = (liveOllama ? rows : rows.slice(0, 1)).find((entry) => {
                const source = entry.querySelector(".retrieval-source")?.textContent || "";
                return entry.querySelector(".retrieval-title")?.textContent === expected &&
                  (liveOllama ? Object.values(patterns) : [patterns[sourceKind]]).some(pattern => pattern.test(source));
              });
              return row?.querySelector(".retrieval-excerpt")?.textContent;
            },
            65000,
            `verified-semantic-result-${sourceKind}`,
          );
          assert.isNotEmpty(excerpt);
          workbenchSearchTimings.push({
            temperature: workbenchSearchTimings.length ? "warm" : "cold",
            elapsedMs: Date.now() - startedAt,
          });
        }
        const warmStartedAt = await submitQuery("城市道路交通流量预测研究");
        await waitUntilBounded(
          () =>
            doc.querySelector(".retrieval-result-row .retrieval-title")
              ?.textContent === "城市道路交通流量预测研究",
          65_000,
          "warm-workbench-search",
        );
        workbenchSearchTimings.push({
          temperature: "warm",
          elapsedMs: Date.now() - warmStartedAt,
        });
        await writeDiagnosticsText(
          PathUtils.join(
            PathUtils.parent(manifestPath),
            "retrieval-search-bursts.json",
          ),
          JSON.stringify(
            {
              mode: liveOllama ? "live-ollama" : "mock",
              model: connection.modelId,
              serviceInstanceId: connectionInfo.discovery.serviceInstanceId,
              publication: publicationRef.value,
              surfaceBursts: searchBursts,
              acpChat: acpSearchBursts,
              acpContext,
              semanticContext: semanticContextReadbacks,
              libraryItemSearches,
              workbench: workbenchSearchTimings,
              sidecarLifecycle: sidecarAfterBursts.status,
            },
            null,
            2,
          ),
        );
        if (useGold) await submitQuery("台车");
        const paperResult = await waitUntilBounded(
          () => {
            const rows = Array.from(
              doc.querySelectorAll(".retrieval-result-row"),
            );
            const row = useGold
              ? rows.find((entry) =>
                  entry
                    .querySelector(".retrieval-excerpt")
                    ?.textContent?.includes("台车"),
                )
              : rows[0];
            return row?.querySelector<HTMLButtonElement>(".retrieval-title");
          },
          65_000,
          "paper-result-to-open",
        );
        const paperTitle = paperResult.textContent;
        paperResult.click();
        await waitUntilBounded(
          () =>
            mainWindow.ZoteroPane.getSelectedItems().find(
              (item) => item.getField("title") === paperTitle,
            ),
          30_000,
          "paper-source-opened",
        );
        doc = await openExplorer();

        if (!liveOllama) {
          await submitQuery("模拟服务拒绝");
          const diagnostic = await waitUntil(() =>
            doc.querySelector("#retrieval-search-panel [role=alert] code"),
          );
          assert.equal(diagnostic.textContent, "embedding_http_401");
        }

        const target = doc.querySelector<HTMLSelectElement>(
          "#retrieval-search-panel .retrieval-tools select",
        )!;
        target.value = "topic";
        const changed = doc.createEvent("Event");
        changed.initEvent("change", true, false);
        target.dispatchEvent(changed);
        await submitQuery(topic.definition);
        const topicResult = await waitUntilBounded(
          () =>
            Array.from(
              doc.querySelectorAll<HTMLButtonElement>(
                ".retrieval-result-row .retrieval-title",
              ),
            ).find((button) => button.textContent === topic.title),
          65_000,
          "verified-topic-result",
        );
        topicResult.click();
        await waitUntilBounded(
          () =>
            doc
              .querySelector(".topic-detail .overview-summary-hero")
              ?.textContent?.includes(topic.definition)
              ? true
              : null,
          30_000,
          "topic-source-opened",
        );
        if (largeAnalysis) {
          const manifestPath = readDiagnosticsEnv(
            "ZOTERO_SYSTEM_E2E_MANIFEST_PATH",
          );
          assert.isNotEmpty(manifestPath);
          await writeDiagnosticsText(
            PathUtils.join(
              PathUtils.parent(manifestPath),
              "large-analysis-retrieval.json",
            ),
            JSON.stringify(
              {
                zoteroVersion: Zotero.version,
                rebuildMs,
                contentLength: largeAnalysis.contentLength,
                verifiedPreviewStart: highOffset,
                paperOpened: true,
                topicOpened: true,
              },
              null,
              2,
            ),
          );
        }
      } finally {
        if (!liveOllama) {
          if (previousTimeout === undefined) Services.prefs.clearUserPref(networkTimeout);
          else Services.prefs.setIntPref(networkTimeout, previousTimeout);
        }
        for (const [key, value] of oldPrefs) {
          if (value == null) clearPref(key);
          else setPref(key, value);
        }
        preferences?.close();
        try {
          if (topicId)
            await topicClient?.client.topics.deleteTopicArtifact({ topicId });
        } finally {
          await topicClient?.dispose();
          await eraseSyntheticItems(items);
          await fixture.cleanup();
        }
      }
    },
  );

  after(function () {
    if (!contentSettingsChanged) return;
    if (previousChannel === undefined) clearPref("contentFeedChannel");
    else setPref("contentFeedChannel", previousChannel);
    if (previousMirror === undefined) clearPref("contentDevFeedMirrorUrl");
    else setPref("contentDevFeedMirrorUrl", previousMirror);
    setDebugModeOverrideForTests();
  });

  afterEach(async function () {
    const cleanup = cleanupAfterCase;
    cleanupAfterCase = undefined;
    let cleanupError: unknown;
    try {
      await cleanup?.();
    } catch (error) {
      cleanupError = error;
    } finally {
      removeStatusListener?.();
      removeStatusListener = undefined;
      const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
      await Promise.resolve(
        (mainWindow as any)?.Zotero_Tabs?.close?.("zotero-skills-workspace"),
      );
    }
    if (cleanupError) throw cleanupError;
  });

  // prettier-ignore
  systemE2ECase("index-projection-01", undefined, "refreshes the Reference sidecar and preserves Index navigation across large tag windows", async function () {
    if (readDiagnosticsEnv("ZOTERO_E2E_GOLD_ID") === gold.id) {
      const facts = await readGoldLibraryFacts();
      assert.deepEqual(facts.itemTypes, gold.library.itemTypes);
      assert.equal(
        Object.values(facts.itemTypes).reduce((sum, count) => sum + count, 0),
        gold.library.topLevelItems,
      );
      assert.equal(facts.attachments, gold.library.attachments);
      assert.equal(facts.notes, gold.managedArtifacts.notes);
      assert.equal(facts.collections, gold.library.collections);
      assert.equal(facts.tags, gold.library.tags);
    }

    const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
    const plugin = (Zotero as any)[config.addonInstance];
    assert.isFunction(plugin?.hooks?.onPrefsEvent);
    await plugin.hooks.onPrefsEvent("openSynthesisWorkbench", {
      window: mainWindow,
    });
    const workspaceFrame = (await waitUntil(() =>
      mainWindow.document.querySelector<HTMLElement>(
        '[data-zs-role="workspace-frame"]',
      ),
    )) as WorkbenchFrame;
    const frame = (await waitUntil(() =>
      workspaceFrame.contentDocument?.querySelector<HTMLElement>(
        '[data-zs-role="synthesis-workbench-frame"]',
      ),
    )) as WorkbenchFrame;
    const doc = await waitUntil(() => {
      const candidate = frame.contentDocument;
      return candidate?.querySelector('button[data-synthesis-tab="registry"]')
        ? candidate
        : null;
    });
    const frameWindow = doc.defaultView;
    assert.isOk(frameWindow);
    let sidecarStatus: SynthesisWorkbenchSidecarStatus | undefined;
    const onHostMessage = (event: MessageEvent) => {
      if (["synthesis:init", "synthesis:snapshot", "synthesis:chrome"].includes(event.data?.type)) {
        sidecarStatus = event.data.payload?.sidecarStatus;
      }
    };
    frameWindow.addEventListener("message", onHostMessage);
    removeStatusListener = () => frameWindow.removeEventListener("message", onHostMessage);
    const readSidecarStatus = () => sidecarStatus;
    const clickTab = async (tab: string) => {
      const button = await waitUntil(() =>
        doc.querySelector<HTMLButtonElement>(
          `button[data-synthesis-tab="${tab}"]`,
        ),
      );
      button.click();
      await waitUntil(() =>
        doc.querySelector<HTMLButtonElement>(
          `button[data-synthesis-tab="${tab}"].active`,
        ),
      );
    };
    await clickTab("registry");

    const sidecar = await connectNativeSidecar(readSidecarStatus);
    const composition = sidecar.composition;
    const ownedItems: Zotero.Item[] = [];
    const tagFixture = createSyntheticTagFixture();
    cleanupAfterCase = async () => {
      let firstError: unknown;
      try {
        await cleanupSyntheticTags(composition, tagFixture);
      } catch (error) {
        firstError = error;
      }
      try {
        await eraseSyntheticItems(ownedItems);
      } catch (error) {
        firstError ||= error;
      }
      try {
        await composition.dispose();
      } catch (error) {
        firstError ||= error;
      }
      if (firstError) throw firstError;
    };

    await createSyntheticIndexParents(ownedItems);
    await seedSyntheticTags(composition, tagFixture);
    // The sidecar re-reads Host facts asynchronously after a mutation.
    await Zotero.Promise.delay(HOST_FACTS_SETTLE_MS);

    const refreshButton = await waitUntil(() =>
      doc.querySelector<HTMLButtonElement>(
        'button[data-synthesis-command="refreshReferenceSidecarNow"]',
      ),
    );
    refreshButton.click();
    await waitUntil(() => refreshButton.getAttribute("aria-busy") === "true");
    await waitUntil(() => {
      const error = doc.querySelector<HTMLElement>(
        '[data-synthesis-error-code="payload_stale"]',
      );
      if (error) throw new Error("reference_refresh_payload_stale");
      const status = doc
        ?.querySelector<HTMLElement>("[data-synthesis-reference-cache-status]")
        ?.getAttribute("data-synthesis-reference-cache-status");
      return refreshButton.getAttribute("aria-busy") !== "true" &&
        status === "ready"
        ? true
        : null;
    });

    assert.isOk(
      doc.querySelector(
        '[data-region-content="synthesis-registry"]',
      ),
    );
    if (readDiagnosticsEnv("ZOTERO_E2E_GOLD_ID") === gold.id) {
      assert.isOk(
        doc.querySelector(".registry-table tbody tr"),
      );
    }

    const initialState = createDefaultSynthesisUiState();
    const firstPage = await composition.client.workbench.readSurface({
      surface: "index",
      state: toSynthesisWorkbenchReadState(initialState, {
        indexCursor: "",
        indexLimit: INDEX_PAGE_LIMIT,
      }),
    });
    assert.equal(firstPage.registry.page?.limit, INDEX_PAGE_LIMIT);
    assert.lengthOf(firstPage.registry.rows, INDEX_PAGE_LIMIT);
    const firstPageRefs = firstPage.registry.rows.map((row) => row.paper_ref);
    const nextCursor = firstPage.registry.page?.nextCursor;
    assert.isNotEmpty(nextCursor);
    const secondPage = await composition.client.workbench.readSurface({
      surface: "index",
      state: toSynthesisWorkbenchReadState(initialState, {
        indexCursor: nextCursor,
        indexExpectedBasis: firstPage.registry.page?.basis,
        indexLimit: INDEX_PAGE_LIMIT,
      }),
    });
    assert.isAtMost(secondPage.registry.rows.length, INDEX_PAGE_LIMIT);
    assert.isNotEmpty(secondPage.registry.rows);
    assert.isTrue(
      secondPage.registry.rows.every(
        (row) => !firstPageRefs.includes(row.paper_ref),
      ),
    );
    const initialHealth = await observeNativeSidecarHealth(readSidecarStatus);
    const pagination = () =>
      doc.querySelector<HTMLElement>(".registry-index-pagination");
    const totalPages = () => {
      const footer = pagination();
      const label = footer?.querySelector(".registry-index-page-control");
      const spans = Array.from(label?.querySelectorAll("span") || []);
      const total = Number(spans[spans.length - 1]?.textContent);
      return Number.isInteger(total) ? total : null;
    };
    const waitForIndexPage = (expected: number) =>
      waitUntil(() => {
        const footer = pagination();
        const rows = doc.querySelectorAll(".registry-parent-row");
        if (
          Number(footer?.dataset.indexWindow) !== expected ||
          !rows.length ||
          footer?.querySelector(".registry-page-loading")
        ) {
          return null;
        }
        return footer;
      }, 30_000);
    const pageRefs = () =>
      Array.from(
        doc.querySelectorAll<HTMLElement>(".registry-parent-row"),
        (row) => row.dataset.windowedRowKey || "",
      ).filter(Boolean);
    const pageButton = (direction: string) =>
      pagination()?.querySelector<HTMLButtonElement>(
        `[data-index-direction="${direction}"]`,
      );
    const goToPage = async (page: number) => {
      const input = pagination()?.querySelector<HTMLInputElement>(
        "[data-index-page]",
      );
      assert.isOk(input);
      input.value = String(page);
      input.dispatchEvent(new frameWindow.Event("input", { bubbles: true }));
      input.dispatchEvent(
        new frameWindow.KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
        }),
      );
      return waitForIndexPage(page);
    };

    await waitForIndexPage(1);
    assert.isAtMost(doc.querySelectorAll(".registry-parent-row").length, 100);
    const firstWindowRefs = pageRefs().join("|");
    const next = pageButton("next");
    assert.isOk(next);
    assert.isFalse(next.disabled);
    next.click();
    await waitForIndexPage(2);
    assert.notEqual(pageRefs().join("|"), firstWindowRefs);

    pageButton("first")!.click();
    await waitForIndexPage(1);
    const pages = await waitUntil(() => {
      const total = totalPages();
      const lastPageButton = pageButton("last");
      return total && lastPageButton && !lastPageButton.disabled
        ? total
        : null;
    }, 30_000);
    assert.isAtLeast(pages, 2);
    const last = pageButton("last");
    assert.isOk(last);
    assert.isFalse(last.disabled);
    last.click();
    await waitForIndexPage(pages);
    assert.isTrue(pageButton("last")?.disabled);

    const first = pageButton("first");
    assert.isOk(first);
    assert.isFalse(first.disabled);
    first.click();
    await waitForIndexPage(1);
    assert.isTrue(pageButton("first")?.disabled);
    await goToPage(2);
    assert.equal(pagination()?.dataset.indexWindow, "2");

    const indexScrollRegion = await waitUntil(() =>
      doc.querySelector<HTMLElement>(
        '[data-synthesis-scroll-key="registry.table"]',
      ),
    );
    indexScrollRegion.scrollTop = 0;
    indexScrollRegion.dispatchEvent(
      new frameWindow.Event("scroll", { bubbles: true }),
    );
    const retentionRow = await waitUntil(() =>
      Array.from(doc.querySelectorAll<HTMLElement>(".registry-parent-row"))
        .find((row) => row.querySelector(".registry-reference-disclosure")),
    );
    const retentionRef = retentionRow.dataset.windowedRowKey;
    assert.isNotEmpty(retentionRef);
    const disclosure = retentionRow.querySelector<HTMLButtonElement>(".registry-reference-disclosure");
    assert.isOk(disclosure);
    disclosure.focus();
    disclosure.click();
    await waitUntil(() => {
      const row = doc.querySelector<HTMLElement>(
        `[data-windowed-row-key="${retentionRef}"]`,
      );
      return row
        ?.querySelector(".registry-reference-disclosure")
        ?.getAttribute("aria-expanded") === "true" &&
        row.nextElementSibling?.classList.contains("registry-reference-row")
        ? true
        : null;
    });
    indexScrollRegion.scrollTop = Math.min(
      indexScrollRegion.scrollHeight - indexScrollRegion.clientHeight,
      Math.max(600, disclosure.offsetTop),
    );
    indexScrollRegion.dispatchEvent(
      new frameWindow.Event("scroll", { bubbles: true }),
    );
    await waitUntil(() => (indexScrollRegion.scrollTop > 0 ? true : null));
    const retainedIndexTable = indexScrollRegion.querySelector(
      ".registry-table",
    );
    const retainedScrollTop = indexScrollRegion.scrollTop;
    const retainedPage = Number(pagination()?.dataset.indexWindow);
    assert.isOk(retainedIndexTable);
    assert.isAbove(retainedScrollTop, 0);

    const stagedTags = await composition.client.tags.listStagedTagSuggestions();
    assert.isAtLeast(stagedTags.length, LARGE_TAG_COUNT);
    await clickTab("tags");
    const stagedButton = await waitUntil(() =>
      doc.querySelectorAll<HTMLButtonElement>(".tags-view-switch button")[1],
    );
    stagedButton.click();
    await waitUntil(() =>
      doc.querySelector(".tags-staged-table [data-windowed-row-key]")
        ? true
        : null,
    );
    const scrollStagedToEnd = async () => {
      const region = await waitUntil(() =>
        doc.querySelector<HTMLElement>(".tags-staged-table"),
      );
      await waitUntil(() =>
        (region.scrollHeight > region.clientHeight ? true : null),
      );
      region.scrollTop = 0;
      region.dispatchEvent(new frameWindow.Event("scroll", { bubbles: true }));
      await new Promise<void>((resolve) => {
        frameWindow.requestAnimationFrame(() =>
          frameWindow.requestAnimationFrame(() => resolve()),
        );
      });
      const before = Array.from(
        region.querySelectorAll("[data-windowed-row-key]"),
        (row) => row.getAttribute("data-windowed-row-key"),
      ).join("|");
      region.scrollTop = region.scrollHeight;
      region.dispatchEvent(new frameWindow.Event("scroll", { bubbles: true }));
      return waitUntil(() => {
        const rows = region.querySelectorAll("[data-windowed-row-key]");
        const after = Array.from(
          rows,
          (row) => row.getAttribute("data-windowed-row-key"),
        ).join("|");
        return region.scrollTop > 0 &&
          rows.length > 0 &&
          rows.length <= MAX_MOUNTED_TAG_ROWS &&
          after !== before
          ? rows.length
          : null;
      }, 10_000);
    };
    assert.isAtMost(await scrollStagedToEnd(), MAX_MOUNTED_TAG_ROWS);

    await clickTab("reviews");
    await waitUntil(() =>
      doc.querySelector('[data-synthesis-surface="reference-review-table"]'),
      30_000,
    );
    await clickTab("overview");
    await waitUntil(() =>
      doc.querySelector('[data-region-content="synthesis-home"]'),
      30_000,
    );
    await clickTab("tags");
    await waitUntil(() =>
      doc.querySelector(".tags-view-switch.is-staged")
        ? true
        : null,
    );
    assert.isAtMost(await scrollStagedToEnd(), MAX_MOUNTED_TAG_ROWS);

    await clickTab("registry");
    await waitForIndexPage(retainedPage);
    const restoredScrollRegion = doc.querySelector<HTMLElement>(
      '[data-synthesis-scroll-key="registry.table"]',
    );
    assert.strictEqual(restoredScrollRegion, indexScrollRegion);
    assert.strictEqual(
      restoredScrollRegion?.querySelector(".registry-table"),
      retainedIndexTable,
    );
    assert.equal(Number(pagination()?.dataset.indexWindow), retainedPage);
    assert.closeTo(restoredScrollRegion!.scrollTop, retainedScrollTop, 1);
    assert.equal(
      doc
        .querySelector<HTMLElement>(
          `[data-windowed-row-key="${retentionRef}"]`,
        )
        ?.querySelector(".registry-reference-disclosure")
        ?.getAttribute("aria-expanded"),
      "true",
    );

    const firstAutomaticHealth = await waitForAutomaticHealthAfter(
      readSidecarStatus,
      initialHealth.healthObservedAt,
      initialHealth.serviceInstanceId,
    );
    const secondAutomaticHealth = await waitForAutomaticHealthAfter(
      readSidecarStatus,
      firstAutomaticHealth.healthObservedAt,
      initialHealth.serviceInstanceId,
    );
    assert.equal(
      firstAutomaticHealth.discovery.discovery.pid,
      initialHealth.discovery.discovery.pid,
    );
    assert.equal(
      secondAutomaticHealth.discovery.discovery.pid,
      initialHealth.discovery.discovery.pid,
    );
    assert.equal(
      firstAutomaticHealth.serviceInstanceId,
      secondAutomaticHealth.serviceInstanceId,
    );
    assert.isNull(
      doc.querySelector('[data-synthesis-error-code="invalid_request"]'),
    );
    const manifestPath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_MANIFEST_PATH");
    assert.isNotEmpty(manifestPath);
    await writeDiagnosticsText(
      PathUtils.join(PathUtils.parent(manifestPath), "index-navigation-health.json"),
      JSON.stringify({
        zoteroVersion: Zotero.version,
        contentVersion: readDiagnosticsEnv("ZOTERO_TEST_CONTENT_VERSION"),
        health: [initialHealth, firstAutomaticHealth, secondAutomaticHealth].map(
          (sample) => ({
            pid: sample.discovery.discovery.pid,
            serviceInstanceId: sample.serviceInstanceId,
            observedAt: sample.healthObservedAt,
          }),
        ),
      }, null, 2),
    );
  });

  systemE2ECase(
    "mineru-path-budget-01",
    undefined,
    "MinerU Windows path budgets preserve old outputs before unsafe backup",
    async function () {
      if (!Zotero.isWin) this.skip();
      const root = PathUtils.join(
        PathUtils.tempDir,
        `zm-${Date.now().toString(36)}`,
      );
      await ensureRuntimeDirectoryExclusive(root);
      const parent = new Zotero.Item("journalArticle");
      try {
        await parent.saveTx();
        const bundle = PathUtils.join(root, "b");
        await IOUtils.makeDirectory(bundle);
        const stem = "m".repeat(259 - root.length - 1 - ".pdf".length);
        const pdfPath = PathUtils.join(root, `${stem}.pdf`);
        const mdPath = PathUtils.join(root, `${stem}.md`);
        assert.lengthOf(pdfPath, 259);
        assert.lengthOf(mdPath, 258);
        await writeRuntimeTextFile(
          pdfPath,
          "%PDF-1.4\nsynthetic path fixture\n",
        );
        await writeRuntimeTextFile(mdPath, "old markdown\n");
        const source = await Zotero.Attachments.linkFromFile({
          file: pdfPath,
          parentItemID: parent.id,
          title: "Synthetic source",
        });
        const output = await Zotero.Attachments.linkFromFile({
          file: mdPath,
          parentItemID: parent.id,
          title: "Synthetic Markdown",
        });
        const images = PathUtils.join(root, `Images_${source.key}`);
        await IOUtils.makeDirectory(images);
        await writeRuntimeTextFile(
          PathUtils.join(images, "old.png"),
          "old image",
        );
        await writeRuntimeTextFile(
          PathUtils.join(bundle, "full.md"),
          "new markdown\n",
        );
        const status = await getContentPackageStatus();
        const loaded = await loadWorkflowManifests(status.officialWorkflowDir);
        const workflow = loaded.workflows.find(
          (entry) => entry.manifest.id === "mineru",
        );
        assert.isOk(workflow, loaded.errors.join(" | "));
        const sourceRef = { libraryId: source.libraryID, key: source.key };
        const apply = () =>
          executeApplyResult({
            workflow: workflow!,
            parent: { libraryId: parent.libraryID, key: parent.key },
            bundleReader: {
              readText: async () => "",
              getExtractedDir: async () => bundle,
            },
            request: {
              sourceAttachmentRefs: [sourceRef],
              context: {
                source_attachment_path: pdfPath,
                source_attachment_name: source.getField("title"),
                source_attachment_ref: sourceRef,
              },
            },
            runResult: {},
            runtime: { hostApi: createWorkflowHostApi() },
          });
        await apply();
        const acceptedMarkdown = await IOUtils.readUTF8(mdPath);
        assert.include(acceptedMarkdown, "new markdown");
        assert.equal(await output.getFilePathAsync(), mdPath);
        assert.equal(
          await IOUtils.readUTF8(pdfPath),
          "%PDF-1.4\nsynthetic path fixture\n",
        );

        await IOUtils.makeDirectory(images, { ignoreExisting: true });
        const oldImage = PathUtils.join(
          images,
          `${"i".repeat(259 - images.length - 1 - 4)}.png`,
        );
        assert.lengthOf(oldImage, 259);
        await writeRuntimeTextFile(oldImage, "protected old image");
        const attachmentIds = parent.getAttachments();
        await writeRuntimeTextFile(
          PathUtils.join(bundle, "full.md"),
          "must not replace accepted output\n",
        );
        let failure: unknown;
        try {
          await apply();
        } catch (error) {
          failure = error;
        }
        assert.isOk(failure);
        assert.match(String(failure), /path budget/i);
        assert.equal(await IOUtils.readUTF8(mdPath), acceptedMarkdown);
        assert.equal(await IOUtils.readUTF8(oldImage), "protected old image");
        assert.equal(
          await IOUtils.readUTF8(pdfPath),
          "%PDF-1.4\nsynthetic path fixture\n",
        );
        assert.deepEqual(parent.getAttachments(), attachmentIds);
        assert.isFalse(
          (await IOUtils.getChildren(root)).some((entry) =>
            PathUtils.filename(entry).startsWith(".mineru-"),
          ),
        );
      } finally {
        if (parent.id) await Zotero.Items.trashTx([parent.id]);
        await IOUtils.remove(root, { recursive: true });
      }
    },
    "platform_unsupported",
  );
});
