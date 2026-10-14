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
  WorkflowSettingsDialogRegion,
  projectWorkflowSettingsDialogSelection,
  workflowSettingsDialogStructureKey,
  type WorkflowSettingsDialogSelection,
} from "../../src/dashboard/components/WorkflowSettingsDialogRegion";
import { bootstrapWorkflowSettingsDialogApp } from "../../src/dashboard/workflowSettingsDialogApp";
import {
  buildWorkflowSettingsUiDescriptor,
  rebaseWorkflowProviderOptionsForModelProviderChange,
} from "../../src/modules/workflow/settings/workflowSettings";
import { loadWorkflowManifests } from "../../src/workflows/loader";
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

function makeLabels(): Record<string, string> {
  return {
    title: "Workflow Settings",
    workflowLabel: "Workflow",
    providerLabel: "Provider",
    profileLabel: "Profile",
    noProfiles: "No profiles.",
    blockedNoProfile: "No backend profile available.",
    workflowParamsTitle: "Workflow Parameters",
    noWorkflowParams: "No workflow params.",
    runOptionsTitle: "Run Options",
    noRunOptions: "No run options.",
    providerOptionsTitle: "Provider Runtime Options",
    noProviderOptions: "No provider options.",
    workflowExecutionUnitsTitle: "Execution Units",
    workflowExecutionUnitsUnavailable: "Execution units unavailable.",
    workflowHostOptionsTitle: "Host Options",
    workflowMaximumConcurrencyLabel: "Maximum concurrency",
    workflowMaximumConcurrencyUnlimited: "Unlimited",
    workflowMaximumConcurrencyInvalid: "Enter a non-negative integer.",
    persistLabel: "Remember these settings",
    refreshAcpRuntimeCache: "Refresh runtime cache",
    refreshAcpRuntimeCacheRunning: "Refreshing runtime…",
    refreshSkillRunnerModelCache: "Refresh model cache",
    refreshSkillRunnerModelCacheRunning: "Refreshing models…",
    cancelLabel: "Cancel",
    confirmLabel: "Confirm",
    workflowSettingsParameterRequired: "This field is required.",
    workflowSettingsNumberInvalid: "Please enter a valid number.",
    workflowSettingsPositiveIntegerRequired: "Please enter a positive integer.",
  };
}

function makeSnapshot(): Record<string, unknown> {
  return {
    title: "Workflow Settings — Workflow One",
    labels: makeLabels(),
    workflow: { id: "wf-1", label: "Workflow One", providerId: "provider-x" },
    form: {
      requiresBackendProfile: true,
      profileEditable: true,
      profileMissing: false,
      profiles: [
        { id: "b1", label: "Backend One" },
        { id: "b2", label: "Backend Two" },
      ],
      selectedProfile: "b1",
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
          key: "streamNote",
          type: "string",
          title: "Stream note",
          visibleIfProviderOption: { key: "useStream", equals: true },
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
      runSchemaEntries: [
        { key: "retries", type: "number", title: "Retries", integer: true },
      ],
      workflowParams: {},
      providerOptions: {},
      runOptions: {},
      hostOptions: { queueSupported: true, maxConcurrency: 2 },
      executionUnitPreview: {
        status: "success",
        units: [{ unitId: "u1", taskName: "Task A", memberCount: 3 }],
      },
      layout: {
        mode: "multi-unit",
        showExecutionUnitPreview: true,
        showHostMaximumConcurrency: true,
      },
      canRefreshAcpRuntimeCache: true,
      canRefreshSkillRunnerModelCache: true,
    },
    persistChecked: true,
  };
}

