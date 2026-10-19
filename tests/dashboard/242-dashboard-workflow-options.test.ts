import { assert } from "chai";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { h, render } from "preact";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
  type SidebarDomEnvironment,
} from "../helpers/sidebarDomEnv";
import {
  WorkflowOptionsRegion,
  type DashboardWorkflowOptionsSelection,
  type DashboardWorkflowOptionsTexts,
  type WorkflowSettingsDescriptorView,
} from "../../src/dashboard/components/WorkflowOptionsRegion";

import {
  clearWorkflowSettings,
  buildWorkflowSettingsUiDescriptor,
  getWorkflowSettings,
  rebaseWorkflowProviderOptionsForModelProviderChange,
  resolveWorkflowSettingsSubmission,
  updateWorkflowSettings,
} from "../../src/modules/workflow/settings/workflowSettings";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import type { BackendInstance } from "../../src/backends/types";
import { createDashboardActionDispatcher } from "../../src/modules/dashboard/dashboardActions";
import { installMutablePrefsForTest } from "../mutablePrefsTestUtils";
import {
  clearSkillRunnerModelCache,
  upsertSkillRunnerModelCacheEntry,
} from "../../src/providers/skillrunner/modelCache";

type CapturedAction = { action: string; payload: Record<string, unknown> };

// The surface consumes the number-validation vendor contract from the page
// HTML; load the real vendor source into each test's jsdom window. (The
// custom-select dropdowns are now the shared Preact components in
// src/shared/customSelect.tsx and need no vendor script.)
function installDashboardVendorScripts(environment: SidebarDomEnvironment) {
  const files = ["addon/content/shared/workflow-number-validation.js"];
  for (const file of files) {
    const source = readFileSync(
      fileURLToPath(new URL(`../../${file}`, import.meta.url)),
      "utf8",
    );
    const runner = new Function("window", "document", source) as (
      window: unknown,
      document: unknown,
    ) => void;
    runner(environment.window, environment.document);
  }
}

async function flushPreactUpdates() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function makeTexts(): DashboardWorkflowOptionsTexts {
  return {
    pageTitle: "Workflow Options",
    noConfigurableText: "No configurable workflows.",
    workflowLabelText: "Workflow",
    providerLabelText: "Provider",
    profileLabelText: "Profile",
    blockedNoProfileText: "No backend profile available.",
    workflowParamsTitleText: "Workflow Parameters",
    noWorkflowParamsText: "No workflow params.",
    providerOptionsTitleText: "Provider Runtime Options",
    noProviderOptionsText: "No provider options.",
    parameterRequiredText: "This field is required.",
    numberInvalidText: "Please enter a valid number.",
    positiveIntegerRequiredText: "Please enter a positive integer.",
    noSelectableOptionsText: "No selectable options are available.",
  };
}

function makeDescriptor(): WorkflowSettingsDescriptorView {
  return {
    workflowId: "wf-1",
    workflowLabel: "Workflow One",
    providerId: "provider-x",
    requiresBackendProfile: true,
    profiles: [
      { id: "b1", label: "Backend One" },
      { id: "b2", label: "Backend Two" },
    ],
    profileEditable: true,
    profileMissing: false,
    selectedProfile: "b1",
    workflowParams: {},
    providerOptions: {},
    hostOptions: { queue: false },
    workflowSchemaEntries: [
      {
        key: "mode",
        type: "string",
        title: "Mode",
        enumValues: ["fast", "safe"],
      },
      {
        key: "hard_timeout_seconds",
        type: "number",
        title: "Timeout",
        min: 1,
        max: 60,
        integer: true,
      },
      { key: "request_timeout", type: "number", title: "Request timeout" },
      {
        key: "topic",
        type: "string",
        title: "Topic",
        required: true,
        placeholder: "topic",
      },
      {
        key: "customMode",
        type: "string",
        title: "Custom mode",
        options: [{ value: "a", label: "Option A" }],
        allowCustom: true,
        placeholder: "or custom",
      },
    ],
    providerSchemaEntries: [
      { key: "useStream", type: "boolean", title: "Stream" },
      {
        key: "streamPath",
        type: "string",
        title: "Stream path",
        visibleIfProviderOption: { key: "useStream", equals: true },
      },
    ],
  };
}

function makeSelection(
  overrides: Partial<DashboardWorkflowOptionsSelection> = {},
): DashboardWorkflowOptionsSelection {
  return {
    texts: makeTexts(),
    workflows: [
      { workflowId: "wf-1", label: "Workflow One", active: true },
      { workflowId: "wf-2", label: "Workflow Two", active: false },
    ],
    selectedWorkflowId: "wf-1",
    descriptor: makeDescriptor(),
    ...overrides,
  };
}

