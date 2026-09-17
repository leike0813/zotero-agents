# Host Bridge 侦察报告（只读）

- 侦察时间：2026-09-16
- 侦察范围：`src/modules/hostBridge/`（36 文件 / 25,524 行）、`src/modules/hostBridgeCapabilityRegistry.ts`（3,052 行）、`rust/zotero-bridge/`、`rust/acp-ws-bridge/`、`contracts/`（24 文件 / 69,046 行）
- 约束：只读。未修改文件、未执行 git 写操作、未安装依赖、未运行构建或测试。命令仅 `ls`/`wc`/`grep`/`rg`/`read`/`codegraph explore`。
- 标记约定：**【事实】**= 有 `path:line` 直接证据；**【推测】**= 由证据推断，未逐行确认。

> 工具输出告警：本次侦察中发现，对含 `acp-ws-bridge`、`agent-surface.v6` 等字样的 `rg` 模式，终端输出会把命中子串渲染成占位符（实测 `rg 'agent-surface\.v[2-6]'` 输出 `host-bridge.n`，而 `grep -n 'agent-surface'` 输出真实的 `host-bridge.agent-surface.v6`）。本报告所有关键字符串均以 `grep`/`read` 复核过，未采用可疑渲染结果。

---

## 1. 职责与边界

### 1.1 定位

**【事实】** Host Bridge 是**运行在 Zotero 插件进程内的 HTTP 服务**，把 Zotero 宿主能力暴露给进程外调用方（CLI、MCP 客户端、工作流后端）。它监听 `nsIServerSocket`，唯一入口 `/bridge/v2/*` 与 `/mcp`：
- `src/modules/hostBridge/server/hostBridgeServer.ts:438` `createServerSocket()` — `@mozilla.org/network/server-socket;1`，默认 `127.0.0.1`，最大 16 连接（`:178` `MAX_ACCEPTED_CONNECTIONS`）。
- `src/modules/hostBridge/server/hostBridgeServer.ts:409` `hostAccessRoutes()` — 对外宣告 `routes.hostBridge` 与 `routes.mcp` 两个 endpoint。

**【事实】** 官方分层表述（人类可读 SSOT，非代码事实源）：
`docs/components/zotero-host-capability-broker-ssot.md:5-17` 给出 6 层：原生 Zotero API → `ZoteroHostCapabilityBroker`（canonical 语义 owner）→ `WorkflowHostApi` v12（封闭工作流投影）→ **Host Bridge v2（remote locality / exposure / permission / file-handle adapter）** → MCP（Host Bridge registry 的精确公开投影）→ broker 私有 native mutation primitives。

### 1.2 与 `zoteroHostCapabilityBroker.ts` 的关系：谁定义语义，谁只是投影

| 角色 | 归属 | 证据 |
| --- | --- | --- |
| 宿主能力**语义**唯一事实源 | `src/modules/zoteroHostCapabilityBroker.ts`（18,546 行） | `:529` `export interface ZoteroHostCapabilityBroker` 定义 `context`(:529)/`navigation`(:537)/`library`(:564)/`metadata`(:647)/`bibliography`(:653)/`mutations`(:654)/`notes`(:679)/`attachments`(:735) 八个域；`:17219` `createZoteroHostCapabilityBroker()`；`:17683` `resolveZoteroHostCapabilityBroker()` |
| **能力元数据**（schema/category/summary/effect/approval/exposure/response-sizing）唯一 owner | `contracts/host-bridge/capabilities.v2.json` | `src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:5-6` 直接 `import capabilityContractJson`；`docs/components/host-bridge-capability-registry.md:5-8` |
| 元数据 + handler 的**绑定层** | `src/modules/hostBridgeCapabilityRegistry.ts` | `:1286` `capability()` 工厂从 contract 复制 manifest 元数据；`:1300` `requestEffect: contract.effect` |
| **投影**（remote/locality/permission/transport） | `src/modules/hostBridge/` | 见 §3 |
| **投影**（MCP tools） | `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:924-946` `listHostBridgeMcpToolDefinitions()` 由 `listHostBridgeCapabilities()` 派生，handler 直接转调 `executeHostBridgeCapability`（`:1258`） |
| **投影**（CLI） | `rust/zotero-bridge/` + `src/modules/hostBridge/cli/` | Rust 侧编译期嵌入 contract（`rust/zotero-bridge/src/contract.rs:8-15`），运行期只发 HTTP |

**【事实】** 强一致性由**模块加载期断言**保证：`hostBridgeCapabilityRegistry.ts:2929-2950` 比较 `CAPABILITIES` 名称集与 contract 名称集，任何 missing / orphan / duplicate handler 直接 `throw new Error`。

**【事实】** registry 明确不依赖 `WorkflowHostApi`（`docs/components/host-bridge-capability-registry.md:60-61`）；broker 不负责 authorization / permission / exposure / noninteractive policy / transport / remote locality（`AGENTS.md` 的 Zotero Host Capability Broker 硬约束段落，与 `src/modules/zoteroHostCapabilityBroker.ts` 内部无 permission 字样一致）。

### 1.3 与 MCP server 的关系

**【事实】** MCP **不是**独立 listener，而是 Host Bridge 同一 socket 上的一条路由：
- `hostBridgeServer.ts:875-882`：`isMcpPath(path)`（`/mcp` 或 `/mcp/`，`:732-734`）→ 动态 `import("../mcp/zoteroMcpServer")` → `handleZoteroMcpHostAccessRequest(request, getHostBridgeServerStatus())`。
- `zoteroMcpServer.ts:2404-2412` 先 `ensureZoteroMcpServer` / `syncMcpRouteStateFromHostBridge`，再 `handleHttpRequest`。
- `zoteroMcpServer.ts:2225-2263` `mcpEndpointFromHostBridge()` 把 bridge endpoint 的 `/bridge/v2` 后缀替换为 `/mcp`，端口即 Host Bridge 端口（`state.port` 是**投影**不是自建）。

### 1.4 与 CLI 的关系

**【事实】** CLI（Rust `zotero-bridge`）是纯外部 HTTP 客户端：不猜端口、不建 socket、不管子进程（`rust/zotero-bridge/src/args.rs:16-19`，见 §6）。插件侧负责：
- 发现/安装二进制：`cli/hostBridgeCliResolver.ts:147-204`（`env ZOTERO_BRIDGE_CLI` → bundled `addon/bin/<platform>/` → `PATH`）。
- 为每次 ACP run 物化 profile/shim/env：`cli/hostBridgeCliInjection.ts:169-294`，写入 `<workspace>/.zotero-bridge/profile.json`、`bin/zotero-bridge{,.cmd}` shim，注入 `ZOTERO_BRIDGE_PROFILE` / `ZOTERO_BRIDGE_TOKEN` / `ZOTERO_BRIDGE_SCOPE` / `PATH`。
- 写 well-known profile 供非注入场景自动发现：`cli/hostBridgeProfileStore.ts:106-130`（Rust 侧只读该文件，`rust/zotero-bridge/src/config.rs:128-168`）。

**【事实】** 因此三者的语义方向是单向的：**broker 定义语义 → contract 定义元数据 → registry 绑定 → Host Bridge 做暴露/权限/传输 → MCP 与 CLI 只是两种调用投影**。反向依赖不存在（registry 无 WorkflowHostApi 依赖；MCP 无独立 tool registry；CLI 无宿主代码）。

---

## 2. 子目录地图（`src/modules/hostBridge/`）

36 个文件，5 个子目录 + 无根级文件（所有文件都在子目录内）。

### 2.1 `server/` — HTTP 传输、路由与进程内状态（13 文件 + routes/ 5 文件）

| 文件 | 行 | 角色 |
| --- | --- | --- |
| `server/hostBridgeServer.ts` | 1,989 | 唯一 listener owner：bind / accept / read / route dispatch / operation admission / supervisor / recovery / status |
| `server/hostBridgeProtocol.ts` | 374 | 协议常量与 DTO 类型：`HOST_BRIDGE_PROTOCOL_VERSION`、错误码、`HostBridgeStatusSnapshot`、`HostBridgeCapabilityManifestEntry` |
| `server/hostBridgeCapabilityContract.ts` | 309 | contract 装载与 AJV 编译：解析 `capabilities.v2.json` + meta-schema，暴露 `validateHostBridgeCapabilityInput/Output` |
| `server/hostHttpRequestReader.ts` | 711 | 手写 HTTP/1.1 读入（head 先到、body 延迟读、超时与限长），`parseHostHttpRequestBytes` |
| `server/runtimeHttpResponse.ts` | 458 | 响应写出：内存响应、文件响应（大文件流式）、`writeRuntimeHttpResponse` |
| `server/hostBridgeFileRegistry.ts` | 530 | opaque `file-*` handle 注册表：TTL、lease、sha256、上传落盘、下载解析 |
| `server/hostBridgeOperationStore.ts` | 226 | 幂等 operation receipt：`reserve`/`complete`/`markOutcomeUnknown`/重启恢复 |
| `server/hostBridgeNotificationInbox.ts` | 423 | 通知收件箱：由 `notificationHub` 投影 workflow/skill-run/task 事件，支持 ack |
| `server/hostBridgeMutationAdapter.ts` | 176 | canonical mutation 执行适配：prepared resource 所有权与清理顺序 |
| `server/hostBridgePagination.ts` | 287 | 统一 keyset 分页（默认 25 / 上限 100）、文本分块（默认 8k / 上限 16k）、cursor 错误 |
| `server/hostBridgeAdvertisedHostDetection.ts` | 231 | LAN 模式下探测对外可用 IPv4，供 remote endpoint 使用 |
| `server/hostBridgeRouteContract.ts` | 19 | 路由契约类型：`HostBridgeRouteAdmission = "read" \| "generic-operation" \| "canonical-mutation"` |
| `server/routes/hostBridgeCapabilityRoutes.ts` | 691 | `/bridge/v2/call`、`/context/current`、`/context/selection`；能力查找、输入校验、审批、执行 |
| `server/routes/hostBridgeWorkflowActivityRoutes.ts` | 1,944 | 工作流控制面 + tasks/permissions/notifications/skill-runs 的最大路由族 |
| `server/routes/hostBridgeDiagnosticsRoutes.ts` | 303 | `/manifest`、`/diagnostics/profile`、`/diagnostics/profile/diagnose`、`/diagnostics/backends[/{id}]` |
| `server/routes/hostBridgeFileRoutes.ts` | 181 | `POST /files/upload`、`GET /files/{fileId}` |
| `server/routes/hostBridgeSynthesisRoutes.ts` | 226 | `/synthesis/cache/status`、`/synthesis/cache/invalidate`、`/synthesis/index/status` |

