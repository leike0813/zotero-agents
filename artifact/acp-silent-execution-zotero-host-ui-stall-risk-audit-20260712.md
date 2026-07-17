# ACP 静默执行模式下 Zotero 宿主与 UI 卡顿风险审计

日期：2026-07-12

状态：只读审计已完成；阶段 0 profiler 与自动化机制基线已于 2026-07-13 实现；R3 区域发布治理已于 2026-07-15 完成实现及 Zotero 9 机制验收；R2 事件驱动 reader 的初次实现存在 Zotero 插件沙箱连接生命周期缺陷，`repair-host-bridge-async-socket-lifecycle` 已于 2026-07-17 完成修复，并通过 Zotero 9 原始响应 fixture 及冷重启 CLI 验收，Zotero 7 宿主验收待补

适用范围：ACP Skills、ACP Chat、Assistant Workspace、Host Bridge、Zotero Host Capability、ACP transcript/run/audit/runtime-log 持久化

## 1. 文档目的

本文记录一轮针对以下问题的静态排查结果：

> 在使用 Assistant Workspace 的静默执行模式时，还有哪些因素可能导致 ACP 任务执行过程中 Zotero 宿主进程及 UI 发生卡顿？

本文的用途是为后续性能采样、问题复现、OpenSpec 变更和架构治理提供共同参照。它不是性能测试报告，也不把静态可疑路径直接断言为当前环境中的实际主因。

本文严格区分三类结论：

- **代码已证实**：调用路径、同步性质、复杂度、边界或数据结构可以从当前代码直接确认。
- **高可信风险推断**：代码已证实存在主线程长任务或事件风暴条件，但实际耗时仍取决于运行数据。
- **待实测**：需要 profiler、埋点、队列深度或真实数据规模才能确定影响。

2026-07-12 的审计采集本身没有修改代码，也没有运行测试或性能基准。2026-07-13 的后续 change `profile-acp-runtime-hot-paths` 实现了 debug-only profiler 与 R1/R2/R3 埋点；change `capture-acp-runtime-governance-baselines` 又把直接 recorder 模拟替换为 production-seam 自动化基线，并增加实际 Zotero 宿主采集机制；change `matrix-acp-runtime-governance-baselines` 将自动化记录扩展为 closed、open-inactive、acp-active 三个 surface 的固定矩阵。本文相应章节已按当前实现更新。

### 1.1 2026-07-15 R3 区域发布治理更新

OpenSpec change `govern-acp-workspace-region-publications` 仅治理 R3，不包含 R1 diagnostic/persistence 或 R2 Host socket reader。治理基线使用 ACP Chat `displayMode=live` trace，不是 silent replay；本文文件名保留原审计主题，不代表新增 replay 的展示模式。

同一份 Zotero 9 logical matrix 的 provenance 为：

- trace：`acp-trace-chat-2026-07-15T10-41-23-627Z-1.ndjson`
- digest：`3574453d612938112bd3cb257e89a53037ea84548afb3c1b980327b3b781a78b`
- source：`acp-chat-conversation`
- cadence：`logical`
- stage：`pre-governance`
- plugin/Zotero：`0.6.1` / `9.0.4`

两个 target-active formal run 都记录了 109 次 `panel_prepare`、109 次 `panel_signature` 和 109 次 `panel_post`，`panel_signature_bytes` 都是 6,265,747。prepare duration 分别为 `count=109, totalMs=3384, maxMs=63` 与 `count=109, totalMs=4399, maxMs=144`；signature duration 分别为 `109/53/9` 与 `109/38/1`；post duration 分别为 `109/26/1` 与 `109/24/1`。这些 duration 来自 logical cadence，只能用于机制诊断，不能解释为真实 Zotero 卡顿时间。

旧 profiler 的 `panel_signature_bytes` 来自额外构造的 full-snapshot signature input，且错误排除了 `transcriptPage` 而没有排除真实字段 `selectedTranscriptPage`。旧 matrix 没有记录实际 posted envelope bytes、shell forward、child apply 或 render acknowledgement。因此 109 次生命周期计数是可信的旧行为证据，但“corrected pre-governance actual posted bytes”在现有 artifact 中不可恢复；按新覆盖规则，该 bytes/ack 基线必须标记为 `measurement incomplete`，不能把 6,265,747 bytes 改称实际 payload。

当前实现把数据流改为：

```text
domain change → source/owner guard → region DTO → region signature guard
→ shell forward → child region apply → render acknowledgement
```

ACP Chat message-counts 直接构建 bounded DTO；baseline/chrome DTO 不含 selected transcript page、transcript revision/loading/streaming/event count 或 message-count revision；transcript-only publication 只调用 transcript renderer，message-count-only publication 只调用 shared message-counter managed region。shell 不缓存或合并 region publication，Chat/Skills child 按 owner 和 publication revision 拒绝旧数据。R3 profiler 现分别记录 requested、dropped-before-build、prepare、signature-skip、post、actual posted bytes、shell-forward、child-apply 与 render-ack，并保留 publication kind、causality 和 initialization/steady-state 标签。

Node 测试验证了调用边界、bytes 归属、ack 完整性和 DOM identity。`npm run test:zotero:ui -- --no-watch` 又在当前 Zotero 9.0.4 宿主通过 4 个 UI lite 用例，其中包括 production Chat target-active 的完整 R3 publication lifecycle，以及 Chat/Skills 真实嵌套 Workspace frame 的发布确认。这是机制验收，不是相同 provenance 的治理后性能矩阵，也不构成真实宿主延迟改善声明。

后续旧 Skills trace 回放暴露了 measurement window 竞态：warm-up 出现 `post=8, shell=8, child=7, render=7`，而相邻 formal 轮又出现 `child/render=9` 或 `shell=9`。这证明旧 drain 以 child delivery revision 加一个 animation frame 结束时，最后的异步 host acknowledgement 可能跨轮计数；聚合 `ack >= post` 还会让迟到 acknowledgement 掩盖 identity 缺口。当前实现改为由 host 维护有界 publication lifecycle ledger，强制诊断发布返回准确 ID，drain 等待该 ID 的 `render-complete applied` 以及同 tab 较早 pending publication 收敛；Replay 按 ID 集合匹配 post、shell-forward、child-apply、render-ack。shell cache 中被新 generation 取代的 identified snapshot 会获得显式 `superseded` 终态，owner-first 期间的瞬时 `old-owner` probe 会单飞重试；Chat/Skills child 同一 frame 前收到的 identified snapshots 也按序 apply/ack，不再被单槽 pending snapshot 静默覆盖。旧报告中的 formal `captured` 因而不再作为 R3 完整性证据，必须用修复后的矩阵重采。

相同 provenance 的治理后 live Chat matrix、Zotero 7 formal run，以及 Zotero 9 recorded-cadence formal run 仍未生成；在这些结果产生前，只能确认 R3 区域发布实现与当前 Zotero 9 机制验收完成，不能声明 baseline 次数、实际 posted bytes 或 `>100ms` drift bucket 已在正式 before/after 矩阵中改善。该 R3 change 当时未顺带修改 R1、R2；R2 后续状态见 6.5 与 18.8。

## 2. 总结结论

当前的 `silent` 是 **Assistant Workspace 展示策略**，不是 ACP 后台执行隔离模式。

它已经跳过大部分 transcript item 构建、普通 live/boundary UI 发布和 workspace activity heartbeat，但仍保留：

- JSON-RPC 读取、解析、dispatch 和 trace diagnostic；
- ACP 消息计数和 execution progress 更新；
- assistant 最终输出捕获；
- run/event 同步 SQLite 持久化；
- critical UI snapshot 发布；
- runtime log 和可选 debug audit；
- permission、timeout、conversation lifecycle；
- Host Bridge 请求、Zotero API、数据库 mutation；
- 最终输出 convergence、校验、修复与 apply。

因此，“没有实时 transcript DOM 更新”并不等于“Zotero 主线程没有承担实时工作”。当前最高优先级风险是：

1. JSON-RPC trace diagnostic 逐消息触发整份 run 序列化、同步 SQL 和 UI change emit；
2. Host Bridge socket 输入在 Zotero JS 主线程上的条件性 500ms 同步忙等；
3. silent 下 critical progress 仍触发完整 panel snapshot 构建、全量签名和两级 `postMessage` 复制；
4. 长输出、transport queue、大附件和全库查询导致的内存、GC 与主线程 CPU 峰值；
5. transcript/audit/runtime-log 的同步序列化和 Zotero fallback 文件 I/O。

## 3. 静默模式的真实语义边界

### 3.1 模式定义

`src/modules/assistantExecutionDisplayPolicy.ts:3-7` 定义三种展示模式：

```text
live | boundary | silent
```

`src/modules/assistantExecutionDisplayPolicy.ts:109-127` 的通用发布策略是：

- `critical`：所有模式均允许发布；
- `boundary`：仅 `live` 和 `boundary` 允许发布；
- `live`：仅 `live` 允许发布；
- `background`：所有模式均禁止发布。

所以 `silent` 的准确含义是“只允许 critical 发布”，不是“关闭 UI 发布”。

### 3.2 静默模式已经跳过的工作

代码已证实：

1. ACP Skills 对绝大多数非 `user_message_chunk` session update 在 `src/modules/acpSkillRunStore.ts:3992` 提前返回，不再构建 assistant、thought、tool、plan transcript item。
2. 大部分非关键 event 不再投影为 transcript status item，入口见 `src/modules/acpSkillRunStore.ts:2042`。
3. `src/modules/acpSkillRunnerOrchestrator.ts:4050-4118` 的 workspace activity heartbeat 在静默模式关闭；该 heartbeat 原本每 15 秒最多访问 120 个路径。
4. 普通 live/boundary workspace publish 会被展示策略拦截。

### 3.3 静默模式没有跳过的工作

代码已证实：

1. NDJSON/WebSocket/stdio 读取和 JSON-RPC 解析；
2. session update listener dispatch；
3. message count 和 execution progress 更新；
4. assistant turn output accumulator；
5. JSON-RPC trace diagnostic；
6. diagnostic 对 run/event store 的持久化与 change emit；
7. debug audit；
8. critical lifecycle 与 metadata snapshot；
9. Host Bridge 和 Zotero Host Capability；
10. final output validation、repair 和 apply result。

### 3.4 progress 并非逐原始 chunk 递增

`src/modules/acpExecutionProgress.ts:115-194` 显示，`countChanged` 主要发生在：

- 首次开启 assistant 或 thought segment；
- assistant 与 thought 类型切换；
- 新的 tool boundary。

`tool_call_update`、usage、status 等 soft side-channel 不直接增加计数。因此 progress snapshot 的频率与 assistant/thought/tool 语义段数量成正比，并非与每个原始文本 chunk 一一对应。

这项边界很重要：不能把所有 token chunk 都归因于 progress UI 刷新；但每个 JSON-RPC notification 仍可能命中后文的 diagnostic 路径。

## 4. 风险总表

| 编号 | 优先级 | 风险 | 代码证据强度 | 典型放大条件 |
| --- | --- | --- | --- | --- |
| R1 | P0 | JSON-RPC diagnostic 逐消息同步持久化与 change emit | 已证实 | 高频 chunk、tool update、长任务 |
| R2 | P0 | Host Bridge socket 同步忙等 | 已证实的条件性长任务 | 分片、慢发、并发连接 |
| R3 | P0 | silent 下仍构建完整 UI snapshot | 已证实 | tool 密集、长 transcript、Workspace/Task Manager 打开 |
| R4 | P1 | 双份无界 assistant chunk 累积 | 已证实 | 超长 assistant 输出 |
| R5 | P1 | transport/message queue 无容量边界 | 已证实结构，影响待实测 | 突发 WebSocket/stdio frame |
| R6 | P1 | 大附件整文件读取、哈希与重复复制 | 已证实 | 多个大 PDF、下载 |
| R7 | P1 | library 分页实际重复全库扫描和排序 | 已证实 | 大型 Zotero 库、多页读取 |
| R8 | P1 | runtime log 全量 clone/stringify | 已证实 | 高频日志、diagnostic 模式 |
| R9 | P1 | transcript/audit 同步 XPCOM append 与索引恢复 | 已证实 Zotero fallback | 高频 transcript、长历史、索引失效 |
| R10 | P1 | 逐 item `saveTx()` 与 Notifier 风暴 | 已证实事务粒度，影响待实测 | 批量标签/collection mutation |
| R11 | P2 | Host Bridge 大响应多重 stringify/copy | 已证实 | 大 synthesis 结果、大二进制 |
| R12 | P2 | workspace/skill/result 递归 scan/stat/copy | 已证实 | 海量小文件、深层目录 |

