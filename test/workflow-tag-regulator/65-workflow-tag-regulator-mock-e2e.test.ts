import { assert } from "chai";
import { config } from "../../package.json";
import { handlers } from "../../src/handlers";
import { installWorkflowEditorSessionOverrideForTests } from "../../src/modules/workflowEditorHost";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import {
  purgeSkillRunnerBackendReconcileState,
  startSkillRunnerTaskReconciler,
  stopSkillRunnerTaskReconciler,
} from "../../src/modules/skillRunnerTaskReconciler";
import { resetSkillRunnerBackendHealthRegistryForTests } from "../../src/modules/skillRunnerBackendHealthRegistry";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import {
  createWorkflowHostApi,
  WORKFLOW_HOST_API_VERSION,
} from "../../src/workflows/hostApi";
import { setPref } from "../../src/utils/prefs";
import { installTagVocabularyHostApiGlobals } from "../workflow-tag-vocabulary/hostApiTestUtils";
import { isZoteroRuntime, workflowsPath } from "../zotero/workflow-test-utils";
import { installMutablePrefsForTest } from "../mutablePrefsTestUtils";

type PersistedTagEntry = {
  tag: string;
  facet: string;
  source: string;
  note: string;
  deprecated: boolean;
  parentBindings?: Array<{ libraryId: number; itemKey: string }>;
};

type SuggestTagEntry = {
  tag: string;
  note: string;
};