### 2.2 `mcp/` — 内嵌 MCP surface（2 文件）

| 文件 | 行 | 角色 |
| --- | --- | --- |
| `mcp/zoteroMcpServer.ts` | 2,656 | `/mcp` 的 HTTP 侧：鉴权、origin 校验、scope 解析、并发准入（9 in-flight）、watchdog、熔断、健康快照、诊断事件、运行时日志 |
| `mcp/zoteroMcpProtocol.ts` | 1,502 | JSON-RPC 2025-06-18 协议：`initialize`/`tools/list`/`tools/call`，tool 定义由 capability registry 派生，含 allowed-args 白名单与 tool 级审批 |

### 2.3 `permissions/` — 授权与审批（4 文件）

| 文件 | 行 | 角色 |
| --- | --- | --- |
| `permissions/hostBridgePermissionManager.ts` | 649 | 审批 dispatcher：按 scope 路由到 acp-chat / acp-skill-run / skillrunner / global，超时与 UI 不可用归一化 |
| `permissions/hostBridgeWriteAutoApprovalRegistry.ts` | 110 | 写操作免审批 grant：仅 `connectionMode === "local"` + `kind === "acp-skill-run"`，24h TTL，可撤销 |
| `permissions/acpConversationHostBridgePermissionRegistry.ts` | 57 | ACP Chat 会话级 pending permission 槽位 |
| `permissions/skillRunnerHostBridgePermissionRegistry.ts` | 141 | SkillRunner run 级 pending permission 槽位 |

### 2.4 `workflow/` — 工作流控制面与产物（5 文件）

| 文件 | 行 | 角色 |
| --- | --- | --- |
| `workflow/hostBridgeWorkflowControl.ts` | 3,569 | 工作流 catalog / describe / validate / requirements / provider-profile / submit / queue / agent-run 生命周期 / runs / tasks / skill-runs / notifications 的语义实现 |
| `workflow/hostBridgeWorkflowResources.ts` | 834 | 非交互式工作流的资源绑定：输入槽只接受 opaque `file-*` handle，输出槽只接受 `bridge-download`；`supportsHostBridgeNonInteractive()` |
| `workflow/hostBridgeWorkflowAgentRun.ts` | 731 | agent-run handoff 物化：把 selection + workflow 打成可交给外部 agent 的 bundle |
| `workflow/hostBridgeWorkflowAgentRunStore.ts` | 415 | agent-run 记录的持久化、apply lease、终态 receipt、重启恢复 |
| `workflow/researchBundleService.ts` | 2,921 | research bundle 物化与导入：直接发布/导入路径、产物类型、topic digest 重写 |

### 2.5 `cli/` — CLI 解析、安装与注入（7 文件）

| 文件 | 行 | 角色 |
| --- | --- | --- |
| `cli/hostBridgeCliResolver.ts` | 217 | 平台→目录/二进制名映射 + 三级解析（env → bundled → PATH） |
| `cli/hostBridgeCliInstaller.ts` | 715 | 把 bundled 二进制安装到用户目录（安装目标解析、安装结果与错误分类） |
| `cli/hostBridgeCliInstallPrompt.ts` | 398 | 启动期安装提示策略（是否提示、提示状态、启动 prompt 流程） |
| `cli/hostBridgeCliInjection.ts` | 360 | 每次 run 物化 profile/shim/README/env；写操作免审批 grant 的签发与失败回滚 |
| `cli/hostBridgeProfileStore.ts` | 157 | well-known profile（endpoint + token）落盘，供 CLI 自动发现 |
| `cli/hostBridgePluginSkillBundle.ts` | 371 | 插件内置 skill bundle 物化（清单、摘要、身份）到 runtime root |
| `cli/hostBridgeSkillRunnerEnv.ts` | 305 | 为 SkillRunner 后端构造 Host Bridge scope env，并区分 local/remote backend locality |

---

## 3. 对外接口

### 3.1 路由族与处理者

**【事实】** 路由匹配顺序在 `hostBridgeServer.ts:967-1023`：diagnostics → capability → workflowActivity → synthesis → file。另有三条在匹配器之前处理的特例：`/mcp`（`:875`）、`/bridge/v2/health`（`:893`）、`/bridge/v2/operations/{id}`（`:940`）。

| Route family | 方法与路径 | 处理者 | admission |
| --- | --- | --- | --- |
| MCP | `POST /mcp`（GET→405 `streamable_http_get_not_supported`） | `zoteroMcpServer.ts:1893` → `zoteroMcpProtocol.ts:1309` | 独立鉴权，见 §3.2 |
| Health | `GET /bridge/v2/health` | `hostBridgeServer.ts:893-908` | **免鉴权**（`:1359-1362` 同样放行） |
| Operation receipt | `GET /bridge/v2/operations/{operationId}` | `hostBridgeServer.ts:940-965` | read |
| Manifest | `GET /bridge/v2/manifest` | `routes/hostBridgeDiagnosticsRoutes.ts:262-292` | read |
| Diagnostics | `GET /bridge/v2/diagnostics/profile`、`/profile/diagnose`、`/backends`、`/backends/{id}` | `hostBridgeDiagnosticsRoutes.ts:293-301` | read |
| Capability | `POST /bridge/v2/call` | `routes/hostBridgeCapabilityRoutes.ts:672-677` → `:319` `callCapability` | **动态**：`capabilityAdmission()`（`:229-248`） |
| Context | `GET /bridge/v2/context/current`、`/context/selection` | `hostBridgeCapabilityRoutes.ts:678-689`、`:602`/`:635` | read |
| Files | `POST /bridge/v2/files/upload`、`GET /bridge/v2/files/{fileId}` | `routes/hostBridgeFileRoutes.ts:168-179` | upload=generic-operation，download=read |
| Synthesis | `GET /bridge/v2/synthesis/cache/status`、`/index/status`；`POST /synthesis/cache/invalidate` | `routes/hostBridgeSynthesisRoutes.ts:207-224` | status=read，invalidate=generic-operation |
| Workflow（只读） | `/workflows`、`/workflows/describe`、`/workflows/provider-profiles[/describe\|/validate\|/refresh]`、`/workflows/defaults`、`/workflows/validate`、`/workflows/requirements`、`/workflows/queue`、`/workflows/submissions/{id}`、`/workflows/runs[/{id}]` | `routes/hostBridgeWorkflowActivityRoutes.ts:444-487` | read |
| Workflow（写） | `POST /workflows/submit`、`/workflows/queue/{id}/cancel`、`/workflows/agent-run`、`/workflows/agent-runs/{id}/{apply\|renew\|abandon}`、`/workflows/runs/{id}/cancel` | 同上 `:462-483`（`write()` helper） | generic-operation（GET 时降级 read） |
| Tasks | `GET /tasks`、`/tasks/active`、`/tasks/recent` | `:488-493` | read |
| Permissions | `GET /permissions/pending`、`/permissions/{id}` | `:494-497` | read |
| Notifications | `GET /notifications`、`POST /notifications/ack` | `:498-501` | read / generic-operation |
| Skill runs | `GET /skill-runs/recent`、`/skill-runs/{id}`；`POST /skill-runs/{id}/reply`、`/skill-runs/{id}/connect` | `:502-507` | read / generic-operation |

相关常量：`MAX_REQUEST_BODY_BYTES = 1 MiB`、`MAX_UPLOAD_BODY_BYTES = 16 MiB`（`hostBridgeServer.ts:176-177`）；读入限制 `maxHeaderBytes 64 KiB / maxBodyBytes 16 MiB / idleTimeout 500 ms / totalTimeout 30 s`（`hostHttpRequestReader.ts:58-64`）。

### 3.2 鉴权 / 授权 / 审批判定点

**【事实】** 三层是分离的：

