import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import {
  computeResearchPaperScore,
  isResearchPayloadType,
  materializeResearchProduct,
  normalizeResearchSelection,
} from "../../workflows_builtin/literature-workbench-package/lib/researchBundle.mjs";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";

describe("export research bundle workflow", function () {
  it("loads as a core automatic no-selection workflow without language", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "export-research-bundle",
    )?.manifest;
    assert.isOk(workflow);
    assert.equal(workflow?.provider, "skillrunner");
    assert.isTrue(workflow?.display?.core);
    assert.equal(workflow?.trigger?.requiresSelection, false);
    assert.equal(workflow?.request?.create?.mode, "auto");
    assert.equal(
      workflow?.parameters?.articleType?.default,
      "original research",
    );
    assert.notProperty(workflow?.parameters || {}, "language");
    assert.equal(workflow?.parameters?.maxTopics?.default, 5);
    assert.equal(workflow?.parameters?.maxCorePapers?.default, 20);
    assert.equal(workflow?.parameters?.maxRelatedPapers?.default, 80);
  });

  it("ships a self-contained automatic skill package", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["export-research-bundle"];
    assert.isOk(entry);
    const runner = JSON.parse(
      await fs.readFile(
        "skills_builtin/export-research-bundle/assets/runner.json",
        "utf8",
      ),
    );
    assert.deepEqual(runner.execution_modes, ["auto"]);
    const prompt = runner.entrypoint.prompts.common;
    assert.include(prompt, "SKILL.md");
    assert.include(prompt, "scripts/gate_runtime.py");
    assert.notInclude(prompt, "scripts/stage_runtime.py");
    const parameters = JSON.parse(
      await fs.readFile(
        "skills_builtin/export-research-bundle/assets/parameter.schema.json",
        "utf8",
      ),
    );
    assert.notProperty(parameters.properties, "language");
  });

  it("validates bounded selection and core subset invariants", function () {
    const selection = normalizeResearchSelection({
      schema_id: "research_bundle.selection",
      schema_version: "1.0.0",
      intent: {
        paper_title: "Graph-grounded review",
        article_type: "original research",
        research_content: "Citation graph evidence selection",
      },
      topics: [{ topic_id: "graph", relevance: 0.9 }],
      papers: [
        { paper_ref: "1:AAAA1111", semantic_relevance: 0.9, role: "core" },
        { paper_ref: "1:BBBB2222", semantic_relevance: 0.7, role: "related" },
      ],
      diagnostics: [],
    });
    assert.lengthOf(selection.papers, 2);
    assert.equal(selection.papers[0].paper_ref, "1:AAAA1111");
    assert.throws(() =>
      normalizeResearchSelection({
        ...selection,
        papers: [
          { paper_ref: "1:LOW00000", semantic_relevance: 0.2, role: "related" },
        ],
      }),
    );
    assert.equal(
      normalizeResearchSelection({
        ...selection,
        limits: { ...selection.limits, max_topics: 0 },
        topics: [],
      }).limits.max_topics,
      0,
    );
    assert.throws(
      () =>
        normalizeResearchSelection({
          ...selection,
          papers: [
            {
              paper_ref: "1:HIGH0001",
              semantic_relevance: 0.95,
              role: "related",
            },
            {
              paper_ref: "1:LOW00001",
              semantic_relevance: 0.5,
              role: "core",
            },
          ],
        }),
      /highest-scoring prefix/,
    );
  });

  it("uses documented graph and fallback score weights", function () {
    assert.closeTo(
      computeResearchPaperScore({
        semantic: 0.8,
        graph: 0.6,
        topic: 0.4,
        readiness: 1,
      }),
      0.71,
      0.0001,
    );
    assert.closeTo(
      computeResearchPaperScore({
        semantic: 0.8,
        graph: 0,
        topic: 0.4,
        readiness: 1,
        graphAvailable: false,
      }),
      0.75,
      0.0001,
    );
  });

  it("collects every supported analysis and conversation payload type", function () {
    for (const payloadType of [
      "digest-markdown",
      "references-json",
      "citation-analysis-json",
      "conversation-note-markdown",
    ]) {
      assert.isTrue(isResearchPayloadType(payloadType));
    }
    assert.isFalse(isResearchPayloadType("unrelated-payload"));
  });

  it("registers topic reports, all metadata, and core Markdown sidecars as one atomic product", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-research-product-"),
    );
    const markdownPath = path.join(root, "paper.md");
    const imagePath = path.join(root, "figure.png");
    const pdfPath = path.join(root, "second.pdf");
    await fs.writeFile(
      markdownPath,
      "# Paper\n\n![figure](figure.png)",
      "utf8",
    );
    await fs.writeFile(imagePath, new Uint8Array([1, 2, 3]));
    await fs.writeFile(pdfPath, new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const items = new Map([
      ["AAAA1111", { id: 1, key: "AAAA1111", getNotes: () => [] }],
      ["BBBB2222", { id: 2, key: "BBBB2222", getNotes: () => [] }],
      ["CCCC3333", { id: 3, key: "CCCC3333", getNotes: () => [] }],
    ]);
    let registration: any;
    const result = await materializeResearchProduct({
      selection: {
        schema_id: "research_bundle.selection",
        intent: {
          paper_title: "Research",
          article_type: "original research",
          research_content: "Graph evidence",
        },
        topics: [{ topic_id: "topic-a", relevance: 1 }],
        papers: [
          { paper_ref: "1:AAAA1111", semantic_relevance: 1, role: "core" },
          { paper_ref: "1:BBBB2222", semantic_relevance: 0.8, role: "core" },
          { paper_ref: "1:CCCC3333", semantic_relevance: 0.7, role: "related" },
        ],
      },
      runtime: {
        helpers: {
          isMarkdownAttachment: (entry: any) => entry.filename.endsWith(".md"),
          isPdfAttachment: (entry: any) => entry.filename.endsWith(".pdf"),
          resolveItemRef: () => null,
        },
        hostApi: {
          items: {
            getByLibraryAndKey: (_libraryId: number, key: string) =>
              items.get(key),
            get: () => null,
            exportPortableJson: (item: any) => ({
              itemType: "journalArticle",
              key: item.key,
            }),
          },
          synthesis: {
            async getTopicReport() {
              return { synthesis_report: { body: "# Topic report" } };
            },
          },
          library: {
            async getItemAttachments(ref: any) {
              if (ref.key === "BBBB2222") {
                return [
                  {
                    key: "PDF",
                    filename: "second.pdf",
                    contentType: "application/pdf",
                    path: pdfPath,
                  },
                ];
              }
              return ref.key === "AAAA1111"
                ? [
                    {
                      key: "MD",
                      filename: "paper.md",
                      contentType: "text/markdown",
                      path: markdownPath,
                    },
                  ]
                : [];
            },
          },
          file: {
            exists: async (target: string) => {
              try {
                await fs.stat(target);
                return true;
              } catch {
                return false;
              }
            },
            readText: (target: string) => fs.readFile(target, "utf8"),
          },
          archive: createWorkflowArchiveApi(),
        },
      },
      productStorage: {
        async registerProduct(input: any) {
          registration = input;
          return { productId: "research-product", assets: input.assets };
        },
      },
    });
    try {
      assert.equal(registration.failurePolicy, "atomic");
      assert.include(
        registration.assets.map((entry: any) => entry.productAssetPath),
        "topics/topic-001/report.md",
      );
      assert.include(
        registration.assets.map((entry: any) => entry.productAssetPath),
        "papers/paper-001/source/assets/m1/figure.png",
      );
      assert.include(
        registration.assets.map((entry: any) => entry.productAssetPath),
        "papers/paper-002/metadata.json",
      );
      assert.include(
        registration.assets.map((entry: any) => entry.productAssetPath),
        "papers/paper-002/source/second.pdf",
      );
      assert.include(
        registration.assets.map((entry: any) => entry.productAssetPath),
        "papers/paper-003/metadata.json",
      );
      assert.notProperty(result.manifest.files, "manifest.json");
      assert.equal(result.manifest.papers[0].role, "core");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
