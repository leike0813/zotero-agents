import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import {
  startHostBridgeCliFixtureHarness,
  type HostBridgeCliFixtureHarness,
} from "../helpers/hostBridgeCliHarness";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";

const AGENT_PATH = path.resolve(
  "tests/fixtures/workflow-happy-path/research-agent.mjs",
);
const RESEARCH_PARAMS = {
  paperTitle: "Synthetic query routing study",
  researchContent: "Synthetic retrieval and graph evidence",
  maxTopics: 1,
  maxCorePapers: 5,
  maxRelatedPapers: 7,
};
const FRAMING_PARAMS = {
  paperTitle: "Synthetic query routing study",
  language: "zh-CN",
  articleType: "original research",
  stylePreference: "Synthetic study plan",
};

async function loadAgent() {
  const url = `${pathToFileURL(AGENT_PATH).href}?t=${Date.now()}`;
  return (await import(url)) as {
    isResearchSkill(skillId: string): boolean;
    handleResearchSkill(args: {
      skillId: string;
      input?: Record<string, unknown>;
      parameter?: Record<string, unknown>;
      workspace: string;
      env?: NodeJS.ProcessEnv;
    }): Promise<Record<string, unknown>>;
  };
}

function writeProvider(runRoot: string, refs: string[], topicIds: string[]) {
  const provider = path.join(runRoot, "research-host-provider.cjs");
  const source = `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { command, input } = JSON.parse(process.argv[2]);
const refs = ${JSON.stringify(refs)};
const topicIds = ${JSON.stringify(topicIds)};
function item(ref) {
  const [libraryId, key] = ref.split(":");
  return {
    ref: { libraryId: Number(libraryId), key },
    kind: "regular",
    itemType: "journalArticle",
    title: "Synthetic source " + key,
    parentRef: null,
    state: "active",
    revision: "synthetic-1",
    tags: [],
    collectionRefs: [],
    creators: [{ representation: "single_field", creatorType: "author", name: "Synthetic Author" }],
    date: "2026",
    year: "2026",
    publicationTitle: "Synthetic Journal",
    fields: { abstractNote: "Synthetic abstract for offline research fixture." },
  };
}
let data = {};
if (command === "synthesis topic list") {
  data = {
    topics: topicIds.map((topic_id) => ({ topic_id, title: "Synthetic topic " + topic_id, definition: "Synthetic topic scope." })),
    nextCursor: "",
    hasMore: false,
    returned: topicIds.length,
    total: topicIds.length,
    limit: 100,
  };
} else if (command === "synthesis topic get-context") {
  data = {
    schema_version: "2.0.0",
    view: "semantic",
    semantic: { topic_id: input.topicId, source_papers: refs.map((paper_ref) => ({ paper_ref })) },
  };
} else if (command === "library items list") {
  const items = refs.map((ref) => item(ref));
  data = { items, nextCursor: null, hasMore: false, returned: items.length, total: items.length, limit: 50 };
} else if (command === "library item get") {
  data = item(input.libraryId + ":" + input.key);
} else if (command === "library readiness audit") {
  data = { items: [{ key: input.filter, libraryId: Number(input.libraryId), readiness: { markdown: "present", pdf: "present" }, evidence: {} }], nextCursor: "", hasMore: false, returned: 1, total: 1, limit: 10 };
} else if (command === "synthesis index reference get") {
  data = { entries: [], nextCursor: "", hasMore: false, returned: 0, total: 0, limit: 100 };
} else if (command === "synthesis artifact export-filtered") {
  const manifestFile = "runtime/payloads/paper-artifacts-manifest.json";
  const papers = refs.map((paper_ref, index) => {
    const content_file = "runtime/payloads/artifacts/digest-" + (index + 1) + ".md";
    const absolute = path.resolve(content_file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, "# Synthetic digest " + paper_ref + "\\n\\nSynthetic retrieval and graph evidence for the offline fixture.\\n");
    return { paper_ref, artifacts: [{ artifact_type: "digest", payload_type: "digest-markdown", status: "available", content_file }] };
  });
  fs.mkdirSync(path.resolve(path.dirname(manifestFile)), { recursive: true });
  fs.writeFileSync(path.resolve(manifestFile), JSON.stringify({ schema_id: "synthesis.filtered_paper_artifacts_manifest", papers }));
  data = { paper_refs: refs, manifest_file: manifestFile, artifact_statuses: [] };
} else if (command === "synthesis artifact manifest") {
  const papers = (input.paper_refs || []).map((paper_ref) => ({
    paper_ref,
    artifacts: [
      { artifact_type: "digest", payload_type: "digest-markdown", status: "available" },
      { artifact_type: "literature_score", payload_type: "literature-score-json", status: "available", literature_quality: { status: "available", schema: "literature_score.v1", rubric_id: "rubric.v1", paper_type: "empirical", overall_score: 80, confidence: 0.8, confidence_adjusted_score: 74, quality_prior: 0.74, payload_hash: "sha256:synthetic", diagnostics: [] } },
    ],
  }));
  data = { papers, total: papers.length, returned: papers.length, limit: 100, nextCursor: "", hasMore: false, diagnostics: [] };
} else if (command === "synthesis graph get-metrics") {
  const metrics = (input.paperRefs || []).map((paper_ref, index) => ({ paper_ref, foundation_score: 0.8 - index * 0.05, frontier_score: 0.6, pagerank_norm: 0.5, in_degree_norm: 0.4 }));
  data = { ok: true, status: "ready", graph_hash: "sha256:synthetic-graph", metrics_hash: "sha256:synthetic-metrics", metrics, nextCursor: "", hasMore: false, returned: metrics.length, total: metrics.length, limit: 100, diagnostics: { stale: false, warnings: [] } };
} else {
  console.error("unsupported research fixture command: " + command);
  process.exit(2);
}
console.log(JSON.stringify(data));
`;
  return { provider, source };
}

