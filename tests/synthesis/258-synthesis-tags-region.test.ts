import { assert } from "chai";
import { h, render } from "preact";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../../src/shared/synthesisWorkbenchI18nContract";
import type { SynthesisWorkbenchMessageKey } from "../../src/shared/synthesisWorkbenchWireContract";
import {
  TagsRegion,
  projectSynthesisTagsSelection,
  synthesisWorkbenchTagsOperationKey,
  type SynthesisWorkbenchTagsSelection,
} from "../../src/synthesis/components/TagsRegion";

const t = (
  key: SynthesisWorkbenchMessageKey,
  vars: Record<string, unknown> = {},
) =>
  formatSynthesisWorkbenchMessage(
    SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
    vars,
  );

function flushPreact(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeSelection(
  overrides: Partial<SynthesisWorkbenchTagsSelection> = {},
): SynthesisWorkbenchTagsSelection {
  return {
    view: "vocabulary",
    density: "compact",
    rowCount: 2,
    stagedCount: 1,
    warningCount: 0,
    cacheStale: false,
    facets: ["topic", "method"],
    stagedFacets: ["method"],
    search: "",
    facet: "all",
    status: "all",
    stagedSearch: "",
    stagedFacet: "all",
    selectedVocabularyTags: [],
    selectedStagedTags: [],
    expandedRows: {},
    vocabularyRows: [
      {
        tag: "topic:alpha",
        facet: "topic",
        note: "First",
        usage_count: 3,
        source: "manual",
        aliases: ["alpha-alias"],
        abbrev: [],
        validation_warnings: [],
      },
      {
        tag: "method:beta",
        facet: "method",
        note: "",
        builtin: true,
        usage_count: 0,
        source: "builtin",
        aliases: [],
        abbrev: [],
        validation_warnings: [],
      },
    ],
    stagedRows: [
      {
        tag: "method:alpha",
        facet: "method",
        note: "",
        parent_count: 1,
        source_flow: "flow-a",
        created_at: "2026-09-01",
        updated_at: "2026-09-02",
        parent_bindings: ["method:parent"],
      },
    ],
    importDraft: "",
    importPreview: null,
    importOptimisticallyResolved: false,
    pendingOperationKeys: [],
    lastCompletedOperationKey: "",
    lastFailedOperationKey: "",
    lastFailedMessage: "",
    ...overrides,
  };
}

type DispatchedAction = { action: string; payload: Record<string, unknown> };

function renderTagsRegion(selection: SynthesisWorkbenchTagsSelection) {
  const dispatched: DispatchedAction[] = [];
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const onAction = (
    action: "setFilters" | "hostCommand",
    payload?: Record<string, unknown>,
  ) => {
    dispatched.push({ action, payload: payload || {} });
  };
  render(h(TagsRegion, { selection, t, onAction }), mount);
  return { mount, dispatched, onAction };
}

function buttonByText(root: ParentNode, text: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll("button")).find(
    (node) => node.textContent === text,
  );
  assert.ok(button, `button with text "${text}" exists`);
  return button as HTMLButtonElement;
}

