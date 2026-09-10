import { assert } from "chai";
import { h, render } from "preact";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import { createSynthesisWorkbenchText } from "../../src/synthesis/synthesisWorkbenchPanelModel";
import { ReaderRegion } from "../../src/synthesis/components/reader/ReaderRegion";
import {
  EMPTY_READER_CONCEPTS,
  narrowArtifactReader,
  narrowDigestResult,
  narrowReaderConcepts,
  narrowTopicDetail,
  type ReaderRegionSelection,
} from "../../src/synthesis/components/reader/narrowing";

const t = createSynthesisWorkbenchText({
  locale: "en-US",
  messages: {} as never,
});

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const DETAIL_WIRE = {
  topicId: "topic-1",
  title: "Detection Survey",
  language: "en",
  paper_count: 2,
  topic: { definition: "A survey of detection methods." },
  summary: {
    summary: "Summary paragraph.",
    key_takeaways: ["Takeaway one", "Takeaway two"],
  },
  coverage: {
    coverage_verdict: "ready",
    external_context_summary: "External context paragraph.",
  },
  claims: [
    {
      id: "C1",
      text: "Claim one",
      strength: "strong",
      analysis: "Because reasons.",
      source_paper_refs: ["1:ABC"],
    },
  ],
  source_papers: [
    {
      paper_ref: "1:ABC",
      item_key: "ABC",
      title: "Paper Alpha",
      short_id: "P1",
      year: 2020,
      summary: "Alpha summary",
      digest_ref: { note_key: "NOTE1" },
    },
    {
      paper_ref: "1:DEF",
      item_key: "DEF",
      title: "Paper Beta",
      short_id: "P2",
      year: 2022,
    },
  ],
  timeline_events: [
    { year: 2021, event: "Milestone one", source_paper_refs: ["1:ABC"] },
  ],
  synthesis_report: {
    title: "Detection Survey",
    body: "# Detection Survey\n\nReport body text.",
  },
};

function makeSelection(
  overrides: Partial<ReaderRegionSelection> = {},
): ReaderRegionSelection {
  return {
    kind: "topicDetail",
    standalone: false,
    locale: "en-US",
    topicId: "topic-1",
    previousTab: "artifacts",
    detail: narrowTopicDetail(DETAIL_WIRE, 1),
    concepts: EMPTY_READER_CONCEPTS,
    updateIntentAvailable: true,
    pendingCommands: [],
    ...overrides,
  };
}

function renderRegion(selection: ReaderRegionSelection) {
  const dispatched: Array<{
    action: string;
    payload: Record<string, unknown>;
  }> = [];
  const root = document.createElement("div");
  root.id = "app";
  document.body.appendChild(root);
  const props = {
    selection,
    t,
    onAction: (action: string, payload?: Record<string, unknown>) => {
      dispatched.push({ action, payload: payload || {} });
    },
  };
  render(h(ReaderRegion, props), root);
  return { root, dispatched, props };
}