## 5. R1：JSON-RPC diagnostic 逐消息持久化与 UI 事件风暴

### 5.1 调用链

每条入站 JSON-RPC 消息会经过：

```text
AcpClientConnection.processMessage()
  -> traceMessage("in", message)
  -> AcpConnectionAdapter.emitTrace()
  -> JSON.stringify(event)
  -> emitDiagnostic(jsonrpc_trace)
  -> ACP Skills diagnostic listener
  -> upsertAcpSkillRun({ event })
  -> persistRun()
  -> 同步写 run row
  -> 同步写 event row
  -> emitChanged(["run", "transcript"])
```

关键代码：

- `src/modules/acpClientConnection.ts:111,184,196`
- `src/modules/acpConnectionAdapter.ts:407,467`
- 新 run：`src/modules/acpSkillRunnerOrchestrator.ts:4641`
- 恢复 run：`src/modules/acpSkillRunnerOrchestrator.ts:3108`
- `src/modules/acpSkillRunStore.ts:2686-2731,3080,3400-3424`
- `src/modules/pluginStateStore.ts:1218-1289,1819,2044`

### 5.2 为什么 silent 没有阻止该路径

diagnostic listener 调用 `upsertAcpSkillRun()` 时没有传入 `persistMode: "trailing"`。

`src/modules/acpSkillRunStore.ts:3400-3414` 的 silent 持久化抑制只覆盖：

```text
persistMode === "trailing" && event 非关键
```

diagnostic 不符合该条件，所以仍进入 immediate persist。

### 5.3 同步成本

`persistRun()` 会：

1. 构建完整 run persistence payload；
2. `JSON.stringify` 整份 payload；
3. 覆盖 run row；
4. 若有新 event，再序列化并插入 event row。

Zotero adapter 使用 `conn.execute` / `statement.execute()`，属于同步 mozStorage 路径。

若后端将一次长输出拆成 5,000 个 session update notification，静态调用关系意味着可能出现约：

- 5,000 次 trace diagnostic；
- 5,000 次 run payload 重建和序列化；
- 5,000 次 run row 写入；
- 5,000 次 event row 插入；
- 额外 lifecycle、prompt、permission trace。

内存中的 `events` 虽裁剪到 80 条，但数据库 event 表没有在本轮审计中发现按 run 自动裁剪 trace event 的路径。

### 5.4 UI 放大

`upsertAcpSkillRun({ event })` 会把 change 标为 `run/transcript`。随后：

- `src/modules/acpSkillRunStore.ts:2970` 同步遍历 change listeners；
- `src/modules/assistantWorkspaceSidebar.ts:551` 将 `run` 判定为需要刷新；
- `src/modules/assistantWorkspaceSidebar.ts:1920` 仅做 16ms 合并；
- `src/modules/taskManagerDialog.ts:4013` 也会标脏并触发 task refresh。

持续 diagnostic 风暴因此可能把 UI snapshot pulse 维持在接近每 16ms 一次。区域级 DOM signature guard 只能避免部分 DOM 重建，不能消除 change dispatch、snapshot build 和 Task Manager summary refresh。

### 5.5 已有限制

- 内存 run events 只保留近期 80 条；
- Workspace snapshot refresh 有 16ms 合并；
- transcript stage projection 会过滤不可见 diagnostic。

这些限制都没有消除逐消息同步 SQL 和逐消息 change emit。

### 5.6 待采样指标

- `jsonrpc_trace` 每秒数量；
- `persistRun()` 每秒次数、平均/P95/最大耗时；
- run row 与 event row 同步 SQL 总耗时；
- `emitChanged()` listener 数量与总耗时；
- Task Manager 打开/关闭时的差异；
- Assistant Workspace 打开/关闭时的差异。

## 6. R2：Host Bridge socket 请求读取

### 6.1 调用链

Host Bridge server 在：

- `src/modules/hostBridgeServer.ts:3189-3202` 接受 socket；
- 对每个 accepted socket 调用 `readInputStream()`；
- `src/modules/hostBridgeServer.ts:602-650` 同步循环读取请求头与 body。

当 `input.available() <= 0` 时，循环没有 `await`、timer 或其他 yield，直到读到数据、结束或达到约 500ms deadline。

Rust CLI 在：

- `cli/zotero-bridge/src/client.rs:467-487,509-530` 发送 `Connection: close`；
- `cli/zotero-bridge/src/client.rs:543-568` 每次请求新建 `TcpStream`。

因此每次 health、capability、download、upload 等 CLI HTTP 请求都会经过该同步读取入口。

### 6.2 风险判断

正常本机请求若 accept 时完整请求已进入 socket buffer，循环会很快完成。500ms 不是每次请求的固定成本。

但以下条件可能直接冻结 Zotero UI：

- 请求头/body 分片到达；
- 本机进程调度导致 `available()` 暂时为 0；
- 慢客户端；
- 多个连接连续触发同类条件。

每段 busy-spin 都发生在 Zotero 单一 JS 主线程上。多个慢连接不会真正并行执行 busy-spin，而会把同步长任务串起来。

### 6.3 现有并发限制的不足

MCP tool 层的 `runningLimit = 1` 不能覆盖：

- socket read 前置阶段；
- health/file/capability/workflow route；
- 多个 accepted callback 的前置读取。

### 6.4 待采样指标

- 每次 `readInputStream()` 同步持续时间；
- `available() <= 0` 循环次数；
- 请求 header/body 到达分片数；
- 同时 accepted/in-flight 连接数；
- 超过 16ms、50ms、100ms 的调用分布。

### 6.5 当前实现状态（2026-07-17）

`make-host-http-request-reader-nonblocking` 已将上述同步读取原子替换为
`src/modules/hostHttpRequestReader.ts` 的事件驱动 reader。reader 只在
`nsIAsyncInputStream.asyncWait()` 派发到 Zotero 主线程的 readiness callback
中读取当前 `available()` bytes；未完整时重新注册一次性通知，不再同步等待未来
网络数据，也不保留 input pump 或同步 fallback。

初次实现完成后的生产探测发现一处会让该路径完全不可用的宿主差异：accepted
callback 在打开 input/output stream 后直接构造全局 `AbortController`，而实际 Zotero
插件沙箱没有该 DOM constructor。异常发生在连接登记和清理边界之前，导致 reader、
idle/total timer 和 handler 均未启动，客户端收不到任何响应，Zotero 则保留
`CLOSE_WAIT`。Firefox RDP 的 pause-on-exception 在生产 bundle 中捕获到精确异常
`ReferenceError: AbortController is not defined`；因此该故障与 CLI 0.2.1、端口绑定或
`nsIAsyncInputStream.asyncWait()` 本身无关。

`repair-host-bridge-async-socket-lifecycle` 将 reader 改为返回自身拥有的
`{ completion, abort }` 操作，通过 XPCOM thread-manager service 获取主线程 event
target，不再依赖 DOM、Window 或 Node cancellation global。accepted connection 的
stream 打开、read operation 创建和 registry 登记现在位于同一异常安全边界；部分
初始化失败、shutdown、stale generation 和 write failure 都执行幂等 abort cleanup。
成功响应则由 output stream 完成 close 后只释放 registry ownership，不再立即调用
`transport.close(0)` 截断尚未送达客户端的响应。

实施时确认了一处审计代码漂移：生产 `/mcp` 在本 change 之前已经由
`hostBridgeServer.ts` 的统一 Host Access listener 路由，
`zoteroMcpServer.ts` 中独立 socket、同步 reader/writer、listener 与 watchdog
链均不可达。本 change 删除了该遗留双轨；MCP parser、JSON-RPC handler、failure
response 测试 helper 和公开 descriptor/status DTO 保持不变。

当前读取合同为：64 KiB header、16 MiB transport body、500ms idle timeout、
30s hard deadline；每次非空读取重置 idle timer，hard deadline 不移动。缺少
`Content-Length` 视为零 body；非法/负数/冲突 Content-Length、chunked transfer、
超额或额外 body bytes、提前 EOF 均在业务 handler 前失败。普通 route 的 1 MiB
与 upload 的 16 MiB 业务限制仍由 Host Bridge handler 作为 SSOT 执行。

accepted connection 现在由 listener generation 拥有。shutdown/restart 先失效
generation，再 abort/关闭全部 accepted connection；迟到 stop/request callback
不能修改新 server。请求级 timeout、framing、EOF 或 read error 只清理本连接并映射
431/413/408/400/500，不再把 listener 状态改成 `error`。本次修复只移除了 R2 引入的
成功路径 transport 提前关闭竞态，仍不扩展为通用 async response writer（R11），也
不增加 accepted connection 数量/背压策略（R5）。

## 7. R3：静默模式仍触发完整 Assistant Workspace snapshot

### 7.1 ACP Skills progress 发布

`src/modules/acpSkillRunStore.ts:3991-4032` 在 silent early-return 前仍执行：

- `updateAcpExecutionProgress()`；
- `snapshotAcpMessageCounts()`；
- progress state 更新；
- `emitChanged(...["progress"])`。

`src/modules/assistantWorkspaceSidebar.ts:540-580` 只将特定 transcript/runtime-options 变化视为纯后台变化；`progress` 被判定为需要刷新。

### 7.2 ACP Chat critical metadata 发布

`src/modules/acpSessionManager.ts:2635-2658` 在 `countChanged` 时发布：

```text
uiReason: "critical"
publishMode: "metadata"
```

`src/modules/acpSessionManager.ts:731-745` 将 metadata 归类为 status；`src/modules/acpChatPanelReadModel.ts:447-475` 对 active conversation 的 status 刷新 panel。

### 7.3 完整 snapshot 的前置成本

`src/modules/acpSkillRunStore.ts:5711-5815` 每次构建 ACP Skills snapshot 都可能执行：

- 枚举和投影近期 runs；
- 查询 selected task/runtime options；
- 读取、过滤和映射最多 120 条 runtime logs；
- 查询 MCP、health 和 Host Bridge 状态；
- 投影 selected run；
- 读取 selected transcript page。

`src/modules/assistantTranscriptPageProjection.ts:38-74` 当前先对全部 `itemIds` 做 map/filter，再 slice 当前页。长 transcript 下，读取一页仍为 O(total)，不是 O(page)。

### 7.4 signature guard 太晚

`src/modules/assistantWorkspaceSidebar.ts:1501-1582` 先完整构建 snapshot，之后才计算和比较 signature。

`src/modules/assistantWorkspaceSidebar.ts:1447-1498` 的 canonicalization 主要移除 `generatedAt`，随后 `JSON.stringify` 大部分 payload，包括：

- runs；
- logs；
- selected run；
- message counts；
- selected transcript page items。

即使最终 signature 相同、消息没有发布，构建与 stringify 成本已经发生。

### 7.5 两级 `postMessage` 复制

payload 会经过：

```text
Host -> Assistant Workspace shell -> child iframe
```

关键路径：

- Host：`src/modules/assistantWorkspaceSidebar.ts:1282-1312`
- Shell cache/replay：`addon/content/sidebar/assistant-workspace.js:413-448`
- Shell 到 child：`addon/content/sidebar/assistant-workspace.js:360-393`

包含 runs、logs 和 transcript page 的 payload 因此可能经历两次 structured clone，并形成短生命周期对象和 GC 压力。

### 7.6 DOM 区域保护的现状

以下区域已使用独立 signature guard：

- toolbar；
- banner；
- message counter；
- plan；
- hint；
- reply；
- context/details/permission drawer。

相关实现位于 `addon/content/shared/assistant/assistant-panel-renderer.js:2474-2730`。