describe("synthesis workbench tags region (src/synthesis/components/TagsRegion)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  it("renders the workbench shell: summary metrics, subview tabs, filters and vocabulary table", function () {
    const { mount } = renderTagsRegion(makeSelection());
    const shell = mount.querySelector("section.tags-workbench");
    assert.ok(shell, "tags workbench shell exists");
    assert.ok(shell!.classList.contains("density-compact"));
    assert.equal(
      shell!.getAttribute("aria-label"),
      t("synthesis-tags-management"),
    );

    const metrics = shell!.querySelectorAll(".tags-summary-metric");
    assert.equal(metrics.length, 4);
    assert.equal(
      metrics[0].querySelector(".badge")?.textContent,
      "2",
      "canonical count",
    );
    assert.equal(
      metrics[1].querySelector(".badge")?.textContent,
      "1",
      "staged count",
    );

    const tabs = shell!.querySelectorAll('.tags-subview-tabs [role="tab"]');
    assert.equal(tabs.length, 2);
    assert.equal(
      tabs[0].textContent,
      t("synthesis-tags-tab-vocabulary", { count: 2 }),
    );
    assert.ok(tabs[0].classList.contains("active"));

    const search = shell!.querySelector<HTMLInputElement>(
      '[data-synthesis-control-key="tags.search"]',
    );
    assert.ok(search, "vocabulary search input exists");
    assert.equal(search!.placeholder, t("synthesis-search-tags"));

    const table = shell!.querySelector(
      ".tags-vocabulary-table table.tags-table",
    );
    assert.ok(table, "vocabulary table rendered");
    assert.equal(table!.querySelectorAll("thead th").length, 11);
    const rows = table!.querySelectorAll("tbody tr");
    assert.equal(rows.length, 2, "one row per visible vocabulary tag");
    assert.match(rows[0].textContent || "", /topic:alpha/);
    assert.match(rows[1].textContent || "", /Builtin/);
    assert.ok(
      shell!.querySelector(".tags-bulk-bar-passive"),
      "vocabulary bulk bar rendered",
    );
  });

  it("dispatches setFilters for search and facet filter controls", function () {
    const { mount, dispatched } = renderTagsRegion(makeSelection());
    const search = mount.querySelector<HTMLInputElement>(
      '[data-synthesis-control-key="tags.search"]',
    )!;
    search.value = "alpha";
    search.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.deepEqual(dispatched[0], {
      action: "setFilters",
      payload: { tags: { search: "alpha" } },
    });

    const facetSelect =
      mount.querySelector<HTMLSelectElement>(".filters select")!;
    facetSelect.value = "method";
    facetSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.deepEqual(dispatched[1], {
      action: "setFilters",
      payload: { tags: { facet: "method" } },
    });
  });

  it("dispatches validate/export host commands without args and the subview switch setFilters", function () {
    const { mount, dispatched } = renderTagsRegion(makeSelection());
    buttonByText(mount, t("synthesis-action-validate")).click();
    buttonByText(mount, t("synthesis-action-export")).click();
    const stagedTab = mount.querySelectorAll<HTMLButtonElement>(
      '.tags-subview-tabs [role="tab"]',
    )[1];
    stagedTab.click();
    assert.deepEqual(dispatched, [
      { action: "hostCommand", payload: { command: "validateTagVocabulary" } },
      { action: "hostCommand", payload: { command: "exportTagVocabulary" } },
      { action: "setFilters", payload: { tags: { view: "staged" } } },
    ]);
  });

  it("toggles vocabulary row expansion through setFilters expandedRows", function () {
    const { mount, dispatched } = renderTagsRegion(makeSelection());
    const expand = mount.querySelector<HTMLButtonElement>(
      ".tags-vocabulary-table .tags-expand-button",
    )!;
    assert.equal(expand.textContent, t("synthesis-action-details"));
    expand.click();
    assert.deepEqual(dispatched, [
      {
        action: "setFilters",
        payload: { tags: { expandedRows: { "vocabulary:topic:alpha": true } } },
      },
    ]);
  });

  it("flows vocabulary edit -> apply as editingVocabularyTag + updateTagVocabularyEntry", async function () {
    const selection = makeSelection();
    const { mount, dispatched, onAction } = renderTagsRegion(selection);
    buttonByText(mount, t("synthesis-action-edit")).click();
    assert.deepEqual(dispatched, [
      {
        action: "setFilters",
        payload: {
          tags: {
            editingVocabularyTag: {
              originalTag: "topic:alpha",
              draftTag: "topic:alpha",
              draftFacet: "topic",
              draftNote: "First",
              status: "idle",
            },
          },
        },
      },
    ]);

    // Host echo: the editing draft arrives through the wire filters.
    dispatched.length = 0;
    render(
      h(TagsRegion, {
        selection: makeSelection({
          editingVocabularyTag: {
            originalTag: "topic:alpha",
            draftTag: "topic:alpha",
            draftFacet: "topic",
            draftNote: "First",
            status: "idle",
          },
        }),
        t,
        onAction,
      }),
      mount,
    );
    await flushPreact();
    const tagInput = mount.querySelector<HTMLInputElement>(
      '[data-synthesis-control-key="tags.vocabulary.topic:alpha.tag"]',
    )!;
    assert.ok(tagInput, "edit-mode tag input rendered");
    tagInput.value = "topic:alpha2";
    tagInput.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.deepEqual(dispatched, [
      {
        action: "setFilters",
        payload: {
          tags: {
            editingVocabularyTag: {
              originalTag: "topic:alpha",
              draftTag: "topic:alpha2",
              draftFacet: "topic",
              draftNote: "First",
              status: "idle",
            },
          },
        },
      },
    ]);

    dispatched.length = 0;
    buttonByText(mount, t("synthesis-action-apply")).click();
    assert.deepEqual(dispatched, [
      {
        action: "setFilters",
        payload: {
          tags: {
            editingVocabularyTag: {
              originalTag: "topic:alpha",
              draftTag: "topic:alpha2",
              draftFacet: "topic",
              draftNote: "First",
              status: "pending",
            },
          },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "updateTagVocabularyEntry",
          args: {
            originalTag: "topic:alpha",
            tag: "topic:alpha2",
            facet: "topic",
            note: "First",
          },
        },
      },
    ]);
  });

  it("deletes a non-builtin vocabulary tag after confirmation", function () {
    (window as unknown as { confirm: (message?: string) => boolean }).confirm =
      () => true;
    const { mount, dispatched } = renderTagsRegion(makeSelection());
    buttonByText(mount, t("synthesis-action-delete")).click();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "deleteTagVocabularyEntry",
          args: { originalTag: "topic:alpha", tag: "topic:alpha" },
        },
      },
    ]);
  });

  it("renders the staged inbox and dispatches row promote with { tag, tags: [tag] }", function () {
    const { mount, dispatched } = renderTagsRegion(
      makeSelection({ view: "staged" }),
    );
    const table = mount.querySelector(".tags-staged-table table.tags-table");
    assert.ok(table, "staged table rendered");
    assert.equal(table!.querySelectorAll("thead th").length, 8);
    const stagedInput = table!.querySelector<HTMLInputElement>(
      '[data-synthesis-control-key="tags.staged.method:alpha.tag"]',
    );
    assert.ok(stagedInput, "staged tag edit input rendered");
    assert.equal(stagedInput!.value, "alpha", "facet prefix stripped");

    buttonByText(table!, t("synthesis-action-promote")).click();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "promoteStagedTagSuggestions",
          args: { tag: "method:alpha", tags: ["method:alpha"] },
        },
      },
    ]);
  });

  it("commits staged edits on change with composed facet tag and wire payload", function () {
    const { mount, dispatched } = renderTagsRegion(
      makeSelection({ view: "staged" }),
    );
    const tagInput = mount.querySelector<HTMLInputElement>(
      '[data-synthesis-control-key="tags.staged.method:alpha.tag"]',
    )!;
    tagInput.value = "gamma";
    tagInput.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.deepEqual(dispatched, [
      {
        action: "setFilters",
        payload: {
          tags: {
            editingStagedTag: {
              originalTag: "method:alpha",
              draftTag: "gamma",
              draftFacet: "method",
              draftNote: "",
              status: "pending",
            },
          },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "updateStagedTagSuggestion",
          args: {
            originalTag: "method:alpha",
            tag: "method:gamma",
            facet: "method",
            note: "",
            source_flow: "flow-a",
            parent_bindings: ["method:parent"],
          },
        },
      },
    ]);
  });

  it("dispatches staged bulk selection and bulk promote", function () {
    const { mount, dispatched } = renderTagsRegion(
      makeSelection({ view: "staged" }),
    );
    const rowCheckbox = mount.querySelector<HTMLInputElement>(
      '.tags-staged-table tbody input[type="checkbox"]',
    )!;
    rowCheckbox.click();
    assert.deepEqual(dispatched[0], {
      action: "setFilters",
      payload: { tags: { selectedStagedTags: ["method:alpha"] } },
    });

    dispatched.length = 0;
    const withSelection = renderTagsRegion(
      makeSelection({
        view: "staged",
        selectedStagedTags: ["method:alpha"],
      }),
    );
    buttonByText(
      withSelection.mount,
      t("synthesis-action-promote-selected"),
    ).click();
    assert.deepEqual(withSelection.dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "promoteStagedTagSuggestions",
          args: { tags: ["method:alpha"] },
        },
      },
    ]);
  });

  it("shows the staged saving state while the update operation is pending", function () {
    const key = synthesisWorkbenchTagsOperationKey(
      "updateStagedTagSuggestion",
      {
        originalTag: "method:alpha",
      },
    );
    assert.equal(key, "updateStagedTagSuggestion:method:alpha");
    const { mount } = renderTagsRegion(
      makeSelection({
        view: "staged",
        pendingOperationKeys: [key],
      }),
    );
    const state = mount.querySelector(
      ".tags-inline-edit-cell .staged-edit-state",
    );
    assert.ok(state, "edit state badge rendered");
    assert.ok(state!.classList.contains("pending"));
    assert.equal(state!.textContent, "Saving");
  });

  it("marks host command buttons busy while their operation key is pending", function () {
    const { mount } = renderTagsRegion(
      makeSelection({ pendingOperationKeys: ["validateTagVocabulary"] }),
    );
    const validateButton = Array.from(
      mount.querySelectorAll<HTMLButtonElement>(".tags-summary-actions button"),
    ).find((node) =>
      node.textContent?.includes(t("synthesis-action-validate")),
    );
    assert.ok(validateButton, "validate button exists");
    assert.ok(validateButton!.disabled, "pending validate button disabled");
    assert.ok(validateButton!.classList.contains("is-busy"));
    assert.equal(validateButton!.getAttribute("aria-busy"), "true");
    assert.ok(validateButton!.querySelector(".button-spinner"));
  });

  it("opens the import panel locally, streams importDraft, and previews via hostCommand", async function () {
    const selection = makeSelection();
    const { mount, dispatched, onAction } = renderTagsRegion(selection);
    assert.isNull(mount.querySelector(".tag-import-popover"));

    buttonByText(mount, t("synthesis-action-import")).click();
    await flushPreact();
    const panel = mount.querySelector(".tag-import-popover");
    assert.ok(panel, "import panel opens from the summary action");
    const previewButton = buttonByText(
      panel!,
      t("synthesis-action-preview-import"),
    );
    assert.ok(previewButton.disabled, "preview disabled for empty draft");

    const textarea = panel!.querySelector("textarea")!;
    textarea.value = '{"tags":[]}';
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.deepEqual(dispatched, [
      {
        action: "setFilters",
        payload: { tags: { importDraft: '{"tags":[]}' } },
      },
    ]);

    dispatched.length = 0;
    render(
      h(TagsRegion, {
        selection: makeSelection({ importDraft: '{"tags":[]}' }),
        t,
        onAction,
      }),
      mount,
    );
    await flushPreact();
    const panelAfter = mount.querySelector(".tag-import-popover")!;
    const previewAfter = buttonByText(
      panelAfter,
      t("synthesis-action-preview-import"),
    );
    assert.ok(!previewAfter.disabled, "preview enabled with draft");
    previewAfter.click();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "previewTagVocabularyImport",
          args: { payload: '{"tags":[]}' },
        },
      },
    ]);
  });

  it("shows the import preview card with apply actions and dismisses per signature", async function () {
    const preview = {
      additions: [{ tag: "method:new" }],
      builtins: [],
      conflicts: [{ tag: "method:dup", imported: { tag: "method:dup" } }],
      unchanged: [],
      warnings: [],
    };
    const selection = makeSelection({
      importDraft: '{"tags":[{"tag":"method:new"}]}',
      importPreview: preview,
    });
    const { mount, dispatched, onAction } = renderTagsRegion(selection);
    const panel = mount.querySelector(".tag-import-popover");
    assert.ok(panel, "preview panel auto-shows when a preview exists");
    assert.equal(
      panel!.querySelector(".review-card-title strong")?.textContent,
      t("synthesis-tags-import-preview-title"),
    );
    assert.match(
      panel!.textContent || "",
      new RegExp(
        t("synthesis-tags-import-first-conflict", { tag: "method:dup" }),
      ),
    );

    buttonByText(panel!, t("synthesis-action-merge-non-conflicting")).click();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "applyTagVocabularyImport",
          args: {
            payload: '{"tags":[{"tag":"method:new"}]}',
            action: "merge-non-conflicting",
          },
        },
      },
    ]);

    // Close dismisses the panel until the preview signature changes.
    buttonByText(panel!, t("synthesis-action-close")).click();
    await flushPreact();
    assert.isNull(
      mount.querySelector(".tag-import-popover"),
      "closed preview stays dismissed for the same signature",
    );
    render(
      h(TagsRegion, {
        selection: makeSelection({
          importDraft: selection.importDraft,
          importPreview: preview,
        }),
        t,
        onAction,
      }),
      mount,
    );
    await flushPreact();
    assert.isNull(mount.querySelector(".tag-import-popover"));
  });

  it("hides the import panel when the import was optimistically resolved", function () {
    const { mount } = renderTagsRegion(
      makeSelection({
        importDraft: '{"tags":[]}',
        importPreview: { additions: [{ tag: "x" }] },
        importOptimisticallyResolved: true,
      }),
    );
    assert.isNull(mount.querySelector(".tag-import-popover"));
  });

  it("renders the bootstrapper empty state when no vocabulary exists", function () {
    const { mount, dispatched } = renderTagsRegion(
      makeSelection({ rowCount: 0, vocabularyRows: [] }),
    );
    assert.isNull(mount.querySelector(".tags-vocabulary-table"));
    const empty = mount.querySelector(".empty-state.empty-state-info");
    assert.ok(empty, "bootstrapper empty state rendered");
    assert.equal(
      empty!.querySelector(".empty-state-title")?.textContent,
      t("synthesis-tags-empty"),
    );
    buttonByText(empty!, t("synthesis-action-bootstrap-tags")).click();
    assert.deepEqual(dispatched, [
      { action: "hostCommand", payload: { command: "runTagBootstrapper" } },
    ]);
  });

  it("keeps region subtree identity when an equal selection re-renders", async function () {
    const { mount, onAction } = renderTagsRegion(makeSelection());
    const captured = captureRegionSubtrees({ tags: mount });

    render(h(TagsRegion, { selection: makeSelection(), t, onAction }), mount);
    await flushPreact();
    assertRegionSubtreesPreserved({ tags: mount }, captured);

    // A visible change still repaints: facet filter value changes the select.
    render(
      h(TagsRegion, {
        selection: makeSelection({ facet: "method" }),
        t,
        onAction,
      }),
      mount,
    );
    await flushPreact();
    const facetSelect =
      mount.querySelector<HTMLSelectElement>(".filters select")!;
    assert.equal(facetSelect.value, "method");
  });
});
