---
name: zotero-library-agent
description: 通过 Host Bridge 操作 Zotero 文献库和 Zotero Agents 插件，支持按需检查、上下文检索、文献与 Synthesis 读取、workflow 执行、经授权的变更、文件传输、运行交互、诊断和证据交接。当 Agent 在当前任务中需要 Zotero 事实或插件操作，但不需要成为常驻文献库维护服务时使用。
---

# Zotero Library Agent

使用 Host Bridge 检查 Zotero，保持对象和运行 handle 显式，仅通过审查过的 mutation 或 workflow 通道应用变更。

## 每次任务开始时

1. 在使用 handle、approval、文件、workflow 或写回之前，阅读 `references/control-invariants.md`。
2. 阅读 `references/task-routing.md`，选择满足请求的最小命令族。
3. 在提交、交互或 apply workflow 之前，阅读 `references/workflow-execution.md`。
4. 当结果需要交接给另一个 Agent、框架或后续任务时，阅读 `references/evidence-handoff.md`。
5. 当 Zotero、Synthesis、制品或运行术语存在歧义时，参考 `references/terminology.md`。
6. 精确阅读下方一个匹配的旅程文件；每个旅程在需要精确 payload 或结果字段时指向捆绑的 `zotero-bridge-cli` 命令卡片。
7. 在连接设置、身份比对、命令调用、分页/文件交付或故障恢复之前，阅读捆绑的 `zotero-bridge-cli` Skill。

## 旅程参考

- `references/journeys/current-context-and-library-read.md`：指示性选择、搜索与列表、条目详情、笔记和附件证据。
- `references/journeys/notes-attachments-and-readiness.md`：笔记片段与 payload、标注、PDF/Markdown/分析就绪状态以及生成的附件。
- `references/journeys/synthesis-research-context.md`：主题、图谱视图、索引、解析器、制品、模式（schema）和关注队列。
- `references/journeys/host-owned-workflow.md`：描述、需求、验证、提交、监控、权限、交互和 Product 证据。
- `references/journeys/agent-owned-handoff.md`：Agent 运行的包执行、结果验证、apply-back 和 receipt 恢复。
- `references/journeys/concrete-writeback.md`：预览的 mutation、语义写入命令、approval 和实时验证。
- `references/journeys/products-and-files.md`：本地路径、注册文件、Dashboard Product、下载和附件交付。
- `references/journeys/research-lifecycle.md`：有序的搜索采集 → 分析 → sidecar 刷新 → 图谱更新 → 主题综合 → 研究包旅程。
- `references/helper-script-contract.md`：确定性证据构建、验证和 workflow 包检查。

## 运行循环

1. 当命令帮助或连接状态不确定时，确认已加载的 CLI 和 profile。
2. 通过 Host Bridge 上下文解析"本文献""当前选中的集合"等指示性短语；绝不仅从标题推断 Zotero 对象标识符。
3. 优先使用有界的语义读取，并跟随返回的游标或文件元数据获取更大结果集。
4. 将解读与操作分离：在选择 workflow 或 mutation 之前，先确定结果的含义。
5. 在支持时预览或描述写入操作，保持 approval 边界，遇到拒绝或结构化错误时停止。
6. 仅跟踪当前任务所需的 handle。当其他系统需要连续性时，显式返回或持久化可移植证据。

## 权限边界

- 将 Host Bridge 视为本 Skill 提供的唯一 Zotero 和 Zotero Agents 控制通道。
- 不要直接读写 Zotero 数据库、存储目录、插件内部结构或浏览器状态。
- 不要将本 Skill 变为后台文献库服务。为当前请求执行有界工作，在结果可用或需要用户决策时返回控制权。
- 不要执行定时或无人值守的写入。当前用户请求和 Host Bridge approval 仍然管控每一次 mutation 或 apply-back。
- 不要将缓存条目、生成的引用或证据包视为 Zotero 实时事实；当需要新鲜度时，通过 Host Bridge 确认当前事实。

## 直接 Skill 调用

- 当通过插件 Skill 注册表调用本 Skill 时，返回一个最终结果，包含 `status`、`summary`、可选的 `evidence_file` 和可选的结构化 `diagnostics`。
- 仅当 `evidence_file` 指向辅助工具构建的、经过验证的、可被其他 Agent 或任务消费的证据包时才设置该字段。当不需要可移植证据文件时，将简洁的任务本地发现保留在 `summary` 中。
- 当缺少权限、输入或用户意图时使用 `canceled`；当执行无法完成时使用 `failed`。两种状态均不得伪造证据。
- 在交互模式下，仅当确实需要用户决策时才使用 runner 的 pending 信封；最终业务结果仍然遵循 `assets/output.schema.json`。

## 故障处理

- 报告故障时保留结构化错误码和 handle 字段。
- 仅当错误表明语法或身份过时时才重新发现命令或对象；不要猜测替代 handle。
- 当操作返回文件 handle 或输出路径时，在将其用作证据或 apply-back 输入之前验证声明的文件。
- 当缺少必要的权限、输入或用户意图时，在边界处停止并说明确切缺失的决策。

## 辅助工具入口

使用打包的辅助工具构建和验证哈希绑定的证据记录：

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
python scripts/zotero_library_agent.py evidence validate --input evidence.json
python scripts/zotero_library_agent.py provider-profile prepare-default --input provider-profile.json --output default-provider-profile.json
```

查看 `assets/agent-helper-surface.json` 了解包内的命令、选项、结果、错误和效果清单。使用辅助工具前阅读 `references/helper-script-contract.md`。该脚本验证确定性结构、计算制品摘要并检查 workflow 包；Agent 仍然负责命令选择、解读、证据充分性以及审查过的操作是否已获授权。
