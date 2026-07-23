import { assert } from "chai";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  inspectHostBridgeSkillPackages,
  validateHostBridgeSkillPackages,
} from "../../scripts/check-host-bridge-skill-packages";

function write(path: string, content: string) {
  mkdirSync(join(path, "references"), { recursive: true });
  writeFileSync(join(path, "references/playbook.md"), "# Playbook\n", "utf8");
  writeFileSync(join(path, "SKILL.md"), content, "utf8");
}

function completeSkill(name: string) {
  return `---\nname: ${name}\ndescription: Complete a bounded task. Use when an agent needs this task.\n---\n\n# ${name}\n\n## Goal\n\nDo the task.\n\n## Inputs\n\nUse supplied input.\n\n## Workflow\n\n1. Perform the task.\n\n## Hard constraints\n\n- Preserve authority.\n\n## Completion\n\nReturn a result.\n\n## Failure handling\n\nReport the failure.\n\n## References\n\nRead [the playbook](references/playbook.md).\n`;
}

describe("host bridge skill package validator", function () {
  it("accepts the Generic coordinator and every task package", function () {
    const source = join(process.cwd(), "skills_src/zotero-library-agent");
    const coordinator = join(source, "skills", "zotero-library-agent");
    const tasks = [
      "zotero-library-query",
      "zotero-literature-acquisition",
      "zotero-literature-analysis",
      "zotero-research-synthesis",
      "zotero-library-curation",
    ].map((id) => join(source, "skills", id));
    assert.deepEqual(
      validateHostBridgeSkillPackages([coordinator, ...tasks]),
      [],
    );
    for (const root of [coordinator, ...tasks]) {
      const skill = readFileSync(join(root, "SKILL.md"), "utf8");
      assert.include(skill, "## LLM And Tool Responsibilities", root);
      assert.include(skill, "zotero-library-task.result.v1", root);
      const description = skill.match(/^description:\s*(.+)$/m)?.[1] || "";
      assert.notMatch(description, /Host Bridge|Host-owned|Host-local/i, root);
    }
  });

  it("accepts a complete directly linked skill and rejects orphan references", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-skill-"));
    const packageRoot = join(root, "example-skill");
    write(packageRoot, completeSkill("example-skill"));
    assert.deepEqual(validateHostBridgeSkillPackages([packageRoot]), []);

    writeFileSync(
      join(packageRoot, "references/orphan.md"),
      "# Orphan\n",
      "utf8",
    );
    assert.include(
      validateHostBridgeSkillPackages([packageRoot]).join("\n"),
      "orphan reference",
    );
  });

  it("rejects incomplete contracts and long non-triggering descriptions", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-skill-invalid-"));
    const packageRoot = join(root, "example-skill");
    write(
      packageRoot,
      `---\nname: wrong-name\ndescription: ${"x".repeat(241)}\n---\n\n# Bad\n`,
    );
    const errors = validateHostBridgeSkillPackages([packageRoot]).join("\n");
    assert.include(errors, "name must match directory");
    assert.include(errors, "description must be at most 240");
    assert.include(errors, "description must state when to use");
    assert.include(errors, "missing required section");
  });

  it("rejects duplicated substantive prose inside one skill package", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-skill-duplicate-"));
    const packageRoot = join(root, "example-skill");
    const duplicated =
      "Preserve every typed operation handle until the corresponding durable receipt proves its state and consumption status.";
    write(
      packageRoot,
      completeSkill("example-skill").replace(
        "- Preserve authority.",
        `- Preserve authority.\n\n${duplicated}`,
      ),
    );
    writeFileSync(
      join(packageRoot, "references/playbook.md"),
      `# Playbook\n\n${duplicated}\n`,
      "utf8",
    );
    assert.include(
      validateHostBridgeSkillPackages([packageRoot]).join("\n"),
      "duplicated substantive prose",
    );
  });

  it("enforces hard materialized depth and reports advisory depth separately", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-skill-depth-"));
    const packageRoot = join(root, "example-skill");
    write(packageRoot, completeSkill("example-skill"));
    const shallow = inspectHostBridgeSkillPackages([packageRoot], {
      enforceMaterializedDepth: true,
    });
    assert.include(shallow.errors.join("\n"), "SKILL.md has");
    assert.include(shallow.errors.join("\n"), "references/playbook.md has");

    const makeLines = (count: number, prefix: string) =>
      Array.from(
        { length: count },
        (_, index) => `${prefix} ${index + 1}.`,
      ).join("\n");
    writeFileSync(
      join(packageRoot, "SKILL.md"),
      `${completeSkill("example-skill")}\n${makeLines(110, "Distinct executable guidance")}\n`,
      "utf8",
    );
    writeFileSync(
      join(packageRoot, "references/playbook.md"),
      `# Playbook\n\n${makeLines(210, "Distinct decision example")}\n`,
      "utf8",
    );
    const advisory = inspectHostBridgeSkillPackages([packageRoot], {
      enforceMaterializedDepth: true,
    });
    assert.deepEqual(advisory.errors, []);
    assert.include(advisory.warnings.join("\n"), "SKILL.md has");
    assert.include(advisory.warnings.join("\n"), "references/playbook.md has");
  });
});
