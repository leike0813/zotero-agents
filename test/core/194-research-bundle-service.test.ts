import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createDirectResearchBundleApplication,
  createCanonicalResearchBundleMaterializer,
  createResearchBundleImportEffects,
  createResearchBundleImporter,
  createResearchBundleMaterializer,
  materializeResearchBundlePapers,
  publishDirectResearchBundle,
  type DirectResearchBundlePaper,
  type ResearchBundleEntry,
  type ResearchBundleCommittedPaper,
} from "../../src/modules/researchBundleService";
import { createWorkflowRunResourceStore } from "../../src/modules/hostBridgeWorkflowResources";
import {
  MutationAuthorityExecutionError,
  resetMutationAuthorityRuntimeForTests,
} from "../../src/modules/zoteroHostMutationAuthority";
import type { ImportPaperGraphDto } from "../../src/workflows/types";
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
    resetMutationAuthorityRuntimeForTests();
    if (originalIOUtils) {
      Object.defineProperty(globalThis, "IOUtils", originalIOUtils);
      return;
    }
    delete (globalThis as typeof globalThis & { IOUtils?: unknown }).IOUtils;
  });

  function createImportPaper(
    graphId: string,
    relatedGraphIds: string[] = [],
  ): Extract<ImportPaperGraphDto, { target: { kind: "create" } }> {
    return {
      graphId,
      target: { kind: "create" },
      item: {
        schema: "zotero-agents.portable-regular-item.v1",
        itemType: "journalArticle",
        fields: { title: graphId },
        creators: [],
        tags: [],
      },
      collectionRefs: [],
      notes: [],
      attachments: [],
      relatedGraphIds,
      relatedExistingRefs: [],
    };
  }

  function committedPaper(graphId: string): ResearchBundleCommittedPaper {
    return {
      graphId,
      itemRef: { libraryId: 1, key: `${graphId}KEY` },
      revision: `revision:${graphId}`,
      noteRefs: [],
      attachmentRefs: [],
    };
  }

  it("rejects implicit import targets before any Host effect", async function () {
    let commits = 0;
    const importPapers = createResearchBundleImporter({
      ownerId: "test-import",
      effects: {
        resolveLibraryId: () => 1,
        validateExistingTarget: async () =>
          assert.fail("unexpected existing target"),
        validateResource: async () => ({
          sizeBytes: 0,
          sha256: "0".repeat(64),
        }),
        async commitGroup() {
          commits += 1;
          return { papers: [], changes: [] };
        },
      },
    });

    await assert.rejects(
      importPapers({
        operationId: "implicit-target",
        papers: [{ graphId: "paper-a", item: {} } as any],
      }),
      (error: any) => error?.code === "invalid_request",
    );
    assert.equal(commits, 0);
  });

  it("rejects over-limit graphs before any Host effect", async function () {
    let commits = 0;
    const importPapers = createResearchBundleImporter({
      ownerId: "over-limit-import",
      effects: {
        resolveLibraryId: () => 1,
        validateExistingTarget: async () =>
          assert.fail("unexpected existing target"),
        validateResource: async () => ({
          sizeBytes: 0,
          sha256: "0".repeat(64),
        }),
        async commitGroup() {
          commits += 1;
          return { papers: [], changes: [] };
        },
      },
    });

    await assert.rejects(
      importPapers({
        operationId: "over-limit-import",
        papers: Array.from({ length: 1_001 }, (_, index) =>
          createImportPaper(`paper-${index}`),
        ),
      }),
      (error: any) => error?.code === "resource_limited",
    );
    assert.equal(commits, 0);
  });

  it("prevalidates collection and existing relation targets before any Host effect", async function () {
    let commits = 0;
    const validatedItems: string[] = [];
    const validatedCollections: string[] = [];
    const importPapers = createResearchBundleImporter({
      ownerId: "target-prevalidation",
      effects: {
        resolveLibraryId: () => 1,
        async validateExistingTarget({ itemRef }) {
          validatedItems.push(itemRef.key);
          return { itemRef, revision: "revision" };
        },
        async validateCollectionTarget({ collectionRef }) {
          validatedCollections.push(collectionRef.key);
          return { collectionRef, revision: "revision" };
        },
        validateResource: async () => ({
          sizeBytes: 0,
          sha256: "0".repeat(64),
        }),
        async commitGroup() {
          commits += 1;
          return { papers: [], changes: [] };
        },
      },
    });
    const paper = createImportPaper("paper-a");
    paper.collectionRefs.push({ libraryId: 1, key: "COLLECTION" });
    paper.relatedExistingRefs.push({ libraryId: 1, key: "RELATED" });

    await importPapers({
      operationId: "target-prevalidation",
      papers: [paper],
    });

    assert.deepEqual(validatedItems, ["RELATED"]);
    assert.deepEqual(validatedCollections, ["COLLECTION"]);
    assert.equal(commits, 1);
  });

  it("commits SCCs as one group and schedules dependencies before dependents", async function () {
    const committedGroups: string[][] = [];
    const importPapers = createResearchBundleImporter({
      ownerId: "test-import",
      effects: {
        resolveLibraryId: () => 1,
        validateExistingTarget: async () =>
          assert.fail("unexpected existing target"),
        validateResource: async () => ({
          sizeBytes: 0,
          sha256: "0".repeat(64),
        }),
        async commitGroup({ papers }) {
          committedGroups.push(papers.map((paper) => paper.graphId));
          return {
            papers: papers.map((paper) => committedPaper(paper.graphId)),
            changes: [],
          };
        },
      },
    });

    const result = await importPapers({
      operationId: "scc-order",
      papers: [
        createImportPaper("paper-c", ["paper-a"]),
        createImportPaper("paper-a", ["paper-b"]),
        createImportPaper("paper-b", ["paper-a"]),
      ],
    });

    assert.deepEqual(committedGroups, [["paper-a", "paper-b"], ["paper-c"]]);
    assert.deepEqual(
      result.papers.map((paper) => [paper.graphId, paper.outcome]),
      [
        ["paper-c", "committed"],
        ["paper-a", "committed"],
        ["paper-b", "committed"],
      ],
    );
    assert.equal(result.receipts.length, 2);
    assert.ok(
      result.receipts.every((receipt) => receipt.operationId === "scc-order"),
    );
  });

  it("preserves independent commits and blocks only failed dependencies", async function () {
    const importPapers = createResearchBundleImporter({
      ownerId: "test-import",
      effects: {
        resolveLibraryId: () => 1,
        validateExistingTarget: async () =>
          assert.fail("unexpected existing target"),
        validateResource: async () => ({
          sizeBytes: 0,
          sha256: "0".repeat(64),
        }),
        async commitGroup({ papers }) {
          if (papers.some((paper) => paper.graphId === "failed")) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "execution_failed",
              "compensation",
              "retry_same_operation",
              {
                phase: "cleanup",
                recovery: "retry_same_operation",
                affectedCount: 1,
                residualCount: 0,
              },
              "group failed and was compensated",
              [{ kind: "item", ref: { libraryId: 1, key: "FAILED" } }],
            );
          }
          return {
            papers: papers.map((paper) => committedPaper(paper.graphId)),
            changes: [],
          };
        },
      },
    });

    const result = await importPapers({
      operationId: "partial-import",
      papers: [
        createImportPaper("failed"),
        createImportPaper("blocked", ["failed"]),
        createImportPaper("independent"),
      ],
    });

    assert.equal(result.outcome, "partial");
    assert.deepEqual(
      result.papers.map((paper) => [paper.graphId, paper.outcome]),
      [
        ["failed", "rolled_back"],
        ["blocked", "not_started"],
        ["independent", "committed"],
      ],
    );
    assert.equal(result.attempts.length, 1);
  });

  it("creates every SCC parent before children and binds relations last", async function () {
    const calls: string[] = [];
    const effects = createResearchBundleImportEffects({
      resolveLibraryId: () => 1,
      async readExistingTarget({ itemRef }) {
        return {
          itemRef,
          revision: `revision:${itemRef.key}`,
          itemType: "journalArticle",
        };
      },
      async resolveResource() {
        return {
          path: "/managed/source.pdf",
          sizeBytes: 3,
          sha256: "0".repeat(64),
        };
      },
      async createItem({ graphId }) {
        calls.push(`item:${graphId}`);
        return { libraryId: 1, key: `${graphId.toUpperCase()}KEY` };
      },
      async addToCollection() {
        assert.fail("unexpected collection");
      },
      async createNote({ graphId, note }) {
        calls.push(`note:${graphId}:${note.noteId}`);
        return { libraryId: 1, key: `${graphId.toUpperCase()}NOTE` };
      },
      async createAttachment() {
        assert.fail("unexpected attachment");
      },
      async addRelated({ sourceGraphId, targetRef }) {
        calls.push(`relation:${sourceGraphId}:${targetRef.key}`);
      },
      async readRevision({ itemRef }) {
        return `revision:${itemRef.key}`;
      },
      async removeItem() {
        assert.fail("unexpected compensation");
      },
    });
    const importPapers = createResearchBundleImporter({
      ownerId: "production-effect-order",
      effects,
    });
    const paperA = createImportPaper("a", ["b"]);
    const paperB = createImportPaper("b", ["a"]);
    paperA.notes.push({
      noteId: "digest",
      content: { format: "html", value: "<p>A</p>" },
      tags: [],
      payloads: [],
    });
    paperB.notes.push({
      noteId: "digest",
      content: { format: "html", value: "<p>B</p>" },
      tags: [],
      payloads: [],
    });

    const result = await importPapers({
      operationId: "effect-order",
      papers: [paperA, paperB],
    });

    assert.equal(result.outcome, "complete");
    assert.deepEqual(calls, [
      "item:a",
      "item:b",
      "note:a:digest",
      "note:b:digest",
      "relation:a:BKEY",
      "relation:b:AKEY",
    ]);
  });

  it("records every created parent, note, and attachment in the group receipt", async function () {
    const effects = createResearchBundleImportEffects({
      resolveLibraryId: () => 1,
      async readExistingTarget({ itemRef }) {
        return { itemRef, revision: "revision", itemType: "journalArticle" };
      },
      async resolveResource() {
        return {
          path: "/managed/source.pdf",
          sizeBytes: 3,
          sha256: "0".repeat(64),
        };
      },
      async createItem() {
        return {
          ref: { libraryId: 1, key: "PARENT" },
          revision: "parent-revision",
        };
      },
      async addToCollection() {},
      async createNote() {
        return {
          ref: { libraryId: 1, key: "NOTE" },
          revision: "note-revision",
        };
      },
      async createAttachment() {
        return {
          ref: { libraryId: 1, key: "ATTACHMENT" },
          revision: "attachment-revision",
        };
      },
      async addRelated() {},
      async readRevision({ itemRef }) {
        return `${itemRef.key.toLowerCase()}-revision`;
      },
      async removeItem() {
        assert.fail("unexpected compensation");
      },
    });
    const importPapers = createResearchBundleImporter({
      ownerId: "complete-receipt",
      effects,
    });
    const paper = createImportPaper("paper-a");
    paper.notes.push({
      noteId: "note-a",
      content: { format: "text", value: "A" },
      tags: [],
      payloads: [],
    });
    paper.attachments.push({
      attachmentId: "attachment-a",
      source: { kind: "stored_url", url: "https://example.invalid/paper" },
    });

    const result = await importPapers({
      operationId: "complete-receipt",
      papers: [paper],
    });

    assert.deepEqual(
      result.receipts[0].changes.map((change) =>
        change.entity.kind === "item" ? change.entity.ref.key : "collection",
      ),
      ["PARENT", "NOTE", "ATTACHMENT"],
    );
  });

  it("compensates a failed consistency group in reverse creation order", async function () {
    const removed: string[] = [];
    const effects = createResearchBundleImportEffects({
      resolveLibraryId: () => 1,
      async readExistingTarget({ itemRef }) {
        return { itemRef, revision: "revision", itemType: "journalArticle" };
      },
      async resolveResource() {
        return {
          path: "/managed/source.pdf",
          sizeBytes: 3,
          sha256: "0".repeat(64),
        };
      },
      async createItem({ graphId }) {
        return { libraryId: 1, key: `${graphId.toUpperCase()}KEY` };
      },
      async addToCollection() {},
      async createNote({ graphId }) {
        if (graphId === "b") throw new Error("note import failed");
        return { libraryId: 1, key: "ANOTE" };
      },
      async createAttachment() {
        assert.fail("unexpected attachment");
      },
      async addRelated() {},
      async readRevision() {
        return "revision";
      },
      async removeItem({ itemRef }) {
        removed.push(itemRef.key);
      },
    });
    const importPapers = createResearchBundleImporter({
      ownerId: "production-effect-compensation",
      effects,
    });
    const paperA = createImportPaper("a", ["b"]);
    const paperB = createImportPaper("b", ["a"]);
    paperA.notes.push({
      noteId: "a-note",
      content: { format: "text", value: "A" },
      tags: [],
      payloads: [],
    });
    paperB.notes.push({
      noteId: "b-note",
      content: { format: "text", value: "B" },
      tags: [],
      payloads: [],
    });

    const result = await importPapers({
      operationId: "effect-compensation",
      papers: [paperA, paperB],
    });

    assert.deepEqual(removed, ["ANOTE", "BKEY", "AKEY"]);
    assert.deepEqual(
      result.papers.map((paper) => paper.outcome),
      ["rolled_back", "rolled_back"],
    );
  });

  it("promotes unknown group state to repair-required evidence", async function () {
    const importPapers = createResearchBundleImporter({
      ownerId: "unknown-import",
      effects: {
        resolveLibraryId: () => 1,
        validateExistingTarget: async () =>
          assert.fail("unexpected existing target"),
        validateResource: async () => ({
          sizeBytes: 0,
          sha256: "0".repeat(64),
        }),
        async commitGroup() {
          throw new MutationAuthorityExecutionError(
            "unknown",
            "execution_failed",
            "verification",
            "reconcile",
            { phase: "verification", recovery: "reconcile" },
            "final graph state is unknown",
            [{ kind: "item", ref: { libraryId: 1, key: "UNKNOWN" } }],
            [{ kind: "item", ref: { libraryId: 1, key: "UNKNOWN" } }],
          );
        },
      },
    });

    const result = await importPapers({
      operationId: "unknown-import",
      papers: [createImportPaper("paper-a")],
    });

    assert.equal(result.outcome, "repair_required");
    assert.equal(result.papers[0].outcome, "repair_required");
    assert.equal(result.attempts[0].status, "unknown");
    assert.deepEqual(result.attempts[0].residualRefs, [
      { kind: "item", ref: { libraryId: 1, key: "UNKNOWN" } },
    ]);
  });

  it("reports repair-required when group compensation leaves residual state", async function () {
    const effects = createResearchBundleImportEffects({
      resolveLibraryId: () => 1,
      async readExistingTarget({ itemRef }) {
        return { itemRef, revision: "revision", itemType: "journalArticle" };
      },
      async resolveResource() {
        return {
          path: "/managed/source.pdf",
          sizeBytes: 3,
          sha256: "0".repeat(64),
        };
      },
      async createItem() {
        return { libraryId: 1, key: "RESIDUAL" };
      },
      async addToCollection() {},
      async createNote() {
        throw new Error("note creation failed");
      },
      async createAttachment() {
        assert.fail("unexpected attachment");
      },
      async addRelated() {},
      async readRevision() {
        return "revision";
      },
      async removeItem() {
        throw new Error("compensation failed");
      },
    });
    const importPapers = createResearchBundleImporter({
      ownerId: "residual-import",
      effects,
    });
    const paper = createImportPaper("paper-a");
    paper.notes.push({
      noteId: "note-a",
      content: { format: "text", value: "A" },
      tags: [],
      payloads: [],
    });

    const result = await importPapers({
      operationId: "residual-import",
      papers: [paper],
    });

    assert.equal(result.outcome, "repair_required");
    assert.equal(result.papers[0].outcome, "repair_required");
    assert.deepEqual(result.attempts[0].residualRefs, [
      { kind: "item", ref: { libraryId: 1, key: "RESIDUAL" } },
    ]);
  });

  it("does not resume an import after the process-local registry is reset", async function () {
    let commits = 0;
    const importPapers = createResearchBundleImporter({
      ownerId: "restart-import",
      effects: {
        resolveLibraryId: () => 1,
        validateExistingTarget: async () =>
          assert.fail("unexpected existing target"),
        validateResource: async () => ({
          sizeBytes: 0,
          sha256: "0".repeat(64),
        }),
        async commitGroup({ papers }) {
          commits += 1;
          return {
            papers: papers.map((paper) => committedPaper(paper.graphId)),
            changes: [],
          };
        },
      },
    });
    const request = {
      operationId: "restart-import",
      papers: [createImportPaper("paper-a")],
    };

    await importPapers(request);
    assert.equal(commits, 1);
    resetMutationAuthorityRuntimeForTests();
    await importPapers(request);
    assert.equal(commits, 2);
  });

  it("does not start a consistency group after cancellation", async function () {
    let commits = 0;
    const controller = new AbortController();
    controller.abort();
    const importPapers = createResearchBundleImporter({
      ownerId: "test-import",
      effects: {
        resolveLibraryId: () => 1,
        validateExistingTarget: async () =>
          assert.fail("unexpected existing target"),
        validateResource: async () => ({
          sizeBytes: 0,
          sha256: "0".repeat(64),
        }),
        async commitGroup() {
          commits += 1;
          return { papers: [], changes: [] };
        },
      },
    });

    const result = await importPapers(
      {
        operationId: "canceled-import",
        papers: [createImportPaper("paper-a"), createImportPaper("paper-b")],
      },
      { signal: controller.signal },
    );

    assert.equal(result.outcome, "canceled");
    assert.ok(result.papers.every((paper) => paper.outcome === "not_started"));
    assert.equal(commits, 0);
  });

  it("freezes attachment bytes into run-scoped resources and preserves input order", async function () {
    const root = await mkdtemp(join(tmpdir(), "zs-materialized-resources-"));
    const sourcePath = join(root, "source.pdf");
    await writeFile(sourcePath, Buffer.from([1, 2, 3]));
    const resources = createWorkflowRunResourceStore({
      runId: "materialization-run",
      rootPath: join(root, "managed"),
    });
    const materialize = createCanonicalResearchBundleMaterializer({
      resources,
      async readPaper(ref) {
        return {
          source: { ref, revision: `revision:${ref.key}` },
          item: {
            schema: "zotero-agents.portable-regular-item.v1",
            itemType: "journalArticle",
            fields: { title: ref.key },
            creators: [],
            tags: [],
          },
          collectionRefs: [],
          relatedRefs: [],
          notes: [],
          attachments: [
            {
              ref: { libraryId: ref.libraryId, key: `${ref.key}FILE` },
              parentRef: ref,
              revision: "attachment-revision",
              title: "Source",
              filename: "source.pdf",
              contentType: "application/pdf",
              charset: null,
              url: null,
              linkMode: "stored_file",
              role: "ordinary",
              file: {
                state: "available",
                path: sourcePath,
                sizeBytes: 3,
                modifiedAt: null,
              },
            },
          ],
          annotations: [],
        };
      },
    });
    try {
      const result = await materialize({
        paperRefs: [
          { libraryId: 1, key: "BBBB2222" },
          { libraryId: 1, key: "AAAA1111" },
          { libraryId: 1, key: "BBBB2222" },
        ],
        missingFilePolicy: "require_complete",
      });
      assert.deepEqual(
        result.papers.map((paper) => paper.source.ref.key),
        ["BBBB2222", "AAAA1111"],
      );
      const file = result.papers[0].attachments[0].file;
      assert.equal(file.state, "available");
      if (file.state !== "available")
        assert.fail("resource was not materialized");
      await writeFile(sourcePath, Buffer.from([9, 9, 9]));
      const staged = await resources.resolveResource(file.resourceRef);
      assert.deepEqual(Array.from(await readFile(staged.path)), [1, 2, 3]);
      assert.equal(Object.prototype.hasOwnProperty.call(file, "path"), false);
    } finally {
      await resources.cleanup();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a mismatched source graph and cleans staged materialization scope", async function () {
    let cleanupCalls = 0;
    let stageCalls = 0;
    const materialize = createCanonicalResearchBundleMaterializer({
      resources: {
        async stageFile() {
          stageCalls += 1;
          assert.fail("invalid source graph must fail before staging");
        },
        async cleanup() {
          cleanupCalls += 1;
        },
      },
      async readPaper() {
        return {
          source: {
            ref: { libraryId: 1, key: "OTHERKEY" },
            revision: "revision:other",
          },
          item: {
            schema: "zotero-agents.portable-regular-item.v1",
            itemType: "journalArticle",
            fields: { title: "Wrong graph" },
            creators: [],
            tags: [],
          },
          collectionRefs: [],
          relatedRefs: [],
          notes: [],
          attachments: [],
          annotations: [],
        };
      },
    });

    await assert.rejects(
      materialize({
        paperRefs: [{ libraryId: 1, key: "EXPECTED" }],
        missingFilePolicy: "require_complete",
      }),
      (error: any) => error?.code === "invalid_ref",
    );
    assert.equal(stageCalls, 0);
    assert.equal(cleanupCalls, 1);
  });

  it("materializes unique resolvable workflow paper refs without aborting on missing papers", async function () {
    const papers = new Map<string, DirectResearchBundlePaper>([
      [
        "1:AAAA1111",
        {
          paperRef: "1:AAAA1111",
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "First paper",
          metadata: { title: "First paper" },
          attachments: [],
        },
      ],
      [
        "2:BBBB2222",
        {
          paperRef: "2:BBBB2222",
          libraryId: 2,
          itemKey: "BBBB2222",
          title: "Second paper",
          metadata: { title: "Second paper" },
          attachments: [],
        },
      ],
    ]);
    const materializePapers = createResearchBundleMaterializer({
      resolvePaper: async (ref) => papers.get(ref.paperRef),
      readArtifacts: async () => ({ artifacts: [] }),
    });

    const result = await materializePapers({
      papers: [
        { paperRef: "1:AAAA1111" },
        { paperRef: "1:AAAA1111" },
        { paperRef: "" },
        { paperRef: "invalid-paper-ref" },
        { paperRef: "1:MISSING1" },
        { paperRef: "2:BBBB2222" },
      ],
    });

    assert.deepEqual(
      result.papers.map((paper) => paper.paper_ref),
      ["1:AAAA1111", "2:BBBB2222"],
    );
    assert.deepEqual(
      result.warnings
        .filter((warning) => warning.code === "paper_missing")
        .map(({ paper_ref, reason }) => ({ paper_ref, reason })),
      [
        {
          paper_ref: "invalid-paper-ref",
          reason: "invalid_paper_ref",
        },
        { paper_ref: "1:MISSING1", reason: undefined },
      ],
    );
  });

  it("owns the standard artifact request and canonical source warning", async function () {
    const paperRef = "1:AAAA1111";
    let artifactRequest: unknown;
    const materializePapers = createResearchBundleMaterializer({
      resolvePaper: async () => ({
        paperRef,
        libraryId: 1,
        itemKey: "AAAA1111",
        title: "Paper without source",
        metadata: {},
        attachments: [],
      }),
      readArtifacts: async (request) => {
        artifactRequest = request;
        return { artifacts: [] };
      },
    });

    const result = await materializePapers({
      papers: [{ paperRef }],
      sourcePaperRefs: [paperRef],
    });

    assert.deepEqual(artifactRequest, {
      paperRefs: [paperRef],
      artifactTypes: [
        "digest",
        "references",
        "citation_analysis",
        "literature_score",
      ],
    });
    assert.ok(
      result.warnings.some(
        (warning) =>
          warning.code === "source_missing" && warning.paper_ref === paperRef,
      ),
    );
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
