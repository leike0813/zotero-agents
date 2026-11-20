import { assert } from "chai";
import { config } from "../../../../package.json";
import {
  listSidecarDiscoveries,
  readSystemE2ESidecarConnection,
  waitUntil as waitUntilBounded,
} from "../../../../scripts/system-e2e/healthGate";
import { createNativeSynthesisClientComposition } from "../../../../src/modules/synthesisClient/nativeComposition";
import { createDefaultSynthesisUiState } from "../../../../src/modules/synthesis/uiModel";
import { toSynthesisWorkbenchReadState } from "../../../../src/modules/synthesisClient/workbenchUiAdapter";
import type { SynthesisWorkbenchSidecarStatus } from "../../../../src/shared/synthesisWorkbenchWireContract";
import { renderPayloadBlock } from "../../../../src/modules/zoteroHost/notePayloadCodec";
import {
  getConfiguredContentFeedUrls,
  getContentPackageStatus,
  installContentPackageFromFeed,
} from "../../../../src/modules/workflow/catalog/contentPackageSubscription";
import { clearPref, getPref, setPref } from "../../../../src/utils/prefs";
import { setDebugModeOverrideForTests } from "../../../../src/modules/debugMode";
import {
  saveSynthesisEmbeddingPrefs,
  testSynthesisEmbeddingConnection,
} from "../../../../src/modules/synthesis/synthesisEmbeddingPrefs";

import {
  ensureRuntimeDirectoryExclusive,
  reserveRuntimeTemporaryDirectory,
  writeRuntimeTextFile,
} from "../../../../src/modules/runtimePersistence";
import { createWorkflowHostApi } from "../../../../src/workflows/hostApi";
import { loadWorkflowManifests } from "../../../../src/workflows/loader";
import { executeApplyResult } from "../../../../src/workflows/runtime";
import gold from "../../../fixtures/zotero-e2e/lisongtao-v1.json";
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
      const embeddingEndpoint = readDiagnosticsEnv(
        "ZOTERO_SYSTEM_E2E_EVENT_URL",
      ).replace(/\/events$/, "/embeddings");
      assert.match(
        embeddingEndpoint,
        /^http:\/\/127\.0\.0\.1:\d+\/embeddings$/,
      );
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
        modelId: "zotero-e2e-fixture",
        dimensions: 3,
        queryPrefix: "",
        documentPrefix: "",
        discovery: { protocol: "none" as const },
        auth: { type: "none" as const },
      };
      const items: Zotero.Item[] = [];
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
      try {
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
              `<div data-zs-note-kind="digest">${renderPayloadBlock({
                payloadType: "digest-markdown",
                payload: "# 分析内容\n\n分析来源检索标记：土壤湿度变化机制。",
                payloadFormat: "text",
              })}</div>`,
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
        first
          .querySelector<HTMLElement>(".retrieval-settings summary")!
          .click();
        await waitUntil(() => {
          const scope = first.querySelector<HTMLElement>(
            '[data-retrieval-scope="planned"] .retrieval-maintenance-value',
          )?.textContent;
          return scope &&
            /metadata|元数据/i.test(scope) &&
            /full text|全文/i.test(scope) &&
            /analysis|分析/i.test(scope) &&
            /topic|主题/i.test(scope)
            ? scope
            : null;
        });
        const build = await waitUntil(() =>
          first.querySelector<HTMLButtonElement>(
            '[data-synthesis-command="retrievalBuildIndex"]:enabled',
          ),
        );
        build.click();
        await waitUntilBounded(
          () =>
            first.querySelector(
              '[data-synthesis-command="retrievalUpdateIndex"]:enabled',
            ),
          120000,
          "index-publication",
        );
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
        const doc = await openExplorer();
        doc.querySelector<HTMLButtonElement>("#retrieval-browse-tab")!.click();
        const title = await waitUntilBounded(
          () =>
            Array.from(doc.querySelectorAll(".retrieval-item .retrieval-title"))
              .map((entry) => entry.textContent)
              .find((value) => value === "城市道路交通流量预测研究"),
          30000,
          "published-paper-title",
        );
        doc.querySelector<HTMLButtonElement>("#retrieval-search-tab")!.click();
        const search = doc.querySelector<HTMLInputElement>(
          ".retrieval-query input",
        )!;
        const submitQuery = async (query: string) => {
          search.value = query;
          const event = doc.createEvent("Event");
          event.initEvent("input", true, false);
          search.dispatchEvent(event);
          const submit = await waitUntil(() =>
            doc.querySelector<HTMLButtonElement>(
              '.retrieval-tools button[type="submit"]:enabled',
            ),
          );
          submit.click();
        };
        for (const [query, expected, sourceKind] of [
          [title, title, "metadata"],
          [
            "利用卫星影像评估土壤含水量",
            "卫星遥感与土壤水分估算研究",
            "fulltext",
          ],
          ["土壤湿度变化机制", "卫星遥感与土壤水分估算研究", "analysis"],
        ] as const) {
          await submitQuery(query);
          const excerpt = await waitUntilBounded(
            () => {
              const error = doc.querySelector(
                "#retrieval-search-panel [role=alert] code",
              );
              if (error)
                throw new Error("semantic_search_failed: " + error.textContent);
              const row = doc.querySelector(".retrieval-result-row");
              const source =
                row?.querySelector(".retrieval-source")?.textContent || "";
              const sourcePattern = {
                metadata: /metadata|元数据/i,
                fulltext: /full text|全文/i,
                analysis: /analysis|分析/i,
              }[sourceKind];
              return row?.querySelector(".retrieval-title")?.textContent ===
                expected && sourcePattern.test(source)
                ? row.querySelector(".retrieval-excerpt")?.textContent
                : null;
            },
            65000,
            "verified-semantic-result",
          );
          assert.isNotEmpty(excerpt);
        }
        await submitQuery("模拟服务拒绝");
        const diagnostic = await waitUntil(() =>
          doc.querySelector("#retrieval-search-panel [role=alert] code"),
        );
        assert.equal(diagnostic.textContent, "embedding_http_401");
      } finally {
        for (const [key, value] of oldPrefs) {
          if (value == null) clearPref(key);
          else setPref(key, value);
        }
        preferences?.close();
        await eraseSyntheticItems(items);
        await fixture.cleanup();
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
