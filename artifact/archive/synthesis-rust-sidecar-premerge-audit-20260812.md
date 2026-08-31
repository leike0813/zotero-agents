# Rust Synthesis sidecar 合入前审计

> 2026-08-29 状态标注：本文结论只针对 `45a1c6c` 候选。文中列出的生产能力、生命周期、幂等、门禁和 fixture 缺口已由后续 changes 逐项处理并形成 Rust-native 测试；插件 legacy owner 与 Node sidecar/worker 也已从开发树删除。本文保留为缺口发现记录，不再代表当前 source verdict。当前放行条件见 `complete-synthesis-r9-stage1-acceptance`；七平台 bundle/XPI 与 Zotero 7/9 真实机器证据仍未由这次本地 retirement 实现替代。

日期：2026-08-12  
候选：`45a1c6cb3781830c9bcc605b58a2b8332c3869ce`（`refactor: restore synthesis rust sidecar main parity (stage 22)`）  
主线行为基线：`main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`
可执行 Node oracle：辅助证据；不得覆盖主线源码、调用方与测试所定义的行为

## 结论

**当前候选不应直接合入主线。**

主干功能的显式入口已经大体迁完：131 个旧 public method 有完整迁移账本，当前边界为 113 个 public method，生产 wire surface 为 96 个 operation；96 路由的真实 Rust 进程测试、7 组用户 surface、跨语言 schema、Rust workspace 测试和 OpenSpec 严格校验均能通过。

但这轮排查确认了几项先前门禁没有覆盖的实质缺口：

1. 三个仍写在 reverse-Host 合约里的能力没有任何 Rust 生产调用点，已经造成或足以造成用户可见功能缺失：Topic digest 代表图、Related Items 自动副作用、旧 staged Tag parent binding 迁移。
2. 旧版在 canonical mutation 后触发的 WebDAV autosync 没有接到 Rust 写路径。Rust application 虽然实现了 `trigger_webdav_auto_sync`，生产代码没有调用它。
3. HTTP 服务可由未完成请求无限增殖线程，并能阻塞正常停机。真实进程探针中，100 个 partial request 让线程数从 2 增至 102；保持一条 partial header 不关闭时，sidecar 在 1.5 秒后仍无法停止，关闭 socket 后才退出。
4. public maintenance receipt 不是 request replay 幂等的。同一个 `requestId`、同一 capability、同一 payload 连续发送两次，得到两个不同的 `operation_id`，两个任务都进入 `pending`。
5. 四个 application differential gate 当前全部失败；性能门禁也因陈旧 fixture 在 setup 阶段收到 `invalid_request`，没有生成任何 2k/10k/25k 样本。全量 core suite 则在加载阶段引用已删除的旧 service export。换言之，当前不存在完整、source-fresh、全绿的合入证据链。

按本次门禁规则，以上任一 P0/P1 或关键验证失败都足以阻断合入。建议修复顺序见文末。

## 审计口径

### 基线选择

本轮加固固定使用 `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c` 作为行为基线。具体行为应从该身份的源码、调用方和测试交叉确认。Node oracle 只用于发现差异；若 oracle 与主线证据冲突，以主线为准，并把差异记录为 oracle 漂移，不能为了让 oracle 通过而恢复未文档化别名、缺失字段默认值或已偏离主线的副作用。

身份核验命令：

```text
git show -s --format='%H%n%cI%n%s' v0.8.3
git show -s --format='%H%n%cI%n%s' e210997
git diff --quiet v0.8.3 e210997 -- <audited synthesis paths>
```

最后一项返回 0。

### 证据等级

- **E3**：真实 sidecar 进程或差分执行可稳定复现。
- **E2**：现有自动化门禁、Rust 单元/集成测试或完整源码调用链证明。
- **E1**：静态源码风险；尚无现成可执行用例锁定竞态时序。
- **E0**：本机环境无法取得 source-fresh 证据。

## 阻断项

### P0 — Topic digest 代表图在 Rust 生产路径中断（E2）

旧版 `resolveTopicPaperDigest` 在 `include_representative_image` 为 true 时调用 Host representative-image port，并把 `representative_image` 投影给 Topic digest modal。当前合约仍声明 reverse-Host capability `library.representative_image.read`，TypeScript Host handler 也仍存在，但整个 Rust sidecar 生产源码没有该 capability 的调用点，也没有 `include_representative_image` / `representative_image` 的处理代码。

这不是单纯的 DTO 类型偏弱：请求字段能穿过 TypeScript adapter，Rust 最终不会执行 Host 读取，用户在 digest modal 中看不到旧版可显示的代表图。

关键位置：

- `src/modules/synthesis/service.ts:20389`：旧版代表图读取与结果投影。
- `src/modules/synthesisClient/workbenchUiAdapter.ts:253`：新 client 仍映射 `includeRepresentativeImage`。
- `packages/synthesis-contracts/src/sidecarProduction.ts:48`：capability 仍在正式列表。
- `src/modules/synthesisReverseHostHandlers.ts:151`：Host handler surface 仍在。

### P0 — Related Items 自动同步副作用未迁移（E2）

旧版在 citation graph 增量刷新后调用 `syncRelatedItemsAfterSynthesisUpdate`，由 Host `effects.related_items.apply_batch` 执行 `ensure_present` / `ensure_absent`，并持久化 effect receipt，后续 `consumeRelatedItemsSyncEcho` 再消费 Zotero echo。

Rust 当前只实现了 echo 消费和 effect 表的导入导出；`effects.related_items.apply_batch` 在 Rust 生产源码中没有调用点，也没有创建/应用 effect 的业务路径。现有测试通过手工向 `synt_related_items_sync_effect` 插入记录后验证 echo，只证明“能消费已经存在的记录”，没有证明记录会由真实业务产生。

用户后果是：citation graph 可更新，但 Zotero Related Items 不再随已接受关系自动变化；表面 API 与 echo DTO 看起来正常，内部副作用链实际上是空的。

关键位置：

- `src/modules/synthesis/service.ts:14327`、`:16574`、`:16625`：旧版自动触发、effect 规划与 Host batch。
- `packages/synthesis-contracts/src/sidecarProduction.ts:60`：capability 仍被声明。
- `native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:97`：Rust 仅消费 echo。
- `native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:916`：测试手工 seed effect 后验证消费。

### P0 — canonical mutation 后 WebDAV autosync 未接线（E2）

旧版以 `runCanonicalWriteWithAutosync` 包裹 Topic、Tag、Concept、Topic Graph、JSON import、checkpoint export 等 canonical mutation。写入成功后会排队并 best-effort 触发 WebDAV autosync。

Rust `WebDavSyncApplication` 已实现 `trigger_webdav_auto_sync` 和配置判断，但该方法除定义与测试外没有任何生产 caller。手动 `syncWebDavNow` 仍可用，因此 96-operation surface checker 会通过；丢失的是自动行为。

用户后果是：开启 autosync 后，修改 Topic/Tag/Concept 等内容不会像 v0.8.3 那样自动同步，只有手动触发时才会同步。

关键位置：

- `src/modules/synthesis/service.ts:7308`、`:7319`：旧版 autosync wrapper。
- `src/modules/synthesis/service.ts:14830` 起：被 wrapper 覆盖的 mutation。
- `native/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs:356`：Rust 孤立实现。

