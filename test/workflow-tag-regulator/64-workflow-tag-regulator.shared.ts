import { assert } from "chai";
import { config } from "../../package.json";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { measureAsyncTestPerformanceSpan } from "../../src/modules/testPerformanceProbeBridge";
import { installWorkflowEditorSessionOverrideForTests } from "../../src/modules/workflowEditorHost";
import { syncBuiltinWorkflowsOnStartup } from "../../src/modules/builtinWorkflowSync";
import type { RuntimeLogEntry } from "../../src/modules/runtimeLogManager";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { createHookHelpers } from "../../src/workflows/helpers";
import {
  createWorkflowHostApi,
  WORKFLOW_HOST_API_VERSION,
} from "../../src/workflows/hostApi";
import { resetRuntimeBridgeOverrideForTests } from "../../src/utils/runtimeBridge";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import { __tagRegulatorApplyResultTestOnly } from "../../workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs";
import { __tagRegulatorBuildRequestTestOnly } from "../../workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs";
import { attachWorkbenchPayloadToNote } from "../../workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs";
import {
  installWorkflowFetchMockAcrossRuntimes,
  installTagVocabularyHostApiGlobals,
  installTagVocabularySyncCapture,
} from "../workflow-tag-vocabulary/hostApiTestUtils";
import {
  existsPath,
  isZoteroRuntime,
  readUtf8,
  workflowsPath,
} from "../zotero/workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";
import {
  flushSaveTxLoadProbeReport,
  isTagRegulatorSaveTxLoadProbeEnabled,
  recordSaveTxLoadProbeResult,
  runSaveTxLoadWarmup,
} from "./tagRegulatorSaveTxLoadProbe";

const itNodeOnly = isZoteroRuntime() ? it.skip : it;
const itZoteroFullOrNode =
  isZoteroRuntime() && !isFullTestMode() ? it.skip : it;

type PersistedTagEntry = {
  tag: string;
  facet: string;
  source: string;
  note: string;
  deprecated: boolean;
  parentBindings?: number[];
  publishState?: string;
};

type PersistedVocabularyState = {
  corrupted: boolean;
  entries: PersistedTagEntry[];
};

type TagRegulatorRequest = {
  kind: string;
  skill_id: string;
  targetParentID?: number;
  runtime_options?: {
    execution_mode?: string;
  };
  input?: {
    metadata?: {
      id?: number;
      key?: string;
      title?: string;
      itemType?: string;
      libraryID?: number;
    };
    input_tags?: string[];
    valid_tags?: string;
    digest_markdown?: string;
  };
  parameter?: {
    infer_tag?: boolean;
    valid_tags_format?: string;
    tag_note_language?: string;
  };
  upload_files?: Array<{
    key: string;
    path: string;
  }>;
};

type SuggestTagEntry = {
  tag: string;
  note: string;
  parentCount?: number;
};

type SuggestTagsDialogOpenArgs = {
  rendererId?: string;
  title?: string;
  layout?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    padding?: number;
  };
  initialState?: {
    suggestTagEntries?: SuggestTagEntry[];
    rowErrors?: Record<string, string>;
    addedDirect?: string[];
    staged?: string[];
    rejected?: string[];
    invalid?: Array<{ tag: string; reason?: string }>;
    skippedDirect?: string[];
    stagedSkipped?: string[];
    countdownSeconds?: number;
    timedOut?: boolean;
    closePolicyApplied?: boolean;
  };
  actions?: Array<{ id?: string; label?: string }>;
  closeActionId?: string;
  autoClose?: {
    afterMs?: number;
    actionId?: string;
  };
};

type SuggestTagsDialogOpenResult = {
  saved: boolean;
  actionId?: string;
  result?: unknown;
  reason?: string;
};

type RuntimeWithEditorBridge = typeof globalThis & {
  __zsWorkflowEditorHostOpen?: (
    args: SuggestTagsDialogOpenArgs,
  ) => Promise<SuggestTagsDialogOpenResult> | SuggestTagsDialogOpenResult;
  addon?: {
    data?: {
      workflowEditorHost?: {
        open?: (
          args: SuggestTagsDialogOpenArgs,
        ) => Promise<SuggestTagsDialogOpenResult> | SuggestTagsDialogOpenResult;
      };
    };
  };
};

class FakeHtmlDocument {
  createElementNS(_ns: string, tagName: string) {
    return new FakeHtmlElement(tagName.toLowerCase());
  }
}

type FakeListener = (event: {
  type: string;
  target: FakeHtmlElement;
  stopPropagation: () => void;
}) => void;

class FakeHtmlElement {
  public style: Record<string, string> = {};

  public children: FakeHtmlElement[] = [];

  public parentNode: FakeHtmlElement | null = null;

  public textContent = "";

  public type = "";

  public value = "";

  public checked = false;

  private listeners = new Map<string, FakeListener[]>();

  private attrs = new Map<string, string>();

  constructor(public readonly tagName: string) {}

  get firstChild() {
    return this.children[0] || null;
  }

  appendChild(child: FakeHtmlElement) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: FakeHtmlElement) {
    this.children = this.children.filter((entry) => entry !== child);
    child.parentNode = null;
    return child;
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(String(name || ""), String(value || ""));
  }

  getAttribute(name: string) {
    return this.attrs.get(String(name || "")) || null;
  }

  addEventListener(type: string, listener: FakeListener) {
    const existing = this.listeners.get(type) || [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }
}

function walkTree(root: FakeHtmlElement) {
  const nodes: FakeHtmlElement[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.shift()!;
    nodes.push(node);
    for (const child of node.children) {
      stack.push(child);
    }
  }
  return nodes;
}

function findNodeByRole(root: FakeHtmlElement, role: string) {
  return (
    walkTree(root).find((node) => node.getAttribute("data-zs-role") === role) ||
    null
  );
}

function findNodeByRoleAndRow(
  root: FakeHtmlElement,
  role: string,
  rowIndex: number,
) {
  return (
    walkTree(root).find(
      (node) =>
        node.getAttribute("data-zs-role") === role &&
        node.getAttribute("data-zs-row-index") === String(rowIndex),
    ) || null
  );
}

const TAG_VOCAB_PREF_KEY = `${config.prefsPrefix}.tagVocabularyJson`;
const TAG_VOCAB_LOCAL_PREF_KEY = `${config.prefsPrefix}.tagVocabularyLocalCommittedJson`;
const TAG_VOCAB_STAGED_PREF_KEY = `${config.prefsPrefix}.tagVocabularyStagedJson`;
const TAG_VOCAB_REMOTE_PREF_KEY = `${config.prefsPrefix}.tagVocabularyRemoteCommittedJson`;
const WORKFLOW_SETTINGS_PREF_KEY = `${config.prefsPrefix}.workflowSettingsJson`;
const WORKBENCH_EMBEDDED_PAYLOAD_MARKER = "ZS_WORKBENCH_NOTE_PAYLOAD_V1:";

let synthesisVocabularyEntries: PersistedTagEntry[] = [];
let synthesisStagedEntries: PersistedTagEntry[] = [];

function clonePersistedTagEntry(entry: PersistedTagEntry): PersistedTagEntry {
  return {
    ...entry,
    parentBindings: Array.isArray(entry.parentBindings)
      ? [...entry.parentBindings]
      : undefined,
  };
}

function normalizePersistedTagEntry(entry: Partial<PersistedTagEntry>) {
  const tag = String(entry.tag || "").trim();
  const facet =
    String(entry.facet || "")
      .trim()
      .toLowerCase() ||
    String(tag.split(":")[0] || "topic")
      .trim()
      .toLowerCase();
  return {
    tag,
    facet,
    source: String(entry.source || "manual").trim() || "manual",
    note: String(entry.note || "").trim(),
    deprecated: Boolean(entry.deprecated),
    parentBindings: Array.isArray(entry.parentBindings)
      ? [...entry.parentBindings]
      : undefined,
    publishState: String(entry.publishState || "").trim(),
  };
}

function toPersistedVocabularyState(
  entries: PersistedTagEntry[],
): PersistedVocabularyState {
  return {
    corrupted: false,
    entries: entries.map(clonePersistedTagEntry),
  };
}