1. **鉴权（Authentication）** — `hostBridgeAuth.ts:320-338` `isHostBridgeAuthorizationValid()`：`Authorization: Bearer <token>`，用 `timingSafeEqualString` 比对**会话 token**，失败再尝试**master token**（AES-GCM + PBKDF2-SHA256 10 万次，`hostBridgeAuth.ts:193-230`）。判定点在 `hostBridgeServer.ts:910-921`（HTTP）与 `:1359-1362`（head 阶段预检，用于提前回应）；MCP 在 `zoteroMcpServer.ts:1893` 的 `authorized` 分支独立判定（401 于 `:1972-1981`）。
   - `/bridge/v2/health` 免鉴权（`hostBridgeServer.ts:893`、`:1356`）。
   - 会话 token 缺失时惰性生成（`hostBridgeAuth.ts:170-181`），存 prefs `hostBridgeToken`。

2. **授权（Authorization / exposure）** — 三处硬编码门禁：
   - **capability 白名单**：`getHostBridgeCapability()` 返回 `null` 即 404（`hostBridgeCapabilityRoutes.ts:361-374`）；debug 类在非 debug 模式不可见（`hostBridgeCapabilityRegistry.ts:2979-2987`）。
   - **navigation scope 门禁**：`hostBridgeCapabilityRoutes.ts:376-391`，scope kind 非 `global`/`acp-chat` 时 403 `navigation_scope_denied`；判定函数 `hostBridgeServer.ts:628-634`。
   - **MCP scope 门禁**：`zoteroMcpProtocol.ts:933-937` tool 列表按 scope 过滤 navigation；`:1373-1387` 命中时返回 `navigation_scope_denied`。scope 由 `x-zotero-bridge-scope` 解析（`zoteroMcpServer.ts:41-62`：无 header→`operator`，`global`→`operator`，`acp-chat`→`interactive`，`acp-skill-run`/`acp-run`/`skillrunner-run`→`automated`，其余→`invalid`）。

3. **审批（Approval）** — `hostBridgePermissionManager.ts:572-623` `requestHostBridgePermission()` 是唯一 dispatcher，按 scope 路由：
   - `acp-chat` → `acpConversationHostBridgePermissionRegistry`
   - `acp-skill-run` / `acp-run` → `acpSkillRunPermissionFacade`（`hostBridgePermissionManager.ts:485-506`）
   - `skillrunner-run` → `skillRunnerHostBridgePermissionRegistry`
   - 其余 → 全局 `Zotero.Prompt.confirm`（`:314-346`）
   - 超时 5 分钟（`:44`）；`permission_timeout`→408、`permission_ui_unavailable`→503、其余拒绝→403（`hostBridgeServer.ts:705-726`）。
   - 触发点：`hostBridgeCapabilityRoutes.ts:468-474`（`capability.approval !== "none" && !autoApprovedWrite && !canonicalMutationProjection`）；MCP 侧 `zoteroMcpProtocol.ts:1214-1233`。
   - **输入校验先于审批**：`executeHostBridgeCapability` 校验输入（`hostBridgeCapabilityRegistry.ts:3031-3041`），HTTP/MCP 路径都先 `validateHostBridgeCapabilityInput`，所以畸形写请求不会弹审批 UI（`docs/components/host-bridge-capability-registry.md:169-172`）。
   - `NO_APPROVAL_CAPABILITIES` 集合见 `hostBridgePermissionManager.ts:12-42`；approval 分级还由 `getHostBridgeApprovalRequirement()`（`:508-...`）按 capability 名前缀细化。

### 3.3 非交互与远程边界

**【事实】** 远程/本地区分来自**socket 对端地址**，不是 header 自述：
- `hostBridgeServer.ts:683-703` `transportContextFromAcceptedTransport()` 读 `transport.host`，`isLoopbackPeerHost()`（`:671-681`，含 `::1` 与 `::ffff:127.x`）判 `local`/`remote`/`unknown`。
- `parseConnectionModeHeader()`（`:659-669`）：只有 `peerLocality === "local"` 且 header 不是 `remote` 时才是 `local`，否则 `remote`。**远程方无法靠 header 伪装成本地**。
- 该值经 `trustedTransportContexts`（`:1131`）绑定到 request 对象，`parsePermissionScopeHeader()`（`:609-626`）只从这条可信通道取 `connectionMode`。

**【事实】** 免审批写操作的边界：`hostBridgeWriteAutoApprovalRegistry.ts:81-101` 要求 `scope.autoApproveWrites === true` **且** `kind === "acp-skill-run"` **且** `scope.connectionMode === "local"` **且** grantId 匹配未过期 grant **且** `acpSkillRunAutoApprovalResolver(requestId)` 为真。grant 只由本进程 `issueHostBridgeWriteAutoApprovalGrant`（`:41-58`）签发，TTL 24h，`connectionMode` 字段类型硬编码为 `"local"`（`:9`）。

**【事实】** LAN 暴露需要额外条件：
- `bindMode === "lan"` 时 bind `0.0.0.0`（`:168`、`:303-305`）；LAN 模式强制 pinned port（`:339-341`、`:1603-1623`，pinned 失败直接 error，不做随机端口回退）。
- 只有 pinned 端口才允许写 well-known profile（`:1530-1543`：`Refusing to publish Host Bridge LAN profile for a non-pinned endpoint`）。
- 远程 CLI 走**独立 master token**：`buildHostBridgeRemoteCliProfileForCopy()`（`:1753-1779`）把 `connectionMode: "remote"` 与 master token 一起产出；master token 与会话 token 分离，且以 `AES-GCM` 信封存 prefs（`hostBridgeAuth.ts:12-22`、`:193-230`）。

**【事实】** 非交互工作流边界：
- `hostBridgeWorkflowResources.ts:217-221` `supportsHostBridgeNonInteractive(manifest)`：`supportedInvocationModes` 未声明时视为支持，否则必须包含 `"non-interactive"`。
- 资源绑定只接受 opaque handle：输入槽必须是 `file-*` 且拒绝 path-like（`:223-244`），输出槽必须 `delivery: "bridge-download"`（`:246-258`）。
- 交互需求会显式失败：`:827-831` 构造 `workflow_interaction_required`，路由层把它映射为稳定错误码（`hostBridgeWorkflowActivityRoutes.ts:131`）。
- 工作流运行时用 `interactionMode: "non_interactive"` 提交（`hostBridgeWorkflowControl.ts:2109`、`:2127`）。

**【事实】** MCP 侧非交互限制：并发准入 9 个普通请求（`zoteroMcpServer.ts:238` `DEFAULT_TOOL_INFLIGHT_LIMIT = 9`），超时 45 s（`:239`），熔断阈值 3 次 / 5 min 窗口 / 打开 60 s（`:241-243`），body 上限 1 MiB（`:240`）。超过并发返回 `zotero_mcp_inflight_limit`（tool 描述里对 agent 明示，`zoteroMcpProtocol.ts:907`）。

---

## 4. 主要流程

### 4.1 HTTP 请求：从监听到返回

```
nsIServerSocket.asyncListen(listener)                       hostBridgeServer.ts:1527
  └─ listener.onSocketAccepted(socket, transport)           :1456
       ├─ generation 过期 → rejectStaleTransport            :1457-1460
       ├─ acceptedConnections.size >= 16 → 拒绝             :1461-1464
       ├─ transport.openOutputStream / openInputStream      :1470-1471
       ├─ beginProfiledHostBridgeRequestRead(inputStream, deferBody=true)  :1472 / :1234
       ├─ 构造 AcceptedHostConnection（含 transportContext） :1473-1482
       └─ void processAcceptedConnection(connection)        :1484
            └─ processAcceptedConnection                    :1351
                 ├─ await requestRead.head（仅 head）        :1354
                 ├─ isHealth / recognizedPath / authValid 预检 :1356-1362
                 │    └─ 命中 → 直接 handleHttpRequest + 写响应 + return :1363-1382
                 ├─ requestRead.continue(上限)（upload 16MiB，其余 1MiB）:1383-1387
                 ├─ await requestRead.completion（完整 body） :1388
                 ├─ generation 二次校验                       :1390-1392
                 ├─ handleHttpRequest(request, transportContext)  :1393 / :1127
                 │    ├─ trustedTransportContexts.set(request, ctx) :1131
                 │    ├─ [可选] ACP runtime 性能埋点包裹         :1132-1174
                 │    └─ handleHttpRequestImpl               :853
                 │         ├─ parseError → 400              :862-873
                 │         ├─ /mcp → handleZoteroMcpHostAccessRequest :875-882
                 │         ├─ 非 /bridge/v2 → 404           :884-891
                 │         ├─ /health → 200                 :893-908
                 │         ├─ isHostBridgeAuthorizationValid → 否则 401 :910-921
                 │         ├─ body 超限（upload 除外）→ 413  :923-938
                 │         ├─ /operations/{id} → receipt     :940-965
                 │         ├─ 依序 match 5 个路由族           :967-1023
                 │         ├─ 未命中 → 404                   :1025-1032
                 │         ├─ admission 判定 + operation id 校验/预留 :1034-1103
                 │         └─ await routeMatch.handle()      :1109
                 │              └─ 成功 → completeHostBridgeOperation（或 unknown）:1116-1123
                 ├─ generation 三次校验                       :1397-1399
                 └─ writeOutputStream(outputStream, rawResponse, onTransfer) :1401-1407
                      └─ runtimeHttpResponse.writeRuntimeHttpResponse :426
                           ├─ kind "file" → beginRuntimeFileResponseTransfer
                           └─ 内存响应 → beginRuntimeMemoryResponseTransfer（async 优先，回退 node 复制）
       finally: outputClosed ? releaseAcceptedConnection : abortAcceptedConnection :1437-1443
```