### P0 — HTTP partial request 可线性增殖线程并阻塞停机（E3）

listener 对每条 TCP connection 直接 `thread::spawn`，没有 admission limit；`read_http` 使用无 read timeout 的 `BufRead::read_line`，request line 和 headers 也没有逐行/累计字节上限。停机时主线程逐一 join 所有 handler。

真实进程探针结果：

```json
{"before":2,"after":102,"delta":100,"openPartialConnections":100}
{"stopSettledWithPartialHeaderOpen":false}
{"stopSettledAfterSocketClose":true}
```

第一项由 100 个不发送换行结束的 partial request 产生；第二项保持一条 partial header，发出正常 stdin shutdown 后等待 1.5 秒；第三项在关闭 client socket 后立即完成。虽然 listener 仅绑定 loopback，插件进程、恶意本地进程或异常客户端都能触发这一问题。高频故障时线程、内存和停机延迟没有上界。

关键位置：

- `native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:62`：accept 后无界 spawn。
- `native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:82`：停机 join handler。
- `native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:5`：无 timeout/line bound 的 request 读取。

### P1 — 旧 staged Tag parent binding 无法迁移（E2）

v0.8.3 会在启动及 staged-tag 读写/提升前检查旧数字 item ID，分批调用 Host migration port，把它们解析为 `{libraryId,itemKey}`，并记录迁移 operation。

Rust 的 `TagLegacyBindingResolverPort` 实现没有调用合约中声明的 `effects.staged_tag_binding.resolve`。它只检查 binding：发现数字就返回 `legacy_binding_library_scope_missing`，否则原样返回。因而从 v0.8.3 数据升级时，仍含旧 binding 的 staged suggestion 无法自动迁移；promote 会退化为 worker failure，list/stage 路径也不再执行旧版的统一 migration gate。

关键位置：

- `src/modules/synthesis/service.ts:18466`—`:18599`：旧版迁移和 gate。
- `native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:1850` 附近：Rust resolver 只校验并原样返回。
- `native/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:1006`：仅 promote 调 resolver。

### P1 — maintenance request replay 会重复创建任务（E3）

operation identity hash 包含 `acceptedAt`，因此相同 `requestId` 的重放不会命中同一 receipt。真实进程中，对 `client.rebuildCitationGraphCacheNow` 发送完全相同的 envelope 两次，结果如下：

```json
{
  "firstOperationId":"maintenance:rebuildCitationGraphCacheNow:fd3babd5dfb48af73ca43ad3",
  "secondOperationId":"maintenance:rebuildCitationGraphCacheNow:cead5cc7231ae5aa42d5217f",
  "same":false,
  "firstStatus":"pending",
  "secondStatus":"pending"
}
```

这破坏了 request-level replay safety。客户端在响应丢失后以同一 request ID 重试，可能产生两次昂贵维护或外部副作用。

关键位置：`native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:396`—`:417`。

### P1 — 四个 application parity gate 全部失败（E3）

失败项：

- `check:synthesis-typed-application-parity`：`typed_application_observable_mismatch`。
- `check:synthesis-citation-reference-application-parity`：`untouched_table_mismatch:synt_schema_meta`。
- `check:synthesis-tag-concept-topic-graph-application-parity`：Rust 多出 `reference_redirect_graph_schema_version`。
- `check:synthesis-checkpoint-bundle-webdav-debug-application-parity`：`table_mismatch:synt_schema_meta`。

typed report 的主要差异是 Rust Topic DTO/数据库 projection 新增 readiness 字段：`freshness`、`sourceMaterialsStatus`、`sourceMaterialsPercent`、`staleReasons`、`dirtyReasons`、`missingSections`，以及 discovery readiness；另有 Rust 启动时写入的 redirect-graph schema marker。

这些差异更像“Rust 实现和 Node oracle/比较器没有一起更新”，而不是字段丢失；redirect marker 也有独立真实路由测试。但在明确更新 parity contract、Node oracle 或允许的 durable-state 差异前，不能把失败门禁当作已通过。

Stage 1 分片结果：

- 175—201：通过。
- 202：通过。
- 203—218：146 passing / 4 failing，正好是以上四项。
- 219—235：通过，包含 96-operation real Rust route。

### P1 — 性能门禁没有产生候选版本样本（E3）

`check:synthesis-production-route-performance` 在 2k、10k、25k 三档 setup 都失败：`applyTopicSynthesisResult` 返回 `status: invalid_request`，所有正式样本为空。

根因在共享 synthetic fixture：analysis manifest 声明四个 `asset/sidecar/*` locator，却没有把对应 assets 加入 request。Rust parser 会解析这些 locator 并拒绝缺失 asset；真实路由测试使用的 fixture 包含四个 assets，所以能通过。

因此旧的 2026-08-08 性能报告不能作为 HEAD `45a1c6cb` 的 source-fresh 证据，也无法判断 25k 数据量下的延迟、RSS、SQL 和 reverse-Host 调用是否达标。

关键位置：

- `test/fixtures/synthesisSyntheticDatasets.ts:535`—`:563`：声明 sidecar locator 但没有 materialize asset。
- `native/synthesis-sidecar/crates/synthesis-application/src/topic.rs:1815`：locator 存在时要求对应 object asset。
- `scripts/check-synthesis-production-route-performance.ts:223`：setup 在采样前失败。

### P1 — 全量 core suite 无法加载（E3）

`npm run test:node:core:full` 在加载 `test/core/102-zotero-host-broker-capability-api.test.ts` 时失败：它仍 import 已移除的 `getDefaultSynthesisService`，并在测试内调用 `initializeBuiltinTagPolicy`。这是 legacy owner 移除后的测试漂移。

在修复前，当前候选没有全量 core 回归结果；后续潜在失败仍被这个首个加载错误遮挡。

### P1 — restart reconciliation 只扫描 1,000 条、且包含 terminal rows（E1）

启动恢复使用 `include_completed: true, limit: 1_000` 后再筛 `basis_kind` 和 `pending/running`。如果最近的 completed operation 已超过上限，较老的非终态 maintenance receipt 可能永远不被标记为 `continuation_required` 或 `restart_reconciliation_failed`。

关键位置：`native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:305`。

## 内部协议夯实程度

### 已夯实的部分

- 生产 capability manifest、TypeScript dispatcher、Rust binding、ready set、surface corpus 的集合完全一致：96/96，fingerprint 为 `f6841847f743b3a63bf7731f7bab32b869e9f7b75647b739f3dceed33fe68523`。
- cross-language contract gate 覆盖 6 个 schema、115 个 definition、14 个 positive case、15 个 negative case，全部通过。
- Rust application DTO 模块现有 35 个 struct、10 个 enum，关键 Topic/maintenance DTO 使用 serde `deny_unknown_fields`。
- transfer manifest/page 对 version、方向、页序、row count、byte length、SHA-256、root SHA-256 和 JSON node/byte limits 有双端校验。
- reverse-Host 请求限定 loopback、bearer token、超时、header/body 大小；artifact read 采用更高但仍有界的 8 MiB response policy。
- 96-operation real route 和 mutation reopen cases 通过，说明“路由名存在但完全不落库”的大面积空壳问题已经被压缩到少数自动行为/Host effect 缺口。

