# Zotero Librarian Hermes Profile

本仓库是 Hermes 的常驻 Zotero 文献库 surface。当工作需要可复用的本地索引、定时发现、运行监控、通知同步或持续维护时，选择此 profile。对于有限的一次性按需任务，请使用 Zotero Library Agent bundle；仅用于安装和底层命令集成时，请使用 Host Bridge CLI bundle。

源项目：[leike0813/zotero-agents](https://github.com/leike0813/zotero-agents)。

## 安装与初始化

安装已发布的 profile 仓库：

```shell
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

在 profile 初始化期间运行 `scripts/install_zotero_bridge_cli.py`。它会安装打包好的 `zotero-bridge` 二进制文件，并将 Hermes 的知名 Host Bridge profile 路径链接到宿主 `bridge-profile.json`，不改变 `HOME`。

使用 `assets/host-bridge/profile.example.json` 作为连接模板，通过 `ZOTERO_BRIDGE_TOKEN` 提供 bearer token；切勿将 token 写入 profile 文件。如果无法推断宿主 profile，请设置 `ZOTERO_BRIDGE_HOST_PROFILE` 或传入 `--host-profile`。本地状态默认存储在 `$HERMES_HOME/zotero-librarian/index.sqlite`；如需存放于其他位置，请设置 `ZOTERO_LIBRARIAN_STATE_DIR`。

在开始常驻工作之前，离线验证已安装的 CLI：

```sh
zotero-bridge surface identity --json
```

将完整 identity 与 `manifest.json.cliIdentity` 进行比较，确认共享的 `releaseSetId`。仅版本号匹配不足以建立兼容性。

## 常驻运行模型

- 使用本地索引进行重复发现和排序。
- 在执行操作之前，通过 Host Bridge 确认当前的 selection、permission、workflow、run、Product 和 writeback 事实。
- 默认将定时任务视为只读。当任务到达 approval 或 mutation 边界时，生成可审查的提案并停止，除非当前策略明确授权该操作。
- 保持 workflow catalog 刷新、运行监控、通知同步和维护状态通过其 profile 服务和 receipt 可审计。

阅读 `SOUL.md` 和 `skills/zotero-librarian/SKILL.md` 获取第一级路由。常驻手册分别涵盖索引新鲜度和原子刷新、每个定时任务、监控和通知、workflow 执行、维护恢复以及辅助脚本契约。生成的 `references/commands/` 卡片提供精确的 Host Bridge 调用和控制事实，因为此 profile 独立分发。Agent 拥有的 workflow 交接和 apply-receipt 恢复由 `skills/zotero-workflow-agent-runner/SKILL.md` 单独管理。

## 常驻文档地图

- `resident-index.md`：缓存发现与实时确认以及原子刷新恢复。
- `scheduled-jobs.md`：所有七个任务的调度、命令、静默、报告、mutation 和升级策略。
- `monitoring-and-notifications.md`：单次运行监视、通知同步、类型化交互 handle 和重试行为。
- `workflows.md` 和 `workflow-execution-policy.md`：生成的 catalog 输入/参数/结果和实时执行模式选择。
- `maintenance-and-recovery.md`：缓存、Synthesis 索引、图指标和调试修复边界。
- `profile-script-contracts.md`：确定性辅助命令、输出、状态所有权和故障行为。

## 安全与恢复

不要直接访问或修改 Zotero 数据库或存储文件。保留类型化 handle 并使用 Host 拥有的 approval 路径进行写入。定时维护不得仅因先前运行已获批准就将提案转换为写入操作。

当 Host Bridge 操作失败时，检查 `retryable`、`stateChange`、`handleConsumption`、`safeNextActions` 和可选的 `nextCommand`。响应不确定时查询 `operation get <operationId>`；当 `stateChange` 为 changed 或 unknown 时重新读取 Host 实时状态；恢复前查询 workflow 或 apply receipt；不要重用 consumed 或 unknown handle。本地索引或监控故障可以通过其源服务修复，但本地缓存状态永远不是当前 Host 事实的权威来源。