**【事实】** 关键分支细节：
- **operation 幂等**：`admission === "generic-operation"` 且无 `X-Zotero-Bridge-Operation-Id` → 428 `operation_id_required`（`:1039-1050`）；operation id 必须 ≤200 字符且匹配 `^[A-Za-z0-9._:-]+$`（`:1051-1063`）；`reserveHostBridgeOperation` 返回 `conflict`→409、`replay`→直接回放（`:1080-1102`）。
- **canonical mutation 例外**：`admission === "canonical-mutation"` 时跳过通用 operation store（`:1037-1038`、`:1051`），其证据由 broker/mutation authority 持有。
- **双 generation 校验**：`serverGeneration` 在 shutdown/restart 时自增（`:1674`、`:1718`），旧连接的响应会被丢弃（`:1390`、`:1397`、`:1412`）。

### 4.2 MCP tool 调用链

```
POST /mcp（同 4.1 的 accept/read 路径）
  └─ hostBridgeServer.ts:875 → handleZoteroMcpHostAccessRequest      zoteroMcpServer.ts:2404
       └─ handleHttpRequest(request)                                  zoteroMcpServer.ts:1893
            ├─ body 大小 / JSON 解析                                   :2036-2064
            ├─ 鉴权 authorized + origin 校验 isOriginAllowed           :1995-2007
            ├─ GET → 405；非 POST → 405                                :2008-2035
            ├─ parseMcpScopeHeader → operator/interactive/automated/invalid :41-62
            ├─ toolCallAdmission（9 in-flight / 45s / 熔断）            :302 / :434
            └─ handleZoteroMcpJsonRpc(payload, options)                zoteroMcpProtocol.ts:1309
                 ├─ initialize / notifications/initialized / tools/list :1333-1364
                 └─ "tools/call"                                       :1365
                      ├─ resolveToolName + listHostBridgeMcpToolDefinitions(scope).find :1369-1372
                      │    （未找到且 navigation.* + automated/invalid → navigation_scope_denied）:1373-1387
                      ├─ resolveToolArguments + validateToolArguments  :1397-1418
                      ├─ validateHostBridgeCapabilityInput             :1193-1209
                      ├─ assertKnownArgs（HOST_BRIDGE_MCP_ALLOWED_ARGS）:1210-1213
                      ├─ requestCapabilityApprovalForMcp → denied/unavailable 时返回 tool error :1214-1233
                      ├─ executeHostBridgeCapability(name, input, {   :1258
                      │      control, getStatus, connectionMode: "local",
                      │      resolveZoteroHostCapabilityBroker, approveMutation, ... })
                      └─ buildToolResult / 错误归一化                   :1276-...
```

**【事实】** MCP 的 `connectionMode` 在协议层被**硬编码为 `"local"`**（`zoteroMcpProtocol.ts:1265`）——即经 `/mcp` 进来的调用在 capability 上下文里恒为本机语义。

**【事实】** 两条链最终都汇聚到同一个 `executeHostBridgeCapability`（`hostBridgeCapabilityRegistry.ts:3020-3052`），其内部流程是：contract 查表 → 输入 AJV 校验 → `definition.handler(input, context)` → 输出 AJV 校验。handler 绝大多数直接转调 broker，例如：
- `library.list_items` → `resolveCapabilityBroker(context).library.listItems(...)`（`hostBridgeCapabilityRegistry.ts:2597-2598`）
- `library.sync_snapshot` → `broker.library.syncSnapshot(args, { ownerId: 'host-bridge:' + connectionMode }, control)`（`:2594-2600`）

---

## 5. 契约（`contracts/`）

### 5.1 清单

**【事实】** 24 个文件（69,046 行），两个子域：

| 文件 | 行 | 作用 | 生成者 | 消费者 |
| --- | --- | --- | --- | --- |
| `host-bridge/capabilities.v2.json` | 53,044（**101 能力 / 16 类别**） | **能力元数据 SSOT**：每个 capability 的 input/output JSON Schema、category、summary、effect、approval、exposure、responseSizing | 手工 SSOT（72/101 条手写）；**mutation 段**（29 条）由 `scripts/host-bridge/render-host-mutation-contract.ts:17-20,102-124` 从 `src/schemas/zoteroHostMutationSchemas.ts` 投影 | TS 运行时 `hostBridgeCapabilityContract.ts:5,94-121`（构建期 JSON import，非运行期 fs）；`hostBridgeCapabilityRegistry.ts:106,1290-1303`；MCP `zoteroMcpProtocol.ts:942`；Rust `contract.rs:8-9,24-46`（`include_str!` + 启动校验） |
| `host-bridge/cli-commands.v2.json` | 11,982（**133 命令**，`cliSchema: zotero-bridge.cli.v5`） | CLI 命令 ↔ capability 绑定、payload 组合、结果 schema、outputBoundary、approval/effect | **无任何写入方**（纯手工 SSOT） | **不被任何 `src/` 文件读取**；仅 `host-bridge-command-contracts.ts:307-325`、`host-bridge-cli-release-governance.mjs:72`、`check-host-bridge-consumer-guidance.ts:183-195`、`host-bridge-surface-catalog.ts:152-231`、Rust `contract.rs:10-11`、`tests/helpers/hostBridgeCliHarness.ts:18` |
| `host-bridge/surfaces.json` | 79 | 三个 agent-facing surface 的定义（id/kind/extends/patch/sourceRoot/generatedRoot/materializedRoot/skills/mount） | 手工；唯一程序化写入是 patch bump（`host-bridge-surface-model.ts:200-215,315-336`，经 npm `bump:*surface-version`） | `render-host-bridge-surfaces.ts:1272-1298`、`check-plugin-host-bridge-assets.ts:98-104`、`check-host-bridge-agent-language.ts:81-87`、评审镜像；**运行时** `cli/hostBridgePluginSkillBundle.ts:1`（静态 import，打包进 bundle） |
| `host-bridge/schemas/host-bridge-capabilities.v2.schema.json` | 106 | capabilities.v2.json 的 meta-schema | — | TS `hostBridgeCapabilityContract.ts:6`；Rust `contract.rs:8-15` |
| `host-bridge/schemas/host-bridge-cli-command-contracts.v2.schema.json` | 525 | cli-commands.v2.json 的 meta-schema | — | Rust `contract.rs`；脚本 |
| `host-bridge/schemas/host-bridge.agent-surface.v2..v6.schema.json` | 219/447/236/593/667 | Agent Surface 描述符的**版本化** schema | 手工 | **仅 v6 被引用**（7 处）；v2–v5 零引用（实测 grep 计数 v2=v3=v4=v5=0，v6=7），除自身 `$id`/`const` 外只剩 openspec 归档与 artifacts |
| `host-bridge/schemas/host-bridge-argument-error.v1.schema.json` | 86 | 校验失败的结构化错误（capability/phase/violations/truncated） | 手工 | Rust `contract.rs:760`、`commands.rs:2724`；TS `hostBridgeCapabilityRoutes.ts:407,526`、`zoteroMcpProtocol.ts:1202`；`rust/zotero-bridge/tests/schema_mode.rs:135` |
| `host-bridge/schemas/host-bridge.release-set.v1..v4.json` | 50/143/244/244 | 发布集合身份 | 手工 | **无 Ajv 消费者**：只做字面量比较（`host-bridge-release-controller.ts:45-65`、`publish-*.ps1:69`）；v2/v3 无任何引用，v1/v4 仅出现在语义评审分类列表（`host-bridge-semantic-review-context.ts:132-138`） |
| `host-bridge/schemas/host-bridge.release-receipt.v1..v2.json` | 33/65 | 发布 receipt | 手工 | 同上（无 validator 编译） |
| `host-bridge/schemas/host-bridge.semantic-guidance.v2.schema.json` | 39 | 语义指引 | 手工 | **全仓零生产者/零消费者**，纯遗留（对应 openspec 变更 2026-07-17 已归档） |
| `synthesis-sidecar/schemas/*.json` | 20–75 | Synthesis sidecar 的 prebuild/release/manifest 契约（6 文件） | 人工 | sidecar 发布脚本（本报告不展开） |

### 5.2 一致性如何校验

**【事实】** 主要是"重新生成 + diff"与"跨源交叉校验"两类，没有集中的 JSON-Schema 校验入口：

1. **重新生成 + diff**：`scripts/host-bridge/render-host-bridge-surfaces.ts:1387-1390` — `--check` 时若 `changes.length > 0` 抛 `Host Bridge generated surfaces are stale:\n- <path>...`。npm: `check:host-bridge-content` = `render-host-bridge-surfaces.ts --check --content-only && check-host-bridge-agent-language.ts && check-host-bridge-consumer-guidance.ts`（`package.json:87`）。
2. **契约互校**：`scripts/host-bridge/host-bridge-command-contracts.ts:289-330` `loadHostBridgeCapabilityContracts` / `loadHostBridgeCommandContracts` 交叉校验（引用 capability 必须存在、binding 合法）。
3. **反向校验（Rust 为准）**：`scripts/host-bridge/host-bridge-surface-catalog.ts:126-143` 用 `execFileSync("cargo", [... "export-command-inventory"])` 取 CLI 真实 argv 清单，`:238-268` 断言"契约中的命令必须存在于 CLI inventory"。
4. **消费者指引校验**：`check-host-bridge-consumer-guidance.ts:187` 报 `contracts/host-bridge/cli-commands.v2.json: missing <command>`。
5. **语言门禁**：`check-host-bridge-agent-language.ts:79-120` 扫描 agent-facing 文本中的歧义词。
6. **XPI 资产门禁**：`scripts/host-bridge/check-plugin-host-bridge-assets.ts:52-56,189-198` 校验 `addon/bin/**` 的二进制与 sha256 侧车；在 `zotero-plugin.config.ts:176-183` 的 `build:pack` 钩子调用。
7. **TS 运行时自身**：registry 加载期断言 handler 名集 == contract 名集（`hostBridgeCapabilityRegistry.ts:2929-2950`）。
8. **CI 接入**：`scripts/ci-gate-plan.ts:18-19` 把 `check:host-bridge-content` 放进 PR 与 release 共用的 SHARED_GATE_STAGES；`.github/workflows/ci.yml:86`（pr gate）、`:111`（release gate）。**`check:host-bridge-surface`（含 release-set 渲染校验）只在 `.github/workflows/release-host-bridge.yml:71` 与 `:111` 出现。**