### 仍偏脆弱的部分

1. TypeScript `SynthesisClientPort` 仍有 66 个 `Promise<unknown>`，另有 35 个 `LegacySynthesisJsonPort` 引用。分组 client 只在一部分边界重建具体 DTO，类型系统无法保证 96 项字段级闭环。
2. Rust application 的核心 DTO 已类型化，但多个 surface adapter 仍以 `serde_json::Value` 手工取字段并对缺失值使用空字符串、空数组或 `Null`。现有 surface checker 主要证明 fixture 的外部形状和可观察项，不等于每个输入字段都被消费。
3. `outputTransferReference` 合约要求 `{sessionId,rootSha256}`，但 Rust content locator 只返回 `{contentTransfer:{sessionId}}`，TypeScript consumer 又把 `rootSha256` 设为 optional。consumer 会验证下载到的 manifest 自身 hash，却没有由 locator 绑定预期 root；这是降级而非完整的 end-to-end capability binding。
4. 14 个 reverse-Host capability 中 3 个在 Rust 生产源码无调用点。capability roster 和 handler 测试只证明“允许调用/能处理”，没有证明业务可达。
5. `check:synthesis-native-worker-transfer-parity` 虽通过，但输出 `nativeSmoke: false`。它不能替代真实 native worker smoke；本轮由 Rust workspace 和 219—235 real-route tests 补了大部分证据，仍应修正门禁命名或强制 source-fresh smoke，避免误读。
6. 96-operation matrix 对多数 operation 只断言顶层 object/array/boolean、非空对象或稳定错误码。固定 baseline observable fixture 只有 25 个 case，真实 production replay 又主要覆盖其中 17 个 read case；它不能证明非默认嵌套字段、筛选/排序/分页、input sensitivity 和 Host effect。
7. 迁移 SSOT 的 `audit.source_head` 仍固定在 `045c6302452861db0dfa5bf6610885c64bba9e1d`，不是本次候选；`direct_consumers` 也只覆盖 legacy composition。正式放行前应把审计身份重绑到候选，并把 Workbench、workflow Host API、Host Bridge/MCP、preferences/hooks 等真实消费者纳入检查。
8. WebDAV 配置与凭据由 plugin Host 持有，不属于 96-operation matrix。本轮证明了手动 WebDAV route，但没有 source-fresh Zotero 7/9 证据证明偏好变更会立即更新 `webdav.describe`、失效旧 client 并取消已有 timer/run。

## 竞态与边界风险

### 已复现

- HTTP connection 无 admission bound，partial requests 与线程 1:1 增长。
- partial request 无 read timeout，正常 shutdown 会卡在 handler join。
- maintenance 同 request replay 产生两个 operation receipt 和两份后台工作。

### 静态确认、尚待专门时序测试

- public maintenance worker 以 detached thread 启动，`ServeState` 没有保存 JoinHandle；listener 停机只 stop compute pool、join HTTP handlers，再尝试 `Arc::try_unwrap(state)`。maintenance 尚未结束时可能得到 `service_owner_leaked`，后台线程也没有统一 drain/cancel 完成条件。
- transfer `reap` 只按 idle/absolute TTL 判断，不排除 `queued/executing/publishing` session。reap/cancel 会删除 session root；worker 完成后只能释放 publication，业务结果丢失。执行中 activity 也不会持续刷新，长计算更容易碰 absolute TTL。
- transfer stop 先 `service_bytes.store(0)` 并清 session；若 worker 已 reserve output bytes、随后执行 rollback/release，会对 0 做 `fetch_sub`，计数可能下溢为极大值。
- `FileWebDavStateStore` 使用固定的 `.pending` / `.previous` 文件名，load-modify-save 没有 CAS；sync single-flight 只约束 sync 对 sync，pause/resume/retry 的 `persist_patch` 可与正在运行的 sync 交错，造成 last-writer-wins、控制状态丢失或 rename 冲突。
- WebDAV retry scheduler 的布尔语义可读性很差：`wait` 在 generation **不等于**传入值时返回 true，而 caller 只有 true 才继续；虽然 cancel/next-generation 的意图可能是唤醒并停止，当前命名和分支很容易掩盖反向条件，应以并发测试锁定。

## 验证总表

| 验证 | 结果 | 说明 |
|---|---:|---|
| service boundary | PASS | 113 public methods；131 baseline 与 23 authorized retirements 无账本错误 |
| production capabilities | PASS | 96 capability / 96 operation；所有集合与 metadata 检查通过 |
| 7 组用户 surface | PASS | Topic 18、Citation 12、Reference 16、Tag 19、Concept/Topic Graph 9、Artifact/Debug 12、WebDAV/Maintenance 10 |
| cross-language contracts | PASS | 6 schema / 115 definitions / 14 positive / 15 negative |
| native runtime contract | PASS | launch/discovery/runtime contract 一致 |
| native worker transfer parity | PASS* | checker 报告 `nativeSmoke:false` |
| durable foundation parity | PASS | repository/canonical 基础可观察项一致 |
| application differential | **FAIL** | 4/4 checker 失败 |
| Stage 1 | **FAIL** | 203—218 分片 146 pass / 4 fail；其他分片通过 |
| Rust fmt / clippy | PASS | clippy 使用 `-D warnings` |
| Rust workspace tests | PASS | 227 tests |
| TS package + project + sidebar typecheck | PASS | contracts/engine/repository/application/service、root、sidebar |
| Synthesis invariants | PASS | 27 tests |
| OpenSpec strict | PASS | 357/357 |
| Rust license inventory | PASS | 70/70 crates；bundled SQLite 3.53.2 |
| full Node core | **FAIL** | test 102 import removed export，suite 未开始完整执行 |
| production-route performance | **FAIL** | setup invalid_request，2k/10k/25k 均无 sample |
| Zotero 7/9 desktop smoke | **BLOCKED (E0)** | 本机 Orca computer backend 缺 `python3-gi`、`gir1.2-atspi-2.0`、`at-spi2-core`；按约束未安装依赖 |

工作区在执行门禁后保持 clean；本轮仅新增本报告，没有修改实现、测试或规格。

## 修复与复验顺序

1. **补齐三条真实业务链**：代表图 reverse-Host read、Related Items effect planning/apply/receipt、staged Tag binding Host migration。每条测试必须从用户入口或真实 production client 发起，不能直接 seed 最终表。
2. **恢复 canonical mutation → WebDAV autosync**：在 Rust application/production composition 中建立唯一的 post-commit hook，覆盖旧版同一组 mutation，并验证“写成功才触发、写失败不触发、autosync 失败不回滚已提交写入”。
3. **加固 HTTP server**：connection admission 上限、request/header 累计大小、read/write timeout；停机先中断 socket，再有界 drain handler。复用本报告两条真实进程探针作为回归行为。
4. **固定 maintenance identity**：operation identity 由稳定 request identity 与 capability/payload basis 构成，不包含受理时间；同 request replay 返回原 receipt。reconcile 应分页扫描非终态 public maintenance rows。
5. **修复 transfer/WebDAV 竞态**：executing/publishing session pinning、stop/reap 的 byte ownership、background JoinHandle/drain；WebDAV state 使用互斥或 revision/CAS，补 pause-vs-sync、retry-vs-stop 的时序测试。
6. **修复证据链**：同步 Node oracle/允许差异后让四个 application parity gate 全绿；补齐 synthetic sidecar assets 后重跑 2k/10k/25k；移除 test 102 的 legacy service 依赖后跑完整 core suite。
7. **在具备 AT-SPI 的隔离环境做 Zotero 7 与 Zotero 9 source-fresh smoke**：至少覆盖 Topic create/update/delete/reopen、digest representative image、Tag promotion/legacy migration、citation refresh→Related Items、autosync、maintenance cancel/retry/restart、快速 owner 切换和 sidecar shutdown。

