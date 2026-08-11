# Rust Synthesis sidecar 合入前审计

日期：2026-08-12  
候选：`45a1c6cb3781830c9bcc605b58a2b8332c3869ce`（`refactor: restore synthesis rust sidecar main parity (stage 22)`）  
用户行为基线：`v0.8.3` / `8eed0829cd19d54b58c60684c9fd875741235958`  
可执行 Node oracle：`e210997a11e0054a3cb4ae0656e5cfb96102a09c`

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

`v0.8.3` 是用户指定的行为基线。迁移使用的 Node oracle 固定在 `e210997a`；它比 tag 晚一个提交，但对本次核查的 Synthesis service、contracts、engine、application、repository、边界检查和早期 parity tests 无源码差异，因此可作为可执行基线。

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
