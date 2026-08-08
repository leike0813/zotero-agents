import { assert } from "chai";
import { h, render } from "preact";

import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
  subtreeNodes,
} from "../helpers/sidebarDomEnv";
import { MessageCountsRegion } from "../../src/sidebar/components/MessageCountsRegion";
import { ToolbarRegion } from "../../src/sidebar/components/ToolbarRegion";
import { BannerRegion } from "../../src/sidebar/components/BannerRegion";
import { PlanRegion } from "../../src/sidebar/components/PlanRegion";
import { HintRegion } from "../../src/sidebar/components/HintRegion";
import { ReplyRegion } from "../../src/sidebar/components/ReplyRegion";
import { PermissionDrawerRegion } from "../../src/sidebar/components/PermissionDrawerRegion";
import { DetailsDrawerRegion } from "../../src/sidebar/components/DetailsDrawerRegion";
import { ContextDrawerRegion } from "../../src/sidebar/components/ContextDrawerRegion";
import { TranscriptRegion } from "../../src/sidebar/components/TranscriptRegion";
import { ViewModeToggle } from "../../src/sidebar/components/ViewModeToggle";
import { EmptyStateRegion } from "../../src/sidebar/components/EmptyStateRegion";

function counterSelection(overrides: Record<string, unknown> = {}) {
  return {
    scopeKey: "chat/backend-1\nconv-1",
    executionKey: "exec-1",
    active: true,
    current: { assistant: 3, thought: 1, tool: 2 },
    cumulative: { assistant: 5, thought: 1, tool: 4 },
    completeness: "complete",
    revision: 7,
    labels: {},
    ...overrides,
  };
}

function renderRegion(container: Element, selection: unknown) {
  render(
    h(MessageCountsRegion, { container, selection } as never),
    container as never,
  );
}

function counterItems(container: Element) {
  return Array.from(
    container.querySelectorAll(".assistant-message-counter-item"),
  );
}

