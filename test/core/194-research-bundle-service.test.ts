import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createDirectResearchBundleApplication,
  materializeResearchBundlePapers,
  publishDirectResearchBundle,
  type ResearchBundleEntry,
} from "../../src/modules/researchBundleService";
import {
  resetHostBridgeFileRegistryForTests,
  resolveHostBridgeFileDownload,
} from "../../src/modules/hostBridgeFileRegistry";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";

describe("Research Bundle service", function () {
  this.timeout(10_000);

  const originalIOUtils = Object.getOwnPropertyDescriptor(
    globalThis,
    "IOUtils",
  );

  afterEach(function () {
    if (originalIOUtils) {
      Object.defineProperty(globalThis, "IOUtils", originalIOUtils);
      return;
    }
    delete (globalThis as typeof globalThis & { IOUtils?: unknown }).IOUtils;
  });

  it("materializes Windows Markdown images through native Host paths", async function () {
    const observedPaths: string[] = [];
    const markdown = [
      "![relative](figures/a%20b.png)",
      "![file-url](file:///E:/research/figures/b.png)",
    ].join("\n");
    const readablePaths = new Set([
      "E:\\research\\paper.md",
      "E:\\research\\figures\\a b.png",
      "E:\\research\\figures\\b.png",
    ]);

    Object.defineProperty(globalThis, "IOUtils", {
      configurable: true,
      value: {
        exists: async (path: string) => {
          observedPaths.push(path);
          return readablePaths.has(path);
        },
        readUTF8: async (path: string) => {
          observedPaths.push(path);
          assert.equal(path, "E:\\research\\paper.md");
          return markdown;
        },
      },
    });

    const result = await materializeResearchBundlePapers({
      papers: [
        {
          paperRef: "1:ABCDEF12",
          libraryId: 1,
          itemKey: "ABCDEF12",
          title: "Windows paths",
          metadata: {},
          attachments: [
            {
              path: "E:/research/paper.md",
              filename: "paper.md",
              contentType: "text/markdown",
            },
          ],
        },
      ],
      readArtifacts: async () => ({ artifacts: [] }),
      includeSource: true,
    });

    const source = result.entries.find((entry) =>
      entry.path.endsWith("/source.md"),
    );
    const relativeImage = result.entries.find((entry) =>
      entry.path.endsWith("/figures/a b.png"),
    );
    const fileUrlImage = result.entries.find((entry) =>
      entry.path.endsWith("/figures/b.png"),
    );

    assert.ok(source?.text?.includes("figures/a%20b.png"));
    assert.ok(source?.text?.includes("figures/b.png"));
    assert.equal(relativeImage?.sourcePath, "E:\\research\\figures\\a b.png");
    assert.equal(fileUrlImage?.sourcePath, "E:\\research\\figures\\b.png");
    assert.ok(observedPaths.includes("E:\\research\\paper.md"));
    assert.ok(observedPaths.includes("E:\\research\\figures\\a b.png"));
    assert.ok(observedPaths.includes("E:\\research\\figures\\b.png"));
    assert.ok(
      result.entries.every((entry) => !entry.path.includes("\\")),
      "bundle paths stay portable",
    );
  });

  it("delivers Markdown image bytes in a remote direct bundle", async function () {
    const previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const tempRoot = await mkdtemp(join(tmpdir(), "zs-research-bundle-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
    resetHostBridgeFileRegistryForTests();

    try {
      const imageBytes = Buffer.from([137, 80, 78, 71]);
      const sourceImage = join(tempRoot, "fixture-image.png");
      await writeFile(sourceImage, imageBytes);
      const entries: ResearchBundleEntry[] = [
        {
          path: "papers/1_AAAA/source.md",
          contentType: "text/markdown",
          text: "![image](figures/image.png)\n",
        },
        {
          path: "papers/1_AAAA/figures/image.png",
          contentType: "application/octet-stream",
          sourcePath: sourceImage,
        },
      ];

      const published = await publishDirectResearchBundle({
        kind: "papers",
        capability: "items.export_research_bundle",
        connectionMode: "remote",
        entries,
        papers: [
          {
            paper_ref: "1:AAAA",
            source: {
              kind: "markdown",
              path: "papers/1_AAAA/source.md",
              assets: ["papers/1_AAAA/figures/image.png"],
            },
          },
        ],
        warnings: [],
        zipName: "research-bundle.zip",
      });

      assert.equal(published.delivery.mode, "bridge-download");
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          published.delivery.bundle,
          "localPath",
        ),
        false,
      );
      const resolved = await resolveHostBridgeFileDownload(
        published.delivery.bundle.fileId,
      );
      await createWorkflowArchiveApi().withExtractedZip(
        resolved.source.path,
        async (extracted) => {
          assert.equal(
            await extracted.readText("papers/1_AAAA/source.md"),
            "![image](figures/image.png)\n",
          );
          assert.deepEqual(
            Array.from(
              await extracted.readBytes("papers/1_AAAA/figures/image.png"),
            ),
            Array.from(imageBytes),
          );
          const manifest = JSON.parse(
            await extracted.readText("manifest.json"),
          ) as Record<string, unknown>;
          assert.equal(manifest.schema_id, "research_bundle.direct_export");
          assert.ok((await extracted.readText("index.md")).length > 0);
        },
      );
    } finally {
      resetHostBridgeFileRegistryForTests();
      if (typeof previousRoot === "undefined") {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
      }
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("owns paper bundle selection, artifact reads, and publication behind one application seam", async function () {
    const tempRoot = await mkdtemp(join(tmpdir(), "zs-research-bundle-app-"));
    const outputDir = join(tempRoot, "bundle");
    const observed: string[] = [];
    const application = createDirectResearchBundleApplication({
      host: {
        async resolveItems(selectors) {
          observed.push(`resolve:${JSON.stringify(selectors)}`);
          return [
            {
              paperRef: "1:ABCD1234",
              libraryId: 1,
              itemKey: "ABCD1234",
              title: "Alpha Paper",
              metadata: { key: "ABCD1234", title: "Alpha Paper" },
              attachments: [],
            },
          ];
        },
      },
      client: {
        artifacts: {
          async readPaperArtifacts(request) {
            observed.push(`artifacts:${request.paper_refs.join(",")}`);
            return { artifacts: [], diagnostics: [] } as any;
          },
        },
        topics: {},
      } as any,
    });

    try {
      const result = await application.exportPapers(
        {
          items: [{ key: "ABCD1234", libraryId: 1 }],
          output_dir: outputDir,
        },
        { mode: "local" },
      );
      assert.equal(result.delivery.mode, "local");
      assert.deepEqual(observed, [
        'resolve:[{"key":"ABCD1234","libraryId":1}]',
        "artifacts:1:ABCD1234",
      ]);
      const manifest = JSON.parse(
        await readFile(join(outputDir, "manifest.json"), "utf8"),
      );
      assert.equal(manifest.schema_id, "research_bundle.direct_export");
      assert.equal(manifest.schema_version, "1.0.0");
      assert.equal(manifest.papers[0].paper_ref, "1:ABCD1234");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects unresolved paper selectors before reading or publishing artifacts", async function () {
    let artifactReads = 0;
    const application = createDirectResearchBundleApplication({
      host: {
        async resolveItems() {
          return [];
        },
      },
      client: {
        artifacts: {
          async readPaperArtifacts() {
            artifactReads += 1;
            return { artifacts: [], diagnostics: [] } as any;
          },
        },
        topics: {},
      } as any,
    });

    await assert.rejects(
      application.exportPapers(
        { items: [{ key: "MISSING", libraryId: 1 }], output_dir: "unused" },
        { mode: "local" },
      ),
      (error: any) => error?.code === "invalid_research_bundle_selector",
    );
    assert.equal(artifactReads, 0);
  });

  it("deduplicates Topic source papers globally in the manifest", async function () {
    const tempRoot = await mkdtemp(join(tmpdir(), "zs-topic-bundle-app-"));
    const outputDir = join(tempRoot, "bundle");
    const application = createDirectResearchBundleApplication({
      host: {
        async resolveItems() {
          return [
            {
              paperRef: "1:ABCD1234",
              libraryId: 1,
              itemKey: "ABCD1234",
              title: "Shared Paper",
              metadata: {},
              attachments: [],
            },
          ];
        },
      },
      client: {
        artifacts: {
          async readPaperArtifacts() {
            return {
              artifacts: [
                {
                  paper_ref: "1:ABCD1234",
                  artifact_type: "digest",
                  status: "available",
                  markdown: "## Shared digest\n",
                },
              ],
              diagnostics: [],
            } as any;
          },
        },
        topics: {
          async getTopicReport({ topicId }: { topicId: string }) {
            return {
              ok: true,
              status: "available",
              topic_id: topicId,
              title: topicId,
              format: "markdown",
              markdown: `# ${topicId}\n`,
              diagnostics: [],
            } as any;
          },
          async getContext({ topicId }: { topicId: string }) {
            return {
              schema_id: "synthesis.topic_context",
              schema_version: "2.0.0",
              topic_id: topicId,
              view: "semantic",
              semantic: {
                source_papers: [
                  { paper_ref: "1:ABCD1234", title: "Shared Paper" },
                ],
              },
            } as any;
          },
        },
      } as any,
    });

    try {
      await application.exportTopics(
        { topic_ids: ["topic-a", "topic-b"], output_dir: outputDir },
        { mode: "local" },
      );
      const manifest = JSON.parse(
        await readFile(join(outputDir, "manifest.json"), "utf8"),
      );
      assert.equal(manifest.papers.length, 1);
      assert.equal(manifest.topics.length, 2);
      assert.deepEqual(manifest.papers_by_ref["1:ABCD1234"].topic_ids, [
        "topic-a",
        "topic-b",
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
