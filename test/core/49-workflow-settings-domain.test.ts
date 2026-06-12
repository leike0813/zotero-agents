import { assert } from "chai";
import {
  buildWorkflowSettingsDialogInitialState,
  mergeExecutionOptions,
  normalizeSavedWorkflowSettings,
  normalizeWorkflowParamsBySchema,
  type WorkflowExecutionOptions,
} from "../../src/modules/workflowSettingsDomain";
import type { WorkflowManifest } from "../../src/workflows/types";

describe("workflow settings domain", function () {
  it("merges run-once overrides over persisted settings deterministically", function () {
    const base: WorkflowExecutionOptions = {
      backendId: "skillrunner-local",
      workflowParams: {
        language: "zh-CN",
        keep: "base",
      },
      providerOptions: {
        no_cache: false,
        model: "",
      },
    };
    const override: WorkflowExecutionOptions = {
      backendId: "skillrunner-alt",
      workflowParams: {
        language: "en-US",
      },
      providerOptions: {
        no_cache: true,
      },
    };

    const merged = mergeExecutionOptions(base, override);
    assert.equal(merged.backendId, "skillrunner-alt");
    assert.equal(merged.workflowParams?.language, "en-US");
    assert.equal(merged.workflowParams?.keep, "base");
    assert.equal(merged.providerOptions?.no_cache, true);
    assert.equal(merged.providerOptions?.model, "");
  });

  it("keeps persisted normalization workflow-agnostic in domain layer", function () {
    const previous: WorkflowExecutionOptions = {
      workflowParams: {
        citekey_template: "auth.lower + '_' + year",
      },
    };
    const incoming: WorkflowExecutionOptions = {
      workflowParams: {
        citekey_template: "auth.lower + (",
      },
    };
    const merged = mergeExecutionOptions(previous, incoming);
    const normalized = normalizeSavedWorkflowSettings({
      workflowId: "custom-pass-through-workflow",
      previous,
      merged,
      incoming,
    });
    assert.equal(normalized.workflowParams?.citekey_template, "auth.lower + (");
  });

  it("keeps schema normalization workflow-id agnostic", function () {
    const manifest = {
      id: "custom-pass-through-workflow",
      label: "Custom Pass-through Workflow",
      hooks: { applyResult: "hooks/applyResult.js" },
      parameters: {
        citekey_template: {
          type: "string",
          default: "{author}_{title}_{year}",
        },
      },
    } as WorkflowManifest;
    const normalized = normalizeWorkflowParamsBySchema(manifest, {
      citekey_template: "title.unknown() + '_' + year",
    });
    assert.equal(normalized.citekey_template, "title.unknown() + '_' + year");
  });

  it("keeps non-enum string when allowCustom=true", function () {
    const manifest = {
      id: "literature-analysis",
      label: "Literature Digest",
      hooks: { applyResult: "hooks/applyResult.js" },
      parameters: {
        language: {
          type: "string",
          enum: ["zh-CN", "en-US"],
          allowCustom: true,
          default: "zh-CN",
        },
      },
    } as WorkflowManifest;
    const normalized = normalizeWorkflowParamsBySchema(manifest, {
      language: "fr-FR",
    });
    assert.equal(normalized.language, "fr-FR");
  });

  it("keeps strict enum fallback when allowCustom is false", function () {
    const manifest = {
      id: "literature-analysis",
      label: "Literature Digest",
      hooks: { applyResult: "hooks/applyResult.js" },
      parameters: {
        language: {
          type: "string",
          enum: ["zh-CN", "en-US"],
          allowCustom: false,
          default: "zh-CN",
        },
      },
    } as WorkflowManifest;
    const normalized = normalizeWorkflowParamsBySchema(manifest, {
      language: "fr-FR",
    });
    assert.equal(normalized.language, "zh-CN");
  });

  it("builds dialog initial state with run-once defaults cloned from persisted values", function () {
    const saved: WorkflowExecutionOptions = {
      backendId: "skillrunner-local",
      workflowParams: {
        language: "zh-CN",
      },
      providerOptions: {
        model: "gemini-2.5-flash",
      },
    };
    const initial = buildWorkflowSettingsDialogInitialState(saved);
    assert.equal(initial.selectedProfile, "skillrunner-local");
    assert.deepEqual(initial.persistedWorkflowParams, { language: "zh-CN" });
    assert.deepEqual(initial.runOnceWorkflowParams, { language: "zh-CN" });
    assert.deepEqual(initial.persistedProviderOptions, {
      model: "gemini-2.5-flash",
    });
    assert.deepEqual(initial.runOnceProviderOptions, {
      model: "gemini-2.5-flash",
    });
    assert.notStrictEqual(
      initial.persistedWorkflowParams,
      initial.runOnceWorkflowParams,
    );
    assert.notStrictEqual(
      initial.persistedProviderOptions,
      initial.runOnceProviderOptions,
    );
  });
});
