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
  type WorkflowSettingsDialogSelection,
} from "../../src/dashboard/components/WorkflowSettingsDialogRegion";
import { bootstrapWorkflowSettingsDialogApp } from "../../src/dashboard/workflowSettingsDialogApp";

type CapturedAction = { action: string; payload: Record<string, unknown> };

// The surface consumes the same vendor globals as the legacy page: the
// number-validation contract and the imperative custom-select widget. Load
// the real vendor sources into each test's jsdom window.
function installDashboardVendorScripts(environment: SidebarDomEnvironment) {
  const files = [
    "addon/content/shared/workflow-number-validation.js",
    "addon/content/components/custom-select.js",
  ];
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
    restoreSidebarDomGlobals();
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
      "editable profile renders the vendor custom select",
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

  it("remounts the shell and reseeds the draft when the form structure changes", async function () {
    const actions: CapturedAction[] = [];
    const container = renderDialog(makeSnapshot(), actions);
    const shellBefore = container.querySelector(".settings-shell")!;
    const topicInput = fieldRow(container, "topic").querySelector("input")!;
    topicInput.value = "dropped";
    dispatchCommit(topicInput);
    await flushPreactUpdates();

    const switched = makeSnapshot();
    (switched.form as Record<string, unknown>).selectedProfile = "b2";
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

    // The draft was reseeded: the committed "dropped" value is gone and the
    // required topic field is empty again, so confirm aborts.
    const reseededTopicInput = fieldRow(container, "topic").querySelector(
      "input",
    )!;
    assert.equal(reseededTopicInput.value, "");
    footerButton(container, "Confirm").click();
    await flushPreactUpdates();
    assert.notOk(
      actions.find((entry) => entry.action === "confirm"),
      "confirm aborts on the reseeded empty required field",
    );

    reseededTopicInput.value = "fresh";
    dispatchCommit(reseededTopicInput);
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
    assert.equal(options.workflowParams.topic, "fresh");
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
});
