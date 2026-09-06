import { assert } from "chai";
import { resolveTaskNameFromSelection } from "../../src/workflows/runtime";

type ResolveArgs = Parameters<typeof resolveTaskNameFromSelection>[0];

function emptySelection(): ResolveArgs["selectionContext"] {
  return { items: [], sampledAt: "2026-09-06T00:00:00Z" };
}

describe("resolveTaskNameFromSelection fallback", function () {
  it("falls back to 'Workflow: <label>' when nothing else is available", function () {
    const result = resolveTaskNameFromSelection({
      selectionContext: emptySelection(),
      workflowLabel: "Literature Digest",
    });
    assert.strictEqual(result, "Workflow: Literature Digest");
  });

  it("falls back to capitalized 'Task' when even workflowLabel is absent", function () {
    const result = resolveTaskNameFromSelection({
      selectionContext: emptySelection(),
    });
    assert.strictEqual(result, "Task");
  });

  it("prefers the canonical attachment filename over workflowLabel", function () {
    const result = resolveTaskNameFromSelection({
      selectionContext: {
        ...emptySelection(),
        items: [
          {
            kind: "attachment",
            itemType: "attachment",
            ref: { libraryId: 1, key: "SOURCE01" },
            filename: "paper.md",
          },
        ],
      },
      workflowLabel: "Literature Digest",
    });
    assert.strictEqual(result, "paper.md");
  });
});
