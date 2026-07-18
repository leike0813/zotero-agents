import { assert } from "chai";
import { joinNativePath } from "../../src/platform/path";
import {
  appendRuntimeTextFile,
  readRuntimeTextFile,
  readRuntimeTextRanges,
  removeRuntimePath,
} from "../../src/modules/runtimePersistence";
import {
  getRuntimeFileRangeReaderDiagnosticsForTests,
  resetRuntimeFileRangeReaderForTests,
} from "../../src/modules/runtimeFileRangeReader";
import {
  getAcpTranscriptIndexDiagnosticsForTests,
  readAcpSkillRunTranscriptPage,
  rebuildAcpSkillRunTranscriptIndex,
  resetAcpTranscriptIndexDiagnosticsForTests,
  resetAcpTranscriptWritesForTests,
} from "../../src/modules/acpSkillRunTranscriptStore";

function hasRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: { runtime?: string };
      getTempDirectory?: unknown;
    };
  };
  return (
    !!runtime.Zotero &&
    runtime.Zotero.__parity?.runtime !== "node-mock" &&
    typeof runtime.Zotero.getTempDirectory === "function"
  );
}

function getTempPath() {
  return String((Zotero as any).getTempDirectory?.().path || "").trim();
}

describe("ACP runtime file I/O in Zotero", function () {
  before(function () {
    if (!hasRealZoteroRuntime()) {
      this.skip();
    }
  });

  beforeEach(function () {
    resetRuntimeFileRangeReaderForTests();
    resetAcpTranscriptWritesForTests();
    resetAcpTranscriptIndexDiagnosticsForTests();
  });

  afterEach(function () {
    resetRuntimeFileRangeReaderForTests();
    resetAcpTranscriptWritesForTests();
    resetAcpTranscriptIndexDiagnosticsForTests();
  });

  it("uses packaged worker ranges and bounded transcript recovery", async function () {
    this.timeout(120000);
    const root = joinNativePath(
      getTempPath(),
      `zs-runtime-file-io-${Date.now()}`,
    );
    const appendPath = joinNativePath(root, "append.txt");
    const runtimeDir = joinNativePath(root, "run");
    const transcriptPath = joinNativePath(runtimeDir, "transcript.jsonl");
    try {
      const first = appendRuntimeTextFile(appendPath, "甲😀\n");
      const second = appendRuntimeTextFile(appendPath, "beta_%\n");
      await Promise.all([first, second]);
      assert.equal(await readRuntimeTextFile(appendPath), "甲😀\nbeta_%\n");

      const prefixBytes = new TextEncoder().encode("甲😀\n").length;
      const [tail, beyond] = await readRuntimeTextRanges(appendPath, [
        { offset: prefixBytes, length: 7 },
        { offset: 10_000, length: 4 },
      ]);
      assert.equal(tail, "beta_%\n");
      assert.equal(beyond, "");

      const eventCount = 600;
      const lines = Array.from({ length: eventCount }, (_, index) =>
        JSON.stringify({
          schema: "zotero-skills.acp.skill-run.transcript.v1",
          seq: index + 1,
          op: "upsert_item",
          itemId: `zotero-${index}`,
          item: {
            id: `zotero-${index}`,
            kind: "message",
            role: "assistant",
            text: `真实宿主-${index}-😀-${"x".repeat(700)}`,
            createdAt: new Date(index).toISOString(),
          },
          createdAt: new Date(index).toISOString(),
        }),
      );
      await appendRuntimeTextFile(
        transcriptPath,
        `${lines.slice(0, 300).join("\n")}\n{bad json}\n${lines
          .slice(300)
          .join("\n")}`,
      );
      const rebuilt = await rebuildAcpSkillRunTranscriptIndex({ runtimeDir });
      const page = await readAcpSkillRunTranscriptPage({
        runtimeDir,
        cursor: 0,
        limit: 200,
      });
      const rangeDiagnostics = getRuntimeFileRangeReaderDiagnosticsForTests();
      const indexDiagnostics = getAcpTranscriptIndexDiagnosticsForTests();

      assert.equal(rebuilt?.itemCount, eventCount);
      assert.equal(page.total, eventCount);
      assert.lengthOf(page.items, 200);
      assert.equal(page.items[0]?.id, "zotero-0");
      assert.equal(page.items.at(-1)?.id, "zotero-199");
      assert.isAtLeast(rangeDiagnostics.workersCreated, 1);
      assert.isAtLeast(rangeDiagnostics.physicalBatches, 2);
      assert.isBelow(
        rangeDiagnostics.physicalBatches,
        rangeDiagnostics.rangesRead,
      );
      assert.equal(indexDiagnostics.appliedEvents, eventCount);
      assert.isAbove(indexDiagnostics.scanReadCalls, 1);
      assert.equal(
        rebuilt?.sourceByteLength,
        (await (globalThis as any).IOUtils.stat(transcriptPath)).size,
      );
    } finally {
      await removeRuntimePath(root);
    }
  });
});
