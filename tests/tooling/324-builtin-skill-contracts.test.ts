import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  compareBuiltinSkillPackages,
  compareSkillPackage,
} from "../../scripts/content-package/check-builtin-skill-contracts";
import { getCiGateStages } from "../../scripts/ci-gate-plan";
import { renderLiteratureDeepReadingSkill } from "../../skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill";
import { renderTopicSynthesisSkills } from "../../skills_src/topic-synthesis/renderer/render_topic_synthesis_skills";

async function collectFileMap(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function visit(current: string) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        result[path.relative(root, fullPath).replace(/\\/g, "/")] =
          await fs.readFile(fullPath, "utf8");
      }
    }
  }
  await visit(root);
  return result;
}

describe("builtin skill contract check", function () {
  it("runs once in both shared CI gates", function () {
    for (const gate of ["pr", "release"] as const) {
      const scripts = getCiGateStages(gate).map((stage) => stage.script);
      assert.equal(
        scripts.filter((script) => script === "check:builtin-skill-contracts")
          .length,
        1,
      );
      assert.equal(
        scripts.filter((script) => script === "check:host-bridge-content")
          .length,
        1,
      );
    }
  });

  it("reports missing, extra, and changed files with full paths", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "builtin-skill-compare-"),
    );
    try {
      const expected = path.join(root, "expected");
      const actual = path.join(root, "actual");
      await fs.mkdir(path.join(expected, "assets"), { recursive: true });
      await fs.mkdir(path.join(actual, "assets"), { recursive: true });
      await fs.writeFile(path.join(expected, "assets", "same.txt"), "same");
      await fs.writeFile(path.join(actual, "assets", "same.txt"), "same");
      await fs.writeFile(
        path.join(expected, "assets", "changed.bin"),
        Buffer.from([1, 2]),
      );
      await fs.writeFile(
        path.join(actual, "assets", "changed.bin"),
        Buffer.from([1, 3]),
      );
      await fs.writeFile(path.join(expected, "assets", "missing.txt"), "x");
      await fs.writeFile(path.join(actual, "assets", "extra.txt"), "x");
      await fs.mkdir(path.join(actual, "scripts", "__pycache__"), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(actual, "scripts", "__pycache__", "cached.pyc"),
        "cache",
      );

      assert.deepEqual(await compareSkillPackage(expected, actual, "demo"), [
        { kind: "changed", path: "demo/assets/changed.bin" },
        { kind: "extra", path: "demo/assets/extra.txt" },
        { kind: "missing", path: "demo/assets/missing.txt" },
      ]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("renders both suites in isolation without touching source templates", async function () {
    this.timeout(120000);
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "builtin-skill-contracts-"),
    );
    const expectedRoot = path.join(root, "expected");
    const committedRoot = path.join(root, "committed");
    const sourceTemplates = path.join(
      "skills_src",
      "literature-deep-reading",
      "renderer",
      "templates",
    );
    try {
      const before = await collectFileMap(sourceTemplates);
      const topicPackages = await renderTopicSynthesisSkills(expectedRoot);
      const deepPackage = await renderLiteratureDeepReadingSkill({
        outRoot: expectedRoot,
      });
      const deepRunner = JSON.parse(
        await fs.readFile(
          path.join(deepPackage, "assets", "runner.json"),
          "utf8",
        ),
      );
      assert.include(deepRunner.runtime?.dependencies, "jsonschema>=4.18,<5");

      assert.deepEqual(await collectFileMap(sourceTemplates), before);
      for (const packageRoot of [...topicPackages, deepPackage]) {
        await fs.cp(
          packageRoot,
          path.join(committedRoot, path.basename(packageRoot)),
          { recursive: true },
        );
      }

      const issues = await compareBuiltinSkillPackages({
        renderedRoots: [...topicPackages, deepPackage],
        skillsRoot: committedRoot,
      });
      assert.deepEqual(issues, []);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