满足以上条件后，才适合把本次迁移放进主线扩大真实场景测试；发布/prebuild 仍应作为后续独立流程执行。

## 第一阶段修复复验（2026-08-12）

本节只记录“修复与复验顺序”第 1 项的结果，不改写上文审计结论，也不把其余阻断项视为已解决。

### 工作树身份

- 固定基线 HEAD：`45a1c6cb3781830c9bcc605b58a2b8332c3869ce`。
- 用户行为基线仍为 `v0.8.3`，可执行 Node oracle 仍为 `e210997a11e0054a3cb4ae0656e5cfb96102a09c`。
- 实现、测试、文档和 OpenSpec 工作树补丁身份（不含本审计文件，tracked diff 加 untracked 文件内容哈希）：`sha256:e2886959da5dbcec709aa738bd2327ceaa1c10749970e068c179fa221ca861a9`。
- 本阶段没有新增 public client method、wire operation、reverse-Host capability、SQLite 表或依赖。生产 roster 保持 96 operations / 14 reverse-Host capabilities。

### 三条真实业务链

1. Topic digest 代表图：`client.resolveTopicPaperDigest` 经 grouped client 和真实 sidecar 进程调用 `library.representative_image.read`，Host payload 精确为 `libraryId + noteKey`。复验覆盖 available data URL、absent 字段省略、Host/非法结果降级为稳定 unavailable，以及 opt-out 不调用；digest markdown 在代表图失败时仍成功。该 capability 与 artifact read 共用 10 秒、8 MiB reverse-Host 预算，图片解码上限为 2 MiB。
2. Related Items：公开 literature apply 先产生 accepted citation facts；一次 full Graph rebuild 不触发同步，随后公开输入变更写入 stale delta，`client.refreshCitationGraphCacheIncrementalNow` 返回 `affected_source_refs` 和 `related_items_sync`。真实 route 验证了 pending-before-Host、严格 batch receipt、独立 operation、effect row、echo 与进程重启；没有直接 seed 最终 effect row。Rust 回归另覆盖 malformed/transport 停批、mixed receipt、early echo、pending retry ownership、只撤销 Synthesis 自有关系。
3. staged Tag binding：sidecar 停止期间只注入旧数字 binding，重启后通过 `effects.staged_tag_binding.resolve` 按 `libraryId + itemIds` 解析并以一次 revision CAS 重写。真实 route 验证 Host payload、迁移 operation、正常 promote、失败时 staged JSON/revision 不变和后续重试；Rust 回归覆盖 101 个 ID 的 100+1 分批、完整分区校验、并发 gate 合并，以及 list/stage/update/promote/discard/clear 六个入口。

### 验证结果

以下第一阶段门禁均通过：

- `npm run format:check:synthesis-rust-sidecar`
- `npm run check:synthesis-rust-sidecar`
- `npm run test:synthesis-rust-sidecar`：236 passed，0 failed。
- `npm run build:synthesis-rust-sidecar`
- `npm run check:synthesis-contracts`
- `npm run check:synthesis-cross-language-contracts`：6 schemas / 115 definitions / 14 positive / 15 negative。
- `npm run check:synthesis-production-capabilities`：96 capabilities / 96 operations，fingerprint 未变。
- Topic Workbench、Citation Graph、Artifact/Library/Debug 三个 surface parity gate：18 / 12 / 12 operations，全部通过。
- `test/core/188-host-http-response-governance.test.ts` 与 `test/core/229-synthesis-production-client-rust-route.test.ts`：19 passing。
- `openspec validate restore-synthesis-rust-sidecar-main-parity --type change --strict`。
- `openspec validate --specs --strict`：353 passed，0 failed。
- 变更文件 scoped Prettier、`git diff --check`：通过。

### 仍未解决的阻断项

本阶段没有处理 canonical mutation → WebDAV autosync、HTTP server admission/shutdown、maintenance replay identity/reconcile pagination、transfer/WebDAV 竞态或 Zotero 7/9 desktop smoke。上文记录的四个 application parity gate 失败、production-route performance fixture 无样本、full Node core suite 加载失败也仍然存在。因此这里只能确认三条业务链已修复并通过针对性门禁，不能据此宣称整个 premerge 已通过，也没有执行 prebuild、release、发布或 Gitee 同步。

## 第二阶段修复复验（2026-08-12）

本节只记录“修复与复验顺序”第 2 项。原始审计结论保持不变，其余阻断项没有因此解除。

### 工作树身份与边界

- 固定基线 HEAD：`57ce0deb2cfdb7712d809de80afdaa40a18a1b4e`。
- 用户行为基线仍为 `v0.8.3`，可执行 Node oracle 仍为 `e210997a11e0054a3cb4ae0656e5cfb96102a09c`。
- 实现、测试、文档和 OpenSpec 工作树补丁身份（不含本审计文件，tracked diff 加 untracked 文件内容哈希）：`sha256:88ef4d4f069bc327ea33bfcbed18d49c67dc32044cc2cd0e4cf992fe3aaa96a4`。
- 本阶段没有新增 public client method、wire operation、reverse-Host capability、SQLite 表、schema 或依赖。service boundary 仍为 113 个 public methods；生产 roster 仍为 96 operations / 14 reverse-Host capabilities，fingerprint 仍为 `f6841847f743b3a63bf7731f7bab32b869e9f7b75647b739f3dceed33fe68523`。

### Canonical mutation → WebDAV autosync

Rust production composition 现在持有一个 autosync coordinator 和一个 worker。inline dispatch 与 Reference refresh receipt worker 都在 application 返回之后，把结果和 repository SQL observation 交给同一个分类器。只有固定基线中的 16 个 Topic、Tag、Concept、Topic Graph、Reference refresh operation 同时满足语义提交成功与 `write_count > 0` 时，才会标记 durable state 为 dirty；projection、cache、job、log、staged-only、WebDAV import、no-op、失败和零写入均不触发。

inline 提交使用 5 秒 trailing debounce。并发 Reference refresh worker 共享 maintenance epoch，最后一个参与者退出后才开始 debounce，因此同一 epoch 只产生一次发布机会。worker 在触发时读取当前 Host 配置，并复用既有 `WebDavSyncApplication::trigger_webdav_auto_sync`；禁用配置不进入远端读写，远端失败只产生 diagnostic，不改变已经返回并持久化的本地提交。

