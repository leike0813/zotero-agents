# Synthesis 栈侦察报告（只读）

- 侦察对象：`src/modules/synthesis/`、`src/modules/synthesisClient/`、`packages/synthesis-*`、`rust/synthesis-sidecar/`、`src/synthesis/`、`src/modules/literatureArtifactMigration.ts`
- 仓库基线：分支 `research/e2e-historical-regressions`，HEAD `d75221a75e1e40425edd20c1c5a198c6f1bb6975`（来源 `artifacts/openviking-bootstrap/20260916T1450Z/STATE.md`）
- 方法：只读 `rg`/`ls`/文件阅读 + registry JSON 解析；未运行构建、测试、cargo、git 写操作
- 约定：**事实**直接给证据路径；**推测**显式标注「推测」

## 0. 规模基线（实测）

| 范围 | 文件 | 行数 |
|---|---|---|
| `src/modules/synthesis/` | 41 | 19,801 |
| `src/modules/synthesisClient/` | 5 | 9,984（其中 `clientPortAdapter.ts` 2,684） |
| `src/synthesis/`（Preact 页面） | 45 | 25,891 |
| `src/modules/literatureArtifactMigration.ts` + `literatureArtifactMigration/converter.ts` | 2 | 3,960 |
| `packages/synthesis-contracts/` | 112（含 contract-set 57 个 JSON） | 47,432 |
| `packages/synthesis-engine/` | 11 | 11,572 |
| `packages/synthesis-repository/` | 12 | 7,063 |
| `packages/synthesis-application/` | 19 | 10,840 |
| `rust/synthesis-sidecar/`（排除 `target/`） | 107（`.rs` 87 个） | 92,897 |
| `tests/synthesis/` | 67 个测试文件 | 44,594 |
| `scripts/synthesis/` | 35 个脚本 | — |

Rust workspace 14 个 crate：`rust/synthesis-sidecar/Cargo.toml`。

---

## 1. 职责与边界

### 1.1 Synthesis 层是什么

Synthesis 层是一套「本地文献合成缓存 + 派生决策库 + 工作台 UI」的完整子系统：它以 Zotero Library 为事实源，把文献工件（digest / topic / citation analysis）、参考文献、引用图、标签词表、概念库、话题图持久化为**可容忍陈旧的旁路投影**，只把「用户已批准的 reference/binding/dedupe 决策」当作一等事实。

- 目标规则清单（权威表述）：`docs/synthesis-layer/README.md:109-125`
- 生产归属声明：`docs/synthesis-layer/README.md:135-142`「唯一生产 owner 是 XPI 内置的 Rust native runtime，由 manifest v3 选择；TS 拥有分组 client/UI 编排与 Zotero/凭据/文件/网络的反向 Host 适配」

**事实（代码核实）**：上述归属与代码一致 —— 生产生命周期入口只有 `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:601` 的 `pub fn serve(&Path)`；TS 侧不存在 `src/modules/synthesis/service.ts` 或 `repository.ts`（由 `scripts/synthesis/check-synthesis-service-boundary.ts:7-14` 的 `LEGACY_OWNER_PATHS` 与 `apps/synthesis-service` 黑名单强制）。

### 1.2 TS 侧 / Rust sidecar 侧职责划分

**Rust sidecar 独占**（`rust/synthesis-sidecar/crates/`）：

| 归属 | 证据 |
|---|---|
| HTTP 监听、能力分发、请求上下文 | `crates/synthesis-sidecar/src/runtime_server_loop.rs`、`runtime_capabilities.rs`（636 行） |
| 生产生命周期、discovery 发布、清理 | `runtime_service.rs`、`runtime_lifecycle.rs` |
| SQLite repository（62 表 / 51 索引）、事务、migration | `crates/synthesis-repository/src/lib.rs`、`schema.sql` |
| canonical Topic 文件存储 | `crates/synthesis-canonical-store/src/lib.rs`（3,433 行） |
| domain application（topic / reference / tag / concept / graph / webdav / durable bundle） | `crates/synthesis-application/src/*.rs`（55,206 行） |
| 纯计算 worker（matcher、index、layout、graph build） | `crates/synthesis-{reference-matcher,concept-kb,tag-vocabulary,topic-graph,citation-graph-build,citation-layout,metrics}` |
| worker 子进程池 | `runtime_worker_pool.rs`（1,576 行） |

**TypeScript 侧**（`src/modules/synthesis/`、`src/modules/synthesisClient/`、`src/synthesis/`）：

- 进程管理：安装、启动、发现、健康、停止、恢复 —— `src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts:301`
- RPC 传输与协议编解码：`synthesisSidecarRpcClient.ts`、`synthesisSidecarControlClient.ts`、`synthesisSidecarComputeClient.ts`、`synthesisSidecarTransferClient.ts`
- 分组 client（唯一生产 adapter）：`src/modules/synthesisClient/clientPortAdapter.ts`、组合 `nativeComposition.ts`、`defaultClient.ts`
- reverse-host 服务端（sidecar 回调宿主）：`src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts:215`
- Zotero 宿主能力适配：`libraryAdapter.ts`（1,572 行）、`tagEffectAdapter.ts`、`relatedItemsEffectAdapter.ts`、`representativeImageReadAdapter.ts`、`exportDeliveryAdapter.ts`、`runWorkspaceMaterializationAdapter.ts`、`zoteroItemRefAdapter.ts`
- WebDAV 网络与凭据：`webDavSyncAdapter.ts`、`webDavSyncPrefs.ts`、`webDavSyncCredentialPrefs.ts`、`webDavSyncRemote.ts`
- Preact 页面与区域渲染：`src/synthesis/**`，bundle 入口 `src/synthesisWorkbenchApp.ts`
- Host 侧迁移：`src/modules/literatureArtifactMigration.ts`（见 1.4）

**边界约束（事实）**：`scripts/synthesis/check-synthesis-service-boundary.ts` 是这套边界的机器门禁：

- `findSynthesisContractBoundaryViolations()` 禁止 contracts 包 import `node:*`、`zotero-*`、任何 `/src/` 路径，并禁止出现 `Zotero|Window|Document|HTMLElement` 全局（`check-synthesis-service-boundary.ts:97-124`）
- `findSynthesisProductionBoundaryViolations()` 要求 Rust 侧只有 `runtime_service.rs` 可以调用 `Repository::open_production` / `CanonicalStore::open_production`（`check-synthesis-service-boundary.ts:137-151`）
- 禁止 `synthesis/service|repository`、`legacyComposition`、`inProcessClient`、`createSynthesisService` 等 legacy owner 痕迹（`check-synthesis-service-boundary.ts:43-77`）

### 1.3 与周边系统的关系

**与 Zotero 主进程**：sidecar 不能直接读 Zotero。所有库事实经 reverse-host 回调用 TS 的 `ZoteroHostCapabilityBroker` 与只读 port 获取。

- 17 条 `sidecar-to-host` 能力（`packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json`，`direction: sidecar-to-host`）：`library.items.{sync_snapshot,list_page,get_by_ref,get_audit_state}`、`library.artifacts.{scan_page,readiness,read}`、`library.representative_image.read`、`delivery.export.{publish_archive,materialize_run_workspace}`、`webdav.{describe,read_text,write_text,ensure_collection}`、`effects.{related_items.apply_batch,tags.apply_batch,staged_tag_binding.resolve}`
- 宿主实现装配：`src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:439` `createDefaultSynthesisReverseHostHandlers()`
- 该函数同时接 `createZoteroSynthesisHostReadPort()`、broker 的 tag audit state、`createPrefsConfiguredSynthesisWebDavSyncPort()`（`synthesisReverseHostHandlers.ts:445-483`）
- Rust 侧调用点：`crates/synthesis-sidecar/src/runtime_production_ports.rs:1923` `impl ReverseHostApplicationPort`，实际 HTTP 发送在 `runtime_reverse_host.rs:81` `send_reverse_host_request`

**与 WebDAV**：WebDAV 是**唯一跨设备 durable 状态交换通道**，绝不传 SQLite 文件（`docs/synthesis-layer/README.md:124`）。职责切分：

- Rust 拥有 bundle/import/sync 应用状态机：`crates/synthesis-application/src/webdav_sync.rs`（1,651 行，`run_sync`/`pause`/`resume`/`retry`/`resolve_conflict`/`shutdown`）、`durable_bundle.rs`（1,323 行）
- TS 拥有 prefs、加密凭据、URL 构造、HTTP、abort 权限：`src/modules/synthesis/webDavSyncPrefs.ts:258` `saveWebDavSyncCredential`、`webDavSyncCredentialPrefs.ts`（AES-GCM 信封，`crypto.subtle.encrypt`）、`webDavSyncAdapter.ts:87` `createPrefsConfiguredSynthesisWebDavSyncPort`
- 契约：secret-free port 定义 `packages/synthesis-contracts/src/webDavSyncPort.ts:67` `SynthesisHostWebDavSyncPort`（`describe/read_text/write_text/ensure_collection`，文本上限 4 MiB）