type SuggestTagsDialogOpenArgs = {
  rendererId?: string;
  title?: string;
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

const TAG_VOCAB_PREF_KEY = `${config.prefsPrefix}.tagVocabularyJson`;
const TAG_VOCAB_STAGED_PREF_KEY = `${config.prefsPrefix}.tagVocabularyStagedJson`;
const BACKENDS_CONFIG_PREF_KEY = `${config.prefsPrefix}.backendsConfigJson`;
const WORKFLOW_SETTINGS_PREF_KEY = `${config.prefsPrefix}.workflowSettingsJson`;
const MOCK_SKILLRUNNER_BASE_URL =
  (typeof process !== "undefined" &&
    process.env?.ZOTERO_TEST_SKILLRUNNER_ENDPOINT) ||
  "http://127.0.0.1:8030";
const MOCK_BACKEND_ID = "skillrunner-mock";
let synthesisVocabularyEntries: PersistedTagEntry[] = [];
let synthesisStagedEntries: PersistedTagEntry[] = [];

function resetSkillRunnerDeferredTestState() {
  stopSkillRunnerTaskReconciler();
  purgeSkillRunnerBackendReconcileState(MOCK_BACKEND_ID);
  resetSkillRunnerBackendHealthRegistryForTests();
  resetPluginStateStoreForTests();
  setPref("skillRunnerRequestLedgerJson", "");
  setPref("skillRunnerDeferredTasksJson", "");
  setPref("taskDashboardHistoryJson", "");
}

async function waitForCondition(
  predicate: () => boolean,
  options: { timeoutMs?: number; intervalMs?: number; message?: string } = {},
) {
  const timeoutMs = Math.max(100, Number(options.timeoutMs || 8000));
  const intervalMs = Math.max(20, Number(options.intervalMs || 100));
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(String(options.message || "timed out waiting for condition"));
}

function clearTagVocabularyState() {
  synthesisVocabularyEntries = [];
  synthesisStagedEntries = [];
  Zotero.Prefs.clear(TAG_VOCAB_PREF_KEY, true);
  Zotero.Prefs.clear(TAG_VOCAB_STAGED_PREF_KEY, true);
}

function saveTagVocabularyState(entries: PersistedTagEntry[]) {
  synthesisVocabularyEntries = entries.map((entry) => ({ ...entry }));
  Zotero.Prefs.set(
    TAG_VOCAB_PREF_KEY,
    JSON.stringify({
      version: 1,
      entries,
    }),
    true,
  );
}

function installSynthesisTagVocabularyHostApiGlobals() {
  const baseHostApi = createWorkflowHostApi();
  return installTagVocabularyHostApiGlobals({
    hostApiVersion: WORKFLOW_HOST_API_VERSION,
    hostApi: {
      ...baseHostApi,
      synthesis: {
        ...baseHostApi.synthesis,
        tags: {
          ...baseHostApi.synthesis.tags,
          async loadVocabulary() {
            return {
              protocol: {
                schema_version: 1,
              },
              aliases: {},
              abbrev: {},
              entries: synthesisVocabularyEntries.map((entry) => ({
                ...entry,
              })),
            };
          },
          async saveVocabulary(args: { entries?: PersistedTagEntry[] }) {
            saveTagVocabularyState(
              (Array.isArray(args?.entries) ? args.entries : []).map(
                (entry) => ({
                  ...entry,
                }),
              ),
            );
            return {
              entries: synthesisVocabularyEntries.map((entry) => ({
                ...entry,
              })),
            };
          },
          async exportVocabularyForRegulator() {
            return {
              vocabularyHash: "test-vocabulary",
              allowedTags: synthesisVocabularyEntries
                .filter((entry) => !entry.deprecated)
                .map((entry) => entry.tag),
            };
          },
          async listStagedSuggestions() {
            return synthesisStagedEntries.map((entry) => ({
              tag: entry.tag,
              facet: entry.facet,
              note: entry.note,
              source_flow: entry.source,
              parent_bindings: (entry.parentBindings || []).map((binding) => ({
                ...binding,
              })),
            }));
          },
          async stageSuggestions(args: { entries?: any[] }) {
            for (const incoming of Array.isArray(args?.entries)
              ? args.entries
              : []) {
              const tag = String(incoming?.tag || "").trim();
              if (!tag) continue;
              const next: PersistedTagEntry = {
                tag,
                facet: String(incoming?.facet || "topic"),
                source: String(
                  incoming?.source_flow || "tag-regulator-suggest",
                ),
                note: String(incoming?.note || ""),
                deprecated: false,
                parentBindings: Array.isArray(incoming?.parent_bindings)
                  ? incoming.parent_bindings.map((binding: any) => ({
                      libraryId: Number(binding.libraryId),
                      itemKey: String(binding.itemKey || ""),
                    }))
                  : [],
              };
              const index = synthesisStagedEntries.findIndex(
                (entry) => entry.tag.toLowerCase() === tag.toLowerCase(),
              );
              if (index >= 0) synthesisStagedEntries[index] = next;
              else synthesisStagedEntries.push(next);
            }
            return { staged: synthesisStagedEntries };
          },
          async promoteStagedSuggestions(args: { tags?: string[] }) {
            const requested = new Set(
              (Array.isArray(args?.tags) ? args.tags : []).map((tag) =>
                String(tag || "")
                  .trim()
                  .toLowerCase(),
              ),
            );
            const promoted: string[] = [];
            const appliedParentTags: any[] = [];
            for (const staged of synthesisStagedEntries) {
              if (!requested.has(staged.tag.toLowerCase())) continue;
              if (
                !synthesisVocabularyEntries.some(
                  (entry) =>
                    entry.tag.toLowerCase() === staged.tag.toLowerCase(),
                )
              ) {
                synthesisVocabularyEntries.push({
                  ...staged,
                  parentBindings: undefined,
                });
                promoted.push(staged.tag);
              }
              for (const parentRef of staged.parentBindings || []) {
                const item = await Zotero.Items.getByLibraryAndKey(
                  parentRef.libraryId,
                  parentRef.itemKey,
                );
                if (!item) continue;
                await handlers.tag.add(item, [staged.tag]);
                appliedParentTags.push({
                  tag: staged.tag,
                  parent_ref: { ...parentRef },
                });
              }
            }
            synthesisStagedEntries = synthesisStagedEntries.filter(
              (entry) => !promoted.includes(entry.tag),
            );
            saveTagVocabularyState(synthesisVocabularyEntries);
            return {
              promoted,
              skipped: [],
              applied_parent_tags: appliedParentTags,
              diagnostics: [],
            };
          },
          async acknowledgeRegulation() {
            return {
              outcome: "acknowledged" as const,
              snapshotRevision: "test-snapshot",
              remainingNeedsRegulation: 0,
            };
          },
        },
      },
    },
  });
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

function createTagRegulatorRunResult(data: {
  remove_tags?: string[];
  add_tags?: string[];
  suggest_tags?: Array<{ tag: string; note?: string }>;
}) {
  return {
    resultJson: {
      result: {
        status: "success",
        data: {
          remove_tags: data.remove_tags || [],
          add_tags: data.add_tags || [],
          suggest_tags: data.suggest_tags || [],
          warnings: [],
          error: null,
        },
        artifacts: [],
        validation_warnings: [],
        error: null,
      },
    },
  };
}

async function runTagRegulatorApplyFixture(args: {
  workflow: Awaited<ReturnType<typeof getTagRegulatorWorkflow>>;
  parent: Zotero.Item;
  resultData: {
    remove_tags?: string[];
    add_tags?: string[];
    suggest_tags?: Array<{ tag: string; note?: string }>;
  };
}) {
  const selectionContext = await buildSelectionContext([args.parent]);
  const requests = (await executeBuildRequests({
    workflow: args.workflow,
    selectionContext,
  })) as Array<{
    kind?: string;
    skill_id?: string;
    targetParentID?: number;
  }>;
  assert.lengthOf(requests, 1);
  assert.equal(requests[0].kind, "skillrunner.job.v1");
  assert.equal(requests[0].skill_id, "tag-regulator");
  assert.equal(requests[0].targetParentID, args.parent.id);
  return executeApplyResult({
    workflow: args.workflow,
    parent: args.parent,
    bundleReader: {
      readText: async () => "",
    },
    request: requests[0],
    runResult: createTagRegulatorRunResult(args.resultData),
  });
}

async function getTagRegulatorWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "tag-regulator",
  );
  assert.isOk(
    workflow,
    `workflow tag-regulator not found; loaded=${loaded.workflows.map((entry) => entry.manifest.id).join(",")} warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
  );
  return workflow!;
}

const describeEditorIntegrationSuite = isZoteroRuntime()
  ? describe.skip
  : describe;

describeEditorIntegrationSuite(
  "integration: tag-regulator with mock skill-runner",
  function () {
    this.timeout(20000);
    let prevBackendsConfigPref: unknown;
    let prevWorkflowSettingsPref: unknown;
    let restorePrefs: (() => void) | null = null;
    let restoreHostApi: (() => void) | null = null;

    beforeEach(function () {
      restorePrefs = installMutablePrefsForTest();
      restoreHostApi = installSynthesisTagVocabularyHostApiGlobals();
      resetSkillRunnerDeferredTestState();
      prevBackendsConfigPref = Zotero.Prefs.get(BACKENDS_CONFIG_PREF_KEY, true);
      prevWorkflowSettingsPref = Zotero.Prefs.get(
        WORKFLOW_SETTINGS_PREF_KEY,
        true,
      );
      Zotero.Prefs.set(
        BACKENDS_CONFIG_PREF_KEY,
        JSON.stringify({
          schemaVersion: 2,
          backends: [
            {
              id: MOCK_BACKEND_ID,
              displayName: MOCK_BACKEND_ID,
              type: "skillrunner",
              baseUrl: MOCK_SKILLRUNNER_BASE_URL,
              auth: { kind: "none" },
            },
          ],
        }),
        true,
      );
      Zotero.Prefs.set(
        WORKFLOW_SETTINGS_PREF_KEY,
        JSON.stringify({
          "tag-regulator": {
            backendId: MOCK_BACKEND_ID,
          },
        }),
        true,
      );
      clearTagVocabularyState();
      startSkillRunnerTaskReconciler();
    });

    afterEach(function () {
      resetSkillRunnerDeferredTestState();
      if (typeof prevBackendsConfigPref === "undefined") {
        Zotero.Prefs.clear(BACKENDS_CONFIG_PREF_KEY, true);
      } else {
        Zotero.Prefs.set(
          BACKENDS_CONFIG_PREF_KEY,
          prevBackendsConfigPref,
          true,
        );
      }
      if (typeof prevWorkflowSettingsPref === "undefined") {
        Zotero.Prefs.clear(WORKFLOW_SETTINGS_PREF_KEY, true);
      } else {
        Zotero.Prefs.set(
          WORKFLOW_SETTINGS_PREF_KEY,
          prevWorkflowSettingsPref,
          true,
        );
      }
      clearTagVocabularyState();
      restoreHostApi?.();
      restoreHostApi = null;
      restorePrefs?.();
      restorePrefs = null;
    });

    it("updates parent tags through full workflow execution chain when backend result is valid", async function () {
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
        fields: { title: "Tag Regulator E2E Parent" },
      });
      await handlers.tag.add(parent, ["topic:legacy", "status:2-to-read"]);
      const beforeTags = listTags(parent);
      assert.deepEqual(beforeTags, ["status:2-to-read", "topic:legacy"]);

      const workflow = await getTagRegulatorWorkflow();
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        reason: "test-skip-suggest-dialog",
      }));
      try {
        await runTagRegulatorApplyFixture({
          workflow,
          parent,
          resultData: {
            remove_tags: ["topic:legacy"],
            add_tags: ["topic:tunnel"],
            suggest_tags: [],
          },
        });
      } finally {
        restoreOpen();
      }

      const afterTags = listTags(parent);
      assert.deepEqual(afterTags, ["status:2-to-read", "topic:tunnel"]);
    });

    it("suppresses stale suggest-tag reminder after an earlier run already promoted it into controlled vocabulary", async function () {
      saveTagVocabularyState([
        {
          tag: "topic:tunnel",
          facet: "topic",
          source: "manual",
          note: "",
          deprecated: false,
        },
      ]);

      const firstParent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Mock Parent First" },
      });
      const secondParent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Tag Regulator Mock Parent Second" },
      });
      await handlers.tag.add(firstParent, ["topic:legacy", "status:2-to-read"]);
      await handlers.tag.add(secondParent, [
        "topic:legacy",
        "status:2-to-read",
      ]);

      const workflow = await getTagRegulatorWorkflow();
      const openCalls: SuggestTagsDialogOpenArgs[] = [];
      const restoreOpen = installSuggestTagsDialogMock(async (args) => {
        openCalls.push(args);
        return {
          saved: false,
          actionId: "join-all",
          result: {
            suggestTagEntries: args.initialState?.suggestTagEntries || [
              { tag: "topic:suggested-by-mock", note: "" },
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
      try {
        await runTagRegulatorApplyFixture({
          workflow,
          parent: firstParent,
          resultData: {
            remove_tags: ["topic:legacy"],
            add_tags: ["topic:tunnel"],
            suggest_tags: [{ tag: "topic:suggested-by-mock", note: "" }],
          },
        });
        await waitForCondition(
          () =>
            openCalls.length === 1 &&
            JSON.parse(
              String(Zotero.Prefs.get(TAG_VOCAB_PREF_KEY, true) || "{}"),
            )?.entries?.some?.(
              (entry: PersistedTagEntry) =>
                entry.tag === "topic:suggested-by-mock",
            ) &&
            listTags(firstParent).includes("topic:suggested-by-mock") &&
            listTags(firstParent).includes("topic:tunnel"),
          {
            message:
              "first foreground tag-regulator run did not fully converge controlled vocabulary and parent tags",
          },
        );

        await runTagRegulatorApplyFixture({
          workflow,
          parent: secondParent,
          resultData: {
            remove_tags: ["topic:legacy"],
            add_tags: ["topic:tunnel", "topic:suggested-by-mock"],
            suggest_tags: [{ tag: "topic:suggested-by-mock", note: "" }],
          },
        });
      } finally {
        restoreOpen();
      }

      assert.lengthOf(
        openCalls,
        1,
        "second run should not reopen suggest dialog for stale controlled tag",
      );

      const afterVocabulary = JSON.parse(
        String(Zotero.Prefs.get(TAG_VOCAB_PREF_KEY, true) || "{}"),
      );
      assert.isTrue(
        Array.isArray(afterVocabulary.entries) &&
          afterVocabulary.entries.some(
            (entry: PersistedTagEntry) =>
              entry.tag === "topic:suggested-by-mock",
          ),
        "first run should persist mock suggest tag into controlled vocabulary",
      );

      assert.deepEqual(listTags(firstParent), [
        "status:2-to-read",
        "topic:suggested-by-mock",
        "topic:tunnel",
      ]);
      assert.deepEqual(listTags(secondParent), [
        "status:2-to-read",
        "topic:suggested-by-mock",
        "topic:tunnel",
      ]);
    });
  },
);
