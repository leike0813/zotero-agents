import { assert } from "chai";
import type { LoadedWorkflow } from "../../src/workflows/types";
import {
  compareWorkflowDisplayOrder,
  isCoreWorkflow,
  localizeWorkflowLabel,
  localizeWorkflowParameters,
  resolveWorkflowDisplayLocale,
} from "../../src/workflows/localization";
import { buildWorkflowSettingsUiDescriptor } from "../../src/modules/workflowSettings";

type WorkflowFixtureOverrides = Partial<Omit<LoadedWorkflow, "manifest">> & {
  manifest?: Partial<LoadedWorkflow["manifest"]>;
};

function workflow(overrides: WorkflowFixtureOverrides = {}): LoadedWorkflow {
  const { manifest, ...workflowOverrides } = overrides;
  return {
    manifest: {
      id: "demo-workflow",
      label: "Demo Workflow",
      provider: "pass-through",
      parameters: {
        language: {
          type: "string",
          title: "Language",
          description: "Output language.",
          default: "en-US",
        },
      },
      hooks: {
        applyResult: "hooks/applyResult.js",
      },
      ...manifest,
    },
    rootDir: "",
    hooks: {
      applyResult: async () => ({}),
    },
    buildStrategy: "declarative",
    ...workflowOverrides,
  };
}

async function withAppLocale<T>(locale: string, run: () => T | Promise<T>) {
  const runtime = globalThis as Record<string, unknown>;
  const previous = Object.getOwnPropertyDescriptor(runtime, "Services");
  Object.defineProperty(runtime, "Services", {
    configurable: true,
    writable: true,
    value: {
      locale: {
        appLocaleAsBCP47: locale,
      },
    },
  });
  try {
    return await run();
  } finally {
    if (previous) {
      Object.defineProperty(runtime, "Services", previous);
    } else {
      delete runtime.Services;
    }
  }
}

describe("workflow i18n display projection", function () {
  it("resolves exact, language, default, and raw fallbacks", function () {
    const entry = workflow({
      localization: {
        packageDefaultLocale: "en-US",
        packageMessages: {
          "en-US": {
            "workflows.demo-workflow.label": "Default Demo",
          },
          zh: {
            "workflows.demo-workflow.label": "语言级 Demo",
          },
          "zh-CN": {
            "workflows.demo-workflow.label": "精确 Demo",
          },
        },
      },
    });

    assert.equal(localizeWorkflowLabel(entry, "zh-CN"), "精确 Demo");
    assert.equal(localizeWorkflowLabel(entry, "zh-TW"), "语言级 Demo");
    assert.equal(localizeWorkflowLabel(entry, "fr-FR"), "Default Demo");
    assert.equal(localizeWorkflowLabel(workflow(), "fr-FR"), "Demo Workflow");
  });

  it("lets inline workflow messages override package messages", function () {
    const entry = workflow({
      manifest: {
        id: "demo-workflow",
        label: "Demo Workflow",
        provider: "pass-through",
        i18n: {
          messages: {
            "zh-CN": {
              label: "内联 Demo",
            },
          },
        },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      },
      localization: {
        packageMessages: {
          "zh-CN": {
            "workflows.demo-workflow.label": "包级 Demo",
          },
        },
      },
    });

    assert.equal(localizeWorkflowLabel(entry, "zh-CN"), "内联 Demo");
  });

  it("prefixes workflow emoji only in user-visible labels", function () {
    const entry = workflow({
      manifest: {
        display: {
          emoji: "📊",
        },
      },
      localization: {
        packageMessages: {
          "zh-CN": {
            "workflows.demo-workflow.label": "文献分析",
          },
        },
      },
    });

    assert.equal(localizeWorkflowLabel(entry, "zh-CN"), "📊 文献分析");
    assert.equal(
      localizeWorkflowLabel(entry, {
        localeInput: "zh-CN",
        includeEmoji: false,
      }),
      "文献分析",
    );
    assert.equal(localizeWorkflowLabel(workflow(), "zh-CN"), "Demo Workflow");
  });

  it("sorts core workflows before non-core workflows without emoji affecting label order", function () {
    const coreZ = workflow({
      manifest: {
        id: "core-z",
        label: "Zulu",
        display: {
          core: true,
          emoji: "🔄",
        },
      },
    });
    const coreA = workflow({
      manifest: {
        id: "core-a",
        label: "Alpha",
        display: {
          core: true,
          emoji: "📊",
        },
      },
    });
    const nonCore = workflow({
      manifest: {
        id: "non-core",
        label: "Beta",
        display: {
          emoji: "🧩",
        },
      },
    });

    assert.isTrue(isCoreWorkflow(coreZ));
    assert.isFalse(isCoreWorkflow(nonCore));
    assert.deepEqual(
      [nonCore, coreZ, coreA].sort(compareWorkflowDisplayOrder).map(
        (entry) => entry.manifest.id,
      ),
      ["core-a", "core-z", "non-core"],
    );
  });

  it("localizes parameter schema without changing parameter keys", function () {
    const entry = workflow({
      localization: {
        packageMessages: {
          "zh-CN": {
            "workflows.demo-workflow.parameters.language.title": "输出语言",
            "workflows.demo-workflow.parameters.language.description":
              "用于生成结果的语言。",
          },
        },
      },
    });

    const parameters = localizeWorkflowParameters(entry, "zh-CN");
    assert.sameMembers(Object.keys(parameters), ["language"]);
    assert.equal(parameters.language.title, "输出语言");
    assert.equal(parameters.language.description, "用于生成结果的语言。");
  });

  it("feeds localized labels and parameter titles into settings descriptors", async function () {
    await withAppLocale("zh-CN", async () => {
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow({
          localization: {
            packageMessages: {
              "zh-CN": {
                "workflows.demo-workflow.label": "设置 Demo",
                "workflows.demo-workflow.parameters.language.title": "输出语言",
              },
            },
          },
        }),
        candidateBackends: [],
      });

      assert.equal(resolveWorkflowDisplayLocale(), "zh-CN");
      assert.equal(descriptor.workflowLabel, "设置 Demo");
      assert.equal(descriptor.workflowSchemaEntries[0].key, "language");
      assert.equal(descriptor.workflowSchemaEntries[0].title, "输出语言");
    });
  });
});