**与 citation graph**：见 §4.2。要点：graph 的 snapshot/分页/指标/layout identity/独占持久化全部归 `CitationGraphApplication`（`crates/synthesis-application/src/citation_graph.rs:292`），runtime 只保留 wire DTO、Host facts 收集与 Workbench 投影。

**与 topic workbench**：`topic-workbench` 是 registry 中最大的 client 域之一（20 条能力），同时是 UI 的 surface 名（`packages/synthesis-contracts/src/workbench.ts:31-38`：`home/topics/index/review/graph/tags/concepts/reader`）。topic 的规范化内容以 canonical current files 为唯一 runtime SSOT（`docs/synthesis-layer/README.md:117`）；Rust 侧实现于 `crates/synthesis-application/src/topic.rs`（3,857 行）与 `crates/synthesis-canonical-store/src/lib.rs`。

### 1.4 `src/modules/literatureArtifactMigration.ts` 的定位

Host 侧的 legacy 文献工件迁移器，**不属于 Synthesis runtime**，但复用 Synthesis 的规范工件契约：

- 定义：`src/modules/literatureArtifactMigration.ts:54-55`（`LITERATURE_ARTIFACT_MIGRATION_ID = "literature-artifacts"`，`DEFINITION_VERSION = 6`）
- 复用 Synthesis 契约（单向依赖，无反向）：`literatureArtifactMigration.ts:1-7` import `packages/synthesis-contracts/src/sourceReferenceArtifact`（`generateSourceReferenceId`、`parseSourceReferenceArtifact`、`compactCitationAnalysisSnippets`）
- 转换逻辑独立目录：`src/modules/literatureArtifactMigration/converter.ts:1297` `convertLegacyArtifactSet`
- 消费方为 Dashboard 与 workflow editor：`src/modules/dashboard/dashboardSnapshot.ts:2459`、`src/modules/workflow/ui/workflowEditorHost.ts:12`
- 反向依赖检查：`grep -rn "literatureArtifactMigration" packages/ --include=*.ts` 无结果 → **事实：packages 不依赖该迁移模块**

---

## 2. 进程与协议

### 2.1 三方进程模型

```
Zotero 主进程（TS 插件）
  ├─ 子进程：synthesis-sidecar serve --config <sessionRoot>/config.json   （Rust，独立进程）
  │     └─ 子进程：synthesis-sidecar worker                               （同二进制，NDJSON worker）
  └─ 本地 HTTP 服务端：reverse host（sidecar 反向调用宿主）
```

二进制同一个，两个 CLI 子命令：`rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs:19-27`（`worker` / `serve --config <path>`，其它参数返回 `usage: ...`）。`main.rs:6` 只做 CLI 适配，不组装 runtime module graph（符合 AGENTS.md 硬约束）。

### 2.2 发现与启动

**TS 侧（supervisor）启动序列** —— `src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts:564` `launch()`：

1. 解析 profile 路径并 hash 成 `profileId`；生成 `supervisorInstanceId = sup-<hex16>`（`:584-585`）
2. 计算 session 目录：`getSynthesisSidecarLifecyclePaths()`（`:586`；定义在 `src/modules/runtimePersistence.ts:587-608`）
   - `profileRoot = <runtimeRoot>/profiles/<profileId>`
   - `sessionRoot = <profileRoot>/sessions/<supervisorInstanceId>`
   - `configPath = sessionRoot/config.json`，`discoveryPath = sessionRoot/discovery.json`
3. 安装/校验 runtime bundle（`:592-594`，`installer.ensureInstalled()`）
4. 构造 launch config（`rebuildSynthesisSidecarLaunchConfig`，schema `synthesis-sidecar-launch-config.v4`；TS 常量 `packages/synthesis-contracts/src/sidecarLifecycle.ts:20`），含随机 `clientToken`/`lifecycleToken`（各 `randomHex(32)`，`:626-627`）、`port: 0`
5. 原子写 `config.json`（`:630` `replacePrivateRuntimeTextFileAtomically`）
6. `subprocess.call({ command: install.executablePath, arguments: ["serve","--config",configPath], environment: sealedEnvironment(), environmentAppend: false })`（`:634-641`）
7. 轮询等待 `discovery.json`：`waitForDiscovery`（`:531`），超时 `sidecar_discovery_timeout`；进程提前退出则用 stderr 的稳定失败码（`:520-529`）
8. 身份比对：`profileId/supervisorInstanceId/bundleId/buildFingerprint/schemaVersion/runtimeRootId/dataRootId` 任一不符即 `sidecar_discovery_identity_mismatch`（`:669-681`）
9. `controlClient.health()` + `controlClient.handshake()`（`:687-688`），成功后才 publish `status: "ready"`

**Rust 侧启动序列** —— `runtime_service.rs:178` `RunningRuntime::start()`：

| 阶段（`startup_step` 名） | 位置 |
|---|---|
| `config-validate` | `:182-190` |
| `reverse-host-probe` | `:194`（先验证宿主可达） |
| `owner-acquire`（抢生产锁 + 清 stale discovery） | `:195-197` |
| `source-validate`（DB/canonical 半开状态拒绝） | `:212-219` |
| `source-classify`（legacy topic 预检） | `:225-250` |
| `repository-migrate` | `:251-257` |
| `repository-open` / `canonical-open` | `:258-269` |
| `application-compose` | `:286-295` |
| 重启对账 `reconcile_restart` | `:296-299` |
| `listener-bind` | `:324` |
| `discovery-publish` | `:327-333` |
| stdout `{"type":"listening",...}` | `:334-341`（**仅诊断用**） |

**发现文件是 ready 提交点**：`runtime_service.rs:567` `discovery_document()` 产出 `schema: "synthesis-sidecar-discovery.v5"`，字段含 `host: "127.0.0.1"`、`port`、`pid`、`lifecycleState: "ready"`、`tokenLocator: "supervisor-session"`、`capabilities`（`:584-590`）。TS 侧对应生产校验器是 `packages/synthesis-contracts/src/sidecarProduction.ts:561` `rebuildSynthesisProductionDiscovery()`（schema 常量在 `sidecarProduction.ts:123`）。

**并发保护**：`runtime_lifecycle.rs:249` `RuntimeOwnership::acquire()` 对 `<state_root>/synthesis.lock` 做 `try_lock`（`:255-267`），失败即 `production_lock_conflict`；抢锁成功后立刻删除 stale `discovery.json`（`:268-273`），删除失败即 `stale_discovery_cleanup_failed`。锁随进程生命周期持有，`Drop` 时移除 discovery（`:290-294`）。

### 2.3 传输协议与 wire contract 单一事实源

**运行通道（事实）**：loopback HTTP/1.1 + Bearer。

- 调用路径：`packages/synthesis-contracts/src/sidecarSystem.ts:38` `SYNTHESIS_SIDECAR_CALL_PATH = "/synthesis/v1/call"`
- 协议版本：`sidecarSystem.ts:36` `SYNTHESIS_SIDECAR_PROTOCOL = "synthesis-sidecar.v1"`
- 请求体：`{protocol, requestId, profileId, capability, payload, trace?}`（`src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts:229-236`）
- 鉴权：`authorization: Bearer <clientToken>`（`synthesisSidecarRpcClient.ts:278`）；Rust 侧解析于 `crates/synthesis-sidecar/src/runtime_http.rs:194`
- 响应：`{ok, requestId, serviceInstanceId, data, error{code,details}}`；TS 校验 `requestId` 回显（`synthesisSidecarRpcClient.ts:306-320`）
- 体积与深度上限：`sidecarSystem.ts:283-295`（普通请求 1 MiB；compute 请求/响应各 8 MiB；JSON 深度 32；节点数 50k / compute 1M / 200k；字符串 64 KiB）
- HTTP 帧策略与错误映射：`runtime_http.rs:52-79`（431/413/408/400 映射到 `http_request_*` 稳定码）

**wire contract 的单一事实源是 `packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/`**：

- `registry.json`（66,536 字节）是能力清单与 schema 引用表：**130 条 capability**（113 host→sidecar，17 sidecar→host）、**15 条 worker operation**、11 个 document、14 个 corpus、2 个 opaqueLeaves
- 19 个 JSON Schema（`contract-set/synthesis-sidecar-protocol-v1/schemas/*.schema.json`），另有外部引用 `contract-set/canonical-literature-artifacts-v1/schemas/{source-reference,citation-analysis,literature-score}-artifact.schema.json`
- TS 侧运行时校验入口：`packages/synthesis-contracts/src/protocolSchema.ts:118` `rebuildSynthesisProtocolDto()` 与 `:186` `rebuildSynthesisProtocolCapabilityDto()`（Ajv2020，`strict: true`）
- Rust 侧的**常量**（不含 DTO schema）：`crates/synthesis-protocol/src/lib.rs:8-23`（`WORKER_PROTOCOL = "synthesis-rust-worker.v1"` 与 15 个 operation 名）、`:25-28`（page 上限：4 MiB / 100k 行 / 100k 节点 / index ≤ 255）

