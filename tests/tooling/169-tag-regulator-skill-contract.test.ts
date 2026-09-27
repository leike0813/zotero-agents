import { assert } from "chai";
import fs from "node:fs/promises";
import path from "node:path";

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe("repository-owned Tag Regulator skill contract", function () {
  it("is maintained as ordinary builtin content without independent publication", async function () {
    const [gitmodules, publicSkills, runner] = await Promise.all([
      fs.readFile(projectPath(".gitmodules"), "utf8"),
      fs.readFile(projectPath("skills_builtin", ".public"), "utf8"),
      fs.readFile(
        projectPath("skills_builtin", "tag-regulator", "assets", "runner.json"),
        "utf8",
      ),
    ]);

    assert.notInclude(gitmodules, "skills_builtin/tag-regulator");
    assert.isFalse(
      await pathExists(projectPath("skills_builtin", "tag-regulator", ".git")),
    );
    assert.notInclude(
      publicSkills
        .split(/\r?\n/g)
        .map((entry) => entry.trim())
        .filter(Boolean),
      "tag-regulator",
    );
    assert.equal(JSON.parse(runner).id, "tag-regulator");
  });
});