手动 sync、pause、retry 和 conflict resolution 会先取消待执行 debounce。sidecar shutdown 先停止 coordinator admission、清空待发布状态、abort WebDAV target 并 join worker，再停止 WebDAV admission、drain 当前 run，随后才释放 production owners。worker 创建失败通过现有 service startup `Result` 返回，不会在生产组合根 panic。

TDD 的第一轮 Rust 测试先引用尚不存在的 coordinator/classifier API，编译按预期失败；实现后，表格测试锁定完整 eligible/ineligible 集合、SQL 零写入排除、短提交合并、maintenance epoch draining、远端失败隔离和 shutdown cancellation。真实 source-fresh sidecar route 另验证：

1. 两次 Tag canonical commit 在一个窗口内只写一次 `HEAD.json`；
2. autosync disabled 时没有 `webdav.read_text` / `webdav.write_text`；
3. reverse-Host read 失败后，Tag mutation 在当前进程和 reopen 后都可读；
4. no-op 与 invalid request 不产生 WebDAV 调用，成功提交后立即 shutdown 也不会越过关停边界发布，且本地提交在 reopen 后仍存在。

### 文档与规格

OpenSpec change 增加了 canonical post-commit、maintenance epoch 和 lifecycle ownership 约束，进度由 88/88 更新为 94/94。`webdav-durable-sync.md` 与 `knowledge-graph.md` 已改为描述实际 Rust composition、触发集合、排除边界、5 秒合并、显式控制取消和 shutdown 顺序。

复验时还确认了一个不属于本阶段修复范围的既有漂移：当前 Rust `WEBDAV_RETRY_DELAYS_MS` 为 `1s / 5s / 30s / 120s`，主 OpenSpec 的 automatic retry requirement 仍写 `60s / 5m / 15m / 30m`。本阶段没有擅自选择其中一套语义，也没有改动 retry policy；正式放行前仍需单独决策并统一代码、规格和文档。

### 验证结果

以下第二阶段门禁均通过：

- `npm run format:check:synthesis-rust-sidecar`
- `npm run check:synthesis-rust-sidecar`（Clippy `-D warnings`）
- `npm run test:synthesis-rust-sidecar`：240 tests，0 failed。
- `npm run build:synthesis-rust-sidecar`
- `npm run check:synthesis-service-boundary`：113 public methods，无未授权 retirement。
- `npm run check:synthesis-contracts`
- `npm run check:synthesis-cross-language-contracts`：6 schemas / 115 definitions / 14 positive / 15 negative。
- `npm run check:synthesis-production-capabilities`：96 capabilities / 96 operations，fingerprint 未变。
- Topic Workbench、Reference、Tag、Concept/Topic Graph、WebDAV/Maintenance surface parity：18 / 16 / 19 / 9 / 10 operations，全部通过。
- `test/core/229-synthesis-production-client-rust-route.test.ts` 的 autosync 定向用例：4 passing。
- `openspec validate restore-synthesis-rust-sidecar-main-parity --type change --strict`。
- `openspec validate --specs --strict`：353 passed，0 failed。
- 变更文件 scoped Prettier、`git diff --check`：通过。

### 仍未解决的阻断项

本阶段没有处理 HTTP connection admission/read timeout/shutdown handler drain、maintenance replay identity/reconcile pagination、transfer/WebDAV state 竞态、四个 application parity gate、production-route performance fixture、full Node core suite 加载错误或 Zotero 7/9 desktop smoke。automatic retry schedule 的代码/规格漂移也仍待决策。因此这里只能确认 canonical mutation autosync 已恢复并通过针对性门禁；整个 premerge 仍未通过，也没有执行 prebuild、release、发布或 Gitee 同步。

## 第三阶段修复复验：有界 HTTP server

本节记录独立 OpenSpec change `harden-synthesis-rust-sidecar-http-server` 的实现与复验。固定实现基线为 `e2b40bee8e9bacbedc86a0071da9e77ca1ef2da1`；工作区补丁身份（不含本审计文件，tracked binary diff 加按路径排序的 untracked 文件内容哈希）为 `sha256:ef1b4cb48ba88303afc478577c0c33fad1574b960984c1135478cffc192166ed`。该 change 只处理上文“HTTP partial request 可线性增殖线程并阻塞停机”这一项，不改变报告中其余 P0/P1 的状态。

### 修复后的运行时约束

- listener 最多持有 16 条 active HTTP connection，不设置等待队列。超额连接不创建 handler thread，直接返回 `503 service_unavailable`。
- request line 与单条 header line 上限均为 8 KiB，request line 与 headers 的累计 framing 上限为 64 KiB；传输层 body 上限为 8 MiB。普通 production call 既有的 1 MiB 业务上限仍由 dispatch 层执行。
- 只接受严格的 HTTP/1.1 `Content-Length` framing；冲突的重复长度、`Transfer-Encoding`、错误版本及不完整 framing 在业务 dispatch 前被拒绝。
- read idle timeout 为 500 ms、request 总读取时限为 30 s、write timeout 为 2 s。header、body、timeout 与 framing 错误分别稳定映射到 `431 invalid_request`、`413 request_body_too_large`、`408 request_timeout`、`400 invalid_request`。
- stdin EOF 或 lifecycle shutdown 进入 stopping 后，listener 先停止接收并中断已登记 socket，再以 500 ms 上限 drain handler。已完成 JoinHandle 在服务循环内持续回收，connection lease 通过 RAII 释放 admission slot。
- `system.shutdown` 先 flush success receipt，再发布 stopping 并停止 compute/transfer owners；即使 response write 失败，shutdown 仍继续执行。

### TDD 与真实进程证据

实现前，新增的三组真实进程回归在固定基线上为 **0 passing / 3 failing**：100 条 partial connection 全部保持打开；超长 request line 未返回 431；stdin shutdown 在 partial request 存在时未能于 1.5 秒内结束。随后补充 lifecycle receipt 顺序用例，形成四组 HTTP governance 行为。

source-fresh 二进制复验结果为：

```text
Synthesis sidecar HTTP server governance
  4 passing

Synthesis Rust production client route
  2 passing

6 passing (5s)
```

100 条 partial connection 探针证明 active socket 与 handler thread 均不超过 16；至少一条溢出连接收到 503。释放连接后 health route 恢复。framing/timeout 用例逐项核对 HTTP status 与结构化 error code，并在每次拒绝后验证 listener 仍能服务。两条 shutdown 用例分别证明 stdin EOF 能中断 partial read，以及 lifecycle success receipt 在其它 socket 被中断前已完整到达客户端。

### 第三阶段验证结果

| 验证 | 结果 | 本阶段证据 |
|---|---:|---|
| Rust format | PASS | `cargo +nightly-2026-07-25 fmt --all --check` |
| Rust Clippy | PASS | workspace/all-targets，`-D warnings` |
| Rust workspace tests | PASS | 246 passed；其中 sidecar binary 78 passed |
| Rust workspace build | PASS | locked workspace build |
| HTTP governance + production route | PASS | 6 passing，真实 source-fresh sidecar 进程 |
| service boundary | PASS | 113 public methods，无 production boundary violation |
| TypeScript contracts | PASS | package typecheck |
| cross-language contracts | PASS | 6 schema / 115 definitions / 14 positive / 15 negative |
| production capabilities | PASS | 96 capability / 96 operation，fingerprint 未变化 |
| OpenSpec strict | PASS | 新 change 与全量 specs 严格校验 |
| Prettier / diff check | PASS | change artifacts、测试、文档与检查脚本；无 whitespace error |