**协议族的第二层契约（release/打包，非 wire）**：`contracts/synthesis-sidecar/schemas/*.schema.json`（prebuild result v1/v2、prebuild set v1、release receipt v1、release set v1、symbol manifest v1）。二者职责不同：`packages/.../contract-set/` 描述**运行时 wire**，`contracts/synthesis-sidecar/` 描述**构建/发布工件**。

### 2.4 回调协议（sidecar → host）

- 路径：`src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts:28` `SYNTHESIS_REVERSE_HOST_PATH = "/synthesis/v1/host-call"`
- Rust 发送：`runtime_reverse_host.rs:99` 手写 HTTP 请求（`POST ... Connection: close`，`Authorization: Bearer <reverse_host.authorization_token>`）
- 超时按能力分级：`runtime_reverse_host.rs:23` `reverse_host_timeout()`；宿主侧表见 `runtime_reverse_host.rs:529`（如 `library.artifacts.scan_page` = 30 分钟）
- TS 服务端：`synthesisReverseHostEndpoint.ts:215` `createSynthesisReverseHostEndpoint()`，使用 XPCOM server socket（`onSocketAccepted`，`:407`），只绑定 loopback
- 分发与效果分类：`synthesisReverseHostBroker.ts:102` `createSynthesisReverseHostBroker()`；`isEffect()` 判定 `effects.*` 前缀（`:75`）
- 能力白名单顺序校验和 handler 完整性校验：`synthesisReverseHostBroker.ts:92-99`

### 2.5 worker 子协议

- Rust 计算池按需 spawn 自身二进制 `worker` 子命令：`runtime_worker_pool.rs:465` `WorkerChild::spawn()` → `Command::new(executable).arg("worker")`；executable 来自 `std::env::current_exe()`（`:643`）
- 协议帧：NDJSON over stdin/stdout，首帧必须 `{protocol:"synthesis-rust-worker.v1", type:"ready"}`（`:507-511`，常量 `synthesis-protocol/src/lib.rs:8`）
- 15 种 worker 操作枚举：`runtime_worker_pool.rs:34-50` `enum WorkerOperation`
- 分页输入/输出：`synthesis-protocol/src/lib.rs:590` `PageDescriptor`、`:809` `page_descriptor()`、`:899` `paged_request_hash()`、`:913` `PagedInputValidator`、`:1074` `PagedInputAssembler`
- 池约束（事实）：1 个活跃 + 最多 2 个排队，第 3 个排队立即 `worker_busy`（`runtime_worker_pool.rs:668`、`:702`）；3 次连续运行时崩溃后熔断为 `worker_unavailable` / `state: degraded`（`:1019` `worker_fused`；测试 `runtime_service.rs:670-706`）

### 2.6 关闭路径

- TS：`synthesisSidecarRuntimeSupervisor.ts:707` `stop()` → 先 publish `stopping`，再 `stopProcess()`（先 `controlClient.shutdown()`，再关 stdin，再等 500 ms，再 kill）与 `cleanupSession()`（删 sessionRoot），最后 publish `stopped`（`:712-738`）
- TS：`stopProcess` 的实现见 `:405-425`（`shutdown()` 失败被吞掉，最终以 stdin EOF / kill 兜底）
- Rust：`system.shutdown` 只表示停止请求被接受；`runtime_service.rs:368` `run()` 退出循环后进入 `:428` `shutdown()`，`cleanup_deadline = Instant::now() + SHUTDOWN_TIMEOUT`（**500 ms**，常量 `runtime_service.rs:34`）
- 父输入关闭同样触发停止：`runtime_service.rs:593` `watch_parent_input()` 在 stdin 读到 EOF 时 `request_normal(StopReason::ParentInputClosed)`

---

## 3. packages/ 分层

### 3.1 四个 package 的职责

| package | 职责 | 代表文件 |
|---|---|---|
| `synthesis-contracts` | wire DTO 的 rebuild/validation、契约集（registry+schema+corpus）、生命周期/安装/发布契约、跨语言常量 | `src/protocolSchema.ts`、`src/workbench.ts`、`src/sidecarSystem.ts`、`src/sidecarLifecycle.ts`、`src/sidecarProduction.ts`、`src/sidecarRuntimeBundle.ts` |
| `synthesis-engine` | 纯计算算法（作为 Rust worker 的 TS 对等实现 / oracle） | `referenceMatcher.ts`（4,269）、`citationGraphBuild.ts`（1,469）、`topicStructuredArtifact.ts`（1,733）、`conceptKbIndex.ts`（941）、`tagVocabulary.ts`、`topicGraphIndex.ts`、`citationGraphBuildTransfer.ts` |
| `synthesis-repository` | TS 侧 SQLite 访问（schema 常量 + 行级读写），供 harness/oracle 使用 | `citationGraph.ts`、`citation_reference` 对应物 `durableBundle.ts`、`topicGraph.ts`、`schemaVersion.ts` |
| `synthesis-application` | TS 侧 application service 组合（Rust application 的对等物）+ 少量生产投影渲染器 | `citationGraphApplication.ts`、`referenceRefreshApplication.ts`、`tagVocabularyApplication.ts`、`topicApplication.ts`、`referenceProjection.ts`（被生产使用） |

`package.json` 均为 `private: true`、`exports: "./src/index.ts"`（未编译发布，直接被 `src/` 与脚本以源码路径 import）。

### 3.2 依赖方向（实测）

用 `grep -rhno 'from "…synthesis-…"'` 统计跨 package import：

```
synthesis-contracts  → （无其它 synthesis package；只 import contract-set JSON 与 ajv）
synthesis-engine     → synthesis-contracts（canonicalJson / topicGraphCore / tagVocabularyCore / conceptKbCore）
synthesis-repository → synthesis-contracts（durableBundle / durableBundleImport / schemaVersion）
synthesis-application→ synthesis-contracts + synthesis-engine + synthesis-repository
```

**结论（事实）：无跨层反向依赖。** `synthesis-contracts` 是最底层且零依赖（除 ajv 与 JSON），`synthesis-application` 是唯一同时依赖 engine 与 repository 的层。

对 `src/` 的依赖分布（`grep -rn "synthesis-<pkg>" src/ --include=*.ts | wc -l`）：

- `synthesis-contracts`：84 处 —— **生产重度使用**
- `synthesis-application`：3 处（`src/modules/synthesis/foundation.ts:8` `canonicalSynthesisTopicPathId`；`src/modules/hostBridge/workflow/researchBundleService.ts:11` 与 `src/modules/zoteroHostCapabilityBroker.ts:148` `renderCitationAnalysisMarkdown`）
- `synthesis-engine`：6 处（`src/modules/synthesis/citationGraph.ts`、`foundation.ts`、`sidecar/synthesisSidecarComputeClient.ts`、`synthesisSidecarTransferClient.ts`）
- `synthesis-repository`：1 处（`src/modules/harness/sqliteReadonly.ts:5`，仅类型 `SqlAdapter/SqlParams/SqlRow`）

**重要事实**：`synthesis-engine` / `synthesis-application` / `synthesis-repository` 的主体并不是生产 plugin 路径，而是**对等实现 / oracle / 只读 harness**：

- TS engine 的 `referenceMatcher.ts` 未被 `src/` 引用（生产走 Rust `synthesis-reference-matcher`：`runtime_production_ports.rs:1018` `NativeReferenceMatcherPort`，路由 `runtime_reference_citation_surface.rs:206` `client.runAdvancedReferenceMatchingNow`）
- TS engine 被 `.agents/skills/synthesis-reference-resolution-harness/scripts/*.ts`、`tools/synthesis-index-harness/cli.ts`、`scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts` 使用（用于 benchmark 与跨语言比对）
- 但 `src/modules/synthesis/libraryAdapter.ts`（生产 reverse-host 宿主读取实现）依赖 `./citationGraph`、`./registry`、`./foundation`（`libraryAdapter.ts:30,36,41`），因此 `src/modules/synthesis/citationGraph.ts`、`registry.ts`、`foundation.ts` **属于生产代码**（不是死代码）—— 它们是 Host 侧读投影的构造器

### 3.3 强制机制

- tsconfig 每个 package 独立 `include: ["src/**/*.ts"]`，`types: []`（`packages/synthesis-*/tsconfig.json`）；`npm run check:synthesis-{contracts,engine,repository,application}` 分别 `tsc --noEmit`
- 架构门禁：`scripts/synthesis/check-synthesis-service-boundary.ts`（见 §1.2）
- 能力清单门禁：`scripts/synthesis/check-synthesis-production-capabilities.ts`（读取 `contract-set/synthesis-production-client-v1/{capabilities,operations}.json`，比对 `SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT`，指纹常量在 `packages/synthesis-contracts/src/sidecarSystem.ts:154-155`）

---

## 4. 主要流程（端到端）

### 4.1 流程 A：打开 Synthesis 标签页并加载 surface