function installSynthesisTagVocabularyHostApiGlobals() {
  const baseHostApi = createWorkflowHostApi();
  return installTagVocabularyHostApiGlobals({
    hostApi: {
      ...baseHostApi,
      synthesis: {
        ...(baseHostApi as any).synthesis,
        async loadTagVocabulary() {
          return {
            protocol: {
              schema_version: 1,
            },
            aliases: {},
            abbrev: {},
            entries: synthesisVocabularyEntries.map(clonePersistedTagEntry),
          };
        },
        async saveTagVocabulary(args: { entries?: PersistedTagEntry[] }) {
          synthesisVocabularyEntries = (
            Array.isArray(args?.entries) ? args.entries : []
          )
            .map(normalizePersistedTagEntry)
            .filter((entry) => entry.tag);
          return {
            entries: synthesisVocabularyEntries.map(clonePersistedTagEntry),
          };
        },
        async exportTagVocabularyForRegulator() {
          return {
            entries: synthesisVocabularyEntries
              .filter((entry) => !entry.deprecated)
              .map(clonePersistedTagEntry),
          };
        },
        async listStagedTagSuggestions() {
          return synthesisStagedEntries.map((entry) => ({
            tag: entry.tag,
            facet: entry.facet,
            note: entry.note,
            source_flow: entry.source || "tag-regulator-suggest",
            parent_bindings: Array.isArray(entry.parentBindings)
              ? [...entry.parentBindings]
              : [],
          }));
        },
        async stageTagSuggestions(args: { entries?: PersistedTagEntry[] }) {
          for (const incoming of Array.isArray(args?.entries)
            ? args.entries
            : []) {
            const normalized = normalizePersistedTagEntry({
              ...incoming,
              source: String(
                (incoming as any).source_flow ||
                  incoming.source ||
                  "tag-regulator-suggest",
              ),
              parentBindings: Array.isArray((incoming as any).parent_bindings)
                ? (incoming as any).parent_bindings
                : incoming.parentBindings,
            });
            const existingIndex = synthesisStagedEntries.findIndex(
              (entry) =>
                entry.tag.toLowerCase() === normalized.tag.toLowerCase(),
            );
            if (existingIndex >= 0) {
              const existing = synthesisStagedEntries[existingIndex];
              synthesisStagedEntries[existingIndex] = {
                ...existing,
                ...normalized,
                parentBindings: Array.from(
                  new Set([
                    ...(existing.parentBindings || []),
                    ...(normalized.parentBindings || []),
                  ]),
                ).sort((left, right) => left - right),
              };
            } else if (normalized.tag) {
              synthesisStagedEntries.push(normalized);
            }
          }
          return {
            entries: synthesisStagedEntries.map(clonePersistedTagEntry),
          };
        },
        async discardStagedTagSuggestions(args?: { tags?: string[] }) {
          const tags = new Set(
            (Array.isArray(args?.tags) ? args!.tags : [])
              .map((tag) =>
                String(tag || "")
                  .trim()
                  .toLowerCase(),
              )
              .filter(Boolean),
          );
          synthesisStagedEntries = synthesisStagedEntries.filter(
            (entry) => !tags.has(entry.tag.toLowerCase()),
          );
          return {
            removed: tags.size,
          };
        },
        async clearStagedTagSuggestions() {
          synthesisStagedEntries = [];
          return {
            removed: true,
          };
        },
      },
    },
  });
}

function clearTagVocabularyState() {
  synthesisVocabularyEntries = [];
  synthesisStagedEntries = [];
  Zotero.Prefs.clear(TAG_VOCAB_PREF_KEY, true);
  Zotero.Prefs.clear(TAG_VOCAB_LOCAL_PREF_KEY, true);
  Zotero.Prefs.clear(TAG_VOCAB_STAGED_PREF_KEY, true);
  Zotero.Prefs.clear(TAG_VOCAB_REMOTE_PREF_KEY, true);
  Zotero.Prefs.clear(WORKFLOW_SETTINGS_PREF_KEY, true);
}

function saveTagVocabularyState(entries: PersistedTagEntry[]) {
  const payload = JSON.stringify({
    version: 1,
    entries,
  });
  Zotero.Prefs.set(TAG_VOCAB_PREF_KEY, payload, true);
  Zotero.Prefs.set(TAG_VOCAB_LOCAL_PREF_KEY, payload, true);
  synthesisVocabularyEntries = entries
    .map(normalizePersistedTagEntry)
    .filter((entry) => entry.tag);
}

function saveStagedTagVocabularyState(entries: PersistedTagEntry[]) {
  const payload = JSON.stringify({
    version: 1,
    entries,
  });
  Zotero.Prefs.set(TAG_VOCAB_STAGED_PREF_KEY, payload, true);
  synthesisStagedEntries = entries
    .map(normalizePersistedTagEntry)
    .filter((entry) => entry.tag);
}

function buildEmbeddedDigestPayloadBlob(content: string) {
  const envelope = {
    schemaVersion: 1,
    kind: "zotero-skills-workbench-note-payload",
    noteKind: "digest",
    payloadType: "digest-markdown",
    payload: {
      version: 1,
      entry: "artifacts/digest.md",
      format: "markdown",
      content,
    },
  };
  const encoded = Buffer.from(JSON.stringify(envelope), "utf8").toString(
    "base64",
  );
  const bytes = Buffer.from(
    `\n${WORKBENCH_EMBEDDED_PAYLOAD_MARKER}${encoded}\n`,
    "utf8",
  );
  const BlobCtor = (globalThis as typeof globalThis & { Blob?: typeof Blob })
    .Blob;
  assert.isFunction(BlobCtor, "Blob is required for embedded image fixtures");
  return new BlobCtor!([bytes], { type: "image/png" });
}

function saveRemoteCommittedVocabularyState(entries: PersistedTagEntry[]) {
  Zotero.Prefs.set(
    TAG_VOCAB_REMOTE_PREF_KEY,
    JSON.stringify({
      version: 1,
      entries,
    }),
    true,
  );
}

function saveWorkflowSettingsState(
  workflowId: string,
  workflowParams: Record<string, unknown>,
) {
  Zotero.Prefs.set(
    WORKFLOW_SETTINGS_PREF_KEY,
    JSON.stringify({
      [workflowId]: {
        workflowParams,
      },
    }),
    true,
  );
}

function loadTagVocabularyState() {
  return toPersistedVocabularyState(synthesisVocabularyEntries);
}

function loadLegacyTagVocabularyState() {
  const raw = Zotero.Prefs.get(TAG_VOCAB_PREF_KEY, true);
  if (typeof raw !== "string" || !raw.trim()) {
    return {
      corrupted: false,
      entries: [] as PersistedTagEntry[],
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      corrupted: false,
      entries: Array.isArray(parsed?.entries)
        ? (parsed.entries as PersistedTagEntry[])
        : ([] as PersistedTagEntry[]),
    };
  } catch {
    return {
      corrupted: true,
      entries: [] as PersistedTagEntry[],
    };
  }
}

function loadStagedTagVocabularyState() {
  return toPersistedVocabularyState(synthesisStagedEntries);
}

function loadLegacyStagedTagVocabularyState() {
  const raw = Zotero.Prefs.get(TAG_VOCAB_STAGED_PREF_KEY, true);
  if (typeof raw !== "string" || !raw.trim()) {
    return {
      corrupted: false,
      entries: [] as PersistedTagEntry[],
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      corrupted: false,
      entries: Array.isArray(parsed?.entries)
        ? (parsed.entries as PersistedTagEntry[])
        : ([] as PersistedTagEntry[]),
    };
  } catch {
    return {
      corrupted: true,
      entries: [] as PersistedTagEntry[],
    };
  }
}

function installSuggestTagsDialogMock(
  mockOpen: (
    args: SuggestTagsDialogOpenArgs,
  ) => Promise<SuggestTagsDialogOpenResult> | SuggestTagsDialogOpenResult,
) {
  installWorkflowEditorSessionOverrideForTests(mockOpen as any);
  return () => {
    installWorkflowEditorSessionOverrideForTests(null);
  };
}

function installTagVocabularySyncBridgeMock(
  toasts: Array<{ text?: string; type?: string }>,
  logs: RuntimeLogEntry[] = [],
) {
  return installTagVocabularySyncCapture({ toasts, logs });
}

function installFetchMock(
  mockFetch: (
    input: string,
    init?: Record<string, unknown>,
  ) => Promise<{
    ok: boolean;
    status: number;
    statusText?: string;
    json: () => Promise<unknown>;
  }>,
) {
  return installWorkflowFetchMockAcrossRuntimes(mockFetch);
}

function toBase64(text: string) {
  return Buffer.from(text, "utf8").toString("base64");
}

function listTags(item: Zotero.Item) {
  return item
    .getTags()
    .map((entry) => String(entry.tag || "").trim())
    .filter(Boolean)
    .sort((left, right) =>
      left.localeCompare(right, "en", {
        sensitivity: "base",
      }),
    );
}

let cachedTagRegulatorWorkflowPromise: Promise<any> | null = null;

