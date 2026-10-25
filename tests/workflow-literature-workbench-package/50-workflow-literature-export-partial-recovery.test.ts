import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";
import { normalizeWorkflowApplyDiagnostics } from "../../src/modules/workflowExecution/applyDiagnostics";
import { emitWorkflowApplyDiagnosticsToast } from "../../src/modules/workflowExecution/feedbackSeam";
import { createLocalizedMessageFormatter } from "../../src/modules/workflowExecution/messageFormatter";
import {
  buildLiteratureBundleSourceOnlyExport,
  buildLiteratureProduct,
  resolveLiteratureBundleParents,
  validateLiteratureProductManifest,
} from "../../workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs";
import { applyResult as applyLiteratureBundleResult } from "../../workflows_builtin/literature-workbench-package/export-literature-bundle/hooks/applyResult.mjs";
import { isFatalPackagingError } from "../../workflows_builtin/literature-workbench-package/lib/researchBundle.mjs";

type Ref = { libraryId: number; key: string };

function parent(ref: Ref, title: string) {
  return { ref, title };
}

function materializedPaper(ref: Ref, title: string, attachments: any[] = []) {
  return {
    source: { ref, revision: `revision:${ref.key}` },
    item: {
      schema: "zotero-agents.portable-regular-item.v1",
      itemType: "journalArticle",
      fields: { title },
      creators: [],
      tags: [],
    },
    collectionRefs: [],
    relatedRefs: [],
    notes: [],
    attachments,
    annotations: [],
    issues: [],
  };
}

function materializedPdf(parentRef: Ref, resourceId: string) {
  const ref = { libraryId: parentRef.libraryId, key: "PDF00001" };
  return {
    sourceRef: ref,
    metadata: {
      ref,
      parentRef,
      revision: `revision:${ref.key}`,
      title: "paper.pdf",
      filename: "paper.pdf",
      contentType: "application/pdf",
      charset: null,
      url: null,
      linkMode: "linked_file",
      role: "ordinary",
      file: { state: "available", path: "managed-by-resource" },
    },
    file: {
      state: "available",
      resourceRef: { kind: "workflow_resource", id: resourceId },
      filename: "paper.pdf",
      contentType: "application/pdf",
      sizeBytes: 1,
      sha256: "fixture",
    },
  };
}

function materializedNote(parentRef: Ref, key: string, html: string) {
  return {
    source: {
      ref: { libraryId: parentRef.libraryId, key },
      revision: `revision:${key}`,
    },
    content: { format: "html", value: html, embeddedImages: [] },
    tags: [],
    payloads: [],
  };
}

function materializedMarkdown(parentRef: Ref, resourceId: string) {
  const attachment = materializedPdf(parentRef, resourceId);
  attachment.metadata.filename = "broken.md";
  attachment.metadata.title = "broken.md";
  attachment.metadata.contentType = "text/markdown";
  attachment.sourceRef = { libraryId: parentRef.libraryId, key: "MD000001" };
  attachment.metadata.ref = attachment.sourceRef;
  return attachment;
}

function captureArchive() {
  let written: any;
  const withIntegrity = async (entries: any[]) => ({
    files: Object.fromEntries(
      entries.map((entry, index) => [
        entry.name,
        {
          sizeBytes:
            entry.content?.kind === "text"
              ? new TextEncoder().encode(entry.content.text).length
              : 1,
          sha256: String(index + 1).padStart(64, "a"),
        },
      ]),
    ),
    totalEntries: entries.length,
    totalBytes: entries.length,
  });
  return {
    archive: {
      measureEntries: async (input: any) => withIntegrity(input.entries),
      writeZipAtomic: async (input: any) => {
        written = input;
        return {
          ...(await withIntegrity(input.entries)),
          targetPath: input.targetPath,
        };
      },
    },
    written: () => written,
  };
}

function selectionContext(refs: Ref[]) {
  return {
    items: refs.map((ref) => ({
      kind: "parent",
      ref,
      itemType: "journalArticle",
    })),
  };
}