**阶段 1 —— 打开标签页**

1. `src/modules/synthesis/workbench/synthesisWorkbenchTab.ts:4293` `openSynthesisWorkbenchTab()`：解析宿主窗口与 Zotero tabs，创建/激活 `SYNTHESIS_WORKBENCH_TAB_ID` 标签
2. 标签内容由 `:4239` `mountSynthesisWorkbenchRuntime()` 挂载：清空 root → 创建 XUL browser frame（`:338` `createSynthesisBrowser`）→ `setSynthesisBrowserSource(frame, resolveSynthesisPageUrl())`（页面 URL 为 `addon/content/synthesis/index.html`）→ `attachWorkbenchBridge(runtime)` → `scheduleWorkbenchHandshake(runtime)`

**阶段 2 —— 页面侧初始化**

3. 页面 HTML 只提供固定容器：`addon/content/synthesis/index.html:25` `<div id="app">`，内含 `data-role="synthesis-shell" | "synthesis-content" | "synthesis-topbar" | "synthesis-main" | "synthesis-chrome"`（`:26-33`）
4. 页面脚本 `addon/content/synthesis/index.html:36` 加载 `app.bundle.js`；bundle 入口 `src/synthesisWorkbenchApp.ts:1` → `bootstrapSynthesisWorkbench()`（`src/synthesis/synthesisWorkbenchApp.ts:1273`）
5. bootstrap 建立 controller + chromeRenderer，监听 `window.message`，并向宿主发 `synthesis:action`（`:1319-1321`，最后 `sendSynthesisWorkbenchAction("ready", {})`）

**阶段 3 —— 宿主快照发布**

6. 宿主侧 bridge（`writeSynthesisWorkbenchBridgeTarget`，`synthesisWorkbenchTab.ts:382`）把消息投回 frame；宿主用 `postWorkbenchMessage(runtime, "synthesis:init"|"synthesis:snapshot", snapshotForRuntime(runtime))`（`:1296-1310`）
7. `snapshotForRuntime`（`:555`）由 `buildSynthesisUiSnapshot(mergeSynthesisUiSnapshotInput(...))` 合成，输入来自 `runtime.snapshotInput`

**阶段 4 —— surface 读取（真正的数据路径）**

8. 页面切到某个 surface（如 `topics`）后，宿主走 `sendSurface(runtime, surface, {refreshFromService:true})`；`surfaceForTab()` 负责 tab → surface 名映射（`:547`）
9. 读服务：`runtime.snapshotInput` 刷新调用 `getDefaultSynthesisClient()`（`:1331`）→ `client.workbench.readSurface({surface, state})`
10. client 侧：`src/modules/synthesisClient/workbenchUiAdapter.ts` 透传到 port；`clientPortAdapter.ts:1443-1448` 调用 `port.getSynthesisWorkbenchSurfaceInput(surface, state)`，并用 `rebuildSynthesisWorkbenchSurfaceResult` 重建结果
11. 生产组合：`nativeComposition.ts:400-420` 把属性名映射为能力名 `` `client.${property}` ``，校验其在 `SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES` 内；随后 `:478-545` 做请求 DTO 校验、按 policy 决定是否走 transfer staging；`:560-590` 调 `rpcClient.call({capability, payload})` 并按 `getSynthesisWorkbenchSurfaceInput` 分支用 `rebuildSynthesisWorkbenchSurfaceResult` 重建
12. 传输：`synthesisSidecarRpcClient.ts:273` POST 到 `<baseUrl>/synthesis/v1/call`，Bearer `clientToken`
13. Rust 分发：`runtime_production_client.rs:1708` 注册 `"client.getSynthesisWorkbenchSurfaceInput"`；实现 `runtime_topic_workbench_surface.rs:1620` `ProductionClientRouteEntry::new("client.getSynthesisWorkbenchSurfaceInput", ...)`
14. 返回后 TS 把结果并入 `SynthesisUiSnapshotInput` 并发布 `synthesis:snapshot` 给页面；页面区域各自按 signature 重渲染（`src/shared/preactRegionMount.ts`、`src/shared/regionEquality.ts`）

**预热与失败语义**：`prewarmSynthesisWorkbenchSurfaces()`（`:4398`）默认预热 `index/review/graph/tags/concepts/topics`，单个 surface 失败 `catch { continue; }`（`:4436-4438`）；`buildSnapshotErrorInput()`（`:487`）在失败时保留 trace 快照与 `synthesis_snapshot_failed` 码。

### 4.2 流程 B：citation graph rebuild（含大图 transfer）

**触发（UI → client）**

1. 页面 Graph 区域动作 → 宿主 action → `client.rebuildCitationGraphCacheNow()`（**无参数**）；能力清单见 registry `citation-graph` 域 12 条
2. `nativeComposition.ts` 按 policy 决定平面：`src/modules/synthesis/production/synthesisProductionRpcPolicy.ts:144` `synthesisProductionOperationPolicy()` 读 `contract-set/synthesis-production-client-v1/operations.json` 的 `requestPlane/resultPlane/workModel/receipt`

**Rust 侧编排**

3. 路由：`runtime_citation_graph_commands.rs:645` `"client.rebuildCitationGraphCacheNow" => ...`
4. 计算受影响 source：`:404-473`（`requested_source_refs` 分类、`collect_host_items` / `collect_items_by_ref`）
5. **创建 attempt**：`:449` `apps.citations.prepare_rebuild(mode)` → `citation_graph.rs:418` `prepare_rebuild()`：先读当前 `state.graph_hash` 作为 `expected_graph_hash`，`reserve()` 抢 admission，插入 running operation receipt（operation type `citation_graph_cache_rebuild` / `citation_graph_cache_incremental_refresh`）
6. Host facts 收集：经 reverse host `library.items.*`（`runtime_host_collection.rs`，`collect_host_items`）—— 期间**不持有 writer**
7. **计算**：`NativeCitationGraphComputePort::build()`（`runtime_production_ports.rs:423`）→ `compute.run_direct(WorkerOperation::CitationGraphBuild, input)` → 子进程 worker 执行 `citation_graph_build.v1`
8. **收尾**：`:478` `apps.citations.finish_rebuild(attempt, material, &checkpoint)` → `citation_graph.rs:465` `finish_rebuild()`；成功路径转 `rebuild(...)`，失败路径 `finish_operation(..., "failed", ...)` 并**消费掉 attempt**
9. **提交**：`citation_graph/persistence.rs:53` `commit_graph()` → `with_writer(|r| r.commit_citation_graph_promotion(commit))` → `synthesis-repository/src/citation_reference.rs:1825` `commit_citation_graph_promotion()`，在**单个 `transaction()`**内完成：graph rows/state 替换（CAS `expected_graph_hash`）+ `citation-graph:library` ready cache basis 校验 + terminal operation；任一不符返回 `CitationGraphPromotionResult::BasisMismatch` 并整体回滚（测试 `citation_reference.rs` 中 `graph_promotion_rolls_back_graph_cache_and_operation_together`）

**大图路径**

10. TS policy 若判定请求超 `controlTargetBytes` 或 resultPlane 为 `locator`，走 transfer：`nativeComposition.ts:537-556` `stageProductionClientRequest` / `stageTopicAssets`，再 `resolveContentTransferResult`
11. Rust 侧 transfer owner：`runtime_transfer.rs`（2,943 行），能力 `compute.citation_graph_build_transfer` 与 `transfer.content`（registry `compute`/`transfer` 域）；TS 客户端 `synthesisSidecarTransferClient.ts:216/240`
12. 大图分页契约文档：`docs/synthesis-layer/citation-graph-large-transfer.md`

**读侧（basis 守卫）**

13. `citation_graph.rs:371` `read()` 只在 `with_reader` 内取 basis（`graph_hash/input_hash/metrics_hash`，`citation_graph/read.rs:18`）
14. 每次分页读取重新开短 reader transaction 并重校验 basis，不符即 `basis_mismatch`（`citation_graph/read.rs:451-455`、`:490`）

### 4.3 流程 C：reference refresh 与 reference resolution

1. 触发：`client.refreshReferenceSidecarNow` / `client.runAdvancedReferenceMatchingNow`（registry `reference-canonical` 域 15 条）
2. 路由：`runtime_reference_citation_surface.rs:192`、`:206`；两者都带 `with_canonical_effect(ProductionClientCanonicalEffect::ReferencePromotion)`
3. application：`synthesis-application/src/reference_refresh.rs`（`ReferenceRefreshApplication::prepare_refresh/apply_refresh`，`:244/:258`）与 `reference_matching.rs`（`ReferenceMatchingReview`）
4. Host 扫描：`runtime_production_ports.rs:1996` `scan_artifacts_page()` → reverse host 能力 `library.artifacts.scan_page`；`readiness` / `read` 见 `:2035` 起
5. 匹配计算：`NativeReferenceMatcherPort`（`runtime_production_ports.rs:1018`）→ Rust crate `synthesis-reference-matcher`（2,235 行；`CONTRACT_VERSION = "synthesis-reference-matcher.v1"`、`BINDING_ALGORITHM_VERSION = "reference-binding.v1"`、`DEDUPE_ALGORITHM_VERSION = "canonical-cluster-dedupe.v1"`）
6. 持久化：`ReferenceApplicationStateRecord` / `ReferenceProjectionReplacement` / `ReferenceBindingFactRecord` / `ReferenceRevisionReviewRecord` 等（`synthesis-repository/src/citation_reference.rs`，4,815 行）
7. 审核动作：`client.applyReferenceMatchProposalAction(s)`、`client.applyCanonicalRevisionReviewAction`、`client.mergeEffectiveCanonicalReference`、`client.updateCanonicalReferenceMetadata`、`client.archiveCanonicalReference`（`runtime_reference_citation_surface.rs:213-250`）

