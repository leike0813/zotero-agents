# Zotero Library Agent

## 概述

Zotero Library Agent 是 [Host Bridge](host-bridge) 的有界按需任务表面。它使 AI agent 能够对 Zotero 文献库执行有限请求——检查条目、检索上下文、读取文献和综合研究数据、执行 workflow、应用已审批的变更、传输文件以及交接证据——而不会成为常驻的文献库维护服务。

Host Bridge 提供三个表面，各自承担不同角色：

| 表面 | 角色 | 适用场景 |
|------|------|----------|
| **CLI Bundle**（`zotero-bridge`） | 安装、连接和底层命令协议 | 需要直接通过 CLI 访问 Host Bridge 能力 |
| **Library Agent** | 有界任务路由、证据交接和可审计结果 | 有有限请求，需要意图路由和完成证据 |
| **Librarian Profile**（Hermes） | 常驻索引、定期维护和持续文献库服务 | 需要持久本地索引、cron 任务或持续监控 |

## Library Agent 提供的内容

- **任务路由**：将当前意图路由到最小的匹配命令族，无需扫描完整命令表。
- **Journey 参考**：七份详细的 journey 手册覆盖特定任务类别，每份手册指定分支、边界情况、证据要求、审批边界和恢复路径。
- **证据交接**：可移植的证据包，具有确定性形状验证和产物摘要计算。
- **权限边界**：强制 Host Bridge 为唯一控制路径，防止直接访问 Zotero 存储或后台服务行为。
- **有界操作**：每个任务在请求结果及其证据可观察时完成——提交确认或准备好的交接本身不构成完成。

## 有界任务流程

1. **确认连接**：验证已加载的 CLI 和 Host Bridge profile。运行 `zotero-bridge surface identity --json`，与打包的 manifest 对比并确认仓库 `releaseSetId`。
2. **路由意图**：阅读任务路由参考，选择满足请求的最小命令族。
3. **加载匹配的 journey**：阅读与任务类别完全匹配的一份 journey 手册。
4. **保留证据**：将当前 Host 事实、返回的句柄、本地产物和审批状态作为独立证据保留。
5. **执行或提交**：对于 workflow，遵循 workflow 执行参考；绝不通过不接受 workflow 选项的执行模式发送选项。
6. **构建并验证**：使用打包的 helper 构建并验证最终证据包。

只有当请求结果及其证据可观察时，任务才算完成。

## Journey 类别

Library Agent 包含七份 journey 手册，每份覆盖一个特定任务领域：

| Journey | 范围 |
|---------|------|
| **当前上下文与文献库读取** | 指示选择、搜索与列表、条目详情、笔记和附件证据 |
| **笔记、附件与就绪状态** | 笔记片段和载荷、标注、PDF/Markdown/分析就绪状态和生成的附件 |
| **综合研究上下文** | 专题、引用图谱视图、索引、解析器、产物、schema 和关注队列 |
| **Host 自有 Workflow** | Workflow 描述、需求、验证、提交、监控、权限、交互和 Product 证据 |
| **Agent 自有交接** | Agent 自有运行包执行、结果验证、apply-back 和收据恢复 |
| **具体写回** | 预览的变更、语义写入命令、审批和实时验证 |
| **Product 与文件** | 本地路径、注册文件、Dashboard Product、下载和附件交付 |

当需要确切的载荷或结果字段时，每份 journey 会指向打包的 `zotero-bridge` CLI 命令卡片。

## 权限与安全边界

Library Agent 执行严格的边界以防止意外的 Zotero 变更：

- **仅通过 Host Bridge**：将 Host Bridge 视为唯一的 Zotero 和 Zotero Agents 控制路径。不要直接读写 Zotero 数据库、存储目录、插件内部或浏览器状态。
- **有界工作**：不要将 Library Agent 变成后台文献库服务。为当前请求执行有界工作，在结果或所需用户决策可用时返回控制。
- **禁止无人值守写入**：不要执行计划或无人值守的写入。当前用户请求和 Host Bridge 审批管辖每次变更或 apply-back。
- **禁止过期假设**：不要将缓存条目、生成的引用或证据包视为实时 Zotero 事实；当需要新鲜度时，通过 Host Bridge 确认当前事实。

## 证据交接

Library Agent 为任务连续性生成可移植的证据包。证据包包含：

- **状态**：`completed`、`canceled` 或 `failed`
- **摘要**：简洁的任务本地发现
- **证据文件**（可选）：由 helper 构建并验证的证据包，可供其他 agent 或任务消费
- **诊断信息**（可选）：结构化诊断信息

使用打包的 helper 构建并验证证据包：

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

Helper 验证确定性形状、计算产物摘要并检查 workflow 包。Agent 仍负责命令选择、解释、证据充分性以及已审核操作是否被授权。

## 失败处理

- 报告失败时保留结构化错误码和句柄字段。
- 仅在错误表明语法或身份过期时重新发现命令或对象；不要猜测替代句柄。
- 当操作返回文件句柄或输出路径时，在使用其作为证据或 apply-back 输入之前验证声明的文件。
- 当缺少所需的权限、输入或用户意图时，在边界处停止并说明确切缺失的决策。

## 集成

Library Agent 依赖 Host Bridge 进行所有 Zotero 访问。使用 Library Agent 之前：

1. 确保 Host Bridge 正在运行（Zotero → 设置 → Zotero Agents → Host Bridge → **启动 / 显示端点**）。
2. 安装 `zotero-bridge` CLI（使用 Host Bridge 首选项面板中的 **安装 CLI** 按钮）。
3. 使用端点 URL 和 Bearer token 配置连接 profile。详细设置请参阅 [Host Bridge 配置](host-bridge)。

## 后续阅读

- [Host Bridge](host-bridge) — `zotero-bridge` CLI 和 Host Bridge 能力的完整参考
- [Hermes Profiles](hermes-profiles) — 具有本地索引和定期维护的常驻文献库服务
- [Workflows](../workflows) — 所有内建和自定义 workflow 的概述
- [MCP Server](mcp-server) — MCP 兼容客户端的替代协议接口
