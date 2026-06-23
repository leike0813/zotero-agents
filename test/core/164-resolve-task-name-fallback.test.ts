import { assert } from "chai";
import { resolveTaskNameFromSelection } from "../../src/workflows/runtime";

type ResolveArgs = Parameters<typeof resolveTaskNameFromSelection>[0];

function emptySelection(): ResolveArgs["selectionContext"] {
  return {};
}

describe("resolveTaskNameFromSelection fallback", function () {
  it("falls back to 'Workflow: <label>' when nothing else is available", function () {
    const result = resolveTaskNameFromSelection({
      selectionContext: emptySelection(),
      targetParentID: null,
      sourceAttachmentPaths: [],
      workflowLabel: "Literature Digest",
    });
    assert.strictEqual(result, "Workflow: Literature Digest");
  });

  it("falls back to capitalized 'Task' when even workflowLabel is absent", function () {
    const result = resolveTaskNameFromSelection({
      selectionContext: emptySelection(),
      targetParentID: null,
      sourceAttachmentPaths: [],
    });
    assert.strictEqual(result, "Task");
  });

  it("still prefers source attachment path over workflowLabel", function () {
    const result = resolveTaskNameFromSelection({
      selectionContext: emptySelection(),
      targetParentID: null,
      sourceAttachmentPaths: ["/path/to/paper.md"],
      workflowLabel: "Literature Digest",
    });
    assert.strictEqual(result, "paper.md");
  });
});