---

## 5. 持久化

### 5.1 SQLite schema 与规模

- 版本键：`crates/synthesis-repository/src/lib.rs:32` `pub const SCHEMA_VERSION: &str = "synthesis-repository-foundation.v6"`
- 主 schema：`crates/synthesis-repository/src/schema.sql`（`include_str!` 于 `lib.rs:40`）—— **实测 62 个 `CREATE TABLE`、51 个 `CREATE INDEX|CREATE UNIQUE INDEX`**
- 除 foundation 外还有 11 个独立 schema 身份键（`lib.rs:136-164` `SCHEMA_IDENTITIES`）：topic application v2、citation graph application v1、reference refresh v1、reference matching review v1、tag vocabulary application v1、concept kb application v1、topic graph application v2、durable import v1、library snapshot index、reference redirect graph v3
- Rust/TS 共享版本常量：`packages/synthesis-contracts/src/schemaVersion.ts` 的 `SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION`（被 supervisor 写入 launch config，见 `synthesisSidecarRuntimeSupervisor.ts:619,676`）

### 5.2 repository 边界与事务

- 唯一 repository 类型：`Repository`（`lib.rs:405`），TS 侧无对应生产实现（见 §1.2 门禁）
- 写入串行化：所有写经 `RepositoryPort::with_writer()`（`synthesis-application/src/ports.rs:474`），底层 `Arc<Mutex<Repository>>`
- 事务：`lib.rs:1612` `transaction()` —— 外层用 `BEGIN IMMEDIATE`，嵌套用 `SAVEPOINT synthesis_repository_<seq>`（`:1616-1626`）
- 只读绕过 writer：`RepositoryPort::with_reader()`（`ports.rs:463`）从 reader pool 取连接，不等待 writer 锁（测试 `ports.rs:1893` `workbench_read_does_not_wait_for_the_writer_owner`）
- 连接 pragma：`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=250;`（`lib.rs:1298-1301`；`BUSY_TIMEOUT_MILLIS = 250` 于 `lib.rs:33`）
- 观察指标：`RepositorySqlObservation`（`lib.rs:60`）用于断言某路径的 write_count

### 5.3 并发写者约束

- **单进程单 writer**：`runtime_service.rs:282` `RepositoryPort::new_with_readers(Arc::clone(&repository), 4)` → **4 个只读连接**
- 池语义：`ports.rs:431` `new_with_readers()`；4 个 reader 可并发，第 5 个等待（测试 `ports.rs:1824` `four_readers_run_concurrently_and_a_fifth_waits`）
- 跨进程约束：`synthesis.lock` 独占（`runtime_lifecycle.rs:249`），同 state root 只允许一个 sidecar 实例
- 后台任务与 HTTP handler 未在 deadline 内退出时**不得关闭其可能引用的存储**：`runtime_service.rs:513` `let can_close_storage = background.remaining == 0 && transport.pending_handlers == 0;`（否则只 take 不 close，见 `:542-545`）

### 5.4 migration 处理

**A. Repository foundation migration**

- 显式注册表：`lib.rs:189-216` `REGISTERED_PRODUCTION_SCHEMA_MIGRATIONS`（v1→v2→v3→v4→v5→v6 链）
- 注释明确策略：`lib.rs:187-188`「普通 XPI 升级不创建备份，也绝不从 runtime fingerprint 推断 migration」
- 路径解析 + 未注册拒绝：`lib.rs:745-762`（`repository_schema_migration_unregistered`）
- 备份：迁移前 `create_or_verify_migration_backup()`（`lib.rs:540`），备份目录 `<db parent>/synthesis-migration-backups`（`runtime_service.rs:220-224`）
- 每步前后校验版本，变化即 `repository_schema_changed_during_migration`（`lib.rs:780-789`）
- v5→v6 实际动作：为 topic 相关表回填 `path_id`（`lib.rs:689-719`），不新增表 → **表数未变（62/51）**

**B. 旧 TS 生产库迁移**

- `crates/synthesis-repository/src/legacy_ts_migration.rs`（1,002 行）：`migrate_if_known_legacy_ts()`、`legacy_topic_inventory()`（导出见 `lib.rs:807-830`）
- 只接受精确匹配的 legacy schema，分歧 schema 视为 terminal（测试名 `exact_legacy_ts_schema_is_registered_and_divergent_schema_is_rejected`、`known_legacy_ts_variants_are_classified_and_unknown_columns_are_terminal`）
- 迁移失败保留源库与已验证备份（测试名 `failed_legacy_ts_build_keeps_the_source_and_verified_backup`）
- TS 侧对应测试：`tests/synthesis/238-synthesis-production-owner-migration.test.ts`（`npm run test:synthesis:legacy-production-migration`）

**C. Canonical store migration**

- `crates/synthesis-canonical-store/src/lib.rs:1316-1321` `migrate_historical_topic_roots()`；路径 id 兼容历史 TS 形态（测试名 `reads_a_historical_typescript_topic_path`、`historical_ascii_topic_id_with_sha256_suffix_remains_readable`）

**D. Durable bundle / 导入迁移**

- `crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs`（1,240 行）；`durable_import_*` 测试覆盖 basis 丢失不写 receipt、redirect cycle 修复等

### 5.5 文件持久化布局

- runtime root / profiles / sessions：`src/modules/runtimePersistence.ts:587-608`、`:610-620`
- sidecar 安装目录：`getSynthesisSidecarRuntimeInstallPaths()`（`src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts:84`），安装内容为 `manifest.json` + `manifest.files[]`（每个文件校验 `bytes` 与 `sha256`，`:125-137`）
- canonical Topic 文件：Rust `CanonicalStore`，`profile_id` + `data_root_id` 身份（`runtime_service.rs:208-211`）
- SQLite sidecar 文件：`<db>-wal` / `<db>-shm` 在半开状态判定中被显式检查（`runtime_service.rs:71-76`、`:106-118`）

---

## 6. 生命周期与清理

### 6.1 Rust 侧状态机与 terminal result

- 阶段枚举：`runtime_lifecycle.rs:11-16` `ServePhase { Startup, Running, Shutdown }`
- 停止原因：`runtime_lifecycle.rs:73-77` `StopReason { AuthenticatedRequest, ParentInputClosed }`
- 停止信号语义（**事实，逐条对应 AGENTS.md 约束**）：
  - `request_normal()`（`:121`）只记录**第一个** normal 原因（`get_or_insert`），可合并
  - `request_failure()`（`:134`）首个失败成为 primary；已有 primary 时后续失败进 `cleanup_issues`
  - `record_cleanup_issue()`（`:154`）在 terminal 形成后写入被忽略（`if state.terminal.is_none()`）
  - `finish()`（`:168`）只形成一次 terminal；normal + 非空 cleanup → `Err(ServeFailure{ phase: Shutdown, code: "shutdown_incomplete" })`
- 生命周期失败提升已排队的 normal stop：测试 `lifecycle_failure_promotes_a_pending_normal_stop`（`:389`）
- terminal 不可变：测试 `terminal_result_is_formed_once`（`:420`）

### 6.2 500 ms 有界清理（顺序即证据）

`runtime_service.rs:428-548` `shutdown()`，`cleanup_deadline = Instant::now() + SHUTDOWN_TIMEOUT`（`:429`，常量 `:34`）：

1. `transport.begin_shutdown()`（`:430`）
2. `background_tasks.stop_admission()`（`:438`）
3. `applications.canonical_autosync.shutdown()`（`:440`）
4. `applications.references.quiesce(remaining)`（`:444-450`）
5. `compute_pool.stop()`（`:451-454`）
6. `transfer.request_stop()`（`:455-465`）
7. `background_tasks.stop_and_drain_until(deadline)`；panicked / remaining 分别记 `background_task_panicked:*` / `background_task_drain_timeout:*`（`:466-477`）
8. 仅当 background 全清空才 `transfer.finalize_stop()`（`:478-490`）
9. `transport.drain(deadline)`；`http_handler_panicked` / `http_handler_drain_timeout:*`（`:491-505`）
10. `applications.webdav.shutdown(remaining)`（`:506-512`）
11. `can_close_storage` 判定（`:513`），据此决定 canonical/repository 是 `close()` 还是仅 drop（`:529-545`）
12. `ownership.take()` —— 触发 `RuntimeOwnership::Drop` **移除 discovery.json**（`:546`；`runtime_lifecycle.rs:290-294`）

