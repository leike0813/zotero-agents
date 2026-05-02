import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  scanPluginSkillRegistry,
  resolvePluginSkillRoots,
  setPluginSkillRegistryRuntimeRootURI,
} from "../../src/modules/pluginSkillRegistry";
import { copyRuntimeDirectory } from "../../src/modules/runtimePersistence";

async function makeTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-plugin-skills-"));
}

async function writeSkill(args: {
  root: string;
  dirName: string;
  skillId: string;
  skillMd?: string;
  runnerJson?: Record<string, unknown>;
}) {
  const skillDir = path.join(args.root, args.dirName);
  await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    args.skillMd || `# ${args.skillId}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "runner.json"),
    JSON.stringify(args.runnerJson || { id: args.skillId }, null, 2),
    "utf8",
  );
  return skillDir;
}

describe("plugin skill registry", function () {
  let tempRoot = "";

  beforeEach(async function () {
    tempRoot = await makeTempRoot();
  });

  afterEach(async function () {
    setPluginSkillRegistryRuntimeRootURI("");
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("resolves default skill roots from cwd", function () {
    const roots = resolvePluginSkillRoots({ cwd: "repo-root" });

    assert.match(roots.userRoot.replace(/\\/g, "/"), /repo-root\/skills$/);
    assert.match(
      roots.builtinRoot.replace(/\\/g, "/"),
      /repo-root\/skills_builtin$/,
    );
  });

  it("resolves built-in skill root from addon runtime file URI", function () {
    setPluginSkillRegistryRuntimeRootURI(
      "file:///D:/Workspace/Plugin/.scaffold/build/addon/",
    );

    const roots = resolvePluginSkillRoots();

    assert.match(
      roots.builtinRoot.replace(/\\/g, "/"),
      /D:\/Workspace\/Plugin\/\.scaffold\/build\/addon\/skills_builtin$/,
    );
  });

  it("preserves POSIX built-in skill root from addon runtime file URI", function () {
    const runtime = globalThis as {
      Zotero?: { isWin?: boolean };
      process?: { platform?: string };
    };
    const previousZotero = runtime.Zotero;
    const previousProcess = runtime.process;
    runtime.Zotero = { ...(previousZotero || {}), isWin: false };
    runtime.process = { ...(previousProcess || {}), platform: "linux" };
    setPluginSkillRegistryRuntimeRootURI(
      "file:///Users/me/Zotero-Skills/.scaffold/build/addon/",
    );

    try {
      const roots = resolvePluginSkillRoots();

      assert.equal(
        roots.builtinRoot.replace(/\\/g, "/"),
        "/Users/me/Zotero-Skills/.scaffold/build/addon/skills_builtin",
      );
    } finally {
      runtime.Zotero = previousZotero;
      runtime.process = previousProcess;
    }
  });

  it("discovers valid built-in and user skills", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    await writeSkill({
      root: builtinRoot,
      dirName: "builtin-demo",
      skillId: "builtin-demo",
    });
    await writeSkill({
      root: userRoot,
      dirName: "user-demo",
      skillId: "user-demo",
    });

    const registry = await scanPluginSkillRegistry({ builtinRoot, userRoot });

    assert.sameMembers(
      registry.entries.map((entry) => entry.skillId),
      ["builtin-demo", "user-demo"],
    );
    assert.equal(registry.entriesById["builtin-demo"].sourceKind, "builtin");
    assert.equal(registry.entriesById["user-demo"].sourceKind, "user");
    assert.match(registry.entriesById["user-demo"].checksum, /^sha256:/);
  });

  it("lets user skills override built-in skills with the same id", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    await writeSkill({
      root: builtinRoot,
      dirName: "shared",
      skillId: "shared-skill",
      skillMd: "# built-in\n",
    });
    await writeSkill({
      root: userRoot,
      dirName: "shared",
      skillId: "shared-skill",
      skillMd: "# user\n",
    });

    const registry = await scanPluginSkillRegistry({ builtinRoot, userRoot });

    assert.lengthOf(registry.entries, 1);
    assert.equal(registry.entries[0].skillId, "shared-skill");
    assert.equal(registry.entries[0].sourceKind, "user");
    assert.isTrue(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_shadowed" &&
          entry.skillId === "shared-skill",
      ),
    );
  });

  it("excludes invalid candidates and reports diagnostics", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    const invalidDir = path.join(userRoot, "invalid");
    await fs.mkdir(invalidDir, { recursive: true });
    await fs.writeFile(path.join(invalidDir, "SKILL.md"), "# invalid\n", "utf8");

    const registry = await scanPluginSkillRegistry({ builtinRoot, userRoot });

    assert.lengthOf(registry.entries, 0);
    assert.isTrue(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_candidate_invalid" &&
          entry.reason === "missing_runner_json",
      ),
    );
    assert.isTrue(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_root_missing" &&
          entry.sourceKind === "builtin",
      ),
    );
  });

  it("computes stable checksums and changes when content changes", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    const skillDir = await writeSkill({
      root: builtinRoot,
      dirName: "checksum-demo",
      skillId: "checksum-demo",
      skillMd: "# first\n",
    });

    const first = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    const second = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    assert.equal(
      first.entriesById["checksum-demo"].checksum,
      second.entriesById["checksum-demo"].checksum,
    );

    await fs.writeFile(path.join(skillDir, "SKILL.md"), "# changed\n", "utf8");
    const changed = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    assert.notEqual(
      first.entriesById["checksum-demo"].checksum,
      changed.entriesById["checksum-demo"].checksum,
    );
  });

  it("copies skill directories through read/write fallback when native copy fails", async function () {
    const sourceDir = path.join(tempRoot, "source-skill");
    const targetDir = path.join(tempRoot, "target-skill");
    await fs.mkdir(path.join(sourceDir, "assets", "nested"), { recursive: true });
    await fs.writeFile(path.join(sourceDir, "SKILL.md"), "# demo\n", "utf8");
    await fs.writeFile(
      path.join(sourceDir, "assets", "nested", "config.json"),
      JSON.stringify({ ok: true }),
      "utf8",
    );

    const runtime = globalThis as { IOUtils?: unknown };
    const previousIOUtils = runtime.IOUtils;
    runtime.IOUtils = {
      copy: async () => {
        throw new Error("native copy unavailable");
      },
      read: async (filePath: string) => new Uint8Array(await fs.readFile(filePath)),
      write: async (filePath: string, bytes: Uint8Array) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, Buffer.from(bytes));
      },
    };
    try {
      await copyRuntimeDirectory({ sourceDir, targetDir });
    } finally {
      runtime.IOUtils = previousIOUtils;
    }

    assert.equal(
      await fs.readFile(path.join(targetDir, "SKILL.md"), "utf8"),
      "# demo\n",
    );
    assert.equal(
      await fs.readFile(
        path.join(targetDir, "assets", "nested", "config.json"),
        "utf8",
      ),
      JSON.stringify({ ok: true }),
    );
  });
});
