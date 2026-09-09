import { assert } from "chai";
import {
  createWorkflowHostApi,
  WORKFLOW_HOST_API_VERSION,
} from "../../src/workflows/hostApi";
import { evaluateTagCompliance } from "../../workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs";
import { applyResult } from "../../workflows_builtin/literature-workbench-package/tag-auditor/hooks/applyResult.mjs";

type AuditEntry = {
  itemKey: string;
  compliant: boolean;
  nonCompliantTags: string[];
};

type AuditReplacement = {
  libraryId: number;
  entries: AuditEntry[];
};

function regularItem(libraryId: number, key: string, tags: string[]) {
  return {
    ref: { libraryId, key },
    kind: "regular",
    tags,
    revision: `revision-${key}`,
    tagDigest: `tags-${key}`,
  };
}

function completedTraversal(libraryId: number) {
  return {
    outcome: "completed",
    libraryId,
    scope: "top-level-regular",
    visitedItems: 0,
    visitedBatches: 0,
    completionEvidence: {
      evidenceId: "evidence-1",
      criteriaDigest: "criteria-1",
      coverageDigest: "coverage-1",
      completedAt: "2026-08-30T00:00:00.000Z",
    },
  };
}

function createRuntime(args: {
  traverseItems: (
    request: unknown,
    control: unknown,
    onBatch: (batch: {
      batchIndex: number;
      items: ReturnType<typeof regularItem>[];
    }) => Promise<void>,
  ) => Promise<unknown>;
  replacements: AuditReplacement[];
}) {
  const base = createWorkflowHostApi();
  return {
    hostApiVersion: WORKFLOW_HOST_API_VERSION,
    hostApi: {
      ...base,
      library: {
        ...base.library,
        async listItems() {
          return { libraryId: 1 };
        },
        traverseItems: args.traverseItems,
      },
      synthesis: {
        ...base.synthesis,
        tags: {
          ...base.synthesis.tags,
          async exportVocabularyForRegulator() {
            return {
              vocabularyHash: "vocabulary-1",
              allowedTags: ["method:review"],
            };
          },
          async withAuditRun(input: any, _control: any, callback: any) {
            const staged: any[] = [];
            const traversal = await callback({
              async append(entries: any[]) {
                staged.push(...entries);
              },
            });
            const evidence = traversal?.completionEvidence;
            if (
              traversal?.outcome !== "completed" ||
              !evidence?.evidenceId ||
              !evidence?.criteriaDigest ||
              !evidence?.coverageDigest ||
              !evidence?.completedAt
            ) {
              return {
                outcome:
                  traversal?.outcome === "resource_limited"
                    ? "resource_limited"
                    : "canceled",
                auditedItems: staged.length,
                ...(traversal?.outcome === "resource_limited"
                  ? { limit: "items" }
                  : {}),
              };
            }
            args.replacements.push({
              libraryId: input.libraryId,
              entries: staged.map((entry) => ({
                itemKey: entry.target.itemKey,
                compliant: entry.evaluation.state === "compliant",
                nonCompliantTags: entry.evaluation.nonCompliantTags || [],
              })),
            });
            return {
              outcome: "published",
              snapshot: {
                auditedItems: staged.length,
                needsRegulation: staged.filter(
                  (entry) => entry.evaluation.state === "needs_regulation",
                ).length,
              },
            };
          },
        },
      },
    },
  };
}