`runtime_server_loop.rs` 只持有 loopback listener、active connections、socket interruption 与 handler drain（298 行），不发布 discovery、不关闭 storage —— 与 AGENTS.md 约束一致（事实核对）。

### 6.3 TS supervisor 状态机与恢复

- 状态集合：`synthesisSidecarRuntimeSupervisor.ts:46-52` `"stopped" | "starting" | "ready" | "unavailable" | "incompatible" | "stopping"`
- 恢复状态：`:56` `recoveryState: "none" | "scheduled" | "manual-recovery-required"`
- 失败分类：`:432-444` `classifyTerminal()` 前缀表（`invalid_config`、`unsupported_target`、`sidecar_runtime_`、`*_mismatch`、`production_lock_conflict`、`repository_`、`legacy_schema_`、`canonical_` …）→ 直接 `manual-recovery-required`
- 非 terminal 失败：按 `restartDelaysMs` 退避重启（`:488-503`），超过次数 → `unavailable` + `sidecar_crash_loop_fused`
- 手动恢复：`recover()` 仅在 `recoveryState === "manual-recovery-required"` 时生效（`:755-763`）
- 健康轮询：`scheduleHealth()`（`:551-562`）；`health.computePool.state === "degraded"` 直接 `fail("sidecar_compute_pool_degraded")`（`:798-800`）
- 进程意外退出：`current.closed` 回调用 stderr 稳定失败码或 `sidecar_process_exited` 触发 `fail()`（`:654-668`）
- stderr 稳定码解析：`parseNativeStableFailureCode()`（`:254`）、`parseNativeDiagnosticEvent()`（`:235`）
- 测试钩子：`resetSynthesisSidecarRuntimeSupervisorForTests()`（`:945`）、`synthesisSidecarRuntimeSupervisorInternalsForTests`（`:953`）

### 6.4 崩溃恢复 / 启动对账

- Rust：`runtime_service.rs:296-299` 启动时调用 `reconcile_restart(apps, now)`；实现 `runtime_public_maintenance_operation.rs:1068`
  - public maintenance 的 `running` → `failed` + `restart_external_effect_unknown`（`:1090-1111`）
  - 其它 stale `running` → `canceled` + `service_restart`（`:1117-1129`）
  - public `pending` → `continuation_required`（CAS 更新，`:1147-1168`）
  - **事实：不自动 replay、不 dispatch 工作**
- TS：`recoverSynthesisSidecarRuntimeSupervisor()`（`:848`）、`recoverSynthesisProductionRuntimeSupervisor()`（`:883`）；client 侧 `recoverReadyConnection`（`nativeComposition.ts:625-658`）
- Graph 崩溃日志：`src/modules/synthesis/debug/citationGraphCrashJournal.ts` + `src/synthesis/components/citationGraphCrashReporter.ts`（`bootstrapSynthesisWorkbench` 的 dispose 路径会写 `frame-dispose-start/complete`，`src/synthesis/synthesisWorkbenchApp.ts:1301-1310`）

### 6.5 安装 / 升级 / 回滚

- 资产根：`synthesisSidecarRuntimeAssetRoot(target) = "bin/<target bundle path>"`（`src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts:27`）
- XPI 打包规则：`zotero-plugin.config.ts:194` `"addon/bin/**/synthesis-sidecar/**/*"`
- 已暂存 7 平台 bundle：`addon/bin/{darwin-arm64,darwin-x64,linux-arm,linux-arm64,linux-x64,linux-x86,win32-x64}/synthesis-sidecar/`，全部 `buildFingerprint = e6eef53370df9e34…`（读各 `manifest.json`）
- 安装是「staging → 原子换目录 → 校验 → 删除 old」：`synthesisSidecarRuntimeInstaller.ts:242-292`；失败回滚 old（`:279-285`）
- 版本/过期门禁：`isExpiredSynthesisSidecarRuntimeManifest()`（`packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:305`）、生产策略 `verificationPolicy: "production"` 且 `allowExpired: true` 仅用于安装（`synthesisSidecarRuntimeInstaller.ts:224-229`）
- 新鲜度与 XPI 校验脚本见 §7

---

## 7. 一致性校验（`scripts/synthesis/`）

共 35 个脚本。可分为 5 类：

### 7.1 跨语言契约（真跨语言）

| 脚本 | 校验内容 | 证据 |
|---|---|---|
| `check-synthesis-cross-language-contracts.ts`（21,830 B） | registry 的 capability/worker 集合与 TS 常量集合双向一致（`protocol_capability_unmapped` / `_unknown`）、无重复、schema `$id` 唯一且 dialect 一致、**每个 `$defs` 定义必须可达**（`protocol_schema_definition_orphan`）、opaque leaf 元数据完整且不得成为「通用逃逸」（`unauthorizedGenericEscapeCount`）、corpus 正/负例被 Ajv 正确接受/拒绝，并对正例做自动变异生成负例 | `scripts/synthesis/check-synthesis-cross-language-contracts.ts:376-405`（集合一致性）、`:408-479`（opaque leaf 逃逸）、`:518-524`（定义可达性）、`:530-590`（corpus 正负例与指纹） |
| `check-synthesis-native-runtime-contract-parity.ts` | 加载 `contract-set/synthesis-native-runtime-v2/corpus.json`（19 例：manifest 4 / launch 6 / discovery 3 / health 3 / handshake 3），TS 侧跑 `rebuildSynthesisSidecar{LaunchConfig,Discovery,Health,HandshakeResult}`、Rust 侧跑 `cargo run --example native_runtime_contract_parity`，逐例比对 `expected.node` / `expected.rust` | `scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts:95-145` |
| `check-synthesis-native-worker-transfer-parity.ts` | 三方比对：TS engine `createInProcessSynthesisCitationGraphBuildEngine().compute()` 的 canonical 结果 vs Rust `--example native_worker_transfer_parity` 的 `canonicalResult`/`resultSha256`；另跑 `worker_protocol_corpus_parity` 比对 `corpus/worker.json` 正负例；并对 Rust 源码做所有权断言（`inspectSynthesisNativeWorkerTransferOwnership` 读取 `runtime_transfer.rs`/`runtime_worker.rs`/…） | `scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts:150-215`、`:37-50` |

### 7.2 surface parity（**基于固定 fixture 的清单/边界校验，不执行 Rust**）

8 个 `check-synthesis-*-surface-parity.ts`（topic-workbench / citation-graph / tag / concept-topic-graph / reference-canonical / artifact-library-debug / webdav-maintenance）+ `synthesisProductionSurfaceCorpora.ts` 读取器。

以 `check-synthesis-topic-workbench-surface-parity.ts` 为例，实际断言是：

- corpus 身份（`synthesis-topic-workbench-surface-parity.v1`）与编解码名（`synthesis-client-args.v1` / `synthesis-client-result.v1`）
- bounds 精确等于 `{requestBytes: 1048576, responseBytes: 1048576, deadlineMs: 10000}`
- operation 数量与唯一性（topic-workbench 为 20）
- corpus operation 集合与**固定基线 fixture** `tests/fixtures/synthesis-sidecar-migration/main-e210997a-production-observables.v1.json` 的 observable 集合双向一致，且 `access` 一致
- 每个 operation 必须含边界用例 `invalid_args/oversized/expired`；mutation 还必须含 `reopen`
- 每个 id 必须存在于 `SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES`

证据：`scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts:37-85`。**性质提醒**：该组脚本校验的是「能力清单 + 用例覆盖 + 基线可观测项」，不启动 sidecar，因此不能发现 Rust DTO 形状漂移；真正的形状校验在 §7.1 与 §8.3 的 production-route 测试。

### 7.3 生产能力与性能

| 脚本 | 校验内容 |
|---|---|
| `check-synthesis-production-capabilities.ts` | 读取 `contract-set/synthesis-production-client-v1/{capabilities,operations}.json`，比对 `SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES` / `..._CAPABILITY_FINGERPRINT`，并用 TS AST 检查 adapter 是否泄漏内部成员 |
| `check-synthesis-production-route-performance.ts`（31,828 B） | 用合成数据集（2k/10k/25k）跑真实 production route harness，采集 7 类操作（topic-page/chrome/index/graph-slice/graph-metrics/reference-refresh/tag-effects）的 p50/p95，样本数 `FORMAL_SAMPLE_COUNT = 11`，含 `UI_RSS_BUDGET_BYTES = 128 MiB` 与 `TAG_EFFECT_BATCH_LIMIT = 100` 预算 |
| `check-synthesis-service-boundary.ts` | 见 §1.2 / §3.3 |
| `check-synthesis-rust-license-inventory.ts` | 校验 Rust 依赖许可证清单，含 bundled `sqlite3 3.53.2`（`check-synthesis-rust-license-inventory.ts:8-12`） |