describe("research workflow offline peer", function () {
  this.timeout(120_000);

  const refs = Array.from(
    { length: 7 },
    (_, index) => `1:SYNRES${String(index + 1).padStart(2, "0")}`,
  );
  const topicIds = ["seed-topic", "planned-topic"];
  let harness: HostBridgeCliFixtureHarness;
  let previousRoot: string | undefined;
  let runtimeRoot: string;

  beforeEach(async function () {
    previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    runtimeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-research-peer-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = runtimeRoot;
    resetPluginStateStoreForTests();
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-research-peer-run-"),
    );
    const { provider, source } = writeProvider(runRoot, refs, topicIds);
    await fs.writeFile(provider, source, "utf8");
    harness = await startHostBridgeCliFixtureHarness({
      commands: [
        "synthesis topic list",
        "synthesis topic get-context",
        "library items list",
        "library item get",
        "library readiness audit",
        "synthesis index reference get",
        "synthesis artifact export-filtered",
        "synthesis artifact manifest",
        "synthesis graph get-metrics",
      ],
      providerPath: provider,
      cwd: runRoot,
    });
  });

  afterEach(async function () {
    await harness?.close();
    resetPluginStateStoreForTests();
    if (typeof previousRoot === "undefined") {
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    } else {
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
    }
    await fs.rm(runtimeRoot, { recursive: true, force: true });
  });

  it("exports a research bundle selection with readable selection artifacts", async function () {
    const agent = await loadAgent();
    assert.isTrue(agent.isResearchSkill("export-research-bundle"));
    assert.isFalse(agent.isResearchSkill("manuscript-literature-framing.mjs"));
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-research-peer-export-"),
    );
    const result = await agent.handleResearchSkill({
      skillId: "export-research-bundle",
      parameter: RESEARCH_PARAMS,
      workspace,
      env: {
        ...harness.env,
        ZOTERO_WORKFLOW_RESEARCH_PAPER_REFS: JSON.stringify(refs),
        ZOTERO_WORKFLOW_RESEARCH_TOPIC_IDS: JSON.stringify(topicIds),
      },
    });
    assert.isTrue(result.__SKILL_DONE__);
    assert.equal(result.kind, "research_bundle_selection");
    assert.equal(result.topic_count, 1);
    assert.isAbove(Number(result.related_paper_count), 0);
    const selection = JSON.parse(
      await fs.readFile(String(result.selection_manifest_path), "utf8"),
    );
    assert.equal(selection.schema_id, "research_bundle.selection");
    assert.isAbove(selection.papers.length, 0);
  });

  it("frames a manuscript with readable result artifacts", async function () {
    const agent = await loadAgent();
    assert.isTrue(agent.isResearchSkill("manuscript-literature-framing"));
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-research-peer-framing-"),
    );
    const result = await agent.handleResearchSkill({
      skillId: "manuscript-literature-framing",
      parameter: FRAMING_PARAMS,
      workspace,
      env: {
        ...harness.env,
        ZOTERO_WORKFLOW_RESEARCH_PAPER_REFS: JSON.stringify(refs),
        ZOTERO_WORKFLOW_RESEARCH_TOPIC_IDS: JSON.stringify(topicIds),
      },
    });
    assert.isTrue(result.__SKILL_DONE__);
    assert.equal(result.kind, "writing.manuscript_literature_framing");
    assert.equal(result.language, "zh-CN");
    const manifest = JSON.parse(
      await fs.readFile(String(result.artifact_manifest_path), "utf8"),
    );
    assert.isAbove(Object.keys(manifest).length, 0);
    for (const value of Object.values(manifest)) {
      assert.isNotEmpty(await fs.readFile(String(value), "utf8"));
    }
  });
});