async function getTagRegulatorWorkflow() {
  if (!cachedTagRegulatorWorkflowPromise) {
    cachedTagRegulatorWorkflowPromise = (async () => {
      await syncBuiltinWorkflowsOnStartup();
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "tag-regulator",
      );
      assert.isOk(
        workflow,
        `workflow tag-regulator not found; loaded=${loaded.workflows.map((entry) => entry.manifest.id).join(",")} warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
      );
      return workflow!;
    })().catch((error) => {
      cachedTagRegulatorWorkflowPromise = null;
      throw error;
    });
  }
  return cachedTagRegulatorWorkflowPromise;
}

async function runSuggestTagsEmptyScenario(args?: { titleSuffix?: string }) {
  saveTagVocabularyState([
    {
      tag: "topic:stable",
      facet: "topic",
      source: "manual",
      note: "",
      deprecated: false,
    },
  ]);
  const before = loadTagVocabularyState().entries;
  let dialogCalls = 0;
  const restoreOpen = installSuggestTagsDialogMock(async () => {
    dialogCalls += 1;
    return {
      saved: true,
      result: {
        selectedTags: ["topic:unexpected"],
      },
    };
  });
  const parent = await handlers.item.create({
    itemType: "journalArticle",
    fields: {
      title:
        `Tag Regulator Suggest Empty Parent ${String(args?.titleSuffix || "").trim()}`.trim(),
    },
  });
  await handlers.tag.add(parent, ["topic:legacy"]);
  const workflow = await getTagRegulatorWorkflow();

  try {
    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        readText: async () => "",
      },
      runResult: {
        resultJson: {
          result: {
            status: "success",
            data: {
              remove_tags: ["topic:legacy"],
              add_tags: ["topic:tunnel"],
              suggest_tags: [],
              warnings: [],
              error: null,
            },
            artifacts: [],
            validation_warnings: [],
            error: null,
          },
        },
      },
    })) as {
      suggest_intake?: {
        opened?: boolean;
        added?: string[];
      };
    };
    return {
      applied,
      beforeEntries: before,
      afterEntries: loadTagVocabularyState().entries,
      dialogCalls,
    };
  } finally {
    restoreOpen();
  }
}

function setupTagRegulatorWorkflowSuite() {
  let restoreHostApi: (() => void) | null = null;

  beforeEach(function () {
    clearTagVocabularyState();
    resetRuntimeBridgeOverrideForTests();
    restoreHostApi = installSynthesisTagVocabularyHostApiGlobals();
  });

  afterEach(function () {
    restoreHostApi?.();
    restoreHostApi = null;
    resetRuntimeBridgeOverrideForTests();
    clearTagVocabularyState();
  });
  return { itNodeOnly, itZoteroFullOrNode };
}

export function registerTagRegulatorRequestBuildingTests() {
  describe("workflow: tag-regulator request building", function () {
    const { itNodeOnly } = setupTagRegulatorWorkflowSuite();
    void itNodeOnly;
    registerTagRegulatorRequestBuildingSegmentOne();
    registerTagRegulatorRequestBuildingSegmentTwo();
    registerTagRegulatorRequestBuildingSegmentThree();
  });
}

export function registerTagRegulatorApplyIntakeTests() {
  describe("workflow: tag-regulator apply intake", function () {
    const { itNodeOnly, itZoteroFullOrNode } = setupTagRegulatorWorkflowSuite();
    registerTagRegulatorApplyIntakeSegment(itNodeOnly, itZoteroFullOrNode);
  });
}

export function registerTagRegulatorDialogRenderingTests() {
  describe("workflow: tag-regulator dialog rendering", function () {
    const { itNodeOnly } = setupTagRegulatorWorkflowSuite();
    registerTagRegulatorDialogRenderingSegment(itNodeOnly);
  });
}

function registerTagRegulatorRequestBuildingSegmentOne() {
  it("loads tag-regulator workflow manifest with buildRequest/applyResult hooks", async function () {
    const workflow = await getTagRegulatorWorkflow();
    assert.equal(workflow.manifest.provider, "skillrunner");
    assert.equal(workflow.manifest.inputs?.unit, "parent");
    assert.equal(workflow.manifest.request?.kind, "skillrunner.job.v1");
    assert.isFunction(workflow.hooks.buildRequest);
    assert.isFunction(workflow.hooks.applyResult);
  });

  it("builds one mixed-input request per selected parent with valid_tags upload", async function () {
    saveTagVocabularyState([
      {
        tag: "topic:tunnel",
        facet: "topic",
        source: "manual",
        note: "",
        deprecated: false,
      },
      {
        tag: "topic:legacy",
        facet: "topic",
        source: "manual",
        note: "",
        deprecated: true,
      },
      {
        tag: "field:CE/UG/Tunnel",
        facet: "field",
        source: "manual",
        note: "",
        deprecated: false,
      },
    ]);

    const parentA = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Tag Regulator Parent A" },
    });
    const parentB = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Tag Regulator Parent B" },
    });
    await handlers.tag.add(parentA, ["topic:legacy", "status:2-to-read"]);
    await handlers.tag.add(parentB, ["topic:tunnel"]);

    const workflow = await getTagRegulatorWorkflow();
    const selectionContext = await buildSelectionContext([parentA, parentB]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext,
      executionOptions: {
        workflowParams: {
          infer_tag: false,
          valid_tags_format: "yaml",
          tag_note_language: "fr-FR",
        },
      },
    })) as TagRegulatorRequest[];

    assert.lengthOf(requests, 2);
    const targetParentIds = requests
      .map((request) => request.targetParentID)
      .filter((value): value is number => typeof value === "number")
      .sort((left, right) => left - right);
    assert.deepEqual(
      targetParentIds,
      [parentA.id, parentB.id].sort((left, right) => left - right),
    );

    for (const request of requests) {
      assert.equal(request.kind, "skillrunner.job.v1");
      assert.equal(request.skill_id, "tag-regulator");
      assert.equal(request.runtime_options?.execution_mode, "auto");
      assert.equal(request.parameter?.infer_tag, false);
      assert.equal(request.parameter?.valid_tags_format, "yaml");
      assert.equal(request.parameter?.tag_note_language, "fr-FR");
      assert.equal(request.upload_files?.length, 1);
      assert.equal(request.upload_files?.[0].key, "valid_tags");
      assert.isString(request.input?.valid_tags);
      assert.match(String(request.input?.valid_tags || ""), /^inputs\//);
      assert.notMatch(String(request.input?.valid_tags || ""), /^uploads\//);
      assert.isArray(request.input?.input_tags);
      assert.isString(request.input?.metadata?.key);
    }

    const firstUploadPath = String(requests[0].upload_files?.[0].path || "");
    assert.isTrue(await existsPath(firstUploadPath));
    const yamlText = await readUtf8(firstUploadPath);
    assert.include(yamlText, "- topic:tunnel");
    assert.include(yamlText, "- field:CE/UG/Tunnel");
    assert.notInclude(yamlText, "topic:legacy");
  });

  it("prefers Synthesis canonical vocabulary export when available", async function () {
    const tags =
      await __tagRegulatorBuildRequestTestOnly.loadSynthesisVocabularyTagsOrThrow(
        {
          hostApi: {
            synthesis: {
              async exportTagVocabularyForRegulator() {
                return {
                  entries: [
                    { tag: "topic:synthesis-canonical" },
                    { tag: "topic:deprecated", deprecated: true },
                  ],
                };
              },
            },
            prefs: {
              get() {
                throw new Error("prefs fallback should not be used");
              },
            },
          },
        },
      );

    assert.deepEqual(tags, ["topic:synthesis-canonical"]);
  });

  itNodeOnly(
    "adds digest markdown upload when parent has embedded digest payload",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:tunnel",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);

      const digestMarkdown = [
        "# Digest",
        "",
        "This paper studies tunnel inspection with deep learning.",
      ].join("\n");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Parent With Digest" },
      });
      const note = await handlers.parent.addNote(parent, {
        content:
          '<div data-schema-version="9"><h1>Digest</h1><p>Visible digest note</p></div>',
      });
      await Zotero.Attachments.importEmbeddedImage({
        blob: buildEmbeddedDigestPayloadBlob(digestMarkdown),
        parentItemID: note.id,
      });

      const workflow = await getTagRegulatorWorkflow();
      const selectionContext = await buildSelectionContext([parent]);
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext,
      })) as TagRegulatorRequest[];

      assert.lengthOf(requests, 1);
      const request = requests[0];
      assert.equal(
        request.input?.digest_markdown,
        "inputs/digest_markdown/digest.md",
      );
      const digestUpload = request.upload_files?.find(
        (entry) => entry.key === "digest_markdown",
      );
      assert.isOk(digestUpload, "digest markdown upload should be present");
      const digestText = await readUtf8(String(digestUpload?.path || ""));
      assert.equal(digestText, digestMarkdown);
      assert.isOk(
        request.upload_files?.find((entry) => entry.key === "valid_tags"),
        "valid_tags upload should remain present",
      );
    },
  );

  itNodeOnly(
    "adds digest markdown upload from Workbench embedded payload attachments",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:tunnel",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);

      const digestMarkdown = [
        "# Digest",
        "",
        "This digest was stored through the Workbench payload attachment helper.",
      ].join("\n");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Parent With Workbench Digest" },
      });
      const note = await handlers.parent.addNote(parent, {
        content:
          '<div data-schema-version="9"><h1>Literature Digest</h1><p>Visible digest note</p></div>',
      });
      await attachWorkbenchPayloadToNote({
        runtime: {
          hostApi: createWorkflowHostApi(),
          hostApiVersion: WORKFLOW_HOST_API_VERSION,
          TextEncoder,
          TextDecoder,
          Buffer,
        },
        note,
        noteKind: "digest",
        payloadType: "digest-markdown",
        payload: {
          format: "markdown",
          entry: "artifacts/digest.md",
          content: digestMarkdown,
        },
      });

      const workflow = await getTagRegulatorWorkflow();
      const selectionContext = await buildSelectionContext([parent]);
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext,
      })) as TagRegulatorRequest[];

      assert.lengthOf(requests, 1);
      assert.equal(
        requests[0].input?.digest_markdown,
        "inputs/digest_markdown/digest.md",
      );
      const digestUpload = requests[0].upload_files?.find(
        (entry) => entry.key === "digest_markdown",
      );
      assert.isOk(digestUpload, "digest markdown upload should be present");
      assert.equal(
        await readUtf8(String(digestUpload?.path || "")),
        digestMarkdown,
      );
    },
  );

  itNodeOnly(
    "does not add digest markdown input when embedded payload is absent",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:tunnel",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);

      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Parent Without Digest Payload" },
      });
      await handlers.parent.addNote(parent, {
        content:
          '<div data-schema-version="9"><h1>Digest</h1><p>Visible digest note</p></div>',
      });

      const workflow = await getTagRegulatorWorkflow();
      const selectionContext = await buildSelectionContext([parent]);
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext,
      })) as TagRegulatorRequest[];

      assert.lengthOf(requests, 1);
      assert.notProperty(requests[0].input || {}, "digest_markdown");
      assert.isUndefined(
        requests[0].upload_files?.find(
          (entry) => entry.key === "digest_markdown",
        ),
      );
    },
  );

  itNodeOnly(
    "fails with deterministic diagnostics when controlled vocabulary is missing",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Missing Vocabulary Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);

      const workflow = await getTagRegulatorWorkflow();
      const selectionContext = await buildSelectionContext([parent]);

      let thrown: unknown = null;
      try {
        await executeBuildRequests({
          workflow,
          selectionContext,
        });
      } catch (error) {
        thrown = error;
      }

      assert.isOk(thrown, "expected build request to fail");
      assert.match(String(thrown), /synthesis vocabulary/i);
    },
  );

  itNodeOnly(
    "uses default tag_note_language zh-CN when workflow param is not provided",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:tunnel",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);

      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Language Default Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);

      const workflow = await getTagRegulatorWorkflow();
      const selectionContext = await buildSelectionContext([parent]);
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext,
      })) as TagRegulatorRequest[];

      assert.lengthOf(requests, 1);
      assert.equal(requests[0].runtime_options?.execution_mode, "auto");
      assert.equal(requests[0].parameter?.tag_note_language, "zh-CN");
    },
  );

  itNodeOnly(
    "ignores legacy tag-manager GitHub prefs and uses Synthesis vocabulary when building valid_tags",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:local-only",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);
      saveRemoteCommittedVocabularyState([
        {
          tag: "topic:remote-only",
          facet: "topic",
          source: "remote",
          note: "",
          deprecated: false,
        },
      ]);
      saveWorkflowSettingsState("tag-manager", {
        github_owner: "demo-owner",
        github_repo: "Zotero_TagVocab",
        file_path: "tags/tags.json",
        github_token: "secret-token",
      });

      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Remote Committed Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);

      const workflow = await getTagRegulatorWorkflow();
      const selectionContext = await buildSelectionContext([parent]);
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext,
        executionOptions: {
          workflowParams: {
            valid_tags_format: "yaml",
          },
        },
      })) as TagRegulatorRequest[];

      assert.lengthOf(requests, 1);
      const yamlPath = String(requests[0].upload_files?.[0].path || "");
      const yamlText = await readUtf8(yamlPath);
      assert.include(yamlText, "- topic:local-only");
      assert.notInclude(yamlText, "- topic:remote-only");
    },
  );

  itNodeOnly(
    "buildRequest uses runtime-scoped Synthesis vocabulary when package runtime has no global Zotero fallback",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Runtime Scoped Prefs Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);

      const workflow = await getTagRegulatorWorkflow();
      const selectionContext = await buildSelectionContext([parent]);
      const prefsPrefix = `${config.prefsPrefix}.runtime-scope-${Date.now()}`;
      const baseHostApi = createWorkflowHostApi();

      const request = (await workflow.hooks.buildRequest?.({
        selectionContext,
        manifest: workflow.manifest,
        executionOptions: {
          workflowParams: {
            valid_tags_format: "yaml",
          },
        },
        runtime: {
          helpers: createHookHelpers(Zotero),
          hostApiVersion: WORKFLOW_HOST_API_VERSION,
          hostApi: {
            ...baseHostApi,
            addon: {
              getConfig() {
                return {
                  addonName: "Zotero Agents",
                  addonRef: "zotero-skills",
                  prefsPrefix,
                };
              },
            },
            synthesis: {
              ...(baseHostApi as any).synthesis,
              async exportTagVocabularyForRegulator() {
                return {
                  entries: [
                    {
                      tag: "topic:runtime-only",
                      facet: "topic",
                      source: "synthesis",
                      note: "",
                      deprecated: false,
                    },
                  ],
                };
              },
            },
          },
          workflowId: "tag-regulator",
          packageId: workflow.packageId,
          workflowSourceKind: workflow.workflowSourceKind,
          hookName: "buildRequest",
        },
      })) as TagRegulatorRequest;

      const yamlPath = String(request.upload_files?.[0].path || "");
      const yamlText = await readUtf8(yamlPath);
      assert.include(yamlText, "- topic:runtime-only");
    },
  );
}

function registerTagRegulatorApplyIntakeSegment(
  itNodeOnly: typeof it,
  itZoteroFullOrNode: typeof it,
) {
  const itSaveTxLoadProbe =
    isZoteroRuntime() && isTagRegulatorSaveTxLoadProbeEnabled() ? it : it.skip;

  if (isTagRegulatorSaveTxLoadProbeEnabled() && isZoteroRuntime()) {
    after(async function () {
      await flushSaveTxLoadProbeReport();
    });
  }

  it("runs parent pipeline from buildRequest to applyResult and mutates tags conservatively", async function () {
    saveTagVocabularyState([
      {
        tag: "topic:tunnel",
        facet: "topic",
        source: "manual",
        note: "",
        deprecated: false,
      },
    ]);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Tag Regulator Apply Parent" },
    });
    await handlers.tag.add(parent, ["topic:legacy", "status:2-to-read"]);

    const workflow = await getTagRegulatorWorkflow();
    const selectionContext = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext,
    })) as TagRegulatorRequest[];
    assert.lengthOf(requests, 1);

    const restoreOpen = installSuggestTagsDialogMock(async () => ({
      saved: false,
      reason: "test-skip-suggest-dialog",
    }));
    let applied: {
      applied: boolean;
      removed: string[];
      added: string[];
      suggest_tags: SuggestTagEntry[];
      warnings: string[];
    };
    try {
      applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          readText: async () => "",
        },
        request: requests[0],
        runResult: {
          resultJson: {
            result: {
              status: "success",
              data: {
                metadata: requests[0].input?.metadata || {},
                input_tags: requests[0].input?.input_tags || [],
                remove_tags: ["topic:legacy"],
                add_tags: ["topic:tunnel"],
                suggest_tags: [
                  { tag: "topic:suggested", note: "suggested note" },
                ],
                warnings: ["heuristic"],
                error: null,
              },
              artifacts: [],
              validation_warnings: [],
              error: null,
            },
          },
        },
      })) as {
        applied: boolean;
        removed: string[];
        added: string[];
        suggest_tags: SuggestTagEntry[];
        warnings: string[];
      };
    } finally {
      restoreOpen();
    }

    assert.isTrue(applied.applied);
    assert.deepEqual(applied.removed, ["topic:legacy"]);
    assert.deepEqual(applied.added, ["topic:tunnel"]);
    assert.deepEqual(applied.suggest_tags, [
      { tag: "topic:suggested", note: "suggested note" },
    ]);
    assert.deepEqual(applied.warnings, ["heuristic"]);
    assert.deepEqual(listTags(parent), ["status:2-to-read", "topic:tunnel"]);
  });

  itZoteroFullOrNode(
    "does not open suggest-tags dialog or write vocabulary when suggest_tags is empty",
    async function () {
      const result = await runSuggestTagsEmptyScenario();
      assert.isFalse(Boolean(result.applied.suggest_intake?.opened));
      assert.deepEqual(result.applied.suggest_intake?.added || [], []);
      assert.equal(result.dialogCalls, 0);
      assert.deepEqual(result.afterEntries, result.beforeEntries);
    },
  );

  for (const mode of ["create-only", "create-and-update"] as const) {
    for (const count of [0, 20, 50, 100]) {
      itSaveTxLoadProbe(
        `diagnostic saveTx load probe mode=${mode} count=${count}`,
        async function () {
          this.timeout(120000);
          const title = `mode=${mode};count=${count};test=${this.test?.title || ""}`;
          const startedAt = new Date().toISOString();
          const warmup = await measureAsyncTestPerformanceSpan(
            "saveTxLoadProbe:warmupTotal",
            { mode, count },
            async () => runSaveTxLoadWarmup({ count, mode }),
          );
          const scenarioStartedAt = Date.now();
          const result = await measureAsyncTestPerformanceSpan(
            "saveTxLoadProbe:scenarioTotal",
            { mode, count },
            async () =>
              runSuggestTagsEmptyScenario({
                titleSuffix: title,
              }),
          );
          const scenarioDurationMs = Date.now() - scenarioStartedAt;
          assert.isFalse(Boolean(result.applied.suggest_intake?.opened));
          assert.deepEqual(result.applied.suggest_intake?.added || [], []);
          assert.equal(result.dialogCalls, 0);
          assert.deepEqual(result.afterEntries, result.beforeEntries);
          recordSaveTxLoadProbeResult({
            title,
            mode,
            count,
            idlePolicy: "none",
            warmupDurationMs: warmup.durationMs,
            scenarioDurationMs,
            startedAt,
            finishedAt: new Date().toISOString(),
          });
        },
      );
    }
  }

  for (const probeCase of [
    { mode: "create-only" as const, count: 100, idleEvery: 10, idleMs: 50 },
    { mode: "create-and-update" as const, count: 20, idleEvery: 5, idleMs: 50 },
    { mode: "create-and-update" as const, count: 50, idleEvery: 5, idleMs: 50 },
  ]) {
    itSaveTxLoadProbe(
      `diagnostic saveTx idle control mode=${probeCase.mode} count=${probeCase.count} every=${probeCase.idleEvery} idleMs=${probeCase.idleMs}`,
      async function () {
        this.timeout(180000);
        const idlePolicy = `every-${probeCase.idleEvery}x${probeCase.idleMs}ms`;
        const title = `mode=${probeCase.mode};count=${probeCase.count};idle=${idlePolicy};test=${this.test?.title || ""}`;
        const startedAt = new Date().toISOString();
        const warmup = await measureAsyncTestPerformanceSpan(
          "saveTxLoadProbe:warmupTotal",
          {
            mode: probeCase.mode,
            count: probeCase.count,
            idlePolicy,
          },
          async () =>
            runSaveTxLoadWarmup({
              count: probeCase.count,
              mode: probeCase.mode,
              idleEvery: probeCase.idleEvery,
              idleMs: probeCase.idleMs,
            }),
        );
        const scenarioStartedAt = Date.now();
        const result = await measureAsyncTestPerformanceSpan(
          "saveTxLoadProbe:scenarioTotal",
          {
            mode: probeCase.mode,
            count: probeCase.count,
            idlePolicy,
          },
          async () =>
            runSuggestTagsEmptyScenario({
              titleSuffix: title,
            }),
        );
        const scenarioDurationMs = Date.now() - scenarioStartedAt;
        assert.isFalse(Boolean(result.applied.suggest_intake?.opened));
        assert.deepEqual(result.applied.suggest_intake?.added || [], []);
        assert.equal(result.dialogCalls, 0);
        assert.deepEqual(result.afterEntries, result.beforeEntries);
        recordSaveTxLoadProbeResult({
          title,
          mode: probeCase.mode,
          count: probeCase.count,
          idlePolicy,
          warmupDurationMs: warmup.durationMs,
          scenarioDurationMs,
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      },
    );
  }

  itNodeOnly(
    "reclassifies stale controlled suggest tags before opening join-all dialog",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:existing",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);
      const openCalls: SuggestTagsDialogOpenArgs[] = [];
      const restoreOpen = installSuggestTagsDialogMock(async (args) => {
        openCalls.push(args);
        return {
          saved: false,
          actionId: "join-all",
          result: {
            suggestTagEntries: [
              { tag: "topic:new-alpha", note: "alpha note" },
              { tag: "topic:new-beta", note: "beta note" },
            ],
            rowErrors: {},
            addedDirect: [],
            staged: [],
            rejected: [],
            invalid: [],
            skippedDirect: [],
            stagedSkipped: [],
            countdownSeconds: 9,
            timedOut: false,
            closePolicyApplied: false,
          },
        };
      });
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Suggest Intake Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);
      const workflow = await getTagRegulatorWorkflow();

      try {
        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: ["topic:legacy"],
                  add_tags: ["topic:tunnel"],
                  suggest_tags: [
                    { tag: "topic:new-alpha", note: "alpha note" },
                    { tag: "topic:new-beta", note: "beta note" },
                    { tag: "topic:existing", note: "existing note" },
                  ],
                  warnings: ["heuristic"],
                  error: null,
                },
                artifacts: [],
                validation_warnings: [],
                error: null,
              },
            },
          },
        })) as {
          suggest_intake?: {
            opened?: boolean;
            added?: string[];
            skipped?: string[];
            addedDirect?: string[];
            staged?: string[];
          };
          reclassified_add_tags?: string[];
          reclassified_staged?: string[];
          suggest_tags?: SuggestTagEntry[];
          added?: string[];
        };
        assert.isTrue(Boolean(applied.suggest_intake?.opened));
        assert.deepEqual((applied.suggest_intake?.added || []).sort(), [
          "topic:new-alpha",
          "topic:new-beta",
        ]);
        assert.deepEqual(applied.suggest_intake?.staged || [], []);
        assert.deepEqual(applied.suggest_intake?.skipped || [], []);
        assert.deepEqual(applied.reclassified_add_tags || [], [
          "topic:existing",
        ]);
        assert.deepEqual(applied.reclassified_staged || [], []);
        assert.deepEqual(applied.suggest_tags || [], [
          { tag: "topic:new-alpha", note: "alpha note" },
          { tag: "topic:new-beta", note: "beta note" },
        ]);
        assert.deepEqual((applied.added || []).sort(), [
          "topic:existing",
          "topic:tunnel",
        ]);
      } finally {
        restoreOpen();
      }

      assert.lengthOf(openCalls, 1);
      assert.deepEqual(openCalls[0].initialState?.suggestTagEntries || [], [
        { tag: "topic:new-alpha", note: "alpha note", parentCount: 1 },
        { tag: "topic:new-beta", note: "beta note", parentCount: 1 },
      ]);
      assert.deepEqual(
        (openCalls[0].actions || []).map((entry) => String(entry.id || "")),
        ["join-all", "stage-all", "reject-all"],
      );
      assert.deepEqual(openCalls[0].autoClose, {
        afterMs: 10000,
        actionId: "stage-all",
      });

      const afterEntries = loadTagVocabularyState().entries;
      const newEntry = afterEntries.find(
        (entry) => entry.tag === "topic:new-alpha",
      );
      assert.isOk(newEntry, "expected selected suggest tag to be persisted");
      assert.equal(newEntry?.source, "agent-suggest");
      assert.equal(newEntry?.note, "alpha note");
      const newBetaEntry = afterEntries.find(
        (entry) => entry.tag === "topic:new-beta",
      );
      assert.isOk(newBetaEntry, "expected join-all to persist topic:new-beta");
      assert.equal(newBetaEntry?.source, "agent-suggest");
      assert.deepEqual(listTags(parent), [
        "topic:existing",
        "topic:new-alpha",
        "topic:new-beta",
        "topic:tunnel",
      ]);
    },
  );

  itNodeOnly(
    "keeps staged suggest tags visible and merges current parent binding before dialog",
    async function () {
      saveStagedTagVocabularyState([
        {
          tag: "topic:already-staged",
          facet: "topic",
          source: "tag-regulator-suggest",
          note: "staged note",
          deprecated: false,
          parentBindings: [999],
        },
      ]);
      const openCalls: SuggestTagsDialogOpenArgs[] = [];
      const restoreOpen = installSuggestTagsDialogMock(async (args) => {
        openCalls.push(args);
        return {
          saved: false,
          actionId: "join-all",
          result: {
            suggestTagEntries: [{ tag: "topic:fresh", note: "fresh note" }],
            rowErrors: {},
            addedDirect: [],
            staged: [],
            rejected: [],
            invalid: [],
            skippedDirect: [],
            stagedSkipped: [],
            countdownSeconds: 9,
            timedOut: false,
            closePolicyApplied: false,
          },
        };
      });
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Suggest Staged Parent" },
      });
      const workflow = await getTagRegulatorWorkflow();

      try {
        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: [],
                  add_tags: [],
                  suggest_tags: [
                    { tag: "topic:already-staged", note: "staged note" },
                    { tag: "topic:fresh", note: "fresh note" },
                  ],
                  warnings: [],
                  error: null,
                },
                artifacts: [],
                validation_warnings: [],
                error: null,
              },
            },
          },
        })) as {
          suggest_intake?: {
            opened?: boolean;
            added?: string[];
            skipped?: string[];
          };
          reclassified_add_tags?: string[];
          reclassified_staged?: string[];
          suggest_tags?: SuggestTagEntry[];
        };
        assert.isTrue(Boolean(applied.suggest_intake?.opened));
        assert.deepEqual(applied.suggest_intake?.added || [], ["topic:fresh"]);
        assert.deepEqual(applied.suggest_intake?.skipped || [], []);
        assert.deepEqual(applied.reclassified_add_tags || [], []);
        assert.deepEqual(applied.reclassified_staged || [], [
          "topic:already-staged",
        ]);
        assert.deepEqual(applied.suggest_tags || [], [
          { tag: "topic:already-staged", note: "staged note" },
          { tag: "topic:fresh", note: "fresh note" },
        ]);
      } finally {
        restoreOpen();
      }

      assert.lengthOf(openCalls, 1);
      assert.deepEqual(openCalls[0].initialState?.suggestTagEntries || [], [
        { tag: "topic:already-staged", note: "staged note", parentCount: 2 },
        { tag: "topic:fresh", note: "fresh note", parentCount: 1 },
      ]);
      const stagedEntries = loadStagedTagVocabularyState().entries;
      const alreadyStaged = stagedEntries.find(
        (entry) => entry.tag === "topic:already-staged",
      );
      assert.isOk(alreadyStaged);
      assert.deepEqual(alreadyStaged?.parentBindings || [], [parent.id, 999]);
    },
  );

  itNodeOnly(
    "stages suggest tags with parent bindings without mutating parent tags",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Stage Parent Binding" },
      });
      const workflow = await getTagRegulatorWorkflow();
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        actionId: "stage-all",
        result: {
          suggestTagEntries: [{ tag: "topic:stage-now", note: "stage note" }],
          rowErrors: {},
          addedDirect: [],
          staged: [],
          rejected: [],
          invalid: [],
          skippedDirect: [],
          stagedSkipped: [],
          countdownSeconds: 5,
          timedOut: false,
          closePolicyApplied: false,
        },
      }));

      try {
        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: [],
                  add_tags: [],
                  suggest_tags: [
                    { tag: "topic:stage-now", note: "stage note" },
                  ],
                  warnings: [],
                  error: null,
                },
              },
            },
          },
        })) as {
          added?: string[];
          suggest_intake?: {
            staged?: string[];
            appliedToCurrentParent?: string[];
          };
        };
        assert.deepEqual(applied.suggest_intake?.staged || [], [
          "topic:stage-now",
        ]);
        assert.deepEqual(
          applied.suggest_intake?.appliedToCurrentParent || [],
          [],
        );
        assert.deepEqual(listTags(parent), []);
        const staged = loadStagedTagVocabularyState().entries.find(
          (entry) => entry.tag === "topic:stage-now",
        );
        assert.isOk(staged);
        assert.deepEqual(staged?.parentBindings || [], [parent.id]);
      } finally {
        restoreOpen();
      }
    },
  );

  itNodeOnly(
    "stages suggest tags through Synthesis upsert without clearing the staged inbox",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Synthesis Stage Upsert Parent" },
      });
      const baseHostApi = createWorkflowHostApi();
      const stageCalls: Array<{ entries?: Array<Record<string, unknown>> }> =
        [];
      let clearCount = 0;
      const restoreHostApi = installTagVocabularyHostApiGlobals({
        hostApi: {
          ...baseHostApi,
          synthesis: {
            ...(baseHostApi as any).synthesis,
            async loadTagVocabulary() {
              return { entries: [] };
            },
            async listStagedTagSuggestions() {
              return [];
            },
            async stageTagSuggestions(args: {
              entries?: Array<Record<string, unknown>>;
            }) {
              stageCalls.push({
                entries: Array.isArray(args?.entries)
                  ? args.entries.map((entry) => ({ ...entry }))
                  : [],
              });
              return { staged: args?.entries || [] };
            },
            async clearStagedTagSuggestions() {
              clearCount += 1;
              return { discarded: [] };
            },
          },
        },
      });
      const workflow = await getTagRegulatorWorkflow();
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        actionId: "stage-all",
        result: {
          suggestTagEntries: [
            { tag: "topic:stage-upsert", note: "stage note" },
          ],
          rowErrors: {},
          addedDirect: [],
          staged: [],
          rejected: [],
          invalid: [],
          skippedDirect: [],
          stagedSkipped: [],
          countdownSeconds: 5,
          timedOut: false,
          closePolicyApplied: false,
        },
      }));

      try {
        await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: [],
                  add_tags: [],
                  suggest_tags: [
                    { tag: "topic:stage-upsert", note: "stage note" },
                  ],
                  warnings: [],
                  error: null,
                },
              },
            },
          },
        });

        assert.equal(clearCount, 0);
        assert.lengthOf(stageCalls, 1);
        assert.deepEqual(stageCalls[0].entries?.[0], {
          tag: "topic:stage-upsert",
          facet: "topic",
          note: "stage note",
          source_flow: "tag-regulator-suggest",
          parent_bindings: [parent.id],
        });
      } finally {
        restoreOpen();
        restoreHostApi();
      }
    },
  );

  itNodeOnly(
    "joins suggest tags through Synthesis without legacy tag-manager publish fallback",
    async function () {
      saveRemoteCommittedVocabularyState([]);
      saveWorkflowSettingsState("tag-manager", {
        github_owner: "demo-owner",
        github_repo: "Zotero_TagVocab",
        file_path: "tags/tags.json",
        github_token: "secret-token",
      });
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Subscription Join Failure" },
      });
      const workflow = await getTagRegulatorWorkflow();
      const toasts: Array<{ text?: string; type?: string }> = [];
      const logs: Array<Record<string, unknown>> = [];
      const restoreBridge = installTagVocabularySyncBridgeMock(toasts, logs);
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        actionId: "join-all",
        result: {
          suggestTagEntries: [{ tag: "topic:join-fail", note: "join fail" }],
          rowErrors: {},
          addedDirect: [],
          staged: [],
          rejected: [],
          invalid: [],
          skippedDirect: [],
          stagedSkipped: [],
          countdownSeconds: 5,
          timedOut: false,
          closePolicyApplied: false,
        },
      }));
      try {
        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: [],
                  add_tags: [],
                  suggest_tags: [{ tag: "topic:join-fail", note: "join fail" }],
                  warnings: [],
                  error: null,
                },
              },
            },
          },
        })) as {
          suggest_intake?: {
            staged?: string[];
            added?: string[];
            appliedToCurrentParent?: string[];
          };
        };
        assert.deepEqual(applied.suggest_intake?.added || [], [
          "topic:join-fail",
        ]);
        assert.deepEqual(applied.suggest_intake?.staged || [], []);
        const committed = loadTagVocabularyState().entries.find(
          (entry) => entry.tag === "topic:join-fail",
        );
        assert.isOk(committed);
        assert.deepEqual(loadStagedTagVocabularyState().entries, []);
        assert.deepEqual(listTags(parent), ["topic:join-fail"]);
        assert.isFalse(
          toasts.some((entry) =>
            /publish failed/i.test(String(entry.text || "")),
          ),
        );
        assert.isFalse(
          logs.some(
            (entry) =>
              String(entry.stage || "") ===
              "tag-regulator-join-fallback-to-staged",
          ),
        );
      } finally {
        restoreOpen();
        restoreBridge();
      }
    },
  );

  itNodeOnly(
    "opens dialog only for suggest tags that remain unresolved after live reconcile",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:already-controlled",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);
      saveStagedTagVocabularyState([
        {
          tag: "topic:already-staged",
          facet: "topic",
          source: "tag-regulator-suggest",
          note: "staged note",
          deprecated: false,
        },
      ]);
      const openCalls: SuggestTagsDialogOpenArgs[] = [];
      const restoreOpen = installSuggestTagsDialogMock(async (args) => {
        openCalls.push(args);
        return {
          saved: false,
          actionId: "reject-all",
          result: {
            suggestTagEntries: [
              { tag: "topic:still-pending", note: "pending note" },
            ],
            rowErrors: {},
            addedDirect: [],
            staged: [],
            rejected: [],
            invalid: [],
            skippedDirect: [],
            stagedSkipped: [],
            countdownSeconds: 9,
            timedOut: false,
            closePolicyApplied: false,
          },
        };
      });
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Mixed Live Reconcile Parent" },
      });
      const workflow = await getTagRegulatorWorkflow();

      try {
        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: [],
                  add_tags: [],
                  suggest_tags: [
                    {
                      tag: "topic:already-controlled",
                      note: "controlled note",
                    },
                    { tag: "topic:already-staged", note: "staged note" },
                    { tag: "topic:still-pending", note: "pending note" },
                  ],
                  warnings: [],
                  error: null,
                },
                artifacts: [],
                validation_warnings: [],
                error: null,
              },
            },
          },
        })) as {
          suggest_tags?: SuggestTagEntry[];
          reclassified_add_tags?: string[];
          reclassified_staged?: string[];
        };
        assert.deepEqual(applied.reclassified_add_tags || [], [
          "topic:already-controlled",
        ]);
        assert.deepEqual(applied.reclassified_staged || [], [
          "topic:already-staged",
        ]);
        assert.deepEqual(applied.suggest_tags || [], [
          { tag: "topic:already-staged", note: "staged note" },
          { tag: "topic:still-pending", note: "pending note" },
        ]);
      } finally {
        restoreOpen();
      }

      assert.lengthOf(openCalls, 1);
      assert.deepEqual(openCalls[0].initialState?.suggestTagEntries || [], [
        { tag: "topic:already-staged", note: "staged note", parentCount: 1 },
        { tag: "topic:still-pending", note: "pending note", parentCount: 1 },
      ]);
      assert.deepEqual(listTags(parent), ["topic:already-controlled"]);
    },
  );

  itNodeOnly(
    "keeps operation idempotent during join-all intake after live reconcile",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:existing",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        actionId: "join-all",
        result: {
          suggestTagEntries: [
            { tag: "topic:new-idempotent", note: "idempotent note" },
          ],
          rowErrors: {},
          addedDirect: [],
          staged: [],
          rejected: [],
          invalid: [],
          skippedDirect: [],
          stagedSkipped: [],
          countdownSeconds: 9,
          timedOut: false,
          closePolicyApplied: false,
        },
      }));
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Suggest Duplicate Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);
      const workflow = await getTagRegulatorWorkflow();

      try {
        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: ["topic:legacy"],
                  add_tags: ["topic:tunnel"],
                  suggest_tags: [
                    { tag: "topic:existing", note: "existing note" },
                    { tag: "topic:new-idempotent", note: "idempotent note" },
                  ],
                  warnings: [],
                  error: null,
                },
                artifacts: [],
                validation_warnings: [],
                error: null,
              },
            },
          },
        })) as {
          suggest_intake?: {
            added?: string[];
            skipped?: string[];
          };
          reclassified_add_tags?: string[];
          suggest_tags?: SuggestTagEntry[];
        };
        assert.deepEqual(applied.suggest_intake?.added || [], [
          "topic:new-idempotent",
        ]);
        assert.deepEqual(applied.suggest_intake?.skipped || [], []);
        assert.deepEqual(applied.reclassified_add_tags || [], [
          "topic:existing",
        ]);
        assert.deepEqual(applied.suggest_tags || [], [
          { tag: "topic:new-idempotent", note: "idempotent note" },
        ]);
      } finally {
        restoreOpen();
      }

      const afterEntries = loadTagVocabularyState().entries;
      assert.lengthOf(
        afterEntries.filter((entry) => entry.tag === "topic:existing"),
        1,
        "duplicate existing tag should not be inserted twice",
      );
      assert.lengthOf(
        afterEntries.filter((entry) => entry.tag === "topic:new-idempotent"),
        1,
        "new suggest tag should be inserted exactly once",
      );
      assert.deepEqual(listTags(parent), [
        "topic:existing",
        "topic:new-idempotent",
        "topic:tunnel",
      ]);
    },
  );

  itNodeOnly(
    "applies close-policy staged intake when dialog closes without explicit action and keeps parent tags unchanged",
    async function () {
      saveTagVocabularyState([
        {
          tag: "topic:stable",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);
      const before = loadTagVocabularyState().entries;
      const beforeStaged = loadStagedTagVocabularyState().entries;
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        reason: "user-canceled",
        actionId: "stage-all",
        result: {
          suggestTagEntries: [
            { tag: "topic:new-after-cancel", note: "cancel note" },
          ],
          rowErrors: {},
          addedDirect: [],
          staged: [],
          rejected: [],
          invalid: [],
          skippedDirect: [],
          stagedSkipped: [],
          countdownSeconds: 5,
          timedOut: false,
          closePolicyApplied: false,
        },
      }));
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Suggest Cancel Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);
      const workflow = await getTagRegulatorWorkflow();

      try {
        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: ["topic:legacy"],
                  add_tags: ["topic:tunnel"],
                  suggest_tags: [
                    { tag: "topic:new-after-cancel", note: "cancel note" },
                  ],
                  warnings: [],
                  error: null,
                },
                artifacts: [],
                validation_warnings: [],
                error: null,
              },
            },
          },
        })) as {
          suggest_intake?: {
            closePolicyApplied?: boolean;
            staged?: string[];
            rejected?: string[];
            added?: string[];
          };
        };
        assert.isTrue(Boolean(applied.suggest_intake?.closePolicyApplied));
        assert.deepEqual(applied.suggest_intake?.added || [], []);
        assert.deepEqual(applied.suggest_intake?.staged || [], [
          "topic:new-after-cancel",
        ]);
        assert.deepEqual(
          applied.suggest_intake?.appliedToCurrentParent || [],
          [],
        );
        assert.deepEqual(applied.suggest_intake?.rejected || [], []);
      } finally {
        restoreOpen();
      }

      assert.deepEqual(loadTagVocabularyState().entries, before);
      assert.isAbove(
        loadStagedTagVocabularyState().entries.length,
        beforeStaged.length,
        "expected staged entries to grow after close-policy staging",
      );
      assert.deepEqual(listTags(parent), ["topic:tunnel"]);
    },
  );

  itNodeOnly(
    "rejects invalid suggest tags with diagnostics while accepting valid tags in join-all path",
    async function () {
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        actionId: "join-all",
        result: {
          suggestTagEntries: [
            { tag: "bad-format", note: "invalid note" },
            { tag: "topic:valid-suggest", note: "valid note" },
          ],
          rowErrors: {},
          addedDirect: [],
          staged: [],
          rejected: [],
          invalid: [],
          skippedDirect: [],
          stagedSkipped: [],
          countdownSeconds: 7,
          timedOut: false,
          closePolicyApplied: false,
        },
      }));
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Suggest Invalid Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);
      const workflow = await getTagRegulatorWorkflow();

      try {
        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              result: {
                status: "success",
                data: {
                  remove_tags: ["topic:legacy"],
                  add_tags: ["topic:tunnel"],
                  suggest_tags: [
                    { tag: "bad-format", note: "invalid note" },
                    { tag: "topic:valid-suggest", note: "valid note" },
                  ],
                  warnings: [],
                  error: null,
                },
                artifacts: [],
                validation_warnings: [],
                error: null,
              },
            },
          },
        })) as {
          suggest_intake?: {
            added?: string[];
            invalid?: Array<{ tag: string; reason?: string }>;
          };
        };
        assert.deepEqual(applied.suggest_intake?.added || [], [
          "topic:valid-suggest",
        ]);
        assert.lengthOf(applied.suggest_intake?.invalid || [], 1);
        assert.equal(applied.suggest_intake?.invalid?.[0]?.tag, "bad-format");
        assert.match(
          String(applied.suggest_intake?.invalid?.[0]?.reason || ""),
          /invalid/i,
        );
      } finally {
        restoreOpen();
      }

      const entries = loadTagVocabularyState().entries;
      assert.isUndefined(entries.find((entry) => entry.tag === "bad-format"));
      assert.isOk(entries.find((entry) => entry.tag === "topic:valid-suggest"));
    },
  );

  itNodeOnly(
    "applies valid mutation when skill output has non-null error diagnostic",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Error Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);
      const before = listTags(parent);

      const workflow = await getTagRegulatorWorkflow();
      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          readText: async () => "",
        },
        runResult: {
          resultJson: {
            result: {
              status: "failed",
              data: {
                remove_tags: ["topic:legacy"],
                add_tags: ["topic:tunnel"],
                suggest_tags: [],
                warnings: ["backend failed"],
                error: {
                  type: "invalid_input",
                  message: "missing valid_tags",
                },
              },
              artifacts: [],
              validation_warnings: [],
              error: null,
            },
          },
        },
      })) as {
        applied: boolean;
        skipped: boolean;
        removed?: string[];
        added?: string[];
        warnings?: string[];
        skill_diagnostics?: {
          status?: string;
          error?: { message?: string };
        };
      };

      assert.isTrue(applied.applied);
      assert.isFalse(applied.skipped);
      assert.deepEqual(applied.removed, ["topic:legacy"]);
      assert.deepEqual(applied.added, ["topic:tunnel"]);
      assert.deepEqual(applied.warnings, ["backend failed"]);
      assert.equal(applied.skill_diagnostics?.status, "failed");
      assert.equal(
        applied.skill_diagnostics?.error?.message,
        "missing valid_tags",
      );
      assert.notDeepEqual(listTags(parent), before);
      assert.deepEqual(listTags(parent), ["topic:tunnel"]);
    },
  );

  itNodeOnly(
    "skips mutation when skill output is malformed",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Malformed Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);
      const before = listTags(parent);

      const workflow = await getTagRegulatorWorkflow();
      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          readText: async () => "",
        },
        runResult: {
          resultJson: {
            result: {
              status: "success",
              data: {
                remove_tags: ["topic:legacy"],
                add_tags: "topic:tunnel",
                suggest_tags: [],
                warnings: ["malformed mutation payload"],
                error: {
                  message: "agent emitted add_tags as a string",
                },
              },
              artifacts: [],
              validation_warnings: [],
              error: null,
            },
          },
        },
      })) as {
        applied: boolean;
        skipped: boolean;
        reason?: string;
        warnings?: string[];
        skill_diagnostics?: { error?: { message?: string } };
      };

      assert.isFalse(applied.applied);
      assert.isTrue(applied.skipped);
      assert.match(String(applied.reason || ""), /malformed/i);
      assert.deepEqual(applied.warnings, ["malformed mutation payload"]);
      assert.equal(
        applied.skill_diagnostics?.error?.message,
        "agent emitted add_tags as a string",
      );
      assert.deepEqual(listTags(parent), before);
    },
  );

  itNodeOnly(
    "treats legacy string-array suggest_tags as malformed and skips mutation",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Legacy Suggest Tags Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);
      const before = listTags(parent);

      const workflow = await getTagRegulatorWorkflow();
      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          readText: async () => "",
        },
        runResult: {
          resultJson: {
            result: {
              status: "success",
              data: {
                remove_tags: ["topic:legacy"],
                add_tags: ["topic:tunnel"],
                suggest_tags: ["topic:legacy-shape"],
                warnings: [],
                error: null,
              },
              artifacts: [],
              validation_warnings: [],
              error: null,
            },
          },
        },
      })) as {
        applied: boolean;
        skipped: boolean;
        reason?: string;
      };

      assert.isFalse(applied.applied);
      assert.isTrue(applied.skipped);
      assert.match(String(applied.reason || ""), /suggest_tags/i);
      assert.deepEqual(listTags(parent), before);
    },
  );

  itNodeOnly(
    "uses canonical resultJson and ignores poll responseJson envelope",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator ResponseJson Parent" },
      });
      await handlers.tag.add(parent, [
        "/unread",
        "End-to-End",
        "Multiple-object tracking",
        "Transformer",
      ]);
      const before = listTags(parent);
      assert.deepEqual(before, [
        "/unread",
        "End-to-End",
        "Multiple-object tracking",
        "Transformer",
      ]);

      const workflow = await getTagRegulatorWorkflow();
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        reason: "test-skip-suggest-dialog",
      }));
      let applied: {
        applied: boolean;
        skipped: boolean;
        removed: string[];
        added: string[];
      };
      try {
        applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: {
            readText: async () => "",
          },
          runResult: {
            resultJson: {
              metadata: {
                key: "KSM65VAD",
                title:
                  "MOTR: end-to-end multiple-object tracking with transformer",
              },
              input_tags: [
                "/unread",
                "End-to-End",
                "Multiple-object tracking",
                "Transformer",
              ],
              remove_tags: [
                "/unread",
                "End-to-End",
                "Multiple-object tracking",
                "Transformer",
              ],
              add_tags: [
                "ai_task:tracking",
                "data:video",
                "field:CS/AI/CV",
                "model:DL/transformer",
              ],
              suggest_tags: [
                {
                  tag: "topic:end-to-end",
                  note: "end-to-end topic",
                },
                {
                  tag: "topic:multiple-object-tracking",
                  note: "multiple-object-tracking topic",
                },
              ],
              warnings: [
                "Inferred tags based on title and abstract.",
                "Mapped 'Multiple-object tracking' to 'ai_task:tracking'.",
              ],
              error: null,
            },
            responseJson: {
              status: "succeeded",
              result: {
                data: {
                  remove_tags: [],
                  add_tags: ["stale:poll-envelope"],
                },
              },
            },
          },
        })) as {
          applied: boolean;
          skipped: boolean;
          removed: string[];
          added: string[];
        };
      } finally {
        restoreOpen();
      }

      assert.isTrue(applied.applied);
      assert.isFalse(applied.skipped);
      assert.deepEqual(applied.removed, [
        "/unread",
        "End-to-End",
        "Multiple-object tracking",
        "Transformer",
      ]);
      assert.deepEqual(applied.added, [
        "ai_task:tracking",
        "data:video",
        "field:CS/AI/CV",
        "model:DL/transformer",
      ]);
      assert.deepEqual(listTags(parent), [
        "ai_task:tracking",
        "data:video",
        "field:CS/AI/CV",
        "model:DL/transformer",
      ]);
    },
  );
}

function registerTagRegulatorRequestBuildingSegmentTwo() {
  itNodeOnly(
    "reads latest exported vocabulary on each execution",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Vocabulary Refresh Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy"]);
      const workflow = await getTagRegulatorWorkflow();
      const selectionContext = await buildSelectionContext([parent]);

      saveTagVocabularyState([
        {
          tag: "topic:version-a",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);
      const requestsA = (await executeBuildRequests({
        workflow,
        selectionContext,
      })) as TagRegulatorRequest[];
      const yamlA = await readUtf8(
        String(requestsA[0].upload_files?.[0].path || ""),
      );
      assert.include(yamlA, "topic:version-a");
      assert.notInclude(yamlA, "topic:version-b");

      saveTagVocabularyState([
        {
          tag: "topic:version-b",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);
      const requestsB = (await executeBuildRequests({
        workflow,
        selectionContext,
      })) as TagRegulatorRequest[];
      const yamlB = await readUtf8(
        String(requestsB[0].upload_files?.[0].path || ""),
      );
      assert.include(yamlB, "topic:version-b");
      assert.notInclude(yamlB, "topic:version-a");
    },
  );
}

function registerTagRegulatorDialogRenderingSegment(itNodeOnly: typeof it) {
  itNodeOnly(
    "renders suggest dialog header and parent count column",
    function () {
      const runtimeState: {
        timerStarted?: boolean;
        timerHandle?: ReturnType<typeof setInterval> | null;
        state?: Record<string, unknown> | null;
      } = {};
      const renderer =
        __tagRegulatorApplyResultTestOnly.createSuggestTagsRenderer({
          runtime: runtimeState,
        });
      const doc = new FakeHtmlDocument() as unknown as Document;
      const root = new FakeHtmlElement("div") as unknown as HTMLElement;
      const state: Record<string, unknown> = {
        suggestTagEntries: [
          { tag: "topic:alpha", note: "alpha note", parentCount: 3 },
        ],
        rowErrors: {},
        addedDirect: [],
        staged: [],
        rejected: [],
        invalid: [],
        skippedDirect: [],
        stagedSkipped: [],
        countdownSeconds: 10,
        timedOut: false,
        closePolicyApplied: false,
      };
      const host = {
        rerender: () => {
          renderer.render({ doc, root, state, host });
        },
        patchState: (updater: (draft: Record<string, unknown>) => void) => {
          updater(state);
          renderer.render({ doc, root, state, host });
        },
        closeWithAction: (_actionId?: string) => {},
      };

      renderer.render({ doc, root, state, host });
      const rootNode = root as unknown as FakeHtmlElement;
      const header = findNodeByRole(rootNode, "suggest-table-header");
      const parentCount = findNodeByRoleAndRow(
        rootNode,
        "suggest-parent-count",
        0,
      );
      assert.isOk(header);
      assert.isOk(parentCount);
      assert.equal(parentCount?.textContent, "3");
      assert.equal(
        header?.style.gridTemplateColumns,
        "minmax(120px,1.1fr) minmax(0,2.3fr) 56px 72px 72px",
      );
      assert.equal(rootNode.children[0]?.style.minWidth, "0");
      assert.equal(rootNode.children[0]?.children[2]?.style.minWidth, "0");
      if (runtimeState.timerHandle) {
        clearInterval(runtimeState.timerHandle);
      }
    },
  );

  itNodeOnly(
    "opens suggest dialog with a wider responsive layout",
    async function () {
      let capturedArgs: SuggestTagsDialogOpenArgs | null = null;
      const restoreBridge = installSuggestTagsDialogMock((args) => {
        capturedArgs = args;
        return {
          saved: false,
          actionId: args.closeActionId,
          result: args.initialState,
        };
      });
      try {
        const result =
          await __tagRegulatorApplyResultTestOnly.openSuggestTagsDialog({
            suggestTagEntries: [{ tag: "topic:alpha", note: "alpha note" }],
          });
        assert.isFalse(Boolean(result.canceled));
        assert.isOk(capturedArgs);
        assert.deepInclude(capturedArgs?.layout || {}, {
          width: 860,
          minWidth: 680,
          maxWidth: 1200,
          height: 560,
        });
      } finally {
        restoreBridge();
      }
    },
  );

  itNodeOnly(
    "marks timeout state when renderer countdown reaches zero",
    async function () {
      const runtimeState: {
        timerStarted?: boolean;
        timerHandle?: ReturnType<typeof setInterval> | null;
        timeoutApplied?: boolean;
        state?: Record<string, unknown> | null;
      } = {};
      const renderer =
        __tagRegulatorApplyResultTestOnly.createSuggestTagsRenderer({
          runtime: runtimeState,
        });
      const doc = new FakeHtmlDocument() as unknown as Document;
      const root = new FakeHtmlElement("div") as unknown as HTMLElement;
      const state: Record<string, unknown> = {
        suggestTagEntries: [{ tag: "topic:countdown", note: "note" }],
        rowErrors: {},
        addedDirect: [],
        staged: [],
        rejected: [],
        invalid: [],
        skippedDirect: [],
        stagedSkipped: [],
        countdownSeconds: 1,
        timedOut: false,
        closePolicyApplied: false,
      };
      const host = {
        rerender: () => {
          renderer.render({ doc, root, state, host });
        },
        patchState: (updater: (draft: Record<string, unknown>) => void) => {
          updater(state);
          renderer.render({ doc, root, state, host });
        },
        closeWithAction: (actionId?: string) => {
          void actionId;
        },
      };

      renderer.render({ doc, root, state, host });
      await new Promise((resolve) => setTimeout(resolve, 1100));
      if (runtimeState.timerHandle) {
        clearInterval(runtimeState.timerHandle);
      }
      assert.isTrue(Boolean(state.timedOut));
      assert.isTrue(Boolean(state.closePolicyApplied));
      assert.equal(Number(state.countdownSeconds), 0);
    },
  );
}

function registerTagRegulatorRequestBuildingSegmentThree() {
  itNodeOnly(
    "keeps language option declarations aligned with literature-analysis workflow",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const tagRegulator = loaded.workflows.find(
        (entry) => entry.manifest.id === "tag-regulator",
      );
      const literatureDigest = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(tagRegulator);
      assert.isOk(literatureDigest);

      const tagNoteLanguage =
        tagRegulator?.manifest.parameters?.tag_note_language;
      const literatureLanguage =
        literatureDigest?.manifest.parameters?.language;
      assert.deepEqual(
        tagNoteLanguage?.enum || [],
        literatureLanguage?.enum || [],
      );
      assert.equal(tagNoteLanguage?.default, "zh-CN");
      assert.equal(literatureLanguage?.default, "zh-CN");
    },
  );
}
