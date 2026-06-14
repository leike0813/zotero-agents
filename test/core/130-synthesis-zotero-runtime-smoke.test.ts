import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";
import { readRuntimeTextFile } from "../../src/modules/runtimePersistence";
import { buildSynthesisStoragePaths } from "../../src/modules/synthesis/foundation";
import {
  createSynthesisService,
  resetDefaultSynthesisServiceForTests,
} from "../../src/modules/synthesis/service";

function validBundle(
  base_hashes: Record<string, string> = {
    artifact: "",
    metadata: "",
    index: "",
  },
) {
  return {
    kind: "topic_synthesis",
    mode: "create",
    base_hashes,
    topic_definition: {
      id: "topic-runtime-smoke",
      title: "Runtime Smoke Topic",
    },
    topic_resolver: {
      tag: { and: ["topic:runtime-smoke"] },
      combine: "union",
    },
    resolved_paper_set: {
      papers: [{ paper_ref: "1:RUNTIME01", match_reasons: ["smoke"] }],
    },
    resolver_diagnostics: {
      final_count: 1,
    },
    artifact_metadata: {
      depends_on: {
        papers: ["1:RUNTIME01"],
        artifacts: [],
      },
    },
    markdown: "# Runtime Smoke Topic\n\n## Timeline\n\n2026: Smoke test.",
    timeline: "2026: Smoke test.",
  };
}

function hasZoteroItemRuntime() {
  return (
    typeof Zotero !== "undefined" &&
    typeof Zotero.Item === "function" &&
    typeof Zotero.Items?.getByLibraryAndKey === "function"
  );
}

async function makeRoot() {
  if (hasZoteroItemRuntime() && typeof Zotero.getTempDirectory === "function") {
    const file = Zotero.getTempDirectory();
    file.append(`zs-synthesis-runtime-smoke-${Date.now()}`);
    await Zotero.File.createDirectoryIfMissingAsync(file);
    return file.path;
  }
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-synthesis-runtime-smoke-"));
}

describe("Synthesis Zotero runtime smoke", function () {
  beforeEach(function () {
    if (!hasZoteroItemRuntime()) {
      this.skip();
    }
    resetDefaultSynthesisServiceForTests();
    resetWorkflowHostApiForTests();
  });

  it("applies topic synthesis through Zotero adapter without note mirror writes", async function () {
    const root = await makeRoot();
    const libraryId = Zotero.Libraries.userLibraryID;
    const service = createSynthesisService({
      root,
      libraryId,
      now: () => "2026-05-11T00:00:00.000Z",
      shardSize: 4096,
    });

    const result = await service.applyTopicSynthesisResult(validBundle());
    assert.equal(result.status, "persisted");

    const paths = buildSynthesisStoragePaths(root, "topic-runtime-smoke");
    assert.include(
      await readRuntimeTextFile(paths.currentExportMarkdown),
      "# Runtime Smoke Topic",
    );

    const hostApi = createWorkflowHostApi();
    assert.isFunction(hostApi.synthesis?.applyTopicSynthesisResult);

    const snapshot = await service.getSynthesisSnapshot();
    assert.equal(snapshot.sync.status, "ready");
    assert.include(
      await readRuntimeTextFile(paths.currentExportMarkdown),
      "# Runtime Smoke Topic",
    );
  });

  it("does not identify or mutate Zotero note shards through invalid note title fields", async function () {
    const source = await fs.readFile(
      "src/modules/synthesis/service.ts",
      "utf8",
    );

    assert.notInclude(source, 'note?.getField?.("title")');
    assert.notInclude(source, 'note.setField?.("title"');
    assert.notInclude(source, "noteTitle(entry) === args.title");
    assert.include(source, "createZoteroSynthesisMirrorAdapter");
  });
});