function exportHost(args: {
  parents: Array<{ ref: Ref; title: string }>;
  materialize: (request: any) => Promise<any>;
  targetPath: string;
  recoveryPath: string;
  archive: any;
}) {
  const parents = new Map(args.parents.map((item) => [item.ref.key, item]));
  return {
    interactionMode: "interactive",
    library: {
      async getItemDetail(ref: Ref) {
        return { kind: "regular", item: parents.get(ref.key) };
      },
    },
    file: {
      pickSaveFile: async () => args.targetPath,
      exists: async () => false,
    },
    researchBundles: { materializePapers: args.materialize },
    resources: {
      async get() {
        return {
          path: args.recoveryPath,
          displayName: "paper.pdf",
          contentType: "application/pdf",
        };
      },
    },
    bibliography: {
      async render() {
        return {
          content: "@article{healthy, title={Healthy}}\n",
          requestedFormats: ["better-bibtex"],
          usedFormat: {
            ref: { id: "better-bibtex" },
            label: "Better BibTeX",
            fileExtension: "bib",
            contentType: "application/x-bibtex",
            availability: "available",
            optionsSchema: null,
          },
          fallbackUsed: false,
          issues: [],
        };
      },
    },
    environment: { getInfo: () => ({ zoteroVersion: "7.0.32" }) },
    addon: { getConfig: () => ({ addonVersion: "test" }) },
    logging: { appendRuntimeLog() {} },
    archive: args.archive,
  };
}

