import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";
import { renderPayloadBlock } from "../../workflows_builtin/literature-workbench-package/lib/noteCodecs.mjs";
import { createStoreZipBytes } from "../../workflows_builtin/literature-workbench-package/lib/zipStore.mjs";
import {
  encodeBase64Utf8,
  joinPath,
  mkTempDir,
  readBytes,
  readUtf8,
  workflowsPath,
  writeBytes,
  writeUtf8,
} from "../zotero/workflow-test-utils";

async function getWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-deep-reading",
  );
  assert.isOk(
    workflow,
    `missing literature-deep-reading workflow; warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
  );
  return workflow!;
}

async function createParent(title = "DETR Test Paper") {
  return handlers.item.create({
    itemType: "journalArticle",
    fields: { title },
  });
}

async function addGeneratedSidecars(parent: Zotero.Item) {
  await handlers.parent.addNote(parent, {
    content: [
      '<div data-zs-note-kind="digest">',
      renderPayloadBlock(
        "digest-markdown",
        "# Digest\n\nA concise digest.",
        undefined,
        { payloadFormat: "text" },
      ),
      "</div>",
    ].join("\n"),
  });
  await handlers.parent.addNote(parent, {
    content: [
      '<div data-zs-note-kind="references">',
      renderPayloadBlock("references-json", {
        references: [{ id: "ref-1", title: "Reference One", year: 2020 }],
      }),
      "</div>",
    ].join("\n"),
  });
  await handlers.parent.addNote(parent, {
    content: [
      '<div data-zs-note-kind="citation_analysis">',
      renderPayloadBlock("citation-analysis-json", {
        report_md: "# Citation Analysis\n\nUsed as context.",
      }),
      "</div>",
    ].join("\n"),
  });
}

function createDeepReadingResultBundleReader(html: string) {
  return {
    async readText(entryPath: string) {
      if (entryPath === "literature-deep-reading.result.json") {
        return JSON.stringify({
          html_path: "result/deep-reading.html",
          manifest_path: "result/deep-reading-manifest.json",
        });
      }
      if (entryPath === "result/deep-reading.html") {
        return html;
      }
      if (entryPath === "result/deep-reading-manifest.json") {
        return JSON.stringify({ final_html_available: true });
      }
      throw new Error(`missing bundle entry: ${entryPath}`);
    },
  };
}

describe("workflow: literature-deep-reading", function () {
  this.timeout(30000);

  it("writes ArrayBuffer and typed-array ZIP entries without dropping bytes", async function () {
    const tempDir = await mkTempDir("zs-deep-reading-zip");
    const zipPath = joinPath(tempDir, "bundle.zip");
    const source = new Uint8Array([1, 2, 3, 4, 5]);
    await writeBytes(
      zipPath,
      createStoreZipBytes([
        { name: "array-buffer.bin", bytes: source.buffer },
        { name: "data-view.bin", bytes: new DataView(source.buffer, 1, 3) },
      ]),
    );

    const bundle = new ZipBundleReader(zipPath);
    const extracted = await bundle.getExtractedDir();
    assert.deepEqual(
      Array.from(await readBytes(joinPath(extracted, "array-buffer.bin"))),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      Array.from(await readBytes(joinPath(extracted, "data-view.bin"))),
      [2, 3, 4],
    );
  });

  it("loads the workflow manifest", async function () {
    const workflow = await getWorkflow();
    assert.equal(workflow.manifest.provider, "acp");
    assert.equal(workflow.manifest.request?.kind, "skillrunner.job.v1");
    assert.equal(
      workflow.manifest.parameters?.target_language?.default,
      "zh-CN",
    );
    assert.isFunction(workflow.hooks.filterInputs);
    assert.isFunction(workflow.hooks.buildRequest);
    assert.isFunction(workflow.hooks.applyResult);
  });

  it("builds a source bundle with rewritten images and sidecar artifacts", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-source");
    const imageDir = joinPath(tempDir, "images");
    const markdownPath = joinPath(tempDir, "paper.md");
    const figurePath = joinPath(imageDir, "figure one.png");
    await writeBytes(figurePath, new Uint8Array([137, 80, 78, 71, 13, 10]));
    await writeUtf8(
      markdownPath,
      [
        "# Paper",
        "",
        "![Figure](images/figure%20one.png)",
        "",
        '<img src="missing.png" alt="missing">',
      ].join("\n"),
    );

    const parent = await createParent();
    await addGeneratedSidecars(parent);
    const markdownAttachment = await handlers.attachment.createFromPath({
      parent,
      path: markdownPath,
      title: "paper.md",
      mimeType: "text/markdown",
    });

    const selectionContext = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext,
      executionOptions: {
        workflowParams: {
          target_language: "zh-CN",
        },
      },
    })) as Array<{
      kind: string;
      skill_id: string;
      targetParentID: number;
      input: { source_bundle_path: string };
      upload_files: Array<{ key: string; path: string }>;
      parameter: { target_language: string };
    }>;

    assert.lengthOf(requests, 1);
    const request = requests[0];
    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "literature-deep-reading");
    assert.equal(request.targetParentID, parent.id);
    assert.deepEqual(request.parameter, { target_language: "zh-CN" });
    assert.equal(request.upload_files[0]?.key, "source_bundle_path");
    assert.equal(
      request.input.source_bundle_path,
      "source_bundle_path/source_bundle.zip",
    );
    assert.match(request.upload_files[0]?.path, /source_bundle\.zip$/);

    const bundle = new ZipBundleReader(request.upload_files[0].path);
    const extracted = await bundle.getExtractedDir();
    const sourceMarkdown = await bundle.readText("source.md");
    assert.include(sourceMarkdown, "images/001-figure one.png");
    assert.notInclude(sourceMarkdown, "images/figure%20one.png");
    assert.include(sourceMarkdown, 'src="missing.png"');
    assert.equal(
      await bundle.readText("artifacts/digest.md"),
      "# Digest\n\nA concise digest.",
    );
    assert.include(
      await bundle.readText("artifacts/references.json"),
      "Reference One",
    );
    assert.include(
      await bundle.readText("artifacts/citation_analysis.json"),
      "report_md",
    );
    const manifest = JSON.parse(await bundle.readText("source-manifest.json"));
    assert.equal(manifest.source.kind, "markdown");
    assert.equal(manifest.source.source_markdown_path, "source.md");
    assert.equal(manifest.paper.item_key, parent.key);
    assert.notProperty(manifest.parameters, "translation_mode");
    assert.equal(manifest.sidecar_artifacts.references.status, "available");
    assert.equal(manifest.images[0].bundle_path, "images/001-figure one.png");
    assert.equal(manifest.images[0].bytes, 6);
    assert.deepEqual(
      Array.from(
        await readBytes(joinPath(extracted, manifest.images[0].bundle_path)),
      ),
      [137, 80, 78, 71, 13, 10],
    );
    assert.isTrue(
      manifest.diagnostics.some(
        (entry: { code?: string }) => entry.code === "image_missing",
      ),
      "missing image should be diagnostic-only",
    );
    assert.equal(markdownAttachment.parentID, parent.id);
  });

  it("prefers Host paper artifacts when bundling selected parent sidecars", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-host-sidecars");
    const markdownPath = joinPath(tempDir, "paper.md");
    await writeUtf8(markdownPath, "# Host Artifact Paper\n\nBody.");

    const parent = await createParent("Host Artifact Paper");
    await handlers.attachment.createFromPath({
      parent,
      path: markdownPath,
      title: "paper.md",
      mimeType: "text/markdown",
    });

    const hostApi = createWorkflowHostApi() as ReturnType<
      typeof createWorkflowHostApi
    > & {
      synthesis: NonNullable<
        ReturnType<typeof createWorkflowHostApi>["synthesis"]
      >;
    };
    hostApi.synthesis = {
      ...hostApi.synthesis,
      async readPaperArtifacts(args: Record<string, unknown>) {
        assert.deepEqual(args.paper_refs, [`1:${parent.key}`]);
        return {
          artifacts: [
            {
              paper_ref: `1:${parent.key}`,
              artifact_type: "digest",
              payload_type: "digest-markdown",
              status: "available",
              markdown: "# Host Digest\n\nRead from Host.",
            },
            {
              paper_ref: `1:${parent.key}`,
              artifact_type: "references",
              payload_type: "references-json",
              status: "available",
              payload: {
                references: [{ id: "ref-host", title: "Host Reference" }],
              },
            },
            {
              paper_ref: `1:${parent.key}`,
              artifact_type: "citation_analysis",
              payload_type: "citation-analysis-markdown",
              status: "available",
              decoded_text: "# Host Citation Analysis",
            },
          ],
          diagnostics: [],
        };
      },
    };

    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([parent]),
      runtime: { hostApi },
    })) as Array<{ upload_files: Array<{ path: string }> }>;

    const bundle = new ZipBundleReader(requests[0].upload_files[0].path);
    assert.equal(
      await bundle.readText("artifacts/digest.md"),
      "# Host Digest\n\nRead from Host.",
    );
    assert.include(
      await bundle.readText("artifacts/references.json"),
      "Host Reference",
    );
    assert.equal(
      await bundle.readText("artifacts/citation-analysis.md"),
      "# Host Citation Analysis",
    );
    const manifest = JSON.parse(await bundle.readText("source-manifest.json"));
    assert.equal(
      manifest.sidecar_artifacts.digest.source,
      "host_synthesis_read_paper_artifacts",
    );
    assert.equal(
      manifest.sidecar_artifacts.citation_analysis.status,
      "available",
    );
  });

  it("falls back to PDF in the source bundle", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-pdf");
    const pdfPath = joinPath(tempDir, "paper.pdf");
    await writeBytes(pdfPath, new Uint8Array([37, 80, 68, 70]));

    const parent = await createParent("PDF Only Paper");
    await handlers.attachment.createFromPath({
      parent,
      path: pdfPath,
      title: "paper.pdf",
      mimeType: "application/pdf",
    });

    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([parent]),
    })) as Array<{ upload_files: Array<{ path: string }> }>;

    assert.lengthOf(requests, 1);
    const bundle = new ZipBundleReader(requests[0].upload_files[0].path);
    const manifest = JSON.parse(await bundle.readText("source-manifest.json"));
    assert.equal(manifest.source.kind, "pdf_fallback");
    assert.equal(manifest.source.original_pdf_path, "original.pdf");
    assert.include(
      manifest.diagnostics.map((entry: { code?: string }) => entry.code),
      "pdf_fallback",
    );
    const originalPdf = await bundle.readText("original.pdf");
    assert.equal(originalPdf.charCodeAt(0), 37);
  });

  it("attaches the final HTML result to the parent", async function () {
    const workflow = await getWorkflow();
    const parent = await createParent("Attach Deep Reading Paper");
    const request = {
      targetParentID: parent.id,
      input: {
        source_bundle_path: "inputs/source_bundle_path/source_bundle.zip",
      },
      upload_files: [
        { key: "source_bundle_path", path: "D:/tmp/source_bundle.zip" },
      ],
    };
    const html = "<!doctype html><html><body>Deep reading result</body></html>";

    const applied = (await executeApplyResult({
      workflow,
      parent,
      request,
      bundleReader: createDeepReadingResultBundleReader(html) as any,
      runtime: { hostApi: createWorkflowHostApi() },
    })) as {
      ok: boolean;
      attachmentId: number;
      attachmentKey: string;
      htmlPath: string;
    };

    assert.isTrue(applied.ok);
    assert.isAbove(applied.attachmentId, 0);
    assert.isNotEmpty(applied.attachmentKey);
    assert.equal(await readUtf8(applied.htmlPath), html);

    const attached = Zotero.Items.get(applied.attachmentId)!;
    assert.equal(attached.parentID, parent.id);
    assert.match(
      attached.getField("title"),
      /^Deep Reading - Attach Deep Reading Paper - /,
    );
  });
});