边界检查脚本同时收紧了检查口径：reverse-Host `TcpStream::connect` 限制只扫描移除 `#[cfg(test)]` 后的 production source，避免新加入的 loopback socket-pair 单元测试被误判；生产源码的唯一允许项仍是 `runtime_reverse_host.rs`。

一次非正式复跑误用了旧工具链 `nightly-2025-10-20`，在 `libsqlite3-sys` 的 `cfg_select` 编译处失败。该命令不是仓库门禁；随后按 `package.json` 与 `rust-toolchain.toml` 固定的 `nightly-2026-07-25` 完整重跑，结果如上。

### 剩余阻断与范围

本阶段只关闭 HTTP admission、framing、timeout 与 shutdown drain 缺口。代表图、Related Items、WebDAV autosync、旧 Tag binding 迁移、maintenance replay、application parity、性能 fixture、full core suite、restart reconciliation 以及已列出的 transfer/WebDAV 竞态仍按原审计等级保留。因而本报告的整体结论不变：候选尚不能据此直接合入主线。

本次没有提交、切换分支、执行 sidecar prebuild、创建 release、推进 feed 或触发任何发布流程。发布与 prebuild 仍是后续独立且需明确授权的工作。

## 第四阶段修复复验：maintenance replay 与 restart reconciliation

本节记录独立 OpenSpec change `harden-synthesis-public-maintenance-replay` 的实现与复验。固定实现基线为 `454e8bf1d04e0241089cb7d754d472628f4252ec`；最终工作区补丁身份（不含本审计文件，tracked binary diff 加按路径排序的 untracked 文件内容哈希）为 `sha256:1f2cdfeccb408a999b2e703267c662c7e467c441296a5daf26cd93ad3493ac46`。本阶段只关闭上文 maintenance request replay 与 restart reconciliation 两项，不改变其它阻断项的状态。

### Replay 所有权

公开 maintenance operation identity 现在只由 capability、公开 request ID 与 canonical source hash 决定，不再包含受理时间。同一请求及相同输入会命中同一 durable receipt；仓储的 `INSERT OR IGNORE` 同时返回持久化记录与 first-insert 标记，只有 first insert 可以发布 `maintenance-started`、取得 autosync maintenance epoch 并创建 worker。replay 在任何非终态或终态阶段都直接返回已有 receipt，不重复读取 Host、不重复执行外部副作用，也不重复发布 lifecycle。

命中相同 operation ID 后，运行时还会核对 operation type、公开 maintenance basis kind 与 source hash。持久化 basis 冲突时返回稳定的 `basis_mismatch`，不会借 replay 路径执行另一份工作。retry successor 沿用同一个原子插入事实源，重复 retry 仍只取得首次创建的 successor。

### Restart reconciliation

仓储 open 不再修改 operation lifecycle。启动后的显式 reconciliation 使用 operation ID 升序的有界 keyset page，从第一页起就保持相同顺序，每页最多 1,000 条：

- 所有 public maintenance `running` receipt 转为 `failed / restart_reconciliation_failed`，并记录 `restart_external_effect_unknown`；由于外部副作用结果未知，不做自动 replay。
- 所有其它 `running` receipt 转为 `canceled / service_restart`，并记录 `synthesis_operation_stale_after_restart`。
- 所有 public maintenance `pending` receipt 转为 `continuation_required`，等待显式继续。
- completed、succeeded、failed、canceled、timed_out 等 terminal receipt 由 SQL 条件排除，不进入启动写路径。

仓储回归以更新时间和 operation ID 逆序的数据锁定第一页排序，避免第一页按 `updated_at`、后续页按 ID 游标造成漏行。真实进程回归另外写入 1,001 条 public pending、1 条 public running、1 条 generic running 与 1,001 条 terminal distractor，证明跨页恢复覆盖全部非终态记录且不改 terminal receipt。

### TDD 与真实进程证据

实现前，两条新 production-route 用例在固定基线二进制上为 **0 passing / 2 failing**：相同 request ID 的并发 replay 得到不同 operation ID；含 1,001 条 public pending 的重启场景没有完成跨页 reconciliation。实现及第一页 keyset 排序修正后，两条用例为 **2 passing**。replay 用例同时断言一个 operation ID、一次 `library.items.list_page`、一次 artifact scan Host read、一次 `maintenance-started`，并在 terminal 后再次 replay 验证 receipt 不变。

完整 `test/core/229-synthesis-production-client-rust-route.test.ts` 为 **19 passing / 1 failing**。失败项是 `plans and applies Related Items effects after a successful incremental Graph refresh` 的 echo 断言；同一用例在未应用本阶段补丁的固定基线 `454e8bf1` 上独立运行同样失败，因此不归因于本阶段。该既有回归仍需单独处理，不能把整个 route 文件记为全绿。

### 第四阶段验证结果

| 验证 | 结果 | 本阶段证据 |
|---|---:|---|
| Rust format | PASS | 固定 nightly 的 workspace `fmt --check` |
| Rust Clippy | PASS | workspace/all-targets，`-D warnings` |
| Rust workspace tests | PASS | 247 passed；新增 repository keyset-order 回归通过 |
| Rust workspace build | PASS | locked workspace build |
| maintenance replay + restart route | PASS | 2 passing，真实 source-fresh sidecar 进程 |
| service boundary | PASS | 无 missing、unknown、contract violation 或 unauthorized retirement |
| TypeScript contracts | PASS | package typecheck |
| cross-language contracts | PASS | 6 schema / 115 definitions / 14 positive / 15 negative |
| production capabilities | PASS | 96 capability / 96 operation，fingerprint `f6841847f743b3a63bf7731f7bab32b869e9f7b75647b739f3dceed33fe68523` 未变化 |
| WebDAV/Maintenance surface parity | PASS | 10 operations |
| OpenSpec strict | PASS | change 与 353 项 main specs 严格校验；delta 已同步并归档 |
| Prettier / diff check | PASS | 变更 TypeScript 文件与 whitespace gate 通过 |

本阶段没有新增或删除 public client method、wire operation、reverse-Host capability、SQLite 表、schema 或依赖。生产 roster 仍为 96 operations / 14 reverse-Host capabilities。repository open 的 `_reconcile_now` 形参暂时保留，是现有调用契约的一部分；它不再承载生命周期副作用。

### 剩余阻断与范围

本阶段没有处理 transfer session 在 executing/publishing 期间的 pinning 与 byte ownership、maintenance worker 的统一 drain、WebDAV state CAS/互斥及 pause/retry/stop 时序、四个 application parity gate、性能 fixture、full core suite、Related Items 既有 echo 失败、automatic retry schedule 的代码/规格漂移或 Zotero 7/9 desktop smoke。整个 premerge 因此仍不能判定为通过。

本次没有提交、切换分支、执行 sidecar prebuild、创建 release、推进 feed、触发发布或运行 Gitee 同步。上述流程仍需在后续任务中单独授权。