### 7.4 运行时打包 / 发布

| 脚本 | 作用 |
|---|---|
| `check-synthesis-sidecar-runtime-freshness.ts` | 重算 `computeSynthesisSidecarRuntimeBuildFingerprint()`，逐 target 校验 `addon/bin/<target>/synthesis-sidecar` bundle 指纹一致 |
| `check-synthesis-sidecar-runtime-xpi.ts` | 解 XPI 中央目录，要求 7 个 target 各含 `manifest.json`/可执行文件/`provenance.json`/`licenses.json`/`LICENSE-AGPL-3.0.txt`；**并禁止**出现 `node(.exe)`、`/service/`、`.js`、`node_modules`、`d3-force` |
| `package-/stage-/publish-/sync-/resolve-/download-synthesis-sidecar-runtime-*.ts` | 预构建、内容寻址发布、缓存解析与同步 |
| `dispatch-/prepare-/release-*` + `synthesis-sidecar-runtime-release-{controller,governance,plan,set}.ts` | 受治理的七平台发布流水线 |
| `smoke-synthesis-rust-durable-candidate.ts`（30,746 B）、`smoke-synthesis-rust-sidecar-worker.ts` | 端到端冒烟 |
| `synthesis-native-stage1-suite.ts` | Stage-1 套件（`npm run test:synthesis-native:stage1` 先跑 worker transfer parity 再 build Rust 再跑测试分片） |

### 7.5 CI 接入（事实）

- `.github/workflows/verify-synthesis-sidecar.yml:57-70`：cargo fmt/clippy、完整 Rust workspace test、`check:synthesis-cross-language-contracts`、`check:synthesis-native-runtime-contract-parity`、`check:synthesis-native-worker-transfer-parity`、`check:synthesis-rust-license-inventory`
- `.github/workflows/release.yml:77,100`：`check:synthesis-sidecar-runtime-freshness`、`check:synthesis-sidecar-runtime-xpi`
- `.github/workflows/release-synthesis-sidecar.yml:76`：freshness
- **注意**：8 个 surface-parity 脚本没有出现在 workflow 的 `npm run` 列表中；它们通过 `tests/synthesis/2xx-synthesis-native-*-surface.test.ts` 被间接调用（如 `tests/synthesis/231-synthesis-native-citation-graph-surface.test.ts:3` import `inspectSynthesisCitationGraphSurfaceParity`）

---

## 8. 测试覆盖

### 8.1 TS 侧 `tests/synthesis/`（67 文件，44,594 行）主题清单

| 主题 | 代表文件 |
|---|---|
| reference sidecar / index / resolution / matcher | `121-…reference-sidecar-index`、`151-…reference-resolution-matcher`、`153-synthesis-index-harness`、`187-…reference-matcher-engine`、`274-…reference-source-id-storage` |
| citation graph（build/metrics/layout/engine/UI） | `122-…citation-graph`、`183-…layout-engine`、`185-…metrics-engine`、`186-…build-engine`、`256-synthesis-graph-region` |
| native surface roster（7 域） | `230-artifact-library-debug`、`231-citation-graph`、`232-reference-canonical`、`233-tag`、`234-concept-topic-graph`、`235-webdav-maintenance`、`252-workbench-scaffold` |
| client / 组合 / 工作流 facade | `175-client-foundation`、`176-client-lifecycle-consumers`、`177-workflow-client`、`220-native-client-composition`、`229-production-client-rust-route`、`240-workflow-facade-error-contract` |
| reverse host | `222-reverse-host-broker`、`225-reverse-host-handlers`、`226-reverse-host-endpoint` |
| sidecar 生命周期 / 打包 / 边界 / 治理 | `168-sidecar-boundary`、`193-runtime-packaging`、`228-production-runtime-supervisor`、`231-debug-observability`、`237-http-server-governance`、`239-build-promotion`、`218-cross-language-sidecar-contract` |
| Host ports（read / tag / related items / image / export） | `178`、`179`、`180`、`181`、`182` |
| engine parity（engine 层单测） | `183`–`191`（layout/metrics/build/reference-matcher/tag-vocabulary/concept-kb/topic-graph/topic-structured-artifact） |
| 持久化 / 迁移 / durable bundle | `238-production-owner-migration`、`273-durable-bundle-contract`、`271-canonical-artifact-projection`、`184-webdav-runtime-composition` |
| Preact 区域 UI | `253-home`、`254-topics`、`255-concepts`、`256-graph`、`257-windowed-rows`、`258-tags`、`259-review-center`、`260-reader` |
| topic / workflow 契约 | `124`、`133`、`153/154/155`（topic-synthesis 系列）、`176-topic-planner-runtime` |
| benchmark / 数据集 | `149-benchmark-datasets`、`236-production-route-performance-report` |
| 同步恢复 / review input / MCP | `126-sync-recovery`、`127`/`128-review-input`、`123-mcp-tools` |
| dashboard / tab UI | `125-synthesis-tab-ui`、`246-dashboard-synthesis-sidecar` |

另有 `tests/ui/157-synthesis-sidecar-dashboard.test.ts`、`tests/zotero/ui/full/276-dashboard-synthesis-close.zotero.test.ts`。相关 helper：`tests/helpers/synthesisProductionRouteHarness.ts`（566 行，spawn 真实 `rust/synthesis-sidecar/target/debug/synthesis-sidecar`，内建 loopback reverse host 与 wire/hostCalls 记录器，`:22`、`:114`、`:384`）。

### 8.2 Rust 侧测试主题（`#[test]` 计数实测）

| crate | `#[test]` | 文件 |
|---|---|---|
| synthesis-sidecar | 114 | 37 |
| synthesis-application | 109 | 30 |
| synthesis-repository | 68 | 8 |
| synthesis-canonical-store | 30 | 1 |
| synthesis-protocol | 8 | 1 |
| synthesis-citation-layout | 5 | 1 |
| synthesis-concept-kb | 5 | 1 |
| synthesis-test-support | 4 | 2 |
| synthesis-reference-matcher | 3 | 1 |
| synthesis-citation-graph-build / topic-graph / topic-structured-artifact / tag-vocabulary | 各 2 | — |
| synthesis-metrics | 1 | 1 |
| **合计** | **≈ 345** | 87 个 `.rs` |

主题抽样（函数名即断言意图）：

- 生命周期 / 进程：`native_process_lifecycle.rs`（内建反向宿主 TCP server；断言 serve/cleanup/terminal）、`runtime_lifecycle.rs` 的 `first_lifecycle_failure_stays_primary_and_later_failures_are_secondary`、`cleanup_issue_turns_a_normal_stop_into_shutdown_incomplete`
- worker 池：`native_worker_pool.rs`（真实 `synthesis-sidecar worker` 子进程 + NDJSON 帧）、`runtime_worker_pool.rs:1434` `reuses_a_successful_worker_and_fuses_three_runtime_crashes`
- repository 事务/回滚：`graph_promotion_rolls_back_graph_cache_and_operation_together`、`source_slice_promotion_publishes_its_computed_hash_atomically`、`graph_replacement_cas_rolls_back_every_projection_table`、`citation_graph_window_pages_large_graph_without_dangling_edges`
- legacy 迁移：`exact_legacy_ts_schema_migrates_once_with_verified_backup`、`exact_legacy_ts_schema_repairs_redirect_cycles_before_publication`、`failed_legacy_ts_build_keeps_the_source_and_verified_backup`
- canonical store 恢复：`every_pre_receipt_fault_recovers_the_last_good_snapshot_on_restart`、`windows_directory_sync_does_not_block_promotion_or_restart_recovery`、`import_batch_recovery_uses_the_repository_receipt_after_reopen`
- citation graph 应用：`last_good_read_view_remains_available_while_rebuild_compute_is_blocked`、`read_view_rejects_stale_continuations_and_keeps_endpoint_closed_identity`、`failed_collection_releases_its_attempt_and_retry_prepares_from_current_graph`
- 并发：`ports.rs:1824` `four_readers_run_concurrently_and_a_fifth_waits`、`lib.rs:4263` `competing_writer_observes_the_fixed_busy_timeout`

### 8.3 端到端

- E2E 统一入口约定见 `AGENTS.md`「E2E 测试约束」：`tests/zotero/e2e/full` + `npm run test:zotero:e2e`；压力用 `npm run test:zotero:e2e:stress`
- production route harness 是「真 Rust 二进制 + 真 HTTP + 真 reverse host」的集成层（`tests/helpers/synthesisProductionRouteHarness.ts:114`）

---

## 9. 疑点清单（待核查，均附证据路径）

> 以下均为**待核查项**，不是结论。按可核查程度排序。

