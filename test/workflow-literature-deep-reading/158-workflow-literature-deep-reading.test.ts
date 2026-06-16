import { assert } from "chai";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../src/config/defaults";
import { handlers } from "../../src/handlers";
import { validateAcpSkillRunRequestAgainstSchemas } from "../../src/modules/acpSkillSchemaAssets";
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
  ensureDir,
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
  const parent = await handlers.item.create({
    itemType: "journalArticle",
    fields: { title },
  });
  parent.setCreators?.([
    { firstName: "Jane", lastName: "Doe", creatorType: "author" },
  ]);
  return parent;
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
    assert.equal(workflow.manifest.provider, "skillrunner");
    assert.equal(workflow.manifest.request?.kind, "skillrunner.sequence.v1");
    assert.equal(workflow.manifest.result?.final_step_id, "deep_reading");
    assert.equal(
      workflow.manifest.parameters?.target_language?.default,
      "zh-CN",
    );
    assert.isFunction(workflow.hooks.filterInputs);
    assert.isFunction(workflow.hooks.buildRequest);
    assert.isFunction(workflow.hooks.applyResult);
  });

  it("declares translator handoff fields as inline ACP inputs", async function () {
    const schema = JSON.parse(
      await readUtf8(
        joinPath(
          process.cwd(),
          "skills_builtin",
          "literature-deep-reading",
          "assets",
          "input.schema.json",
        ),
      ),
    );
    for (const key of [
      "translator_alignment_path",
      "translator_output_path",
      "translator_status",
    ]) {
      assert.equal(
        schema.properties?.[key]?.["x-input-source"],
        "inline",
        `${key} must not be validated as an uploaded file input`,
      );
    }
  });

  it("validates translator handoff fields without requiring uploaded files", async function () {
    const tempDir = await mkTempDir("zs-deep-reading-schema");
    const sourceBundlePath = joinPath(tempDir, "source_bundle.zip");
    await writeBytes(sourceBundlePath, createStoreZipBytes([]));
    const skillDir = joinPath(
      process.cwd(),
      "skills_builtin",
      "literature-deep-reading",
    );
    const runnerJson = JSON.parse(
      await readUtf8(joinPath(skillDir, "assets", "runner.json")),
    );

    const validation = await validateAcpSkillRunRequestAgainstSchemas({
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "literature-deep-reading",
        input: {
          source_bundle_path: sourceBundlePath,
          translator_alignment_path:
            "D:/runtime/acp/skill-runs/previous/alignment.json",
          translator_output_path:
            "D:/runtime/acp/skill-runs/previous/output_zh-CN.md",
          translator_status: "success",
        },
        parameter: {
          target_language: "zh-CN",
        },
      },
      runnerJson,
      skillDir,
      workspaceDir: tempDir,
    });

    assert.isTrue(validation.ok, validation.errors.join("\n"));

    const cancelledValidation = await validateAcpSkillRunRequestAgainstSchemas({
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "literature-deep-reading",
        input: {
          source_bundle_path: sourceBundlePath,
          translator_alignment_path: null,
          translator_output_path: null,
          translator_status: "cancelled",
        },
        parameter: {
          target_language: "en-US",
        },
      },
      runnerJson,
      skillDir,
      workspaceDir: tempDir,
    });

    assert.isTrue(
      cancelledValidation.ok,
      cancelledValidation.errors.join("\n"),
    );
  });

  it("builds a source bundle with rewritten images and sidecar artifacts", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-source");
    const imageDir = joinPath(tempDir, "images");
    const markdownPath = joinPath(tempDir, "paper.md");
    const figurePath = joinPath(imageDir, "figure one.png");
    const spacedFigurePath = joinPath(imageDir, "figure two.png");
    const parenthesizedFigurePath = joinPath(imageDir, "plot(1).png");
    const absoluteFigurePath = joinPath(imageDir, "absolute.png");
    await writeBytes(figurePath, new Uint8Array([137, 80, 78, 71, 13, 10]));
    await writeBytes(spacedFigurePath, new Uint8Array([1, 2, 3]));
    await writeBytes(parenthesizedFigurePath, new Uint8Array([4, 5, 6]));
    await writeBytes(absoluteFigurePath, new Uint8Array([7, 8, 9]));
    await writeUtf8(
      markdownPath,
      [
        "# Paper",
        "",
        "![Figure](images/figure%20one.png)",
        "![Duplicate](images/figure%20one.png)",
        "![Spaced](images/figure two.png)",
        "![Parenthesized](images/plot(1).png)",
        `![Absolute](${absoluteFigurePath.replaceAll("\\", "/")})`,
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
      targetParentID: number;
      steps: Array<{
        id: string;
        skill_id: string;
        fetch_type?: string;
        input?: { source_bundle_path?: string; source_path?: string };
        parameter?: { target_language?: string };
        handoff?: { input?: Record<string, string> };
        apply_result?: { workflow_id?: string; on_failure?: string };
      }>;
      parameter: { target_language: string };
      final_step_id: string;
    }>;

    assert.lengthOf(requests, 1);
    const request = requests[0];
    assert.equal(request.kind, "skillrunner.sequence.v1");
    assert.equal(request.targetParentID, parent.id);
    assert.deepEqual(request.parameter, { target_language: "zh-CN" });
    assert.equal(request.final_step_id, "deep_reading");
    assert.lengthOf(request.steps, 2);
    assert.equal(request.steps[0].id, "translate");
    assert.equal(request.steps[0].skill_id, "literature-translator");
    assert.equal(request.steps[0].fetch_type, "bundle");
    assert.deepEqual(request.steps[0].apply_result, {
      workflow_id: "literature-translator",
      on_failure: "continue",
    });
    assert.equal(request.steps[0].input?.source_path, markdownPath);
    assert.equal(request.steps[1].id, "deep_reading");
    assert.equal(request.steps[1].skill_id, "literature-deep-reading");
    assert.equal(request.steps[1].fetch_type, "bundle");
    assert.deepEqual(request.steps[1].apply_result, {
      workflow_id: "literature-deep-reading",
      on_failure: "continue",
    });
    assert.equal(
      request.steps[1].handoff?.input?.translator_alignment_path,
      "alignment_path",
    );
    assert.match(
      request.steps[1].input?.source_bundle_path || "",
      /source_bundle\.zip$/,
    );

    const bundle = new ZipBundleReader(
      request.steps[1].input?.source_bundle_path || "",
    );
    const extracted = await bundle.getExtractedDir();
    const sourceMarkdown = await bundle.readText("source.md");
    assert.include(sourceMarkdown, "images/001-figure one.png");
    assert.equal(
      sourceMarkdown.split("images/001-figure one.png").length - 1,
      2,
      "duplicate references should reuse the same bundled image",
    );
    assert.include(sourceMarkdown, "images/002-figure two.png");
    assert.include(sourceMarkdown, "images/003-plot(1).png");
    assert.include(sourceMarkdown, "images/004-absolute.png");
    assert.notInclude(sourceMarkdown, "images/figure%20one.png");
    assert.notInclude(sourceMarkdown, "images/figure two.png");
    assert.notInclude(sourceMarkdown, absoluteFigurePath.replaceAll("\\", "/"));
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
    assert.deepEqual(manifest.paper.creators, [
      { firstName: "Jane", lastName: "Doe", name: "", creatorType: "author" },
    ]);
    assert.notProperty(manifest.parameters, "translation_mode");
    assert.equal(manifest.sidecar_artifacts.references.status, "available");
    assert.lengthOf(manifest.images, 4);
    assert.equal(manifest.images[0].original_src, "images/figure%20one.png");
    assert.equal(manifest.images[0].bundle_path, "images/001-figure one.png");
    assert.equal(manifest.images[0].bytes, 6);
    assert.deepEqual(
      manifest.images.map((entry: { bundle_path?: string }) => entry.bundle_path),
      [
        "images/001-figure one.png",
        "images/002-figure two.png",
        "images/003-plot(1).png",
        "images/004-absolute.png",
      ],
    );
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
    })) as Array<{
      steps: Array<{ id: string; input?: { source_bundle_path?: string } }>;
    }>;

    const deepReadingStep = requests[0].steps.find(
      (step) => step.id === "deep_reading",
    );
    const bundle = new ZipBundleReader(
      deepReadingStep?.input?.source_bundle_path || "",
    );
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

  it("uses existing translator alignment as a shortcut while keeping source markdown selection", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-translator-shortcut");
    const parent = await createParent("Translator Shortcut Paper");
    const pdfPath = joinPath(tempDir, "paper.pdf");
    const markdownPath = joinPath(tempDir, "paper.md");
    const translatedPath = joinPath(tempDir, "paper_zh-CN.md");
    const alignmentPath = joinPath(tempDir, "paper_zh-CN.json");
    await writeBytes(pdfPath, new Uint8Array([37, 80, 68, 70]));
    await writeUtf8(markdownPath, "# Paper\n\nBody.");
    await writeUtf8(translatedPath, "# 论文\n\n正文。");
    await writeUtf8(
      alignmentPath,
      JSON.stringify({
        format: "v1",
        doc_id: "D1",
        source_language: "en",
        target_language: "zh-CN",
        blocks: [
          {
            b: "b_001",
            type: "heading",
            heading: "Paper",
            source_markdown: "# Paper",
            translated_markdown: "# 论文",
            pairs: [
              {
                i: 1,
                src: "# Paper",
                tgt: "# 论文",
                status: "passed",
                repair_count: 0,
              },
            ],
          },
        ],
      }),
    );

    await handlers.attachment.createFromPath({
      parent,
      path: pdfPath,
      title: "paper.pdf",
      mimeType: "application/pdf",
    });
    await handlers.attachment.createFromPath({
      parent,
      path: markdownPath,
      title: "paper.md",
      mimeType: "text/markdown",
    });
    await handlers.attachment.createFromPath({
      parent,
      path: translatedPath,
      title: "paper_zh-CN.md",
      mimeType: "text/markdown",
    });

    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([parent]),
    })) as Array<{
      sourceAttachmentPaths?: string[];
      steps: Array<{
        id: string;
        skill_id: string;
        fetch_type?: string;
        input?: { source_bundle_path?: string };
        apply_result?: { workflow_id?: string; on_failure?: string };
      }>;
      context?: { translator_alignment_status?: string };
    }>;

    assert.lengthOf(requests, 1);
    assert.deepEqual(requests[0].sourceAttachmentPaths, [markdownPath]);
    assert.equal(requests[0].context?.translator_alignment_status, "available");
    assert.lengthOf(requests[0].steps, 1);
    assert.equal(requests[0].steps[0].id, "deep_reading");
    assert.equal(requests[0].steps[0].skill_id, "literature-deep-reading");
    assert.equal(requests[0].steps[0].fetch_type, "bundle");
    assert.deepEqual(requests[0].steps[0].apply_result, {
      workflow_id: "literature-deep-reading",
      on_failure: "continue",
    });

    const bundle = new ZipBundleReader(
      requests[0].steps[0].input?.source_bundle_path || "",
    );
    const alignment = JSON.parse(await bundle.readText("translator/alignment.json"));
    assert.equal(alignment.target_language, "zh-CN");
    const manifest = JSON.parse(await bundle.readText("source-manifest.json"));
    assert.equal(manifest.translator_alignment.status, "available");
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
    })) as Array<{
      steps: Array<{ id: string; input?: { source_bundle_path?: string } }>;
    }>;

    assert.lengthOf(requests, 1);
    const deepReadingStep = requests[0].steps.find(
      (step) => step.id === "deep_reading",
    );
    const bundle = new ZipBundleReader(
      deepReadingStep?.input?.source_bundle_path || "",
    );
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

  it("filters out inputs when sibling HTML target already exists", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-conflict");
    const keepPath = joinPath(tempDir, "keep.md");
    const skipPath = joinPath(tempDir, "skip.md");
    await writeUtf8(keepPath, "# Keep\n");
    await writeUtf8(skipPath, "# Skip\n");
    await writeUtf8(joinPath(tempDir, "skip.html"), "<!doctype html>");

    const keepParent = await createParent("Deep Reading Keep");
    const skipParent = await createParent("Deep Reading Skip");
    await handlers.attachment.createFromPath({
      parent: keepParent,
      path: keepPath,
      title: "keep.md",
      mimeType: "text/markdown",
    });
    await handlers.attachment.createFromPath({
      parent: skipParent,
      path: skipPath,
      title: "skip.md",
      mimeType: "text/markdown",
    });

    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([keepParent, skipParent]),
    })) as Array<{ sourceAttachmentPaths?: string[] }> & {
      __stats?: { totalUnits?: number; skippedUnits?: number };
    };

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].sourceAttachmentPaths?.[0], keepPath);
    assert.equal(requests.__stats?.totalUnits, 2);
    assert.equal(requests.__stats?.skippedUnits, 1);
  });

  it("does not filter when only a non-target sidecar directory exists", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-sidecar-only");
    const markdownPath = joinPath(tempDir, "paper.md");
    await writeUtf8(markdownPath, "# Paper\n");
    await ensureDir(joinPath(tempDir, "paper-assets"));

    const parent = await createParent("Deep Reading Sidecar Only");
    await handlers.attachment.createFromPath({
      parent,
      path: markdownPath,
      title: "paper.md",
      mimeType: "text/markdown",
    });

    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([parent]),
    })) as Array<{ sourceAttachmentPaths?: string[] }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].sourceAttachmentPaths?.[0], markdownPath);
  });

  it("attaches the final HTML result next to the source attachment", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-apply");
    const sourcePath = joinPath(tempDir, "paper.md");
    await writeUtf8(sourcePath, "# Source Paper\n");
    const parent = await createParent("Attach Deep Reading Paper");
    await handlers.attachment.createFromPath({
      parent,
      path: sourcePath,
      title: "paper.md",
      mimeType: "text/markdown",
    });
    const request = {
      targetParentID: parent.id,
      sourceAttachmentPaths: [sourcePath],
      input: {
        source_bundle_path: "inputs/source_bundle_path/source_bundle.zip",
      },
      upload_files: [
        { key: "source_bundle_path", path: "D:/tmp/source_bundle.zip" },
      ],
      context: {
        source_manifest: {
          source: {
            path: sourcePath,
          },
        },
      },
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

    const expectedHtmlPath = joinPath(tempDir, "paper.html");
    assert.isTrue(applied.ok);
    assert.isAbove(applied.attachmentId, 0);
    assert.isNotEmpty(applied.attachmentKey);
    assert.equal(applied.htmlPath, expectedHtmlPath);
    assert.equal(await readUtf8(applied.htmlPath), html);

    const attached = Zotero.Items.get(applied.attachmentId)!;
    assert.equal(attached.parentID, parent.id);
    assert.equal(attached.getField("title"), "paper.html");
    assert.equal(await countAttachmentsByPath(parent, expectedHtmlPath), 1);
  });

  it("does not create duplicate linked HTML attachment for the same target path", async function () {
    const workflow = await getWorkflow();
    const tempDir = await mkTempDir("zs-deep-reading-dedupe");
    const sourcePath = joinPath(tempDir, "dedupe.pdf");
    await writeBytes(sourcePath, new Uint8Array([37, 80, 68, 70]));
    const parent = await createParent("Deep Reading Dedupe");
    await handlers.attachment.createFromPath({
      parent,
      path: sourcePath,
      title: "dedupe.pdf",
      mimeType: "application/pdf",
    });
    const request = {
      targetParentID: parent.id,
      sourceAttachmentPaths: [sourcePath],
      context: {
        source_manifest: {
          source: {
            path: sourcePath,
          },
        },
      },
    };
    const html = "<!doctype html><html><body>Dedupe</body></html>";

    await executeApplyResult({
      workflow,
      parent,
      request,
      bundleReader: createDeepReadingResultBundleReader(html) as any,
      runtime: { hostApi: createWorkflowHostApi() },
    });
    await executeApplyResult({
      workflow,
      parent,
      request,
      bundleReader: createDeepReadingResultBundleReader(html) as any,
      runtime: { hostApi: createWorkflowHostApi() },
    });

    assert.equal(
      await countAttachmentsByPath(parent, joinPath(tempDir, "dedupe.html")),
      1,
    );
  });
});

async function countAttachmentsByPath(parent: Zotero.Item, targetPath: string) {
  let count = 0;
  for (const attachmentId of parent.getAttachments()) {
    const attachment = Zotero.Items.get(attachmentId);
    const path = String((await attachment?.getFilePathAsync?.()) || "");
    if (compareNormalizedPath(path, targetPath)) {
      count += 1;
    }
  }
  return count;
}

function compareNormalizedPath(a: string, b: string) {
  return normalizePathForCompare(a) === normalizePathForCompare(b);
}

function normalizePathForCompare(value: string) {
  return String(value || "").replace(/[\\/]+/g, "/").toLowerCase();
}