function dispatchCommit(input: HTMLInputElement) {
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

describe("dashboard WorkflowSettingsDialogRegion (src/dashboard)", function () {
  let environment: SidebarDomEnvironment;
  let snapshotRevision = 0;

  beforeEach(function () {
    environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    installDashboardVendorScripts(environment);
  });

  afterEach(function () {
    clearSkillRunnerModelCache();
    restoreSidebarDomGlobals();
  });

  it("displays observed ACP current without submitting it as an explicit override", async function () {
    const snapshot = makeSnapshot() as any;
    snapshot.form.workflowSchemaEntries = [];
    snapshot.form.providerSchemaEntries = [
      {
        key: "acpModeId",
        type: "string",
        enumValues: ["default"],
        observedValue: "default",
        allowUnset: true,
      },
    ];
    const actions: CapturedAction[] = [];
    const container = renderDialog(snapshot, actions);
    assert.include(
      fieldRow(container, "acpModeId").querySelector(".custom-select-trigger")!
        .textContent,
      "default",
    );
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    assert.notProperty(
      (actions.at(-1)!.payload.executionOptions as any).providerOptions,
      "acpModeId",
    );
  });

  function projectSelection(
    raw: unknown,
    revision?: number,
  ): WorkflowSettingsDialogSelection {
    snapshotRevision =
      typeof revision === "number" ? revision : snapshotRevision + 1;
    const selection = projectWorkflowSettingsDialogSelection(
      raw,
      snapshotRevision,
    );
    assert.ok(selection, "snapshot projects to a selection");
    return selection!;
  }

  function renderDialog(
    raw: unknown,
    actions: CapturedAction[],
    container?: HTMLElement,
  ): HTMLElement {
    const host = container || document.createElement("div");
    if (!host.parentNode) {
      document.body.appendChild(host);
    }
    render(
      h(WorkflowSettingsDialogRegion, {
        selection: projectSelection(raw),
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

  function footerButton(
    container: HTMLElement,
    text: string,
  ): HTMLButtonElement {
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".settings-actions button"),
    );
    const match = buttons.find((button) => button.textContent === text);
    assert.ok(match, `footer button "${text}" exists`);
    return match!;
  }

  it("keeps missing reasoning disabled and unspecified without blocking confirmation", async function () {
    const snapshot = makeSnapshot();
    const form = snapshot.form as any;
    form.workflowSchemaEntries = [];
    form.providerSchemaEntries = [
      {
        key: "acpReasoningEffort",
        type: "string",
        allowUnset: true,
        enumValues: [],
        disabled: true,
      },
    ];
    form.providerOptions = {};
    form.runtimeCatalogState = "unknown";
    const actions: CapturedAction[] = [];
    const container = renderDialog(snapshot, actions);
    const row = fieldRow(container, "acpReasoningEffort");
    assert.isTrue(row.querySelector<HTMLInputElement>("input")!.disabled);
    assert.lengthOf(row.querySelectorAll(".custom-select-option"), 0);
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    const update = actions.find((entry) => entry.action === "confirm");
    assert.ok(update);
    assert.notProperty(
      (update!.payload.executionOptions as any).providerOptions,
      "acpReasoningEffort",
    );
  });

  it("accepts host removal of stale reasoning even when the catalog shape is unchanged", async function () {
    const snapshot = makeSnapshot() as any;
    snapshot.form.workflowSchemaEntries = [];
    snapshot.form.providerSchemaEntries = [
      {
        key: "acpModelId",
        type: "string",
        enumValues: ["p/a", "p/b"],
        allowUnset: true,
        observedValue: "p/a",
      },
      {
        key: "acpReasoningEffort",
        type: "string",
        enumValues: ["high"],
        allowUnset: true,
        observedValue: "high",
      },
      { key: "hard_timeout_seconds", type: "number" },
    ];
    snapshot.form.providerOptions = {
      acpModelId: "p/a",
      acpReasoningEffort: "high",
    };
    const actions: CapturedAction[] = [];
    const container = renderDialog(snapshot, actions);
    const modelRow = fieldRow(container, "acpModelId");
    (modelRow.querySelector(".custom-select-trigger") as HTMLElement).click();
    await flushPreactUpdates();
    (
      modelRow.querySelectorAll(".custom-select-option")[1] as HTMLElement
    ).click();
    await flushPreactUpdates();
    const timeout = fieldRow(container, "hard_timeout_seconds").querySelector(
      "input",
    )!;
    timeout.value = "99";
    timeout.dispatchEvent(new window.Event("input", { bubbles: true }));
    const echo = structuredClone(snapshot);
    echo.form.providerOptions = { acpModelId: "p/b" };
    renderDialog(echo, actions, container);
    await flushPreactUpdates();
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    const confirmed = actions.findLast((entry) => entry.action === "confirm")!;
    assert.notProperty(
      (confirmed.payload.executionOptions as any).providerOptions,
      "acpReasoningEffort",
    );
    assert.equal(
      (confirmed.payload.executionOptions as any).providerOptions
        .hard_timeout_seconds,
      99,
    );
  });

  it("renders banner, multi-unit column, sections and footer", function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);

    const meta = container.querySelector(".settings-meta");
    assert.equal(meta?.children[0]?.textContent, "Workflow: Workflow One");
    assert.equal(meta?.children[1]?.textContent, "Provider: provider-x");
    assert.ok(
      container.querySelector(
        ".settings-banner-profile .settings-banner-profile-select.custom-select",
      ),
      "editable profile renders the custom select",
    );

    const layout = container.querySelector(".settings-content-layout");
    assert.ok(layout?.classList.contains("has-multi-unit-region"));
    const multiUnitColumn = container.querySelector(
      ".settings-multi-unit-column",
    );
    assert.ok(multiUnitColumn, "multi-unit column exists");
    const preview = multiUnitColumn!.querySelector(
      ".workflow-execution-unit-preview",
    );
    assert.equal(
      preview?.querySelector(".settings-card-title")?.textContent,
      "Execution Units",
    );
    const unitRow = preview?.querySelector(".workflow-execution-unit-row");
    assert.equal(
      unitRow?.querySelector(".workflow-execution-unit-task")?.textContent,
      "Task A",
    );
    assert.equal(
      unitRow?.querySelector(".workflow-execution-unit-input")?.textContent,
      "×3",
    );
    const hostInput = multiUnitColumn!.querySelector<HTMLInputElement>(
      "#workflow-host-max-concurrency",
    );
    assert.ok(hostInput, "host concurrency input exists");
    assert.equal(hostInput!.value, "2");
    assert.equal(hostInput!.getAttribute("inputmode"), "numeric");
    assert.equal(
      hostInput!.getAttribute("data-workflow-settings-control-key"),
      "hostOptions.queue.maxConcurrency",
    );
    const hostLabel = multiUnitColumn!.querySelector<HTMLLabelElement>(
      'label[for="workflow-host-max-concurrency"]',
    );
    assert.equal(hostLabel?.textContent, "Maximum concurrency");

    const gridCards = container.querySelectorAll(
      ".settings-grid .settings-card",
    );
    assert.equal(gridCards.length, 3);
    assert.equal(
      gridCards[0].querySelector(".settings-card-title")?.textContent,
      "Workflow Parameters",
    );
    assert.equal(
      gridCards[1].querySelector(".settings-card-title")?.textContent,
      "Run Options",
    );
    assert.equal(
      gridCards[2].querySelector(".settings-card-title")?.textContent,
      "Provider Runtime Options",
    );
    assert.ok(gridCards[2].classList.contains("settings-card-fill"));

    // Dialog chrome: label is a div, controls are wrapped in field-input-col
    // and carry section/key anchors.
    const topicRow = fieldRow(container, "topic");
    assert.equal(
      topicRow.getAttribute("data-workflow-settings-field-section"),
      "workflowParams",
    );
    assert.ok(topicRow.querySelector("div.field-label"));
    assert.equal(
      topicRow.querySelector("div.field-label")?.textContent,
      "Topic *",
    );
    const topicInput = topicRow.querySelector("input")!;
    assert.equal(
      topicInput.getAttribute("data-workflow-settings-control-key"),
      "workflowParams.topic",
    );
    assert.ok(
      topicInput.required,
      "required entry sets the required attribute",
    );
    assert.ok(topicInput.closest(".field-input-col"));
    // The dialog's bare boolean control.
    const streamCheckbox = fieldRow(
      container,
      "useStream",
    ).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    assert.ok(streamCheckbox.classList.contains("field-checkbox-control"));

    const persist = container.querySelector<HTMLInputElement>(
      ".settings-footer .field-checkbox input",
    )!;
    assert.ok(persist.checked);
    assert.equal(footerButton(container, "Cancel").className, "settings-btn");
    assert.ok(footerButton(container, "Confirm").classList.contains("primary"));
    assert.equal(
      actions.filter((entry) => entry.action === "resize-to-content").length,
      0,
      "jsdom layout is zero-height, so no resize action is emitted",
    );
  });

  it("emits update-draft on checkbox toggle with five-section execution options", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);
    const checkbox = fieldRow(
      container,
      "useStream",
    ).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.click();
    await flushPreactUpdates();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action, "update-draft");
    assert.deepEqual(actions[0].payload, {
      executionOptions: {
        backendId: "b1",
        // The mode select island normalized its default into the draft at
        // mount without emitting, matching the legacy render side effect.
        workflowParams: { mode: "fast" },
        providerOptions: { useStream: true },
        runOptions: {},
        hostOptions: { queue: { maxConcurrency: 2 } },
      },
      changedSection: "providerOptions",
      changedKey: "useStream",
      changedOrigin: "",
    });
  });

  it("evaluates conditional visibility against provider options across sections", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);
    // streamNote lives in workflowParams but keys off a providerOptions flag.
    const crossSectionRow = fieldRow(container, "streamNote");
    assert.equal(crossSectionRow.style.display, "none");
    assert.equal(crossSectionRow.getAttribute("aria-hidden"), "true");

    const checkbox = fieldRow(
      container,
      "useStream",
    ).querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.click();
    await flushPreactUpdates();
    assert.equal(crossSectionRow.style.display, "");
    assert.isNull(crossSectionRow.getAttribute("aria-hidden"));
  });

  it("validates number fields on commit and emits parsed values", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);

    const timeoutRow = fieldRow(container, "hard_timeout_seconds");
    const timeoutInput = timeoutRow.querySelector("input")!;
    timeoutInput.value = "abc";
    dispatchCommit(timeoutInput);
    await flushPreactUpdates();
    assert.ok(
      timeoutRow.querySelector(".field-error")?.textContent,
      "invalid number shows the field error",
    );
    assert.ok(timeoutInput.classList.contains("invalid"));
    assert.equal(actions.length, 0, "invalid input never emits a draft");

    timeoutInput.value = "10";
    dispatchCommit(timeoutInput);
    await flushPreactUpdates();
    assert.isNull(timeoutRow.querySelector(".field-error"));
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action, "update-draft");
    assert.equal(actions[0].payload.changedSection, "workflowParams");
    assert.equal(actions[0].payload.changedKey, "hard_timeout_seconds");
    assert.equal(actions[0].payload.changedOrigin, "text");
    const options = actions[0].payload.executionOptions as {
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
      requestRow.querySelector(".field-error")?.textContent,
      "Please enter a positive integer.",
    );
    assert.equal(actions.length, 1, "rejected value does not emit");
  });

  it("flushes pending control edits before confirm and aborts on invalid values", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);

    // Type without dispatching input/change: the draft only learns about the
    // value when confirm drains the control committers.
    const topicInput = fieldRow(container, "topic").querySelector("input")!;
    topicInput.value = "deep reading";
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    assert.equal(actions.length, 1, "silent flush does not emit update-draft");
    assert.equal(actions[0].action, "confirm");
    const options = actions[0].payload.executionOptions as {
      workflowParams: Record<string, unknown>;
    };
    assert.equal(options.workflowParams.topic, "deep reading");

    // An invalid uncommitted number aborts confirm entirely.
    const timeoutInput = fieldRow(
      container,
      "hard_timeout_seconds",
    ).querySelector("input")!;
    timeoutInput.value = "abc";
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    assert.equal(
      actions.length,
      1,
      "no confirm action while a field is invalid",
    );
    assert.ok(
      fieldRow(container, "hard_timeout_seconds").querySelector(".field-error"),
    );
  });

  it("commits host queue concurrency through the hostOptions section", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);
    const hostInput = container.querySelector<HTMLInputElement>(
      "#workflow-host-max-concurrency",
    )!;

    hostInput.value = "5";
    dispatchCommit(hostInput);
    await flushPreactUpdates();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action, "update-draft");
    assert.equal(actions[0].payload.changedSection, "hostOptions");
    assert.equal(actions[0].payload.changedKey, "queue.maxConcurrency");
    const options = actions[0].payload.executionOptions as {
      hostOptions: Record<string, unknown>;
    };
    assert.deepEqual(options.hostOptions, { queue: { maxConcurrency: 5 } });

    // Non-negative integers only; an invalid value surfaces the inline error
    // and blocks confirm.
    hostInput.value = "-1";
    dispatchCommit(hostInput);
    await flushPreactUpdates();
    assert.equal(actions.length, 1, "invalid host value does not emit");
    assert.equal(hostInput.getAttribute("aria-invalid"), "true");
    const hostCard = container.querySelector(".workflow-host-options")!;
    assert.isFalse(
      (hostCard.querySelector(".field-error") as HTMLElement).hidden,
    );
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    assert.equal(
      actions.length,
      1,
      "confirm aborts while host value is invalid",
    );
  });

  it("emits toggle-persist with the checkbox state", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);
    const persist = container.querySelector<HTMLInputElement>(
      ".settings-footer .field-checkbox input",
    )!;
    persist.click();
    await flushPreactUpdates();
    assert.deepEqual(actions, [
      { action: "toggle-persist", payload: { checked: false } },
    ]);
  });

  it("marks refresh buttons busy until the next snapshot arrives", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);
    // The required topic field must hold a valid value: refresh, like
    // confirm, first drains the control committers and aborts on errors.
    const topicInput = fieldRow(container, "topic").querySelector("input")!;
    topicInput.value = "prefill";
    dispatchCommit(topicInput);
    await flushPreactUpdates();
    assert.equal(actions.length, 1);
    assert.equal(actions[0].action, "update-draft");

    const refresh = footerButton(container, "Refresh runtime cache");
    refresh.click();
    await flushPreactUpdates();
    assert.equal(actions.length, 2);
    assert.equal(actions[1].action, "refresh-acp-runtime-cache");
    const options = actions[1].payload.executionOptions as {
      backendId: string;
      workflowParams: Record<string, unknown>;
    };
    assert.equal(options.backendId, "b1");
    assert.equal(options.workflowParams.topic, "prefill");

    const busy = footerButton(container, "Refreshing runtime…");
    assert.ok(busy.disabled);
    assert.ok(busy.classList.contains("is-busy"));
    assert.equal(busy.getAttribute("aria-busy"), "true");

    // Any host snapshot (even equal content) resets the busy state.
    renderDialog(makeSnapshot(), actions, container);
    await flushPreactUpdates();
    const reset = footerButton(container, "Refresh runtime cache");
    assert.isFalse(reset.disabled);
    assert.equal(reset.getAttribute("aria-busy"), "false");
  });

  it("blocks equal selections by signature and keeps the draft across content updates", async function () {
    const actions: CapturedAction[] = [];
    const onAction = (action: string, payload: Record<string, unknown>) => {
      actions.push({ action, payload });
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderSelection = (selection: WorkflowSettingsDialogSelection) =>
      render(
        h(WorkflowSettingsDialogRegion, { selection, onAction }),
        container,
      );

    // Same revision and equal content: memo blocks the re-render entirely.
    renderSelection(projectSelection(makeSnapshot(), 1));
    const captured = captureRegionSubtrees({ region: container });
    renderSelection(projectSelection(makeSnapshot(), 1));
    assertRegionSubtreesPreserved({ region: container }, captured);

    // A committed edit, then a snapshot that only flips persistChecked: the
    // DOM nodes survive (structure key unchanged) and the draft persists.
    const topicInput = fieldRow(container, "topic").querySelector("input")!;
    topicInput.value = "keep me";
    dispatchCommit(topicInput);
    await flushPreactUpdates();
    assert.equal(actions.length, 1);

    const updated = makeSnapshot();
    updated.persistChecked = false;
    renderSelection(projectSelection(updated));
    await flushPreactUpdates();
    assertRegionSubtreesPreserved({ region: container }, captured);
    const persist = container.querySelector<HTMLInputElement>(
      ".settings-footer .field-checkbox input",
    )!;
    assert.isFalse(persist.checked);

    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    const confirm = actions.find((entry) => entry.action === "confirm");
    assert.ok(confirm, "confirm emitted");
    const options = confirm!.payload.executionOptions as {
      workflowParams: Record<string, unknown>;
    };
    assert.equal(options.workflowParams.topic, "keep me");
  });

  it("preserves common fields across backend and loading catalog changes", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);
    const shellBefore = container.querySelector(".settings-shell")!;
    const topicInput = fieldRow(container, "topic").querySelector("input")!;
    topicInput.value = "keep across catalogs";
    dispatchCommit(topicInput);
    await flushPreactUpdates();

    const switched = makeSnapshot();
    (switched.form as Record<string, unknown>).selectedProfile = "b2";
    (switched.form as Record<string, unknown>).runtimeCatalogState = "loading";
    renderDialog(switched, actions, container);
    await flushPreactUpdates();

    const shellAfter = container.querySelector(".settings-shell")!;
    assert.notEqual(
      shellAfter,
      shellBefore,
      "structure change remounts the shell",
    );
    const profileTrigger = container.querySelector(
      ".settings-banner-profile-select .custom-select-trigger-label",
    );
    assert.equal(profileTrigger?.textContent, "Backend Two");

    const reseededTopicInput = fieldRow(container, "topic").querySelector(
      "input",
    )!;
    assert.equal(reseededTopicInput.value, "keep across catalogs");
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    assert.notOk(
      actions.find((entry) => entry.action === "confirm"),
      "confirm waits for the catalog",
    );

    reseededTopicInput.value = "typed while loading";
    dispatchCommit(reseededTopicInput);
    await flushPreactUpdates();
    const ready = makeSnapshot();
    (ready.form as Record<string, unknown>).selectedProfile = "b2";
    (ready.form as Record<string, unknown>).runtimeCatalogState = "ready";
    (ready.form as any).providerSchemaEntries[0].enumValues = ["ready-choice"];
    renderDialog(ready, actions, container);
    await flushPreactUpdates();
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    const confirm = actions.find((entry) => entry.action === "confirm");
    assert.ok(confirm, "confirm emitted");
    const options = confirm!.payload.executionOptions as {
      backendId: string;
      workflowParams: Record<string, unknown>;
    };
    assert.equal(options.backendId, "b2");
    assert.equal(options.workflowParams.topic, "typed while loading");
  });

  it("renders the single-column layout without the host queue card", function () {
    const actions: CapturedAction[] = [];
    const snapshot = makeSnapshot();
    (snapshot.form as Record<string, unknown>).layout = {
      mode: "single-region",
      showExecutionUnitPreview: true,
      showHostMaximumConcurrency: true,
    };
    const container = renderDialog(snapshot, actions);
    const layout = container.querySelector(".settings-content-layout");
    assert.notOk(layout?.classList.contains("has-multi-unit-region"));
    assert.isNull(container.querySelector(".settings-multi-unit-column"));
    // The legacy surface drops the host queue card outside multi-unit mode
    // but still mounts the preview inside the options region.
    assert.isNull(container.querySelector("#workflow-host-max-concurrency"));
    assert.ok(
      container.querySelector(
        ".settings-options-region > .workflow-execution-unit-preview",
      ),
    );
  });

  it("renders the missing-profile error and disables confirm", function () {
    const actions: CapturedAction[] = [];
    const snapshot = makeSnapshot();
    (snapshot.form as Record<string, unknown>).profileMissing = true;
    const container = renderDialog(snapshot, actions);
    const errors = Array.from(
      container.querySelectorAll(".settings-shell > .settings-error"),
    );
    assert.ok(
      errors.some(
        (node) => node.textContent === "No backend profile available.",
      ),
    );
    assert.ok(footerButton(container, "Confirm").disabled);
  });

  it("bootstraps the entry: ready action, snapshot render and document title", async function () {
    const root = document.createElement("div");
    root.id = "app";
    root.setAttribute("data-role", "workflow-settings-dialog");
    document.body.appendChild(root);

    const received: Array<{
      type?: string;
      action?: string;
      payload?: unknown;
    }> = [];
    window.addEventListener("message", (event) => {
      const data = (event as MessageEvent).data;
      if (data && data.type === "workflow-settings-dialog:action") {
        received.push(data);
      }
    });

    const dispose = bootstrapWorkflowSettingsDialogApp(root);
    await flushPreactUpdates();
    assert.deepEqual(
      received.map((entry) => entry.action),
      ["ready"],
    );

    window.postMessage(
      { type: "workflow-settings-dialog:snapshot", payload: makeSnapshot() },
      "*",
    );
    await flushPreactUpdates();
    assert.equal(document.title, "Workflow Settings — Workflow One");
    assert.ok(root.querySelector(".settings-shell"));

    footerButton(root, "Cancel").click();
    await flushPreactUpdates();
    assert.deepEqual(
      received.map((entry) => entry.action),
      ["ready", "cancel"],
    );
    const cancel = received[1];
    assert.equal(cancel.type, "workflow-settings-dialog:action");
    assert.deepEqual(cancel.payload, {});

    dispose();
    assert.isNull(root.querySelector(".settings-shell"));
    window.postMessage(
      { type: "workflow-settings-dialog:snapshot", payload: makeSnapshot() },
      "*",
    );
    await flushPreactUpdates();
    assert.isNull(root.querySelector(".settings-shell"));
  });

  it("applies the host first-model rebase when two SkillRunner providers share model names", async function () {
    const backendId = "skillrunner-roundtrip";
    const baseUrl = "http://127.0.0.1:8030";
    const modelsOf = (providerId: string) => [
      {
        id: `${providerId}/gpt-5`,
        provider_id: providerId,
        provider: providerId,
        model: "gpt-5",
        display_name: "GPT-5",
        deprecated: false,
      },
      {
        id: `${providerId}/gpt-5-mini`,
        provider_id: providerId,
        provider: providerId,
        model: "gpt-5-mini",
        display_name: "GPT-5 mini",
        deprecated: false,
      },
    ];
    upsertSkillRunnerModelCacheEntry({
      backendId,
      baseUrl,
      updatedAt: "2026-10-14T00:00:00.000Z",
      engines: ["opencode"],
      modelsByEngine: {
        opencode: [...modelsOf("openai"), ...modelsOf("azure")],
      },
    });

    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "literature-analysis workflow loads");
    const candidateBackends = [
      { id: backendId, type: "skillrunner", baseUrl, displayName: backendId },
    ];
    const buildSnapshot = async (providerOptions: Record<string, unknown>) => {
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        draft: { backendId, providerOptions },
        candidateBackends,
        ignoreSavedSettings: true,
        resolveDynamicOptions: false,
      });
      return {
        title: "Workflow Settings",
        labels: makeLabels(),
        workflow: {
          id: descriptor.workflowId,
          label: descriptor.workflowLabel,
          providerId: descriptor.providerId,
        },
        form: {
          ...descriptor,
          executionUnitPreview: { status: "", units: [] },
          layout: {
            mode: "single-region",
            showExecutionUnitPreview: false,
            showHostMaximumConcurrency: false,
          },
        },
        persistChecked: true,
      };
    };
    const structureKeyOf = (raw: unknown) =>
      workflowSettingsDialogStructureKey(
        projectWorkflowSettingsDialogSelection(raw, 0)!,
      );

    const actions: CapturedAction[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderSnapshot = (raw: unknown) =>
      renderDialog(raw, actions, container);
    const clickOption = async (key: string, label: string) => {
      fieldRow(container, key)
        .querySelector<HTMLElement>(".custom-select-trigger")!
        .click();
      await flushPreactUpdates();
      const option = Array.from(
        fieldRow(container, key).querySelectorAll<HTMLElement>(
          ".custom-select-option",
        ),
      ).find((entry) => entry.textContent === label);
      assert.ok(option, `${key} offers ${label}`);
      option!.click();
      await flushPreactUpdates();
    };
    const emittedProviderOptions = () => {
      const last = actions[actions.length - 1];
      assert.equal(last.action, "update-draft");
      return (
        last.payload.executionOptions as {
          providerOptions: Record<string, unknown>;
        }
      ).providerOptions;
    };
    const rebase = (options: Record<string, unknown>) =>
      rebaseWorkflowProviderOptionsForModelProviderChange({
        workflow: workflow!,
        backendId,
        options,
        candidateBackends,
        changedSection: "providerOptions",
        changedKey: "provider_id",
        origin: "choice",
      });
    const modelLabels = () =>
      Array.from(
        fieldRow(container, "model").querySelectorAll<HTMLElement>(
          ".custom-select-option",
        ),
      ).map((entry) => entry.textContent);
    const modelLabel = () =>
      fieldRow(container, "model").querySelector(".custom-select-trigger-label")
        ?.textContent;
    const confirmProviderOptions = () => {
      footerButton(container, "Confirm").click();
      const confirms = actions.filter((entry) => entry.action === "confirm");
      assert.ok(confirms.length > 0, "confirm emits");
      return (
        confirms[confirms.length - 1].payload.executionOptions as {
          providerOptions: Record<string, unknown>;
        }
      ).providerOptions;
    };

    // opencode is the provider-scoped engine this fixture publishes.
    let raw = await buildSnapshot({ engine: "opencode" });
    renderSnapshot(raw);
    await flushPreactUpdates();

    await clickOption("provider_id", "openai");
    const openaiOptions = rebase(emittedProviderOptions());
    assert.equal(openaiOptions.model, "gpt-5");
    raw = await buildSnapshot(openaiOptions);
    renderSnapshot(raw);
    await flushPreactUpdates();
    assert.deepEqual(modelLabels(), ["gpt-5", "gpt-5-mini"]);

    await clickOption("model", "gpt-5-mini");
    assert.equal(emittedProviderOptions().model, "gpt-5-mini");

    // Both providers advertise the same model names, so the descriptor shape
    // (and with it the structure key) survives the switch unchanged while the
    // host rebases the model to the new provider's first entry.
    await clickOption("provider_id", "azure");
    const switched = emittedProviderOptions();
    assert.equal(switched.provider_id, "azure");
    assert.equal(
      confirmProviderOptions().provider_id,
      "azure",
      "a confirm before the host echo already names the new provider",
    );
    // A confirm that lands before the host echo still carries the pre-rebase
    // model; that window belongs to the host rebase, not to the form.
    const azureOptions = rebase(switched);
    assert.equal(azureOptions.model, "gpt-5");

    const nextRaw = await buildSnapshot(azureOptions);
    assert.equal(
      structureKeyOf(nextRaw),
      structureKeyOf(raw),
      "identical model names keep the dialog structure key stable",
    );
    renderSnapshot(nextRaw);
    await flushPreactUpdates();
    assert.equal(modelLabel(), "gpt-5");
    assert.equal(confirmProviderOptions().model, "gpt-5");

    await clickOption("provider_id", "openai");
    const pendingSwitch = emittedProviderOptions();
    await clickOption("model", "gpt-5-mini");
    renderSnapshot(await buildSnapshot(rebase(pendingSwitch)));
    await flushPreactUpdates();
    assert.equal(
      modelLabel(),
      "gpt-5-mini",
      "a provider echo cannot replace a later explicit model choice",
    );
    assert.equal(confirmProviderOptions().model, "gpt-5-mini");
  });
});