`addon/content/sidebar/acp-skill-run.js:381-408` 的 chrome key 也未包含 transcript revision/page/logs。

所以当前主要风险不是“每个 chunk 都重建全部 DOM”，而是 **DOM guard 之前的 host snapshot、签名、复制和 child 消息处理已经发生**。

### 7.7 inactive transcript stripping 缺口

`src/modules/assistantSidebarViewModel.ts:99-141` 清空了旧字段：

- ACP Chat 顶层 `items`；
- ACP Skills `selectedRun/runs.transcriptItems`。

但当前 transcript SSOT 是 `selectedTranscriptPage.items`，该字段没有被清空，payload metadata 却仍声明 `transcript.stripped = true`。

触发边界：

- Workspace init/重建时会对三个 tab 强制发布 baseline，见 `src/modules/assistantWorkspaceSidebar.ts:1840-1850`；
- inactive child 首次 ready 时会强制发送 init snapshot，见 `src/modules/assistantWorkspaceSidebar.ts:1890-1897`；
- 常规后台 store change 通常只发布当前 active tab，不会在每次后台 update 都重复发送该 page。

现有 `test/node/core/94-skillrunner-sidebar-model.test.ts` 主要锁定旧 `transcriptItems`，没有覆盖 `selectedTranscriptPage.items`。

### 7.8 跨 tab 无关刷新

ACP Skills progress/run change 在刷新判定处没有先按 active tab/selected owner 过滤，可能导致 ACP Skills 后台运行时刷新当前另一个 active tab。其结果不是把每个 ACP page 发到隐藏 iframe，而是引入与当前 tab 无关的 snapshot/read-model 工作。

### 7.9 待采样指标

- `prepareAcpSkillRunPanelSnapshot()` 单次与累计耗时；
- transcript page projection 扫描 item 数；
- snapshot signature payload 字节数与 stringify 耗时；
- Host→shell、shell→child payload 字节数与次数；
- active/inactive tab 下的 snapshot 次数；
- Workspace 和 Task Manager 分别关闭时的对照数据。

## 8. R4/R5：无界 assistant 累积与 transport 队列

### 8.1 双份 assistant chunk 累积

第一份：

- `src/modules/acpSkillRunnerOrchestrator.ts:275`
- `assistantTurnAccumulator` 对每个 assistant chunk 执行 `chunks.push()`；
- turn 结束时通过 `join("")` 生成完整文本。

第二份：

- `src/modules/acpExecutionProgress.ts:115,163`
- `terminalCandidateChunks.push()` 无字节或条目上限；
- ACP Skills silent turn boundary 最后在 `src/modules/acpSkillRunStore.ts:4141` discard，但此前一直保留。

长输出因此会：

- 线性增加数组、字符串和引用数量；
- 在最终 `join` 时额外分配完整字符串；
- 增加 GC 和主线程停顿概率。

第二份 progress candidate 在 ACP Skills 最终输出路径中的必要性值得单独复核。

### 8.2 transport queue

- Node transport stdout reader 使用无界 `Uint8Array[]` queue，见 `src/modules/acpTransport.ts:1363`；
- WebSocket bridge 使用无容量限制的 `stdoutQueue` 和不断延长的 promise `messageQueue`，见 `src/modules/acpTransport.ts:1638,1816`；
- frame 处理中还包含 decode、`TextDecoder`、64 KiB tail 拼接和 audit callback。

若生产速度高于 session update listener 的消费速度，queue、promise chain 和临时对象会持续积压。

### 8.3 与 R1/R8 的耦合

`AcpConnectionAdapter.emitSessionUpdate()` 在 `src/modules/acpConnectionAdapter.ts:592-637` 对 update listeners 逐个 `await`。若 listener 被 audit、同步持久化或其他工作拖慢，receive loop 会更慢，反过来放大 transport queue。

### 8.4 已有限制

stdout/stderr 文本 tail 限制为 64 KiB，见 `src/modules/acpTransport.ts:169-185`。因此 tail 字符串不是无界增长，但每个 chunk 仍发生拼接和截尾复制。

### 8.5 待采样指标

- assistant chunk 数、累计字节数；
- 两个 accumulator 的峰值条目数；
- final `join` 耗时；
- stdout/message queue 峰值条目数和字节数；
- receive/dispatch 消费速率；
- heap 峰值、GC 次数与最长 pause。

## 9. R6/R11：附件和 Host Bridge 大 payload

### 9.1 附件 handle 注册

`library.get_item_attachments` 在 `src/modules/zoteroHostCapabilityBroker.ts:3492-3520` 获取附件路径。

`src/modules/hostBridgeCapabilityRegistry.ts:97-145` 随后对所有附件执行 `Promise.all(registerHostBridgeFileHandle)`。

若调用方未提供 sha，`src/modules/hostBridgeFileRegistry.ts:256-286` 会：

1. 整文件读入内存；
2. 计算 SHA-256；
3. 为多个附件并行执行上述步骤。

### 9.2 下载再次整文件读取

`src/modules/hostBridgeFileRegistry.ts:390-440` 在 download 时再次：

- 整文件读取；
- SHA-256 校验；
- 将完整 bytes 交给 server。

`src/modules/hostBridgeServer.ts:1046-1068` 输出二进制时每 32 KiB 执行 `slice` 与 `Array.from`。

当前 download 未见总文件大小上限；upload 有 16 MiB 上限，但不能保护 download。

### 9.3 无 WebCrypto fallback

`src/modules/hostBridgeFileRegistry.ts:187-224` 的 XPCOM hash fallback 会同步执行：

```text
hash.update(Array.from(bytes), bytes.length)
```

这会把整个 byte buffer 转成 JS number array，具有显著的主线程和内存放大风险。

### 9.4 JSON capability result 的重复复制

`src/modules/hostBridgeCapabilityRegistry.ts:90-95,147-160` 对 capability result 做 `JSON.stringify`/`JSON.parse` 深拷贝。

`src/modules/hostBridgeServer.ts:1071-1085` 又执行：

- `JSON.stringify`；
- UTF-8 encode；
- content-length 计算；
- XPCOM stream 写出。

大型 synthesis/full response 或大结构化结果会产生重复序列化和临时内存峰值。

### 9.5 待采样指标

- 每次附件注册读取的总字节数；
- 同时 hash 的附件数量；
- 注册与下载的 heap 增量；
- WebCrypto 与 XPCOM fallback 实际分支；
- JSON response 大小、clone/stringify/encode 耗时。

## 10. R7：分页 API 重复全库扫描

`src/modules/zoteroHostCapabilityBroker.ts:3020-3075` 的 `selectLibraryItemPage()` 每页都会：

1. `Zotero.Items.getAll()`；
2. 多轮 filter；
3. query 时拼接 title、creators、abstract、tags；
4. 对全量候选排序；
5. 最后才 slice 当前页。

页大小上限 200 只限制返回条目数，不限制扫描和排序的总条目数。

`src/modules/zoteroHostCapabilityBroker.ts:3371-3403` 的 search path 也会先读取全库。

在大型 Zotero 库上，多页读取会重复 O(N) 到 O(N log N) 工作。字符串拼接、过滤和排序的同步 CPU 部分发生在 Zotero JS 主线程。

`readinessAudit` 还会逐页逐项检查 artifact readiness，可能把重复分页扫描进一步放大。

待采样指标：

- library 总条目数与候选条目数；
- 每页扫描、过滤、排序耗时；
- query 字段拼接的字符串字节数；
- 连续分页时的累计 CPU 时间。

## 11. R8/R9：runtime log、audit 与 transcript 持久化

### 11.1 Runtime logger

`src/modules/runtimeLogManager.ts:314-330,969-976,1015-1058,1166-1180` 显示，每条日志可能执行：

- sanitize；
- JSON size 估算；
- retention；
- 有 listener 时克隆完整日志 snapshot。

保留上限约为普通 2,000 条、诊断 3,000 条。

`src/modules/runtimeLogManager.ts:804-830` 在 25ms debounce 后仍会 `JSON.stringify` 整份日志文档。文件写入可能是异步的，但 stringify、clone 和临时对象分配仍发生在主线程。

### 11.2 Debug audit

ACP Skills update listener 在 `src/modules/acpSkillRunnerOrchestrator.ts:4615` 先 `await appendAcpSkillRunAuditUpdate()`。

详细 audit 由 debug mode 开启，与 silent mode 相互独立。开启后，每个 update 会执行：

- 最深 6 层递归 sanitize；
- 字符串清洗；
- `JSON.stringify`；
- buffered write enqueue。

关键实现：

- `src/modules/acpSkillRunAuditTrail.ts:92,115,487-575`
- `src/modules/bufferedWriteCoordinator.ts:1-145`

写盘已经按 2 秒、128 KiB 或 256 条批处理，但逐 update 的 sanitize/serialize/enqueue 成本仍存在。

即使不开 debug，每个 run 仍写 README/run.json、有限大小的 prompt、stderr、runtime logs 和 final state，见 `src/modules/acpSkillRunAuditTrail.ts:336-366,579-683`。

### 11.3 Zotero runtime 的同步 append fallback

`src/modules/runtimePersistence.ts:771-780` 只在 `globalThis.process` 存在且可导入 `fs/promises` 时走 Node 分支。

标准 Zotero chrome/plugin runtime 通常没有 Node `process`。常规 read/write/stat/list 可以优先走异步 IOUtils，但：

- `appendRuntimeTextFile()` 没有 IOUtils append 分支；无 Node 时走同步 XPCOM converter `writeString`，见 `src/modules/runtimePersistence.ts:1337-1369`；
- `readRuntimeTextRanges()` 无 Node random access 时走同步 seek/readByteArray，见 `src/modules/runtimePersistence.ts:1195-1288`。

这意味着 transcript/audit buffered append 到达时间或大小阈值时，可能形成周期性的主线程批量写。

### 11.4 Transcript index

`src/modules/acpSkillRunTranscriptStore.ts:24-29,705-777` 每约 1 MiB 或 30 秒 checkpoint 完整 index。

索引缺失或失效时，`src/modules/acpSkillRunTranscriptStore.ts:187-209,656-703` 会：

- 全量读取 transcript；
- regex 切行；
- 逐行 JSON parse；
- 重建 index。

这类恢复路径不是每次运行都发生，但长 transcript 或异常退出后可能产生明显长任务。

### 11.5 待采样指标

- 每秒 runtime log 数；
- 每次完整日志 snapshot clone/stringify 的耗时与字节数；
- debug on/off 对照；
- buffered append 批次字节数与同步写时长；
- index checkpoint/rebuild 次数和耗时；
- 实际 runtime 分支：Node、IOUtils、Components。

## 12. R10：批量 Zotero mutation 的事务与 Notifier 放大

`src/handlers/index.ts:614-637,678-720` 的标签和 collection 操作对每个 item 单独执行 `await item.saveTx()`。

`src/modules/zoteroHostCapabilityBroker.ts:2552-2561` 将 target 上限设为 50，但这仍意味着单次调用最多可能产生 50 个独立事务边界。

已证实的是：

- mutation 不是在统一事务中批量提交；
- 每个 item 都独立 save。

需要 profiler 才能确认的是：

- 每次 save 触发多少 Zotero Notifier observer；
- 索引、列表刷新、条目 pane 更新的实际耗时；
- UI 可见与不可见时是否存在差异。

静默模式只影响 Assistant Workspace 展示，不抑制 Zotero 数据库、Notifier 或宿主 UI observer。

## 13. R12：workspace 与资源目录递归 I/O

以下路径会串行递归 scan/stat/copy：

- `src/modules/runtimePersistence.ts:1465-1499`：collect runtime files；
- `src/modules/runtimePersistence.ts:1626-1649`：copy runtime directory；
- `src/modules/acpSkillResourceManifest.ts:26-47`：skill resource manifest；
- `src/modules/acpSkillResultFileFallback.ts:44-82`：workspace result fallback scan。

大多数文件 API 可能是 async，但大量小文件会带来：

- 高频 promise completion 回到主线程；
- 路径对象与数组分配；
- 排序和过滤；
- 深目录递归；
- 与 transcript/log I/O 的竞争。

