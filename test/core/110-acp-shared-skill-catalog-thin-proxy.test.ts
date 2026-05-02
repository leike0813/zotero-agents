import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildAcpSharedSkillCatalog,
} from "../../src/modules/acpSharedSkillCatalog";
import { materializeAcpSkill } from "../../src/modules/acpSkillMaterializer";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { rewriteAcpSkillReferences } from "../../src/modules/acpSkillReferenceRewriter";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-thin-proxy-"));
}

async function createSkill(args: {
  root: string;
  rootKind: "skills" | "skills_builtin";
  skillId: string;
  skillMd?: string;
}) {
  const skillDir = path.join(args.root, args.rootKind, args.skillId);
  await fs.mkdir(path.join(skillDir, "assets", "templates"), { recursive: true });
  await fs.mkdir(path.join(skillDir, "scripts"), { recursive: true });
  await fs.mkdir(path.join(skillDir, "references"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    args.skillMd ||
      [
        "---",
        `name: ${args.skillId}`,
        "---",
        "",
        `# ${args.skillId}`,
        "",
        "Run `python scripts/stage_runtime.py`.",
        "Read `assets/templates/report.j2` and references/guide.md.",
        `Also check ${args.skillId}/scripts/helper.py.`,
      ].join("\n"),
    "utf8",
  );
  await fs.writeFile(path.join(skillDir, "scripts", "stage_runtime.py"), "print('ok')\n", "utf8");
  await fs.writeFile(path.join(skillDir, "scripts", "helper.py"), "print('helper')\n", "utf8");
  await fs.writeFile(path.join(skillDir, "references", "guide.md"), "# Guide\n", "utf8");
  await fs.writeFile(path.join(skillDir, "assets", "templates", "report.j2"), "Report\n", "utf8");
  await fs.writeFile(
    path.join(skillDir, "assets", "output.schema.json"),
    JSON.stringify({ type: "object" }),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "runner.json"),
    JSON.stringify({
      id: args.skillId,
      runtime: { dependencies: ["jinja2"] },
      schemas: { output: "assets/output.schema.json" },
    }),
    "utf8",
  );
  return skillDir;
}

describe("ACP shared skill catalog thin proxy overlay", function () {
  it("builds a shared catalog from effective plugin skills with user override", async function () {
    const root = await mkTempRoot();
    try {
      await createSkill({ root, rootKind: "skills_builtin", skillId: "demo" });
      await createSkill({
        root,
        rootKind: "skills",
        skillId: "demo",
        skillMd: "---\nname: demo\n---\n\n# User Demo\n",
      });
      await createSkill({ root, rootKind: "skills_builtin", skillId: "aux" });
      const registry = await scanPluginSkillRegistry({ cwd: root });
      assert.equal(registry.entriesById.demo.sourceKind, "user");
      assert.sameMembers(
        registry.entries.map((entry) => entry.skillId),
        ["aux", "demo"],
      );

      const catalog = await buildAcpSharedSkillCatalog({
        registry,
        catalogRootDir: path.join(root, "catalog"),
      });
      assert.equal(catalog.entriesById.demo.sourceKind, "user");
      assert.isString(catalog.entriesById.demo.resourceManifest.assetsDir);
      assert.isAtLeast(catalog.entriesById.demo.resourceManifest.files.length, 1);
      assert.include(catalog.entriesById.demo.catalogSkillRoot, path.join("catalog"));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rewrites stable skill resource references to absolute catalog paths", function () {
    const result = rewriteAcpSkillReferences({
      skillId: "demo",
      skillRoot: "C:\\catalog\\skills\\demo",
      skillMdContent:
        "---\nname: demo\n---\n\nUse scripts/a.py, assets/b.json, references/c.md, demo/scripts/d.py and {{ skill_dir }}/scripts/e.py.",
    });
    assert.include(result.content, "C:/catalog/skills/demo/scripts/a.py");
    assert.include(result.content, "C:/catalog/skills/demo/assets/b.json");
    assert.include(result.content, "C:/catalog/skills/demo/references/c.md");
    assert.include(result.content, "C:/catalog/skills/demo/scripts/d.py");
    assert.include(result.content, "C:/catalog/skills/demo/scripts/e.py");
    assert.isTrue(result.content.startsWith("---\nname: demo\n---"));
  });

  it("materializes all effective skills as run-local thin proxies", async function () {
    const root = await mkTempRoot();
    try {
      await createSkill({ root, rootKind: "skills", skillId: "demo" });
      await createSkill({ root, rootKind: "skills_builtin", skillId: "aux" });
      const registry = await scanPluginSkillRegistry({ cwd: root });
      const workspaceDir = path.join(root, "run");
      const result = await materializeAcpSkill({
        registry,
        requestedSkillId: "demo",
        injectionPlan: {
          family: "codex",
          skillRoots: [path.join(workspaceDir, ".agents", "skills")],
          diagnostics: [],
        },
        workspaceDir,
        resultJsonPath: path.join(workspaceDir, "result", "result.json"),
        inputManifestPath: path.join(workspaceDir, "input.json"),
        catalogRootDir: path.join(root, "catalog"),
      });

      assert.equal(result.skillId, "demo");
      assert.equal(result.proxySkillCount, 2);
      assert.equal(result.runnerJson.runtime && (result.runnerJson.runtime as any).dependencies?.[0], "jinja2");
      assert.include(result.primarySkillDir, path.join("catalog"));
      const proxyDir = path.join(workspaceDir, ".agents", "skills", "demo");
      const proxySkill = await fs.readFile(path.join(proxyDir, "SKILL.md"), "utf8");
      assert.include(proxySkill, "Zotero Skills ACP Thin Proxy Run Contract");
      assert.include(proxySkill, result.primarySkillDir.replace(/\\/g, "/"));
      assert.include(proxySkill, "scripts/stage_runtime.py");
      assert.isFalse(
        await fs
          .stat(path.join(proxyDir, "scripts"))
          .then(() => true)
          .catch(() => false),
      );
      assert.isFalse(
        await fs
          .stat(path.join(proxyDir, "assets"))
          .then(() => true)
          .catch(() => false),
      );
      assert.isTrue(
        await fs
          .stat(path.join(proxyDir, "zotero-skill-proxy.json"))
          .then(() => true)
          .catch(() => false),
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
