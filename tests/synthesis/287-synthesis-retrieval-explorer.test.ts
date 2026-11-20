import { assert } from "chai";
import { h, render } from "preact";
import { RetrievalExplorer } from "../../src/synthesis/components/RetrievalExplorer";
import { createSynthesisWorkbenchText } from "../../src/synthesis/synthesisWorkbenchPanelModel";
import { SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES as messages } from "../../src/shared/synthesisWorkbenchI18nContract";
import type {
  SynthesisWorkbenchRetrievalExplorer as Slots,
  SynthesisWorkbenchRetrievalExplorerSlot as Slot,
} from "../../src/shared/synthesisWorkbenchWireContract";
import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";

const t = createSynthesisWorkbenchText({ messages, locale: "en-US" });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const row = {
  identity: "1:AAAA",
  title: "Tunnel lining",
  score: 0.8,
  preview: "Positioning the formwork",
  itemRef: { libraryId: 1, key: "AAAA" },
  sourceCount: 1,
  fragmentCount: 2,
};
function slot(
  operation: "search" | "browse" | "fragments",
  overrides: Partial<NonNullable<Slot["result"]>> = {},
): Slot {
  return {
    requestId: 1,
    owner: "owner",
    status: "ready",
    result: {
      operation,
      publication: "p",
      limited: false,
      issues: [],
      nextCursor: null,
      rows: [row],
      ...overrides,
    },
  };
}
describe("Vector search Workbench", function () {
  beforeEach(() => installSidebarDomGlobals(createSidebarDomEnvironment()));
  afterEach(() => {
    document.body.innerHTML = "";
    restoreSidebarDomGlobals();
  });
  function mount(initial: Slots) {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const requests: Record<string, unknown>[] = [];
    const show = (explorer: Slots) =>
      render(
        h(RetrievalExplorer, {
          retrieval: undefined,
          pending: [],
          explorer,
          t,
          onAction: (_action, payload) => {
            if (payload) requests.push(payload);
          },
        }),
        root,
      );
    show(initial);
    const tabs = root.querySelectorAll<HTMLButtonElement>("[role=tab]");
    const input = root.querySelector<HTMLInputElement>("[type=search]")!;
    const panels = root.querySelectorAll<HTMLElement>("[role=tabpanel]");
    return { root, show, tabs, input, panels, requests };
  }
  it("opens preferences independently from index maintenance", async () => {
    const { root, requests } = mount({ search: slot("search") });
    const button = root.querySelector<HTMLButtonElement>(
      '.retrieval-header button[aria-label="Preferences"]',
    );
    assert.ok(button);
    assert.ok(root.querySelector(".retrieval-settings"));
    button!.click();
    await flush();
    assert.deepInclude(requests, { command: "openPreferences" });
  });
  it("switches tabs from the keyboard and preserves the query, reading position and expanded row", async () => {
    const { root, tabs, input, panels, requests } = mount({
      search: slot("search"),
      browse: slot("browse"),
    });
    input.value = "formwork";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    const list = panels[0].querySelector<HTMLElement>(".zs-scroll-region")!;
    list.scrollTop = 90;
    tabs[0].focus();
    tabs[0].dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    await flush();
    assert.equal(document.activeElement, tabs[1]);
    assert.equal(tabs[1].getAttribute("aria-selected"), "true");
    assert.isFalse(panels[1].hidden);
    root
      .querySelector<HTMLButtonElement>("tbody button[aria-expanded]")!
      .click();
    await flush();
    assert.deepInclude(requests[0].args, {
      identity: row.identity,
      publication: "p",
    });
    tabs[0].click();
    await flush();
    assert.equal(input.value, "formwork");
    assert.equal(list.scrollTop, 90);
    tabs[1].click();
    await flush();
    assert.equal(
      root
        .querySelector("tbody button[aria-expanded]")
        ?.getAttribute("aria-expanded"),
      "true",
    );
    assert.lengthOf(requests, 1);
  });
  it("restores rows when the local similarity threshold is cleared without encoding again", async () => {
    const { root, requests, panels } = mount({ search: slot("search") });
    const threshold =
      root.querySelector<HTMLInputElement>("input[type=number]")!;
    threshold.value = "0.9";
    threshold.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();
    assert.isNull(panels[0].querySelector("article"));
    panels[0]
      .querySelector<HTMLButtonElement>(".retrieval-empty button")!
      .click();
    await flush();
    assert.include(
      panels[0].querySelector("article")?.textContent,
      row.preview,
    );
    assert.isEmpty(requests);
  });
  it("gives distinct feedback for an empty target, unusable vectors, service errors and source failures", () => {
    const { show, panels } = mount({});
    for (const [code, key] of [
      ["retrieval_target_empty", "synthesis-explorer-target-empty"],
      ["retrieval_no_scorable_fragments", "synthesis-explorer-no-scorable"],
      ["source_changed", "synthesis-explorer-source-changed"],
    ] as const) {
      show({ search: slot("search", { rows: [], issues: [code] }) });
      assert.include(panels[0].textContent, t(key));
      assert.notInclude(panels[0].textContent, t("synthesis-explorer-empty"));
    }
    for (const [error, key] of [
      ["embedding_service_unavailable", "synthesis-explorer-encoding-error"],
      ["request_timeout", "synthesis-explorer-timeout"],
      ["protocol_result_invalid", "synthesis-explorer-invalid-response"],
      ["service_not_ready", "synthesis-explorer-service-error"],
    ] as const) {
      show({ search: { ...slot("search"), status: "error", error } });
      const alert = panels[0].querySelector("[role=alert]");
      assert.include(alert?.textContent, t(key));
      assert.equal(alert?.querySelector("code")?.textContent, error);
    }
    assert.include(
      panels[0].querySelector("article")?.textContent,
      row.preview,
    );
  });
  it("pages within the publication and restarts the directory after a filter change", async () => {
    const { panels, tabs, requests } = mount({
      browse: slot("browse", { nextCursor: "next" }),
    });
    tabs[1].click();
    await flush();
    const footer =
      panels[1].querySelectorAll<HTMLButtonElement>("footer button");
    footer[1].click();
    await flush();
    assert.deepInclude(requests[0].args, { cursor: "next", publication: "p" });
    const kinds = panels[1].querySelectorAll<HTMLSelectElement>("select")[1];
    kinds.value = "fulltext";
    kinds.dispatchEvent(new window.Event("change", { bubbles: true }));
    await flush();
    assert.deepInclude(requests[1].args, { sourceKind: "fulltext" });
    assert.notProperty(requests[1].args, "cursor");
    assert.isTrue(footer[0].disabled);
  });
});
