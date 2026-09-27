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
  ProductsRegion,
  type DashboardProductsSelection,
  type DashboardProductsText,
} from "../../src/dashboard/components/ProductsRegion";

function makeText(): DashboardProductsText {
  return {
    productsSection: "Files",
    feedbackSection: "Feedback",
    openWorkspace: "Open folder",
    openRun: "Open run",
    remove: "Remove",
    filterAllSkills: "All skills",
    filterSkillAria: "Filter by skill",
    exportSelected: "Export selected",
    deleteSelected: "Delete selected",
    deleteAll: "Delete all",
    selectAll: "Select all",
    feedbackEmpty: "No feedback yet",
    productsEmpty: "No products yet",
    listTitle: "Products",
    listExpand: "Expand list",
    listCollapse: "Collapse list",
    listRail: "Products",
    noFiles: "No files",
    selectFile: "Select a file",
    previewUnavailable: "Preview unavailable",
    rawMarkdown: "Raw Markdown",
    viewerWrap: "Wrap",
    viewerCopy: "Copy",
    viewerCopied: "Copied",
    viewerCopyFailed: "Copy failed",
  };
}

function makeProductsSelection(
  overrides: {
    isExporting?: boolean;
    section?: "products" | "feedback";
  } = {},
): DashboardProductsSelection {
  return {
    pageTitle: "Products",
    section: overrides.section || "products",
    isExporting: overrides.isExporting === true,
    text: makeText(),
    products: {
      items: [
        {
          productId: "p1",
          title: "Report bundle",
          metaText: "Workflow One · workspace · 2026-09-04",
          active: true,
        },
        {
          productId: "p2",
          title: "Data export",
          metaText: "Workflow Two · plugin-state · 2026-09-03",
          active: false,
        },
      ],
      selected: {
        productId: "p1",
        title: "Report bundle",
        metaText: "report · Workflow One · acp · workspace",
        canOpenRun: true,
        backendId: "b1",
        runKey: "",
        requestId: "req-1",
        selectedAssetId: "a2",
        assets: [
          {
            assetId: "a1",
            label: "report.md",
            relativePath: "docs/report.md",
            path: "",
            contentType: "text/markdown",
            sizeText: "1.0 KB",
          },
          {
            assetId: "a2",
            label: "data.csv",
            relativePath: "data.csv",
            path: "",
            contentType: "text/csv",
            sizeText: "512 B",
          },
        ],
        preview: {
          metaText: "data.csv · text · 512 bytes",
          kind: "text",
          language: "plaintext",
          text: "a,b\n1,2",
          source: "a,b\n1,2",
          previewable: true,
          error: "",
        },
      },
    },
    feedback: null,
  };
}

function makeFeedbackSelection(
  overrides: { hasSelection?: boolean; checked?: boolean } = {},
): DashboardProductsSelection {
  const checked = overrides.checked === true;
  return {
    pageTitle: "Products",
    section: "feedback",
    isExporting: false,
    text: makeText(),
    products: null,
    feedback: {
      skillOptions: ["skill-a", "skill-b"],
      skillFilter: "skill-a",
      hasSelection: overrides.hasSelection === true,
      selectAllChecked: checked,
      selectAllIndeterminate: false,
      items: [
        {
          productId: "f1",
          title: "Feedback one",
          metaText: "skill-a · Workflow One · 2026-09-04",
          active: true,
          checked,
        },
        {
          productId: "f2",
          title: "Feedback two",
          metaText: "skill-a · Workflow One · 2026-09-03",
          active: false,
          checked: false,
        },
      ],
      selected: {
        productId: "f1",
        title: "Feedback one",
        metaText: "skill-a · Workflow One · acp · req-9",
        preview: null,
      },
    },
  };
}

