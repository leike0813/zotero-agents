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
      "editable profile renders the vendor custom select",
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

    // enum-only entry renders as a vendor custom select island.
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
});