## 第五阶段修复复验：transfer 与 WebDAV 并发所有权

本节记录 OpenSpec change `harden-synthesis-transfer-webdav-concurrency` 的实现与复验。固定实现基线为 `58ac5ddbd813c7198e794f242b502e298870b9aa`；最终工作区补丁身份（不含本审计文件，tracked binary diff 加按路径排序的 untracked 文件内容哈希）为 `sha256:3dbe91ab37a1cf56b973cb9bf86c4c401c1259a7f880bae462ab40cb53426983`。本阶段只关闭 transfer session pinning、字节所有权、composition-owned background drain、WebDAV 状态事务与 retry/stop 时序，不改变其它审计项。

### Transfer 与后台任务所有权

native composition 新增统一 background-task owner。Transfer attempt、首次 public maintenance controller 与显式 resume controller 都在启动前登记 JoinHandle 和 cancellation flag；listener 正常轮询时回收已完成任务。Shutdown 共用既有 500 ms deadline：关闭 background admission，停止 canonical autosync 并 abort WebDAV，停止 compute admission，逻辑取消 transfer session，随后 drain background task 与 HTTP handler。只有所有引用 transfer、repository、canonical 的工作完成后，才删除 transfer root 并关闭存储 owner；超时会返回稳定的 `background_task_drain_timeout:<count>`，不会在仍有引用时强行 close。

Transfer cleanup 分成逻辑撤销和物理回收。Idle reaper 不再移除 queued/executing/publishing session；absolute expiry、显式 cancel 与 shutdown 会立即隐藏 session、撤销 idempotency 并设置 cancellation，文件直到 active attempt 返回后才删除。输入 page、output sink 和已采用 publication 的 staged bytes 都由 RAII reservation 持有；commit 通过 typed `PagedOutputCommit` 移交 ownership，不再从 JSON `stagedBytes` 反推回收量，也不存在 stop 清零后晚到 rollback 再减一次的路径。

### WebDAV 状态与 retry

`WebDavSyncApplication` 用一把 transaction mutex 串行化完整的 load-normalize-patch-save 转换。Sync 不在 Host I/O 期间持锁，终态持久化会重新载入最新状态再应用 patch，因此并发 pause 不会被旧 sync snapshot 擦除。文件 store 另行串行化 `.pending` / `.previous` 原子替换，避免同一进程内保存竞争。

生产 retry scheduler 改为 generation watermark 加 condition variable。`wait(delay, generation)` 只有在完整 delay 结束且 generation 未取消时才返回 true；pause、superseding trigger、abort 和 shutdown 会唤醒等待并阻止下一次 Host 调用。代码、主 OpenSpec 和运行时文档已统一为 `60s / 5m / 15m / 30m`，不再截断为一秒。

### TDD 与真实进程证据

实现前的定向失败证据如下：active attempt 在 reap 时被提前删除；stop 后的晚到 output rollback 令 `stagedBytes` 下溢为 `18446744073709551594`；sync terminal 会覆盖并发 pause；生产 retry 常量仍为 `1s / 5s / 30s / 120s`；真实进程在 WebDAV retry wait 中 shutdown 返回 `canonical_store_owner_leaked,repository_owner_leaked`。这些用例在实现后全部转绿。

source-fresh 真实进程回归为 **2 passing**。一条在首个 WebDAV retry wait 中停机，证明等待立即取消、只发生一次 `webdav.read_text`、进程在 500 ms 内以 exit code 0 结束；另一条上传 8,000 个 Citation Graph node、受理 transfer execution 后立即停机，证明 attempt drain 后才移除 session root，且进程同样在 500 ms shutdown budget 内正常结束。

### 第五阶段验证结果

| 验证 | 结果 | 本阶段证据 |
|---|---:|---|
| Rust format | PASS | 固定 nightly 的 workspace `fmt --check` |
| Rust Clippy | PASS | workspace/all-targets，`-D warnings` |
| Rust workspace tests | PASS | 254 passed，0 failed；sidecar binary 83 passed |
| Rust workspace build | PASS | locked workspace build |
| transfer + WebDAV shutdown route | PASS | 2 passing，真实 source-fresh sidecar 进程 |
| service boundary | PASS | 113 public methods，无 contract violation 或 unauthorized retirement |
| TypeScript contracts | PASS | synthesis-contracts package typecheck |
| cross-language contracts | PASS | 6 schema / 115 definitions / 14 positive / 15 negative |
| production capabilities | PASS | 96 capability / 96 operation，fingerprint `f6841847f743b3a63bf7731f7bab32b869e9f7b75647b739f3dceed33fe68523` 未变化 |
| WebDAV/Maintenance surface parity | PASS | 10 operations |
| OpenSpec strict | PASS | change 与 353 项 main specs 严格校验；delta 已同步并归档至 `2026-08-12-harden-synthesis-transfer-webdav-concurrency` |
| Prettier / diff check | PASS | 变更 TypeScript、Markdown、OpenSpec 与 whitespace gate 通过 |

### 剩余阻断与范围

本阶段没有处理四个 application differential parity gate、production-route performance fixture、full Node core suite 的既有加载问题、Related Items echo 既有失败或 Zotero 7/9 desktop smoke。因而这里确认的是第五阶段列出的 transfer/WebDAV 并发缺口已经关闭，不能据此把整个 premerge 审计改判为通过。

本次没有提交、切换分支、执行 sidecar prebuild、创建 release、推进 feed、触发发布或运行 Gitee 同步。上述流程仍需后续任务单独授权。

## 第六阶段修复复验：递归 DTO 合同

本节记录 OpenSpec change `harden-synthesis-sidecar-recursive-dto-contracts` 的实现进展。行为判断固定到 `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`；Node oracle 只保留为辅助差分工具。工作区实现起点另行记录，不参与定义业务行为。这一阶段针对上文“外层类型存在、嵌套数据仍可经 `unknown` / `SynthesisJsonObject` / `serde_json::Value` 穿透”的问题建立统一协议事实源；它不改变 96 项公开 client operation、14 项 reverse-Host capability、数据库 schema 或生产 capability fingerprint。

新增的 `synthesis-sidecar-protocol-v1` 注册表逐项映射 119 个跨进程 capability 和 15 个 deterministic worker operation 的 request、result 与 error `$defs`。递归闭包门禁会沿 `$ref` 检查对象闭合、数组元素、union 分支和孤儿定义；通用 JSON 只保留具名、版本化且有容量与完整性约束的 opaque leaf。最终注册表包含 18 个 schema、799 个递归定义，语料总计 39 个 positive case 和 39 个 nested negative case，其中 protocol capability 覆盖为 38 positive / 36 negative；指纹为 `sha256:2aca59a9a8c196c69a8b0d8e8be19c5a907dbbb55f6e77dd58291673c378a1ec`。检查结果为 119/119、15/15、未授权泛型逃逸 0。