静默模式关闭的是 15 秒 workspace activity heartbeat，不会自动关闭 run prepare、resource manifest、result fallback 或 product copy 等业务必需扫描。

## 14. 三条典型卡顿因果链

### 14.1 高频文本/tool update

```text
ACP notification burst
  -> JSON-RPC trace diagnostic
  -> full run stringify
  -> sync run/event SQL
  -> change emit
  -> 16ms snapshot pulse
  -> full snapshot build/signature
  -> two structured clones
  -> listener 消费变慢
  -> transport queue 积压
  -> heap/GC 抖动
```

### 14.2 Host Bridge 大附件

```text
agent 调用 attachment capability
  -> Host Bridge socket accept
  -> 条件性同步 read busy-spin
  -> 获取附件列表
  -> 多附件 Promise.all 整文件读取/hash
  -> 返回大 JSON/file handle
  -> download 再次整文件读取/hash
  -> 32KiB slice + Array.from 同步写出
  -> heap 峰值与 UI 长任务
```

### 14.3 大库 mutation/search

```text
agent 连续分页查询
  -> 每页 getAll
  -> 全量字段拼接/filter/sort
  -> capability response stringify/copy
  -> agent 发起批量 mutation
  -> 逐 item saveTx
  -> Notifier/索引/UI observer
```

## 15. 本轮排除或降低优先级的因素

### 15.1 未发现 ACP Skills 主执行路径存在高频 polling busy-loop

本轮没有发现 ACP Skills 主执行路径中用于轮询任务状态的高频同步 busy-loop。

- hard timeout 是单个 timer；
- workspace activity heartbeat 是 15 秒周期，并且 silent 已禁用。

因此普通 polling 不是当前首要怀疑对象。

### 15.2 transcript DOM 并非每个 silent chunk 都重建

区域级 signature guard、transcript revision/page signature 和 owner scope 基本存在。普通 silent chunk 通常不会重建 toolbar、drawer、reply 等 shared managed region。

仍需关注的是：

- host snapshot 和 structured clone 成本发生在 DOM guard 之前；
- boundary、terminal、owner switch、翻页和 row 高度变化时，transcript renderer 仍可能读取 layout 并重建 visible window。

相关路径：

- `addon/content/sidebar/acp-skill-run.js:897-983`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:835-877,1039-1144,1907-2085`

### 15.3 stdout/stderr tail 并非无界

tail 上限为 64 KiB。真正无界的是 frame/message queue 和 assistant chunk accumulator，而不是最终展示的 stdout/stderr tail。

## 16. 建议的性能复现矩阵

后续 profiling 不应只比较 `live` 与 `silent`。建议至少覆盖以下维度：

| 维度 | 对照组 |
| --- | --- |
| 展示模式 | live / boundary / silent |
| Assistant Workspace | 关闭 / 打开但其他 tab active / ACP Skills active |
| Task Manager | 关闭 / 打开 |
| Debug audit | 关闭 / 打开 |
| ACP 输出形态 | 少量大 chunk / 大量小 chunk / tool update 密集 |
| Transcript 历史 | 短 / 长 / index 失效恢复 |
| Zotero 库规模 | 小库 / 大库 |
| Host Bridge | 无调用 / 高频小调用 / 大附件 / 大 JSON |
| Mutation | 无写入 / 单条 / 50 条批量 |
| Transport | stdio / WebSocket bridge |

建议为每组记录：

- Zotero 主线程超过 16ms、50ms、100ms 的 long task；
- UI 最大无响应时长；
- `jsonrpc_trace` 数量；
- run/event SQL 次数和累计耗时；
- panel snapshot 次数、构建耗时和 payload 字节数；
- heap 峰值和 GC pause；
- transport queue 深度；
- Host Bridge 单请求同步时间；
- runtime log/audit/transcript 写入批次。

## 17. 是否需要先建立 profiler

### 17.1 结论

需要，但应建立的是一个窄型、低侵入的 **ACP runtime performance profiler**，不是通用 APM，也不是逐事件性能日志。

profiler 的作用是回答三个治理问题：

1. 卡顿主要来自调用次数、单次同步长任务、payload/queue 规模，还是 GC 放大；
2. 一项治理是否真正减少了成本，还是把成本转移到另一个持久化、snapshot 或日志路径；
3. Zotero 7、Zotero 9、不同 UI 打开状态和不同 ACP transport 下是否得到同样结论。

R1、R2、R3 的最小 profiler 与 baseline 应作为第一批结构治理的前置门槛。例外是已经违反明确不变量的路径，例如 R2 的 socket busy-spin、inactive transcript stripping 和同步 XPCOM 热路径：这些问题不需要 profiler 才能判断设计错误，可以在同一 change 中先建立探针和失败测试，再立即替换旧实现。

profiler 不是要求“把 R1-R12 全部采完后才能改代码”。合理门槛是：

- 首轮先覆盖 R1、R2、R3 和全局 event-loop drift；
- 涉及阈值的阶段，在实施前补相应规模指标；
- 每个阶段使用同一 fixture 做治理前后对照；
- profiler 本身必须通过低开销和有界性验收。

### 17.2 现有基础设施及其边界

仓库已有以下可复用能力：

1. `test/zotero/performanceProbeDigest.ts`
   - 由 `ZOTERO_TEST_PERF_PROBE` opt-in；
   - 采集测试生命周期资源快照、`setTimeout(0)` event-loop lag 和 operation span；
   - 内存收集，测试结束时一次性写入 `artifact/test-diagnostics/`。
2. `src/modules/testPerformanceProbeBridge.ts`
   - disabled 时近似 no-op；
   - 已覆盖部分 selection context、workflow runtime、host API/handlers 和测试清理 span。
3. `src/modules/runtimeLogManager.ts`
   - 已有有界 retention 和显式 diagnostic bundle 导出通道。
4. `src/modules/bufferedWriteCoordinator.ts`
   - 已提供 transcript/audit 等批写的统一 drain 边界。
5. `src/modules/synthesis/jobProfiler.ts`
   - 是 debug-only 的业务阶段 profiler，但会写 SQLite，不适用于高频 ACP 热路径。

现有 test performance probe 适合测试套件尾部退化诊断，但不能直接承担 ACP runtime profiler：

- 没有 request-scoped ACP session；
- 不覆盖 diagnostic→persist、Host Bridge socket、panel snapshot 和 transport queue；
- 保存 raw span，若直接用于高频 update 会线性增长；
- suite lifecycle 与 runtime task lifecycle 是不同职责。

因此不应扩张 `testPerformanceProbeBridge` 的语义，而应新增独立 profiler，只复用最终 test artifact 和 diagnostic bundle 的导出通道。

### 17.3 profiler 的最小架构

建议新增：

```text
src/modules/acpRuntimePerformanceProfiler.ts
```

它是运行时性能数据的唯一 SSOT。不得在各模块各自保存 profiler state。

核心 DTO：

```ts
type AcpRuntimeProfileContext = {
  requestId: string;
  displayMode: "live" | "boundary" | "silent";
  transport: "stdio" | "websocket" | "unknown";
  zoteroMajor: 7 | 9 | "unknown";
};

type AcpRuntimeDurationMetric = {
  count: number;
  totalMs: number;
  maxMs: number;
  buckets: readonly number[];
};

type AcpRuntimeCounterMetric = {
  total: number;
};