describe("Assistant Workspace chrome components", function () {
  let environment: ReturnType<typeof createSidebarDomEnvironment>;

  beforeEach(function () {
    environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  describe("MessageCountsRegion", function () {
    it("renders counter items with complete values and aria labels", function () {
      const container = environment.document.createElement("div");
      renderRegion(container, counterSelection());
      const items = counterItems(container);
      assert.lengthOf(items, 3);
      const byKind = new Map(
        items.map((item) => [
          item.getAttribute("data-message-counter-kind"),
          item,
        ]),
      );
      assert.deepEqual([...byKind.keys()], ["assistant", "thought", "tool"]);
      const assistant = byKind.get("assistant")!;
      assert.equal(
        assistant.querySelector(".assistant-message-counter-label")!
          .textContent,
        "Assistant",
      );
      assert.equal(
        assistant.querySelector(".assistant-message-counter-value")!
          .textContent,
        "3/5",
      );
      assert.equal(assistant.getAttribute("aria-label"), "Assistant 3/5");
      assert.equal(
        byKind.get("tool")!.querySelector(".assistant-message-counter-value")!
          .textContent,
        "2/4",
      );
      assert.isFalse(container.classList.contains("hidden"));
      assert.equal(
        container.getAttribute("data-message-counter-owner"),
        "chat/backend-1\nconv-1",
      );
    });

    it("renders bare current values while counts are incomplete", function () {
      const container = environment.document.createElement("div");
      renderRegion(container, counterSelection({ completeness: "partial" }));
      const values = Array.from(
        container.querySelectorAll(".assistant-message-counter-value"),
      ).map((node) => node.textContent);
      assert.deepEqual(values, ["3", "1", "2"]);
    });

    it("uses custom labels when provided", function () {
      const container = environment.document.createElement("div");
      renderRegion(
        container,
        counterSelection({
          labels: { assistant: "助手", thinking: "思考", tool: "工具" },
        }),
      );
      const labels = Array.from(
        container.querySelectorAll(".assistant-message-counter-label"),
      ).map((node) => node.textContent);
      assert.deepEqual(labels, ["助手", "思考", "工具"]);
    });

    it("updates values in place when counts advance", function () {
      const container = environment.document.createElement("div");
      renderRegion(container, counterSelection());
      const before = subtreeNodes(container);
      renderRegion(
        container,
        counterSelection({
          current: { assistant: 4, thought: 1, tool: 2 },
          revision: 8,
        }),
      );
      const after = subtreeNodes(container);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
      const assistant = container.querySelector(
        '[data-message-counter-kind="assistant"] .assistant-message-counter-value',
      );
      assert.equal(assistant!.textContent, "4/5");
    });

    it("performs zero DOM work for equal selections", function () {
      const container = environment.document.createElement("div");
      renderRegion(container, counterSelection());
      const before = subtreeNodes(container);
      renderRegion(container, counterSelection());
      const after = subtreeNodes(container);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });

    it("hides the container and preserves item nodes when counts clear", function () {
      const container = environment.document.createElement("div");
      renderRegion(container, counterSelection());
      const before = subtreeNodes(container);
      renderRegion(container, null);
      assert.isTrue(container.classList.contains("hidden"));
      const hiddenSubtree = subtreeNodes(container);
      assert.equal(hiddenSubtree.length, before.length);
      hiddenSubtree.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
      renderRegion(container, counterSelection());
      assert.isFalse(container.classList.contains("hidden"));
      const restored = subtreeNodes(container);
      assert.equal(restored.length, before.length);
      restored.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });

    it("starts hidden and empty when counts are absent", function () {
      const container = environment.document.createElement("div");
      renderRegion(container, null);
      assert.isTrue(container.classList.contains("hidden"));
      assert.lengthOf(counterItems(container), 0);
    });
  });

  describe("ToolbarRegion", function () {
    function toolbarActions(): Array<Record<string, unknown>> {
      return [
        {
          action: "refresh-owners",
          label: "Refresh",
          payload: { scope: "owners" },
        },
        {
          kind: "switch",
          action: "toggle-virtualization",
          stateLabel: "Virtualize",
          checked: false,
        },
        {
          kind: "display-mode",
          action: "set-execution-display-mode",
          label: "Display",
          value: "live",
          options: [
            { value: "live", label: "Live" },
            { value: "boundary", label: "Boundary" },
            { value: "silent", label: "Silent" },
          ],
        },
        { action: "open-details-drawer", label: "Details", align: "end" },
      ];
    }

    function renderToolbarRegion(
      mount: Element,
      actions: Array<Record<string, unknown>>,
      onAction: (action: string, payload: unknown) => void = () => {},
    ) {
      render(h(ToolbarRegion, { actions, onAction } as never), mount as never);
    }

    it("renders start and end groups with action buttons", function () {
      const mount = environment.document.createElement("div");
      renderToolbarRegion(mount, toolbarActions());
      const start = mount.querySelector(
        ".assistant-panel-toolbar-group-start",
      )!;
      const end = mount.querySelector(".assistant-panel-toolbar-group-end")!;
      assert.isOk(start);
      assert.isOk(end);
      assert.lengthOf(Array.from(start.children), 3);
      assert.lengthOf(Array.from(end.children), 1);
      const refresh = start.querySelector(
        ".assistant-panel-action-refresh-owners",
      ) as HTMLButtonElement;
      assert.equal(refresh.textContent, "Refresh");
      assert.equal(refresh.type, "button");
      assert.isFalse(refresh.disabled);
      assert.equal(
        end
          .querySelector("button")!
          .getAttribute("data-assistant-action-align"),
        "end",
      );
    });

    it("emits action and payload on click", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderToolbarRegion(mount, toolbarActions(), (action, payload) => {
        emitted.push({ action, payload });
      });
      (
        mount.querySelector(
          ".assistant-panel-action-refresh-owners",
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted, [
        { action: "refresh-owners", payload: { scope: "owners" } },
      ]);
    });

    it("renders a switch action and marks it pending on click", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderToolbarRegion(mount, toolbarActions(), (action, payload) => {
        emitted.push({ action, payload });
      });
      const switchButton = mount.querySelector(
        '[data-assistant-switch-state="off"]',
      ) as HTMLButtonElement;
      assert.equal(switchButton.getAttribute("role"), "switch");
      assert.equal(switchButton.getAttribute("aria-checked"), "false");
      switchButton.click();
      assert.deepEqual(emitted, [
        { action: "toggle-virtualization", payload: { enabled: true } },
      ]);
      assert.equal(
        switchButton.getAttribute("data-assistant-switch-pending"),
        "true",
      );
      assert.equal(switchButton.getAttribute("aria-busy"), "true");
    });

    it("clears the switch pending marker when actions change", function () {
      const mount = environment.document.createElement("div");
      const actions = toolbarActions();
      renderToolbarRegion(mount, actions);
      const switchButton = mount.querySelector(
        '[data-assistant-switch-state="off"]',
      ) as HTMLButtonElement;
      switchButton.click();
      const next = toolbarActions().map((action) =>
        action.kind === "switch" ? { ...action, checked: true } : action,
      );
      renderToolbarRegion(mount, next);
      const updated = mount.querySelector(
        '[data-assistant-switch-state="on"]',
      ) as HTMLButtonElement;
      assert.isOk(updated);
      assert.isNull(updated.getAttribute("data-assistant-switch-pending"));
      assert.isNull(updated.getAttribute("aria-busy"));
    });

    it("renders display mode as a radiogroup with roving tabindex", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderToolbarRegion(mount, toolbarActions(), (action, payload) => {
        emitted.push({ action, payload });
      });
      const group = mount.querySelector(".assistant-panel-display-mode")!;
      assert.equal(group.getAttribute("role"), "radiogroup");
      const options = Array.from(
        group.querySelectorAll<HTMLButtonElement>(
          ".assistant-panel-display-mode-option",
        ),
      );
      assert.lengthOf(options, 3);
      assert.deepEqual(
        options.map((option) => option.tabIndex),
        [0, -1, -1],
      );
      options[1].click();
      assert.deepEqual(emitted, [
        { action: "set-execution-display-mode", payload: { mode: "boundary" } },
      ]);
      const event = new environment.window.KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      options[0].dispatchEvent(event);
      assert.isTrue(event.defaultPrevented);
      assert.equal(emitted.length, 2);
    });

    it("keeps the subtree identical for equal action lists", function () {
      const mount = environment.document.createElement("div");
      renderToolbarRegion(mount, toolbarActions());
      const before = subtreeNodes(mount);
      renderToolbarRegion(mount, toolbarActions());
      const after = subtreeNodes(mount);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });

    it("renders no groups when there are no actions", function () {
      const mount = environment.document.createElement("div");
      renderToolbarRegion(mount, []);
      assert.isNull(
        mount.querySelector(".assistant-panel-toolbar-group-start"),
      );
      assert.isNull(mount.querySelector(".assistant-panel-toolbar-group-end"));
    });
  });

  describe("BannerRegion", function () {
    function bannerProps(overrides: Record<string, unknown> = {}) {
      return {
        context: {
          title: "Literature Chat",
          subtitle: "claude · default",
          metadata: [
            { label: "Backend", value: "claude" },
            { key: "mode", value: "live" },
          ],
          notice: { tone: "warning", text: "Reconnecting" },
          mainStatus: "running",
          mainStatusLabel: "Running",
          indicators: [
            {
              id: "usage",
              tone: "accent",
              label: "Tokens",
              value: "1.2k",
              progressPercent: 40,
            },
          ],
          selectors: [
            {
              id: "model",
              label: "Model",
              value: "sonnet",
              action: "set-model",
              payloadKey: "model",
              options: [
                { value: "sonnet", label: "Sonnet" },
                { value: "opus", label: "Opus" },
              ],
            },
          ],
          actions: [{ action: "refresh-owners", label: "Refresh" }],
        },
        lifecycle: { executionState: "running" },
        ...overrides,
      };
    }

    function renderBannerRegion(
      mount: Element,
      props: ReturnType<typeof bannerProps>,
      onAction: (action: string, payload: unknown) => void = () => {},
    ) {
      render(
        h(BannerRegion, {
          context: props.context,
          lifecycle: props.lifecycle,
          onAction,
          statusTone: (status: string) =>
            status === "running" ? "accent" : "muted",
        } as never),
        mount as never,
      );
    }

    it("renders title, subtitle, meta pills, notice, badge, and indicators", function () {
      const mount = environment.document.createElement("div");
      renderBannerRegion(mount, bannerProps());
      assert.equal(
        mount.querySelector(".assistant-panel-banner-title")!.textContent,
        "Literature Chat",
      );
      assert.equal(
        mount.querySelector(".assistant-panel-banner-subtitle")!.textContent,
        "claude · default",
      );
      const pills = mount.querySelectorAll(".assistant-panel-meta-pill");
      assert.lengthOf(pills, 2);
      assert.equal(pills[1].querySelector("strong")!.textContent, "mode");
      assert.equal(pills[1].querySelector("span")!.textContent, "live");
      assert.equal(
        mount.querySelector(".assistant-panel-banner-notice")!.className,
        "assistant-panel-banner-notice is-warning",
      );
      const badge = mount.querySelector(
        '[data-assistant-banner-status="running"]',
      )!;
      assert.equal(badge.textContent, "Running");
      assert.include(badge.className, "is-accent");
      const indicator = mount.querySelector(
        '[data-assistant-indicator-id="usage"]',
      )!;
      assert.equal(
        indicator.getAttribute("data-assistant-indicator-tone"),
        "accent",
      );
      assert.equal(
        indicator.querySelector(".assistant-panel-indicator-value")!
          .textContent,
        "1.2k",
      );
      const progress = indicator.querySelector(
        ".assistant-panel-indicator-progress",
      )!;
      assert.equal(progress.getAttribute("aria-valuenow"), "40");
      assert.equal(
        (
          progress.querySelector(
            ".assistant-panel-indicator-progress-fill",
          ) as HTMLElement
        ).style.width,
        "40%",
      );
    });

    it("omits optional blocks when their content is absent", function () {
      const mount = environment.document.createElement("div");
      const props = bannerProps({
        context: { title: "Chat" },
        lifecycle: {},
      });
      renderBannerRegion(mount, props);
      assert.isNull(mount.querySelector(".assistant-panel-banner-subtitle"));
      assert.isNull(mount.querySelector(".assistant-panel-banner-notice"));
      assert.isNull(mount.querySelector(".assistant-panel-banner-status-row"));
      assert.isNull(mount.querySelector(".assistant-panel-context-selectors"));
      assert.isNull(mount.querySelector(".assistant-panel-context-actions"));
      assert.isOk(mount.querySelector(".assistant-panel-banner-meta"));
    });

    it("emits selector changes with the full payload", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderBannerRegion(mount, bannerProps(), (action, payload) => {
        emitted.push({ action, payload });
      });
      const select = mount.querySelector<HTMLSelectElement>(
        ".assistant-panel-select",
      )!;
      const selected = Array.from(select.options).find(
        (option) => option.selected,
      );
      assert.equal(selected!.value, "sonnet");
      select.value = "opus";
      select.dispatchEvent(
        new environment.window.Event("change", { bubbles: true }),
      );
      assert.lengthOf(emitted, 1);
      assert.equal(emitted[0].action, "set-model");
      const payload = emitted[0].payload as Record<string, unknown>;
      assert.equal(payload.selectorId, "model");
      assert.equal(payload.value, "opus");
      assert.equal(payload.model, "opus");
      assert.deepEqual(payload.option, { value: "opus", label: "Opus" });
    });

    it("emits context actions on click", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderBannerRegion(mount, bannerProps(), (action, payload) => {
        emitted.push({ action, payload });
      });
      (
        mount.querySelector(
          ".assistant-panel-context-actions button",
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted, [{ action: "refresh-owners", payload: {} }]);
    });

    it("keeps the subtree identical for equal context and lifecycle", function () {
      const mount = environment.document.createElement("div");
      renderBannerRegion(mount, bannerProps());
      const before = subtreeNodes(mount);
      renderBannerRegion(mount, bannerProps());
      const after = subtreeNodes(mount);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });

    it("re-renders when visible banner content changes", function () {
      const mount = environment.document.createElement("div");
      renderBannerRegion(mount, bannerProps());
      const changed = bannerProps();
      changed.context = { ...changed.context, subtitle: "kimi · default" };
      renderBannerRegion(mount, changed);
      assert.equal(
        mount.querySelector(".assistant-panel-banner-subtitle")!.textContent,
        "kimi · default",
      );
    });
  });

  describe("PlanRegion", function () {
    function planProps(overrides: Record<string, unknown> = {}) {
      return {
        plan: {
          active: true,
          totalCount: 3,
          completedCount: 1,
          entries: [
            { title: "Read paper", toneClass: "is-completed", terminal: true },
            { title: "Summarize", toneClass: "is-running", icon: "→" },
            { title: "Cite", toneClass: "is-pending" },
          ],
        },
        interactionKind: "running",
        planTitle: "Plan",
        ...overrides,
      };
    }

    function renderPlanRegion(
      container: Element,
      props: ReturnType<typeof planProps>,
    ) {
      render(
        h(PlanRegion, {
          container,
          plan: props.plan,
          interactionKind: props.interactionKind,
          planTitle: props.planTitle,
        } as never),
        container as never,
      );
    }

    it("renders the header summary and plan entries", function () {
      const container = environment.document.createElement("div");
      renderPlanRegion(container, planProps());
      assert.equal(
        container.querySelector(".assistant-panel-plan-summary")!.textContent,
        "1/3",
      );
      assert.equal(
        container.querySelector(".assistant-panel-plan-header strong")!
          .textContent,
        "Plan",
      );
      const entries = container.querySelectorAll(".assistant-panel-plan-entry");
      assert.lengthOf(entries, 3);
      assert.include(entries[0].className, "is-completed");
      assert.equal(
        entries[0].querySelector(".assistant-panel-plan-icon")!.textContent,
        "✓",
      );
      assert.isOk(
        entries[1].querySelector(".assistant-panel-plan-spinner"),
        "running entry spins while the plan is working",
      );
      assert.equal(
        entries[2].querySelector(".assistant-panel-plan-icon")!.textContent,
        "•",
      );
      assert.isFalse(container.classList.contains("hidden"));
      assert.equal(
        container.getAttribute("data-assistant-plan-active"),
        "true",
      );
      assert.equal(
        container.getAttribute("data-assistant-plan-working"),
        "true",
      );
    });

    it("renders the running icon instead of a spinner when idle", function () {
      const container = environment.document.createElement("div");
      renderPlanRegion(container, planProps({ interactionKind: "hidden" }));
      const running = container.querySelectorAll(
        ".assistant-panel-plan-entry",
      )[1];
      assert.isNull(running.querySelector(".assistant-panel-plan-spinner"));
      assert.equal(
        running.querySelector(".assistant-panel-plan-icon")!.textContent,
        "→",
      );
      assert.equal(
        container.getAttribute("data-assistant-plan-working"),
        "false",
      );
    });

    it("prefers active entries over the full list", function () {
      const container = environment.document.createElement("div");
      const props = planProps({ interactionKind: "hidden" });
      props.plan = {
        ...props.plan,
        activeEntries: [{ title: "Only step", toneClass: "is-running" }],
      };
      renderPlanRegion(container, props);
      const entries = container.querySelectorAll(".assistant-panel-plan-entry");
      assert.lengthOf(entries, 1);
      assert.equal(entries[0].textContent, "•Only step");
    });

    it("hides the container and keeps stale DOM when the plan clears", function () {
      const container = environment.document.createElement("div");
      renderPlanRegion(container, planProps());
      const before = subtreeNodes(container);
      renderPlanRegion(container, planProps({ plan: { active: false } }));
      assert.isTrue(container.classList.contains("hidden"));
      assert.equal(
        container.getAttribute("data-assistant-plan-active"),
        "false",
      );
      const after = subtreeNodes(container);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });

    it("starts hidden and empty when the plan is not visible", function () {
      const container = environment.document.createElement("div");
      renderPlanRegion(container, planProps({ plan: {} }));
      assert.isTrue(container.classList.contains("hidden"));
      assert.isNull(container.querySelector(".assistant-panel-plan-header"));
    });

    it("keeps the subtree identical for equal plan input", function () {
      const container = environment.document.createElement("div");
      renderPlanRegion(container, planProps());
      const before = subtreeNodes(container);
      renderPlanRegion(container, planProps());
      const after = subtreeNodes(container);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });
  });

  describe("HintRegion", function () {
    function renderHintRegion(
      container: Element,
      interaction: Record<string, unknown> | null,
      onAction: (action: string, payload: unknown) => void = () => {},
    ) {
      render(
        h(HintRegion, {
          container,
          interaction,
          onAction,
          labelOf: (_path: string, fallback: string) => fallback,
        } as never),
        container as never,
      );
    }

    it("renders a running hint with led and fallback text", function () {
      const container = environment.document.createElement("div");
      renderHintRegion(container, { kind: "running" });
      assert.equal(
        container.getAttribute("data-assistant-interaction"),
        "running",
      );
      assert.isFalse(container.classList.contains("hidden"));
      const row = container.querySelector(".assistant-panel-hint-row")!;
      assert.include(row.querySelector(".asst-led")!.className, "is-running");
      assert.equal(row.textContent, "Agent is working...");
    });

    it("clears content and hides the container for the hidden kind", function () {
      const container = environment.document.createElement("div");
      renderHintRegion(container, { kind: "running" });
      renderHintRegion(container, { kind: "hidden" });
      assert.isTrue(container.classList.contains("hidden"));
      assert.isNull(container.querySelector(".assistant-panel-hint-row"));
      assert.equal(
        container.getAttribute("data-assistant-interaction"),
        "hidden",
      );
    });

    it("renders the permission summary box and emits view-details", function () {
      const container = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderHintRegion(
        container,
        {
          kind: "permission",
          message: "Allow file write?",
          permission: {
            approvalKind: "zotero-write",
            toolTitle: "write_file",
            toolCallId: "call-1",
            review: { command: "rm -rf /tmp/x" },
          },
          actions: [{ action: "approve", label: "Allow" }],
        },
        (action, payload) => emitted.push({ action, payload }),
      );
      const box = container.querySelector(
        ".assistant-panel-permission-summary",
      )!;
      assert.isOk(box);
      assert.equal(
        box.querySelector(".assistant-panel-permission-summary-text")!
          .textContent,
        "Allow file write?",
      );
      assert.equal(
        box.querySelector(".assistant-panel-permission-meta")!.textContent,
        "Zotero write approval · write_file · Tool call: call-1",
      );
      const view = box.querySelector<HTMLButtonElement>(
        ".assistant-panel-permission-view-full-request",
      )!;
      view.click();
      assert.deepEqual(emitted, [
        { action: "open-permission-request", payload: {} },
      ]);
      const actionsBox = container.querySelector(
        ".assistant-panel-permission-actions",
      )!;
      assert.lengthOf(actionsBox.querySelectorAll("button"), 1);
      assert.include(
        container.querySelector(".asst-led")!.className,
        "is-warning",
      );
    });

    it("renders auth diagnostics, link, and import box", function () {
      const container = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderHintRegion(
        container,
        {
          kind: "auth",
          auth: {
            phase: "method_selection",
            hint: "Pick a sign-in method",
            authUrl: "https://example.com/device",
            userCode: "ABCD-1234",
            importFiles: [
              { name: "token.json", required: true, accept: ".json" },
            ],
            importRiskNoticeRequired: true,
          },
        },
        (action, payload) => emitted.push({ action, payload }),
      );
      assert.equal(
        container.querySelector(".assistant-panel-auth-hint")!.textContent,
        "Pick a sign-in method",
      );
      const link = container.querySelector<HTMLAnchorElement>(
        ".assistant-panel-auth-link",
      )!;
      assert.equal(link.href, "https://example.com/device");
      link.click();
      assert.deepEqual(emitted, [
        {
          action: "open-auth-url",
          payload: { url: "https://example.com/device" },
        },
      ]);
      const diagnostics = container.querySelectorAll(
        ".assistant-panel-auth-diagnostic",
      );
      assert.isTrue(diagnostics.length >= 2);
      const importBox = container.querySelector(
        ".assistant-panel-auth-import",
      )!;
      assert.isOk(importBox.querySelector(".assistant-panel-auth-import-risk"));
      const input =
        importBox.querySelector<HTMLInputElement>('input[type="file"]')!;
      assert.isTrue(input.required);
      assert.equal(input.accept, ".json");
      const submit = importBox.querySelector<HTMLButtonElement>(
        "button.assistant-panel-action",
      )!;
      assert.isFalse(submit.disabled);
      submit.click();
      assert.deepEqual(emitted[1], { action: "auth-import-run", payload: {} });
    });

    it("renders waiting_user prompt, hint, and option action descriptors", function () {
      const container = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderHintRegion(
        container,
        {
          kind: "waiting_user",
          title: "ignored title",
          pendingInteraction: {
            inputKind: "choose_one",
            prompt: "Which chapter next?",
            hint: "Pick one to continue.",
            options: [
              {
                label: "Chapter 2",
                action: "select-interaction-option",
                payload: { responseValue: "ch2", responseLabel: "Chapter 2" },
              },
              { label: "Unavailable option" },
            ],
            files: [],
            fileReply: { supported: false },
          },
        },
        (action, payload) => emitted.push({ action, payload }),
      );
      const row = container.querySelector(".assistant-panel-hint-row")!;
      assert.equal(row.textContent, "Which chapter next?");
      assert.equal(
        container.querySelector(".assistant-panel-interaction-hint")!
          .textContent,
        "Pick one to continue.",
      );
      const options = container.querySelectorAll<HTMLButtonElement>(
        ".assistant-panel-hint-option",
      );
      assert.lengthOf(options, 2);
      assert.equal(options[0].textContent, "Chapter 2");
      assert.isTrue(
        options[1].disabled,
        "option without an action descriptor is disabled",
      );
      options[0].click();
      assert.deepEqual(emitted, [
        {
          action: "select-interaction-option",
          payload: { responseValue: "ch2", responseLabel: "Chapter 2" },
        },
      ]);
    });

    it("renders waiting_user file slots and emits the file action", function () {
      const container = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderHintRegion(
        container,
        {
          kind: "waiting_user",
          pendingInteraction: {
            inputKind: "upload_files",
            prompt: "Upload the dataset.",
            options: [],
            files: [
              { name: "data.csv", required: true, hint: "CSV export" },
              { name: "notes.md", required: false },
            ],
            fileReply: { supported: true },
            fileAction: { action: "submit-interaction-files", payload: {} },
          },
        },
        (action, payload) => emitted.push({ action, payload }),
      );
      const rows = container.querySelectorAll(
        ".assistant-panel-interaction-file",
      );
      assert.lengthOf(rows, 2);
      assert.equal(
        rows[0].querySelector(".assistant-panel-interaction-file-label")!
          .textContent,
        "data.csv",
      );
      assert.equal(
        rows[0].querySelector(".assistant-panel-interaction-file-state")!
          .textContent,
        "Required",
      );
      assert.equal(
        rows[1].querySelector(".assistant-panel-interaction-file-state")!
          .textContent,
        "Optional",
      );
      const submit = container.querySelector<HTMLButtonElement>(
        ".assistant-panel-interaction-file-submit",
      )!;
      assert.isFalse(submit.disabled);
      submit.click();
      assert.deepEqual(emitted, [
        { action: "submit-interaction-files", payload: {} },
      ]);
    });

    it("keeps text reply available when file replies are unsupported", function () {
      const container = environment.document.createElement("div");
      renderHintRegion(container, {
        kind: "waiting_user",
        pendingInteraction: {
          inputKind: "upload_files",
          prompt: "Upload the dataset.",
          options: [],
          files: [{ name: "data.csv", required: true }],
          fileReply: { supported: false },
          fileAction: null,
        },
      });
      assert.isNull(
        container.querySelector(".assistant-panel-interaction-file-submit"),
        "no file submit button without capability",
      );
      assert.isOk(
        container.querySelector(
          ".assistant-panel-interaction-file-unavailable",
        ),
        "unavailable notice replaces the submit button",
      );
    });

    it("keeps the subtree identical for equal interaction input", function () {
      const container = environment.document.createElement("div");
      const interaction = () => ({
        kind: "running",
        title: "Working",
      });
      renderHintRegion(container, interaction());
      const before = subtreeNodes(container);
      renderHintRegion(container, interaction());
      const after = subtreeNodes(container);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });
  });

  describe("ReplyRegion", function () {
    function replyPanel(overrides: Record<string, unknown> = {}) {
      return {
        kind: "acp-chat",
        context: { id: "conv-1" },
        lifecycle: { replyState: "idle" },
        reply: {
          enabled: true,
          inputEnabled: true,
          placeholder: "Ask anything",
          hint: "Ctrl+Enter to send",
          submitLabel: "Send",
          action: "reply",
          value: "",
          sending: false,
          clearOnSend: true,
          showUsageGauge: false,
          controls: [],
        },
        usage: null,
        ...overrides,
      };
    }

    function renderReplyRegion(
      container: Element,
      panel: ReturnType<typeof replyPanel>,
      onAction: (action: string, payload: unknown) => void = () => {},
    ) {
      if (!container.isConnected) {
        environment.document.body.appendChild(container);
      }
      render(
        h(ReplyRegion, {
          container,
          panel,
          onAction,
          labelOf: (_path: string, fallback: string) => fallback,
        } as never),
        container as never,
      );
    }

    function replyInput(container: Element) {
      return container.querySelector<HTMLTextAreaElement>(
        ".assistant-panel-reply-input",
      )!;
    }

    it("renders textarea, footer, submit button, and container attrs", function () {
      const container = environment.document.createElement("div");
      renderReplyRegion(container, replyPanel());
      const input = replyInput(container);
      assert.equal(input.placeholder, "Ask anything");
      assert.isFalse(input.disabled);
      const button = container.querySelector<HTMLButtonElement>(
        ".assistant-panel-reply-submit",
      )!;
      assert.equal(button.textContent, "Send");
      assert.equal(
        button.getAttribute("data-assistant-button-tone"),
        "primary",
      );
      assert.isFalse(button.disabled);
      assert.equal(
        container.getAttribute("data-assistant-reply-enabled"),
        "true",
      );
      assert.equal(
        container.getAttribute("data-assistant-reply-state"),
        "idle",
      );
      assert.equal(
        container.querySelector(".assistant-panel-reply-hint")!.textContent,
        "Ctrl+Enter to send",
      );
    });

    it("submits on click, clears the input, and records history", function () {
      const container = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderReplyRegion(container, replyPanel(), (action, payload) =>
        emitted.push({ action, payload }),
      );
      const input = replyInput(container);
      input.value = "Summarize this paper";
      container
        .querySelector<HTMLButtonElement>(".assistant-panel-reply-submit")!
        .click();
      assert.deepEqual(emitted, [
        { action: "reply", payload: { message: "Summarize this paper" } },
      ]);
      assert.equal(input.value, "");
      input.value = "";
      input.setSelectionRange(0, 0);
      const up = new environment.window.KeyboardEvent("keydown", {
        key: "ArrowUp",
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(up);
      assert.isTrue(up.defaultPrevented);
      assert.equal(input.value, "Summarize this paper");
    });

    it("submits on Ctrl+Enter without clearing for interrupt actions", function () {
      const container = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      const panel = replyPanel();
      panel.reply = { ...panel.reply, action: "cancel", sending: true };
      renderReplyRegion(container, panel, (action, payload) =>
        emitted.push({ action, payload }),
      );
      const input = replyInput(container);
      input.value = "stop";
      const event = new environment.window.KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      assert.isTrue(event.defaultPrevented);
      assert.deepEqual(emitted, [
        { action: "cancel", payload: { message: "stop" } },
      ]);
      const button = container.querySelector<HTMLButtonElement>(
        ".assistant-panel-reply-submit",
      )!;
      assert.isFalse(
        button.disabled,
        "interrupt action stays enabled while sending",
      );
    });

    it("updates live fields without rebuilding the textarea", function () {
      const container = environment.document.createElement("div");
      renderReplyRegion(container, replyPanel());
      const input = replyInput(container);
      input.focus();
      input.value = "draft in progress";
      input.setSelectionRange(5, 5);
      const changed = replyPanel();
      changed.reply = {
        ...changed.reply,
        placeholder: "New placeholder",
        hint: "New hint",
        submitLabel: "Go",
        value: "draft in progress",
      };
      renderReplyRegion(container, changed);
      const after = replyInput(container);
      assert.strictEqual(after, input);
      assert.equal(after.placeholder, "New placeholder");
      assert.equal(after.value, "draft in progress");
      assert.equal(
        environment.document.activeElement,
        input,
        "focus survives live updates",
      );
      assert.equal(after.selectionStart, 5);
      assert.equal(
        container.querySelector(".assistant-panel-reply-hint")!.textContent,
        "New hint",
      );
      assert.equal(
        container.querySelector(".assistant-panel-reply-submit")!.textContent,
        "Go",
      );
    });

    it("syncs the value prop only while unfocused on live updates", function () {
      const container = environment.document.createElement("div");
      renderReplyRegion(container, replyPanel());
      const input = replyInput(container);
      input.focus();
      input.value = "user typing";
      const changed = replyPanel();
      changed.reply = { ...changed.reply, value: "server draft" };
      renderReplyRegion(container, changed);
      assert.equal(input.value, "user typing");
      input.blur();
      const again = replyPanel();
      again.reply = {
        ...again.reply,
        value: "server draft v2",
        hint: "changed",
      };
      renderReplyRegion(container, again);
      assert.equal(input.value, "server draft v2");
    });

    it("merges the reply action payload into the submitted payload", function () {
      const container = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      const panel = replyPanel();
      panel.reply = {
        ...panel.reply,
        action: "reply-run",
        payload: { interactionId: "int-1" },
      };
      renderReplyRegion(container, panel, (action, payload) =>
        emitted.push({ action, payload }),
      );
      replyInput(container).value = "continue";
      container
        .querySelector<HTMLButtonElement>(".assistant-panel-reply-submit")!
        .click();
      assert.deepEqual(emitted, [
        {
          action: "reply-run",
          payload: { interactionId: "int-1", message: "continue" },
        },
      ]);
    });

    it("emits the latest payload after a payload-only update", function () {
      const container = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      const first = replyPanel();
      first.reply = {
        ...first.reply,
        action: "reply-run",
        payload: { interactionId: "int-1" },
      };
      renderReplyRegion(container, first, (action, payload) =>
        emitted.push({ action, payload }),
      );
      const second = replyPanel();
      second.reply = {
        ...second.reply,
        action: "reply-run",
        payload: { interactionId: "int-2" },
      };
      renderReplyRegion(container, second, (action, payload) =>
        emitted.push({ action, payload }),
      );
      replyInput(container).value = "second round";
      container
        .querySelector<HTMLButtonElement>(".assistant-panel-reply-submit")!
        .click();
      assert.deepEqual(emitted, [
        {
          action: "reply-run",
          payload: { interactionId: "int-2", message: "second round" },
        },
      ]);
    });

    it("replaces the value on structure change even while focused", function () {
      const container = environment.document.createElement("div");
      renderReplyRegion(container, replyPanel());
      const input = replyInput(container);
      input.focus();
      input.value = "old owner draft";
      const switched = replyPanel({ context: { id: "conv-2" } });
      switched.reply = { ...switched.reply, value: "new owner draft" };
      renderReplyRegion(container, switched);
      assert.equal(replyInput(container).value, "new owner draft");
    });

    it("renders controls and the usage gauge", function () {
      const container = environment.document.createElement("div");
      const panel = replyPanel();
      panel.reply = {
        ...panel.reply,
        controls: [
          {
            id: "mode",
            label: "Mode",
            value: "live",
            options: [{ value: "live", label: "Live" }],
          },
        ],
        showUsageGauge: true,
      };
      panel.usage = { used: 4000, size: 8000 };
      renderReplyRegion(container, panel);
      assert.isOk(
        container.querySelector(".assistant-panel-reply-controls select"),
      );
      const gauge = container.querySelector(".assistant-panel-usage-gauge")!;
      assert.equal(
        gauge.querySelector(".assistant-panel-usage-label")!.textContent,
        "50%",
      );
      assert.equal(
        (
          gauge.querySelector(".assistant-panel-usage-ring") as HTMLElement
        ).style.getPropertyValue("--assistant-usage-percent"),
        "50%",
      );
    });

    it("keeps the subtree identical for equal reply input", function () {
      const container = environment.document.createElement("div");
      renderReplyRegion(container, replyPanel());
      const before = subtreeNodes(container);
      renderReplyRegion(container, replyPanel());
      const after = subtreeNodes(container);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });
  });

  describe("PermissionDrawerRegion", function () {
    function drawerSelection(overrides: Record<string, unknown> = {}) {
      return {
        open: true,
        request: {
          toolTitle: "write_file",
          summary: "Write to disk",
          approvalKind: "zotero-write",
          review: { command: "fs.write('/tmp/a')", requestedAt: "10:00" },
          actions: [
            { action: "approve", label: "Allow" },
            { action: "deny", label: "Deny" },
          ],
        },
        labels: { close: "Close", title: "Permission request" },
        ...overrides,
      };
    }

    function renderPermissionDrawer(
      overlay: Element,
      selection: ReturnType<typeof drawerSelection>,
      onAction: (action: string, payload: unknown) => void = () => {},
    ) {
      render(
        h(PermissionDrawerRegion, {
          container: overlay,
          selection,
          onAction,
          labelOf: (_path: string, fallback: string) => fallback,
        } as never),
        overlay as never,
      );
    }

    it("stays hidden and empty while closed", function () {
      const overlay = environment.document.createElement("section");
      renderPermissionDrawer(
        overlay,
        drawerSelection({ open: false, request: null }),
      );
      assert.isTrue(overlay.classList.contains("hidden"));
      assert.isNull(
        overlay.querySelector(".assistant-panel-permission-drawer-panel"),
      );
    });

    it("renders the sheet with header, meta, command, and actions", function () {
      const overlay = environment.document.createElement("section");
      renderPermissionDrawer(overlay, drawerSelection());
      assert.isFalse(overlay.classList.contains("hidden"));
      const sheet = overlay.querySelector(
        ".assistant-panel-permission-drawer-panel",
      )!;
      assert.equal(
        sheet.querySelector(
          ".assistant-panel-permission-drawer-title-stack strong",
        )!.textContent,
        "write_file",
      );
      assert.equal(
        sheet.querySelector(".assistant-panel-permission-drawer-subtitle")!
          .textContent,
        "Write to disk",
      );
      assert.equal(
        sheet.querySelector(".assistant-panel-permission-drawer-meta")!
          .textContent,
        "Source: Zotero · Requested: 10:00",
      );
      assert.equal(
        sheet.querySelector(".assistant-panel-permission-drawer-command")!
          .textContent,
        "fs.write('/tmp/a')",
      );
      assert.lengthOf(
        sheet.querySelectorAll(
          ".assistant-panel-permission-drawer-actions button",
        ),
        2,
      );
    });

    it("emits close from the close button and outside clicks only", function () {
      const overlay = environment.document.createElement("section");
      environment.document.body.appendChild(overlay);
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderPermissionDrawer(overlay, drawerSelection(), (action, payload) =>
        emitted.push({ action, payload }),
      );
      (
        overlay.querySelector(
          ".assistant-panel-permission-drawer-header button",
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted, [
        { action: "close-permission-request", payload: {} },
      ]);
      const sheet = overlay.querySelector(
        ".assistant-panel-permission-drawer-panel",
      )!;
      sheet.dispatchEvent(
        new environment.window.MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );
      assert.lengthOf(emitted, 1, "inside clicks do not close");
      overlay.dispatchEvent(
        new environment.window.MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );
      assert.lengthOf(emitted, 2, "outside click closes");
    });

    it("clears the sheet when the drawer closes", function () {
      const overlay = environment.document.createElement("section");
      renderPermissionDrawer(overlay, drawerSelection());
      renderPermissionDrawer(
        overlay,
        drawerSelection({ open: false, request: null }),
      );
      assert.isTrue(overlay.classList.contains("hidden"));
      assert.isNull(
        overlay.querySelector(".assistant-panel-permission-drawer-panel"),
      );
    });

    it("keeps the subtree identical for equal selections", function () {
      const overlay = environment.document.createElement("section");
      renderPermissionDrawer(overlay, drawerSelection());
      const before = subtreeNodes(overlay);
      renderPermissionDrawer(overlay, drawerSelection());
      const after = subtreeNodes(overlay);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });
  });

  describe("DetailsDrawerRegion", function () {
    function detailsSelection(overrides: Record<string, unknown> = {}) {
      return {
        title: "",
        details: [
          "raw log line",
          {
            title: "Runner",
            summary: "2 entries",
            kind: "metadata",
            entries: [
              { label: "Status", value: "running" },
              { kind: "code", label: "Command", value: "npm test" },
            ],
          },
          {
            title: "Collapsed",
            collapsible: true,
            defaultCollapsed: true,
            entries: [],
          },
        ],
        loading: false,
        actions: [{ action: "refresh-owner-details", label: "Refresh" }],
        labels: {
          close: "Close",
          empty: "No details.",
          noEntries: "No entries.",
          title: "Details",
        },
        ...overrides,
      };
    }

    function renderDetailsDrawerRegion(
      mount: Element,
      selection: ReturnType<typeof detailsSelection>,
      onAction: (action: string, payload: unknown) => void = () => {},
    ) {
      render(
        h(DetailsDrawerRegion, {
          container: mount,
          selection,
          onAction,
          labelOf: (_path: string, fallback: string) => fallback,
        } as never),
        mount as never,
      );
    }

    it("renders header, string entries, sections, and entry rows", function () {
      const mount = environment.document.createElement("div");
      renderDetailsDrawerRegion(mount, detailsSelection());
      assert.equal(
        mount.querySelector(".assistant-panel-details-header strong")!
          .textContent,
        "Details",
      );
      assert.isOk(
        mount.querySelector(".assistant-panel-details-actions button"),
      );
      const pre = mount.querySelector("pre.assistant-panel-details-entry")!;
      assert.equal(pre.textContent, "raw log line");
      const sections = mount.querySelectorAll(
        "section.assistant-panel-details-section",
      );
      assert.lengthOf(sections, 1);
      const runner = sections[0];
      assert.equal(
        runner.getAttribute("data-assistant-details-kind"),
        "metadata",
      );
      const rows = runner.querySelectorAll(".assistant-panel-details-row");
      assert.lengthOf(rows, 2);
      assert.equal(
        rows[0].querySelector(".assistant-panel-details-label")!.textContent,
        "Status",
      );
      assert.equal(
        rows[0].querySelector(".assistant-panel-details-value")!.textContent,
        "running",
      );
      assert.isOk(
        rows[1].querySelector(".asst-code-surface"),
        "code entry uses the code surface",
      );
      const collapsed = mount.querySelector(
        "details.assistant-panel-details-section",
      )!;
      assert.isOk(collapsed);
      assert.isFalse((collapsed as HTMLDetailsElement).open);
      assert.equal(
        collapsed.querySelector(".assistant-panel-details-empty")!.textContent,
        "No entries.",
      );
    });

    it("renders the empty and loading states", function () {
      const mount = environment.document.createElement("div");
      renderDetailsDrawerRegion(mount, detailsSelection({ details: [] }));
      assert.equal(
        mount.querySelector(".assistant-panel-details-empty")!.textContent,
        "No details.",
      );
      renderDetailsDrawerRegion(
        mount,
        detailsSelection({ details: [], loading: true }),
      );
      assert.equal(
        mount.querySelector(".assistant-panel-details-empty")!.textContent,
        "Loading details...",
      );
    });

    it("emits close-details-drawer from the close button", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderDetailsDrawerRegion(mount, detailsSelection(), (action, payload) =>
        emitted.push({ action, payload }),
      );
      (
        mount.querySelector(
          ".assistant-panel-details-header > button",
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted, [
        { action: "close-details-drawer", payload: {} },
      ]);
    });

    it("keeps the subtree identical for equal selections", function () {
      const mount = environment.document.createElement("div");
      renderDetailsDrawerRegion(mount, detailsSelection());
      const before = subtreeNodes(mount);
      renderDetailsDrawerRegion(mount, detailsSelection());
      const after = subtreeNodes(mount);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });
  });

  describe("ContextDrawerRegion", function () {
    function drawerSelection(overrides: Record<string, unknown> = {}) {
      return {
        layout: "workspace-task-drawer",
        contextTitle: "Runs",
        selectedTaskKey: "task-a",
        sections: [
          {
            id: "running",
            title: "Running",
            collapsible: true,
            collapsed: false,
            groups: [
              {
                backendId: "claude",
                backendDisplayName: "Claude",
                activeTasks: [
                  {
                    key: "task-a",
                    title: "Task Alpha",
                    workflowLabel: "lit",
                    mainStatus: "running",
                    mainStatusLabel: "Running",
                    backendStatus: "connected",
                    backendStatusLabel: "Connected",
                    applyStatus: "idle",
                    updatedAt: "10:00",
                    selectable: true,
                  },
                ],
                finishedTasks: [],
              },
            ],
          },
          {
            id: "completed",
            title: "Completed",
            collapsible: true,
            collapsed: true,
            groups: [
              {
                backendId: "claude",
                backendDisplayName: "Claude",
                activeTasks: [],
                finishedTasks: [
                  {
                    key: "task-b",
                    title: "Task Beta",
                    mainStatus: "succeeded",
                    terminal: true,
                    selectable: true,
                    itemActions: [
                      {
                        action: "archive-task",
                        icon: "archive",
                        enabled: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        notice: "",
        labels: {},
        ...overrides,
      };
    }

    function renderContextDrawer(
      mount: Element,
      selection: ReturnType<typeof drawerSelection>,
      onAction: (action: string, payload: unknown) => void = () => {},
    ) {
      render(
        h(ContextDrawerRegion, {
          container: mount,
          selection,
          onAction,
          labelOf: (_path: string, fallback: string) => fallback,
          statusTone: (status: string) =>
            status === "running" ? "accent" : "muted",
        } as never),
        mount as never,
      );
    }

    it("renders sections, groups, and task rows", function () {
      const mount = environment.document.createElement("div");
      renderContextDrawer(mount, drawerSelection());
      assert.equal(
        mount.querySelector(".assistant-workspace-drawer-header strong")!
          .textContent,
        "Runs",
      );
      const running = mount.querySelector(
        '[data-assistant-section-id="running"]',
      )!;
      assert.include(running.className, "is-running");
      assert.include(running.className, "is-expanded");
      const completed = mount.querySelector(
        '[data-assistant-section-id="completed"]',
      )!;
      assert.include(completed.className, "is-collapsed");
      assert.isNull(
        completed.querySelector('[data-assistant-task-key="task-b"]'),
        "collapsed section does not render its tasks",
      );
      const row = running.querySelector('[data-assistant-task-key="task-a"]')!;
      assert.include(row.className, "is-active");
      assert.equal(
        row.querySelector(".assistant-workspace-drawer-task-title")!
          .textContent,
        "Task Alpha",
      );
      assert.equal(
        row.querySelector(".assistant-workspace-drawer-task-main-status")!
          .textContent,
        "Running",
      );
      assert.equal(
        row.querySelector(".assistant-workspace-drawer-task-updated-at")!
          .textContent,
        "10:00",
      );
      const axes = row.querySelectorAll(
        ".assistant-workspace-drawer-task-status-axis",
      );
      assert.lengthOf(axes, 2);
    });

    it("emits select-task, toggle-section, toggle-group, and close", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderContextDrawer(mount, drawerSelection(), (action, payload) =>
        emitted.push({ action, payload }),
      );
      (
        mount.querySelector(
          '[data-assistant-task-key="task-a"] .assistant-workspace-drawer-task-main',
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted[0], {
        action: "select-task",
        payload: { taskKey: "task-a" },
      });
      (
        mount.querySelector(
          '[data-assistant-section-id="completed"] .assistant-workspace-drawer-section-toggle',
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted[1], {
        action: "toggle-drawer-section",
        payload: { sectionId: "completed" },
      });
      (
        mount.querySelector(
          ".assistant-workspace-drawer-group-header",
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted[2], {
        action: "toggle-drawer-group",
        payload: {
          sectionId: "running",
          backendId: "claude",
          groupKey: "claude",
          collapsed: false,
        },
      });
      (
        mount.querySelector(
          ".assistant-workspace-drawer-header > button",
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted[3], {
        action: "close-context-drawer",
        payload: {},
      });
    });

    it("patches selection state in place and preserves row identity", function () {
      const mount = environment.document.createElement("div");
      renderContextDrawer(mount, drawerSelection());
      const rowBefore = mount.querySelector(
        '[data-assistant-task-key="task-a"]',
      )!;
      const textBefore = subtreeNodes(mount);
      const moved = drawerSelection({ selectedTaskKey: "task-b" });
      moved.sections[0].groups[0].activeTasks[0] = {
        ...moved.sections[0].groups[0].activeTasks[0],
        updatedAt: "10:05",
      } as never;
      renderContextDrawer(mount, moved);
      const rowAfter = mount.querySelector(
        '[data-assistant-task-key="task-a"]',
      )!;
      assert.strictEqual(rowAfter, rowBefore);
      assert.notInclude(rowAfter.className, "is-active");
      assert.equal(
        rowAfter.querySelector(".assistant-workspace-drawer-task-updated-at")!
          .textContent,
        "10:05",
      );
      const textAfter = subtreeNodes(mount);
      assert.equal(textAfter.length, textBefore.length);
      let rebuilt = 0;
      textAfter.forEach((node, index) => {
        if (node !== textBefore[index]) rebuilt += 1;
      });
      assert.isAtMost(rebuilt, 1, "only the updatedAt text node may change");
    });

    it("renders empty and notice states", function () {
      const mount = environment.document.createElement("div");
      renderContextDrawer(
        mount,
        drawerSelection({ sections: [], notice: "History trimmed" }),
      );
      assert.equal(
        mount.querySelector(".assistant-workspace-drawer-empty")!.textContent,
        "No runs.",
      );
      assert.equal(
        mount.querySelector(".assistant-workspace-drawer-history-notice")!
          .textContent,
        "History trimmed",
      );
    });

    it("renders task item actions and emits them", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      const selection = drawerSelection();
      selection.sections[1].collapsed = false;
      renderContextDrawer(mount, selection, (action, payload) =>
        emitted.push({ action, payload }),
      );
      const archive = mount.querySelector(
        '[data-assistant-task-key="task-b"] .assistant-workspace-drawer-task-action',
      ) as HTMLButtonElement;
      assert.isOk(archive);
      archive.click();
      assert.deepEqual(emitted, [{ action: "archive-task", payload: {} }]);
    });

    it("keeps the subtree identical for equal selections", function () {
      const mount = environment.document.createElement("div");
      renderContextDrawer(mount, drawerSelection());
      const before = subtreeNodes(mount);
      renderContextDrawer(mount, drawerSelection());
      const after = subtreeNodes(mount);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });

    it("keeps backend-unreachable groups visible as disabled with their reason", function () {
      const mount = environment.document.createElement("div");
      const unreachableSection = {
        id: "unavailable",
        title: "Unavailable",
        collapsible: true,
        collapsed: false,
        groups: [
          {
            backendId: "ghost",
            backendDisplayName: "Ghost Backend",
            disabled: true,
            disabledReason:
              "Backend Ghost Backend is temporarily unreachable. Please try again later.",
            collapsed: true,
            activeTasks: [],
            finishedTasks: [],
          },
        ],
      };
      renderContextDrawer(
        mount,
        drawerSelection({ sections: [unreachableSection] }),
      );
      const group = mount.querySelector('[data-assistant-group-key="ghost"]')!;
      assert.isOk(group, "empty disabled group still renders");
      assert.include(group.className, "is-disabled");
      assert.equal(
        group.querySelector(".assistant-workspace-drawer-group-disabled-tag")!
          .textContent,
        "Unavailable",
      );
      assert.equal(
        group.querySelector(".assistant-workspace-drawer-group-disabled-hint")!
          .textContent,
        "Backend Ghost Backend is temporarily unreachable. Please try again later.",
      );
      assert.isNull(
        mount.querySelector(".assistant-workspace-drawer-empty"),
        "a disabled group counts as drawer content",
      );
    });

    it("renders the queued section collapsed by default with a cancel action", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      const queuedSection = (collapsed: boolean) => ({
        id: "queued",
        title: "Queued",
        collapsible: true,
        collapsed,
        groups: [
          {
            backendId: "claude",
            backendDisplayName: "Claude",
            activeTasks: [
              {
                key: "host-queue:queue-1",
                title: "Queued Paper",
                mainStatus: "queued",
                mainStatusLabel: "Queued",
                showBackendStatusBadge: false,
                showApplyStatusBadge: false,
                selectable: false,
                itemActions: [
                  {
                    action: "cancel-queued-workflow-unit",
                    label: "Cancel queued workflow unit",
                    icon: "cancel",
                    enabled: true,
                    payload: { queueId: "queue-1" },
                  },
                ],
              },
            ],
            finishedTasks: [],
          },
        ],
      });
      const withQueued = (collapsed: boolean) =>
        drawerSelection({
          sections: [...drawerSelection().sections, queuedSection(collapsed)],
        });
      renderContextDrawer(mount, withQueued(true), (action, payload) =>
        emitted.push({ action, payload }),
      );
      const queued = mount.querySelector(
        '[data-assistant-section-id="queued"]',
      )!;
      assert.include(queued.className, "is-queued");
      assert.include(queued.className, "is-collapsed");
      assert.isNull(
        queued.querySelector('[data-assistant-task-key="host-queue:queue-1"]'),
        "collapsed queued section does not render its tasks",
      );
      (
        queued.querySelector(
          ".assistant-workspace-drawer-section-toggle",
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(emitted[0], {
        action: "toggle-drawer-section",
        payload: { sectionId: "queued" },
      });
      renderContextDrawer(mount, withQueued(false), (action, payload) =>
        emitted.push({ action, payload }),
      );
      const row = mount.querySelector(
        '[data-assistant-task-key="host-queue:queue-1"]',
      )!;
      assert.isOk(row);
      assert.lengthOf(
        row.querySelectorAll(".assistant-workspace-drawer-task-status-axis"),
        0,
        "queued task hides both status axes",
      );
      const cancel = row.querySelector<HTMLButtonElement>(
        ".assistant-workspace-drawer-task-action",
      )!;
      assert.include(cancel.className, "is-cancel");
      assert.isOk(cancel.querySelector(".zs-icon-close"));
      cancel.click();
      assert.deepEqual(emitted[1], {
        action: "cancel-queued-workflow-unit",
        payload: { queueId: "queue-1" },
      });
    });

    it("routes a collapse toggle for every collapsible section", function () {
      const mount = environment.document.createElement("div");
      const emitted: Array<{ action: string; payload: unknown }> = [];
      renderContextDrawer(mount, drawerSelection(), (action, payload) =>
        emitted.push({ action, payload }),
      );
      const toggles = Array.from(
        mount.querySelectorAll<HTMLButtonElement>(
          ".assistant-workspace-drawer-section-toggle",
        ),
      );
      assert.lengthOf(toggles, 2);
      toggles.forEach((toggle) => toggle.click());
      assert.deepEqual(emitted, [
        { action: "toggle-drawer-section", payload: { sectionId: "running" } },
        {
          action: "toggle-drawer-section",
          payload: { sectionId: "completed" },
        },
      ]);
    });

    it("does not render backend groups without task cards", function () {
      const mount = environment.document.createElement("div");
      const selection = drawerSelection();
      (selection.sections[0].groups as Array<Record<string, unknown>>).push({
        backendId: "backend-empty",
        backendDisplayName: "Backend Empty",
        activeTasks: [],
        finishedTasks: [],
      });
      renderContextDrawer(mount, selection);
      const running = mount.querySelector(
        '[data-assistant-section-id="running"]',
      )!;
      assert.lengthOf(
        running.querySelectorAll(".assistant-workspace-drawer-group"),
        1,
      );
      assert.isNull(
        running.querySelector('[data-assistant-group-key="backend-empty"]'),
      );
    });
  });

  describe("TranscriptRegion", function () {
    function renderTranscriptRegion(
      container: Element,
      props: {
        state: "idle" | "loading" | "failed" | "ready";
        message?: string;
        mode?: "plain" | "bubble";
        ownerKey?: string;
      },
      onResetVirtualState: (target: Element) => void = () => {},
    ) {
      render(
        h(TranscriptRegion, {
          container,
          state: props.state,
          message: props.message || "",
          mode: props.mode || "plain",
          ownerKey: props.ownerKey || "",
          onResetVirtualState,
        } as never),
        container as never,
      );
    }

    it("renders the loading placeholder with spinner classes", function () {
      const container = environment.document.createElement("section");
      renderTranscriptRegion(container, { state: "loading" });
      const node = container.querySelector(
        '[data-assistant-transcript-state="loading"]',
      )!;
      assert.include(node.className, "assistant-transcript-loading");
      assert.include(node.className, "asst-spinner");
      assert.include(container.className, "plain-mode");
    });

    it("resets the imperative transcript state when entering a non-ready state", function () {
      const container = environment.document.createElement("section");
      const resets: Element[] = [];
      renderTranscriptRegion(container, { state: "ready" }, (target) =>
        resets.push(target),
      );
      assert.lengthOf(resets, 0);
      renderTranscriptRegion(container, { state: "loading" }, (target) =>
        resets.push(target),
      );
      assert.deepEqual(resets, [container]);
    });

    it("preserves the placeholder node across repeated same-state renders", function () {
      const container = environment.document.createElement("section");
      renderTranscriptRegion(container, { state: "loading" });
      const before = subtreeNodes(container);
      renderTranscriptRegion(container, { state: "loading" });
      renderTranscriptRegion(container, { state: "loading" });
      const after = subtreeNodes(container);
      assert.equal(after.length, before.length);
      after.forEach((node, index) => {
        assert.strictEqual(node, before[index], `node #${index} rebuilt`);
      });
    });

    it("rebuilds the placeholder when the owner changes with identical state", function () {
      const container = environment.document.createElement("section");
      const resets: Element[] = [];
      const onReset = (target: Element) => resets.push(target);
      renderTranscriptRegion(
        container,
        { state: "loading", ownerKey: "owner-a" },
        onReset,
      );
      const before = container.querySelector(
        '[data-assistant-transcript-state="loading"]',
      )!;
      renderTranscriptRegion(
        container,
        { state: "loading", ownerKey: "owner-b" },
        onReset,
      );
      const after = container.querySelector(
        '[data-assistant-transcript-state="loading"]',
      )!;
      assert.notStrictEqual(after, before);
      assert.deepEqual(resets, [container, container]);
    });

    it("renders failed and empty states with messages and clears them when ready", function () {
      const container = environment.document.createElement("section");
      renderTranscriptRegion(container, {
        state: "failed",
        message: "boom",
      });
      assert.equal(
        container.querySelector('[data-assistant-transcript-state="failed"]')!
          .textContent,
        "boom",
      );
      renderTranscriptRegion(container, { state: "ready" });
      assert.isNull(
        container.querySelector("[data-assistant-transcript-state]"),
      );
      renderTranscriptRegion(container, { state: "idle" });
      assert.equal(
        container.querySelector('[data-assistant-transcript-state="idle"]')!
          .className,
        "assistant-transcript-empty",
      );
    });

    it("toggles bubble and plain mode classes on the container", function () {
      const container = environment.document.createElement("section");
      renderTranscriptRegion(container, { state: "ready", mode: "bubble" });
      assert.include(container.className, "bubble-mode");
      assert.notInclude(container.className, "plain-mode");
      renderTranscriptRegion(container, { state: "ready", mode: "plain" });
      assert.include(container.className, "plain-mode");
      assert.notInclude(container.className, "bubble-mode");
    });
  });

  describe("ViewModeToggle", function () {
    function renderViewModeToggle(
      container: Element,
      mode: "plain" | "bubble",
      onSelect: (mode: string) => void = () => {},
      labels: Record<string, string> = {},
    ) {
      render(
        h(ViewModeToggle, {
          container,
          mode,
          labels,
          onSelect,
        } as never),
        container as never,
      );
    }

    it("renders both buttons with labels and aria-pressed from the mode", function () {
      const container = environment.document.createElement("div");
      renderViewModeToggle(container, "bubble", () => {}, {
        view: "View",
        plain: "Plain",
        bubble: "Bubble",
      });
      assert.equal(container.getAttribute("aria-label"), "View");
      const plain = container.querySelector(
        '[data-assistant-view-mode="plain"]',
      )!;
      const bubble = container.querySelector(
        '[data-assistant-view-mode="bubble"]',
      )!;
      assert.equal(plain.getAttribute("aria-pressed"), "false");
      assert.equal(bubble.getAttribute("aria-pressed"), "true");
      assert.equal(plain.getAttribute("aria-label"), "Plain");
      assert.equal(
        plain.querySelector(".asst-view-mode-label")!.textContent,
        "Plain",
      );
      assert.isOk(plain.querySelector(".zs-icon-subject"));
      assert.isOk(bubble.querySelector(".zs-icon-forum"));
    });

    it("emits the selected mode on click", function () {
      const container = environment.document.createElement("div");
      const selected: string[] = [];
      renderViewModeToggle(container, "plain", (mode) => selected.push(mode));
      (
        container.querySelector(
          '[data-assistant-view-mode="bubble"]',
        ) as HTMLButtonElement
      ).click();
      assert.deepEqual(selected, ["bubble"]);
    });
  });

  describe("EmptyStateRegion", function () {
    it("renders the empty selection text", function () {
      const container = environment.document.createElement("section");
      render(
        h(EmptyStateRegion, { text: "Select a conversation" } as never),
        container as never,
      );
      assert.equal(container.textContent, "Select a conversation");
    });
  });
});