// ACP backend fixture: its runtime cache drives the provider and model selects.
function makeAcpBackendFixture(): BackendInstance {
  const models = [
    { id: "openai/gpt-5", label: "GPT-5" },
    { id: "openai/gpt-5-mini", label: "GPT-5 mini" },
    { id: "anthropic/claude", label: "Claude" },
  ];
  return {
    id: "acp-roundtrip",
    displayName: "ACP Roundtrip",
    type: "acp",
    baseUrl: "local://acp-roundtrip",
    acp: {
      runtimeOptionsCache: {
        refreshedAt: "2026-10-14T00:00:00.000Z",
        modes: [
          { id: "ask", label: "Ask" },
          { id: "code", label: "Code" },
        ],
        currentModeId: "ask",
        rawModels: models,
        currentRawModelId: "openai/gpt-5",
        displayModels: models,
        currentDisplayModelId: "openai/gpt-5",
        reasoningEfforts: [],
        currentReasoningEffortId: "",
      },
    },
  };
}

// ACP selection entries as the host descriptor projects them: plain selects
// whose options come from the backend runtime cache.
function makeAcpSelection(
  providerOptions: Record<string, unknown>,
): DashboardWorkflowOptionsSelection {
  return makeSelection({
    descriptor: {
      ...makeDescriptor(),
      workflowSchemaEntries: [],
      providerOptions,
      providerSchemaEntries: [
        {
          key: "acpModelProvider",
          type: "string",
          title: "ACP Model Provider",
          enumValues: ["openai", "anthropic"],
          allowUnset: true,
          observedValue: "openai",
        },
        {
          key: "acpModelId",
          type: "string",
          title: "ACP model",
          enumValues: ["openai/gpt-5", "openai/gpt-5-mini"],
          allowUnset: true,
          observedValue: "openai/gpt-5",
        },
        { key: "useStream", type: "boolean", title: "Stream" },
      ],
    },
  });
}