type AcpRuntimeGaugeMetric = {
  current: number;
  max: number;
};
```

metric name 必须是固定联合类型，调用方不能传任意字符串。labels 只允许固定低基数枚举：

- `updateClass`；
- `changeKind`；
- `surfaceState`；
- `operationClass`；
- `persistenceChannel`。

以下字段禁止进入聚合 key：

- `requestId`；
- backend/provider id；
- workflow/skill id；
- command、tool name、path；
- conversation title 或用户文本。

`requestId` 只用于 active/finished session 关联和显式导出，不参与 metric cardinality。

最小 API：

```ts
startAcpRuntimeProfile(context): void
finishAcpRuntimeProfile(requestId): void
incrementAcpRuntimeMetric(requestId, name, labels?, delta?): void
observeAcpRuntimeDuration(requestId, name, labels, durationMs): void
observeAcpRuntimeGauge(requestId, name, labels, value): void
snapshotAcpRuntimeProfiles(): AcpRuntimePerformanceSnapshot
resetAcpRuntimePerformanceProfilerForTests(): void
configureAcpRuntimePerformanceProfilerForTests(options): void
```

约束：

- duration 只保存 count/total/max 和定长 histogram；建议桶为 `1/4/8/16/33/50/100/250/500/1000/5000ms`；
- counter 只保存 total；
- gauge 只保存 current/max；
- 最近完成 session 固定保留 8 个；
- 第一版不保存 raw sample；如后续确有必要，每 session 最多保留 Top 8 slow sample；
- profiler 内部异常必须被吞掉，不改变业务返回值、异常或调度边界；
- 业务热路径不得 `await` profiler；
- disabled 时不创建 timer、session、metric Map 或导出对象，仅有一次廉价 enabled 分支。

计时使用 `performance.now()`，不存在时回退到 `Date.now()`。不要依赖 Node API、Long Tasks `PerformanceObserver` 或新的 Gecko-only API。

### 17.4 event-loop drift

全局只保留一个递归 `setTimeout(100ms)` drift probe：

- 仅在 profiler enabled 且至少有一个 active session 时存在；
- callback 只计算 drift 并更新定长聚合；
- 记录 max 以及超过 16/50/100ms 的次数；
- 不为每个 request 建独立 timer；
- 最后一个 active session 完成后立即停止。

它只能反映主线程被延迟，不能代替 Gecko profiler 的完整 flame graph。发生显著 drift 后，再用 Firefox/Gecko Profiler 做人工深挖；不把 Gecko profiler 集成进插件运行路径。

### 17.5 首版必须采集的指标

#### R1：JSON-RPC、diagnostic 与 persistence

| 采样点 | 指标 | 约束 |
| --- | --- | --- |
| `acpClientConnection.processMessage/traceMessage` | 入站/出站消息分类计数 | 复用已生成 trace 长度，不为 profiler 再 stringify |
| `acpConnectionAdapter.emitTrace/emitDiagnostic/emitSessionUpdate` | trace、diagnostic、session update 数 | 只用固定 update class |
| orchestrator 两处 diagnostic listener | diagnostic→upsert 次数 | 用于证明 R1 现状，治理后应归零 |
| `acpSkillRunStore.persistRun` | count、duration、payload bytes | bytes 复用实际 persistence JSON length |
| `pluginStateStore` run/event write | SQL count、total/max duration | run row 与 event row 分开 |
| `emitChanged/scheduleChangedEmit` | requested、emitted、coalesced | changeKind 为固定枚举 |

#### R2：Host Bridge

| 采样点 | 指标 | 约束 |
| --- | --- | --- |
| socket request reader | duration、bytes、分片/yield、in-flight | 重点统计 >16/50/100ms |
| `handleHttpRequest` | request/response duration 与 bytes | route 只分 file/library/mutation/workflow/diagnostic/other |

#### R3：Assistant Workspace

| 采样点 | 指标 | 约束 |
| --- | --- | --- |
| `prepareAcpSkillRunPanelSnapshot` | count、total/max duration | surfaceState 为 closed/open-inactive/acp-active |
| selected transcript page read | count、duration、扫描 item 数 | 不把 metric 写入 snapshot |
| `buildAcpSkillRunSnapshotSignature` | count、duration、signature length | 复用现成字符串 |
| Host→shell、shell→child post | count、调用 duration | 第一版不为估算 bytes 再 stringify |

#### 有界性与批写

- transport enqueue/dequeue、peak entries/bytes；
- assistant accumulator peak chunks/bytes；
- buffered write batch count/bytes/duration；
- channel 只分 transcript/audit/runtime-log/other。

### 17.6 暂不纳入首版的指标

以下数据跨 Zotero 7/9 缺乏稳定、低开销统一 API，不应拖慢首版：

- 精确 heap、RSS 和 GC pause；
- 每个 Zotero Notifier observer 的细分耗时；
- 每个 capability/tool/backend 的独立标签；
- 每个目录或文件的 scan span；
- 每个 hash chunk 的 raw timing；
- 周期性 `ChromeUtils.requestProcInfo()`。

需要时使用 Gecko profiler、外部进程监控或专门 fixture 人工确认，不能把高开销诊断永久带入热路径。

### 17.7 开关、内存与导出

profiler 只存在于 debug 构建，并受 `src/modules/debugMode.ts` 中的硬编码 source switch 控制；在 debug 内仍需显式开始采集。不新增 hidden pref。debug Dashboard 提供统一的 ACP Trace & Replay 两步页；Recorder 与 Replay 继续由独立 source switch 和状态机控制。非 debug 或 source switch 关闭时，通过直接 guard、side-effect-free 模块声明和 syntax folding 消除对应热路径调用；`npm run check:acp-profiler-release-elision` 同时锁定这些关闭边界。

debug build 与 profiler enabled 是两个独立状态：普通 debug build 不分配 profiler state、不启动 drift timer；自动化测试通过 `setDebugModeOverrideForTests(true)` 后显式启用。由于 detailed audit 与 profiler 都属于 debug 构建能力，本夹具不把 debug on/off 当作纯粹的 profiler 开销对照。

运行中：

- 纯内存聚合；
- 不逐事件写 runtime log；
- 不逐事件写 SQLite/JSONL/JSON；
- 不深拷贝业务 DTO；
- 不把 profiler revision/metric 放入 panel snapshot、render key 或 region signature。

持久化仅发生在：

1. 用户显式构建现有 diagnostic bundle；
2. Zotero performance test harness domain-end；
3. 用户在 debug Dashboard 中显式停止并保存 trace，或完成/取消 replay matrix。

Dashboard 的统一诊断页不轮询。Recorder 支持 Stop、Cancel、Save、New Recording 与 Open Folder；Replay 支持原生文件选择、预检、逐 record 进度、Cancel、Retry 与 Open Result Folder。取消保留 incomplete 工件而不自动删除。两个 view 只进入同一个 selected-surface signature，不进入 Dashboard chrome，也不进入 Assistant Workspace snapshot/signature/render key；进度刷新只能发生在 profile window 之外。

`test/zotero/performanceProbeDigest.ts` 在 `ZOTERO_TEST_PERF_PROBE=1` 时可以程序化启用 runtime profiler，并在最终一次 JSON flush 中附加聚合结果。高频 runtime metric 不写入现有 raw `spans[]`。

### 17.8 profiler 文件级实施清单

新增：

- `src/modules/acpRuntimePerformanceProfiler.ts`
- `src/modules/acpRuntimePerformanceBaseline.ts`
- `src/modules/acpRuntimeSemanticTraceRecorder.ts`
- `src/modules/acpRuntimeReplayProfiler.ts`
- `src/modules/acpRuntimeReplayTargets.ts`
- `test/helpers/acpRuntimePerformanceHarness.ts`
- `test/core/175-acp-runtime-performance-profiler.test.ts`
- `test/core/176-acp-silent-runtime-performance-baseline.test.ts`
- `scripts/acp-runtime-profiler-esbuild.ts`
- `scripts/check-acp-runtime-profiler-release-elision.ts`
- `scripts/record-acp-runtime-governance-baseline.ts`
- `test/node/core/97-acp-runtime-profiler-release-elision.test.ts`
- `artifact/performance-baselines/acp-runtime-before-governance-closed.json`
- `artifact/performance-baselines/acp-runtime-before-governance-open-inactive.json`
- `artifact/performance-baselines/acp-runtime-before-governance-acp-active.json`
- `artifact/performance-baselines/acp-runtime-before-governance.md`
- `doc/components/acp-runtime-performance-profiler.md`

修改：

- `src/modules/debugMode.ts`
- `src/modules/acpClientConnection.ts`
- `src/modules/acpConnectionAdapter.ts`
- `src/modules/acpSkillRunnerOrchestrator.ts`
- `src/modules/acpSkillRunStore.ts`
- `src/modules/pluginStateStore.ts`
- `src/modules/assistantWorkspaceSidebar.ts`
- `src/modules/hostBridgeServer.ts`
- `src/modules/acpTransport.ts`
- `src/modules/bufferedWriteCoordinator.ts`
- `src/modules/runtimeLogManager.ts`
- `test/zotero/performanceProbeDigest.ts`
- `doc/testing-framework.md`

不删除或重命名 `src/modules/testPerformanceProbeBridge.ts`。它继续负责 suite-level operation spans，避免两类 profiler 互相污染。

### 17.9 profiler 自身验收

CI 只锁稳定行为，不锁具体毫秒数：

1. disabled 时不创建 timer/session/metric key，不写 pref、log 或文件；
2. metric、labels、sessions、histogram buckets 数量都有硬上界；
3. 10,000 次 burst 后 raw sample 数不随事件线性增长；
4. 运行中 profiler persistence/stringify 次数为 0；
5. 显式 export 只构建一次 immutable snapshot；
6. profiler 异常不影响 ACP terminal、Host Bridge response、UI snapshot 或 DOM identity；
7. profiler 不出现在 Assistant Workspace snapshot/signature/render key 中。

### 17.10 baseline 方案

CI 基线使用固定时钟、固定 1,000-update 事件序列和 Zotero mock，按 `closed`、`open-inactive`、`acp-active` 的固定顺序运行三个相互重置的场景。三者都通过 ACP JSON-RPC、run persistence、Host Bridge input/handler 和 buffered-write production seam；closed 场景不触发 Assistant Workspace publication，并要求 R3 全零，两个 open 场景则通过 prepare/signature/post seam 并保留各自的 `surfaceState` 归属。`npm run record:acp-runtime-before-baseline` 连续运行两次完整矩阵，任一归一化记录不一致时拒绝写入；每个 surface 的 JSON 见 `artifact/performance-baselines/acp-runtime-before-governance-<surface>.json`，汇总报告见 `artifact/performance-baselines/acp-runtime-before-governance.md`。它验证调用次数、归属、聚合、有界性和导出结构，不锁具体毫秒值，也不声称复现真实 Zotero 卡顿。

需要宿主校准时，在 dev/debug 构建的 Dashboard ACP Trace & Replay 页中，于 Zotero 7 与 Zotero 9 分别录制真实 Chat/Workflow trace 并运行固定九次矩阵。每个 surface 的第一次运行仍是 warm-up。另需验证取消会保留 incomplete matrix、恢复 Workspace，且保存或取消后无需重启即可开始下一轮录制。完整操作见 `doc/components/acp-runtime-performance-profiler.md`。真实宿主校准可覆盖：

1. silent + 大量小 assistant/tool updates，Workspace closed/open-inactive/acp-active；
2. silent + 大量 diagnostics，Task Manager closed/open；
3. Host Bridge 请求一次到齐与慢分片；
4. 不同 surface state；debug audit 干扰需要单独标注，不能当作纯 profiler on/off 对照。

每 1,000 个 updates 报告：

- full run persist 次数；
- run/event SQL 次数；
- change requested/emitted/coalesced；
- panel prepare/signature/post 次数；
- duration histogram 与 max；
- event-loop drift >16/50/100ms；
- transport/accumulator peak。

R6、R7、R9、R10、R12 实施前再扩展 fixture：

- 多个大 PDF；
- 10k/50k library items；
- 50 item mutation；
- 长 transcript index rebuild；
- 大量小文件 workspace。

## 18. 代码级治理路线图

### 18.1 总体原则

每个阶段必须遵守：

1. 先定义 DTO、接口和领域边界；
2. 建立一个新 SSOT 或 sink；
3. 原地迁移全部调用者；
4. 同一阶段删除旧入口、旧字段和旧测试假设；
5. 不长期双写、shadow compare 或保留兼容分支；
6. 对外协议不变的阶段应整体可 revert，不使用 feature flag 回滚；
7. 行为测试锁定用户可见状态和协议结果，不锁内部调用顺序或完整文案；
8. 性能测试锁次数、容量和数据流不变量，不在 CI 锁具体毫秒值。

整体依赖关系：

```text
阶段 0 profiler/baseline
       |
       +--> 阶段 1 assistant text SSOT
       |       -> 阶段 2 diagnostic 分流
       |       -> 阶段 3 queue/log 降噪
       |       -> 阶段 4 run persist 单入口
       |       -> 阶段 5 region-scoped UI publication
       |
       +--> 阶段 6 async Host HTTP reader
       |       -> 阶段 7 async runtime file primitives
       |               -> 阶段 8 streaming file/response
       |               -> 阶段 9 runtime tree manifest
       |
       +--> 阶段 10 library keyset page query
       +--> 阶段 11 atomic Zotero batch mutation
```

阶段 1-5 构成 ACP runtime/UI 治理主线。阶段 6-11 可以在 profiler 基线完成后独立推进，但共享 I/O primitive 的阶段必须按图中顺序。

### 18.2 阶段 0：建立 profiler 与基线

目标：建立治理前后可比较证据，不改变 ACP 业务协议或 Assistant Workspace 高频渲染行为；仅在 debug Dashboard 增加隔离的显式采集页签。

实施内容见第 17 节。

完成门：

- profiler disabled/no-op、有界性和异常隔离测试通过；
- 自动化 1,000-update 三 surface 机制基线可重复，closed 的 R3 为零，两个 open 状态保留各自的 R3 归属，并覆盖 R1/R2/R3 的导出入口；
- release-elision 门禁证明非 debug bundle 中 profiler 模块贡献为 0 bytes；
- Zotero 7/9 的真实计时属于可选校准，不作为 profiler 正确性或阶段完成门；
- 不要求达到任何性能目标，只要求自动化数据可重复、可解释。

### 18.3 阶段 1：统一 assistant text SSOT 与 update 顺序（R4）

#### 根因

ACP Skills 同一 assistant chunk 同时保存在：

- `createAssistantTurnAccumulator()`；
- `AcpExecutionProgressState.terminalCandidateChunks`。

Skills turn boundary 最终又直接 discard progress candidate。两套 orchestrator listener 还在处理协议状态前等待 debug audit，观测链会影响状态消费顺序。

#### 新增 DTO/模块

新增：

```text
src/modules/acpAssistantTextAccumulator.ts
```

```ts
interface AcpAssistantTextAccumulator {
  append(text: unknown): void;
  read(): string;
  take(): string;
  reset(): void;
}

type AcpSkillRunUpdateObserverContext = {
  requestId: string;
  runtimeDir?: string;
  captureAssistantText: boolean;
  assistantText: AcpAssistantTextAccumulator;
  onObservedActivity(): void;
};
```

内部实现保持简单的 `string[]`；本阶段删除重复保留，不引入 chunk file spool 或复杂 rope。但 accumulator 必须接收来自单一运行时配置的 `maxBytes`，维护累计 UTF-8 字节数，超过预算时返回或抛出结构化 `acp-assistant-output-too-large`，不得静默截断或继续无界增长。具体预算需要先由 baseline 中真实输出规模确定，Skills output 与 Chat segment 可以使用两个明确的固定档位，但不能按 backend/provider 特判。

超限处理必须复用现有 prompt/transport failure 收敛路径：停止当前 turn、保留已经持久化的 transcript、生成可诊断的结构化错误，并让既有 recovery/terminal 分类决定后续状态。不能为了性能直接返回截断后的 final output，也不能把完整内容再复制到错误 detail。

#### 修改

- `src/modules/acpSkillRunnerOrchestrator.ts`
  - 抽出唯一同步 `processAcpSkillRunSessionUpdate()`；
  - live/recovery observer 复用同一 body；
  - 先更新 activity、assistant accumulator 和 run store，再 fire-and-forget detailed audit。
- `src/modules/acpExecutionProgress.ts`
  - 只保留 message counts、open segment 和 boundary state。
- `src/modules/acpSessionManager.ts`
  - Chat session 自有 accumulator；
  - 保持 silent Chat 当前“最终 assistant segment”投影语义。
- `src/modules/acpSkillRunStore.ts`
  - 删除 Skills turn boundary 的 progress candidate discard。

#### 删除

- orchestrator 内旧 accumulator factory；
- `terminalCandidateChunks`；
- `takeAcpExecutionProgressTerminalCandidate()`；
- `discardAcpExecutionProgressCandidate()`；
- live/recovery 两套重复 update listener body。

#### 业务/UI 保护边界

不得改变：

- `classifyAcpTranscriptSemanticUpdate()`；
- tool update/usage/status 不切 assistant segment；
- ACP Skills output convergence 读取整 turn assistant text；
- ACP Chat silent terminal 的最终 assistant 投影；
- repair、result fallback、terminal envelope 和 recovery。

#### 验证

复用并扩展：

- `test/core/96-acp-session-manager-transcript.test.ts`
- `test/core/107-acp-skillrunner-compatible-runner.test.ts`

新增稳定行为：audit Promise 延迟时，session updates 仍按 adapter 到达顺序进入 accumulator 和 store。

完成门：同一 Skills assistant chunk 只存在一个输出 accumulator；现有 Chat/Skills coalescing、final output、repair/recovery 测试全部通过。

### 18.4 阶段 2：diagnostic 与 canonical run lifecycle 分离（R1）

#### 设计决策

transport/jsonrpc diagnostic 是 observability 数据，不是 run state、transcript 或 durable lifecycle event。

真正业务状态继续由显式路径维护：

- prompt failed/no output/stopped；
- connection closed/error；
- permission requested/resolved；
- waiting user/auth；
- apply/cancel/interrupt；
- terminal/final output。

#### DTO 与唯一入口

```ts
type AcpRunDiagnosticRecord = {
  requestId: string;
  ts: string;
  kind: string;
  level: "info" | "warn" | "error";
  message: string;
  detail?: string;
  stage?: string;
  code?: string | number;
};

