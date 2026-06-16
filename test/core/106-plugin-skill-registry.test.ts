import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  scanPluginSkillRegistry,
  resolvePluginSkillRoots,
  setPluginSkillRegistryRuntimeRootURI,
} from "../../src/modules/pluginSkillRegistry";
import { getBuiltinSkillTargetDir } from "../../src/modules/builtinSkillSync";
import { buildSkillRunnerSkillPackageBundle } from "../../src/providers/skillrunner/skillPackageBundler";
import {
  collectRuntimeFiles,
  copyRuntimeDirectory,
} from "../../src/modules/runtimePersistence";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";

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
    args.skillMd ||
      [
        "---",
        `name: ${args.skillId}`,
        `description: ${args.skillId} description`,
        "---",
        "",
        `# ${args.skillId}`,
        "",
      ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "output.schema.json"),
    JSON.stringify({ type: "object" }, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "runner.json"),
    JSON.stringify(
      args.runnerJson || {
        id: args.skillId,
        execution_modes: ["auto"],
        schemas: { output: "assets/output.schema.json" },
      },
      null,
      2,
    ),
    "utf8",
  );
  return skillDir;
}

function readZipEntryNames(bytes: Uint8Array) {
  const names: string[] = [];
  const decoder = new TextDecoder();
  for (let offset = 0; offset <= bytes.length - 30; ) {
    const signature =
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24);
    if (signature !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const compressedSize =
      bytes[offset + 18] |
      (bytes[offset + 19] << 8) |
      (bytes[offset + 20] << 16) |
      (bytes[offset + 21] << 24);
    const nameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
    const extraLength = bytes[offset + 28] | (bytes[offset + 29] << 8);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    names.push(decoder.decode(bytes.slice(nameStart, nameEnd)));
    offset = nameEnd + extraLength + compressedSize;
  }
  return names;
}

