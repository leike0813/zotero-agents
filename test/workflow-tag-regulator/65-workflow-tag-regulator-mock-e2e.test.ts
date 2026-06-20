import { assert } from "chai";
import { config } from "../../package.json";
import { handlers } from "../../src/handlers";
import { installWorkflowEditorSessionOverrideForTests } from "../../src/modules/workflowEditorHost";
import {
  purgeSkillRunnerBackendReconcileState,
  startSkillRunnerTaskReconciler,
  stopSkillRunnerTaskReconciler,
} from "../../src/modules/skillRunnerTaskReconciler";
import { resetSkillRunnerBackendHealthRegistryForTests } from "../../src/modules/skillRunnerBackendHealthRegistry";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import { listRuntimeLogs } from "../../src/modules/runtimeLogManager";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { setPref } from "../../src/utils/prefs";
import {
  expectWorkflowSummaryCounter,
  isZoteroRuntime,
  workflowsPath,
} from "../zotero/workflow-test-utils";

type PersistedTagEntry = {
  tag: string;
  facet: string;
  source: string;
  note: string;
  deprecated: boolean;
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
  Zotero.Prefs.clear(TAG_VOCAB_PREF_KEY, true);
  Zotero.Prefs.clear(TAG_VOCAB_STAGED_PREF_KEY, true);
}

function saveTagVocabularyState(entries: PersistedTagEntry[]) {
  Zotero.Prefs.set(
    TAG_VOCAB_PREF_KEY,
    JSON.stringify({
      version: 1,
      entries,
    }),
    true,
  );
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

function listNewWorkflowLogs(workflowId: string, seenIds: Set<string>) {
  return listRuntimeLogs({
    workflowId,
    order: "asc",
  }).filter((entry) => !seenIds.has(String(entry.id || "")));
}

async function isMockSkillRunnerReachable(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${baseUrl}/v1/jobs`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
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

    beforeEach(function () {
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
    });

    it("updates parent tags through full workflow execution chain when backend result is valid", async function () {
      if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
        this.skip();
      }

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
      const alerts: string[] = [];
      const win = {
        ZoteroPane: {
          getSelectedItems: () => [parent],
        },
        alert: (message: string) => alerts.push(message),
      } as unknown as _ZoteroTypes.MainWindow;
      const restoreOpen = installSuggestTagsDialogMock(async () => ({
        saved: false,
        reason: "test-skip-suggest-dialog",
      }));
      try {
        await executeWorkflowFromCurrentSelection({
          win,
          workflow,
        });
        await waitForCondition(
          () =>
            alerts.length === 1 && listTags(parent).includes("topic:tunnel"),
          {
            message:
              "tag-regulator foreground completion did not update parent tags and emit summary",
          },
        );
      } finally {
        restoreOpen();
      }

      assert.lengthOf(alerts, 1);
      expectWorkflowSummaryCounter(alerts[0], "succeeded", 1);
      expectWorkflowSummaryCounter(alerts[0], "failed", 0);

      const afterTags = listTags(parent);
      assert.deepEqual(afterTags, ["status:2-to-read", "topic:tunnel"]);
    });

    it("suppresses stale suggest-tag reminder after an earlier run already promoted it into controlled vocabulary", async function () {
      if (!(await isMockSkillRunnerReachable(MOCK_SKILLRUNNER_BASE_URL))) {
        this.skip();
      }

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
      const winFor = (parent: Zotero.Item) =>
        ({
          ZoteroPane: {
            getSelectedItems: () => [parent],
          },
          alert: () => {},
        }) as unknown as _ZoteroTypes.MainWindow;
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
        await executeWorkflowFromCurrentSelection({
          win: winFor(firstParent),
          workflow,
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

        const seenLogIds = new Set(
          listRuntimeLogs({
            workflowId: "tag-regulator",
            order: "asc",
          }).map((entry) => String(entry.id || "")),
        );
        await executeWorkflowFromCurrentSelection({
          win: winFor(secondParent),
          workflow,
        });
        let secondRequestId = "";
        let secondRunId = "";
        await waitForCondition(
          () => {
            const newLogs = listNewWorkflowLogs("tag-regulator", seenLogIds);
            const dispatchLog = newLogs.find(
              (entry) => String(entry.stage || "") === "dispatch-succeeded",
            ) as
              | {
                  requestId?: string;
                  runId?: string;
                  details?: Record<string, unknown>;
                }
              | undefined;
            const applyLog = newLogs.find(
              (entry) =>
                String(entry.stage || "") === "apply-succeeded" &&
                (!dispatchLog?.requestId ||
                  String(entry.requestId || "") ===
                    String(dispatchLog.requestId || "")),
            );
            if (!dispatchLog || !applyLog) {
              return false;
            }
            secondRequestId = String(dispatchLog.requestId || "").trim();
            secondRunId = String(
              dispatchLog.runId || dispatchLog.details?.runId || "",
            ).trim();
            return (
              Boolean(secondRequestId && secondRunId) &&
              listTags(secondParent).includes("topic:suggested-by-mock") &&
              listTags(secondParent).includes("topic:tunnel")
            );
          },
          {
            message:
              "second foreground tag-regulator run did not expose request/run identifiers and converge parent tags",
          },
        );
        try {
          await waitForCondition(
            () => {
              const requestStages = listRuntimeLogs({
                workflowId: "tag-regulator",
                requestId: secondRequestId,
                order: "asc",
              }).map((entry) => String(entry.stage || ""));
              const runStages = listRuntimeLogs({
                workflowId: "tag-regulator",
                runId: secondRunId,
                order: "asc",
              }).map((entry) => String(entry.stage || ""));
              return (
                requestStages.includes("apply-succeeded") &&
                runStages.includes("dispatch-succeeded") &&
                listTags(secondParent).includes("topic:suggested-by-mock") &&
                listTags(secondParent).includes("topic:tunnel")
              );
            },
            {
              message:
                "second foreground tag-regulator run did not converge parent tags",
            },
          );
        } catch {
          const newStages = listNewWorkflowLogs(
            "tag-regulator",
            seenLogIds,
          ).map((entry) => String(entry.stage || ""));
          const requestStages = secondRequestId
            ? listRuntimeLogs({
                workflowId: "tag-regulator",
                requestId: secondRequestId,
                order: "asc",
              }).map((entry) => String(entry.stage || ""))
            : [];
          const runStages = secondRunId
            ? listRuntimeLogs({
                workflowId: "tag-regulator",
                runId: secondRunId,
                order: "asc",
              }).map((entry) => String(entry.stage || ""))
            : [];
          throw new Error(
            `second foreground tag-regulator run did not converge parent tags; openCalls=${openCalls.length}; secondRequestId=${secondRequestId}; secondRunId=${secondRunId}; secondTags=${JSON.stringify(listTags(secondParent))}; firstTags=${JSON.stringify(listTags(firstParent))}; newStages=${JSON.stringify(newStages)}; requestStages=${JSON.stringify(requestStages)}; runStages=${JSON.stringify(runStages)}`,
          );
        }
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