recordAcpRunDiagnostic(record): void
```

规则：

- debug mode：进入现有 buffered audit；
- warn/error：进入 runtime log；
- info：只计 profiler，debug 开启时进入 audit；
- 不修改 `AcpSkillRunRecord`、status、events、transcript；
- details drawer 若需要诊断内容，从现有 logs read model 读取，不保留 events+logs 双写。

#### 修改

- `src/modules/acpSkillRunnerOrchestrator.ts`
  - 两处 diagnostic observer 复用同一 handler；
  - 删除 diagnostic→`upsertAcpSkillRun({event})`。
- `src/modules/acpSkillRunAuditTrail.ts`
  - 接受规范化 diagnostic DTO；
  - 保持原有 buffered writer。
- 必要时调整 runtime log/read model，不改 UI DTO 文案契约。

#### 删除

- 两份 `acp-${kind}` canonical event 生成逻辑；
- diagnostic 导致 `run/transcript` invalidation 的路径；
- 仅为显示 transport diagnostic 而依赖 `selectedRun.events` 的读取分支。

#### 保护边界

- connection/prompt/permission/terminal 的显式状态更新必须原样保留；
- debug audit 写失败不得影响 run；
- Chat 已有 diagnostic 合并/展示语义单独保留，不用 Skills 修复覆盖 Chat 行为。

#### 验证

扩展 `test/core/107-acp-skillrunner-compatible-runner.test.ts`：

- 10,000 条 info diagnostic 不产生 10,000 次 run persist/change emit；
- warn/error 可在 runtime log/debug audit 中找到；
- diagnostic 不改变 run status、transcript 或 final output；
- prompt/connection/permission/terminal 事件仍持久化。

治理效果门：`diagnostic→full run persist` 计数归零，R1 baseline 中同步 run/event SQL 与 update 数解耦。

### 18.5 阶段 3：queue、transport 与 runtime log 有界化（R5/R8）

本阶段分为两个独立 change，避免同时改 queue 和 persistence。

#### 阶段 3A：Job progress pulse

新增内部 DTO：

```ts
type JobProgressPulse = {
  jobId: string;
  updatedAt: string;
  latestType: string;
};
```

修改 `src/jobQueue/manager.ts`：

- `onJobProgress` 仍逐事件同步调用，保持 request-created/ready/meta 等业务状态；
- `touch + emitJobUpdated` 改为同一 tick 或固定短窗口合并 pulse；
- terminal 前强制 flush；
- 删除逐 progress debug runtime log；
- 保留 enqueue、dispatch start、deferred、terminal、recoverable/terminal error 日志。

验证：

- `test/core/63-job-queue-progress.test.ts`
- `test/core/32-job-queue-transport-integration.test.ts`

必须证明业务 progress 无丢失、terminal 必达、job updated 次数有界。

#### 阶段 3B：runtime log async persistence

定义：

```ts
interface RuntimeLogPersistencePort {
  load(): Promise<string>;
  save(document: string): Promise<void>;
}
```

修改 `src/modules/runtimeLogManager.ts`：

- 生产实现只使用 `runtimePersistence` 的 async read/write；
- 单一 in-flight save + latest pending document；
- `flushRuntimeLogsPersistence()` 真正等待文件写完；
- listener 发布 revision/change，完整 snapshot 由诊断页显式读取；
- 删除 Node sync read/write helper 和名不副实的 async wrapper。

验证 `test/core/45-runtime-log-manager.test.ts`：

- redaction、retention、filter 保持；
- burst append 合并 save；
- explicit flush 真正 drain；
- persistence failure 不影响业务路径；
- normal/diagnostic mode 分开覆盖。

#### 阶段 3C：transport queue 容量与背压（R5）

stdio 与 WebSocket 的 inbound frame 都必须复用一个有界 FIFO，不再各自维护无容量约束的数组或 promise chain：

```ts
type AcpInboundFrame = {
  bytes: Uint8Array;
};

interface BoundedAcpFrameQueue {
  enqueue(frame: AcpInboundFrame): "accepted" | "overflow";
  next(): Promise<AcpInboundFrame | null>;
  close(error?: unknown): void;
  readonly entries: number;
  readonly bytes: number;
}
```

修改：

- `src/modules/acpTransport.ts`
- transport/connection adapter 相关测试

规则：

- 严格保持 frame 顺序；
- capacity 同时按 entries 和 bytes 计算；
- stdio reader 能暂停 pull 时使用自然背压；
- WebSocket 无法暂停生产者时，超过上限立即关闭 transport 并产生结构化 backpressure failure；
- 不丢 frame、不覆盖旧 frame、不截断 JSON；
- overflow 复用现有 transport failure/recovery 状态机，不新增 backend 特判；
- disconnect/cancel 必须释放 waiter、队列和 buffer；
- queue depth 只进 profiler gauge，不逐 frame 写日志。

容量由阶段 0 的 frame 大小与消费速率基线确定；默认值一旦确定，只能来自单一 transport policy SSOT，不能散落在 stdio/WebSocket 实现中。

测试锁定：

- burst 下严格有序；
- 慢 consumer 不超过 entries/bytes 上限；
- overflow 只产生一次 transport failure；
- cancel/disconnect 后无 pending waiter；
- overflow 后 run 进入既有可恢复或失败状态，permission/final output 不被伪造；
- normal workload 不触发 overflow。

### 18.6 阶段 4：run persistence 收敛到单一 intent/sink（R1/R3）

#### DTO

先放在 `src/modules/acpSkillRunStore.ts` 内，避免提前创建通用 repository：

```ts
type AcpSkillRunPersistIntent = {
  requestId: string;
  record: AcpSkillRunRecord;
  writeRunContext: boolean;
  writeResultJson: boolean;
  durability: "deferred" | "immediate";
};
```

唯一入口：

```ts
submitAcpSkillRunPersist(intent): void
flushAcpSkillRunPersists(requestId?): Promise<void>
```

唯一 sink 保留为内部 `persistRunNow()`。

#### 合并规则

- 同 requestId 只保留最新 record；
- `writeRunContext/writeResultJson` 用 OR 合并；
- immediate 先吸收 owner 的 deferred intent，再写一次；
- terminal、permission/waiting、final envelope、recovery handoff 使用 immediate；
- progress、stream、低信号 lifecycle 使用 deferred；
- shutdown/test 只调用统一 flush。

#### 修改与删除

修改：

- `src/modules/acpSkillRunStore.ts`
- 必要时 `src/modules/pluginStateStore.ts`

继续复用：

- `bufferedWriteCoordinator`；
- transcript batch writer；
- `runtimePersistence.writeRuntimeTextFile`；
- `flushAcpSkillRunRuntimeFileWrites`。

迁移完成后删除：

- `softRunPersistTimers`；
- `softRunPersistRecords`；
- `scheduleSoftRunPersist()`；
- 多处直接 `persistRun()` 入口。

不得保留新旧双写。若 profiler 证明 run row/event row 两次同步 SQL 仍是热点，再在 `pluginStateStore` 增加一个原子 run+event mutation；不要预先引入通用 repository。

#### 保护边界

- API 返回前，terminal/final output 必须进入 immediate sink；
- recovery 所需 status、sessionId、pending interaction、result path 不得停留在普通 debounce；
- run payload schema、event ledger 语义和 transcript store 格式不变；
- shutdown drain 与错误处理不变。

#### 验证

- `test/core/171-acp-runtime-memory-governance.test.ts`
- `test/core/107-acp-skillrunner-compatible-runner.test.ts`

新增：多次 deferred 只写一次；flags 正确 OR 合并；immediate terminal 吸收 deferred；rehydrate 能看到最终状态/result。

### 18.7 阶段 5：typed、region-scoped UI publication（R3）

本阶段最后实施，因为必须先减少 diagnostic、queue 和 persistence 生产端噪声，避免为错误事件流设计复杂 UI 协议。

#### 两层 DTO

Store 只发布领域变化，不认识 DOM：

```ts
type AcpSkillRunDomainChange = {
  requestIds: string[];
  domains: Array<
    | "lifecycle"
    | "message-counts"
    | "transcript"
    | "runtime-options"
    | "selection"
    | "collection"
    | "permission"
  >;
  urgency: "live" | "boundary" | "critical";
};
```

Workspace mapper 输出：

```ts
type AssistantWorkspaceChildPublication =
  | { kind: "baseline"; tab: AssistantWorkspaceTab; snapshot: object }
  | {
      kind: "message-counts";
      tab: "acp-chat" | "acp-skills";
      ownerKey: string;
      counts: AssistantMessageCountsSnapshot;
    }
  | {
      kind: "transcript";
      tab: "acp-chat" | "acp-skills";
      ownerKey: string;
      state: "loading" | "ready" | "failed";
      page?: TranscriptPage;
    };
