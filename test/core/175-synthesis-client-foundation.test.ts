import { assert } from "chai";
import fs from "fs";
import path from "path";
import {
  SynthesisClientError,
  type SynthesisWorkflowTopicOptionsResult,
} from "../../packages/synthesis-contracts/src/index";
import { createInProcessSynthesisClient } from "../../src/modules/synthesisClient/inProcessClient";
import {
  toSynthesisUiSnapshotInput,
  toSynthesisWorkbenchPaperDigestReadRequest,
  toSynthesisWorkbenchReadState,
} from "../../src/modules/synthesisClient/workbenchUiAdapter";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Synthesis client foundation", function () {
  it("keeps the contracts package environment-neutral and independently checked", function () {
    const packageRoot = path.join(ROOT, "packages/synthesis-contracts");
    const source = fs
      .readdirSync(path.join(packageRoot, "src"), { recursive: true })
      .filter((entry) => String(entry).endsWith(".ts"))
      .map((entry) =>
        fs.readFileSync(path.join(packageRoot, "src", String(entry)), "utf8"),
      )
      .join("\n");
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "tsconfig.json"), "utf8"),
    ) as { compilerOptions?: { lib?: string[]; types?: string[] } };
    const rootPackage = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string>; workspaces?: string[] };

    assert.deepEqual(tsconfig.compilerOptions?.lib, ["ES2022"]);
    assert.deepEqual(tsconfig.compilerOptions?.types, []);
    assert.include(rootPackage.workspaces, "packages/*");
    assert.include(rootPackage.scripts?.build, "check:synthesis-contracts");
    assert.notMatch(
      source,
      /(?:from\s+|import\s*\()["'](?:node:|zotero-|\.\.\/\.\.\/src|\.\.\/\.\.\/\.\.\/src)/,
    );
    assert.notMatch(source, /\b(?:Zotero|Window|Document|HTMLElement)\b/);
  });

  it("routes the Topic option use case through a grouped narrow port", async function () {
    let requestedFilter = "";
    const expected: SynthesisWorkflowTopicOptionsResult = {
      options: [
        {
          value: "topic-alpha",
          label: "Alpha",
          description: "Update",
          meta: { kind: "synthesis.topic", topicId: "topic-alpha" },
        },
      ],
      diagnostics: [],
    };
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions(args) {
        requestedFilter = args?.filter || "";
        return expected;
      },
    });

    assert.deepEqual(
      await client.topics.listWorkflowOptions({ filter: "updatable" }),
      expected,
    );
    assert.equal(requestedFilter, "updatable");
    assert.notProperty(client, "listWorkflowTopicOptions");
  });

  it("normalizes ordinary failures to a stable client error", async function () {
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        throw new Error("legacy exploded");
      },
    });

    try {
      await client.topics.listWorkflowOptions();
      assert.fail("expected the client call to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "internal");
      assert.equal((error as SynthesisClientError).details?.causeName, "Error");
    }
  });

  it("preserves existing stable client errors", async function () {
    const expected = new SynthesisClientError("timeout", "timed out", {
      operation: "topics.listWorkflowOptions",
    });
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        throw expected;
      },
    });

    try {
      await client.topics.listWorkflowOptions();
      assert.fail("expected the client call to reject");
    } catch (error) {
      assert.strictEqual(error, expected);
    }
  });

  it("routes the four Citation Graph commands through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; args: unknown[] }> = [];
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async recomputeCitationGraphLayout(request) {
        calls.push({ operation: "layout", args: [request] });
        return {
          ok: true,
          optional_field: undefined,
          generated_at: new Date("2026-07-15T00:00:00.000Z"),
        };
      },
      async rebuildCitationGraphCacheNow() {
        calls.push({ operation: "rebuild", args: [] });
        return { ok: true, status: "ready" };
      },
      async refreshCitationGraphCacheIncrementalNow() {
        calls.push({ operation: "incremental", args: [] });
        return { ok: true, status: "refreshed" };
      },
      async retryCitationGraphCacheRebuild() {
        calls.push({ operation: "retry", args: [] });
        return { ok: true, status: "retried" };
      },
    });

    assert.deepEqual(
      await client.graph.recomputeCitationGraphLayout({
        algorithm: "radial",
        force: true,
      }),
      {
        ok: true,
        generated_at: "2026-07-15T00:00:00.000Z",
      },
    );
    assert.deepEqual(await client.graph.rebuildCitationGraphCacheNow(), {
      ok: true,
      status: "ready",
    });
    assert.deepEqual(
      await client.graph.refreshCitationGraphCacheIncrementalNow(),
      { ok: true, status: "refreshed" },
    );
    assert.deepEqual(await client.graph.retryCitationGraphCacheRebuild(), {
      ok: true,
      status: "retried",
    });
    assert.deepEqual(calls, [
      {
        operation: "layout",
        args: [{ algorithm: "radial", force: true }],
      },
      { operation: "rebuild", args: [] },
      { operation: "incremental", args: [] },
      { operation: "retry", args: [] },
    ]);
  });

  it("validates Citation Graph layout requests before invoking legacy code", async function () {
    let invocations = 0;
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async recomputeCitationGraphLayout() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests = [
      undefined,
      { algorithm: "grid" },
      { algorithm: "force", force: "yes" },
      { algorithm: "components", onProgress: () => undefined },
    ];

    for (const request of invalidRequests) {
      try {
        await client.graph.recomputeCitationGraphLayout(request as never);
        assert.fail("expected the Graph layout request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed Citation Graph command ports", async function () {
    const preserved = new SynthesisClientError("conflict", "retry conflict");
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async rebuildCitationGraphCacheNow() {
        throw new Error("rebuild exploded");
      },
      async retryCitationGraphCacheRebuild() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () =>
          client.graph.recomputeCitationGraphLayout({ algorithm: "force" }),
        code: "unavailable",
      },
      {
        run: () => client.graph.rebuildCitationGraphCacheNow(),
        code: "internal",
      },
      {
        run: () => client.graph.retryCitationGraphCacheRebuild(),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Graph command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes the four Reference maintenance commands through narrow normalized ports", async function () {
    const calls: string[] = [];
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async refreshReferenceSidecarNow() {
        calls.push("refresh");
        return {
          ok: true,
          status: "ready",
          optional_field: undefined,
          updated_at: new Date("2026-07-15T00:00:00.000Z"),
        };
      },
      async retryReferenceSidecarRefresh() {
        calls.push("retry-refresh");
        return { ok: true, status: "retried" };
      },
      async runAdvancedReferenceMatchingNow() {
        calls.push("advanced");
        return { ok: true, status: "completed" };
      },
      async retryAdvancedReferenceMatching() {
        calls.push("retry-advanced");
        return { ok: true, status: "retried" };
      },
    });

    assert.deepEqual(await client.references.refreshReferenceSidecarNow(), {
      ok: true,
      status: "ready",
      updated_at: "2026-07-15T00:00:00.000Z",
    });
    assert.deepEqual(await client.references.retryReferenceSidecarRefresh(), {
      ok: true,
      status: "retried",
    });
    assert.deepEqual(
      await client.references.runAdvancedReferenceMatchingNow(),
      { ok: true, status: "completed" },
    );
    assert.deepEqual(await client.references.retryAdvancedReferenceMatching(), {
      ok: true,
      status: "retried",
    });
    assert.deepEqual(calls, [
      "refresh",
      "retry-refresh",
      "advanced",
      "retry-advanced",
    ]);
  });

  it("normalizes missing and failed Reference maintenance ports", async function () {
    const preserved = new SynthesisClientError("conflict", "retry conflict");
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async retryReferenceSidecarRefresh() {
        throw new Error("refresh retry exploded");
      },
      async runAdvancedReferenceMatchingNow() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async retryAdvancedReferenceMatching() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () => client.references.refreshReferenceSidecarNow(),
        code: "unavailable",
      },
      {
        run: () => client.references.retryReferenceSidecarRefresh(),
        code: "internal",
      },
      {
        run: () => client.references.runAdvancedReferenceMatchingNow(),
        code: "storage_busy",
      },
      {
        run: () => client.references.retryAdvancedReferenceMatching(),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Reference command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict Reference review and proposal requests through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request: unknown }> = [];
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionReviewAction(request) {
        calls.push({ operation: "canonical", request });
        return {
          ok: true,
          review_item_id: request.reviewItemId,
          optional_field: undefined,
          reviewed_at: new Date("2026-07-15T00:00:00.000Z"),
        };
      },
      async applyReferenceMatchProposalAction(request) {
        calls.push({ operation: "single", request });
        return { ok: true, proposal_id: request.proposalId };
      },
      async applyReferenceMatchProposalActions(request) {
        calls.push({ operation: "batch", request });
        return {
          ok: false,
          failed_count: 1,
          diagnostics: [{ code: "domain_failure" }],
          optional_field: undefined,
        };
      },
    });

    for (const action of ["accept", "reject"] as const) {
      assert.deepEqual(
        await client.references.applyCanonicalRevisionReviewAction({
          reviewItemId: ` review-${action} `,
          action,
          unexpected: "discard",
        } as never),
        {
          ok: true,
          review_item_id: `review-${action}`,
          reviewed_at: "2026-07-15T00:00:00.000Z",
        },
      );
    }
    for (const action of [
      "accept",
      "reverse_accept",
      "reject",
      "reopen",
      "delete",
    ] as const) {
      assert.deepEqual(
        await client.references.applyReferenceMatchProposalAction({
          proposalId: ` proposal-${action} `,
          action,
          target: { kind: "canonical_reference", canonicalReferenceId: "x" },
          unexpected: "discard",
        } as never),
        { ok: true, proposal_id: `proposal-${action}` },
      );
    }
    assert.deepEqual(
      await client.references.applyReferenceMatchProposalActions({
        decisions: [
          ...["accept", "reverse_accept", "reject", "reopen", "delete"].map(
            (action) => ({
              proposalId: ` batch-${action} `,
              action,
              target: {
                kind: "canonical_reference",
                canonicalReferenceId: "discard",
              },
              unexpected: "discard",
            }),
          ),
          {
            proposalId: " batch-zotero ",
            action: "manual_target",
            target: {
              kind: "zotero_item",
              libraryId: 2,
              itemKey: " ABCD1234 ",
              unexpected: "discard",
            },
          },
          {
            proposalId: " batch-canonical ",
            action: "manual_target",
            target: {
              kind: "canonical_reference",
              canonicalReferenceId: " canonical-1 ",
              unexpected: "discard",
            },
          },
        ],
        unexpected: "discard",
      } as never),
      {
        ok: false,
        failed_count: 1,
        diagnostics: [{ code: "domain_failure" }],
      },
    );

    assert.deepEqual(calls, [
      {
        operation: "canonical",
        request: { reviewItemId: "review-accept", action: "accept" },
      },
      {
        operation: "canonical",
        request: { reviewItemId: "review-reject", action: "reject" },
      },
      ...["accept", "reverse_accept", "reject", "reopen", "delete"].map(
        (action) => ({
          operation: "single",
          request: { proposalId: `proposal-${action}`, action },
        }),
      ),
      {
        operation: "batch",
        request: {
          decisions: [
            ...["accept", "reverse_accept", "reject", "reopen", "delete"].map(
              (action) => ({
                proposalId: `batch-${action}`,
                action,
              }),
            ),
            {
              proposalId: "batch-zotero",
              action: "manual_target",
              target: {
                kind: "zotero_item",
                libraryId: 2,
                itemKey: "ABCD1234",
              },
            },
            {
              proposalId: "batch-canonical",
              action: "manual_target",
              target: {
                kind: "canonical_reference",
                canonicalReferenceId: "canonical-1",
              },
            },
          ],
        },
      },
    ]);
  });

  it("rejects invalid Reference review and proposal requests before invoking legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionReviewAction() {
        invocations += 1;
        return {};
      },
      async applyReferenceMatchProposalAction() {
        invocations += 1;
        return {};
      },
      async applyReferenceMatchProposalActions() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () =>
        missingPortClient.references.applyCanonicalRevisionReviewAction({
          reviewItemId: " ",
          action: "accept",
        }),
      () =>
        missingPortClient.references.applyReferenceMatchProposalAction({
          proposalId: " ",
          action: "accept",
        }),
      () =>
        missingPortClient.references.applyReferenceMatchProposalActions({
          decisions: [],
        }),
      () =>
        client.references.applyCanonicalRevisionReviewAction({
          reviewItemId: " ",
          action: "accept",
        }),
      () =>
        client.references.applyCanonicalRevisionReviewAction({
          reviewItemId: "review-1",
          action: "reopen",
        } as never),
      () =>
        client.references.applyReferenceMatchProposalAction({
          proposalId: "",
          action: "accept",
        }),
      () =>
        client.references.applyReferenceMatchProposalAction({
          proposalId: "proposal-1",
          action: "manual_target",
        } as never),
      () =>
        client.references.applyReferenceMatchProposalActions({ decisions: [] }),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [{ proposalId: " ", action: "reject" }],
        }),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [{ proposalId: "proposal-1", action: "invalid" }],
        } as never),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [{ proposalId: "proposal-1", action: "manual_target" }],
        } as never),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [
            {
              proposalId: "proposal-1",
              action: "manual_target",
              target: { kind: "external_item", itemKey: "ABCD1234" },
            },
          ],
        } as never),
      ...[0, -1, 1.5].map(
        (libraryId) => () =>
          client.references.applyReferenceMatchProposalActions({
            decisions: [
              {
                proposalId: "proposal-1",
                action: "manual_target",
                target: {
                  kind: "zotero_item",
                  libraryId,
                  itemKey: "ABCD1234",
                },
              },
            ],
          }),
      ),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [
            {
              proposalId: "proposal-1",
              action: "manual_target",
              target: { kind: "zotero_item", libraryId: 1, itemKey: " " },
            },
          ],
        }),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [
            {
              proposalId: "proposal-1",
              action: "manual_target",
              target: {
                kind: "canonical_reference",
                canonicalReferenceId: " ",
              },
            },
          ],
        }),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the Reference review request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed Reference review ports", async function () {
    const preserved = new SynthesisClientError("conflict", "review conflict");
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyReferenceMatchProposalAction() {
        throw new Error("proposal action exploded");
      },
      async applyReferenceMatchProposalActions() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
    });
    const preservingClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionReviewAction() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () =>
          client.references.applyCanonicalRevisionReviewAction({
            reviewItemId: "review-1",
            action: "accept",
          }),
        code: "unavailable",
      },
      {
        run: () =>
          client.references.applyReferenceMatchProposalAction({
            proposalId: "proposal-1",
            action: "accept",
          }),
        code: "internal",
      },
      {
        run: () =>
          client.references.applyReferenceMatchProposalActions({
            decisions: [{ proposalId: "proposal-1", action: "reject" }],
          }),
        code: "storage_busy",
      },
      {
        run: () =>
          preservingClient.references.applyCanonicalRevisionReviewAction({
            reviewItemId: "review-1",
            action: "reject",
          }),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Reference review command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict canonical Reference mutations through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request: unknown }> = [];
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async mergeEffectiveCanonicalReference(request) {
        calls.push({ operation: "merge", request });
        return {
          ok: false,
          status: "invalid_target",
          optional_field: undefined,
          checked_at: new Date("2026-07-15T00:00:00.000Z"),
        };
      },
      async applyCanonicalRevisionMergeRequests(request) {
        calls.push({ operation: "batch", request });
        return {
          ok: false,
          failed_count: 1,
          diagnostics: [{ code: "domain_failure" }],
        };
      },
      async updateCanonicalReferenceMetadata(request) {
        calls.push({ operation: "metadata", request });
        return { ok: false, status: "bound_to_zotero" };
      },
      async archiveCanonicalReference(request) {
        calls.push({ operation: "archive", request });
        return { ok: false, status: "blocked" };
      },
    });

    assert.deepEqual(
      await client.references.mergeEffectiveCanonicalReference({
        sourceEffectiveCanonicalId: " same-id ",
        targetEffectiveCanonicalId: " same-id ",
        confirmRetargetGroup: true,
        unexpected: "discard",
      } as never),
      {
        ok: false,
        status: "invalid_target",
        checked_at: "2026-07-15T00:00:00.000Z",
      },
    );
    assert.deepEqual(
      await client.references.mergeEffectiveCanonicalReference({
        sourceEffectiveCanonicalId: " source-2 ",
        targetEffectiveCanonicalId: " target-2 ",
      }),
      {
        ok: false,
        status: "invalid_target",
        checked_at: "2026-07-15T00:00:00.000Z",
      },
    );
    assert.deepEqual(
      await client.references.applyCanonicalRevisionMergeRequests({
        requests: [
          {
            sourceEffectiveCanonicalId: " source-1 ",
            targetEffectiveCanonicalId: " target-1 ",
            unexpected: "discard",
          },
        ],
        unexpected: "discard",
      } as never),
      {
        ok: false,
        failed_count: 1,
        diagnostics: [{ code: "domain_failure" }],
      },
    );
    assert.deepEqual(
      await client.references.updateCanonicalReferenceMetadata({
        canonicalReferenceId: " canonical-1 ",
        patch: {
          title: " Title ",
          normalizedTitle: " normalized title ",
          year: " 2026 ",
          authors: [" Author One ", "Author Two"],
          identifiers: { " doi ": " 10.1000/example ", pmid: " 123 " },
          unknown: "discard",
        },
        unexpected: "discard",
      } as never),
      { ok: false, status: "bound_to_zotero" },
    );
    assert.deepEqual(
      await client.references.updateCanonicalReferenceMetadata({
        canonicalReferenceId: "canonical-empty",
        patch: {},
      }),
      { ok: false, status: "bound_to_zotero" },
    );
    assert.deepEqual(
      await client.references.updateCanonicalReferenceMetadata({
        canonicalReferenceId: "canonical-clear",
        patch: { authors: [], identifiers: {} },
      }),
      { ok: false, status: "bound_to_zotero" },
    );
    assert.deepEqual(
      await client.references.archiveCanonicalReference({
        canonicalReferenceId: " canonical-2 ",
        unexpected: "discard",
      } as never),
      { ok: false, status: "blocked" },
    );

    assert.deepEqual(calls, [
      {
        operation: "merge",
        request: {
          sourceEffectiveCanonicalId: "same-id",
          targetEffectiveCanonicalId: "same-id",
          confirmRetargetGroup: true,
        },
      },
      {
        operation: "merge",
        request: {
          sourceEffectiveCanonicalId: "source-2",
          targetEffectiveCanonicalId: "target-2",
          confirmRetargetGroup: false,
        },
      },
      {
        operation: "batch",
        request: {
          requests: [
            {
              sourceEffectiveCanonicalId: "source-1",
              targetEffectiveCanonicalId: "target-1",
            },
          ],
        },
      },
      {
        operation: "metadata",
        request: {
          canonicalReferenceId: "canonical-1",
          patch: {
            title: "Title",
            normalizedTitle: "normalized title",
            year: "2026",
            authors: ["Author One", "Author Two"],
            identifiers: { doi: "10.1000/example", pmid: "123" },
          },
        },
      },
      {
        operation: "metadata",
        request: { canonicalReferenceId: "canonical-empty", patch: {} },
      },
      {
        operation: "metadata",
        request: {
          canonicalReferenceId: "canonical-clear",
          patch: { authors: [], identifiers: {} },
        },
      },
      {
        operation: "archive",
        request: { canonicalReferenceId: "canonical-2" },
      },
    ]);
  });

  it("rejects invalid canonical Reference mutations before resolving legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async mergeEffectiveCanonicalReference() {
        invocations += 1;
        return {};
      },
      async applyCanonicalRevisionMergeRequests() {
        invocations += 1;
        return {};
      },
      async updateCanonicalReferenceMetadata() {
        invocations += 1;
        return {};
      },
      async archiveCanonicalReference() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () =>
        missingPortClient.references.mergeEffectiveCanonicalReference({
          sourceEffectiveCanonicalId: " ",
          targetEffectiveCanonicalId: "target",
        }),
      () =>
        missingPortClient.references.applyCanonicalRevisionMergeRequests({
          requests: [],
        }),
      () =>
        missingPortClient.references.updateCanonicalReferenceMetadata({
          canonicalReferenceId: " ",
          patch: {},
        }),
      () =>
        missingPortClient.references.archiveCanonicalReference({
          canonicalReferenceId: " ",
        }),
      () =>
        client.references.mergeEffectiveCanonicalReference({
          sourceEffectiveCanonicalId: "source",
          targetEffectiveCanonicalId: " ",
        }),
      () =>
        client.references.mergeEffectiveCanonicalReference({
          sourceEffectiveCanonicalId: "source",
          targetEffectiveCanonicalId: "target",
          confirmRetargetGroup: "yes",
        } as never),
      () =>
        client.references.applyCanonicalRevisionMergeRequests({ requests: [] }),
      () =>
        client.references.applyCanonicalRevisionMergeRequests({
          requests: [null],
        } as never),
      () =>
        client.references.applyCanonicalRevisionMergeRequests({
          requests: [
            {
              sourceEffectiveCanonicalId: "source",
              targetEffectiveCanonicalId: " ",
            },
          ],
        }),
      () =>
        client.references.updateCanonicalReferenceMetadata({
          canonicalReferenceId: "canonical-1",
          patch: null,
        } as never),
      ...[
        { title: 2026 },
        { normalizedTitle: false },
        { year: 2026 },
        { authors: "Author" },
        { authors: [" "] },
        { authors: [1] },
        { identifiers: [] },
        { identifiers: { " ": "doi" } },
        { identifiers: { doi: " " } },
        { identifiers: { doi: 1000 } },
      ].map(
        (patch) => () =>
          client.references.updateCanonicalReferenceMetadata({
            canonicalReferenceId: "canonical-1",
            patch,
          } as never),
      ),
      () =>
        client.references.archiveCanonicalReference({
          canonicalReferenceId: "",
        }),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the canonical Reference request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed canonical Reference mutation ports", async function () {
    const preserved = new SynthesisClientError("conflict", "merge conflict");
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionMergeRequests() {
        throw new Error("batch merge exploded");
      },
      async updateCanonicalReferenceMetadata() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async archiveCanonicalReference() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () =>
          client.references.mergeEffectiveCanonicalReference({
            sourceEffectiveCanonicalId: "source",
            targetEffectiveCanonicalId: "target",
          }),
        code: "unavailable",
      },
      {
        run: () =>
          client.references.applyCanonicalRevisionMergeRequests({
            requests: [
              {
                sourceEffectiveCanonicalId: "source",
                targetEffectiveCanonicalId: "target",
              },
            ],
          }),
        code: "internal",
      },
      {
        run: () =>
          client.references.updateCanonicalReferenceMetadata({
            canonicalReferenceId: "canonical-1",
            patch: {},
          }),
        code: "storage_busy",
      },
      {
        run: () =>
          client.references.archiveCanonicalReference({
            canonicalReferenceId: "canonical-1",
          }),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the canonical Reference command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes the five region-scoped Workbench reads through narrow ports", async function () {
    const calls: Array<{ operation: string; args: unknown[] }> = [];
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchChromeInput(state) {
        calls.push({ operation: "chrome", args: [state] });
        return { libraryId: 1, storage: { rootState: "ready" } };
      },
      async getSynthesisWorkbenchSurfaceInput(surface, state) {
        calls.push({ operation: "surface", args: [surface, state] });
        return { libraryId: 1, registry: { rows: [] } };
      },
      async getSynthesisBackgroundJobRows() {
        calls.push({ operation: "progress", args: [] });
        return [
          {
            job_id: "operation:refresh",
            status: "running",
            optional_field: undefined,
          },
        ];
      },
      async readTopicDetail(request) {
        calls.push({ operation: "topic-detail", args: [request] });
        return {
          ok: true,
          status: "ready",
          topicId: request.topicId,
          title: "Topic Alpha",
          source_papers: [],
        };
      },
      async resolveTopicPaperDigest(request) {
        calls.push({ operation: "paper-digest", args: [request] });
        return {
          ok: true,
          status: "available",
          paper_ref: String(request.paper_ref || ""),
          digest_markdown: "# Digest",
          recorded_hash: "old",
          current_hash: "new",
          source_changed: true,
          diagnostics: [],
          optional_field: undefined,
        };
      },
    });
    const state = { selectedTab: "registry" };

    assert.deepEqual(await client.workbench.readChrome({ state }), {
      libraryId: 1,
      storage: { rootState: "ready" },
    });
    assert.deepEqual(
      await client.workbench.readSurface({ surface: "index", state }),
      { libraryId: 1, registry: { rows: [] } },
    );
    assert.deepEqual(await client.workbench.readProgress(), {
      maintenance: {
        backgroundJobs: [
          {
            job_id: "operation:refresh",
            status: "running",
          },
        ],
      },
    });
    assert.deepEqual(
      await client.workbench.readTopicDetail({ topicId: "topic-alpha" }),
      {
        ok: true,
        status: "ready",
        topicId: "topic-alpha",
        title: "Topic Alpha",
        source_papers: [],
      },
    );
    assert.deepEqual(
      await client.workbench.readPaperDigest({
        topicId: "topic-alpha",
        paperRef: "1:ABCD1234",
        digestRef: { note_key: "NOTE1234" },
        includeRepresentativeImage: true,
      }),
      {
        ok: true,
        status: "available",
        paper_ref: "1:ABCD1234",
        digest_markdown: "# Digest",
        recorded_hash: "old",
        current_hash: "new",
        source_changed: true,
        diagnostics: [],
      },
    );
    assert.deepEqual(calls, [
      { operation: "chrome", args: [state] },
      { operation: "surface", args: ["index", state] },
      { operation: "progress", args: [] },
      {
        operation: "topic-detail",
        args: [{ topicId: "topic-alpha" }],
      },
      {
        operation: "paper-digest",
        args: [
          {
            topicId: "topic-alpha",
            paper_ref: "1:ABCD1234",
            digest_ref: { note_key: "NOTE1234" },
            include_representative_image: true,
          },
        ],
      },
    ]);
    assert.notProperty(client.workbench, "getSynthesisSnapshot");
  });

  it("rejects non-JSON Workbench state before invoking the legacy port", async function () {
    let invoked = false;
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchChromeInput() {
        invoked = true;
        return {};
      },
    });

    try {
      await client.workbench.readChrome({
        state: { callback: (() => undefined) as never },
      });
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "invalid_request");
      assert.equal(invoked, false);
    }
  });

  it("normalizes Workbench legacy failures without retrying", async function () {
    let attempts = 0;
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisBackgroundJobRows() {
        attempts += 1;
        throw new Error("progress exploded");
      },
    });

    try {
      await client.workbench.readProgress();
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "internal");
      assert.equal(attempts, 1);
    }
  });

  it("shares Workbench UI state, projection, and digest request conversion", function () {
    const state = toSynthesisWorkbenchReadState({
      selectedTab: "artifacts",
      filters: { query: "topic" },
    } as never);
    assert.deepEqual(state, {
      selectedTab: "artifacts",
      filters: { query: "topic" },
    });

    const projection = toSynthesisUiSnapshotInput({
      libraryId: 1,
      registry: { rows: [] },
    });
    assert.deepEqual(projection, {
      libraryId: 1,
      registry: { rows: [] },
    });

    assert.deepEqual(
      toSynthesisWorkbenchPaperDigestReadRequest({
        topicId: " topic-alpha ",
        paper_ref: " 1:ABCD1234 ",
        digestRef: { note_key: "NOTE1234" },
        include_representative_image: true,
      }),
      {
        topicId: "topic-alpha",
        paperRef: "1:ABCD1234",
        digestRef: { note_key: "NOTE1234" },
        includeRepresentativeImage: true,
      },
    );
  });

  it("preserves SQLite busy as a stable Workbench client error", async function () {
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchSurfaceInput() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
    });

    try {
      await client.workbench.readSurface({ surface: "graph", state: {} });
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "storage_busy");
    }
  });

  it("isolates legacy default-service resolution in client composition", function () {
    const composition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    const defaultClient = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/defaultClient.ts"),
      "utf8",
    );
    const consumer = fs.readFileSync(
      path.join(ROOT, "src/modules/workflowParameterOptions.ts"),
      "utf8",
    );

    assert.include(composition, "getDefaultSynthesisService");
    assert.notMatch(composition, /\btype\s+SynthesisService\b/);
    assert.notInclude(defaultClient, "getDefaultSynthesisService");
    assert.notInclude(defaultClient, "../synthesis/service");
    assert.notInclude(consumer, "getDefaultSynthesisService");
    assert.notInclude(consumer, "./synthesis/service");
    assert.include(consumer, "getDefaultSynthesisClient");
  });
});
