import { assert } from "chai";

import {
  HostBridgeCursorError,
  chunkHostBridgeText,
  paginateHostBridgeRows,
} from "../../src/modules/hostBridgePagination";

describe("Host Bridge output boundaries", function () {
  const rows = Array.from({ length: 7 }, (_, index) => ({
    id: `row-${index + 1}`,
    value: index + 1,
  }));

  it("traverses criteria-bound keyset pages without duplicates or omissions", function () {
    const first = paginateHostBridgeRows({
      scope: "run list",
      criteria: { workflowId: "workflow-a" },
      rows,
      key: (row) => row.id,
      limit: 3,
    });
    const second = paginateHostBridgeRows({
      scope: "run list",
      criteria: { workflowId: "workflow-a" },
      rows,
      key: (row) => row.id,
      limit: 3,
      cursor: first.nextCursor,
    });
    const third = paginateHostBridgeRows({
      scope: "run list",
      criteria: { workflowId: "workflow-a" },
      rows,
      key: (row) => row.id,
      limit: 3,
      cursor: second.nextCursor,
    });

    assert.deepEqual(
      [...first.page, ...second.page, ...third.page].map((row) => row.id),
      rows.map((row) => row.id),
    );
    assert.deepInclude(first, {
      returned: 3,
      total: 7,
      limit: 3,
      hasMore: true,
    });
    assert.deepInclude(third, {
      returned: 1,
      total: 7,
      limit: 3,
      hasMore: false,
      nextCursor: "",
    });
  });

  it("rejects malformed, cross-scope, changed-criteria, and expired cursors", function () {
    const first = paginateHostBridgeRows({
      scope: "run list",
      criteria: { workflowId: "workflow-a" },
      rows,
      key: (row) => row.id,
      limit: 2,
      now: 1_000,
      cursorTtlMs: 100,
    });
    const assertCursorReason = (
      invoke: () => unknown,
      reason: HostBridgeCursorError["reason"],
    ) => {
      assert.throws(invoke, HostBridgeCursorError);
      try {
        invoke();
      } catch (error) {
        assert.equal(
          (error as HostBridgeCursorError).code,
          "invalid_host_bridge_cursor",
        );
        assert.equal((error as HostBridgeCursorError).reason, reason);
      }
    };
    assertCursorReason(
      () =>
        paginateHostBridgeRows({
          scope: "run list",
          criteria: { workflowId: "workflow-a" },
          rows,
          key: (row) => row.id,
          cursor: "not-a-cursor",
        }),
      "malformed",
    );
    assertCursorReason(
      () =>
        paginateHostBridgeRows({
          scope: "run recent",
          criteria: { workflowId: "workflow-a" },
          rows,
          key: (row) => row.id,
          cursor: first.nextCursor,
          now: 1_050,
        }),
      "scope_mismatch",
    );
    assertCursorReason(
      () =>
        paginateHostBridgeRows({
          scope: "run list",
          criteria: { workflowId: "workflow-b" },
          rows,
          key: (row) => row.id,
          cursor: first.nextCursor,
          now: 1_050,
        }),
      "criteria_mismatch",
    );
    assertCursorReason(
      () =>
        paginateHostBridgeRows({
          scope: "run list",
          criteria: { workflowId: "workflow-a" },
          rows,
          key: (row) => row.id,
          cursor: first.nextCursor,
          now: 1_101,
          cursorTtlMs: 100,
        }),
      "expired",
    );
  });

  it("uses 25/100 default and maximum limits", function () {
    const manyRows = Array.from({ length: 150 }, (_, index) => ({
      id: String(index),
    }));
    const normal = paginateHostBridgeRows({
      scope: "test",
      criteria: {},
      rows: manyRows,
      key: (row) => row.id,
    });
    const clamped = paginateHostBridgeRows({
      scope: "test",
      criteria: {},
      rows: manyRows,
      key: (row) => row.id,
      limit: 1000,
    });
    assert.equal(normal.returned, 25);
    assert.equal(normal.limit, 25);
    assert.equal(clamped.returned, 100);
    assert.equal(clamped.limit, 100);
  });

  it("reconstructs long text and returns stable empty terminal chunks", function () {
    const text = "0123456789".repeat(2_000);
    const chunks: string[] = [];
    let offset = 0;
    do {
      const chunk = chunkHostBridgeText(text, { offset, maxChars: 8_000 });
      chunks.push(chunk.text);
      offset = chunk.nextOffset;
      if (!chunk.hasMore) break;
      // eslint-disable-next-line no-constant-condition
    } while (true);
    assert.equal(chunks.join(""), text);
    assert.deepEqual(chunkHostBridgeText(text, { offset: text.length + 1 }), {
      text: "",
      offset: text.length,
      nextOffset: text.length,
      totalChars: text.length,
      hasMore: false,
      truncated: false,
      maxChars: 8_000,
    });
  });
});