```

建议新增纯 mapper：

```text
src/modules/assistantWorkspacePublication.ts
```

它只负责 domain change→publication 和 owner guard，不承载 DOM、store 或 transcript projection。

#### 路由规则

- `message-counts`：只发 owner/count DTO，不调用 panel snapshot builder；
- `transcript`：只读 selected owner page，只触发 transcript child region；
- lifecycle/runtime-options/permission/selection/collection：构建 baseline；
- 所有 runtime publication 先检查 active tab 和 selected owner；
- hidden/inactive pane 不接收运行中 region publication；
- owner switch 仍是 loading-first，然后 page-first；
- permission/terminal critical 仍可立即发 baseline 与 transcript boundary。

#### 修改

- `src/modules/acpSkillRunStore.ts`
- `src/modules/assistantWorkspaceSidebar.ts`
- `src/modules/assistantSidebarViewModel.ts`
- `addon/content/sidebar/assistant-workspace.js`
- `addon/content/sidebar/acp-skill-run.js`
- `addon/content/sidebar/acp-chat.js`

同时修复 inactive stripping：必须清空 `selectedTranscriptPage.items`，不能只清旧 `items/transcriptItems`。

#### 删除

原子迁移完成后删除：

- `AcpSkillRunSnapshotChangeKind`；
- `isPureAcpSkillRunBackgroundChange()`；
- `shouldRefreshAcpSkillRunSnapshotForChange()`；
- progress→full `schedulePostSnapshot` 路径；
- ACP Skills 整包 snapshot `JSON.stringify` signature guard；
- child 对旧 snapshot-only 协议的兼容分支。

不能长期同时发送旧 snapshot 和新 region publication。

#### UI 硬保护边界

不得改变：

- toolbar/banner/plan/hint/reply/context/details/permission 的独立 signature；
- transcript revision/page signature；
- panel owner scope 的 loading guard；
- owner-first、page-first、cold mirror LRU、pinned live mirror；
- ACP Chat/Skills shared boundary classification 与 message coalescing；
- permission、plan、reply、drawer model 和 focus；
- virtual scroll 与 bottom stickiness。

#### 验证

扩展：

- `test/core/97-acp-ui-smoke.test.ts`
- `test/core/96-acp-session-manager-transcript.test.ts`
- `test/core/171-acp-runtime-memory-governance.test.ts`
- `test/node/core/94-skillrunner-sidebar-model.test.ts`

新增不变量：

1. message-count publication 只改变 counter DOM；
2. transcript publication 不触碰任何 chrome managed region；
3. inactive owner publication 被丢弃；
4. permission/terminal baseline 仍即时出现；
5. inactive snapshot 不含 `selectedTranscriptPage.items`；
6. ordinary silent update 的 full panel snapshot/post 次数与 update 数解耦。

阶段 5 必须作为原子协议迁移整体回滚，不能以 feature flag 长期保留双轨。

### 18.8 阶段 6：事件驱动 Host HTTP request reader（R2）

R2 可以直接修，不需要等 profiler 证明 busy-spin 是错误设计。

#### 当前模块与 DTO

新增：

```text
src/modules/hostHttpRequestReader.ts
```

```ts
type HostHttpRequestReadResult = {
  bytes: Uint8Array;
  headerBytes: number;
  bodyBytes: number;
  contentLength: number;
  fragments: number;
  waits: number;
  durationMs: number;
  maxCallbackDurationMs: number;
};
```

实现只在 `nsIAsyncInputStream.asyncWait/onInputStreamReady` 回调中读取 `available()` bytes；在读取过程中执行 header、普通 body、upload body 上限和 deadline 检查。

#### 修改与删除

- 修改 `src/modules/hostBridgeServer.ts`；
- `src/modules/hostBridgeServer.ts` 作为唯一 socket owner 调用共享 reader；
- `src/modules/zoteroMcpServer.ts` 保留 MCP route handler，删除不可达的独立
  socket/read/write/watchdog 链；
- 删除生产路径全部同步 `readInputStream()`，不保留 fallback 双轨。

HTTP path、auth、status、capability 和 CLI response 不变。

#### 验证

`test/core/181-host-http-request-reader.test.ts`、
`test/core/182-host-bridge-socket.integration.test.ts` 与现有 Host Bridge/MCP
测试覆盖：

- 分片 header/body；
- `available() === 0` 后再到达；
- header/body 超限；
- timeout；
- accepted callback 立即返回，最终 parser 结果与现有行为一致。

初次 R2 验收中的真实 Zotero fixture 允许在未捕获响应字节时使用 server 内部
`requestCount/lastResponseStatus` 补出成功状态，因此只能证明 handler 侧活动，不能
证明外部客户端收到响应。该 fallback 已删除；health、binary upload 和 `/mcp`
JSON-RPC 现在都必须读取、解析并断言完整原始 HTTP response，缺少任何响应字节都会
失败。heartbeat 只保留“分片等待期间 event loop 至少运行一次”的机制断言，不再锁定
50ms 窗口内精确 interval 次数。

修复后的 Node 聚焦验证覆盖 reader、connection lifecycle、无全局
`AbortController`、部分初始化失败、partial upload、stale generation、MCP 回归与
profiler/baseline，共 53 passed、1 个真实宿主用例在 Node 环境 pending。当前已安装
Zotero 9.0.4-1 的完整 `npm run test:zotero:core` 为 24 passed，其中真实 socket
fixture 已实际收到 health、upload 和 MCP 响应。`npm run lint:check`、
`npm run build` 与
`openspec validate repair-host-bridge-async-socket-lifecycle --type change --strict --no-interactive`
均通过。

开发 Zotero 干净重启后由新 PID 1786743 在 26570 监听。CLI 0.2.1 使用默认
well-known profile 的首个 `bridge status` 在 5s 门限内返回 `ok: true`；随后 20 次
独立 status 请求全部成功。请求结束并等待 1s 后，Zotero 进程没有遗留任何
`CLOSE_WAIT`，只观察到客户端主动关闭连接后的正常 `TIME_WAIT`。当前文件系统未发现
Zotero 7 可执行文件，因此 Zotero 7 未运行，不能据此声明双版本验收完成。

治理效果门：慢分片不再产生单次近 500ms 的同步 socket read。

### 18.9 阶段 7：统一 async runtime file primitive（R9 前置）

先在 Zotero 7/9 运行时探测：

- `IOUtils.writeUTF8/write` 是否支持 append；
- `IOUtils.read` 是否支持 offset/maxBytes；
- `OS.File.open` append/random access 是否可用；
- 当前实际命中 Node、IOUtils、OS.File、Components 哪个分支。

定义唯一端口：

```ts
interface RuntimeAppendSink {
  appendText(path: string, text: string): Promise<void>;
}

interface RuntimeRangeReader {
  readRanges(
    path: string,
    ranges: Array<{ offset: number; length: number }>,
  ): Promise<string[]>;
}
```

修改：

- `src/modules/runtimePersistence.ts`
- `src/modules/acpSkillRunTranscriptStore.ts`
- `src/modules/acpSkillRunAuditTrail.ts`
- `src/modules/bufferedWriteCoordinator.ts`

迁移后：

- Zotero runtime 只走跨 Zotero 7/9 已验证的 async backend；
- 删除同步 XPCOM converter append；
- 删除同步 seek/readByteArray range 热路径；
- 若所需 async API 不存在，显式报告 runtime capability error，不能静默回退主线程同步实现；
- transcript NDJSON、index 格式和 page API 不变；
- index rebuild 使用固定块增量读取、partial-line buffer 和逐行 parse；删除 full read+regex split。

扩展 `test/core/108-runtime-persistence-governance.test.ts` 和 transcript store 测试。性能阈值由 backend kind、batch bytes、append/range/rebuild 基线决定。

### 18.10 阶段 8：streaming file transfer 与单次 response serialization（R6/R11）

#### DTO 与 SSOT

新增：

```text
src/modules/runtimeFileTransfer.ts
```

```ts
type RuntimeFileTransferSource = {
  path: string;
  size: number;
  sha256?: string;
};

type HostBridgeResolvedFileDownload = {
  descriptor: HostBridgeFileDescriptor;
  source: RuntimeFileTransferSource;
};
```

统一提供 inspect/open/readChunk/streaming digest。chunk size 和附件并发度必须由 R6 baseline 决定，不拍脑袋写死。

#### 修改

- `src/modules/hostBridgeFileRegistry.ts`
- `src/modules/hostBridgeServer.ts`
- `src/modules/hostBridgeCapabilityRegistry.ts`
- `src/modules/runtimePersistence.ts`
- 必要时 `cli/zotero-bridge/src/client.rs`、`commands.rs`

行为：

- 注册时分块 hash，附件使用有界并发；
- download 返回 source，不返回完整 bytes；
- server 使用单一 async chunk writer；
- 保留 Content-Length、Content-Type、Content-Disposition、SHA-256 header 和响应字节；
- capability handler 类型收紧为 JSON value；
- HTTP 边界只 stringify 一次。

#### 删除

- `HostBridgeResolvedFileDownload.bytes`；
- whole-buffer read/hash；
- XPCOM `hash.update(Array.from(bytes))`；
- binary writer 的 `slice + Array.from` 全数组复制；
- `normalizeJsonSafeValue()` 的 stringify/parse 深拷贝。

#### 验证

- `test/core/138-host-bridge-file-downloads.test.ts`
- `test/core/107-host-bridge-capabilities.test.ts`
- CLI Rust tests

锁定字节、长度、checksum、文件名 header、truncate/retry、capability schema；不锁内部 chunk 顺序。大文件峰值缓冲必须不超过 chunk×concurrency 的确定上界。

### 18.11 阶段 9：一次扫描的 runtime tree manifest（R12）

定义操作内 SSOT：

```ts
type RuntimeTreeEntry = {
  relativePath: string;
  absolutePath: string;
  kind: "file" | "directory";
  size: number;
  mtime?: number;
};

type RuntimeTreeManifest = {
  root: string;
  entries: RuntimeTreeEntry[];
  fileCount: number;
  totalBytes: number;
};

type RuntimeTreeScanPolicy = {
  include?: (relativePath: string) => boolean;
  maxDepth: number;
  maxEntries: number;
  maxBytes?: number;
};
```

规则：

- 一次操作只扫描一次；
- resource manifest、copy、result fallback 和 Host Bridge bundle 消费同一 manifest；
- manifest 只在操作内有效，不持久化为正确性缓存；
- 超限结构化失败，不静默漏文件；
- 路径、排序和现有 cache exclusion 行为不变。

迁移完成后删除：

- `collectRuntimeFiles()`；
- `copyRuntimeDirectory()` 自递归；
- result fallback 的二次 scan/stat；
- 各模块重复递归实现。

涉及 `runtimePersistence.ts`、`acpSkillResourceManifest.ts`、`acpSkillResultFileFallback.ts` 以及 skill materialization/workflow agent-run 等调用者。max depth/entries/bytes 必须由真实 workspace fixture 决定。

### 18.12 阶段 10：keyset library page query（R7）

R7 必须先建立 Zotero 7/9 查询语义和性能基线，尤其是 query 字段匹配。

新增：

```text
src/modules/zoteroLibraryPageQuery.ts
```

```ts
type ZoteroLibraryPageCriteria = {
  libraryId: number;
  collectionId?: number;
  tag?: string;
  itemType?: string;
  query?: string;
};

type ZoteroLibraryCursorV1 = {
  version: 1;
  criteriaHash: string;
  afterItemId: number;
};
```

一个 criteria builder 同时生成 count 和 `ORDER BY itemID ASC LIMIT limit+1` 查询，只对当前页调用 `Zotero.Items.getAsync(ids)`。

`listItems`、`syncSnapshot`、`readinessAudit`、`searchItems` 复用同一 query service。缓存只能是性能缓存，不是结果 SSOT。

迁移后删除：

- `getAll→filter→searchMatch→sort→slice`；
- offset cursor 解释路径；
- 测试中锁定 `Zotero.Items.getAll()` 的实现断言。

对外字段和 `nextCursor` string 保持不变；不要保留 numeric/offset cursor 双轨。发布边界应明确 cursor 是 opaque、短期读取句柄，不是持久数据。

必须在 Zotero 7/9 核对 title、creator、date、publication、abstract、tag、key、deleted、child、collection 和 group library 语义。

### 18.13 阶段 11：原子 Zotero batch mutation（R10）

新增唯一 primitive，可放入：

```text
src/modules/zoteroMutationBatch.ts
```

```ts
type ZoteroItemBatchMutation<T> = {
  operation: string;
  items: Zotero.Item[];
  apply(item: Zotero.Item): T;
};

