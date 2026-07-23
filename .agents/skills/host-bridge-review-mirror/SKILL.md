---
name: host-bridge-review-mirror
description: 生成并校验 Host Bridge 三层发布面的中文所有权审阅镜像。用于发布面 Markdown 语义变更后进行人工审阅或验证镜像来源时。
---

# Host Bridge Review Mirror

## Goal

从 `host-bridge/surfaces.json` 解析三个发布面的所有权与继承关系，把每个当前 Markdown 指令源翻译一次，生成可核验的 `artifact/host-bridge-review/` 中文审阅镜像。镜像必须同时表达自有内容和有效继承组成，但不得复制继承译文。

## Inputs

- 已刷新并通过内容门禁的 Host Bridge 生成面。
- `host-bridge/surfaces.json`、`host-bridge/release-set.json` 与最新 complete release receipt。
- 仓库外的空暂存目录；正式目标固定为 `artifact/host-bridge-review/`。

## Workflow

1. 阅读[审阅镜像操作合同](references/review-operations.md)，从仓库根目录运行 `npm run render:host-bridge-content` 和 `npm run check:host-bridge-content`。任一命令失败即停止。
2. 创建空暂存目录并冻结本轮输入：

   ```bash
   review_staging="$(mktemp -d)"
   npx tsx scripts/host-bridge-review-mirror.ts prepare --staging="$review_staging"
   ```

3. 逐项读取 `inventory.json`。把 `source/<artifactPath>` 的自然语言翻译到 `translated/<artifactPath>`，并以 `summaries.template.json` 为键全集创建 `summaries.json`，为每个文件填写简洁中文摘要。不得自行创建 `INDEX.md`。
4. 校验并原子替换正式镜像：

   ```bash
   npx tsx scripts/host-bridge-review-mirror.ts finalize \
     --staging="$review_staging" \
     --target=artifact/host-bridge-review
   npm run check:host-bridge-review-mirror
   ```

5. 核对输出的 `fileCount`、三个发布面的 owned/effective 数量、source commit、candidate release set 与 latest complete release identity。

## Hard constraints

- `host-bridge/surfaces.json` 是发布面身份、所有权和继承关系的唯一事实源；不得维护手写发布面别名、文件列表或固定数量。
- 每个 owned Markdown 源只能有一份译文。Minimum 内容归 `zotero-bridge-cli`，六个研究 Skill 归 `zotero-library-agent`，Hermes 根文档与 Librarian Skill 归 `zotero-librarian`；继承只由 `INDEX.md` 与 `PROVENANCE.json` 表达。
- `SKILL.md` 和 references 的标题、段落、说明及 frontmatter `description` 应译为通顺中文；current-state-only，不加入历史、迁移、兼容或废弃说明。
- fenced code block、inline code、Markdown URL、frontmatter `name`、标题层级序列和 HTML machine marker 必须逐字或逐序保留。CLI 命令、路径、schema/DTO 字段、标识符及机器值不得翻译。
- 必须翻译冻结清单的全集，不能缺少或添加 Markdown，不能使用 symlink。源、manifest 或 release identity 在 prepare 后变化时必须重新 prepare。
- `finalize` 失败时不得直接编辑、清空或替换正式目录；旧的有效镜像必须保留。

## LLM And Script Responsibilities

- Agent 负责理解自然语言语义、完成中文翻译、填写逐文件摘要，并判断译文是否忠实且适合人工审阅。
- 脚本负责解析 manifest、冻结源、计算 owned/effective 组成、验证精确文件集和受保护结构、渲染索引、写入 v2 provenance 及原子替换。
- Agent 不得手写 `INDEX.md`、`PROVENANCE.json` 或绕过脚本校验；脚本不得自动翻译或替 Agent 判断语义质量。

## Completion

仅当 `finalize` 与 `npm run check:host-bridge-review-mirror` 均通过才算完成。报告 inventory 给出的 owned 文件实际总数及每层 owned/effective 数量、source commit、release identities、正式产物路径和验证结果。

## Failure handling

内容渲染失败时修复正式源后重新开始。翻译缺失或结构变化时只修正暂存译文。出现 `source changed since prepare` 时废弃当前暂存区并从新空目录重新 prepare。正式 check 失败表示镜像陈旧或被改动，应重新执行完整流程，不得修改 provenance 掩盖差异。

## References

执行本 Skill 前必须阅读[审阅镜像操作合同](references/review-operations.md)；该文件完整定义暂存布局、翻译边界、清单与 provenance 字段、校验语义及恢复路径。
