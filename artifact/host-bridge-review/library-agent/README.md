# Zotero Library Agent 发布包

本仓库是 Zotero 文献库与 Zotero Agents 工作的有界、按需任务表面（surface）。当 Agent 需要完成一个有限请求、选择规范的 Host Bridge 命令、保留证据并返回可审计结果时，选用此发布包。

如果只需要安装、连接或底层命令合约，请使用 CLI 发布包。如果任务需要常驻索引、调度、监控或持续维护，请使用 Zotero Librarian Profile。

## 本发布包提供的内容

- 位于 `skills/zotero-library-agent/SKILL.md` 的任务路由器；
- 位于 `skills/zotero-bridge-cli/SKILL.md` 的连接与命令合约；
- 详细的有界旅程手册以及捆绑 CLI 包装器生成的命令卡片；
- 证据模式以及位于 `skills/zotero-library-agent/assets/` 和 `skills/zotero-library-agent/scripts/` 下的可移植辅助工具；
- 经过验证的 CLI 二进制文件、安装器、连接 profile 模板和发布清单。

从 Library Agent Skill 开始。它将当前意图路由到对应的命令族、完成证据、approval 边界和恢复路径，无需扫描完整的命令表。

## 安装、连接与验证

在 Windows 上使用 `install.ps1`，在 Linux 和 macOS 上使用 `install.sh` 安装当前平台的 CLI。使用 `--yes --json --write-profile` 进行无人值守安装，通过 `ZOTERO_BRIDGE_TOKEN` 提供凭据，切勿将令牌写入文件或证据包。

执行任务前，离线验证已打包的命令表面（surface）：

```sh
zotero-bridge surface identity --json
```

将完整结果与 `manifest.json.cliIdentity` 进行比对，并确认仓库的 `releaseSetId`。不要仅凭 CLI 版本号推断兼容性。对于不熟悉的工作，先使用 `surface search --intent ... --json`，再使用 `surface describe ... --json`，然后仅加载匹配领域的参考文档。

## 有界任务流程

1. 阅读包装器 Skill，确认连接和身份。
2. 阅读 `skills/zotero-library-agent/references/task-routing.md`，然后精确阅读 `references/journeys/` 下一个匹配的旅程文件。
3. 将当前 Host 事实、返回的 handle、本地制品和 approval 状态作为独立证据分别保留。
4. 对于 workflow，遵循 `references/workflow-execution.md`；绝不通过不接受 workflow 选项的执行模式发送选项。
5. 使用 `references/evidence-handoff.md` 和捆绑辅助工具构建并验证最终证据包。

旅程手册涵盖当前上下文与文献库读取、笔记/附件/就绪状态、Synthesis 上下文、Host 拥有的 workflow、Agent 拥有的交接/apply-back、具体写回以及 Product/文件交付。它们规定了分支、近似匹配、证据、approval 和恢复路径。如需精确的 argv、payload、结果、分页或 typed-handle 字段，请跟随旅程进入捆绑的 `skills/zotero-bridge-cli/references/commands/` 命令卡片，而非依赖复制的命令表。

只有当请求结果及其证据可观察时，任务才算完成。提交确认、准备好的交接或写入请求本身不构成完成。

## 安全与恢复

读取和诊断命令仅在命令合约标记为可重试时才可重试。写入、apply-back、文件消费和 Product 操作必须遵守 approval、typed-handle 和状态变更合约。

发生错误时，检查 `retryable`、`stateChange`、`handleConsumption`、`safeNextActions` 和 `nextCommand`。在不确定写入后重新读取当前状态，在部分 apply-back 后查询适用的 receipt，绝不重用已消费的 handle。不要通过直接访问 Zotero 存储来绕过 Host Bridge。
