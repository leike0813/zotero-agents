import { assert } from "chai";
import {
  WORKFLOW_SETTINGS_SCHEMA_VERSION,
  buildWorkflowSettingsDialogInitialState,
  createWorkflowSettingsDocument,
  mergeExecutionOptions,
  assertRequiredWorkflowParameters,
  listMissingRequiredWorkflowParameters,
  normalizeSavedWorkflowSettings,
  normalizeHostQueueMaxConcurrency,
  normalizeWorkflowParamsBySchema,
  parseExecutionOptionsPatch,
  parseSettingsRecord,
  rebaseProviderOptionsForBackendChange,
  serializeSettingsRecord,
  type WorkflowExecutionOptions,
} from "../../src/modules/workflowSettingsDomain";
import type { WorkflowManifest } from "../../src/workflows/types";
import type { ProviderRuntimeOptionSchema } from "../../src/providers/types";
import { AcpProvider } from "../../src/providers/acp/provider";
import { SkillRunnerProvider } from "../../src/providers/skillrunner/provider";

describe("workflow settings domain", function () {
  it("classifies backend identity fields separately from workflow behavior options", function () {
    for (const { schema, backendKeys, workflowKeys } of [
      {
        schema: new AcpProvider().getRuntimeOptionSchema(),
        backendKeys: [
          "acpModeId",
          "acpModelProvider",
          "acpModelId",
          "acpReasoningEffort",
        ],
        workflowKeys: ["autoApproveAcpPermissions", "hard_timeout_seconds"],
      },
      {
        schema: new SkillRunnerProvider().getRuntimeOptionSchema(),
        backendKeys: ["engine", "provider_id", "model", "effort"],
        workflowKeys: [
          "no_cache",
          "interactive_auto_reply",
          "interactive_reply_timeout_sec",
          "hard_timeout_seconds",
        ],
      },
    ]) {
      assert.deepEqual(
        backendKeys.filter((key) => schema[key]?.retention !== "backend"),
        [],
      );
      assert.deepEqual(
        workflowKeys.filter((key) => schema[key]?.retention !== "workflow"),
        [],
      );
    }
  });

  it("drops backend-scoped and foreign provider options when backend identity changes", function () {
    const schema: ProviderRuntimeOptionSchema = {
      acpModeId: { type: "string", retention: "backend" },
      acpModelProvider: { type: "string", retention: "backend" },
      acpModelId: { type: "string", retention: "backend" },
      acpReasoningEffort: { type: "string", retention: "backend" },
      autoApproveAcpPermissions: { type: "boolean", retention: "workflow" },
      hard_timeout_seconds: { type: "number", retention: "workflow" },
    };

    const rebased = rebaseProviderOptionsForBackendChange({
      previousBackendId: "acp-kilo",
      nextBackendId: "acp-opencode",
      targetSchema: schema,
      options: {
        acpModeId: "code",
        acpModelProvider: "openai",
        acpModelId: "gpt-5-codex",
        acpRawModelId: "gpt-5-codex@high",
        acpReasoningEffort: "high",
        autoApproveAcpPermissions: true,
        hard_timeout_seconds: 900,
        engine: "opencode",
      },
    });

    assert.deepEqual(rebased, {
      autoApproveAcpPermissions: true,
      hard_timeout_seconds: 900,
    });
  });

  it("preserves backend-scoped options while the backend owner is unchanged", function () {
    const schema: ProviderRuntimeOptionSchema = {
      acpModeId: { type: "string", retention: "backend" },
      hard_timeout_seconds: { type: "number", retention: "workflow" },
    };
    assert.deepEqual(
      rebaseProviderOptionsForBackendChange({
        previousBackendId: "acp-kilo",
        nextBackendId: "acp-kilo",
        targetSchema: schema,
        options: { acpModeId: "code", hard_timeout_seconds: 900 },
      }),
      { acpModeId: "code", hard_timeout_seconds: 900 },
    );
  });

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

  it("treats null and undefined option overrides as explicit clears", function () {
    const base: WorkflowExecutionOptions = {
      workflowParams: {
        language: "zh-CN",
        keep: "base",
      },
      providerOptions: {
        hard_timeout_seconds: 5,
        model: "gemini-2.5-flash",
      },
    };
    const override: WorkflowExecutionOptions = {
      workflowParams: {
        language: null,
      },
      providerOptions: {
        hard_timeout_seconds: null,
        model: undefined,
      },
    };

    const merged = mergeExecutionOptions(base, override);
    assert.notProperty(merged.workflowParams, "language");
    assert.equal(merged.workflowParams?.keep, "base");
    assert.notProperty(merged.providerOptions, "hard_timeout_seconds");
    assert.notProperty(merged.providerOptions, "model");
  });

  it("normalizes Host queue maximum concurrency through one domain contract", function () {
    const cases: Array<{
      input: unknown;
      status: "valid" | "invalid";
      value?: number;
    }> = [
      { input: undefined, status: "valid" },
      { input: null, status: "valid" },
      { input: "", status: "valid" },
      { input: "   ", status: "valid" },
      { input: 0, status: "valid" },
      { input: "0", status: "valid" },
      { input: 1, status: "valid", value: 1 },
      { input: "3", status: "valid", value: 3 },
      { input: -1, status: "invalid" },
      { input: 1.5, status: "invalid" },
      { input: "not-a-number", status: "invalid" },
      { input: Number.NaN, status: "invalid" },
      { input: Number.POSITIVE_INFINITY, status: "invalid" },
      { input: Number.MAX_SAFE_INTEGER + 1, status: "invalid" },
    ];

    for (const testCase of cases) {
      const result = normalizeHostQueueMaxConcurrency(testCase.input);
      assert.equal(result.status, testCase.status);
      if (result.status === "valid") {
        assert.equal(result.maxConcurrency, testCase.value);
      }
    }
  });

  it("persists positive Host limits and treats explicit zero as clearing", function () {
    const base: WorkflowExecutionOptions = {
      hostOptions: {
        queue: {
          maxConcurrency: 4,
        },
      },
    };
    assert.deepEqual(
      mergeExecutionOptions(base, {
        hostOptions: { queue: { maxConcurrency: 2 } },
      }).hostOptions,
      { queue: { maxConcurrency: 2 } },
    );
    assert.deepEqual(
      mergeExecutionOptions(base, {
        hostOptions: { queue: { maxConcurrency: 0 } },
      }).hostOptions,
      {},
    );
    assert.deepEqual(mergeExecutionOptions(base, {}).hostOptions, {
      queue: { maxConcurrency: 4 },
    });
  });

  it("ignores invalid stored Host limits and rejects invalid patches", function () {
    const parsed = parseSettingsRecord({
      schemaVersion: 1,
      workflows: {
        legacy: {
          workflowParams: { language: "zh-CN" },
          hostOptions: { queue: { maxConcurrency: -2 } },
        },
      },
    });
    assert.deepEqual(parsed.legacy?.workflowParams, { language: "zh-CN" });
    assert.deepEqual(parsed.legacy?.hostOptions, {});
    assert.throws(
      () =>
        parseExecutionOptionsPatch({
          hostOptions: { queue: { maxConcurrency: 1.5 } },
        }),
      /maximum concurrency/i,
    );
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

  it("normalizes string-array workflow parameters without losing non-Latin values", function () {
    const manifest = {
      id: "multilingual-search",
      label: "Multilingual Search",
      hooks: { applyResult: "hooks/applyResult.js" },
      parameters: {
        languageHints: {
          type: "array",
          items: { type: "string" },
          default: [],
        },
      },
    } as WorkflowManifest;

    assert.deepEqual(
      normalizeWorkflowParamsBySchema(manifest, {
        languageHints: [" zh-CN ", "日本語", "zh-CN", 42],
      }).languageHints,
      ["zh-CN", "日本語"],
    );
  });

  it("validates required workflow parameters without rejecting false or zero", function () {
    const manifest = {
      id: "required-contract",
      label: "Required Contract",
      hooks: { applyResult: "hooks/applyResult.js" },
      parameters: {
        scope: { type: "string", required: true },
        enabled: { type: "boolean", required: true },
        count: { type: "number", required: true },
        optional: { type: "string" },
      },
    } as WorkflowManifest;

    assert.deepEqual(
      listMissingRequiredWorkflowParameters(manifest, {
        scope: "   ",
        enabled: false,
        count: 0,
      }),
      ["scope"],
    );
    assert.throws(
      () =>
        assertRequiredWorkflowParameters(manifest, {
          scope: "",
          enabled: false,
          count: 0,
        }),
      /scope/,
    );
    assert.doesNotThrow(() =>
      assertRequiredWorkflowParameters(manifest, {
        scope: "research scope",
        enabled: false,
        count: 0,
      }),
    );
  });

  it("requires only workflow parameters whose boolean visibility condition is active", function () {
    const manifest = {
      id: "conditional-required-contract",
      label: "Conditional Required Contract",
      hooks: { applyResult: "hooks/applyResult.js" },
      parameters: {
        usePlannedTopic: {
          type: "boolean",
          required: true,
          default: true,
        },
        plannedTopicId: {
          type: "string",
          required: true,
          visible_if: { parameter: "usePlannedTopic", equals: true },
        },
        topicSeed: {
          type: "string",
          required: true,
          visible_if: { parameter: "usePlannedTopic", equals: false },
        },
      },
    } as WorkflowManifest;

    assert.deepEqual(
      listMissingRequiredWorkflowParameters(manifest, {
        usePlannedTopic: true,
      }),
      ["plannedTopicId"],
    );
    assert.deepEqual(
      listMissingRequiredWorkflowParameters(manifest, {
        usePlannedTopic: false,
      }),
      ["topicSeed"],
    );
    assert.deepEqual(
      listMissingRequiredWorkflowParameters(manifest, {
        usePlannedTopic: true,
        plannedTopicId: "topic:planned",
      }),
      [],
    );
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

  it("parses legacy unversioned settings record", function () {
    const parsed = parseSettingsRecord({
      "literature-analysis": {
        backendId: " skillrunner-primary ",
        workflowParams: {
          language: "zh-CN",
        },
        providerOptions: {
          engine: "codex",
        },
      },
    });

    assert.deepEqual(parsed, {
      "literature-analysis": {
        backendId: "skillrunner-primary",
        workflowParams: {
          language: "zh-CN",
        },
        providerOptions: {
          engine: "codex",
        },
      },
    });
  });

  it("parses and serializes versioned settings document", function () {
    const record = {
      "literature-analysis": {
        backendId: "skillrunner-primary",
        workflowParams: {
          language: "en-US",
        },
        providerOptions: {
          model: "gpt-5",
        },
      },
    };
    const document = createWorkflowSettingsDocument(record);
    assert.equal(WORKFLOW_SETTINGS_SCHEMA_VERSION, 2);
    assert.equal(document.schemaVersion, WORKFLOW_SETTINGS_SCHEMA_VERSION);
    assert.deepEqual(document.workflows, record);

    const serialized = serializeSettingsRecord(record);
    const persisted = JSON.parse(serialized) as {
      schemaVersion?: number;
      workflows?: unknown;
    };
    assert.equal(persisted.schemaVersion, WORKFLOW_SETTINGS_SCHEMA_VERSION);
    assert.deepEqual(parseSettingsRecord(persisted), record);
  });

  it("treats malformed settings payloads as empty settings", function () {
    assert.deepEqual(parseSettingsRecord(null), {});
    assert.deepEqual(parseSettingsRecord([]), {});
    assert.deepEqual(
      parseSettingsRecord({
        schemaVersion: 1,
        workflows: [],
      }),
      {},
    );
  });
});