describe("tag compliance evaluation", function () {
  it("reports only active tags outside the controlled vocabulary", function () {
    const result = evaluateTagCompliance({
      tags: ["method:review", " topic:AI ", "topic:AI", ""],
      controlledTags: ["method:review"],
    });

    assert.isFalse(result.compliant);
    assert.deepEqual(result.nonCompliantTags, ["topic:AI"]);
  });

  it("accepts an item whose active tags all belong to the vocabulary", function () {
    const result = evaluateTagCompliance({
      tags: ["method:review", "topic:AI"],
      controlledTags: ["method:review", "topic:AI"],
    });

    assert.isTrue(result.compliant);
    assert.deepEqual(result.nonCompliantTags, []);
  });

  it("audits serial traversal batches only after completed evidence", async function () {
    const replacements: AuditReplacement[] = [];
    const batches: number[] = [];
    const result = await applyResult({
      runtime: createRuntime({
        replacements,
        async traverseItems(request, control, onBatch) {
          assert.deepEqual(request, {
            libraryId: 1,
            scope: "top-level-regular",
          });
          assert.deepEqual(control, {});
          await onBatch({
            batchIndex: 0,
            items: [regularItem(1, "NONCOMPLIANT", ["legacy:tag"])],
          });
          batches.push(0);
          await onBatch({
            batchIndex: 1,
            items: [regularItem(1, "COMPLIANT", ["method:review"])],
          });
          batches.push(1);
          return {
            ...completedTraversal(1),
            visitedItems: 2,
            visitedBatches: 2,
          };
        },
      }),
    });

    assert.deepEqual(batches, [0, 1]);
    assert.deepEqual(replacements, [
      {
        libraryId: 1,
        entries: [
          {
            itemKey: "NONCOMPLIANT",
            compliant: false,
            nonCompliantTags: ["legacy:tag"],
          },
          { itemKey: "COMPLIANT", compliant: true, nonCompliantTags: [] },
        ],
      },
    ]);
    assert.deepInclude(result.libraries[0], {
      libraryId: 1,
      audited: 2,
      needsTagRegulation: 1,
    });
  });

  for (const outcome of ["canceled", "resource_limited"] as const) {
    it(`preserves the existing audit when traversal is ${outcome}`, async function () {
      const replacements: AuditReplacement[] = [];
      const result = await applyResult({
        runtime: createRuntime({
          replacements,
          async traverseItems(_request, _control, onBatch) {
            await onBatch({
              batchIndex: 0,
              items: [regularItem(1, "PARTIAL", ["legacy:tag"])],
            });
            return {
              outcome,
              libraryId: 1,
              visitedItems: 1,
              visitedBatches: 1,
              ...(outcome === "resource_limited"
                ? { reason: "max_items", resumeCursor: "resume-1" }
                : {}),
            };
          },
        }),
      });

      assert.deepEqual(replacements, []);
      assert.deepEqual(result, { libraries: [] });
    });
  }

  it("propagates a traversal callback rejection without replacing audit records", async function () {
    const replacements: AuditReplacement[] = [];
    const callbackFailure = new Error("callback failed");
    let thrown: unknown;
    try {
      await applyResult({
        runtime: createRuntime({
          replacements,
          async traverseItems(_request, _control, onBatch) {
            await onBatch({
              batchIndex: 0,
              items: [regularItem(1, "BROKEN", ["legacy:tag"])],
            });
            throw callbackFailure;
          },
        }),
      });
    } catch (error) {
      thrown = error;
    }

    assert.equal(thrown, callbackFailure);
    assert.deepEqual(replacements, []);
  });

  it("clears the completed empty library audit with canonical completion evidence", async function () {
    const replacements: AuditReplacement[] = [];
    const result = await applyResult({
      runtime: createRuntime({
        replacements,
        async traverseItems(_request, _control, _onBatch) {
          return completedTraversal(1);
        },
      }),
    });

    assert.deepEqual(replacements, [{ libraryId: 1, entries: [] }]);
    assert.deepEqual(result, {
      libraries: [{ libraryId: 1, audited: 0, needsTagRegulation: 0 }],
    });
  });

  it("does not replace records when completed traversal lacks full completion evidence", async function () {
    const replacements: AuditReplacement[] = [];
    const result = await applyResult({
      runtime: createRuntime({
        replacements,
        async traverseItems(_request, _control, _onBatch) {
          return {
            ...completedTraversal(1),
            completionEvidence: { evidenceId: "evidence-1" },
          };
        },
      }),
    });

    assert.deepEqual(replacements, []);
    assert.deepEqual(result, { libraries: [] });
  });
});
