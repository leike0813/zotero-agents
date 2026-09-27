import { assert } from "chai";
import {
  RUNTIME_TREE_POLICIES,
  scanRuntimeTreeWithIo,
} from "../../src/modules/runtimeTreeManifest";

type Node =
  | { kind: "file"; size: number; mtime?: number }
  | { kind: "directory" };

function fakeTree(entries: Record<string, Node>) {
  return {
    async stat(path: string) {
      const entry = entries[path];
      return entry
        ? {
            exists: true,
            isDir: entry.kind === "directory",
            size: entry.kind === "file" ? entry.size : 0,
            lastModified: entry.kind === "file" ? entry.mtime : undefined,
          }
        : { exists: false, isDir: false, size: 0 };
    },
    async list(path: string) {
      const prefix = `${path.replace(/\/$/, "")}/`;
      return Object.keys(entries).filter((candidate) => {
        if (!candidate.startsWith(prefix)) return false;
        return !candidate.slice(prefix.length).includes("/");
      });
    },
  };
}

describe("runtime tree manifest", function () {
  this.timeout(10_000);

  it("returns deterministic metadata and excludes exact non-business directories", async function () {
    const io = fakeTree({
      "/root": { kind: "directory" },
      "/root/z.txt": { kind: "file", size: 3, mtime: 9 },
      "/root/a": { kind: "directory" },
      "/root/a/one.txt": { kind: "file", size: 5, mtime: 7 },
      "/root/.git": { kind: "directory" },
      "/root/.git/config": { kind: "file", size: 20 },
      "/root/node_modules": { kind: "directory" },
      "/root/node_modules/pkg.js": { kind: "file", size: 30 },
      "/root/.venv": { kind: "directory" },
      "/root/.venv/python": { kind: "file", size: 40 },
      "/root/.github": { kind: "directory" },
      "/root/.github/workflow.yml": { kind: "file", size: 11 },
      "/root/node_modules_backup": { kind: "directory" },
      "/root/node_modules_backup/keep.js": { kind: "file", size: 13 },
    });

    const manifest = await scanRuntimeTreeWithIo({
      root: "/root",
      policy: RUNTIME_TREE_POLICIES.skill,
      io,
    });

    assert.deepEqual(
      manifest.entries.map((entry) => entry.relativePath),
      [
        ".github",
        ".github/workflow.yml",
        "a",
        "a/one.txt",
        "node_modules_backup",
        "node_modules_backup/keep.js",
        "z.txt",
      ],
    );
    assert.equal(manifest.fileCount, 4);
    assert.equal(manifest.directoryCount, 3);
    assert.equal(manifest.totalBytes, 32);
    assert.equal(manifest.maxDepth, 2);
    assert.deepEqual(manifest.issues, []);
  });

  it("observes policy budgets without truncating the eligible tree", async function () {
    const io = fakeTree({
      "/root": { kind: "directory" },
      "/root/a": { kind: "directory" },
      "/root/a/b": { kind: "directory" },
      "/root/a/b/one.txt": { kind: "file", size: 8 },
      "/root/two.txt": { kind: "file", size: 8 },
    });
    const manifest = await scanRuntimeTreeWithIo({
      root: "/root",
      policy: {
        ...RUNTIME_TREE_POLICIES.general,
        warningBudget: { depth: 1, entries: 2, bytes: 4 },
      },
      io,
    });

    assert.equal(manifest.entries.length, 4);
    assert.sameMembers(
      manifest.warnings.map((warning) => warning.code),
      [
        "runtime_tree_depth_observed",
        "runtime_tree_entries_observed",
        "runtime_tree_bytes_observed",
      ],
    );
  });

  it("keeps workspace result exclusions root-scoped", async function () {
    const io = fakeTree({
      "/root": { kind: "directory" },
      "/root/.acp": { kind: "directory" },
      "/root/.acp/internal.json": { kind: "file", size: 3 },
      "/root/result": { kind: "directory" },
      "/root/result/output.json": { kind: "file", size: 5 },
      "/root/work": { kind: "directory" },
      "/root/work/result": { kind: "directory" },
      "/root/work/result/business.json": { kind: "file", size: 7 },
    });

    const manifest = await scanRuntimeTreeWithIo({
      root: "/root",
      policy: RUNTIME_TREE_POLICIES["workspace-result"],
      io,
    });

    assert.deepEqual(
      manifest.entries.map((entry) => entry.relativePath),
      ["work", "work/result", "work/result/business.json"],
    );
  });

  it("marks an unavailable root as an incomplete scan", async function () {
    const manifest = await scanRuntimeTreeWithIo({
      root: "/missing",
      policy: RUNTIME_TREE_POLICIES.general,
      io: fakeTree({}),
    });

    assert.deepEqual(manifest.entries, []);
    assert.deepEqual(manifest.issues, [
      {
        code: "runtime_tree_stat_failed",
        relativePath: "",
        message: "runtime tree root is unavailable",
      },
    ]);
  });
});