executeZoteroItemBatchMutation(plan): Promise<void>
```

执行规则：

1. 事务前解析全部 refs、tags、collections 并完成可预验证；
2. 单次 `Zotero.DB.executeTransaction()`；
3. 事务内逐 item 修改后 `await item.save()`，不能 `saveTx()`；
4. 依赖 Zotero transaction 的 Notifier queue 在 commit 后统一发布；
5. target 上限仍为 50；
6. response DTO、preview、approval 和 capability 名称不变。

迁移：

- `handlers.tag.add/remove/replace`；
- `handlers.collection.add/remove/replace`。

删除这些 batch path 中的逐 item `saveTx()`。单 item create/update 不必被迫迁移到 batch abstraction。

明确新的 batch 原子契约：第 N 个 item 失败时整批 rollback，不允许部分 item 已提交。duplicate tag、已有 collection、remove missing 等 no-op 语义保持。

测试：

- 50 items add/remove/replace；
- 中间 item 失败后全部 rollback；
- observer 不看到半完成状态；
- Notifier 在 commit 后收到批量 ids；
- 不精确断言内部 save 顺序或日志文案。

### 18.14 OpenSpec 与提交边界建议

正式实施时，每个上述阶段应建立独立 OpenSpec change；阶段 3A/3B、阶段 7/8 尤其不能揉成一个大 change。

建议 change 边界：

```text
profile-acp-runtime-hot-paths
unify-acp-assistant-text-accumulation
separate-acp-diagnostics-from-run-state
coalesce-job-progress-publication
make-runtime-log-persistence-async
centralize-acp-run-persistence
scope-assistant-workspace-publications
make-host-http-input-event-driven
make-runtime-range-io-async
stream-host-bridge-file-transfers
reuse-runtime-tree-manifests
query-zotero-library-pages
make-zotero-batch-mutations-atomic
```

每个 change 都应：

- 独立通过相关测试；
- 独立生成 profiler 对照；
- 通过整体 revert 回滚；
- 不用 runtime feature flag 保留旧实现；
- 不迁移持久数据，除非后续单独批准 schema change。

Host Bridge 相关阶段实施后还应运行：

```text
npm run render:host-bridge-surface
npm run check:host-bridge-doc-sync
npm run check:zotero-librarian-profile
```

### 18.15 最终顺序与阶段验收门

| 阶段 | 完成门 |
| --- | --- |
| 0 profiler | 自动化 R1-R3 机制基线可重复、release bundle 零 profiler 负担、profiler 自身有界；Zotero 7/9 计时为可选校准 |
| 1 text SSOT | 单一且有字节预算的 assistant accumulator，Chat/Skills coalescing/final output 不变 |
| 2 diagnostic | ordinary diagnostic 不再写 canonical run 或驱动 panel |
| 3 queue/log/transport | progress 业务事件不丢，UI/log publication 有界，flush 真正完成，frame queue 有背压和上限 |
| 4 persist intent | deferred 合并、critical immediate、rehydrate 正确 |
| 5 UI publication | transcript/count/chrome 独立，全部 DOM identity 不变量通过 |
| 6 HTTP reader | 慢分片无同步 busy-spin，HTTP/CLI 结果不变 |
| 7 runtime I/O | Zotero 7/9 无同步 append/range 热路径，格式不变 |
| 8 file streaming | 大文件内存有界，checksum/header/bytes 不变 |
| 9 tree manifest | 一次操作一次扫描，超限结构化失败，输出集合不变 |
| 10 page query | page 成本与 page 规模相关，全部 filter/query 语义对齐 |
| 11 mutation | 单事务、整批 rollback、Notifier commit 后发布 |

任何阶段若 profiler 显示性能没有改善，应先判断：

- 是否调用次数未下降；
- 是否成本转移到 serializer/clone/GC；
- 是否测试 fixture 没有命中真实运行时分支；
- 是否新的抽象仍保留旧入口。

不能通过降低日志级别、延长 debounce 或隐藏 UI 来宣称治理完成。

## 19. 治理不变量建议

后续变更应至少锁定以下不变量：

1. `silent` 下普通 JSON-RPC/session update 不得逐条覆盖完整 run persistence payload。
2. diagnostic/audit 写入不得直接制造 `run/transcript` UI change。
3. transcript-only、message-count-only、progress-only 更新不得构建完整 panel snapshot。
4. UI region signature guard 应在昂贵 snapshot/clone 之前具备 cheap change routing，而不只在 child DOM 层生效。
5. transcript page 读取成本应与当前 page 大小相关，不得每次扫描完整 mirror。
6. Host Bridge socket callback 不得在主线程同步等待未来网络数据。
7. 大文件处理不得要求多个附件同时完整驻留内存。
8. transport queue、assistant accumulator 和 audit buffer 必须具有显式容量或背压语义。
9. Zotero batch mutation 应明确事务和 Notifier 边界。
10. runtime persistence 必须明确 Zotero 实际使用的 Node、IOUtils、Components 分支，不能只在 Node 测试环境证明异步。

## 20. 建议的验证与回归基线

后续治理实现应优先使用行为和性能不变量测试，不锁定内部调用顺序或完整日志文案。

建议覆盖：

- 大量 `jsonrpc_trace` 不导致同等数量的完整 run row overwrite；
- silent 下 ordinary diagnostic 不发布 panel snapshot；
- progress-only 更新保持 toolbar/banner/reply/drawer DOM identity；
- inactive snapshot 确实移除 `selectedTranscriptPage.items`；
- current page projection 不遍历完整 cold mirror；
- slow/fragmented Host Bridge request 不形成同步 busy-spin；
- 大 attachment handle 注册有确定内存上界；
- transport consumer 变慢时 queue 不无限增长；
- batch mutation 的事务/Notifier 次数受控；
- Zotero Components fallback 的 append/range path 有专门运行时验证。

性能验收不宜只使用平均值，应至少报告：

- 单次最大主线程阻塞时长；
- P95/P99 hot-path 耗时；
- 长任务数量；
- heap 峰值；
- queue 峰值；
- 每 1,000 个 ACP updates 的 SQL、snapshot 和持久化次数。

## 21. 代码证据索引

### 静默策略与 progress

- `src/modules/assistantExecutionDisplayPolicy.ts:3-7,109-127`
- `src/modules/acpExecutionProgress.ts:115-194`
- `src/modules/acpSkillRunStore.ts:3991-4148`
- `src/modules/acpSessionManager.ts:731-745,2635-2658`

### JSON-RPC、diagnostic 与 run store

- `src/modules/acpClientConnection.ts:92,111,184,196`
- `src/modules/acpConnectionAdapter.ts:407,467,592-637`
- `src/modules/acpSkillRunnerOrchestrator.ts:3108,4615,4641`
- `src/modules/acpSkillRunStore.ts:2686-2747,2970,3080,3400-3424`
- `src/modules/pluginStateStore.ts:1218-1289,1819,2044`

### Assistant Workspace

- `src/modules/assistantWorkspaceSidebar.ts:540-580,1282-1312,1447-1582,1840-1942`
- `src/modules/assistantSidebarViewModel.ts:99-141`
- `src/modules/assistantTranscriptPageProjection.ts:38-74`
- `addon/content/sidebar/assistant-workspace.js:360-448`
- `addon/content/sidebar/acp-skill-run.js:381-408,897-983`
- `addon/content/shared/assistant/assistant-panel-renderer.js:2474-2730`
- `addon/content/shared/assistant/assistant-transcript-renderer.js:835-877,1039-1144,1907-2085`

### Host Bridge 与附件

- `src/modules/hostBridgeServer.ts:602-650,1046-1085,3189-3202`
- `src/modules/hostBridgeCapabilityRegistry.ts:90-160`
- `src/modules/hostBridgeFileRegistry.ts:187-286,390-440`
- `cli/zotero-bridge/src/client.rs:467-568`

### Zotero capability 与 mutation

- `src/modules/zoteroHostCapabilityBroker.ts:2552-2561,3020-3075,3371-3403,3492-3520`
- `src/handlers/index.ts:614-637,678-720`

### Transport、日志、audit 与 persistence

- `src/modules/acpTransport.ts:169-185,1363,1638,1743-1826`
- `src/modules/runtimeLogManager.ts:314-330,804-830,969-976,1015-1058,1166-1180`
- `src/modules/acpSkillRunAuditTrail.ts:92,115,336-366,487-683`
- `src/modules/bufferedWriteCoordinator.ts:1-145`
- `src/modules/runtimePersistence.ts:771-879,1195-1288,1337-1499,1626-1649`
- `src/modules/acpSkillRunTranscriptStore.ts:24-29,187-209,656-777`
- `src/modules/acpSkillResourceManifest.ts:26-47`
- `src/modules/acpSkillResultFileFallback.ts:44-82`

### 现有 profiler 与诊断基础

- `src/modules/acpRuntimePerformanceProfiler.ts`
- `src/modules/acpRuntimePerformanceBaseline.ts`
- `src/modules/acpRuntimeSemanticTraceRecorder.ts`
- `src/modules/acpRuntimeReplayProfiler.ts`
- `test/core/175-acp-runtime-performance-profiler.test.ts`
- `test/core/176-acp-silent-runtime-performance-baseline.test.ts`
- `scripts/check-acp-runtime-profiler-release-elision.ts`
- `scripts/record-acp-runtime-governance-baseline.ts`
- `artifact/performance-baselines/acp-runtime-before-governance.md`
- `doc/components/acp-runtime-performance-profiler.md`
- `src/modules/testPerformanceProbeBridge.ts`
- `test/zotero/performanceProbeDigest.ts`
- `test/node/core/96-zotero-test-performance-probe-digest.test.ts`
- `src/modules/runtimeLogManager.ts`
- `src/modules/synthesis/jobProfiler.ts`

## 22. 局限与后续使用方式

本轮是源代码静态审计，能够确认：

- 某条路径是否存在；
- 是否使用同步 API；
- 是否逐消息、逐页、逐 item 或全量处理；
- 是否有容量、分页、debounce 或 signature guard；
- 哪些工作不受 silent 策略影响。

本轮不能单独证明：

- 当前用户环境中哪条路径占据最多时间；
- Zotero 7 与 Zotero 9 的具体耗时差异；
- 某个 observer、XPCOM stream 或 mozStorage 调用的实际毫秒数；
- 不同 ACP backend 的消息分片和帧率分布。

后续任何治理提案应先用本文风险编号标注目标，例如“治理 R1/R3”，并附上相应基线数据。实施后应回写：

- 变更后的调用次数；
- 主线程 long task 变化；
- heap/queue 峰值变化；
- 是否关闭该风险，或仅降低触发概率。

阶段 0 已为 R1、R2、R3 建立 closed、open-inactive、acp-active 三 surface 自动化机制基线；后续治理应按相同矩阵读取这些计数、容量和 duration 聚合，再按需补充 Zotero 7/9 真实宿主校准。closed 的零 R3 是“面板关闭不发生 UI publication”的对照，两个 open 状态分别保留 inactive 与 active 的归属。R1、R2、R3 分别代表事件风暴、直接同步长任务和静默模式下仍发生的 UI 前置工作，覆盖了当前最可能的三类卡顿机制。

## 23. R3 v3 数据面实施补记（2026-07-16）

`complete-acp-workspace-publication-data-plane-unification` 将 Chat 与 Skills
原子迁移到同一个 `AssistantWorkspaceTranscriptRegion`、producer mutation
projection、publication coordinator、Shell identity/ACK 链和 child receiver。
steady transcript 不再读取完整 selected page 或执行反向 diff；Chat counts、
Skills progress 和两侧 runtime options 也直接构建区域 DTO。完整 panel
materialization 仅保留在初始化、真实 activation、owner-first loading、显式
page request、diagnostic 和 rebase 路径。

本次同时修复了 cold page 已读取但 full mirror `loading` 覆盖 page-ready 的
问题。`pageKey` 区分 tail 与 cursor page；历史页收到 tail delta 时只推进
`totalVisibleItemCount/sourceEventSeq/transcriptRevision`，不改写历史页
identity 或插入 tail item。

Node 门禁覆盖两侧 producer boundary、side-channel、cold page-first、共享
receiver、ACK/gap、字段词汇和禁止 materialization。正式 Replay 与 Zotero
7/9 宿主性能数字必须在相同 trace digest、cadence 和用户保持的 boundary
设置下重新采集；在该证据产生前，不据此补记性能改善结论。

## 24. Round3结构增量修正契约（2026-07-16）

后续round3复盘确认，Host publication数量与bytes已下降，但共享child仍在每个
新tool `upsert_item`上退回整窗render；receiver又没有按tail `limit`淘汰头部，
导致DOM重挂载、全部row测量和virtual layout成本随累计item增长。该问题属于
Chat/Skills共享renderer与selected-page模型，不是Chat producer或wire负载问题。

当前治理契约将`itemId`固定为唯一domain身份，展示组合只使用显式
`rowKey + itemIds`；tail cursor随total推进并保持有界；steady upsert、patch、
append和delete只协调受影响row，无法局部应用时明确rebase，不允许full-render
fallback。Profiler只接收当前profile内已post identity的后续stage，并记录真实
display mode与dirty render row计数。正式性能结论仍需相同trace digest、boundary
模式和Zotero宿主recorded cadence证据。
