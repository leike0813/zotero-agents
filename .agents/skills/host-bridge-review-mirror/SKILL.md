---
name: host-bridge-review-mirror
description: 将 Host Bridge 三个发布面（host-bridge-cli-bundle、zotero-library-agent-bundle、zotero-librarian-profile）的 Markdown 指令文档镜像到 artifact/host-bridge-review/ 并翻译为中文，供人工审阅。可在每次 Host Bridge 更新后重复执行以刷新产物。
---

# Host Bridge 审阅镜像

将三个发布面的 Markdown 指令文档镜像到 `artifact/host-bridge-review/` 并翻译为中文。
每次 Host Bridge 更新后可重复执行，产物会被完全替换。

## 执行流程

### Step 1 — 刷新渲染内容

从仓库根目录运行：

```powershell
npm run render:host-bridge-content
```

确保三个发布面的生成内容是最新的。如果命令失败，停止并报告错误。

### Step 2 — 清空旧产物

删除 `artifact/host-bridge-review/` 目录下的全部内容（如果存在），然后重新创建目录结构：

```
artifact/host-bridge-review/
├── cli-wrapper/
├── library-agent/
└── librarian-profile/
```

### Step 3 — 收集并翻译 Markdown 文件

对以下三个发布面，逐一读取每个 Markdown 文件，翻译为中文后写入对应的镜像目录。
保持原始相对路径结构。

#### 发布面 1：cli-wrapper

源目录：`skills_builtin/zotero-bridge-cli/`
镜像目录：`artifact/host-bridge-review/cli-wrapper/`

文件清单（17 个）：

- `SKILL.md`
- `references/agent-guidance.md`
- `references/control-invariants.md`
- `references/host-bridge-cli.md`
- `references/identity-and-connection.md`
- `references/invocation-and-json-input.md`
- `references/output-and-recovery.md`
- `references/terminology.md`
- `references/commands/connectivity-context.md`
- `references/commands/diagnostics.md`
- `references/commands/library-items.md`
- `references/commands/library-notes-attachments-readiness.md`
- `references/commands/mutations-files-products.md`
- `references/commands/synthesis-graph.md`
- `references/commands/synthesis-index-resolver-insights.md`
- `references/commands/synthesis-topics-artifacts.md`
- `references/commands/workflows-and-runs.md`

#### 发布面 2：library-agent

源目录：`skills_builtin/zotero-library-agent/`
镜像目录：`artifact/host-bridge-review/library-agent/`

文件清单（17 个）：

- `README.md`
- `SKILL.md`
- `references/control-invariants.md`
- `references/evidence-handoff.md`
- `references/helper-script-contract.md`
- `references/host-bridge.md`
- `references/task-routing.md`
- `references/terminology.md`
- `references/workflow-execution.md`
- `references/journeys/agent-owned-handoff.md`
- `references/journeys/concrete-writeback.md`
- `references/journeys/current-context-and-library-read.md`
- `references/journeys/host-owned-workflow.md`
- `references/journeys/notes-attachments-and-readiness.md`
- `references/journeys/products-and-files.md`
- `references/journeys/research-lifecycle.md`
- `references/journeys/synthesis-research-context.md`

#### 发布面 3：librarian-profile

源目录：`profiles/hermes/zotero-librarian/`
镜像目录：`artifact/host-bridge-review/librarian-profile/`

文件清单（28 个）：

- `README.md`
- `SOUL.md`
- `skills/zotero-librarian/SKILL.md`
- `skills/zotero-librarian/references/common-tasks.md`
- `skills/zotero-librarian/references/control-invariants.md`
- `skills/zotero-librarian/references/host-bridge.md`
- `skills/zotero-librarian/references/library-maintenance.md`
- `skills/zotero-librarian/references/maintenance-and-recovery.md`
- `skills/zotero-librarian/references/monitoring-and-notifications.md`
- `skills/zotero-librarian/references/operating-principles.md`
- `skills/zotero-librarian/references/output-and-recovery.md`
- `skills/zotero-librarian/references/profile-script-contracts.md`
- `skills/zotero-librarian/references/resident-index.md`
- `skills/zotero-librarian/references/scheduled-jobs.md`
- `skills/zotero-librarian/references/terminology.md`
- `skills/zotero-librarian/references/workflow-execution-policy.md`
- `skills/zotero-librarian/references/workflows.md`
- `skills/zotero-librarian/references/commands/connectivity-context.md`
- `skills/zotero-librarian/references/commands/diagnostics.md`
- `skills/zotero-librarian/references/commands/library-items.md`
- `skills/zotero-librarian/references/commands/library-notes-attachments-readiness.md`
- `skills/zotero-librarian/references/commands/mutations-files-products.md`
- `skills/zotero-librarian/references/commands/synthesis-graph.md`
- `skills/zotero-librarian/references/commands/synthesis-index-resolver-insights.md`
- `skills/zotero-librarian/references/commands/synthesis-topics-artifacts.md`
- `skills/zotero-librarian/references/commands/workflows-and-runs.md`
- `skills/zotero-workflow-agent-runner/SKILL.md`
- `skills/zotero-workflow-agent-runner/references/agent-run-playbook.md`

### Step 4 — 生成索引

在 `artifact/host-bridge-review/INDEX.md` 生成中文目录索引，包含：

- 标题和生成时间
- 三个发布面的简要说明
- 每个发布面的文件列表（含中文简述）

## 翻译规则

### 必须翻译的内容

- 标题（`#`、`##` 等）
- 正文段落、说明文字、指引描述
- 列表项中的自然语言
- 表格中的自然语言单元格
- YAML frontmatter 中的 `description` 字段

### 必须保留原文不翻译的内容

- 所有代码块（` ``` ` 包裹的内容）
- CLI 命令（`zotero-bridge ...`、`npm run ...` 等）
- 文件路径、目录名
- JSON、YAML、TOML 结构体中的键名和值
- HTML 注释标记（`<!-- ... -->`）
- Markdown 链接的 URL 部分
- 代码标识符（变量名、函数名、类型名等）
- 表格中的代码引用（反引号包裹的内容）
- YAML frontmatter 中的 `name` 字段

### 术语处理

- 专有名词首次出现时采用「中文（English）」格式，后续直接使用中文
- 以下术语保留英文不翻译：Host Bridge、CLI、SKILL、profile、workflow、capability、approval、handle、transcript、backend、provider、session、MCP、Agent、SkillRunner、release set、surface、fingerprint
- 表格结构保持原样，仅翻译其中的自然语言

### 翻译质量要求

- 语言通顺、表述清晰
- 避免机械翻译，保持技术文档的简洁风格
- 同一术语在全文中保持一致的翻译
- 被动语态转为主动语态
- 长句拆分为短句

## 批量处理策略

文件数量较多（共 62 个），按以下批次处理：

1. 先处理 cli-wrapper（17 个文件）
2. 再处理 library-agent（17 个文件）
3. 最后处理 librarian-profile（28 个文件）
4. 生成 INDEX.md

每个批次内，先读取所有文件内容，然后逐一翻译写入。
对于内容完全由代码块和表格组成的文件，仍需翻译其中的自然语言部分。

## 注意事项

- 本 skill 不修改任何源文件，只写入 `artifact/` 目录
- 每次运行都会完全替换 `artifact/host-bridge-review/` 的内容
- 如果某个源文件不存在，跳过并在最终报告中说明
- 翻译完成后报告：处理的文件总数、跳过的文件（如有）、产物目录位置