describe("dashboard products region (src/dashboard/components/ProductsRegion)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    const vendor = window as unknown as Record<string, unknown>;
    delete vendor.ZoteroSkillsMarkdownRenderer;
    delete vendor.markdownit;
    restoreSidebarDomGlobals();
  });

  function flushPreact(): Promise<void> {
    // Preact batches hook state updates into a microtask; click-triggered
    // local state changes need one tick before the DOM reflects them.
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function renderRegion(selection: DashboardProductsSelection) {
    const actions: Array<{ action: string; payload: unknown }> = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onAction = (action: string, payload?: Record<string, unknown>) => {
      actions.push({ action, payload: payload || {} });
    };
    render(h(ProductsRegion, { selection, onAction }), container);
    return { container, actions, onAction };
  }

  it("renders the products section: tabs, cards, file tree and code preview", function () {
    const { container } = renderRegion(makeProductsSelection());
    assert.equal(
      container.querySelector(".page-title")?.textContent,
      "Products",
    );
    const tabs = container.querySelectorAll<HTMLButtonElement>(
      ".product-section-tabs .btn",
    );
    assert.equal(tabs.length, 2);
    assert.ok(tabs[0].classList.contains("active"));
    assert.isNotOk(tabs[1].classList.contains("active"));

    // Contextual toolbar: open folder + open run + remove.
    const toolbarButtons = container.querySelectorAll(
      ".toolbar > .toolbar-actions:not(.product-section-tabs) .btn",
    );
    assert.equal(toolbarButtons.length, 3);

    const cards = container.querySelectorAll<HTMLButtonElement>(
      ".product-list > .product-card",
    );
    assert.equal(cards.length, 2);
    assert.ok(cards[0].classList.contains("active"));
    assert.equal(
      container.querySelector(".product-list-count")?.textContent,
      "2",
    );
    assert.equal(
      container.querySelector(".product-detail .panel-title")?.textContent,
      "Report bundle",
    );
    const tree = container.querySelector(".product-file-tree");
    assert.ok(tree, "file tree exists");
    assert.isNull(tree!.getAttribute("data-dashboard-scroll-key"));
    // Collapsed by default: one folder row, only the root-level file visible.
    assert.equal(tree!.querySelectorAll(".product-tree-folder").length, 1);
    assert.equal(tree!.querySelectorAll(".product-tree-file").length, 1);
    const fileIcon = tree!.querySelector(".product-tree-file-icon");
    assert.ok(fileIcon!.classList.contains("zs-icon-product-table"));

    assert.equal(
      container.querySelector(".product-preview-meta")?.textContent,
      "data.csv · text · 512 bytes",
    );
    const viewer = container.querySelector(".product-code-viewer");
    assert.ok(viewer, "code viewer exists");
    assert.ok(viewer!.classList.contains("wrap-lines"));
    assert.ok(viewer!.classList.contains("language-plaintext"));
    const lines = viewer!.querySelectorAll(".product-code-line");
    assert.equal(lines.length, 2);
    assert.equal(
      lines[1].querySelector(".product-code-line-number")?.textContent,
      "2",
    );
    assert.equal(lines[0].querySelector("code")?.textContent, "a,b");
  });

  it("emits legacy actions with frozen payload shapes", function () {
    const { container, actions } = renderRegion(makeProductsSelection());
    const tabs = container.querySelectorAll<HTMLButtonElement>(
      ".product-section-tabs .btn",
    );
    tabs[1].click();
    const cards = container.querySelectorAll<HTMLButtonElement>(
      ".product-list > .product-card",
    );
    cards[1].click();
    const toolbarButtons = container.querySelectorAll<HTMLButtonElement>(
      ".toolbar > .toolbar-actions:not(.product-section-tabs) .btn",
    );
    toolbarButtons[0].click();
    toolbarButtons[1].click();
    toolbarButtons[2].click();
    (
      container.querySelector(".product-tree-file") as HTMLButtonElement
    ).click();
    assert.deepEqual(actions, [
      { action: "select-product-section", payload: { section: "feedback" } },
      { action: "select-product", payload: { productId: "p2" } },
      { action: "open-product-folder", payload: { productId: "p1" } },
      {
        action: "open-run",
        payload: { backendId: "b1", runKey: "", requestId: "req-1" },
      },
      { action: "remove-product", payload: { productId: "p1" } },
      {
        action: "select-product-asset",
        payload: { productId: "p1", assetId: "a2" },
      },
    ]);
  });

  it("keeps tree expansion state inside the component without emitting actions", async function () {
    const { container, actions, onAction } = renderRegion(
      makeProductsSelection(),
    );
    const folder = container.querySelector<HTMLButtonElement>(
      ".product-tree-folder",
    )!;
    assert.equal(folder.getAttribute("aria-expanded"), "false");
    folder.click();
    assert.equal(actions.length, 0, "folder toggle never hits the host");
    await flushPreact();
    assert.equal(folder.getAttribute("aria-expanded"), "true");
    assert.equal(
      container.querySelectorAll(".product-tree-file").length,
      2,
      "expanded folder reveals its children",
    );
    // An equal-but-fresh selection must not reset the component-local
    // expansion state.
    render(
      h(ProductsRegion, { selection: makeProductsSelection(), onAction }),
      container,
    );
    const folderAfter = container.querySelector<HTMLButtonElement>(
      ".product-tree-folder",
    )!;
    assert.equal(folderAfter.getAttribute("aria-expanded"), "true");
    folderAfter.click();
    await flushPreact();
    assert.equal(
      container.querySelectorAll(".product-tree-file").length,
      1,
      "second toggle collapses the folder again",
    );
  });

  it("toggles code line wrapping locally and keeps aria-pressed in sync", async function () {
    const { container, actions } = renderRegion(makeProductsSelection());
    const wrapButton = container.querySelector<HTMLButtonElement>(
      ".product-code-actions .product-code-tool",
    )!;
    assert.equal(wrapButton.getAttribute("aria-pressed"), "true");
    wrapButton.click();
    await flushPreact();
    assert.equal(wrapButton.getAttribute("aria-pressed"), "false");
    const viewer = container.querySelector(".product-code-viewer")!;
    assert.isNotOk(viewer.classList.contains("wrap-lines"));
    assert.isNotOk(wrapButton.classList.contains("active"));
    assert.equal(actions.length, 0, "wrap toggle stays local");
  });

  it("disables the open-folder action while exporting", function () {
    const { container, actions } = renderRegion(
      makeProductsSelection({ isExporting: true }),
    );
    const openFolder = container.querySelector<HTMLButtonElement>(
      ".toolbar > .toolbar-actions:not(.product-section-tabs) .btn",
    )!;
    assert.isTrue(openFolder.disabled);
    assert.equal(openFolder.getAttribute("aria-busy"), "true");
    assert.ok(openFolder.querySelector(".dashboard-button-spinner"));
    openFolder.click();
    assert.equal(actions.length, 0, "busy button never emits");
  });

  it("renders the feedback section: filter, selection checkboxes and detail", function () {
    const { container, actions } = renderRegion(
      makeFeedbackSelection({ hasSelection: true }),
    );
    const filter = container.querySelector<HTMLSelectElement>(
      "select.feedback-skill-filter",
    )!;
    assert.equal(filter.value, "skill-a");
    assert.equal(filter.querySelectorAll("option").length, 3);
    filter.value = "skill-b";
    filter.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.deepEqual(actions, [
      {
        action: "select-feedback-skill-filter",
        payload: { skillId: "skill-b" },
      },
    ]);

    assert.isNull(
      container
        .querySelector(".product-list")
        ?.getAttribute("data-dashboard-scroll-key"),
    );
    const rows = container.querySelectorAll(".feedback-product-card");
    assert.equal(rows.length, 2);
    assert.ok(rows[0].classList.contains("active"));

    // Toolbar buttons enabled with a non-empty selection.
    const toolbarButtons = container.querySelectorAll<HTMLButtonElement>(
      ".toolbar > .toolbar-actions:not(.product-section-tabs) .btn",
    );
    assert.equal(toolbarButtons.length, 3);
    assert.isFalse(toolbarButtons[0].disabled);
    toolbarButtons[0].click();
    toolbarButtons[1].click();
    toolbarButtons[2].click();
    assert.deepEqual(actions.slice(1), [
      { action: "export-selected-feedback", payload: {} },
      { action: "delete-selected-feedback", payload: {} },
      { action: "delete-all-feedback", payload: {} },
    ]);

    // Row checkbox and body actions keep the legacy payloads.
    const rowCheckbox = rows[1].querySelector<HTMLInputElement>(
      ".feedback-product-checkbox",
    )!;
    rowCheckbox.click();
    (
      rows[0].querySelector(".feedback-product-body") as HTMLButtonElement
    ).click();
    assert.deepEqual(actions.slice(4), [
      {
        action: "toggle-feedback-product-selected",
        payload: { productId: "f2", selected: true },
      },
      { action: "select-feedback-product", payload: { productId: "f1" } },
    ]);

    assert.equal(
      container.querySelector(".product-detail .panel-title")?.textContent,
      "Feedback one",
    );
    // No preview selected: the select-a-file empty hint renders.
    assert.ok(
      container.querySelector(".product-detail .product-preview .empty"),
    );
  });

  it("drives the feedback select-all checkbox including the indeterminate state", function () {
    const selection = makeFeedbackSelection({ checked: false });
    selection.feedback!.items[0].checked = true;
    selection.feedback!.selectAllIndeterminate = true;
    const { container, actions } = renderRegion(selection);
    const selectAll = container.querySelector<HTMLInputElement>(
      ".feedback-select-all-checkbox",
    )!;
    assert.isFalse(selectAll.checked);
    assert.isTrue(selectAll.indeterminate);
    selectAll.click();
    assert.deepEqual(actions, [
      {
        action: "toggle-all-feedback-products-selected",
        payload: { selected: true },
      },
    ]);
  });

  it("disables feedback export/delete actions without a selection", function () {
    const { container } = renderRegion(makeFeedbackSelection());
    const toolbarButtons = container.querySelectorAll<HTMLButtonElement>(
      ".toolbar > .toolbar-actions:not(.product-section-tabs) .btn",
    );
    assert.isTrue(toolbarButtons[0].disabled, "export disabled");
    assert.isTrue(toolbarButtons[1].disabled, "delete-selected disabled");
    assert.isFalse(toolbarButtons[2].disabled, "delete-all stays enabled");
  });

  it("renders the empty states of both sections", function () {
    const emptyProducts = makeProductsSelection();
    emptyProducts.products = { items: [], selected: null };
    const { container: productsContainer } = renderRegion(emptyProducts);
    assert.equal(
      productsContainer.querySelector(".empty")?.textContent,
      "No products yet",
    );

    const emptyFeedback = makeFeedbackSelection();
    emptyFeedback.feedback!.items = [];
    emptyFeedback.feedback!.selected = null;
    const { container: feedbackContainer } = renderRegion(emptyFeedback);
    assert.equal(
      feedbackContainer.querySelector(".products-layout + .empty, .empty")
        ?.textContent,
      "No feedback yet",
    );
    const deleteAll = feedbackContainer.querySelectorAll<HTMLButtonElement>(
      ".toolbar > .toolbar-actions:not(.product-section-tabs) .btn",
    )[2];
    assert.isTrue(deleteAll.disabled, "delete-all disabled when empty");
  });

  it("renders Markdown previews through the vendor renderer island", function () {
    const selection = makeProductsSelection();
    selection.products!.selected!.preview = {
      metaText: "report.md · markdown · 1.0 KB",
      kind: "markdown",
      language: "markdown",
      text: "# Title\n\nBody",
      source: "# Title\n\nBody",
      previewable: true,
      error: "",
    };
    const vendor = window as unknown as Record<string, unknown>;
    const rendered: Array<{ text: string; profile: string }> = [];
    vendor.ZoteroSkillsMarkdownRenderer = {
      renderInto(
        target: HTMLElement,
        text: string,
        options: { profile: string },
      ) {
        rendered.push({ text, profile: options.profile });
        const paragraph = document.createElement("p");
        paragraph.textContent = "rendered-markdown";
        target.appendChild(paragraph);
      },
    };
    const { container } = renderRegion(selection);
    assert.deepEqual(rendered, [
      { text: "# Title\n\nBody", profile: "preview" },
    ]);
    assert.equal(
      container.querySelector(".product-preview-markdown p")?.textContent,
      "rendered-markdown",
    );
    // The raw Markdown details view still renders the plain code viewer.
    const raw = container.querySelector("details.product-preview-raw");
    assert.ok(raw, "raw markdown details exist");
    assert.equal(raw!.querySelector("summary")?.textContent, "Raw Markdown");
    assert.ok(raw!.querySelector(".product-code-viewer"));
  });

  it("falls back to a code viewer when no Markdown vendor is available", function () {
    const selection = makeProductsSelection();
    selection.products!.selected!.preview = {
      metaText: "report.md · markdown · 1.0 KB",
      kind: "markdown",
      language: "markdown",
      text: "# Title",
      source: "# Title",
      previewable: true,
      error: "",
    };
    const { container } = renderRegion(selection);
    const markdownWrap = container.querySelector(".product-preview-markdown");
    assert.ok(markdownWrap, "markdown wrapper exists");
    assert.ok(
      markdownWrap!.querySelector(".product-code-viewer.language-markdown"),
      "fallback code viewer renders inside the markdown wrapper",
    );
  });

  it("keeps the region subtree identity when an equal selection re-renders", function () {
    const { container, onAction } = renderRegion(makeProductsSelection());
    const regions = { products: container };
    const captured = captureRegionSubtrees(regions);

    // Same visible content, fresh object graph: nothing is rebuilt.
    render(
      h(ProductsRegion, { selection: makeProductsSelection(), onAction }),
      container,
    );
    assertRegionSubtreesPreserved(regions, captured);

    // A visible change (product title) re-renders the region.
    const changed = makeProductsSelection();
    changed.products!.items[1].title = "Renamed export";
    render(h(ProductsRegion, { selection: changed, onAction }), container);
    const cards = container.querySelectorAll(
      ".product-list > .product-card strong",
    );
    assert.equal(cards[1].textContent, "Renamed export");
  });

  it("collapses the products list into the rail locally", async function () {
    const { container, actions } = renderRegion(makeProductsSelection());
    const toggle = container.querySelector<HTMLButtonElement>(
      ".product-list-toggle",
    )!;
    assert.equal(toggle.getAttribute("aria-label"), "Collapse list");
    toggle.click();
    assert.equal(actions.length, 0, "list collapse stays local");
    await flushPreact();
    const layout = container.querySelector(".products-layout")!;
    assert.ok(layout.classList.contains("products-layout-collapsed"));
    assert.equal(
      container.querySelector(".product-list-rail-count")?.textContent,
      "2",
    );
    assert.equal(
      container.querySelector(".product-list-rail-current")?.textContent,
      "Report bundle",
    );
    assert.isNull(
      container
        .querySelector(".product-list")
        ?.getAttribute("data-dashboard-scroll-key"),
    );
    const toggleAfter = container.querySelector<HTMLButtonElement>(
      ".product-list-toggle",
    )!;
    assert.equal(toggleAfter.getAttribute("aria-label"), "Expand list");
  });

  it("restores product and feedback list scroll by local section owner", function () {
    const productsSelection = makeProductsSelection();
    const feedbackSelection = makeFeedbackSelection();
    const { container, onAction } = renderRegion(productsSelection);

    const productsList = container.querySelector<HTMLElement>(".product-list")!;
    productsList.scrollTop = 47;
    render(
      h(ProductsRegion, {
        selection: {
          ...productsSelection,
          section: "feedback",
          products: null,
          feedback: feedbackSelection.feedback,
        },
        onAction,
      }),
      container,
    );
    const feedbackList = container.querySelector<HTMLElement>(".product-list")!;
    feedbackList.scrollTop = 29;

    render(
      h(ProductsRegion, { selection: productsSelection, onAction }),
      container,
    );
    assert.equal(
      container.querySelector<HTMLElement>(".product-list")!.scrollTop,
      47,
    );

    render(
      h(ProductsRegion, {
        selection: {
          ...productsSelection,
          section: "feedback",
          products: null,
          feedback: feedbackSelection.feedback,
        },
        onAction,
      }),
      container,
    );
    assert.equal(
      container.querySelector<HTMLElement>(".product-list")!.scrollTop,
      29,
    );
  });
});
