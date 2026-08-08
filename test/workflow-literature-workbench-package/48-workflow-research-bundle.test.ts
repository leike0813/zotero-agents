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
  researchPayloadArtifactPath,
} from "../../workflows_builtin/literature-workbench-package/lib/researchBundle.mjs";
import {
  renderResearchBundleIndex,
  renderResearchBundleReadme,
  resolveResearchBundleReadmeLocale,
} from "../../workflows_builtin/literature-workbench-package/lib/researchBundleReadme.mjs";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";
import { applyResult as applyResearchBundleResult } from "../../workflows_builtin/literature-workbench-package/export-research-bundle/hooks/applyResult.mjs";

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
    const mandatory = normalizeResearchSelection({
      ...selection,
      limits: { ...selection.limits, max_related_papers: 1 },
      papers: [
        {
          paper_ref: "1:TOPIC0001",
          semantic_relevance: 0.2,
          role: "related",
          matched_topic_ids: ["graph"],
          candidate_sources: ["topic:graph"],
        },
        {
          paper_ref: "1:OPTIONAL1",
          semantic_relevance: 0.9,
          role: "core",
        },
      ],
    });
    assert.sameMembers(
      mandatory.papers.map((paper) => paper.paper_ref),
      ["1:TOPIC0001", "1:OPTIONAL1"],
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

  it("collects only the literature-analysis three-payload set", function () {
    for (const payloadType of [
      "digest-markdown",
      "references-json",
      "citation-analysis-json",
    ]) {
      assert.isTrue(isResearchPayloadType(payloadType));
    }
    assert.isFalse(isResearchPayloadType("conversation-note-markdown"));
    assert.isFalse(isResearchPayloadType("unrelated-payload"));
    assert.equal(
      researchPayloadArtifactPath({
        logicalId: "paper-001",
        payloadType: "digest-markdown",
        ordinal: 1,
        format: "markdown",
      }),
      "papers/paper-001/digest-001.md",
    );
    assert.equal(
      researchPayloadArtifactPath({
        logicalId: "paper-001",
        payloadType: "citation-analysis-json",
        ordinal: 2,
        format: "json",
      }),
      "papers/paper-001/citation-analysis-002.json",
    );
  });

  it("renders a localized agent-readable README with English fallback", function () {
    for (const locale of [
      "en-US",
      "zh-CN",
      "zh-TW",
      "fr-FR",
      "ja-JP",
      "de",
      "es-ES",
      "pt-BR",
      "ko-KR",
      "it-IT",
      "ru-RU",
    ]) {
      assert.equal(resolveResearchBundleReadmeLocale(locale), locale);
    }
    assert.equal(resolveResearchBundleReadmeLocale("zh_cn"), "zh-CN");
    assert.equal(resolveResearchBundleReadmeLocale("nl-NL"), "en-US");
    const shared = {
      intent: {
        paper_title: "Research",
        article_type: "original research",
        research_content: "Graph evidence",
      },
      topics: [
        {
          logical_id: "topic-001",
          topic_id: "topic-a",
          relevance: 1,
          report_path: "topics/topic-001/report.md",
        },
      ],
      papers: [
        {
          logical_id: "paper-001",
          paper_ref: "1:AAAA1111",
          role: "core",
          score: 0.9,
          metadata_path: "papers/paper-001/metadata.json",
          source: { kind: "markdown", path: "papers/paper-001/source.md" },
          payloads: [
            {
              path: "papers/paper-001/digest-001.md",
              payload_type: "digest-markdown",
            },
          ],
        },
      ],
      warningCount: 1,
    };
    const english = renderResearchBundleReadme({ ...shared, locale: "en-US" });
    const chinese = renderResearchBundleReadme({ ...shared, locale: "zh-CN" });
    assert.include(english, "## How to use this bundle");
    assert.include(chinese, "## 使用顺序");
    for (const readme of [english, chinese]) {
      assert.include(readme, "`manifest.json`");
      assert.include(readme, "topics/topic-001/report.md");
      assert.include(readme, "papers/paper-001/source.md");
      const tableLines = readme
        .split("\n")
        .filter((line) => line.startsWith("| "));
      const paperHeaderIndex = tableLines.findIndex((line) =>
        /\| ID \| (?:Paper reference|文献引用) \|/.test(line),
      );
      assert.isAtLeast(paperHeaderIndex, 0);
      const tableCellCount = (line: string) => line.split("|").length - 2;
      assert.equal(tableCellCount(tableLines[paperHeaderIndex]), 7);
      assert.equal(tableCellCount(tableLines[paperHeaderIndex + 1]), 7);
    }
  });

  it("renders a minimal deterministic index for Topic ids and paper titles", function () {
    const index = renderResearchBundleIndex({
      topics: [{ topic_id: "topic-a", logical_id: "topic-001" }],
      papers: [
        {
          title: "Graph | Evidence",
          paper_ref: "1:AAAA1111",
          logical_id: "paper-001",
        },
      ],
    });
    assert.include(index, "| topic-a | `topics/topic-001` |");
    assert.include(index, "| Graph \\| Evidence | `papers/paper-001` |");
    assert.notInclude(index, "manifest.json");
    assert.notInclude(index, "score");
  });

  it("registers topic reports, all metadata, and core Markdown sidecars as one atomic product", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-research-product-"),
    );
    const markdownPath = path.join(root, "paper.md");
    const imagePath = path.join(root, "figure.png");
    const figureDir = path.join(root, "figures");
    const nestedImagePath = path.join(figureDir, "a b.png");
    const outsideFileName = `${path.basename(root)}-shared.png`;
    const outsideRelativePath = `../${outsideFileName}`;
    const outsideImagePath = path.join(path.dirname(root), outsideFileName);
    const pdfPath = path.join(root, "second.pdf");
    await fs.writeFile(
      markdownPath,
      `# Paper\n\n![figure](figure.png?size=full#view)\n![nested](figures/a%20b.png#detail)\n![outside](${outsideRelativePath})\n![missing](missing.png)\n![remote](https://example.test/a.png)\n![data](data:image/png;base64,AAAA)`,
      "utf8",
    );
    await fs.mkdir(figureDir);
    await fs.writeFile(imagePath, new Uint8Array([1, 2, 3]));
    await fs.writeFile(nestedImagePath, new Uint8Array([4, 5, 6]));
    await fs.writeFile(outsideImagePath, new Uint8Array([7, 8, 9]));
    await fs.writeFile(pdfPath, new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const items = new Map([
      ["AAAA1111", { id: 1, key: "AAAA1111", getNotes: () => [] }],
      ["BBBB2222", { id: 2, key: "BBBB2222", getNotes: () => [] }],
      ["CCCC3333", { id: 3, key: "CCCC3333", getNotes: () => [] }],
    ]);
    const exportedItemKeys: string[] = [];
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
            async exportText(args: any) {
              exportedItemKeys.push(
                ...args.items.map((item: any) => String(item.key)),
              );
              return {
                ok: true,
                content:
                  "@article{a, title={A}}\n@article{b, title={B}}\n@article{c, title={C}}\n",
                translator: {
                  translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
                  label: "Better BibTeX",
                  target: "bib",
                },
                fallbackUsed: false,
                attempts: [
                  {
                    translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
                    label: "Better BibTeX",
                    status: "succeeded",
                  },
                ],
              };
            },
          },
          synthesis: {
            async getTopicReport() {
              return { markdown: "# Topic report" };
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
              if (target.endsWith("missing.png")) {
                throw new Error("NS_ERROR_FILE_UNRECOGNIZED_PATH");
              }
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
          return {
            productId: "research-product",
            assetCount: input.assets.length,
            availableAssetCount: input.assets.length,
            missingAssetCount: 0,
          };
        },
      },
    });
    try {
      assert.equal(registration.failurePolicy, "atomic");
      const productPaths = registration.assets.map(
        (entry: any) => entry.productAssetPath,
      );
      assert.include(productPaths, "topics/topic-001/report.md");
      assert.equal(
        registration.assets.find(
          (entry: any) =>
            entry.productAssetPath === "topics/topic-001/report.md",
        ).source.text,
        "# Topic report",
      );
      assert.include(productPaths, "papers/paper-001/metadata.json");
      assert.include(productPaths, "papers/paper-001/source.md");
      assert.include(productPaths, "papers/paper-001/figure.png");
      assert.include(productPaths, "papers/paper-001/figures/a b.png");
      assert.include(productPaths, "papers/paper-002/metadata.json");
      assert.include(productPaths, "papers/paper-002/source.pdf");
      assert.include(productPaths, "papers/paper-003/metadata.json");
      assert.include(productPaths, "references.bib");
      assert.include(productPaths, "index.md");
      assert.deepEqual(exportedItemKeys, ["AAAA1111", "BBBB2222", "CCCC3333"]);
      assert.notInclude(productPaths, "papers/paper-001.image-m1-figure.png");
      assert.notInclude(productPaths, `papers/paper-001/${outsideFileName}`);
      const markdownSource = registration.assets.find(
        (entry: any) => entry.productAssetPath === "papers/paper-001/source.md",
      );
      assert.include(markdownSource.source.text, "figure.png?size=full#view");
      assert.include(markdownSource.source.text, "figures/a%20b.png#detail");
      assert.include(markdownSource.source.text, outsideRelativePath);
      assert.include(markdownSource.source.text, "missing.png");
      assert.include(markdownSource.source.text, "https://example.test/a.png");
      assert.include(markdownSource.source.text, "data:image/png;base64,AAAA");
      assert.equal(result.manifest.schema_version, "2.0.0");
      assert.equal(
        result.manifest.topics[0].report_path,
        "topics/topic-001/report.md",
      );
      assert.equal(
        result.manifest.papers[0].metadata_path,
        "papers/paper-001/metadata.json",
      );
      assert.isNull(result.manifest.papers[2].source);
      assert.notInclude(productPaths, "papers/paper-003/source.md");
      assert.notInclude(productPaths, "papers/paper-003/source.pdf");
      assert.deepEqual(result.manifest.papers[0].source.assets, [
        {
          path: "papers/paper-001/figures/a b.png",
          source_relative_path: "figures/a b.png",
        },
        {
          path: "papers/paper-001/figure.png",
          source_relative_path: "figure.png",
        },
      ]);
      assert.includeMembers(
        result.manifest.warnings.map((warning) => warning.code),
        ["markdown_image_outside_source_tree", "markdown_image_missing"],
      );
      assert.deepInclude(result.manifest.warnings, {
        code: "markdown_image_missing",
        path: path.join(root, "missing.png"),
        reason: "probe_failed",
        paper_ref: "1:AAAA1111",
      });
      assert.notProperty(result.manifest.files, "manifest.json");
      assert.property(result.manifest.files, "references.bib");
      assert.property(result.manifest.files, "index.md");
      assert.deepInclude(result.manifest.bibliography, {
        status: "generated",
        path: "references.bib",
        requested_format: "better-bibtex",
        actual_format: "better-bibtex",
        fallback_used: false,
        item_count: 3,
      });
      const readmeAsset = registration.assets.find(
        (entry: any) => entry.productAssetPath === "README.md",
      );
      assert.include(readmeAsset.source.text, "references.bib");
      assert.equal(result.manifest.papers[0].role, "core");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
      await fs.rm(outsideImagePath, { force: true });
    }
  });

  it("records native BibTeX fallback and aborts when every exporter fails", async function () {
    const selection = {
      schema_id: "research_bundle.selection",
      intent: {
        paper_title: "Fallback research",
        article_type: "review",
        research_content: "Evidence",
      },
      topics: [],
      papers: [
        {
          paper_ref: "1:AAAA1111",
          semantic_relevance: 0.8,
          role: "related",
        },
      ],
    };
    let exportResult: any;
    let registrationCount = 0;
    const run = () =>
      materializeResearchProduct({
        selection,
        runtime: {
          helpers: { resolveItemRef: () => null },
          hostApi: {
            items: {
              getByLibraryAndKey: () => ({
                id: 1,
                key: "AAAA1111",
                getNotes: () => [],
              }),
              get: () => null,
              exportPortableJson: () => ({
                itemType: "journalArticle",
                key: "AAAA1111",
              }),
              exportText: async () => exportResult,
            },
            archive: createWorkflowArchiveApi(),
          },
        },
        productStorage: {
          async registerProduct(input: any) {
            registrationCount += 1;
            return {
              productId: "fallback-product",
              assetCount: input.assets.length,
              availableAssetCount: input.assets.length,
              missingAssetCount: 0,
            };
          },
        },
      });

    exportResult = {
      ok: true,
      content: "@article{native, title={Fallback}}\n",
      translator: {
        translatorID: "9cb70025-a888-4a29-a210-93ec52da40d4",
        label: "BibTeX",
        target: "bib",
      },
      fallbackUsed: true,
      attempts: [
        {
          translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
          label: "Better BibTeX",
          status: "failed",
          errorCode: "export_failed",
        },
        {
          translatorID: "9cb70025-a888-4a29-a210-93ec52da40d4",
          label: "BibTeX",
          status: "succeeded",
        },
      ],
    };
    const fallback = await run();
    assert.deepInclude(fallback.manifest.bibliography, {
      status: "generated",
      actual_format: "bibtex",
      fallback_used: true,
    });
    assert.deepInclude(fallback.manifest.warnings[0], {
      code: "bibliography_export_fallback",
      reason_code: "export_failed",
    });

    exportResult = {
      ok: false,
      attempts: [
        {
          translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
          label: "Better BibTeX",
          status: "failed",
          errorCode: "export_failed",
        },
        {
          translatorID: "9cb70025-a888-4a29-a210-93ec52da40d4",
          label: "BibTeX",
          status: "failed",
          errorCode: "export_failed",
        },
      ],
    };
    let failure: any;
    try {
      await run();
    } catch (error) {
      failure = error;
    }
    assert.equal(failure?.code, "bibliography_export_failed");
    assert.equal(registrationCount, 1);
  });

  it("does not invoke bibliography export when no selected item materializes", async function () {
    let exportCalls = 0;
    const result = await materializeResearchProduct({
      selection: {
        schema_id: "research_bundle.selection",
        intent: {
          paper_title: "Missing research",
          article_type: "review",
          research_content: "Evidence",
        },
        topics: [],
        papers: [
          {
            paper_ref: "1:MISSING1",
            semantic_relevance: 0.8,
            role: "related",
          },
        ],
      },
      runtime: {
        helpers: { resolveItemRef: () => null },
        hostApi: {
          items: {
            getByLibraryAndKey: () => null,
            get: () => null,
            exportPortableJson: () => ({}),
            async exportText() {
              exportCalls += 1;
              throw new Error("must not be called");
            },
          },
          archive: createWorkflowArchiveApi(),
        },
      },
      productStorage: {
        async registerProduct(input: any) {
          return {
            productId: "missing-product",
            assetCount: input.assets.length,
            availableAssetCount: input.assets.length,
            missingAssetCount: 0,
          };
        },
      },
    });

    assert.equal(exportCalls, 0);
    assert.deepInclude(result.manifest.bibliography, {
      status: "not_generated",
      reason: "no_materialized_items",
      item_count: 0,
    });
    assert.include(
      result.manifest.warnings.map((warning: any) => warning.code),
      "paper_missing",
    );
  });

  it("returns apply diagnostics derived from Product manifest warnings", async function () {
    const selection = {
      schema_id: "research_bundle.selection",
      intent: {
        paper_title: "Diagnostics",
        article_type: "original research",
        research_content: "Warning propagation",
      },
      topics: [],
      papers: [
        {
          paper_ref: "1:AAAA1111",
          semantic_relevance: 1,
          role: "core",
        },
      ],
    };
    let registration: any;
    const result = await applyResearchBundleResult({
      runResult: { status: "succeeded" },
      resultContext: {
        resultJson: { selection_manifest_path: "result/selection.json" },
        async readArtifactText() {
          return { text: JSON.stringify(selection) };
        },
      },
      runtime: {
        helpers: {
          isMarkdownAttachment: () => false,
          isPdfAttachment: () => false,
        },
        hostApi: {
          items: {
            getByLibraryAndKey: () => ({
              id: 1,
              key: "AAAA1111",
              getNotes: () => [],
            }),
            get: () => null,
            exportPortableJson: () => ({
              itemType: "journalArticle",
              key: "AAAA1111",
            }),
            async exportText() {
              return {
                ok: true,
                content: "@article{a, title={A}}\n",
                translator: {
                  translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
                  label: "Better BibTeX",
                  target: "bib",
                },
                fallbackUsed: false,
                attempts: [],
              };
            },
          },
          library: { getItemAttachments: async () => [] },
          file: {
            exists: async () => false,
            readText: async () => "",
          },
          archive: createWorkflowArchiveApi(),
        },
      },
      productStorage: {
        async registerProduct(input: any) {
          registration = input;
          return {
            productId: "diagnostics-product",
            assetCount: input.assets.length,
            availableAssetCount: input.assets.length,
            missingAssetCount: 0,
          };
        },
      },
    });

    const manifestAsset = registration.assets.find(
      (entry: any) => entry.productAssetPath === "manifest.json",
    );
    const manifest = JSON.parse(manifestAsset.source.text);
    assert.notProperty(result, "warningCount");
    assert.deepEqual(result.applyDiagnostics, {
      warningCount: manifest.warnings.length,
      warningCodeCounts: { core_source_missing: 1 },
    });
  });
});
