import { assert } from "chai";
import { h, render } from "preact";

import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import { createSynthesisWorkbenchText } from "../../src/synthesis/synthesisWorkbenchPanelModel";
import { EvidenceDrawer } from "../../src/synthesis/components/reader/EvidenceDrawer";
import {
  narrowSimilarityResult,
  narrowTopicDetail,
  type ReaderSimilarityResultView,
} from "../../src/synthesis/components/reader/narrowing";

const t = createSynthesisWorkbenchText({
  locale: "en-US",
  messages: {} as never,
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const DETAIL_WIRE = {
  topicId: "topic-1",
  title: "Detection Survey",
  language: "en",
  paper_count: 2,
  topic: { definition: "A survey of detection methods." },
  summary: { summary: "Summary paragraph.", key_takeaways: [] },
  coverage: { coverage_verdict: "ready" },
  claims: [],
  timeline_events: [],
  source_papers: [
    {
      paper_ref: "1:ABC",
      item_key: "ABC",
      title: "Paper Alpha",
      short_id: "P1",
      year: 2020,
      summary: "Alpha summary",
    },
    {
      paper_ref: "1:DEF",
      item_key: "DEF",
      title: "Paper Beta",
      short_id: "P2",
      year: 2022,
    },
  ],
};

function similarity(
  overrides: Record<string, unknown> = {},
): ReaderSimilarityResultView | undefined {
  return narrowSimilarityResult({
    requestId: 1,
    seedRef: "1:ABC",
    result: {
      status: "completed",
      materialKind: "metadata",
      results: [
        {
          paperRef: { libraryId: 1, key: "XYZ" },
          title: "Similar one",
          excerpt: "A concise excerpt.",
          materialKind: "generated",
        },
      ],
      issues: [],
    },
    ...overrides,
  });
}

describe("synthesis reader paper similarity", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    document.body.innerHTML = "";
    restoreSidebarDomGlobals();
  });

  function renderDrawer(options: {
    similarity?: ReaderSimilarityResultView;
    pendingCommands?: string[];
    selectedEvidenceId?: string;
  }) {
    const dispatched: Array<{
      action: string;
      payload: Record<string, unknown> | undefined;
    }> = [];
    const root = document.createElement("div");
    document.body.appendChild(root);
    render(
      h(EvidenceDrawer, {
        t,
        detail: narrowTopicDetail(DETAIL_WIRE, 1),
        open: true,
        selectedEvidenceId: options.selectedEvidenceId ?? "1:ABC",
        similarity: options.similarity,
        pendingCommands: options.pendingCommands ?? [],
        onAction: (action, payload) => dispatched.push({ action, payload }),
        onClose: () => {},
        onOpenDigest: () => {},
      }),
      root,
    );
    return { root, dispatched };
  }

  it("renders material-classified similar papers without an adoption action", function () {
    const { root } = renderDrawer({ similarity: similarity() });
    const cards = root.querySelectorAll(".similarity-card");
    assert.equal(cards.length, 1);
    assert.match(cards[0].textContent || "", /Similar one/);
    assert.match(cards[0].textContent || "", /A concise excerpt\./);
    assert.match(cards[0].textContent || "", /generated digest overview/);
    assert.equal(
      cards[0].querySelectorAll("button").length,
      0,
      "candidate cards carry no adoption action",
    );
    assert.isNull(root.querySelector(".similarity-panel .badge.warn"));
  });

  it("drops results whose seed differs from the selected paper", function () {
    const otherSeed = similarity({ seedRef: "1:DEF" });
    const { root } = renderDrawer({ similarity: otherSeed });
    assert.isNull(root.querySelector(".similarity-panel"));
    assert.equal(root.querySelectorAll(".similarity-card").length, 0);
  });

  it("reports unavailability instead of lexical substitutes", function () {
    const unavailable = narrowSimilarityResult({
      requestId: 1,
      seedRef: "1:ABC",
      result: {
        status: "unavailable",
        materialKind: "metadata",
        results: [],
        issues: [
          { code: "vector_unavailable", sourceKind: null, affectedCount: 0 },
        ],
      },
    });
    const { root } = renderDrawer({ similarity: unavailable });
    assert.match(
      root.querySelector(".evidence-similarity")!.textContent || "",
      /Semantic retrieval is unavailable\./,
    );
    assert.equal(root.querySelectorAll(".similarity-card").length, 0);
  });

  it("marks limited coverage and weak material", function () {
    const limited = narrowSimilarityResult({
      requestId: 2,
      seedRef: "1:ABC",
      result: {
        status: "limited",
        materialKind: "weak",
        results: [
          {
            paperRef: { libraryId: 1, key: "WEAK" },
            title: "Title-only candidate",
            excerpt: "",
            materialKind: "weak",
          },
        ],
        issues: [],
      },
    });
    const { root } = renderDrawer({ similarity: limited });
    assert.match(root.textContent || "", /Limited coverage/);
    assert.match(root.textContent || "", /title only/);
  });

  it("dispatches a similarity request with the canonical seed ref", async function () {
    const { root, dispatched } = renderDrawer({});
    const button = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".evidence-similarity button"),
    ).find((entry) => entry.textContent?.trim() === "Find similar papers")!;
    button.click();
    await flush();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "retrievalRecommendSimilar",
          args: { paper_ref: "1:ABC" },
        },
      },
    ]);
  });

  it("marks the similarity action busy while its request is pending", function () {
    const { root } = renderDrawer({
      pendingCommands: ["retrievalRecommendSimilar"],
    });
    const button = root.querySelector<HTMLButtonElement>(
      ".evidence-similarity button",
    )!;
    assert.isTrue(button.disabled);
    assert.ok(button.classList.contains("is-busy"));
    assert.equal(button.getAttribute("aria-busy"), "true");
    assert.ok(button.querySelector(".button-spinner"));
  });
});