describe("plugin skill registry", function () {
  let tempRoot = "";

  beforeEach(async function () {
    tempRoot = await makeTempRoot();
  });

  afterEach(async function () {
    setDebugModeOverrideForTests();
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

  it("prefers synchronized data built-in skill root inside Zotero", function () {
    const zoteroRuntime = Zotero as unknown as {
      DataDirectory?: { dir?: string };
    };
    const previousDataDirectory = zoteroRuntime.DataDirectory;
    zoteroRuntime.DataDirectory = { dir: path.join(tempRoot, "zotero-data") };
    setPluginSkillRegistryRuntimeRootURI(
      "file:///D:/Workspace/Plugin/.scaffold/build/addon/",
    );

    try {
      const roots = resolvePluginSkillRoots();

      assert.equal(roots.builtinRoot, getBuiltinSkillTargetDir());
      assert.match(
        roots.builtinRoot.replace(/\\/g, "/"),
        /zotero-data\/zotero-agents\/data\/skills_builtin$/,
      );
    } finally {
      zoteroRuntime.DataDirectory = previousDataDirectory;
    }
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
    assert.equal(
      registry.entriesById["user-demo"].description,
      "user-demo description",
    );
    assert.match(registry.entriesById["user-demo"].checksum, /^sha256:/);
  });

  it("discovers the Host Bridge CLI wrapper as a valid built-in skill", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["zotero-bridge-cli"];

    assert.isOk(entry);
    assert.equal(entry.sourceKind, "builtin");
    assert.include(
      entry.sourceDir.replace(/\\/g, "/"),
      "skills_builtin/zotero-bridge-cli",
    );
    assert.include(entry.description, "Host Bridge CLI");
    assert.match(entry.checksum, /^sha256:/);
  });

  it("hides debug-only skills when debug mode is disabled", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    await writeSkill({
      root: builtinRoot,
      dirName: "normal-demo",
      skillId: "normal-demo",
    });
    await writeSkill({
      root: builtinRoot,
      dirName: "debug-demo",
      skillId: "debug-demo",
      runnerJson: {
        id: "debug-demo",
        debug_only: true,
        execution_modes: ["auto"],
        schemas: { output: "assets/output.schema.json" },
      },
    });

    setDebugModeOverrideForTests(false);
    const hidden = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    assert.deepEqual(
      hidden.entries.map((entry) => entry.skillId),
      ["normal-demo"],
    );

    setDebugModeOverrideForTests(true);
    const visible = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    assert.sameMembers(
      visible.entries.map((entry) => entry.skillId),
      ["debug-demo", "normal-demo"],
    );
    assert.equal(visible.entriesById["debug-demo"].debugOnly, true);
  });

  it("keeps skills valid when frontmatter description is missing", async function () {
    const userRoot = path.join(tempRoot, "skills");
    await writeSkill({
      root: userRoot,
      dirName: "no-description",
      skillId: "no-description",
      skillMd: "---\nname: no-description\n---\n\n# no-description\n",
    });

    const registry = await scanPluginSkillRegistry({
      builtinRoot: path.join(tempRoot, "skills_builtin"),
      userRoot,
    });

    assert.equal(registry.entriesById["no-description"].description, "");
  });

  it("lets user skills override built-in skills with the same id", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    await writeSkill({
      root: builtinRoot,
      dirName: "shared-skill",
      skillId: "shared-skill",
      skillMd: "---\nname: shared-skill\n---\n\n# built-in\n",
    });
    await writeSkill({
      root: userRoot,
      dirName: "shared-skill",
      skillId: "shared-skill",
      skillMd: "---\nname: shared-skill\n---\n\n# user\n",
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
    await fs.writeFile(
      path.join(invalidDir, "SKILL.md"),
      "# invalid\n",
      "utf8",
    );

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

  it("ignores helper directories marked with skill ignore files", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    const helperDir = path.join(builtinRoot, "runtime-helper");
    const packagedHelperDir = path.join(builtinRoot, "packaged-runtime-helper");
    await fs.mkdir(helperDir, { recursive: true });
    await fs.mkdir(packagedHelperDir, { recursive: true });
    await fs.writeFile(
      path.join(helperDir, ".skillignore"),
      "not a runnable skill\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(packagedHelperDir, "skill.ignore"),
      "not a runnable skill\n",
      "utf8",
    );
    await fs.writeFile(path.join(helperDir, "README.md"), "# helper\n", "utf8");
    await fs.writeFile(
      path.join(packagedHelperDir, "README.md"),
      "# packaged helper\n",
      "utf8",
    );

    const registry = await scanPluginSkillRegistry({ builtinRoot, userRoot });

    assert.lengthOf(registry.entries, 0);
    assert.isFalse(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_candidate_invalid" &&
          entry.path === helperDir,
      ),
    );
    assert.isFalse(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_candidate_invalid" &&
          entry.path === packagedHelperDir,
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
      skillMd: "---\nname: checksum-demo\n---\n\n# first\n",
    });

    const first = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    const second = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    assert.equal(
      first.entriesById["checksum-demo"].checksum,
      second.entriesById["checksum-demo"].checksum,
    );

    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: checksum-demo\n---\n\n# changed\n",
      "utf8",
    );
    const changed = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    assert.notEqual(
      first.entriesById["checksum-demo"].checksum,
      changed.entriesById["checksum-demo"].checksum,
    );
  });

  it("ignores generated Python cache files when scanning skills", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    const skillDir = await writeSkill({
      root: builtinRoot,
      dirName: "python-cache-demo",
      skillId: "python-cache-demo",
      skillMd: "---\nname: python-cache-demo\n---\n\n# python cache demo\n",
    });
    const cacheDir = path.join(skillDir, "scripts", "__pycache__");
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(
      path.join(cacheDir, "runtime_db.cpython-311.pyc"),
      Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x02, 0x03]),
    );

    const first = await scanPluginSkillRegistry({ builtinRoot, userRoot });
    const files = await collectRuntimeFiles(skillDir);

    assert.property(first.entriesById, "python-cache-demo");
    assert.isFalse(
      files.some((file) => file.replace(/\\/g, "/").includes("__pycache__")),
      "runtime file collection should ignore __pycache__ directories",
    );

    await fs.writeFile(
      path.join(cacheDir, "runtime_db.cpython-311.pyc"),
      Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]),
    );
    const second = await scanPluginSkillRegistry({ builtinRoot, userRoot });

    assert.equal(
      first.entriesById["python-cache-demo"].checksum,
      second.entriesById["python-cache-demo"].checksum,
      "generated Python cache bytes must not affect skill checksum or ACP dispatch",
    );
  });

  it("rejects identity mismatches before making a skill effective", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    await writeSkill({
      root: builtinRoot,
      dirName: "actual-directory",
      skillId: "declared-skill",
    });

    const registry = await scanPluginSkillRegistry({ builtinRoot, userRoot });

    assert.lengthOf(registry.entries, 0);
    assert.isTrue(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_identity_mismatch" &&
          entry.reason?.includes("identity_mismatch_directory"),
      ),
    );
  });

  it("rejects invalid runner execution modes and schema annotations", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    await writeSkill({
      root: builtinRoot,
      dirName: "bad-mode",
      skillId: "bad-mode",
      runnerJson: {
        id: "bad-mode",
        execution_modes: ["batch"],
        schemas: { output: "assets/output.schema.json" },
      },
    });
    const badSchemaDir = await writeSkill({
      root: builtinRoot,
      dirName: "bad-schema",
      skillId: "bad-schema",
    });
    await fs.writeFile(
      path.join(badSchemaDir, "assets", "output.schema.json"),
      JSON.stringify({
        type: "object",
        properties: {
          report: { type: "string", "x-type": "binary" },
        },
      }),
      "utf8",
    );

    const registry = await scanPluginSkillRegistry({ builtinRoot, userRoot });

    assert.lengthOf(registry.entries, 0);
    assert.isTrue(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_runner_json_invalid" &&
          (entry.reason?.includes("invalid_execution_modes") ||
            entry.reason?.includes("meta_schema")),
      ),
    );
    assert.isTrue(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_schema_invalid" &&
          entry.reason?.includes("x-type"),
      ),
    );
  });

  it("rejects schemas that violate Skill Runner meta-schema shape", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    const badOutputDir = await writeSkill({
      root: builtinRoot,
      dirName: "bad-output-schema",
      skillId: "bad-output-schema",
    });
    await fs.writeFile(
      path.join(badOutputDir, "assets", "output.schema.json"),
      JSON.stringify(
        {
          oneOf: [{ type: "object" }],
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeSkill({
      root: builtinRoot,
      dirName: "bad-runner-schema",
      skillId: "bad-runner-schema",
      runnerJson: {
        id: "bad-runner-schema",
        execution_modes: "auto",
        schemas: { output: "assets/output.schema.json" },
      },
    });

    const registry = await scanPluginSkillRegistry({ builtinRoot, userRoot });

    assert.lengthOf(registry.entries, 0);
    assert.isTrue(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_schema_invalid" &&
          entry.reason?.includes(
            "output schema violates Skill Runner meta-schema",
          ),
      ),
    );
    assert.isTrue(
      registry.diagnostics.some(
        (entry) =>
          entry.category === "skill_runner_json_invalid" &&
          entry.reason?.includes("meta_schema"),
      ),
    );
  });

  it("accepts all built-in skill packages under full debug visibility", async function () {
    setDebugModeOverrideForTests(true);

    const builtinRoot = path.join(process.cwd(), "skills_builtin");
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const candidates = await fs.readdir(builtinRoot, { withFileTypes: true });
    const expectedSkillIds: string[] = [];
    for (const candidate of candidates) {
      if (!candidate.isDirectory()) {
        continue;
      }
      const skillDir = path.join(builtinRoot, candidate.name);
      const hasSkillMd = await fs
        .access(path.join(skillDir, "SKILL.md"))
        .then(() => true)
        .catch(() => false);
      const runnerJsonPath = path.join(skillDir, "assets", "runner.json");
      const hasRunner = await fs
        .access(runnerJsonPath)
        .then(() => true)
        .catch(() => false);
      if (!hasSkillMd || !hasRunner) {
        continue;
      }
      const runnerJson = JSON.parse(await fs.readFile(runnerJsonPath, "utf8"));
      expectedSkillIds.push(String(runnerJson.id || ""));
    }

    assert.includeMembers(Object.keys(registry.entriesById), expectedSkillIds);
    assert.deepEqual(
      registry.diagnostics.filter(
        (entry) =>
          entry.category === "skill_schema_invalid" ||
          entry.category === "skill_runner_json_invalid" ||
          entry.category === "skill_identity_mismatch",
      ),
      [],
    );
  });

  it("copies skill directories through read/write fallback when native copy fails", async function () {
    const sourceDir = path.join(tempRoot, "source-skill");
    const targetDir = path.join(tempRoot, "target-skill");
    await fs.mkdir(path.join(sourceDir, "assets", "nested"), {
      recursive: true,
    });
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
      read: async (filePath: string) =>
        new Uint8Array(await fs.readFile(filePath)),
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

  it("builds deterministic local skill package zip from effective registry entry", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");
    await writeSkill({
      root: builtinRoot,
      dirName: "bundle-demo",
      skillId: "bundle-demo",
      skillMd: "---\nname: bundle-demo\n---\n\n# built-in\n",
    });
    const userSkillDir = await writeSkill({
      root: userRoot,
      dirName: "bundle-demo",
      skillId: "bundle-demo",
      skillMd: "---\nname: bundle-demo\n---\n\n# user\n",
    });
    await fs.mkdir(path.join(userSkillDir, ".git"), { recursive: true });
    await fs.writeFile(
      path.join(userSkillDir, ".git", "config"),
      "ignored",
      "utf8",
    );
    await fs.writeFile(path.join(userSkillDir, ".DS_Store"), "ignored", "utf8");
    await fs.mkdir(path.join(userSkillDir, "references"), { recursive: true });
    await fs.writeFile(
      path.join(userSkillDir, "references", "guide.md"),
      "# guide\n",
      "utf8",
    );

    const bundle = await buildSkillRunnerSkillPackageBundle({
      skillId: "bundle-demo",
      builtinRoot,
      userRoot,
    });
    const names = readZipEntryNames(bundle.zipBytes);

    assert.equal(bundle.sourceDir, userSkillDir);
    assert.includeMembers(names, [
      "bundle-demo/SKILL.md",
      "bundle-demo/assets/runner.json",
      "bundle-demo/assets/output.schema.json",
      "bundle-demo/references/guide.md",
    ]);
    assert.isFalse(names.some((name) => name.includes(".git/")));
    assert.isFalse(names.some((name) => name.includes(".DS_Store")));
  });

  it("reports missing local skill package with installed-source guidance", async function () {
    const builtinRoot = path.join(tempRoot, "skills_builtin");
    const userRoot = path.join(tempRoot, "skills");

    let thrown: unknown = null;
    try {
      await buildSkillRunnerSkillPackageBundle({
        skillId: "missing-skill",
        builtinRoot,
        userRoot,
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(String(thrown), /missing-skill/);
    assert.match(String(thrown), /skill_source='installed'/);
  });
});
