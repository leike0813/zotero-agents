---
name: host-bridge-review-mirror
description: 将 Host Bridge 三个发布面的当前 Markdown 指令文档通过隔离暂存、结构校验和来源清单镜像到 artifact/host-bridge-review/，并翻译为中文供人工审阅。
---

# Host Bridge 审阅镜像

把 CLI wrapper、Zotero Library Agent 与 Zotero Librarian profile 的当前 Markdown 指令文档镜像为中文审阅材料。文件清单由发布面目录动态发现；不得维护手写文件数或路径副本。

## 执行流程

### 1. 刷新正式内容

从仓库根目录运行：

```bash
npm run render:host-bridge-content
```

命令失败时停止，不得用旧生成内容制作镜像。

### 2. 创建隔离暂存区

使用仓库外临时目录，不要直接清空正式审阅目录：

```bash
review_staging="$(mktemp -d)"
npx tsx scripts/host-bridge-review-mirror.ts prepare --staging="$review_staging"
```

`source/` 是本次审阅的只读源快照，`translated/` 是待写入的中文镜像。`inventory.json` 是本次文件清单。

### 3. 翻译全部清单文件

逐项读取 `inventory.json`，把 `source/<surface>/<relativePath>` 翻译到 `translated/<surface>/<relativePath>`。必须处理清单中的每个文件，不得跳过，也不得添加清单外 Markdown。

三个 surface 的含义：

- `cli-wrapper`：CLI 控制、参数、输出、恢复和命令卡。
- `library-agent`：Zotero Library Agent 的任务路由、证据和执行旅程。
- `librarian-profile`：常驻 Librarian profile、维护策略、工作流与命令卡。

在 `translated/INDEX.md` 生成中文索引，包含生成时间、三发布面说明、实际文件数以及逐文件中文简述。索引中的数量必须来自 `inventory.json`。

### 4. 翻译保护规则

必须翻译标题、自然语言段落、列表说明、表格中的自然语言，以及 YAML frontmatter 的 `description`。

以下结构必须逐字、逐序保留：

- fenced code block（包括 fence 语言和块内内容）；
- inline code；
- Markdown 链接 URL；
- YAML frontmatter 的 `name`；
- CLI 命令、文件路径、schema/DTO 字段、标识符和机器可读值。

Host Bridge、CLI、SKILL、profile、workflow、capability、approval、handle、transcript、backend、provider、session、MCP、Agent、SkillRunner、release set、surface、fingerprint 保留英文。中文应简洁、连贯，不写变更历史或兼容性说明。

### 5. 校验并原子替换

翻译完成后运行：

```bash
npx tsx scripts/host-bridge-review-mirror.ts finalize \
  --staging="$review_staging" \
  --target=artifact/host-bridge-review
npx tsx scripts/host-bridge-review-mirror.ts check \
  --target=artifact/host-bridge-review
```

`finalize` 会先检查文件全集、路径边界、symlink、代码块、inline code、URL 和 frontmatter name；全部通过后才原子替换正式目录。失败时保留原审阅镜像。

正式目录必须包含 `PROVENANCE.json`，记录 source commit、实际文件数、每个 surface 的数量以及源文件/译文 SHA-256。该文件是机器契约，不翻译、不手改。

## 完成报告

报告以下事实：

- 三个 surface 的实际文件数与总数；
- `PROVENANCE.json` 的 source commit；
- `finalize` 与 `check` 是否通过；
- 正式产物路径。
