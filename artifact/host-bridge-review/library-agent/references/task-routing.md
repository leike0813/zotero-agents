# 按需任务路由

选择拥有请求行为的最窄 Host Bridge 命令族。

## 意图配方

| 意图 | 规范路径 | 证据 |
| --- | --- | --- |
| 读取当前选择 | `context selection get` | 返回的条目引用和摘要 |
| 诊断桥接访问 | `surface identity`、`bridge status`，然后 profile/backend 诊断 | 精确身份、健康状态和首个失败的诊断层 |
| 查找文献 | `library item search`，然后 `library item get` | 稳定的条目引用和当前元数据 |
| 检查有界集合 | `library items list` 配合游标 | 分页元数据和返回的引用 |
| 读取一个结构化 note payload | `library note payloads`，然后 `library note payload` | note 引用、payload id 和当前 payload 内容 |
| 下载附件或结果文件 | 检查所有者，获取 `fileId`，然后 `file download` | 所有者引用、文件描述符、校验和和已验证的本地路径 |
| 运行 Host 拥有的 workflow | `workflow describe`、`workflow validate`、`workflow submit` | `executionModes.hostOwned`、`workflowRunId` |
| 接受 Agent 交接 | `workflow describe`、`workflow agent-run` | `executionModes.agentOwned`、`agentRunId`、请求合约 |
| 应用 Agent 结果 | `workflow agent-apply`，然后 `workflow agent-apply-status` | apply receipt 和每个请求的状态 |
| 附加生成的文件 | `file upload`，然后 `mutation item attach-file` | 校验和、`fileId`、目标条目引用 |
| 检查已完成的 Product | `product list`、`product get`，然后 `product download` | `productId`、完成元数据和已下载的资产 |
| 预览具体写入 | `mutation preview`，然后匹配的语义 mutation 命令 | 预览、approval 结果、已应用的结果和已刷新的目标 |
| 恢复故障 | 遵循错误的 `safeNextActions` 或 `nextCommand` | 错误信封和当前状态查询 |

## 上下文与身份

- 当请求涉及当前 Zotero 选择、集合、标签页、条目、笔记或附件时，使用 `context current` 或 `context selection get`。
- 在操作文献条目的 workflow 之前，将子条目、笔记和附件规范化为父条目引用。
- 当用户提供标题、citekey、DOI 或混合标识符时，使用 resolver 命令。保留返回的稳定引用，而非重复模糊查找。

## 文献库读取

- 使用 `library item get|notes|attachments`、`library items list`、`library item search` 和 `library note ...` 获取当前书目事实。
- 仅在明确需要分页的有界元数据传输时使用 `library snapshot`；不要构建隐式的长期镜像。
- 使用 `library readiness` 查找缺失的 PDF、Markdown 或分析制品。就绪状态报告规划工作；它不执行修复。
- 使用 `library annotation list|export` 获取高亮和评论。这些命令是只读的。
- 区分条目附件记录、注册的 Host Bridge `fileId` 和本地下载路径。先检查附件所有者，然后仅通过 `file` 命令传输。
- 使用 `library note get` 获取笔记对象，`library note payloads` 枚举 payload id，`library note payload` 获取单个选定的 payload。

## Synthesis 与 Product

- 使用 `synthesis topic` 获取主题上下文和报告，`synthesis graph` 获取引文关系和指标，`synthesis index` 获取分页派生索引，`synthesis resolver` 获取标签/集合/paper-ref 集合，`synthesis artifact` 获取文献所属的分析文件，`synthesis concept` 和 `synthesis schema` 获取 typed 模型，`synthesis insight attention-queue` 获取排序的审查工作。
- 请求有界的图谱切片、指标、布局或游标页，而非假设完整图谱适合单个响应。
- 使用 `product list|get|download` 获取已完成的 Dashboard Product。Product handle 不是 workflow-run 或文件 handle。将 Product 移除视为需要 approval 的记录变更。

## 文件与写入

- 使用 `file download` 下载 Host 提供的文件。
- 在使用将附件附加到 Zotero 条目的 mutation 命令之前，先上传本地制品。
- 对具体写入使用语义 `mutation` 命令。当需要语义推断或多步业务逻辑时使用 workflow。
- 不要对有语义 mutation 命令的写入回退到原始 `call`。

## Workflow 与运行

- 在选择 Host 拥有的提交或 Agent 拥有的交接之前，阅读 `workflow-execution.md`。
- 仅监控当前任务返回的 handle 并与其交互。
- 使用 `run get`、`run active`、通知或 skill-run 事件进行有界的当前任务检查；不要隐式创建外部运行注册表。
- 使用 `workflowRunId` 查询 workflow 状态/取消，`skillRunId` 进行回复/连接/事件，`permissionRequestId` 检查权限，通知 `eventId` 进行确认。绝不从一种推断另一种。

## 诊断

- 在 debug-only 原始调用之前，使用 `bridge status|manifest`、profile 检查、backend 诊断、近期运行历史和缓存/索引状态。
- 仅在请求为诊断或修复且命令的 approval 边界已被理解时使用维护命令。
- 只读 debug 快照不授权修复。`synthesis cache invalidate`、图谱指标刷新、重新应用和清洁安装重置跨越显式状态变更边界。
- 如果命令身份不确定，在连接之前使用离线的 `surface identity`、`surface describe` 或 `surface search`。

## CLI 表面不确定性

- 当 Skill 路径、命令帮助或错误表明可能存在不同的命令表面时，将活动的 `zotero-bridge --version` 与捆绑 Host Bridge 参考中渲染的预期版本进行比对。
- 版本差异是建议性的，不是硬性停止。在执行命令前使用 `zotero-bridge <command> --help` 进行帮助优先检查，然后当规范命令、argv、approval、handle、效果或恢复仍不确定时使用离线的 `surface search` 或 `surface describe`。
- 仅在所需命令缺失或其控制和安全合约无法确认时停止。将完整的 `surface identity` 比对结果作为辅助证据保留。

## 渐进式参考

为有界任务选择 `references/journeys/` 下一个匹配文件。如需精确的 argv、解码的 payload、结果字段、效果、handle 和恢复，跟随该旅程进入捆绑的 `zotero-bridge-cli` 命令手册。在故障后阅读包装器的 `output-and-recovery.md`。