生产 TypeScript native composition 现在按 capability 在发送 request 前、收到普通或 transfer-backed result 后执行递归 schema 重建；Node sidecar 在鉴权、身份与 lifecycle 门禁之后校验 capability payload，因此不会让 DTO 错误改变 401/403 的安全优先级。Topic/Workbench 进一步落成具体的 TypeScript 与 Rust domain DTO；Rust 持久化 Topic 行重新打开时直接反序列化这些 DTO，不再用别名探测和空对象拼装掩盖结构漂移。reverse-Host request/result、transfer locator、transfer manifest/page/row 以及 Host effect diagnostics 也进入严格重建路径，所有 output locator 均以 `rootSha256` 绑定 session 与预期根摘要。

严格接线暴露并修正了此前 corpus 没覆盖的真实合同漂移：Topic apply 的 inline assets 与 sealed transfer 是两个封闭分支；Reference 首次 refresh 接受显式空 options；Tag save/stage 由 TypeScript 边界补齐 Rust 所需的具体字段；Artifact read 的 `artifact_types` 保持明确可选。`client.getReviewInput` 是本轮最关键的基线纠偏：Node oracle 与早期迁移曾把它误写成 review queue 分页 DTO，但固定主线明确返回 `synthesis.review_workflow_input`。最终实现恢复完整递归形态，包括 Topic artifact、manifest、flat canonical metadata、normalized resolved paper snapshot、registry coverage、Citation Graph slice、diagnostics 和输入哈希；别名 `topic_id` 被拒绝。真实 Rust 进程 route 已验证这一路径，未采用 oracle 的分页行为。

旧 `synthesis-cross-language-v1` contract set 已删除；system、lifecycle、launch/discovery/runtime bundle、error/diagnostic/trace、九项非 client forward capability、14 项 reverse-Host capability、96 项 production client capability 和 15 项 worker operation 均由新注册表闭合。Rust worker 的 `Map` / `Value` 仅留在私有 framing/codec 层，domain 调用经序列化请求与具体结果 DTO 边界；TypeScript worker task 使用 operation-discriminated request/result。production capability 仍为 96/96，指纹保持 `f6841847f743b3a63bf7731f7bab32b869e9f7b75647b739f3dceed33fe68523`。

最终门禁结果：TypeScript contracts、service 与根 typecheck 通过；production roster、cross-language、worker-transfer、native runtime 与七个 surface parity gate 通过；Rust format、workspace/all-targets Clippy、locked workspace build 与 257 项 workspace tests 全部通过；固定基线 Workflow Review 真实进程回归 1 passing；OpenSpec strict、scoped Prettier 与 whitespace gate 通过。四个 application differential 中此前已记录的 Node oracle drift 仍作为辅助诊断保留，没有被 allowlist，也没有驱动 DTO 或业务行为变更。

这项 change 的完成不授权删除 Node oracle 或 plugin legacy owner；相关 removal change 仍需按各自范围单独执行。本次没有提交、切换分支、执行 sidecar prebuild、创建 release、推进 feed、触发发布或运行 Gitee 同步。

## 第六阶段最终修复复验：合入证据链

本节记录独立 OpenSpec change `repair-synthesis-premerge-evidence-chain` 的最终复验。业务行为仍固定到 `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`；本轮执行起点为 `bd25af9b05d2649f9f8a58dc21f578d3a1af5d49`，开始时工作树干净。实现、测试、规格和脚本的未提交补丁身份（不含本审计文件，tracked binary diff 加按路径排序的 untracked 文件内容哈希）为 `sha256:e1e3c666aba5ef3990a57a6dd2ec52263a4ac6569fc00d13eaedca2df2ab1cf6`。

四个 application differential 已恢复为可执行的 source-fresh 合入证据。typed、Citation/Reference、Tag/Concept/Topic Graph、Checkpoint/Bundle/WebDAV/Debug 四个直接门禁分别比较 53 张持久化表，均返回 `ok: true`、`errors: []`；既有 cross-language wrapper 为 5 passing。唯一差异政策是精确的 Rust redirect-graph schema marker，它由四个检查器共享同一事实源，不接受其它表、字段或值的放宽。Topic oracle 的 readiness、freshness、空 patch 继承和批量 Reference read 已与固定主线对齐；restart reconciliation 在 Rust driver 中显式执行；WebDAV fixture 使用当前递归 reverse-Host DTO。

生产性能证据也已恢复。合成 fixture 由同一 payload map 生成 manifest locator 与实际 JSON asset，测试会逐个解析 locator 并确认对象内容。完整 2k/10k/25k production-route gate 返回 `passed=true`、`failures=[]`。10k Reference refresh 的 p50 为 `2423.158 ms`、p95 为 `2464.379 ms`，低于 `2500 ms` 预算；SQL query/write 保持 `122/715`，Host 调用为 `500`，item/artifact/read 分别为 `100/300/100`。Reference FullSweep 快路径只在同一运行内 snapshot identity 已验证、无删除且完整投影结果等价时生效；删除或未验证状态仍走完整投影。对应 Rust 回归同时比较最终投影与 durable state，未用放宽预算换取通过。

完整 Node core suite 已连续按无 grep、无 exclude、无新增 skip 的正式入口复跑三次。最终一次为 `3483 passing / 16 pending`，exit code 0。修复覆盖了旧 service loader、严格 request/result 错误分类、bearer/lifecycle 优先级、Host Bridge 与 MCP fixture、Workbench/Workflow/sidecar runtime DTO、共享 runtime cleanup、UI DOM identity 行为检查，以及 production TraceContext marker 的精确 release allowance。pending 数量来自既有测试条件，本轮没有增加兼容默认值或 suite-order 依赖。

最终合同与运行时门禁结果如下：

- contracts、repository、application、service、service boundary、production capabilities 和 runtime diagnostics 全部通过；service boundary 仍为 113 个 public methods。
- cross-language registry 为 18 schemas / 813 definitions / 41 positive / 41 negative，119 个 protocol capability、15 个 worker operation、未授权 generic escape 0；指纹为 `sha256:3061d99eb4c1d73dd5529d0bc9f10eafc49285e3af5d3330bb770151db0c9284`。
- production roster 仍为 96/96，没有新增或删除 operation/capability；release diagnostics exclusive bytes 为 0，production marker allowance 仅包含 `observation.v2`。
- Stage 1 sidecar suite 全部分片通过。Rust 固定 nightly 的 format、workspace/all-targets Clippy `-D warnings`、locked workspace tests 与 build 全部通过；workspace 共 261 tests，0 failed，其中 sidecar binary 88 passed。
- 根 TypeScript 与 sidebar TypeScript 配置均通过。变更 TypeScript、JavaScript、Markdown、YAML 的 scoped Prettier 通过；三个 protocol registry JSON 延续既有紧凑格式，固定起点文件本身即不满足全文件 Prettier，因此未制造与本次语义无关的整文件格式 churn。`git diff --check` 与 OpenSpec strict validation 通过。

至此，原审计中四个 application parity gate、production-route performance fixture、full Node core suite 与 Related Items route 回归均已有绿色 source-fresh 证据。剩余边界是 Zotero 7 与 Zotero 9 desktop smoke；它需要真实桌面运行环境，未被自动化 sidecar/Node 门禁替代。因此本轮没有把 desktop smoke 记为通过，也没有执行提交、切换分支、sidecar prebuild、release、feed 推进、发布或 Gitee 同步。