describe("literature export partial recovery", function () {
  it("keeps local packaging failures non-fatal and native global failures fatal", function () {
    assert.isFalse(isFatalPackagingError({ code: "markdown_unreadable" }));
    assert.isTrue(
      isFatalPackagingError({ code: "NS_ERROR_FILE_NO_DEVICE_SPACE" }),
    );
    assert.isTrue(isFatalPackagingError({ code: "NS_ERROR_OUT_OF_MEMORY" }));
  });

  it("preserves unreadable selection refs for materialization and propagates global failures", async function () {
    const refs = [
      { libraryId: 1, key: "AAAA1111" },
      { libraryId: 1, key: "BBBB2222" },
    ];
    const parents = await resolveLiteratureBundleParents({
      host: {
        library: {
          async getItemDetail(ref: Ref) {
            if (ref.key === "AAAA1111") {
              throw Object.assign(new Error("summary unreadable"), {
                code: "paper_unreadable",
              });
            }
            return { kind: "regular", item: parent(ref, "Healthy") };
          },
        },
      },
      mode: "selection",
      selectionContext: selectionContext(refs),
    });
    assert.deepEqual(
      parents.map((entry: any) => entry.ref.key),
      ["AAAA1111", "BBBB2222"],
    );

    let request: any;
    await buildLiteratureBundleSourceOnlyExport({
      host: exportHost({
        parents,
        async materialize(input: any) {
          request = input;
          return {
            papers: [materializedPaper(refs[1], "Healthy")],
            completeness: "incomplete",
            issues: [
              {
                code: "export_unit_failed",
                stage: "paper",
                paperRef: refs[0],
                errorCode: "paper_unreadable",
                outcome: "skipped",
              },
            ],
          };
        },
        targetPath: "unused.zip",
        recoveryPath: "unused.bin",
        archive: captureArchive().archive,
      }),
      parents,
      progress: { stage() {} },
      runtime: {},
    });
    assert.deepEqual(request.paperRefs, refs);

    let failure: any;
    try {
      await resolveLiteratureBundleParents({
        host: {
          library: {
            async getItemDetail() {
              throw Object.assign(new Error("canceled"), {
                code: "resource_limited",
              });
            },
          },
        },
        mode: "selection",
        selectionContext: selectionContext([refs[0]]),
      });
    } catch (error) {
      failure = error;
    }
    assert.equal(failure?.code, "resource_limited");
  });

  it("keeps healthy paper identity and packages recovery plus the report", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-export-recovery-"),
    );
    const recoveryPath = path.join(root, "raw.html");
    await fs.writeFile(recoveryPath, "<p>raw recovery</p>", "utf8");
    const refs = [
      { libraryId: 1, key: "AAAA1111" },
      { libraryId: 1, key: "BBBB2222" },
      { libraryId: 1, key: "CCCC3333" },
    ];
    let request: any;
    const captured = captureArchive();
    try {
      const result: any = await applyLiteratureBundleResult({
        runResult: {
          resultJson: {
            parameter: {},
            selectionContext: selectionContext(refs),
          },
        },
        runtime: {
          locale: "en-US",
          hostApiVersion: 12,
          TextEncoder,
          hostApi: exportHost({
            parents: [
              parent(refs[0], "Failed paper"),
              parent(refs[1], "Healthy paper"),
              parent(refs[2], "Later healthy paper"),
            ],
            async materialize(input: any) {
              request = input;
              return {
                papers: [
                  materializedPaper(refs[1], "Healthy paper"),
                  materializedPaper(refs[2], "Later healthy paper"),
                ],
                completeness: "incomplete",
                issues: [
                  {
                    code: "export_unit_failed",
                    stage: "paper",
                    paperRef: refs[0],
                    errorCode: "paper_unreadable",
                    outcome: "skipped",
                  },
                ],
                recovery: [
                  {
                    paperRef: refs[0],
                    filename: "raw.html",
                    content: "<p>raw recovery</p>",
                  },
                  {
                    paperRef: refs[0],
                    filename: "resource.html",
                    resourceRef: { kind: "workflow_resource", id: "raw" },
                  },
                ],
              };
            },
            targetPath: path.join(root, "bundle.zip"),
            recoveryPath,
            archive: captured.archive,
          }),
        },
      });

      assert.deepInclude(request, { failurePolicy: "record_partial" });
      assert.equal(result.status, "partial");
      assert.deepInclude(result.applyDiagnostics, {
        partialCount: 1,
        reportPath: "export-report.md",
      });
      const entries = captured.written().entries;
      const names = entries.map((entry: any) => entry.name);
      assert.include(names, "export-report.md");
      assert.lengthOf(
        names.filter((name: string) => name.startsWith("recovery/")),
        2,
      );
      const manifestEntry = entries.find(
        (entry: any) => entry.name === "manifest.json",
      );
      const manifest = JSON.parse(manifestEntry.content.text);
      assert.deepEqual(
        manifest.papers.map((paper: any) => [paper.paper_ref, paper.title]),
        [
          ["1:BBBB2222", "Healthy paper"],
          ["1:CCCC3333", "Later healthy paper"],
        ],
      );
      assert.equal(manifest.status, "partial");
      assert.property(manifest.files, "export-report.md");
      assert.lengthOf(manifest.recovery, 2);
      assert.notInclude(
        manifest.papers.flatMap((paper: any) => paper.attachments),
        manifest.recovery[0].path,
      );
      validateLiteratureProductManifest(manifest, names);
      const report = entries.find(
        (entry: any) => entry.name === "export-report.md",
      ).content.text;
      assert.include(report, "1:AAAA1111");
      assert.include(report, "paper_unreadable");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("matches source-only papers by identity and excludes notes", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-source-recovery-"),
    );
    const recoveryPath = path.join(root, "raw.html");
    await fs.writeFile(recoveryPath, "raw", "utf8");
    const refs = [
      { libraryId: 1, key: "AAAA1111" },
      { libraryId: 1, key: "BBBB2222" },
      { libraryId: 1, key: "CCCC3333" },
    ];
    let request: any;
    const captured = captureArchive();
    try {
      const built = await buildLiteratureBundleSourceOnlyExport({
        host: exportHost({
          parents: [
            parent(refs[0], "Failed paper"),
            parent(refs[1], "Healthy paper"),
            parent(refs[2], "Later healthy paper"),
          ],
          async materialize(input: any) {
            request = input;
            return {
              papers: [
                materializedPaper(refs[1], "Healthy paper", [
                  materializedPdf(refs[1], "pdf"),
                ]),
              ],
              completeness: "incomplete",
              issues: [
                {
                  code: "export_unit_failed",
                  stage: "paper",
                  paperRef: refs[0],
                  errorCode: "paper_unreadable",
                  outcome: "skipped",
                },
              ],
              recovery: [
                {
                  paperRef: refs[0],
                  filename: "raw.html",
                  content: "raw",
                },
              ],
            };
          },
          targetPath: path.join(root, "source.zip"),
          recoveryPath,
          archive: {
            ...captured.archive,
            writeZipAtomic: captured.archive.writeZipAtomic,
          },
        }),
        parents: refs.map((ref, index) =>
          parent(
            ref,
            ["Failed paper", "Healthy paper", "Later healthy paper"][index],
          ),
        ),
        progress: { stage() {} },
        runtime: {},
      });

      assert.deepInclude(request, {
        failurePolicy: "record_partial",
        includeNotes: false,
      });
      assert.equal(built.status, "partial");
      assert.deepEqual(
        built.entries.map((entry: any) => entry.name),
        [
          "items/Healthy paper.pdf",
          "recovery/0001-raw.html",
          "export-report.md",
        ],
      );
      assert.deepEqual(
        built.manifest.items.map((item: any) => item.path),
        [null, "items/Healthy paper.pdf", null],
      );
      assert.property(built.manifest.files, "export-report.md");
      assert.lengthOf(built.manifest.recovery, 1);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("isolates a broken Markdown attachment and preserves notes and later files", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-attachment-recovery-"),
    );
    const pdfPath = path.join(root, "paper.pdf");
    await fs.writeFile(pdfPath, "%PDF-1.4\n", "utf8");
    const ref = { libraryId: 1, key: "AAAA1111" };
    const paper: any = materializedPaper(ref, "Recovered paper", [
      materializedMarkdown(ref, "broken"),
      materializedPdf(ref, "pdf"),
    ]);
    paper.notes = [materializedNote(ref, "NOTE0001", "<p>Preserved note</p>")];
    const captured = captureArchive();
    const host = exportHost({
      parents: [parent(ref, "Recovered paper")],
      async materialize() {
        return {
          papers: [paper],
          completeness: "complete",
          issues: [],
          recovery: [],
        };
      },
      targetPath: path.join(root, "bundle.zip"),
      recoveryPath: pdfPath,
      archive: captured.archive,
    });
    host.resources.get = async (resourceRef: any) => {
      if (resourceRef.id === "broken") {
        throw Object.assign(new Error("markdown unavailable"), {
          code: "markdown_unreadable",
        });
      }
      return {
        path: pdfPath,
        displayName: "paper.pdf",
        contentType: "application/pdf",
      };
    };
    try {
      const result: any = await applyLiteratureBundleResult({
        runResult: {
          resultJson: {
            parameter: {},
            selectionContext: selectionContext([ref]),
          },
        },
        runtime: { hostApiVersion: 12, TextEncoder, hostApi: host },
      });

      assert.equal(result.status, "partial");
      const entries = captured.written().entries;
      const manifest = JSON.parse(
        entries.find((entry: any) => entry.name === "manifest.json").content
          .text,
      );
      assert.lengthOf(manifest.papers[0].notes, 1);
      assert.equal(
        manifest.papers[0].primary_source?.kind,
        "pdf",
        JSON.stringify(manifest.papers[0].attachments),
      );
      assert.deepEqual(
        manifest.papers[0].attachments.map((entry: any) => entry.kind),
        ["skipped", "file"],
      );
      assert.lengthOf(
        manifest.warnings.filter(
          (warning: any) => warning.code === "export_unit_failed",
        ),
        1,
      );
      assert.equal(manifest.issues[0].errorCode, "markdown_unreadable");
      assert.include(
        entries.find((entry: any) => entry.name === "export-report.md").content
          .text,
        "markdown_unreadable",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("reports a missing Markdown image as partial while preserving the Markdown", async function () {
    const ref = { libraryId: 1, key: "AAAA1111" };
    const paper = materializedPaper(ref, "Markdown", [
      materializedMarkdown(ref, "markdown"),
    ]);
    const captured = captureArchive();
    const host: any = exportHost({
      parents: [parent(ref, "Markdown")],
      materialize: async () => ({
        papers: [paper],
        completeness: "complete",
        issues: [],
      }),
      targetPath: "unused.zip",
      recoveryPath: "source.md",
      archive: captured.archive,
    });
    host.file.exists = async () => false;
    host.file.readText = async () => "Body\n![figure](missing.png)";
    const built = await buildLiteratureProduct({
      host,
      parents: [parent(ref, "Markdown")],
      runtime: {},
    });
    assert.equal(built.status, "partial");
    assert.isTrue(
      built.issues.some(
        (issue: any) => issue.stage === "image" && issue.outcome === "skipped",
      ),
    );
    assert.isTrue(
      built.entries.some((entry: any) => entry.content?.text?.includes("Body")),
    );
  });

  it("does not duplicate a materializer missing-file issue while packaging", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-missing-recovery-"),
    );
    const ref = { libraryId: 1, key: "AAAA1111" };
    const attachmentRef = { libraryId: 1, key: "PDF00001" };
    const paper = materializedPaper(ref, "Missing attachment", [
      {
        sourceRef: attachmentRef,
        metadata: {
          ref: attachmentRef,
          parentRef: ref,
          filename: "missing.pdf",
          contentType: "application/pdf",
          file: { state: "missing" },
        },
        file: { state: "missing" },
      },
    ]);
    const captured = captureArchive();
    try {
      const result: any = await applyLiteratureBundleResult({
        runResult: {
          resultJson: {
            parameter: {},
            selectionContext: selectionContext([ref]),
          },
        },
        runtime: {
          hostApiVersion: 12,
          TextEncoder,
          hostApi: exportHost({
            parents: [parent(ref, "Missing attachment")],
            async materialize() {
              return {
                papers: [paper],
                completeness: "incomplete",
                issues: [
                  {
                    code: "attachment_file_missing",
                    attachmentRef,
                  },
                ],
                recovery: [],
              };
            },
            targetPath: path.join(root, "bundle.zip"),
            recoveryPath: path.join(root, "unused"),
            archive: captured.archive,
          }),
        },
      });

      assert.equal(result.status, "partial");
      const manifest = JSON.parse(
        captured
          .written()
          .entries.find((entry: any) => entry.name === "manifest.json").content
          .text,
      );
      assert.lengthOf(manifest.issues, 1);
      assert.lengthOf(
        manifest.warnings.filter(
          (warning: any) => warning.code === "attachment_file_missing",
        ),
        1,
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("does not replace the destination when no paper has basic metadata", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-empty-recovery-"));
    const captured = captureArchive();
    let writeCalls = 0;
    try {
      let failure: any;
      try {
        await applyLiteratureBundleResult({
          runResult: {
            resultJson: {
              parameter: {},
              selectionContext: selectionContext([
                { libraryId: 1, key: "AAAA1111" },
              ]),
            },
          },
          runtime: {
            hostApiVersion: 12,
            TextEncoder,
            hostApi: exportHost({
              parents: [
                parent({ libraryId: 1, key: "AAAA1111" }, "Unreadable"),
              ],
              async materialize() {
                return {
                  papers: [],
                  completeness: "incomplete",
                  issues: [
                    {
                      code: "export_unit_failed",
                      stage: "paper",
                      paperRef: { libraryId: 1, key: "AAAA1111" },
                      errorCode: "paper_unreadable",
                      outcome: "skipped",
                    },
                  ],
                  recovery: [],
                };
              },
              targetPath: path.join(root, "bundle.zip"),
              recoveryPath: path.join(root, "raw.html"),
              archive: {
                ...captured.archive,
                writeZipAtomic: async (input: any) => {
                  writeCalls += 1;
                  return captured.archive.writeZipAtomic(input);
                },
              },
            }),
          },
        });
      } catch (error) {
        failure = error;
      }
      assert.equal(failure?.code, "export_no_basic_metadata");
      assert.equal(writeCalls, 0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("keeps partial diagnostics and shows the report through feedback", function () {
    const diagnostics = normalizeWorkflowApplyDiagnostics({
      applyDiagnostics: {
        warningCount: 2,
        warningCodeCounts: { export_unit_failed: 2 },
        outcome: "partial",
        partialCount: 2,
        reportPath: "export-report.md",
      },
    });
    assert.deepEqual(diagnostics, {
      warningCount: 2,
      warningCodeCounts: { export_unit_failed: 2 },
      outcome: "partial",
      partialCount: 2,
      reportPath: "export-report.md",
    });
    const toasts: any[] = [];
    emitWorkflowApplyDiagnosticsToast(
      {
        taskLabel: "Export literature",
        diagnostics: diagnostics!,
        messageFormatter: createLocalizedMessageFormatter(),
      },
      { showToast: (payload) => toasts.push(payload) },
    );
    assert.lengthOf(toasts, 1);
    assert.include(toasts[0].text, "2");
    assert.include(toasts[0].text, "export-report.md");
  });
});