**【事实】** 校验脚本 → 不变量一览：

| 脚本 | 强制的不变量 |
| --- | --- |
| `render-host-bridge-surfaces.ts --check` | 受治理 Markdown（docs 生成区、addon skill bundle、hermes profile）与源 + descriptor 逐字节一致，否则 stale 抛错（`:1347-1391`） |
| `check-host-bridge-agent-language.ts` | surface 源/生成根 + 7 个 CLI/契约文件不得出现歧义对外措辞（`:6-31`） |
| `check-host-bridge-consumer-guidance.ts` | 消费方 Skill/测试必须用真 CLI harness；topic fragment 源与 4 个渲染副本逐字节一致；14 个语义命令必须存在于 `cli-commands.v2.json`；除 `diagnostic.get_status` 外禁止 raw capability 调用（`:107-245`） |
| `check-host-bridge-skill-packages.ts` | frontmatter/必填段/描述长度；命令卡片链接数与 `assets/agent-surface.json` 命令数一致；无 intra-package 重复；相对 `--baseline-ref` 实质指令行数不降、归一化 prose 字符数 ≥95%（`:6-23,104-110,417-431,464-480`） |
| `check-plugin-host-bridge-assets.ts` | XPI 内 manifest 的 skill id 集合与 surfaces.json 一致；7 平台二进制 sha256/字节数与 `cli-release.json` 一致（`:98-104,171-230`） |
| `check-host-bridge-cli-prebuild-freshness.mjs` | manifest fingerprint == 当前输入 == `binariesBuildFingerprint` == addon manifest；每平台 sha256 侧车匹配（`:57-140`） |
| `check-zotero-bridge-cli-binary-identity.mjs` | 已编译二进制字节中可检索到 version/buildFingerprint/protocol/cliSchema（`:52-74`） |
| `host-bridge-surface-catalog.ts:233-287` | 映射目标能力存在；映射命令在 Rust clap 清单中存在；每个 clap leaf 有可执行目标（5 豁免）；public 非 rawOnly 能力至少一条语义 CLI 映射 |
| `host-bridge-command-contracts.ts:264-325` | 两份契约通过元 schema（Ajv）、身份一致、命令 target 指向已存在能力 |
| `rust/zotero-bridge/src/contract.rs:24-70` | CLI 运行期同样校验元 schema + identity + 命令→能力引用（`OnceLock` 懒加载） |
| `rust/zotero-bridge/src/surface.rs:718-735` | 派生的 v6 descriptor 必须通过内嵌 v6 schema，否则 `agent_surface_contract_violation` |
| `host-bridge-release-set.ts` / `host-bridge-release-controller.ts` | release-set 身份 / receipt 生命周期、`payloadDigest`、三表面完成条件 |
| `host-bridge-cli-release-governance.mjs:65-81` | 指纹输入只含 CLI 源码 / Cargo 输入 / build recipe，排除 workflow、校验、receipt 脚本 |
| `host-bridge-review-mirror.ts:489-513` | 中文审阅镜像的 inventory/provenance 与源文件 sha256 一致 |

**【事实】** CI 调用矩阵：PR gate（`ci.yml:85-86`）跑 `check:host-bridge-content` + `npm run test` + `test:lite`；release gate（`:110-111`）同上 + `test:full`；`release.yml:68,88,103` 跑 prebuild freshness、release gate、XPI 资产校验；`release-host-bridge.yml:71,108-111` 是**唯一**跑 release-set 漂移检查的 CI；dispatch 本地门禁见 `scripts/host-bridge/dispatch-host-bridge-release.ts:129-169`。

### 5.3 `surfaces.json` 与 agent-surface 版本

**【事实】** `surface-model.ts:69-189` 强制的不变量：必须恰好 3 个 surface；skill 的 `mount === "skills/<id>"`；`extends` 必须存在且无环；`minimum-core` 的 `generatedRoot` 必须位于 `generic-agent` 的 `generatedRoot` 之内。三个 surface 是：
- `zotero-bridge-cli`（`minimum-core`，patch 4，1 skill）
- `zotero-library-agent`（`generic-agent`，extends `zotero-bridge-cli`，patch 5，6 skills）
- `zotero-librarian`（`hosted-agent`，facet `hermes`，extends `zotero-library-agent`，patch 5，1 skill）

**【事实】** `patch` **不是** agent-surface schema 版本，而是 surface 版本第三段（`surface-model.ts:256-268` 由 `cliRelease.version` 前两段 + patch 合成）。

**【事实】** agent-surface 版本演进（由各 schema 的 `required`/`properties` 与身份常量比对）：

| 版本 | cliSchema / protocol | 相对前一版新增 |
| --- | --- | --- |
| v2 | cli.v2 / host-bridge.v1 | 基线；命令含 `intents`、`guidance`；无 `globalOptions` |
| v3 | cli.v3 / host-bridge.v1 | +`globalOptions`、+`workflowCatalog` |
| v4 | cli.v3 / host-bridge.v1 | −`workflowCatalog`、−`intents`/`guidance`，+`operationalAliases` |
| v5 | cli.v4 / host-bridge.v1 | 命令必填 +`arguments`、`inputSchemas`、`outputBoundary` |
| v6 | cli.v5 / host-bridge.v2 | 命令必填 +`binding`、`composition`；identity 升 `surface-identity.v6` |

**【事实】** **不存在运行时版本选择**，v6 是 5 处硬编码字面量：`src/shared/hostBridgeAgentContract.ts:1-6`、`rust/zotero-bridge/src/surface.rs:14-15`（内嵌 schema 文件路径）、`:711-713`、`:755`，以及 `cli-commands.v2.json` 的 `cliSchema`。TS 侧 `assertDescriptor` 只校验身份/非空/checksum 形状（`host-bridge-agent-surface.ts:121-136`），真正的 schema 校验发生在 Rust。

### 5.4 生成链

**【事实】**

```
src/schemas/zoteroHostMutationSchemas.ts
  └─(手工执行 render-host-mutation-contract.ts)→ capabilities.v2.json（仅 mutation 段）

rust clap 模型
  ├─(cargo example export-command-inventory, surface-catalog.ts:122-150)→ 内存清单
  │    + capabilities + cli-commands → host-bridge-surface-catalog.ts
  │      → render-host-bridge-surfaces.ts:1300-1392
  │        → docs/host-bridge-cli.md、docs/components/host-bridge-capability-registry.md
  │        → addon/content/host-bridge-skills/**（assets/agent-surface.json、manifest.json、command cards）
  │        → profiles/hermes/zotero-librarian/**
  └─(cargo example export-agent-surface, host-bridge-agent-surface.ts:143-167)→ v6 descriptor
       → render-host-bridge-release-set.ts:36-89 → releases/host-bridge/release-set.json
```

**【事实】** `docs/components/host-bridge-capability-registry.md` 的 16 类别 / 101 能力表由契约实时渲染（`:1340-1346`），`--check` 会因 stale 抛错——**但只覆盖能力清单，不覆盖 schema 正文**。

### 5.5 Rust 侧如何复用