function dispatchCommit(input: HTMLInputElement) {
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

describe("dashboard WorkflowOptionsRegion (src/dashboard)", function () {
  let environment: SidebarDomEnvironment;

  beforeEach(function () {
    environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    installDashboardVendorScripts(environment);
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderRegion(
    selection: DashboardWorkflowOptionsSelection,
    actions: CapturedAction[],
    container?: HTMLElement,
  ): HTMLElement {
    const host = container || document.createElement("div");
    if (!host.parentNode) {
      document.body.appendChild(host);
    }
    render(
      h(WorkflowOptionsRegion, {
        selection,
        onAction: (action, payload) => {
          actions.push({ action, payload });
        },
      }),
      host,
    );
    return host;
  }

  function fieldRow(container: HTMLElement, key: string): HTMLElement {
    const row = container.querySelector<HTMLElement>(
      `[data-workflow-settings-field-key="${key}"]`,
    );
    assert.ok(row, `field row ${key} exists`);
    return row!;
  }

  for (const state of ["missing", "stale"] as const) {
    it(`shows ${state} ACP cache feedback while keeping settings editable`, async function () {
      const descriptor = {
        ...makeDescriptor(),
        runtimeCatalogCacheState: state,
        runtimeCatalogCacheNotice: "Cache needs attention",
      };
      const actions: CapturedAction[] = [];
      const container = renderRegion(makeSelection({ descriptor }), actions);
      const notice = container.querySelector(`[data-cache-state="${state}"]`);
      assert.ok(notice);
      assert.equal(
        notice!.getAttribute("role"),
        state === "missing" ? "alert" : "status",
      );
      fieldRow(container, "useStream")
        .querySelector<HTMLInputElement>("input")!
        .click();
      await flushPreactUpdates();
      assert.isTrue(
        actions.some((entry) => entry.action === "workflow-settings-draft"),
      );
    });
  }

  it("renders sub-tabs, banner, profile island and field sections", function () {
    const actions: CapturedAction[] = [];
    const container = renderRegion(makeSelection(), actions);

    const title = container.querySelector(".page-title");
    assert.equal(title?.textContent, "Workflow Options");

    const tabs = container.querySelectorAll(".workflow-subtab-btn");
    assert.equal(tabs.length, 2);
    assert.ok(tabs[0].classList.contains("active"));
    assert.notOk(tabs[1].classList.contains("active"));

    const meta = container.querySelector(".workflow-settings-meta");
    assert.equal(meta?.children[0]?.textContent, "Workflow: Workflow One");
    assert.equal(meta?.children[1]?.textContent, "Provider: provider-x");
    assert.ok(
      container.querySelector(
        ".workflow-settings-banner-profile .workflow-settings-banner-profile-select.custom-select",
      ),
      "editable profile renders the custom select",
    );

    const cards = container.querySelectorAll(".workflow-settings-card");
    assert.equal(cards.length, 2);
    assert.equal(
      cards[0].querySelector(".workflow-settings-card-title")?.textContent,
      "Workflow Parameters",
    );
    assert.equal(
      cards[1].querySelector(".workflow-settings-card-title")?.textContent,
      "Provider Runtime Options",
    );
    assert.equal(
      container.querySelectorAll(".workflow-settings-field").length,
      7,
    );

    // enum-only entry renders as a custom select.
    assert.ok(fieldRow(container, "mode").querySelector(".custom-select"));
    // number entry: min–max label suffix, numeric class and inputmode.
    const timeoutRow = fieldRow(container, "hard_timeout_seconds");
    assert.equal(
      timeoutRow.querySelector(".workflow-settings-field-label")?.textContent,
      "Timeout (1–60)",
    );
    const timeoutInput = timeoutRow.querySelector("input")!;
    assert.ok(timeoutInput.classList.contains("numeric"));
    assert.equal(timeoutInput.getAttribute("inputmode"), "numeric");
    // required entry gets the star suffix.
    assert.equal(
      fieldRow(container, "topic").querySelector(
        ".workflow-settings-field-label",
      )?.textContent,
      "Topic *",
    );
    // allowCustom entry renders the combo (island + free-text input).
    const comboRow = fieldRow(container, "customMode");
    const combo = comboRow.querySelector(".workflow-settings-field-combo");
    assert.ok(combo, "combo wrapper exists");
    assert.ok(combo!.querySelector(".custom-select"));
    assert.ok(combo!.querySelector("input.workflow-settings-field-control"));
  });

  it("emits select-workflow-settings-workflow on sub-tab click", function () {
    const actions: CapturedAction[] = [];
    const container = renderRegion(makeSelection(), actions);
    const tabs = container.querySelectorAll<HTMLButtonElement>(
      ".workflow-subtab-btn",
    );
    tabs[1].click();
    assert.deepEqual(actions, [
      {
        action: "select-workflow-settings-workflow",
        payload: { workflowId: "wf-2" },
      },
    ]);
  });

  it("emits workflow-settings-draft on checkbox toggle with normalized select defaults", async function () {
    const actions: CapturedAction[] = [];
    const container = renderRegion(makeSelection(), actions);
    const checkbox = fieldRow(
      container,
      "useStream",
    ).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.click();
    await flushPreactUpdates();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action, "workflow-settings-draft");
    assert.deepEqual(actions[0].payload, {
      workflowId: "wf-1",
      executionOptions: {
        backendId: "b1",
        // The mode select island normalized its default into the draft at
        // mount without emitting, matching the legacy render side effect.
        workflowParams: { mode: "fast" },
        providerOptions: { useStream: true },
        hostOptions: { queue: false },
      },
      changedSection: "providerOptions",
      changedKey: "useStream",
      changedOrigin: "",
    });
  });

  it("toggles provider-conditional visibility from the owning section values", async function () {
    const actions: CapturedAction[] = [];
    const container = renderRegion(makeSelection(), actions);
    const conditionalRow = fieldRow(container, "streamPath");
    assert.equal(
      conditionalRow.getAttribute(
        "data-workflow-settings-visible-provider-key",
      ),
      "useStream",
    );
    assert.equal(conditionalRow.style.display, "none");
    assert.equal(conditionalRow.getAttribute("aria-hidden"), "true");

    const checkbox = fieldRow(
      container,
      "useStream",
    ).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.click();
    await flushPreactUpdates();
    assert.equal(conditionalRow.style.display, "");
    assert.isNull(conditionalRow.getAttribute("aria-hidden"));
  });

  it("validates number fields on commit and emits parsed values", async function () {
    const actions: CapturedAction[] = [];
    const container = renderRegion(makeSelection(), actions);

    const timeoutRow = fieldRow(container, "hard_timeout_seconds");
    const timeoutInput = timeoutRow.querySelector("input")!;
    timeoutInput.value = "abc";
    dispatchCommit(timeoutInput);
    await flushPreactUpdates();
    assert.ok(
      timeoutRow.querySelector(".workflow-settings-field-error"),
      "invalid number shows the field error",
    );
    assert.ok(timeoutInput.classList.contains("invalid"));
    assert.equal(actions.length, 0, "invalid input never emits a draft");

    timeoutInput.value = "10";
    dispatchCommit(timeoutInput);
    await flushPreactUpdates();
    assert.isNull(timeoutRow.querySelector(".workflow-settings-field-error"));
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action, "workflow-settings-draft");
    const payload = actions[0].payload;
    assert.equal(payload.changedSection, "workflowParams");
    assert.equal(payload.changedKey, "hard_timeout_seconds");
    assert.equal(payload.changedOrigin, "text");
    const options = payload.executionOptions as {
      workflowParams: Record<string, unknown>;
    };
    assert.strictEqual(options.workflowParams.hard_timeout_seconds, 10);

    // Positive-integer rule: a *timeout key without bounds rejects zero.
    const requestRow = fieldRow(container, "request_timeout");
    const requestInput = requestRow.querySelector("input")!;
    requestInput.value = "0";
    dispatchCommit(requestInput);
    await flushPreactUpdates();
    assert.equal(
      requestRow.querySelector(".workflow-settings-field-error")?.textContent,
      "Please enter a positive integer.",
    );
    assert.equal(actions.length, 1, "rejected value does not emit");
  });

  it("enforces required text fields and commits on change", async function () {
    const actions: CapturedAction[] = [];
    const container = renderRegion(makeSelection(), actions);
    const topicRow = fieldRow(container, "topic");
    const topicInput = topicRow.querySelector("input")!;

    topicInput.value = "";
    dispatchCommit(topicInput);
    await flushPreactUpdates();
    assert.equal(
      topicRow.querySelector(".workflow-settings-field-error")?.textContent,
      "This field is required.",
    );
    assert.equal(actions.length, 0);

    topicInput.value = "deep reading";
    dispatchCommit(topicInput);
    await flushPreactUpdates();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].payload.changedOrigin, "text");
    const options = actions[0].payload.executionOptions as {
      workflowParams: Record<string, unknown>;
    };
    assert.equal(options.workflowParams.topic, "deep reading");
  });

  it("commits allow-custom combo text through the shared text path", async function () {
    const actions: CapturedAction[] = [];
    const container = renderRegion(makeSelection(), actions);
    const comboInput = fieldRow(container, "customMode").querySelector(
      ".workflow-settings-field-combo input",
    )! as HTMLInputElement;
    comboInput.value = "zzz";
    dispatchCommit(comboInput);
    await flushPreactUpdates();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].payload.changedKey, "customMode");
    assert.equal(actions[0].payload.changedOrigin, "text");
    const options = actions[0].payload.executionOptions as {
      workflowParams: Record<string, unknown>;
    };
    assert.equal(options.workflowParams.customMode, "zzz");
  });

  it("emits the backend draft section on profile select change", async function () {
    const actions: CapturedAction[] = [];
    const container = renderRegion(makeSelection(), actions);
    const profileSelect = container.querySelector(
      ".workflow-settings-banner-profile-select",
    )!;
    const options = profileSelect.querySelectorAll<HTMLElement>(
      ".custom-select-menu .custom-select-option",
    );
    assert.equal(options.length, 2);
    options[1].click();
    await flushPreactUpdates();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action, "workflow-settings-draft");
    assert.equal(actions[0].payload.changedSection, "backend");
    assert.equal(actions[0].payload.changedKey, "backendId");
    const executionOptions = actions[0].payload.executionOptions as {
      backendId: string;
    };
    assert.equal(executionOptions.backendId, "b2");
  });

  it("renders the empty state and skips the shell without a descriptor", function () {
    const actions: CapturedAction[] = [];
    const emptyContainer = renderRegion(
      makeSelection({
        workflows: [],
        selectedWorkflowId: "",
        descriptor: null,
      }),
      actions,
    );
    assert.equal(
      emptyContainer.querySelector(".empty")?.textContent,
      "No configurable workflows.",
    );
    assert.isNull(emptyContainer.querySelector(".workflow-subtabs"));

    const noDescriptor = renderRegion(
      makeSelection({ descriptor: null }),
      actions,
    );
    assert.ok(noDescriptor.querySelector(".workflow-subtabs"));
    assert.isNull(noDescriptor.querySelector(".workflow-settings-shell"));
  });

  it("keeps region subtree identity for equal selections and applies echo resets", async function () {
    const actions: CapturedAction[] = [];
    const onAction = (action: string, payload: Record<string, unknown>) => {
      actions.push({ action, payload });
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderSelection = (selection: DashboardWorkflowOptionsSelection) =>
      render(h(WorkflowOptionsRegion, { selection, onAction }), container);

    renderSelection(makeSelection());
    const captured = captureRegionSubtrees({ region: container });

    // Same visible content, fresh object graph: nothing is rebuilt.
    renderSelection(makeSelection());
    assertRegionSubtreesPreserved({ region: container }, captured);

    // A descriptor echo carrying committed values resets the draft and
    // remounts the shell, so field controls pick up the echoed values.
    const echoed = makeSelection({
      descriptor: {
        ...makeDescriptor(),
        workflowParams: { mode: "safe", topic: "echoed" },
      },
    });
    renderSelection(echoed);
    await flushPreactUpdates();
    const topicInput = fieldRow(container, "topic").querySelector("input")!;
    assert.equal(topicInput.value, "echoed");
    // The mode island rebuilt from the echoed value.
    const modeTrigger = fieldRow(container, "mode").querySelector(
      ".custom-select-trigger-label",
    );
    assert.equal(modeTrigger?.textContent, "safe");
  });

  it("keeps ACP selection fields unset or unknown instead of writing the first catalogue option", async function () {
    const unsetActions: CapturedAction[] = [];
    const unsetContainer = renderRegion(makeAcpSelection({}), unsetActions);
    fieldRow(unsetContainer, "useStream")
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!
      .click();
    await flushPreactUpdates();
    assert.equal(unsetActions.length, 1);
    const unsetOptions = (
      unsetActions[0].payload.executionOptions as {
        providerOptions: Record<string, unknown>;
      }
    ).providerOptions;
    assert.notProperty(unsetOptions, "acpModelProvider");
    assert.notProperty(unsetOptions, "acpModelId");
    assert.equal(
      fieldRow(unsetContainer, "acpModelId").querySelector(
        ".custom-select-trigger-label",
      )?.textContent,
      "openai/gpt-5",
      "the displayed default is a real catalog entry without creating an override",
    );
    const modelRow = fieldRow(unsetContainer, "acpModelId");
    assert.equal(modelRow.querySelectorAll(".custom-select-option").length, 2);
    (modelRow.querySelector(".custom-select-trigger") as HTMLElement).click();
    await flushPreactUpdates();
    (
      modelRow.querySelector(".custom-select-option.selected") as HTMLElement
    ).click();
    await flushPreactUpdates();
    assert.equal(
      (unsetActions.at(-1)!.payload.executionOptions as any).providerOptions
        .acpModelId,
      "openai/gpt-5",
    );

    const unknownActions: CapturedAction[] = [];
    const unknownContainer = renderRegion(
      makeAcpSelection({
        acpModelProvider: "legacy",
        acpModelId: "legacy/model",
      }),
      unknownActions,
    );
    fieldRow(unknownContainer, "useStream")
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!
      .click();
    await flushPreactUpdates();
    assert.equal(unknownActions.length, 1);
    const unknownOptions = (
      unknownActions[0].payload.executionOptions as {
        providerOptions: Record<string, unknown>;
      }
    ).providerOptions;
    assert.equal(unknownOptions.acpModelProvider, "legacy");
    assert.equal(unknownOptions.acpModelId, "legacy/model");
    assert.equal(
      fieldRow(unknownContainer, "acpModelProvider").querySelector(
        ".custom-select-trigger-label",
      )?.textContent,
      "legacy",
      "an unmatched provider keeps its own trigger label",
    );
    assert.equal(
      fieldRow(unknownContainer, "acpModelId").querySelector(
        ".custom-select-trigger-label",
      )?.textContent,
      "legacy/model",
    );
    // The stored value stays out of the menu, so it never becomes selectable.
    assert.deepEqual(
      Array.from(
        fieldRow(unknownContainer, "acpModelProvider").querySelectorAll(
          ".custom-select-option",
        ),
      ).map((option) => option.textContent),
      ["openai", "anthropic"],
    );
  });

  it("follows the host first-model rebase across repeated ACP provider switches", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "literature-analysis workflow loads");
    const candidateBackends = [makeAcpBackendFixture()];

    // The host publishes a fresh descriptor after every choice-driven change;
    // the region must follow those echoed options instead of its local draft.
    const buildSelection = async (providerOptions: Record<string, unknown>) => {
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        draft: { backendId: "acp-roundtrip", providerOptions },
        candidateBackends,
        ignoreSavedSettings: true,
        resolveDynamicOptions: false,
      });
      return makeSelection({
        workflows: [
          {
            workflowId: "literature-analysis",
            label: "Literature Analysis",
            active: true,
          },
        ],
        selectedWorkflowId: "literature-analysis",
        descriptor: descriptor as unknown as WorkflowSettingsDescriptorView,
      });
    };

    const actions: CapturedAction[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderSelection = (selection: DashboardWorkflowOptionsSelection) =>
      render(
        h(WorkflowOptionsRegion, {
          selection,
          onAction: (action, payload) => {
            actions.push({ action, payload });
          },
        }),
        container,
      );
    const emittedProviderOptions = () => {
      const last = actions[actions.length - 1];
      assert.equal(last.action, "workflow-settings-draft");
      return (
        last.payload.executionOptions as {
          providerOptions: Record<string, unknown>;
        }
      ).providerOptions;
    };
    const clickOption = async (key: string, label: string) => {
      const row = fieldRow(container, key);
      row.querySelector<HTMLElement>(".custom-select-trigger")!.click();
      await flushPreactUpdates();
      const option = Array.from(
        row.querySelectorAll<HTMLElement>(".custom-select-option"),
      ).find((entry) => entry.textContent === label);
      assert.ok(option, `${key} offers ${label}`);
      option!.click();
      await flushPreactUpdates();
    };
    const selectModelLabel = () =>
      fieldRow(container, "acpModelId").querySelector(
        ".custom-select-trigger-label",
      )?.textContent;
    const firstModelOf = (provider: string) =>
      provider === "anthropic" ? "anthropic/claude" : "openai/gpt-5";
    const switchProvider = async (provider: string, draftModel?: string) => {
      const before = actions.length;
      await clickOption("acpModelProvider", provider);
      assert.equal(actions.length, before + 1);
      const emitted = emittedProviderOptions();
      assert.equal(emitted.acpModelProvider, provider);
      // The click itself never touches the model; a model chosen for the
      // previous provider stays in the draft until the host rebase answers.
      if (draftModel === undefined) {
        assert.notProperty(emitted, "acpModelId");
      } else {
        assert.equal(emitted.acpModelId, draftModel);
      }
      const rebased = rebaseWorkflowProviderOptionsForModelProviderChange({
        workflow: workflow!,
        backendId: "acp-roundtrip",
        options: emitted,
        candidateBackends,
        changedSection: "providerOptions",
        changedKey: "acpModelProvider",
        origin: "choice",
      });
      assert.equal(rebased.acpModelId, firstModelOf(provider));
      return rebased;
    };

    renderSelection(await buildSelection({}));
    await flushPreactUpdates();
    assert.include(
      selectModelLabel(),
      "openai/gpt-5",
      "an unset model displays backend current without becoming an override",
    );

    renderSelection(await buildSelection(await switchProvider("openai")));
    await flushPreactUpdates();
    assert.equal(selectModelLabel(), "openai/gpt-5");

    await clickOption("acpModelId", "openai/gpt-5-mini");
    assert.equal(emittedProviderOptions().acpModelId, "openai/gpt-5-mini");

    renderSelection(
      await buildSelection(
        await switchProvider("anthropic", "openai/gpt-5-mini"),
      ),
    );
    await flushPreactUpdates();
    assert.equal(selectModelLabel(), "anthropic/claude");

    renderSelection(
      await buildSelection(await switchProvider("openai", "anthropic/claude")),
    );
    await flushPreactUpdates();
    assert.equal(selectModelLabel(), "openai/gpt-5");
  });

  it("saves and reopens real dashboard workflow options through the host dispatcher", async function () {
    this.timeout(10000);
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    )!;
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-roundtrip",
      baseUrl: "http://127.0.0.1:8030",
      updatedAt: new Date().toISOString(),
      engines: ["codex", "opencode", "qwen"],
      modelsByEngine: {
        codex: [
          {
            id: "gpt-5.2",
            provider_id: "openai",
            provider: "openai",
            model: "gpt-5.2",
            display_name: "GPT-5.2",
            supported_effort: ["default", "low", "high"],
          },
        ],
        opencode: [
          {
            id: "openai/gpt-5",
            provider_id: "openai",
            provider: "openai",
            model: "gpt-5",
            display_name: "GPT-5",
            supported_effort: ["default"],
          },
        ],
        qwen: [
          {
            id: "dashscope/qwen-max",
            provider_id: "dashscope",
            provider: "dashscope",
            model: "qwen-max",
            display_name: "Qwen Max",
            supported_effort: ["default"],
          },
        ],
      },
    } as any);
    const acpBackend = makeAcpBackendFixture();
    acpBackend.acp!.runtimeOptionsCache!.refreshedAt = new Date().toISOString();
    const srBackend = {
      id: "skillrunner-roundtrip",
      displayName: "SkillRunner Roundtrip",
      type: "skillrunner",
      baseUrl: "http://127.0.0.1:8030",
    } as unknown as BackendInstance;
    const restorePrefs = installMutablePrefsForTest();
    const runtime = globalThis as any;
    const previousAddon = runtime.addon;
    runtime.addon = {
      data: { workflow: { loaded: { workflows: [workflow] } } },
    };
    try {
      type RoundTripCase = {
        name: string;
        backend: BackendInstance;
        seed: Record<string, unknown>;
        toggleKey: string;
        act: "toggle" | "clear-timeout";
        mount: { timeout: string; toggle: string };
        submitted: Record<string, unknown>;
        saveState: "saved" | "error";
        saved: Record<string, unknown>;
        runtime?: Record<string, unknown>;
        runtimeError?: string;
        reopened: Record<string, unknown>;
      };
      const cases: RoundTripCase[] = [
        {
          name: "skillrunner keeps the timeout default and flips no_cache off",
          backend: srBackend,
          seed: { engine: "codex", no_cache: true },
          toggleKey: "no_cache",
          act: "toggle",
          mount: { timeout: "", toggle: "true" },
          submitted: { engine: "codex", model: "gpt-5.2", no_cache: false },
          saveState: "saved",
          saved: { engine: "codex", model: "gpt-5.2", no_cache: false },
          runtime: {
            engine: "codex",
            provider_id: "openai",
            model: "gpt-5.2",
            effort: "default",
            no_cache: false,
          },
          reopened: { engine: "codex", model: "gpt-5.2", no_cache: false },
        },
        {
          name: "skillrunner drops a cleared timeout override",
          backend: srBackend,
          seed: { engine: "codex", no_cache: true, hard_timeout_seconds: 45 },
          toggleKey: "no_cache",
          act: "clear-timeout",
          mount: { timeout: "45", toggle: "true" },
          submitted: {
            engine: "codex",
            model: "gpt-5.2",
            no_cache: true,
            hard_timeout_seconds: null,
          },
          saveState: "saved",
          saved: { engine: "codex", model: "gpt-5.2", no_cache: true },
          runtime: {
            engine: "codex",
            provider_id: "openai",
            model: "gpt-5.2",
            effort: "default",
            no_cache: true,
          },
          reopened: { engine: "codex", model: "gpt-5.2", no_cache: true },
        },
        {
          name: "acp drops a cleared timeout override",
          backend: acpBackend,
          seed: { autoApproveAcpPermissions: true, hard_timeout_seconds: 30 },
          toggleKey: "autoApproveAcpPermissions",
          act: "clear-timeout",
          mount: { timeout: "30", toggle: "true" },
          submitted: {
            autoApproveAcpPermissions: true,
            hard_timeout_seconds: null,
          },
          saveState: "saved",
          saved: { autoApproveAcpPermissions: true },
          runtime: { autoApproveAcpPermissions: true },
          reopened: { autoApproveAcpPermissions: true },
        },
        {
          name: "acp keeps an explicit false instead of dropping it",
          backend: acpBackend,
          seed: { autoApproveAcpPermissions: true },
          toggleKey: "autoApproveAcpPermissions",
          act: "toggle",
          mount: { timeout: "", toggle: "true" },
          submitted: { autoApproveAcpPermissions: false },
          saveState: "saved",
          saved: { autoApproveAcpPermissions: false },
          runtime: { autoApproveAcpPermissions: false },
          reopened: { autoApproveAcpPermissions: false },
        },
        {
          name: "acp retains an unknown provider model instead of falling back",
          backend: acpBackend,
          seed: { acpModelProvider: "legacy", acpModelId: "legacy/model" },
          toggleKey: "autoApproveAcpPermissions",
          act: "toggle",
          mount: { timeout: "", toggle: "false" },
          submitted: {
            acpModelProvider: "legacy",
            acpModelId: "legacy/model",
            autoApproveAcpPermissions: true,
          },
          saveState: "error",
          saved: { acpModelProvider: "legacy", acpModelId: "legacy/model" },
          runtimeError: "provider_profile_option_unavailable",
          reopened: { acpModelProvider: "legacy", acpModelId: "legacy/model" },
        },
      ];
      for (const testCase of cases) {
        clearWorkflowSettings(workflow.manifest.id);
        updateWorkflowSettings(workflow.manifest.id, {
          backendId: testCase.backend.id,
          providerOptionsMode: "replace",
          providerOptions: testCase.seed,
          hostOptions: { queue: { maxConcurrency: 3 } },
        });
        const descriptor = await buildWorkflowSettingsUiDescriptor({
          workflow,
          candidateBackends: [testCase.backend],
        });
        assert.equal(
          descriptor.selectedProfile,
          testCase.backend.id,
          `${testCase.name}: the case backend is the selected profile`,
        );
        const actions: CapturedAction[] = [];
        const container = renderRegion(
          makeSelection({
            workflows: [
              {
                workflowId: "literature-analysis",
                label: "Literature Analysis",
                active: true,
              },
            ],
            selectedWorkflowId: "literature-analysis",
            descriptor: descriptor as unknown as WorkflowSettingsDescriptorView,
          }),
          actions,
        );
        const timeoutRow = fieldRow(container, "hard_timeout_seconds");
        const timeoutInput = timeoutRow.querySelector("input")!;
        const toggleInput = fieldRow(
          container,
          testCase.toggleKey,
        ).querySelector('input[type="checkbox"]') as HTMLInputElement;
        assert.equal(
          timeoutInput.value,
          testCase.mount.timeout,
          `${testCase.name}: mounted timeout`,
        );
        assert.equal(
          String(toggleInput.checked),
          testCase.mount.toggle,
          `${testCase.name}: mounted ${testCase.toggleKey}`,
        );
        if (testCase.act === "clear-timeout") {
          timeoutInput.value = "";
          dispatchCommit(timeoutInput);
        } else {
          toggleInput.click();
        }
        await flushPreactUpdates();
        assert.lengthOf(actions, 1, `${testCase.name}: one draft action`);
        const emitted = actions.at(-1)!;
        assert.equal(emitted.action, "workflow-settings-draft");
        assert.equal(emitted.payload.workflowId, workflow.manifest.id);
        const submitted = emitted.payload.executionOptions as {
          providerOptions: Record<string, unknown>;
          hostOptions: Record<string, unknown>;
        };
        assert.deepEqual(
          submitted.providerOptions,
          testCase.submitted,
          `${testCase.name}: the controls submit the explicit bag`,
        );
        assert.deepEqual(submitted.hostOptions, {
          queue: { maxConcurrency: 3 },
        });
        const timers: Array<() => void> = [];
        const state = {
          backends: [testCase.backend],
          workflowSettingsDraftById: new Map(),
          workflowSettingsSaveStateById: new Map(),
          workflowSettingsSaveErrorById: new Map(),
          workflowSettingsSaveTimerById: new Map(),
        };
        const dispatch = createDashboardActionDispatcher({
          state: state as any,
          refresh: () => {},
          invalidateHomeWorkflowSummaries: () => {},
          getRuntimeWindow: () =>
            ({
              setTimeout: (callback: () => void) => {
                timers.push(callback);
                return timers.length;
              },
              clearTimeout: () => {},
            }) as any,
        } as any);
        await dispatch({
          type: "dashboard:action",
          action: emitted.action,
          payload: emitted.payload,
        } as any);
        // The debounced save is faked: only the last scheduled callback runs,
        // so the round trip never waits for the real 420 ms timer.
        assert.isAbove(
          timers.length,
          0,
          `${testCase.name}: a debounced save is scheduled`,
        );
        timers.at(-1)!();
        const savedOptions = getWorkflowSettings(workflow.manifest.id);
        assert.equal(
          state.workflowSettingsSaveStateById.get(workflow.manifest.id),
          testCase.saveState,
          `${testCase.name}: host save state`,
        );
        assert.equal(savedOptions.backendId, testCase.backend.id);
        assert.deepEqual(
          savedOptions.providerOptions,
          testCase.saved,
          `${testCase.name}: persisted explicit bag`,
        );
        assert.deepEqual(savedOptions.hostOptions, {
          queue: { maxConcurrency: 3 },
        });
        if (testCase.runtimeError) {
          let failure: { code?: string } | undefined;
          try {
            resolveWorkflowSettingsSubmission({
              workflow,
              backend: testCase.backend,
              settings: savedOptions,
            });
          } catch (error) {
            failure = error as { code?: string };
          }
          assert.equal(
            failure?.code,
            testCase.runtimeError,
            `${testCase.name}: the invalid explicit value is rejected, never replaced`,
          );
        } else {
          assert.deepEqual(
            resolveWorkflowSettingsSubmission({
              workflow,
              backend: testCase.backend,
              settings: savedOptions,
            }).runtimeProviderOptions,
            testCase.runtime,
            `${testCase.name}: runtime projection`,
          );
        }
        const reopened = await buildWorkflowSettingsUiDescriptor({
          workflow,
          candidateBackends: [testCase.backend],
        });
        assert.equal(reopened.selectedProfile, testCase.backend.id);
        assert.deepEqual(
          reopened.providerOptions,
          testCase.reopened,
          `${testCase.name}: reopened explicit bag`,
        );
        assert.deepEqual(reopened.hostOptions, {
          queue: { maxConcurrency: 3 },
        });
        // A fresh mount of the reopened descriptor: the persisted bag is what
        // the form shows when the settings page is opened again.
        const reopenContainer = renderRegion(
          makeSelection({
            workflows: [
              {
                workflowId: "literature-analysis",
                label: "Literature Analysis",
                active: true,
              },
            ],
            selectedWorkflowId: "literature-analysis",
            descriptor: reopened as unknown as WorkflowSettingsDescriptorView,
          }),
          [],
        );
        await flushPreactUpdates();
        assert.equal(
          fieldRow(reopenContainer, "hard_timeout_seconds").querySelector(
            "input",
          )!.value,
          "",
          `${testCase.name}: a cleared timeout never comes back`,
        );
        assert.equal(
          (
            fieldRow(reopenContainer, testCase.toggleKey).querySelector(
              'input[type="checkbox"]',
            ) as HTMLInputElement
          ).checked,
          Boolean(testCase.reopened[testCase.toggleKey]),
          `${testCase.name}: the reopened form shows the persisted value`,
        );
      }
    } finally {
      clearWorkflowSettings(workflow.manifest.id);
      clearSkillRunnerModelCache();
      runtime.addon = previousAddon;
      restorePrefs();
    }
  });
});