1. **文档与代码的 schema 版本漂移**：`docs/synthesis-layer/README.md:152` 写「Repository foundation **v5** has 62 tables and 51 indexes」，但代码 `SCHEMA_VERSION = "synthesis-repository-foundation.v6"`（`rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:32`）。表/索引数字与 `schema.sql` 实测一致（62/51），只有版本号落后一格。v5→v6 迁移只回填 `path_id`（`lib.rs:689-719`），不增表 → 推测是文档未随 v6 更新。
2. **discovery 版本在 parity 语料中不对齐生产**：生产发布 `synthesis-sidecar-discovery.v5`（`runtime_service.rs:569`），TS 生产校验器也认 v5（`packages/synthesis-contracts/src/sidecarProduction.ts:123`）；但跨语言 parity 语料里的 `discovery` 用例走的是 **v2**——TS `rebuildSynthesisSidecarDiscovery`（`sidecarLifecycle.ts:22-23`）与 Rust `rebuild_native_discovery`（`runtime_contract.rs:353`，且该函数只被 `examples/native_runtime_contract_parity.rs:111` 使用）。含义：现有 discovery parity 门禁无法发现 v5 形状漂移。需确认是否应把 parity 语料升级到 v5。
3. **`sidecarLifecycle.ts` 的 v2 discovery/`synthesis-sidecar-launch-config.v4` 与 `sidecarProduction.ts` 的 v5 discovery 并存**：`packages/synthesis-contracts/src/` 内存在两套 discovery 契约（`sidecarLifecycle.ts:20-23` vs `sidecarProduction.ts:123`）。需要确认 v2 是否还有非 parity 的消费者（本人检索仅见 parity 脚本）。
4. **E2E 基线版本表述不一致**：`docs/synthesis-layer/README.md:161` 写「Zotero **9.0.4** Linux checks」，而 `AGENTS.md` 声明 `references/Zotero-9` 固定 tag `9.0.6`，实测 `git -C references/Zotero-9 describe --tags` → `9.0.6`。文档需核对。
5. **已暂存 sidecar bundle 的指纹一致性**：7 个 target 的 `manifest.json` 全部为 `buildFingerprint = e6eef53370df9e34…`（`addon/bin/*/synthesis-sidecar/manifest.json`）。`docs/synthesis-layer/README.md:181` 声称「packaged seven-target bundles are stale against the current build fingerprint」。本报告为只读侦察，未运行 `computeSynthesisSidecarRuntimeBuildFingerprint()`，**无法判定当前源码指纹是否等于该值** → 需用 `npm run check:synthesis-sidecar-runtime-freshness` 定论。
6. **`src/modules/harness/sqliteReadonly.ts` 直接打开 Synthesis SQLite**：它从 `packages/synthesis-repository` import 类型并直接用 `node:sqlite` `DatabaseSync`（`:11-31`）。消费者只有 `tests/ui/156-ui-readonly-harness.test.ts` 与 `tests/synthesis/238-…`（grep 结果）。需确认该模块是否可能被 harness 生产路径（只读测试页面）加载，以及是否违反「TS 不持有 repository」的边界精神。
7. **surface parity 脚本的覆盖盲区**：8 个 `check-synthesis-*-surface-parity.ts` 只做清单/边界/fixture 一致性，不启动 sidecar（§7.2）。若 Rust DTO 形状变化而 corpus 未更新，这些脚本不会失败。需确认是否依赖 `tests/synthesis/2xx-synthesis-native-*-surface.test.ts` 与 production-route 测试补足。
8. **`src/modules/synthesis/foundation.ts` / `registry.ts` / `citationGraph.ts` 的双重身份**：它们既被生产路径 `libraryAdapter.ts`（reverse-host 宿主读取）使用，也被 `harness/`（`zoteroReadonlyLibraryAdapter.ts`）与大量测试作为 oracle 使用。`citationGraph.ts` 的 `buildUnifiedCitationGraph` 在 `src/` 内仅被 `libraryAdapter.ts` 与 `reviewInput.ts` 间接引用，需确认在 Rust 已成为 graph 唯一 owner 之后，这些 TS 图构建逻辑是否仍是 Host 读取投影的必要部分，还是可收敛的重复实现。
9. **`packages/synthesis-{engine,application,repository}` 的生产相关性**：实测 `src/` 对三者合计仅 10 处 import（§3.2），主体用途是 oracle/parity/harness/benchmark。需确认这些包是否被视为长期保留的跨语言 oracle（若是，应有明确文档说明其「非生产」身份；当前 `docs/synthesis-layer/README.md:180` 只笼统说「Language-neutral corpora, fixed pre-retirement observables, and Rust-native tests preserve stable evidence」）。
10. **`client.reconcileSynthesisRuntimeWorkStateOnStartup` 的调用时机**：registry 中存在该能力（webdav-maintenance 域），Rust 侧启动对账在 `serve()` 内已自动执行（`runtime_service.rs:296`）。需确认该 client 能力是否冗余，或承担 UI 层显式触发语义。
11. **compute 与 client 能力的两套 deadline/限额**：`synthesisSidecarComputeClient.ts:31-33` 定义 5 s/10 s/5 s，`SYNTHESIS_SIDECAR_LIMITS` 另有一套 8 MiB 限额（`sidecarSystem.ts:283-295`），production policy 又一套 `operations.json` deadline/override。三处 deadline 语义需核对是否存在互相覆盖的歧义（`synthesisProductionRpcPolicy.ts:128-160`）。
12. **`docs/synthesis-layer/` 的 contracts 目录未在本轮核对**：`docs/synthesis-layer/contracts/{states-and-events,invariants,service-api-migration}.yaml` 被 README 描述为「machine-readable contracts」，本轮未逐一比对代码；`invariants` 被测试以 `\[inv\.` grep 方式引用（`package.json` 的 `test:synthesis:invariants`）。

---

## 10. 未覆盖范围

本轮为**有界只读侦察**，以下内容明确未核查：

1. **未运行任何构建/测试/cargo/git 写操作**。所有 Rust 测试名、`#[test]` 计数来自源码 grep，不是执行结果；`npm run check:*`、`npm run test:*` 均未运行。
2. **未核对 `openspec/specs/` 中与 Synthesis 相关的规格**（约 228 个 spec 文件），也未做「规格 ↔ 代码」的条文级追溯。
3. **未展开 `crates/synthesis-application/src/` 全部 55,206 行的业务规则**：仅覆盖 citation graph、reference、webdav、durable bundle、ports 的主干；`topic.rs`(3,857)、`tag_vocabulary.rs`(3,637)、`reference_application.rs`(5,671)、`reference_refresh.rs`(2,732)、`topic_graph.rs`(2,137)、`concept_kb.rs`(1,694)、`reference_matching.rs`(1,701)、`tag_audit.rs`(1,074)、`knowledge_checkpoint.rs`(824)、`related_items.rs`(849)、`topic_digest.rs`(637)、`workbench.rs`(606)、`canonical_literature_artifacts.rs`(566)、`library_snapshot_index.rs`(297)、`debug_maintenance.rs`(487)、`admission.rs`(98) 只做了表面扫描。
4. **未展开 `src/synthesis/**` 25,891 行 Preact 组件的渲染细节**：仅确认 region mount 机制、页面容器、bootstrap/dispose 与 wire contract 位置；各 Region 组件的 signature/虚拟滚动实现未逐一审阅。
5. **未审计 `src/modules/synthesis/uiModel.ts`（4,198 行）与 `synthesisWorkbenchTab.ts`（4,461 行）的全部命令分支**，仅覆盖打开/挂载/快照/surface 刷新/预热/关闭主干。
6. **未审计凭据加密的具体算法参数与密钥来源**（`webDavSyncCredentialPrefs.ts` 只确认使用 `crypto.subtle` AES-GCM 与错误码）。
7. **未审计发布治理细节**：`synthesis-sidecar-runtime-release-governance.ts`（16,078 B）、`dispatch-synthesis-sidecar-prebuild.ts`、`resolve-synthesis-sidecar-verification.ts` 的分支与 receipt 结构未逐行阅读。
8. **未核对 `contracts/synthesis-sidecar/schemas/*.json` 6 个发布 schema 与脚本实现的一致性**。
9. **未核对 `workflows_builtin/synthesis-layer/`、`skills_builtin/topic-synthesis-*`、`skills_src/topic-synthesis` 与 Synthesis runtime 的接口**（不属于本次指定范围，但存在调用关系：`synthesisWorkbenchTab.ts` 中有 `findCreateTopicSynthesisWorkflow()` / `findUpdateTopicSynthesisWorkflow()`）。
10. **未核对 Host Bridge / MCP 对 Synthesis 的暴露面**（`src/modules/hostBridge/**`、`tests/synthesis/123-synthesis-mcp-tools.test.ts`、`tests/synthesis/128-synthesis-review-input-mcp.test.ts` 涉及，但不在本次范围）。
11. **未评估性能实测**：`check-synthesis-production-route-performance.ts` 的 p95 目标与 `docs/synthesis-layer/performance-and-scale.md` 的具体数字未运行验证。
12. **未核对 `artifacts/openviking-bootstrap/20260916T1450Z/validation-rust-synthesis-sidecar.log` 等既有验证日志**（存在但未读取，可能包含可直接引用的执行证据）。