**【事实】**
- 编译期嵌入：`rust/zotero-bridge/src/contract.rs:8-15` 用 `include_str!` 嵌入 `capabilities.v2.json`、`cli-commands.v2.json` 与两份 meta-schema；`surface.rs:14-15` 嵌入 `host-bridge.agent-surface.v6.schema.json`。
- 启动即校验：`contract.rs:24-46` 用 `jsonschema` crate 校验内嵌契约。
- 离线 schema 输出：`schema.rs:8-10, 58-73`（`--schema` 模式）。
- 两个 example 是**导出/校验工具，不写 contracts/**：`examples/export-command-inventory.rs:92-116` 从 clap 导出 `zotero-bridge.command-inventory.v1`；`examples/export-agent-surface.rs:1-18` 用 `#[path]` 复编 args/contract/surface 后打印描述符。

**【事实】** fingerprint 白名单把契约纳入构建身份：`scripts/host-bridge/host-bridge-cli-release-governance.mjs:11-13`（Cargo 输入 + `cli-build-recipe.json`）与 `:63-74`（两份契约 JSON、两份 meta-schema、agent-surface v6 schema、build/package 脚本），源码前缀 `rust/zotero-bridge/src/`。

---

## 6. Rust crate

### 6.1 `rust/zotero-bridge`

**【事实】** 职责：跨 7 平台的 agent 优先 CLI，**只做 HTTP JSON 客户端**——不监听端口、不建 socket、不管子进程。
- `Cargo.toml`：package `zotero-bridge` v0.5.5，edition 2021，AGPL-3.0-or-later；**无 `[[bin]]`**，默认 bin 即 `zotero-bridge`；依赖 clap / serde / serde_json / jsonschema / sha2 / zip（无 HTTP 库、无 tokio）。
- 命令族（`src/args.rs:67-118`，分派 `src/main.rs:153-174`）：`surface` / `bridge` / `call` / `library` / `context` / `navigation` / `synthesis` / `mutation` / `workflow` / `run` / `file` / `product` / `debug` / `operation`。`call <capability> --input <json>` 是通用逃生口（`commands.rs:110-113` → `client.rs:19`）。
- 输出恒为单行 JSON 信封 `{ok,data|error,meta}`（`output.rs:11-54`）。
- 传输：`std::net::TcpStream` 手写 HTTP/1.1，`Authorization: Bearer`（`transport.rs:689,731`）；`/call` 封装 `{capability,input}`（`:98-113`）；仅 `set_read_timeout(30s)`（`:761-771`）；只有下载有 2 次重试（`:239-260`）。
- 端点校验：必须 `http://` 且必须含 `/bridge/v2`（`config.rs:195-208`）。
- 构建产物：`rust/zotero-bridge/target[/<triple>]/release/zotero-bridge[.exe]`；打包脚本 `scripts/host-bridge/package-zotero-bridge-cli.mjs:36-50` 复制到 `addon/bin/<platform>/` 并写 `.sha256`；构建脚本 `scripts/host-bridge/build-zotero-bridge-cli.mjs:117-138`；多平台走 `.github/workflows/build-host-bridge-cli-prebuilds.yml:58-118` 与 `scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:238-275`。
- `addon/bin/` 现状：7 个平台目录各含 `zotero-bridge`(+`.sha256`)，`win32-x64/` 另有 `zotero-acp-bridge.exe`(+`.sha256`)，根有 `zotero-bridge-release.json`。

### 6.2 `rust/acp-ws-bridge`

**【事实】** 职责：**仅 Windows x64** 的本地 WebSocket→子进程桥，作为 ACP stdio 后端的传输侧车；连接方是**插件自己的 ACP transport**，不是外部 agent。
- `Cargo.toml`：package `zotero-acp-bridge` v0.1.0，`[[bin]] name = "zotero-acp-bridge"`；依赖 base64 / serde / serde_json / sha1。
- 唯一 `--serve` 入口，参数 `--host/--port/--token/--ready-file/--log-file`（`src/main.rs:256-284`）；手写 RFC6455 服务端；首帧必须是 `{"type":"spawn",command,args,cwd,env,auditFile}`（`main.rs:31-44`、`611-700`）；子进程退出时 `taskkill /PID /T /F`（`main.rs:595-608`）。
- 构建/打包：`scripts/acp-ws-bridge/build-acp-ws-bridge.mjs:8,19-21`（硬编码 `x86_64-pc-windows-msvc`，非 win32 平台直接报错）、`package-acp-ws-bridge.mjs:6-11,26-40` → `addon/bin/win32-x64/`；npm `prebuild:acp-ws-bridge` / `package:acp-ws-bridge`（`package.json:109-110`）。
- 运行时消费者：`src/modules/acp/transport/acpWebSocketBridgeService.ts:74-75`（`bin/win32-x64/zotero-acp-bridge.exe` + `.sha256`）、`:120-125`（仅 `win32 && !Node` 启用）、`:104-115,214-252`（复制到 `<runtimeRoot>/bin/acp-ws-bridge/<sha前16位>/`）。
- **确实随插件 XPI 分发**：`zotero-plugin.config.ts:176-183` 在 `build:pack` 调 `assertPluginHostBridgeAssets({xpiPath, hostBridgeReleasePath: "releases/host-bridge/cli-release.json"})`；`check-plugin-host-bridge-assets.ts:52` 把 `bin/win32-x64/zotero-acp-bridge.exe` 纳入必需资产；专项测试 `tests/acp/166-acp-websocket-bridge-packaging.test.ts`。

**【事实】** 两个 crate 都**不在** `rust/` 工作区里：`rust/Cargo.toml` 不存在，三个目录各自独立 package。

---

## 7. 资源生命周期

| 资源 | 创建 | 关闭 / 回收 | 证据 |
| --- | --- | --- | --- |
| **listener socket** | `createServerSocket()` → `init(port, loopback?, 16)` → `asyncListen(listener)` | `shutdownHostBridgeServer()` / `stopHostBridgeSupervisor()` 中 `state.serverSocket?.close?.()`；`serverGeneration += 1` 使旧连接失效 | `hostBridgeServer.ts:438-449`、`:1527`、`:1671-1684`、`:1713-1728` |
| **accepted connection** | `onSocketAccepted` 建 `AcceptedHostConnection` 并加入 `acceptedConnections` | 正常结束 `releaseAcceptedConnection`（仅从 set 移除，output 已标记 closed）；异常 `abortAcceptedConnection`（abort 三件套 + closeOutput + closeTransport） | `:1341-1349`、`:1312-1339`、`:1437-1443` |
| **inputStream / outputStream** | `transport.openInputStream/openOutputStream(0,0,0)` | `HostHttpRequestReadOperation.abort()`；`closeOutputOnce` / `closeTransportOnce` 幂等 | `:1470-1471`、`:1312-1330`；`hostHttpRequestReader.ts:352` |
| **连接级超时** | — | `idleTimeoutMs 500` / `totalTimeoutMs 30_000` / `maxHeaderBytes 64 KiB` / `maxBodyBytes 16 MiB` | `hostHttpRequestReader.ts:58-64` |
| **supervisor / recovery** | `startHostBridgeSupervisor()` → `ensureSupervisorTimer()`（30 s 间隔），`scheduleHostBridgeRecovery()`（1 s 延迟） | `stopHostBridgeSupervisor()` / `clearRecoveryTimer()` / `clearSupervisorTimer()`；`onStopListening` 非受控时自动恢复 | `hostBridgeServer.ts:1698-1728`、`:464-533`、`:1508-1525` |
| **进程内 operation receipt** | `reserveHostBridgeOperation()` 写 plugin task context | TTL `getTaskHistoryRetentionConfig().retentionMs`；`cleanup()` 惰性清理；重启 `recoverHostBridgeOperationStoreAfterRestart()` 把遗留 `in_progress` 归 unknown | `hostBridgeOperationStore.ts:11-13`、`:73-80`、`:192-215` |
| **file handle（下载/上传）** | `registerHostBridgeFileHandle` / `registerHostBridgeUploadedFile` / `registerHostBridgeWorkflowArtifactFile` / `registerHostBridgeExportFile` | TTL：普通 30 min（`:15`）、workflow artifact 2 h（`:16`）；`cleanupExpiredHandles()` 惰性清理，**被 lease 的 handle 不清理**（`:172-179`） | `hostBridgeFileRegistry.ts:110-113`、`:205-330` |
| **上传临时文件** | 写入 `getRuntimePersistencePaths().tmpDir`（`:282`） | 无显式删除路径；由 handle TTL + lease 语义管理 | `hostBridgeFileRegistry.ts:282`、`:303` |
| **well-known profile 文件** | `writeHostBridgeWellKnownProfile()`（仅 pinned endpoint 允许） | 无删除路径；rotate 时覆写 | `hostBridgeProfileStore.ts:106-130`；`hostBridgeServer.ts:1544-1553` |
| **CLI profile / shim** | `materializeHostBridgeCliRunInjection()` 写 `<workspace>/.zotero-bridge/{profile.json,README.md,bin/zotero-bridge,.cmd}` | 写失败时回滚 grant（`hostBridgeCliInjection.ts:253-256`）；文件本身随 workspace 生命周期 | `hostBridgeCliInjection.ts:199-256` |
| **写操作免审批 grant** | `issueHostBridgeWriteAutoApprovalGrant()` | 24h TTL + `cleanupExpired()`；`revokeHostBridgeWriteAutoApprovalGrant(s)ForRun()`；`resetHostBridgeWriteAutoApprovalScopesForTests()` | `hostBridgeWriteAutoApprovalRegistry.ts:3,35-73,103-105` |
| **MCP 准入/熔断状态** | `ZoteroMcpToolAdmission`（模块级单例 `:434`） | `resetZoteroMcpServerForTests()` 调 `toolCallAdmission.reset()`；`shutdownZoteroMcpServer()` | `zoteroMcpServer.ts:302`、`:434`、`:2395`、`:2416-2428` |
| **workflow 资源临时目录** | `<tmpDir>/workflow-resources/<runId>`（`hostBridgeWorkflowResources.ts:39`）、输出根 `:489-498` | 未见显式删除；随 tmpDir 生命周期 | `hostBridgeWorkflowResources.ts:39,73,489-498` |
| **agent-run bundle 临时文件** | `getRuntimePersistencePaths().tmpDir`（`hostBridgeWorkflowAgentRun.ts:674`） | 记录由 `hostBridgeWorkflowAgentRunStore` 持久化，含 apply lease / renew / abandon / 重启恢复 | `hostBridgeWorkflowAgentRun.ts:674`；`hostBridgeWorkflowAgentRunStore.ts:251-292,371-405` |
| **插件 skill bundle** | `materializeHostBridgePluginSkillBundle()` → runtime root | `clearHostBridgePluginSkillBundleMaterializationForTests()` | `hostBridgePluginSkillBundle.ts:193,230,366` |
| **acp-ws-bridge 子进程 / ready 文件** | 插件启动 `--ready-file` / `--log-file`，位于 `<runtimeRoot>/tmp/acp-websocket-bridge/` | 插件侧 `proc.kill?.(0)` + 1 s 等待上限（best-effort）；**Rust 侧不清理 ready/log** | `acpWebSocketBridgeService.ts:76-88,285-301,368-380`；`rust/acp-ws-bridge/src/main.rs:987-1005,1029-1051` |

**【事实】** shutdown 总入口在插件卸载路径：`src/hooks.ts:1197-1208` 依序 `runShutdownStepWithTimeout` 执行 `acp-websocket-bridge-shutdown` → `zotero-mcp-shutdown` → `host-bridge-supervisor-stop` → `skillrunner-async-lifecycle-shutdown`。启动侧对应 `src/hooks.ts:907` `startHostBridgeSupervisor()` 与 `:909-916`（MCP 启用时 `ensureHostBridgeServer().then(ensureZoteroMcpServer)`）。

**【事实】** 重启恢复：`startServer()` 开头调用 `recoverHostBridgeOperationStoreAfterRestart()` 与 `recoverHostBridgeAgentRunStoreAfterRestart()`（`hostBridgeServer.ts:1557-1558`）。

---

## 8. 测试覆盖

### 8.1 `tests/host-bridge/`（22 文件，21,753 行，419 个 `it()`）

Runner 是 **mocha + chai**（不是 node:test）：`scripts/run-node-test-shards.ts:433-445` spawn `node_modules/mocha/bin/mocha`，统一 `--require tests/setup/zotero-mock.ts`（`:80`），`--exit` 兜底（`:441-444`）；依赖见 `package.json:190,193,197`。入口 npm `test:node:host-bridge`（`package.json:144`）。

| 文件 | 行 | shard | 主题 |
| --- | --- | --- | --- |
| `101-zotero-mcp-server.test.ts` | 3,467 | runtime | 内嵌 MCP 的 JSON-RPC 协议 / 工具目录 / 健康与响应序列化 |
| `105-zotero-mcp-concurrency-policy.test.ts` | 166 | runtime | MCP 并发准入策略 |
| `106-host-bridge-server.test.ts` | 1,645 | runtime | server phase 1：profile 归属、取消、operation id、异步等待、真实 socket |
| `107-host-bridge-capabilities.test.ts` | 2,811 | runtime | navigation 契约 + canonical Host 读投影 + capability 调用 |
| `108-host-bridge-workflow-control.test.ts` | 4,222 | runtime | workflow 控制面：manifest/list/start、zip、mutation、权限、operation store TTL |
| `108-mcp-host-bridge-mirror.test.ts` | 687 | runtime | MCP ↔ Host Bridge capability 镜像一致性 |
| `109-host-bridge-acp-chat-permission.test.ts` | 99 | runtime | ACP Chat 会话审批路由 |
| `110-host-bridge-cli-acp-chat-profile.test.ts` | 64 | runtime | CLI 注入的 ACP Chat scope owner 归属 |
| `138-host-bridge-file-downloads.test.ts` | 776 | runtime | 文件句柄下载：lease、sha256/长度、截断与同长篡改拒绝、RFC5987 |
| `139-host-bridge-cli-packaging.test.ts` | 2,982 | surface-release | CLI 预构建解析 / 安装 / 打包与 release governance |
| `165-zotero-librarian-profile.test.ts` | 160 | surface-release | zotero-librarian profile 结构与必备文件 |
| `166-zotero-librarian-profile-scripts.test.ts` | 676 | surface-release | resident service 脚本行为 |
| `167-host-bridge-semantic-review-skill.test.ts` | 166 | surface-release | semantic review 的变更文件分类 |
| `167-zotero-library-agent-bundle.test.ts` | 359 | surface-release | library-agent 源码包结构与输出校验 |
| `168-host-bridge-release-coordinator.test.ts` | 826 | surface-release | release set 构建 / 变更分类 / surface 校验 |
| `169-host-bridge-agent-surface.test.ts` | 973 | surface-release | agent surface 契约与 schema / 语言检查 |
| `170-host-bridge-surface-manifest.test.ts` | 277 | surface-release | surface 定义渲染与版本 bump |
| `171-host-bridge-skill-package-validator.test.ts` | 232 | surface-release | skill package validator |
| `172-host-bridge-review-mirror.test.ts` | 274 | surface-release | review mirror prepare/check/finalize |
| `175-host-bridge-plugin-skill-bundle.test.ts` | 82 | surface-release | plugin skill bundle 物化 |
| `182-host-bridge-socket.integration.test.ts` | 535 | surface-release | socket 生命周期集成：鉴权 / 容量 / 超时 / 半包 |
| `186-host-bridge-output-boundaries.test.ts` | 274 | surface-release | 分页 keyset、cursor 错误、文本分块、CLI harness |

**【事实】** shard 划分由文件编号决定：`scripts/run-node-test-shards.ts:153-165`（`host-bridge-runtime` = 编号 <139 的 9 个文件；`host-bridge-surface-release` = 编号 ≥139 的 13 个文件），`--domain` 过滤在 `:763-775`。副作用是运行时的 `182`/`186` 被归入 surface-release shard。

**【事实】** CI 会执行：`scripts/ci-gate-plan.ts:26-27` 的 `test-node` 阶段在 PR 与 release gate 中共用；入口 `.github/workflows/ci.yml:86`（pr）、`:111`（release）。

### 8.2 域外相关测试与基础设施

**【事实】** 域外引用 `modules/hostBridge` 的测试文件 33 个，引用 `zoteroHostCapabilityBroker` 的 19 个。主要分布：
- `tests/acp/`：`96-permissions`（审批路由）、`96-multi-session`/`96-transcript`（pluginSkillBundle）、`103-opencode-mcp-integration`（mcp）
- `tests/synthesis/`：`123-mcp-tools`、`128-review-input-mcp`、`176-client-lifecycle-consumers`、`182-host-export-delivery-port`
- `tests/tooling/`：`163-background-refresh-governance`、`181-host-http-request-reader`、`188-host-http-response-governance`、`194-research-bundle-service`、`273-citation-report-projection`
- `tests/zotero/`：`core/lite/102-acp-zotero-mcp-server.integration`（真 Zotero runtime + localhost socket，非真运行时 skip）、`core/full/188-zotero-navigation`、`core/lite/275-managed-note-transaction`
- `tests/zotero-host/102-zotero-host-broker-capability-api`

**【事实】** 测试基础设施：
- 模块内测试缝：`configureHostBridgeServerForTests` / `handleHostBridgeHttpRequestForTests`（`hostBridgeServer.ts:1828-1900`），被 106/107/108/138 与 `tests/helpers/acpRuntimePerformanceHarness.ts` 使用。
- 真实 socket：仅 106 与 182。
- CLI fixture harness：`tests/helpers/hostBridgeCliHarness.ts:456` `startHostBridgeCliFixtureHarness`、`:558` `withHostBridgeCliHarness`。
- fail-closed broker 替身：`tests/helpers/zoteroHostCapabilityBrokerHarness.ts:17` `createFailClosedZoteroHostCapabilityBroker`。
- **无独立进程级 host bridge fixture，也无 host-bridge 专用 fake Zotero host。**

**【事实】** 无直接测试文件引用的模块（仅经 HTTP 层间接覆盖）：`server/hostBridgeAuth.ts`、`server/hostBridgeRouteContract.ts`、`server/routes/*.ts`（5 个）。反例：`server/hostBridgePagination.ts` 无同名测试，但被 `tests/host-bridge/186-...test.ts:7` 直接 import。

---

## 9. 疑点清单（待核查，未下结论）

1. **发布清单的 fingerprint 输入路径已漂移。** `releases/host-bridge/cli-release.json:7-27` 与 `addon/bin/zotero-bridge-release.json` 的 `fingerprintInputs` 仍写 `cli/zotero-bridge/...`、`host-bridge/contracts/...`、`scripts/build-zotero-bridge-cli.mjs`；实测 `cli/`、`host-bridge/` 目录不存在，真实路径是 `rust/zotero-bridge/...`、`contracts/host-bridge/...`、`scripts/host-bridge/...`。证据：`releases/host-bridge/cli-release.json:7-27`、`ls cli/ host-bridge/`（No such file）。需核查 fingerprint 计算是否走 `host-bridge-cli-release-governance.mjs:11-13,63-74` 的真实白名单而非该 JSON。
2. **`render-host-mutation-contract.ts` 无任何引用，且 mutation 段无等价性门禁。** 全仓 `grep -rn 'render-host-mutation-contract' package.json scripts/ .github/ tests/` 零命中（排除自身与 artifacts），但它会写 `contracts/host-bridge/capabilities.v2.json`。证据：`scripts/host-bridge/render-host-mutation-contract.ts:16-19,112-124`。其 `--check` 未接入 `package.json`、`ci-gate-plan.ts` 或任何 workflow；CI 只对 mutation 段做 Rust 元 schema 校验与 TS 身份字面量校验，**没有**与 `src/schemas/zoteroHostMutationSchemas.ts` 的等价性检查。需确认这是有意的手工步骤还是遗漏。
3. **`cli-commands.v2.json` 无生成器，且不被任何 `src/` 文件读取。** 仅脚本与 Rust 读取；消费者为 `host-bridge-command-contracts.ts:307-325`、`host-bridge-surface-catalog.ts:152-231`、`check-host-bridge-consumer-guidance.ts:183-195`、`rust/zotero-bridge/src/contract.rs:10-11`、`tests/helpers/hostBridgeCliHarness.ts:18`。
4. **多份 schema 已成孤儿。** 实测引用计数：agent-surface v2/v3/v4/v5 各 0（v6 为 7）；`host-bridge.semantic-guidance.v2.schema.json` 零生产者零消费者；`release-set.v2/v3` 零引用，v1/v4 与 receipt v1/v2 只出现在语义评审分类列表（`host-bridge-semantic-review-context.ts:132-138`）且无 validator 编译。需确认是否有外部消费者按 `$id` 读取，还是可归档。
5. **`render-host-bridge-surfaces.ts` 的 `mode` 参数未被使用。** `:41`、`:1266` 声明并在函数体内零引用 `args.mode`，`--content-only` 与实际行为无关（真正差异来自是否调用第二个脚本）。证据：`scripts/host-bridge/render-host-bridge-surfaces.ts:41,1266,1406`。
6. **MCP 协议层硬编码 `connectionMode: "local"`。** `zoteroMcpProtocol.ts:1265`。LAN 模式下经 `/mcp` 进入的远程调用会在 capability 上下文里呈现为本地语义，进而影响 `workflow_products.export` 的 outputDir 分支（`hostBridgeCapabilityRegistry.ts:1515`）与 `ownerId`（`:2611`）。需核查是否有意（MCP 只走本机）以及 LAN + MCP 组合是否有额外门禁。
7. **`acp-ws-bridge` 二进制无外部期望 digest。** 只有 `addon/bin/win32-x64/zotero-acp-bridge.exe.sha256` 与同包自洽；它不在 `releases/host-bridge/cli-release.json` 的 `binaries` 列表内，也没有自己的 version manifest。证据：`check-plugin-host-bridge-assets.ts:52`、`addon/bin/zotero-bridge-release.json:binaries`（仅 7 平台 `zotero-bridge`）。
8. **acp-ws-bridge ready/log 文件无清理路径。** Rust 侧只 `terminate_child`，不删 ready-file/log（`rust/acp-ws-bridge/src/main.rs:987-1005,1029-1051`）；插件侧 shutdown 只 `proc.kill?.(0)`（`acpWebSocketBridgeService.ts:368-380`）。长期运行可能在 `<runtimeRoot>/tmp/acp-websocket-bridge/` 累积。
9. **CLI 与 contract 的 canonical mutation 名单是第二事实源。** `rust/zotero-bridge/src/client.rs:108-118` 硬编码 `is_canonical_mutation` 列表（29 项），与 `contracts/host-bridge/capabilities.v2.json` 的 mutation 类别及 `hostBridgeCapabilityRegistry.ts:1246` `CANONICAL_MUTATION_PROJECTION_NAMES` 需要人工同步。
10. **`check:host-bridge-surface` 不在 PR 门禁。** CI 共用门禁只含 `check:host-bridge-content`（`scripts/ci-gate-plan.ts:18-19`、`.github/workflows/ci.yml:86,111`）；含 release-set 渲染校验的 `check:host-bridge-surface` 只在 `.github/workflows/release-host-bridge.yml:71,111`，以及 dispatch 的本地门禁（`dispatch-host-bridge-release.ts:140-148`）。需确认 PR 阶段是否有其他 gate 覆盖 release-set 漂移。
11. **上传临时文件无删除路径。** `hostBridgeFileRegistry.ts:282` 把上传写入 `getRuntimePersistencePaths().tmpDir`，注册表只按 TTL 丢 handle（`:172-179`），未见删除磁盘文件的代码。需核查 `runtimePersistence` 侧是否有 tmpDir 兜底清理。
12. **`routes/*` 与 `hostBridgeAuth.ts` 无直接单测。** 仅经 106/107/108/138 的 HTTP 层间接覆盖，各路由的独立错误分支（如 diagnostics/synthesis 的异常路径）覆盖程度未经逐分支比对。
13. **`scripts/host-bridge/check-host-bridge-skill-packages.ts` 与 7 个内置 skill 目录的对应关系**（`package.json:75,78` 列举 7 个包）未在本次逐项核对，profile 发布路径（`profiles/hermes/zotero-librarian`）与 `contracts/host-bridge/surfaces.json:62-77` 的一致性留给后续核查。

---

## 10. 未覆盖范围

### 侦察方式与分工
本报告由 4 条并行只读侦察线合并：主侦察（Host Bridge TS 运行时、生命周期、接口与流程）+ 3 个委派子侦察（Rust crate / 跨语言契约 / 测试覆盖）。子侦察结论中影响判断的关键项，主侦察已独立复核并在正文标注：`Cargo.toml` 两处、`client.rs:108-118`、打包脚本、`addon/bin` 清单、`releases/host-bridge/cli-release.json` 的 `fingerprintInputs` 漂移、mocha runner、`surfaces.json` 全文、各 schema 引用计数、`hostBridgePluginSkillBundle.ts:1` 的静态 import、`render-host-mutation-contract.ts` 零引用。

### 已实际阅读/核验
- `src/modules/hostBridge/`：全部 36 个文件的**目录角色与导出面**（通过 `grep -n '^export'` 全量枚举）；其中**逐行精读**：`server/hostBridgeServer.ts`（约 900 行区间）、`server/hostBridgeAuth.ts`（全）、`server/hostBridgeRouteContract.ts`（全）、`server/hostBridgeFileRegistry.ts`（部分）、`server/hostBridgeOperationStore.ts`（部分）、`server/routes/hostBridgeCapabilityRoutes.ts`（约 400 行）、其余 4 个 routes 的 `match*` 函数与错误映射、`mcp/zoteroMcpProtocol.ts`（tools/call 段）、`mcp/zoteroMcpServer.ts`（路由/准入门面）、`permissions/hostBridgePermissionManager.ts`（约 300 行）、`permissions/hostBridgeWriteAutoApprovalRegistry.ts`（全）、`workflow/hostBridgeWorkflowResources.ts`（部分）、`cli/hostBridgeCliInjection.ts`（部分）、`cli/hostBridgeCliResolver.ts`（部分）。
- `src/modules/hostBridgeCapabilityRegistry.ts`：导出面全量枚举 + 关键段（`:2560-3052`）精读；未读 1–2560 行的各 handler 实现细节。
- `src/modules/zoteroHostCapabilityBroker.ts`：导出面全量枚举（18,546 行中未精读任何实现段）。
- `rust/zotero-bridge/`、`rust/acp-ws-bridge/`：由子侦察完成 file-level 阅读（含 `args.rs` 命令族、`transport.rs`、`config.rs`、`main.rs`、examples、`tests/schema_mode.rs`）；主侦察复核了 `Cargo.toml`（两处）、`client.rs:100-125`、打包脚本、`addon/bin` 清单。
- `contracts/`：文件清单与行数、`surfaces.json`（全读）、各 schema 的引用计数、生成/校验脚本的关键行、Rust `include_str!` 位置、TS 侧 3 处静态 import、agent-surface v2–v6 的字段差异与 5 处硬编码字面量。
- `tests/host-bridge/`：22 个文件的逐个主题由子侦察给出；主侦察复核了 runner 是 mocha（`scripts/run-node-test-shards.ts:433-445`）、shard 划分（`:153-165`）与 CI 接入（`scripts/ci-gate-plan.ts:26-27`）。
- `docs/components/host-bridge-*.md`、`zotero-host-capability-broker-ssot.md`：标题级 + 关键段。
- `src/hooks.ts`：启动/关闭接线段。
- `scripts/host-bridge/`：约 20 个脚本做引用级核查（哪些被 npm/CI 调用、调用什么命令）。

### 未读 / 未验证
- `hostBridgeCapabilityRegistry.ts` 1–2560 行的逐 handler 语义（仅抽样 `library.*`、`workflow_products.export`）。
- `workflow/hostBridgeWorkflowControl.ts`（3,569 行）与 `workflow/researchBundleService.ts`（2,921 行）的实现主体——只读了导出面与少量行。
- `mcp/zoteroMcpServer.ts` 与 `mcp/zoteroMcpProtocol.ts` 的多数实现段（准入状态机、熔断、诊断事件、响应构造）。
- `cli/hostBridgeCliInstaller.ts`（715 行）与 `cli/hostBridgeInstallPrompt.ts`（398 行）的安装目标解析与策略细节。
- `contracts/host-bridge/capabilities.v2.json`（53,044 行）与 `cli-commands.v2.json`（11,982 行）的**逐条内容**——只验证了引用关系、条目计数（101 能力 / 133 命令）、键序特征与 schema 元信息，未逐条比对 capability 列表与 CLI 映射。
- `contracts/synthesis-sidecar/`（6 个 schema）只做引用级核对，未展开语义。
- `rust/synthesis-sidecar/` 不在本次范围。
- `scripts/host-bridge/` 的 release / 审批 / semantic-review 系列脚本的实现主体未读（只读了不变量描述所对应的行区间）。
- **未运行任何构建、测试、cargo 命令或 JSON Schema 校验**，因此"契约当前是否自洽"是未经验证的状态；本报告只报告校验**机制**的存在与位置。
- 未做 git 历史 / 变更频率分析；未评估文档与代码漂移（除 §9 第 1 条路径漂移与第 2 条孤立脚本外）。
