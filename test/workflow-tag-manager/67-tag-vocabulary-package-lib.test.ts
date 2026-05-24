import { assert } from "chai";
import { config } from "../../package.json";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { WORKFLOW_HOST_API_VERSION } from "../../src/workflows/hostApi";
import {
  collectParentBindingsByTag,
  mergeParentBindingsIntoStagedEntries,
} from "../../workflows_builtin/tag-vocabulary-package/lib/bindings.mjs";
import { buildPublishedVocabularyPayload } from "../../workflows_builtin/tag-vocabulary-package/lib/remote.mjs";
import {
  readRawPref,
  resolveGitHubSyncConfig,
  resolveTagVocabularyMode,
} from "../../workflows_builtin/tag-vocabulary-package/lib/state.mjs";
import { withPackageRuntimeScope } from "../../workflows_builtin/tag-vocabulary-package/lib/runtime.mjs";

describe("tag-vocabulary-package lib", function () {
  const workflowSettingsKey = `${config.prefsPrefix}.workflowSettingsJson`;

  afterEach(function () {
    Zotero.Prefs.clear(workflowSettingsKey, true);
    setDebugModeOverrideForTests();
  });

  it("resolves subscription config and mode from workflow settings", async function () {
    const syncConfig = await withPackageRuntimeScope(
      {
        hostApiVersion: 2,
        hostApi: {
          prefs: {
            get(key: string) {
              return key === workflowSettingsKey
                ? JSON.stringify({
                    "tag-manager": {
                      workflowParams: {
                        github_owner: "demo-owner",
                        github_repo: "Zotero_TagVocab",
                        file_path: "/tags/tags.json",
                        github_token: "secret-token",
                      },
                    },
                  })
                : "";
            },
            set() {
              return undefined;
            },
            clear() {
              return undefined;
            },
          },
          addon: {
            getConfig() {
              return {
                addonName: "Zotero Skills",
                addonRef: "zotero-skills",
                prefsPrefix: config.prefsPrefix,
              };
            },
          },
        },
      },
      () => resolveGitHubSyncConfig("tag-manager"),
    );
    assert.deepEqual(syncConfig, {
      githubOwner: "demo-owner",
      githubRepo: "Zotero_TagVocab",
      filePath: "tags/tags.json",
      githubToken: "secret-token",
      configured: true,
      sourceLabel: "demo-owner/Zotero_TagVocab@main/tags/tags.json",
    });
    assert.equal(resolveTagVocabularyMode(syncConfig), "subscription");
  });

  it("merges parent bindings per staged tag deterministically", function () {
    const merged = mergeParentBindingsIntoStagedEntries({
      entries: [
        {
          tag: "topic:alpha",
          facet: "topic",
          source: "manual",
          note: "",
          parentBindings: [3, 1],
        },
      ],
      entry: {
        tag: "topic:alpha",
        facet: "topic",
        source: "agent-suggest",
        note: "merged",
        parentBindings: [2, 3],
      },
      parentBindings: [5, 2],
      defaultSourceFlow: "tag-regulator-suggest",
    });

    assert.deepEqual(merged[0].parentBindings, [1, 2, 3, 5]);

    const bindings = collectParentBindingsByTag(merged, ["topic:alpha"]);
    assert.deepEqual(bindings.get("topic:alpha"), [1, 2, 3, 5]);
  });

  it("preserves remote abbrevs while rebuilding GitHub publish payload", function () {
    const payload = buildPublishedVocabularyPayload({
      remotePayload: {
        version: "1.0.0",
        updated_at: "2026-04-03T00:00:00.000Z",
        facets: ["topic"],
        tags: [],
        abbrevs: { llm: "LLM" },
        tag_count: 0,
      },
      localTags: [
        {
          tag: "topic:agent-runtime",
          facet: "topic",
          source: "manual",
          note: "local",
          deprecated: false,
        },
      ],
    });

    assert.deepEqual(payload.abbrevs, { llm: "LLM" });
    assert.deepEqual(
      payload.tags.map((entry) => entry.tag),
      ["topic:agent-runtime"],
    );
  });

  it("pref accessors resolve values through runtime.hostApi.prefs", async function () {
    const value = await withPackageRuntimeScope(
      {
        hostApiVersion: 2,
        hostApi: {
          prefs: {
            get(key: string) {
              return key === "scoped.pref" ? "scoped-value" : "";
            },
            set() {
              return undefined;
            },
            clear() {
              return undefined;
            },
          },
          addon: {
            getConfig() {
              return {
                addonName: "Zotero Skills",
                addonRef: "zotero-skills",
                prefsPrefix: config.prefsPrefix,
              };
            },
          },
        },
      },
      () => readRawPref("scoped.pref"),
    );
    assert.equal(value, "scoped-value");
  });

  it("accepts current hostApi v5 as a compatible v2 extension", async function () {
    const value = await withPackageRuntimeScope(
      {
        hostApiVersion: WORKFLOW_HOST_API_VERSION,
        hostApi: {
          prefs: {
            get(key: string) {
              return key === "scoped.pref" ? "scoped-v5-value" : "";
            },
            set() {
              return undefined;
            },
            clear() {
              return undefined;
            },
          },
          addon: {
            getConfig() {
              return {
                addonName: "Zotero Skills",
                addonRef: "zotero-skills",
                prefsPrefix: config.prefsPrefix,
              };
            },
          },
        },
      },
      () => readRawPref("scoped.pref"),
    );

    assert.equal(WORKFLOW_HOST_API_VERSION, 5);
    assert.equal(value, "scoped-v5-value");
  });

  it("pref accessors read workflow metadata from hostApi addon config", async function () {
    const value = await withPackageRuntimeScope(
      {
        hostApiVersion: 2,
        hostApi: {
          prefs: {
            get(key: string) {
              return key === `${config.prefsPrefix}.workflowSettingsJson`
                ? JSON.stringify({
                    "tag-regulator": {
                      workflowParams: {
                        github_owner: "bridge-owner",
                      },
                    },
                  })
                : "";
            },
            set() {
              return undefined;
            },
            clear() {
              return undefined;
            },
          },
          addon: {
            getConfig() {
              return {
                addonName: "Zotero Skills",
                addonRef: "zotero-skills",
                prefsPrefix: config.prefsPrefix,
              };
            },
          },
        },
        workflowId: "tag-regulator",
        packageId: "tag-vocabulary-package",
        hookName: "buildRequest",
        debugMode: true,
      },
      () => readRawPref(`${config.prefsPrefix}.workflowSettingsJson`),
    );
    assert.include(value, "bridge-owner");
  });

  it("emits structured diagnostics when hostApi.prefs is missing in debug mode", async function () {
    setDebugModeOverrideForTests(true);
    const captured: Array<Record<string, unknown>> = [];

    try {
      await withPackageRuntimeScope(
        {
          hostApiVersion: 2,
          hostApi: {
            logging: {
              appendRuntimeLog(entry: Record<string, unknown>) {
                captured.push(entry);
              },
            },
            addon: {
              getConfig() {
                return {
                  addonName: "Zotero Skills",
                  addonRef: "zotero-skills",
                  prefsPrefix: config.prefsPrefix,
                };
              },
            },
          },
          debugMode: true,
          workflowId: "tag-manager",
          packageId: "tag-vocabulary-package",
          workflowSourceKind: "builtin",
          hookName: "applyResult",
        },
        () => readRawPref("missing.pref"),
      );
      assert.fail("expected prefs accessor to fail");
    } catch (error) {
      assert.include(String(error), "host capability missing: prefs");
    }

    assert.isOk(
      captured.find((entry) => entry.stage === "runtime-prefs-missing"),
      JSON.stringify(captured, null, 2),
    );
  });
});
