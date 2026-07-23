# 状态与恢复

## 状态所有权与 schema

只有 `scripts/zotero_librarian_service.py` 可以创建和更新 `state.sqlite`。当前 schema 标记为 `zotero-librarian.state.v1`。它拥有的数据包括：

- 包括最后一次成功 index refresh 在内的元数据；
- 以 library ID 和 item key 为键的文献库条目 projection；
- 以 workflow ID 为键的缓存工作流定义；
- 以 `workflowRunId` 为键的 watched Zotero 托管 run；
- 以 event ID 为键的轻量通知；
- 常驻自动化 journal。

任何 Skill、cron 文件、shell 片段、外部 helper 或手工 SQL session 都不得创建表、修改 schema 或写入行。服务启用外键，并以事务方式初始化 schema，使并发首次读取收敛到同一个有效数据库。

该数据库是可重建的缓存和 journal。UI 上下文、文献库内容、工作流定义、执行模式、run、permission、通知、Product、文件、operation 和写入仍以实时 Zotero 为权威。

## 新鲜度与原子更新

每项缓存结论都附带相关刷新或更新时间。缓存用于发现与变化检测；对外可见的当前事实，以及所有可能导致写入或交互的决策，都使用实时读取。

Index refresh 在一个事务中接受所有 snapshot 页面，upsert 已变更行，删除完整 snapshot 中缺失的行，并且仅在成功时记录刷新时间。页面、解析或事务失败会回滚新 projection。Catalog refresh 同样只提交每项成功取得的变更描述，不虚构定义。

Run watch 与 notification sync 只更新已接受的实时结果。连接失败时保留最后已知状态以供后续比较。不得抹除旧状态、依据被拒数据推进 cursor，或在刷新失败后把缓存 terminal/run/event 值描述为当前值。

## 恢复顺序

1. 保留失败 receipt 的 operation、code、details、输入路径或 handle，以及最后可用本地状态。
2. 若 Zotero 状态可能已改变，选择重试前检查受影响的实时对象、workflow/run、operation、apply receipt、Product、文件所属对象或通知。
3. 本地损坏或数据库不可用时，停止常驻操作；条件允许时保留损坏文件供检查。
4. 只能通过服务初始化新数据库；绝不能手工修复表。
5. 只刷新下一项决策所需的最小 projection：library index、workflow catalog、watched run 注册/状态或 notification inbox。
6. 重新运行一个有边界的操作，并将其 receipt 与已保留失败进行比较。

重建本地状态不能重放丢失的 Zotero 写入，也不授权 submission、mutation、event acknowledgement 或 apply-back。

## Handle 与不确定结果

Zotero ref、`workflowRunId`、`skillRunId`、`agentRunId`、`operationId`、`permissionRequestId`、`eventId`、`fileId`、Product ID 和 plan 路径必须留在各自领域。本地行身份不能替代 handle。

工作流提交结果不确定时，启动另一 plan 条目前检查匹配的近期实时 run 和本地 watched 条目。mutation 或维护 operation 结果不确定时，查询其持久 receipt 和实时目标。Agent apply-back 结果不确定时，委托给 Generic 并检查 apply status；不得把 `agentRunId` 注册为 watched 工作流 run。

状态变化或 handle 消费情况未知时，不得复用 handle。远程调用后本地更新成功，只证明服务记录了返回结果；外部 effect 必须由实时 Zotero 或领域 receipt 证明。

工作流 plan 部分提交时，保留已启动 run 和 `remaining`，两组都不得从审计轨迹删除。后续 pass 需要操作员当前指令，并必须避免重新提交已启动条目。

## 安装与 profile 恢复

profile 初始化期间运行 `scripts/install_zotero_bridge_cli.py`。它安装随附可执行文件并链接 well-known 连接 profile，且不更改 `HOME`。`ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME` 仅用于定位 Zotero 端 profile。

常驻工作前，运行随附 CLI 身份检查，将 protocol、CLI schema、version、build fingerprint 和 command-catalog checksum 与 profile release identity 比较。仅版本匹配不足以证明一致。按服务、profile、已认证 manifest、backend 就绪状态的顺序诊断。

凭据始终留在连接环境中。绝不能把 bearer token 写入 `state.sqlite`、plan 文件、cron YAML、receipt、日志、证据或 profile 文档。可执行文件/profile 身份不一致时，应选择匹配的随附集合，不得组合不同 release 的 asset。