describe("synthesis reader region (src/synthesis/components/reader)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    document.body.innerHTML = "";
    restoreSidebarDomGlobals();
  });

  it("narrows the topic detail wire payload defensively", function () {
    const detail = narrowTopicDetail(DETAIL_WIRE, 1)!;
    assert.equal(detail.topicId, "topic-1");
    assert.equal(detail.title, "Detection Survey");
    assert.equal(detail.paperCount, 2);
    assert.equal(detail.evidence.length, 2);
    assert.equal(detail.evidence[0].id, "1:ABC");
    assert.equal(detail.evidence[0].code, "P1");
    assert.equal(detail.evidence[0].year, 2020);
    // Ref-key variants cover raw, normalized and item-key forms.
    assert.includeMembers(detail.evidence[0].refKeys, ["1:ABC", "ABC"]);
    assert.deepEqual(detail.evidence[0].digestRefArg, { note_key: "NOTE1" });
    assert.equal(detail.claims[0].text, "Claim one");
    assert.equal(detail.report.body, "# Detection Survey\n\nReport body text.");
    assert.isUndefined(narrowTopicDetail(null, 1));
    assert.isUndefined(narrowTopicDetail("nope", 1));
  });

  it("renders topic detail: toolbar, 8 section tabs, overview content", function () {
    const { root } = renderRegion(makeSelection());
    const tabs = root.querySelectorAll(".topic-detail-tabs button");
    assert.equal(tabs.length, 8, "8 section tabs in hosted mode");
    assert.ok(tabs[0].classList.contains("active"));
    assert.ok(root.querySelector(".topic-detail-toolbar"));
    assert.include(
      root.querySelector(".topic-detail-toolbar-meta")?.textContent,
      "2 papers",
    );
    const overview = root.querySelector(".topic-section");
    assert.include(overview?.textContent, "A survey of detection methods.");
    assert.include(overview?.textContent, "Takeaway one");
    // Evidence drawer starts closed; the timeline island mounted.
    const drawer = root.querySelector(".evidence-drawer");
    assert.ok(drawer);
    assert.notOk(drawer!.classList.contains("open"));
    assert.ok(
      root.querySelector(".topic-timeline"),
      "timeline island rendered",
    );
  });

  it("dispatches selectTab/hostCommand with the legacy payloads", function () {
    const { root, dispatched } = renderRegion(makeSelection());
    const buttons = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-toolbar-actions button",
    );
    buttons[0].click();
    buttons[1].click();
    buttons[3].click();
    assert.deepEqual(dispatched, [
      { action: "selectTab", payload: { tab: "artifacts" } },
      {
        action: "hostCommand",
        payload: {
          command: "submitTopicSynthesisUpdate",
          args: { topicId: "topic-1" },
        },
      },
      {
        action: "hostCommand",
        payload: {
          command: "exportTopicDetailHtml",
          args: { topicId: "topic-1", title: "Detection Survey" },
        },
      },
    ]);
  });

  it("routes the citation subgraph macro page-locally", function () {
    const { root, dispatched } = renderRegion(makeSelection());
    const buttons = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-toolbar-actions button",
    );
    buttons[2].click();
    assert.deepEqual(dispatched, [
      { action: "openTopicCitationSubgraph", payload: { topicId: "topic-1" } },
    ]);
  });

  it("switches sections and opens the evidence drawer from a claim card", async function () {
    const { root } = renderRegion(makeSelection());
    const tabs = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-tabs button",
    );
    tabs[2].click();
    await flush();
    const claims = root.querySelector(".claims-list");
    assert.ok(claims, "claims section rendered");
    assert.include(claims!.textContent, "Claim one");
    const card = root.querySelector<HTMLButtonElement>(".mini-evidence-card");
    assert.ok(card);
    card!.click();
    await flush();
    const drawer = root.querySelector(".evidence-drawer");
    assert.ok(drawer!.classList.contains("open"), "drawer opened");
    assert.include(
      root.querySelector(".selected-evidence-card")?.textContent,
      "Paper Alpha",
    );
  });

  it("opens the digest modal and dispatches resolveTopicPaperDigest verbatim", async function () {
    const { root, dispatched } = renderRegion(makeSelection());
    const tabs = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-tabs button",
    );
    tabs[2].click();
    await flush();
    root.querySelector<HTMLButtonElement>(".mini-evidence-card")!.click();
    await flush();
    const openDigest = root.querySelector<HTMLButtonElement>(
      ".selected-evidence-card button.primary",
    );
    assert.ok(openDigest);
    openDigest!.click();
    await flush();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "resolveTopicPaperDigest",
          args: {
            topicId: "topic-1",
            paper_ref: "1:ABC",
            digest_ref: { note_key: "NOTE1" },
            include_representative_image: true,
          },
        },
      },
    ]);
    const modal = root.querySelector(".paper-digest-modal");
    assert.ok(modal, "modal open");
    assert.include(modal!.textContent, "Loading digest artifact...");
  });

  it("resolves the loading digest modal when the digest result arrives", async function () {
    const { root, props } = renderRegion(makeSelection());
    const tabs = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-tabs button",
    );
    tabs[2].click();
    await flush();
    root.querySelector<HTMLButtonElement>(".mini-evidence-card")!.click();
    await flush();
    root
      .querySelector<HTMLButtonElement>(
        ".selected-evidence-card button.primary",
      )!
      .click();
    await flush();

    const digestWire = {
      ok: true,
      status: "available",
      paper_ref: "1:ABC",
      digest_markdown: "Digest **body**.",
      recorded_hash: "a",
      current_hash: "a",
      source_changed: false,
      diagnostics: [],
    };
    render(
      h(ReaderRegion, {
        ...props,
        selection: {
          ...props.selection,
          digestResult: narrowDigestResult(digestWire),
        },
      }),
      root,
    );
    await flush();
    const modal = root.querySelector(".paper-digest-modal");
    assert.ok(modal);
    assert.notInclude(modal!.textContent, "Loading digest artifact");
    assert.include(modal!.textContent, "Digest", "digest markdown rendered");
    // No vendor markdown-it in jsdom: the fallback pre renders the raw text.
    assert.ok(modal!.querySelector(".markdown-fallback"));
  });

  it("renders the report section island and copy/export actions", async function () {
    const { root, dispatched } = renderRegion(makeSelection());
    const tabs = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-tabs button",
    );
    tabs[7].click();
    await flush();
    const section = root.querySelector(".topic-report-section");
    assert.ok(section);
    // The duplicate leading report heading is stripped before rendering.
    const fallback = section!.querySelector(".markdown-fallback");
    assert.ok(fallback);
    assert.equal(
      fallback!.textContent,
      "Report body text.",
      "duplicate report heading stripped",
    );
    const exportButton = section!.querySelectorAll<HTMLButtonElement>(
      ".topic-report-actions button",
    )[1];
    exportButton.click();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "exportTopicSynthesisReport",
          args: { topicId: "topic-1" },
        },
      },
    ]);
  });

  it("renders the artifact reader and dispatches closeArtifactReader", function () {
    const artifact = narrowArtifactReader({
      topicId: "topic-9",
      title: "Raw artifact",
      markdown: "# Raw\n\nartifact body",
      updated_at: "2026-09-01T00:00:00.000Z",
      hash: "abc123",
    });
    const { root, dispatched } = renderRegion(
      makeSelection({
        kind: "artifact",
        topicId: "topic-9",
        detail: undefined,
        artifact,
      }),
    );
    const panel = root.querySelector(".reader-panel");
    assert.ok(panel);
    assert.include(panel!.textContent, "Raw artifact");
    assert.include(panel!.textContent, "abc123");
    assert.ok(panel!.querySelector(".markdown-fallback"));
    const back = root.querySelector<HTMLButtonElement>(
      ".reader-header .toolbar button",
    );
    back!.click();
    assert.deepEqual(dispatched, [
      { action: "closeArtifactReader", payload: {} },
    ]);
  });

  it("standalone shape adds the citation graph tab and disables host actions", async function () {
    const { root, dispatched } = renderRegion(
      makeSelection({ standalone: true }),
    );
    const tabs = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-tabs button",
    );
    assert.equal(tabs.length, 9, "citation graph tab appended");
    const exportHtml = root.querySelector<HTMLButtonElement>(
      ".topic-detail-export-button",
    );
    assert.ok(
      exportHtml,
      "standalone keeps an explicit disabled export action",
    );
    assert.ok(exportHtml.disabled, "export disabled in standalone export");
    // Standalone digest resolves locally without a host command.
    const withDigests = makeSelection({
      standalone: true,
      standaloneDigests: {
        NOTE1: narrowDigestResult({
          ok: true,
          status: "available",
          digest_markdown: "Standalone digest.",
        })!,
      },
    });
    const standalone = renderRegion(withDigests);
    const sTabs = standalone.root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-tabs button",
    );
    sTabs[2].click();
    await flush();
    standalone.root
      .querySelector<HTMLButtonElement>(".mini-evidence-card")!
      .click();
    await flush();
    standalone.root
      .querySelector<HTMLButtonElement>(
        ".selected-evidence-card button.primary",
      )!
      .click();
    await flush();
    assert.deepEqual(
      standalone.dispatched,
      [],
      "no host command in standalone",
    );
    assert.include(
      standalone.root.querySelector(".paper-digest-modal")?.textContent,
      "Standalone digest.",
    );
  });

  it("keeps the region subtree identity on equal-content re-render", async function () {
    const { root, props } = renderRegion(makeSelection());
    // Open a section + drawer so local state participates in the subtree.
    const tabs = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-tabs button",
    );
    tabs[2].click();
    await flush();
    const regions = { reader: root };
    const captured = captureRegionSubtrees(regions);

    render(
      h(ReaderRegion, {
        ...props,
        selection: makeSelection(),
      }),
      root,
    );
    await flush();
    assertRegionSubtreesPreserved(regions, captured);
  });

  it("rebuilds only the markdown island when the report body changes", async function () {
    const { root, props } = renderRegion(makeSelection());
    const tabs = root.querySelectorAll<HTMLButtonElement>(
      ".topic-detail-tabs button",
    );
    tabs[7].click();
    await flush();
    const before = root.querySelector(".markdown-fallback");
    assert.ok(before);
    const regions = {
      toolbar: root.querySelector(".topic-detail-toolbar")!,
      tabs: root.querySelector(".topic-detail-tabs")!,
    };
    const captured = captureRegionSubtrees(regions);

    render(
      h(ReaderRegion, {
        ...props,
        selection: makeSelection({
          detail: narrowTopicDetail(
            {
              ...DETAIL_WIRE,
              synthesis_report: {
                title: "Detection Survey",
                body: "# Detection Survey\n\nUpdated report body.",
              },
            },
            1,
          ),
        }),
      }),
      root,
    );
    await flush();
    const after = root.querySelector(".markdown-fallback");
    assert.ok(after);
    assert.notStrictEqual(after, before, "island rebuilt on content change");
    assert.equal(after!.textContent, "Updated report body.");
    assertRegionSubtreesPreserved(regions, captured);
  });

  it("narrows reader concepts and digest results defensively", function () {
    const concepts = narrowReaderConcepts({
      filters: { overlayEnabled: true },
      overlayEntries: [{ concept_id: "c1", alias: "Transformer" }],
      senses: [
        {
          sense_id: "s1",
          concept_id: "c1",
          label: "Transformer",
          source_topic_ids: ["topic-1"],
        },
      ],
      rows: [{ concept_id: "c1", label: "Transformer" }],
    });
    assert.isTrue(concepts.overlayEnabled);
    assert.equal(concepts.senses[0].conceptId, "c1");
    assert.isUndefined(narrowDigestResult({ ok: "not-a-result-but-record" }));
    const digest = narrowDigestResult({
      ok: true,
      status: "available",
      digest_markdown: "x",
      representative_image: {
        status: "available",
        data_url: "data:image/png;base64,AAAA",
        width: 10,
        height: 20,
      },
    });
    assert.ok(digest?.representativeImage);
    assert.equal(digest?.representativeImage?.width, 10);
  });
});
