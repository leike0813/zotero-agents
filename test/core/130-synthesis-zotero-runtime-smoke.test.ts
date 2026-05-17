import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createWorkflowHostApi, resetWorkflowHostApiForTests } from "../../src/workflows/hostApi";
import { readRuntimeTextFile } from "../../src/modules/runtimePersistence";
import {
  buildSynthesisStoragePaths,
  decodeNoteShard,
} from "../../src/modules/synthesis/foundation";
import {
  createSynthesisService,
  createZoteroSynthesisMirrorAdapter,
  resetDefaultSynthesisServiceForTests,
} from "../../src/modules/synthesis/service";
import { registerZoteroTestObjectForCleanup } from "../zotero/objectCleanupHarness";

function validBundle(base_hashes: Record<string, string> = {
  artifact: "",
  metadata: "",
  index: "",
}) {
  return {
    kind: "topic_synthesis",
    mode: "create",
    base_hashes,
    topic_definition: {
      id: "topic-runtime-smoke",
      title: "Runtime Smoke Topic",
    },
    topic_resolver: {
      mode: "tag_query",
      query: { and: ["topic:runtime-smoke"] },
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

function synthesisAnchorPrefKey(libraryId: number) {
  return `extensions.zotero.zotero-skills.synthesis.anchorKey.${libraryId}`;
}

function childNotes(parent: Zotero.Item) {
  return (parent.getNotes() || [])
    .map((id) => Zotero.Items.get(id))
    .filter((item): item is Zotero.Item => Boolean(item));
}

describe("Synthesis Zotero runtime smoke", function () {
  beforeEach(function () {
    if (!hasZoteroItemRuntime()) {
      this.skip();
    }
    resetDefaultSynthesisServiceForTests();
    resetWorkflowHostApiForTests();
    Zotero.Prefs.clear(synthesisAnchorPrefKey(Zotero.Libraries.userLibraryID), true);
  });

  afterEach(function () {
    if (!hasZoteroItemRuntime()) {
      return;
    }
    Zotero.Prefs.clear(synthesisAnchorPrefKey(Zotero.Libraries.userLibraryID), true);
  });

  it("applies topic synthesis through Zotero adapter and detects deleted mirror shards", async function () {
    const root = await makeRoot();
    const libraryId = Zotero.Libraries.userLibraryID;
    const service = createSynthesisService({
      root,
      libraryId,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createZoteroSynthesisMirrorAdapter(),
      shardSize: 4096,
    });

    const result = await service.applyTopicSynthesisResult(validBundle());
    assert.equal(result.status, "persisted");
    assert.isOk(result.mirror?.anchorKey);

    const paths = buildSynthesisStoragePaths(root, "topic-runtime-smoke");
    assert.include(await readRuntimeTextFile(paths.currentExportMarkdown), "# Runtime Smoke Topic");

    const anchor = Zotero.Items.getByLibraryAndKey(
      libraryId,
      result.mirror!.anchorKey,
    );
    assert.isOk(anchor);
    registerZoteroTestObjectForCleanup(anchor);
    assert.equal(anchor.itemType, "document");

    const notes = childNotes(anchor);
    notes.forEach(registerZoteroTestObjectForCleanup);
    assert.isAtLeast(notes.length, 3);
    const shardNotes = notes.filter((note) => {
      try {
        decodeNoteShard(note.getNote());
        return true;
      } catch {
        return false;
      }
    });
    assert.isAtLeast(shardNotes.length, 3);
    const decoded = decodeNoteShard(shardNotes[0].getNote());
    assert.equal(decoded.envelope.anchor_key, anchor.key);
    assert.isOk(decoded.envelope.asset_id);

    const hostApi = createWorkflowHostApi();
    assert.isFunction(hostApi.synthesis?.applyTopicSynthesisResult);

    await shardNotes[0].eraseTx();
    const snapshot = await service.getSynthesisSnapshot();
    assert.equal(snapshot.sync.status, "mirror_degraded");
    assert.include(await readRuntimeTextFile(paths.currentExportMarkdown), "# Runtime Smoke Topic");
  });

  it("does not identify or mutate Zotero note shards through invalid note title fields", async function () {
    const source = await fs.readFile("src/modules/synthesis/service.ts", "utf8");

    assert.notInclude(source, 'note?.getField?.("title")');
    assert.notInclude(source, 'note.setField?.("title"');
    assert.notInclude(source, "noteTitle(entry) === args.title");
    assert.include(source, "decodeNoteShard");
    assert.include(source, "asset_id");
  });
});
