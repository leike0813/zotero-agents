import { assert } from "chai";
import fs from "node:fs/promises";
import path from "node:path";
import { BUILTIN_STATUS_POLICY } from "../../../src/modules/synthesis/builtinTagPolicy";

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

function uniqueMatches(text: string, pattern: RegExp) {
  return Array.from(new Set(text.match(pattern) || [])).sort();
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

  it("keeps both upstream-based Tag Standards aligned with builtin workflow status policy", async function () {
    const [skill, standard, bootstrapperStandard] = await Promise.all([
      fs.readFile(
        projectPath("skills_builtin", "tag-regulator", "SKILL.md"),
        "utf8",
      ),
      fs.readFile(
        projectPath(
          "skills_builtin",
          "tag-regulator",
          "references",
          "tag_standard.md",
        ),
        "utf8",
      ),
      fs.readFile(
        projectPath(
          "skills_builtin",
          "tag-bootstrapper",
          "references",
          "tag_standard.md",
        ),
        "utf8",
      ),
    ]);
    const expectedBuiltinTags = BUILTIN_STATUS_POLICY.map(
      ({ tag }) => tag,
    ).sort();
    const documentedBuiltinTags = uniqueMatches(
      standard,
      /status:need-[a-z-]+/g,
    );
    const documentedFacets = uniqueMatches(
      standard,
      /(?<=^- `)(?:field|topic|method|model|ai_task|data|tool|status)(?=:)/gm,
    );

    assert.equal(bootstrapperStandard, standard);
    assert.include(
      standard,
      "# Zotero Tag 维护说明（分面体系 + 受控词表 + 大写缩写规则）",
    );
    assert.include(standard, "### 3.3 “包含关系合并”的原则");
    assert.include(standard, "## 7. 新增/修改 Tag 的治理流程");
    assert.include(standard, "## 9. 快速示例");
    assert.deepEqual(documentedBuiltinTags, expectedBuiltinTags);
    assert.deepEqual(documentedFacets, [
      "ai_task",
      "data",
      "field",
      "method",
      "model",
      "status",
      "tool",
      "topic",
    ]);
    assert.include(standard, "一篇文献可以有零个或多个 `status:*`");
    assert.include(
      standard,
      "用户可以新增具有明确、持久业务语义的自定义 `status:*`",
    );
    assert.include(
      standard,
      "不得根据论文主题、语言、元数据、摘要或正文推断 builtin workflow status",
    );
    assert.match(skill, /read-only reserved builtin/i);
    assert.match(
      skill,
      /must not enter `add_tags`, `remove_tags`, or `suggest_tags`/i,
    );
    assert.match(skill, /must not infer builtin workflow status/i);
    assert.notInclude(skill, "error=null");
    assert.include(skill, "成功时 `error={}`");

    const currentContract = `${skill}\n${standard}`;
    for (const forbidden of [
      /match_status/i,
      /matching_status/i,
      /status:[0-6]-/i,
      /status:x-parked/i,
      /status:to[_-]read/i,
      /version history/i,
      /版本历史/,
    ]) {
      assert.notMatch(currentContract, forbidden);
    }
  });
});
