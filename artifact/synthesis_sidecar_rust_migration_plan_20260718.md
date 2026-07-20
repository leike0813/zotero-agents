# Synthesis Sidecar Rust 迁移总计划

> 日期：2026-07-18  
> 状态：已批准的后续实施路线；Rust 尚未进入生产  
> 上游计划：`artifact/synthesis_sidecar_service_stage1_refactor_plan_20260715.md`  
> 转向依据：`artifact/synthesis_sidecar_stage1_ws5_self_review_20260718.md` 及五平台 Node prebuild 实测  
> 治理 change：`openspec/changes/pivot-synthesis-sidecar-runtime-to-rust/`

## 1. 决策摘要

Stage 1 的 WS0-WS5 已经建立了可迁移的边界：插件侧 `SynthesisClient`、Host ports、环境无关的 contracts/engine/application/repository、受监督的 Node service，以及尚未持有生产数据的 WS5 私有 shadow foundation。这些成果保留并作为跨语言迁移的行为与数据 oracle。

后续路线从“继续完成 Node WS6/WS7，再考虑 Rust”调整为“暂停 Node 生产化，直接在既有边界后实现 Rust parity，并只进行一次生产所有权切换”。原因不是局部构建问题，而是交付模型不成立：五个平台的 Node sidecar prebuild 合计约 `203,071,203` bytes；将其全部装入离线 universal XPI 会把插件推向约 200 MB，而安装后下载 Node runtime 同样不可接受。

本计划确立以下不可逆方向：

1. Node sidecar 冻结为迁移 oracle，不再新增 Node-only capability、生产 writer、正式 XPI 集成或长期发布机制。
2. Rust 是外部 sidecar 的唯一交付目标；插件内仍必须运行在 Zotero 环境中的 TypeScript 客户端、Host ports 与 UI 不迁移。
3. 生产数据库格式、canonical bytes/hash、RPC 可观察行为、所有权与 fail-closed 语义保持兼容。
4. Force layout 不追求逐坐标复刻 d3-force；通过显式 `layoutVersion: 2` 完成算法升级。
5. 迁移期不允许 Node/Rust 共享数据库、canonical root 或 write lease；运行时不提供逐请求 Node fallback。
6. Rust 切换后只允许兼容 Rust bundle 之间回滚，不支持降级回 Node manifest。
7. 压缩后的单平台 native runtime 不得超过 15 MiB，五平台总量不得超过 75 MiB，最终 XPI 不得超过 100 MiB。

这是一份迁移治理总计划，不是一次性大改的实施任务。每个工作流必须由独立 OpenSpec change 承载，并满足自己的 TDD 与退出条件后才能进入下一阶段。

## 2. 当前基线与迁移边界

### 2.1 已完成并保留的基础

- 插件业务调用已经收敛到严格 `SynthesisClient` seam。
- Zotero-only 能力通过 Host ports 与外部执行域隔离。
- contracts、engine、application、repository 已形成可单独构建与测试的包边界。
- Node service 已证明 HTTP/RPC、生命周期、worker 隔离和私有存储可以在插件外运行。
- WS5 已证明 sidecar 可以在独立 shadow roots 中初始化 repository、canonical store 与应用层而不触碰生产数据。
- durable writer、default client lifecycle 等已完成修补保持有效，不因语言迁移而回滚。

### 2.2 冻结但暂时保留的 Node 资产

在对应 Rust slice 通过验收前，下列 Node 资产保留为可执行 oracle：

- `apps/synthesis-service` 的 service、worker、HTTP、lifecycle 与 shadow foundation；
- `packages/synthesis-contracts`、`synthesis-engine`、`synthesis-application`、`synthesis-repository` 的可观察行为与测试语料；
- 五平台 Node prebuild 及其 manifest/fingerprint，仅用于迁移核验，不进入正式 XPI；
- Node worker 的超时、崩溃、熔断和重启行为测试；
- repository 与 canonical store 的故障恢复测试。

冻结的含义是“允许修复阻塞迁移基线复现的缺陷”，不包括新增领域功能、优化 Node 包体、扩展 Node 发布链或让 Node 获得生产所有权。

### 2.3 不在 Rust 迁移范围内的插件资产

- Zotero UI、Assistant Workspace、ACP/SkillRunner 面板；
- 插件内 `SynthesisClient` facade 与 Host ports；
- Zotero selection、item/PDF、prefs、notifier 等宿主能力；
- 非跨进程 DTO 与纯插件状态。

这些模块可以因 runtime manifest v2、launch/discovery/handshake 契约而做适配，但不能引入 Rust 或 Node runtime 到插件进程。

### 2.4 当前实现规模

迁移范围的 TypeScript 基线约 48,357 行：

| 区域 | 约计行数 | 迁移角色 |
| --- | ---: | --- |
| `apps/synthesis-service` | 7,145 | 最终删除的 Node service/worker oracle |
| `packages/synthesis-contracts` | 12,891 | 拆出跨语言 SSOT，插件 DTO 继续保留 TS |
| `packages/synthesis-application` | 10,081 | 按 capability 迁移至 Rust application |
| `packages/synthesis-repository` | 6,663 | 迁移 SQLite/canonical durable semantics |
| `packages/synthesis-engine` | 11,577 | 按确定性与风险分组迁移计算内核 |

当前公开 sidecar surface 有 8 个 capability：

- `system.handshake`
- `system.shutdown`
- `workbench.chrome.read`
- `topics.canonical.inspect`
- `citation.graph.layout`
- `citation.graph.metrics`
- `citation.graph.build`
- `citation.graph.build_transfer`

迁移期间不得仅按这 8 个入口估算工作量；每个入口背后还包含 wire validation、canonical semantics、worker isolation、repository transaction 与 lifecycle 行为。

## 3. 根因与设计约束

### 3.1 Node 不是可接受的最终交付单元

当前 bundle 将完整 Node runtime 与 JavaScript service tree 按平台重复打包。即使继续压缩 service tree，五份 Node runtime 仍主导包体。系统 Node 会破坏版本可控性与 Zotero 跨平台可复现性；安装后下载则引入网络可用性、供应链、离线安装和生命周期失败面。因此两种方案都不再作为备选。

### 3.2 不能把 TypeScript 隐式语义直接翻译为 Rust

下列 JavaScript 行为若不先显式化，会产生可持久化的跨语言漂移：

- `localeCompare` 的排序与 locale 差异；
- `Math.round`、负零、非有限浮点数；
- safe integer 与 SQLite integer 边界；
- `JSON.stringify` 的 key 顺序、escaping 与数字序列化；
- UTF-8、换行、canonical byte stream 与 SHA-256 输入；
- d3-force 的浮点迭代与初始条件。

因此跨语言 contract/schema/corpus 必须先于领域代码，且必须是 TypeScript 与 Rust 共同消费的唯一事实源。

### 3.3 worker 隔离是可靠性边界，不是 Node 遗产

CPU 内核若放在 Rust service 主进程线程中，超时只能停止等待，不能可靠终止死循环或卡住的 native 调用。目标架构继续使用可替换的子进程执行 bounded work。一个 native executable 可以同时提供 `serve` 与内部 `worker` mode，以保持单文件交付又保留 crash/hang 隔离。

### 3.4 production ownership 只能切换一次

当前生产数据库与 canonical ownership 尚未交给 Node sidecar。这正是转向成本最低的窗口。若先完成 Node WS7，再迁移 Rust，将重复做 writer 迁移、恢复审计和实机验收，并引入 Node-to-Rust 数据降级问题。本计划禁止这条路径。

## 4. 目标架构

```text
Zotero plugin (TypeScript)
  SynthesisClient / Host ports / UI
                |
        versioned HTTP/RPC + launch config
                |
native synthesis-sidecar executable
  serve mode
    protocol -> application -> repository/canonical
       |
       +-- bounded worker process (same executable, worker mode)
                |
        private or production roots
```

### 4.1 Rust workspace 建议布局

```text
native/synthesis-sidecar/
  Cargo.toml
  Cargo.lock
  crates/
    synthesis-protocol/      # schema binding、canonical JSON、errors
    synthesis-engine/        # pure/bounded kernels
    synthesis-repository/    # SQLite 与 canonical durable storage
    synthesis-application/   # use cases、ownership、transfer
    synthesis-sidecar/       # serve/worker executable、HTTP、lifecycle
```

布局以高内聚边界为目标，不逐文件镜像 TypeScript。若实测显示某个 crate 只有转发作用，应合并而不是为了“分层对称”保留。

### 4.2 依赖准入

初始 vertical slice 只预批准：

- `serde`
- `serde_json`
- `sha2`

HTTP runtime、SQLite binding、压缩/归档、签名或跨平台辅助 crate 必须在使用它们的独立 change 中同时给出：

- 必要性与替代方案；
- license 与供应链来源；
- `Cargo.lock` 可复现性；
- 五平台构建支持；
- stripped/compressed binary 增量；
- 安全与维护活跃度。

不得为了复刻 Node 内部结构引入重量级框架。

## 5. 契约与兼容性 SSOT

### 5.1 必须语言中立的契约

- sidecar capability request/result/error envelopes；
- system handshake、health、shutdown 与 transfer protocol；
- launch config、discovery record、runtime manifest v2；
- compute input/result DTO；
- repository schema identity 与 migration metadata；
- canonical artifact envelope、receipt 与 journal phase；
- bundle target、fingerprint、hash 与 provenance。

仅在插件内部流动的 Zotero DTO 不需要迁入该层。

### 5.2 contract 产物

首个实施 change 必须建立：

1. versioned schemas；
2. 正例与反例 corpus；
3. canonical serialization 规范；
4. TypeScript/Rust 双侧读取器；
5. schema/corpus fingerprint；
6. 一条阻止 `contracts -> repository` runtime 反向依赖的 boundary gate。

同一事实不能分别硬编码在 TypeScript 常量、Rust 常量和 release 脚本中。生成代码或共同读取 versioned data file 均可，选择由该 change 评审。

### 5.3 canonical corpus 必测边界

- UTF-8、多语言、组合字符与空字符串；
- LF/CRLF 输入归一规则；
- object key 排序、数组顺序与重复项；
- `i64`、JavaScript safe integer 边界和越界拒绝；
- `0`、`-0`、小数、舍入边界与非有限值拒绝；
- escaping、斜杠、控制字符；
- byte-for-byte JSON 与 SHA-256；
- 无效字段、未知版本、额外字段策略。

## 6. 工作流与退出条件

### R0：冻结 Node 与建立可复现基线

**目标**：让 oracle 可重复运行，同时阻止路线继续分叉。

**任务**：

- 发布本计划与 OpenSpec governance change；
- 在 Stage 1 与 WS5 自审中记录路线 supersession；
- 固定 Node service、worker、schema、prebuild 与测试 fingerprint；
- 建立“允许的 oracle 修复”与“禁止的 Node 新功能”审查规则；
- 记录五平台 Node prebuild 和 XPI 包体基线。

**退出条件**：活动文档不再把 Node WS6/WS7 或 Node XPI 描述为下一步；基线测试和 artifact 可按固定输入复现。

### R1：跨语言 schema 与 canonical semantics

**目标**：在写 Rust 领域实现前消除语言隐式语义。

**状态（2026-07-19）**：已完成。`packages/synthesis-contracts/contract-set/synthesis-cross-language-v1` 已冻结当前 v1 process boundary 的 Draft 2020-12 schema、positive/negative corpus、capability inventory 和可计算 fingerprint；canonical JSON/hash 与 repository foundation schema version 已归 contracts 所有。Node 仍是只读行为 oracle；后续 R2/R3 已在这套 contract set 上建立 Rust workspace、worker executable 与首个 Metrics slice。生产 owner 和 runtime bundle/pointer v1 尚未改变。

**TDD 顺序**：先用现有 TypeScript 行为生成经人工审查的 positive/negative gold corpus，再让 strict schema checker 与 TypeScript validator 对 corpus 全绿。任何 Rust slice 必须先消费这套 contract set，并在取得 byte/hash 等价后才能成为该 DTO 的实现。

**退出条件**：

- 所有跨进程 DTO 有版本化 SSOT；
- TypeScript oracle 对 corpus 的接受/拒绝、canonical bytes 和 hashes 全部通过，Rust 首次消费时必须复用同一 corpus；
- `synthesis-contracts` 不再 runtime import repository schema constant；
- CI 能阻断 schema、inventory、corpus、canonical bytes/hash 或 dependency direction 漂移。

### R2：Rust workspace、worker framing 与五平台 CI

**目标**：用最小 executable 验证工具链、协议骨架、worker 进程与真实包体。

**任务**：

- 建立 Cargo workspace、locked toolchain 与 reproducible profiles；
- 实现 `serve`/`worker` mode 的最小 framing；
- 验证 spawn、deadline、cancel、crash、hang kill、respawn 和 degraded fuse；
- 生成 macOS x64/arm64、Windows x64、Linux x64/arm64 五目标 prebuild；
- 记录 stripped 与 compressed size、SBOM/provenance 和 hashes。

**退出条件**：五平台都能运行最小 handshake/worker canary；单平台 runtime 低于 15 MiB，若最小骨架已超预算则立即停止扩展并重新评审依赖/架构。

**状态（2026-07-19）**：已随 R3 完成。固定工具链、workspace、worker framing、五平台 candidate workflow、provenance 与压缩包体门禁均已有真实 Metrics consumer。

### R3：Citation Graph metrics 首个 vertical slice

**目标**：用最小、确定、已生产路由的 capability 贯通协议、worker、engine、HTTP 与插件调用。

**状态（2026-07-19）**：已完成并归档。Metrics 是共享 Rust worker、compute pool、deadline/cancel/replacement/fuse 与五平台 packaging 的首个真实 vertical slice。

**TDD 顺序**：固定输入/输出/hash corpus → Node oracle 输出 → Rust engine → Rust worker → Rust HTTP → 插件 candidate route。

**退出条件**：

- observable result 与 hash parity 全绿；
- timeout/cancel/crash/fuse 行为满足现有契约；
- test-only 可双跑，但活动 candidate route 只有 Rust 实现且无逐请求 fallback；
- 接受 slice 后删除被替代的 active TypeScript metrics compute path，保留必要 fixture/oracle 数据。

### R4：确定性 engine kernels

**范围**：Tag Vocabulary、Concept KB index/query、Topic Graph index。

**策略**：每个 kernel 单独迁移；优先复用 R1 canonicalizer 与 R2 worker，不复制 parser、hash 或错误映射。

**状态（2026-07-20）**：已完成并归档。三个领域 crate、五个 Rust operation、共享 child transport 和 bounded paged worker protocol 已通过本地与五平台门禁；private sidecar 不保留这些 operation 的 Node compute branch，TypeScript engines 继续作为 production plugin 实现和 differential oracle。

**退出条件**：每个 capability 的 schema、gold corpus、property/invariant、性能与 worker 故障测试通过，并完成对应 TypeScript compute 删除。Topic Graph 的 source/build Worker parity 必须保持，不允许源树 `.js` shim。

### R5：复杂 engine 与 build/transfer

**范围**：Reference Matcher、Topic Structured Artifact、Citation Graph build、packed encoding、transfer execution。

**关键门槛**：

- reference matching 使用已清洗 benchmark，报告 precision/recall/candidate recall/danger false positives；
- packed encoding 与 transfer 必须 byte/hash/length 等价；
- large payload 不退化为无界 JSON copy；
- cancel/backpressure/partial transfer 不产生可见半成品。

**状态（2026-07-20）**：已完成，change `migrate-synthesis-complex-kernels-and-transfer-to-rust` 可归档但尚未归档。Reference Matcher、Topic Structured Artifact 与 Citation Graph build 三个领域 crate及八个 operation 已接入同一个 Rust child；private Node Worker 仅保留 R6 layout。Matcher reviewed fixture 六套策略均保持 precision/recall/candidate recall，danger false positives 为零。最终三次最大代表性 matcher profile 分别为 2.45/2.47/2.57 秒、峰值约 128.3 MiB；Topic 为 1.20/1.11/1.17 秒、约 74.0 MiB；graph normal `2,000/100,000` 为 10.47/10.03/10.41 秒、约 157.6 MiB，均满足 deadline 与 256 MiB 门禁。五平台 candidate smoke、单平台 15 MiB 与聚合 75 MiB 门禁均通过。生产 DB、canonical files、Host effects 与 `SynthesisClient` 所有权不变；R6–R9 尚未开始。

**退出条件**：领域 benchmark、传输完整性、内存峰值、超时/取消和删除旧实现均完成。

### R6：Citation Graph layout v2

**目标**：消除 runtime D3 依赖而不承诺不可控的 d3-force 逐坐标兼容。

**决策**：radial/components 尽量保留稳定语义；force 明确升级到 `layoutVersion: 2`，制定 Rust-owned algorithm、质量阈值、性能阈值与新 gold results。v1 layout cache 视为可重建数据，不改写 canonical source。

**退出条件**：所有 consumer 能识别 v2；旧 cache 有清晰 invalidation/rebuild；D3 runtime 及其 XPI inventory gate 可删除；不存在隐式 v1/v2 混读。

### R7：repository、canonical store 与 application parity

**目标**：在隔离 roots 中复刻 durable semantics，而非复刻 Node 类结构。

**SQLite 必须保持**：schema identity、WAL、`synchronous=NORMAL`、foreign keys、busy timeout 250 ms、`BEGIN IMMEDIATE`、savepoint、safe integer 与 row normalization。

**canonical store 必须保持**：CAS、exclusive staging、file/directory fsync、atomic promotion、journal phase、backup/forward recovery、durable import receipt。

**退出条件**：

- 五平台运行 crash/restart、锁竞争、事务回滚和每个 journal phase 的 fault injection；
- Node/Rust 使用独立 shadow roots，仅比较结果，不共享 live owner；
- application invariants、workbench read 与 canonical inspect parity 全绿；
- 任何差异都有显式 schema/version 决策，不以兼容分支掩盖。

### R8：native service、lifecycle 与 manifest v2

**目标**：让插件只认识 native executable，而不认识 Node runtime 结构。

**任务**：

- 以 native manifest v2 替换 `nodeVersion`、upstream Node archive、Node executable 与 JavaScript `entrypoint`；
- installer snapshot 暴露 `executablePath`；
- supervisor 执行 `<binary> serve --config <path>`；
- launch/discovery/health/handshake 标识 implementation、protocol、service、build fingerprint 和 platform signature；
- 保持 active/previous、quarantine、freshness、signature 与 fail-closed 语义；
- 为 Rust worker drain、shutdown、orphan cleanup 和 restart accounting 建立 parity。

**退出条件**：candidate native bundle 在不触碰生产 roots 的情况下通过插件集成、生命周期、升级/回滚、损坏/过期/错平台拒绝测试。

### R9：生产切换、删除 Node 与实机验收

**目标**：一次完成 Rust production ownership 与 Node 删除，避免双栈长期存在。

**切换前硬门槛**：

- R1-R8 全部完成；
- 五平台 native bundle 新鲜、签名、fingerprint、SBOM 与 provenance 合格；
- 单平台 ≤15 MiB、五平台总量 ≤75 MiB、最终 XPI ≤100 MiB；
- clean profile、upgrade profile、corrupt bundle、crash recovery、offline install 实机矩阵通过；
- 数据备份、迁移前检查、失败恢复和 operator runbook 已演练。

**同一里程碑删除**：

- `apps/synthesis-service` Node implementation；
- Node-specific manifest、download/prebuild workflow 与 release assets；
- JavaScript worker pool/protocol；
- D3 runtime package copy 与相关 XPI inventory；
- Node-only build scripts、依赖与 implementation-detail tests；
- 插件内被 native client 完全替代的旧 in-process Synthesis implementation。

**退出条件**：生产 owner 唯一指向 Rust；XPI 不含 Node/npm/JS service/D3 runtime；旧 Node 入口不能被配置重新启用；实机 smoke、数据恢复和 release gate 全绿。

## 7. 所有权与双实现规则

| 阶段 | 生产 owner | Node | Rust | 允许共享 live roots |
| --- | --- | --- | --- | --- |
| R0-R6 | 现有插件实现 | oracle | isolated candidate | 否 |
| R7-R8 | 现有插件实现 | oracle | full isolated shadow | 否 |
| R9 cutover | 原 owner，直到原子切换 | 待删除 | candidate | 否 |
| R9 完成后 | Rust sidecar | 已删除 | active/previous native bundles | 不适用 |

允许的双执行仅存在于测试 harness，并使用相同只读 fixture 或独立复制的数据根。不得在用户请求路径上“Rust 失败则回 Node”，也不得让 Node/Rust 竞争同一个 writer lease。

## 8. 测试与验证策略

### 8.1 分层测试

- **Contract**：schema/corpus、错误分类、canonical bytes/hash。
- **Engine**：gold fixtures、property/invariant、benchmark、bounded resource。
- **Worker**：framing、deadline、cancel、hang kill、crash、respawn、fuse。
- **Repository**：transaction、locking、restart、fault injection、cross-platform filesystem。
- **Service**：HTTP/RPC、health、handshake、shutdown、transfer、backpressure。
- **Plugin integration**：installer、supervisor、client routing、fail-closed、owner switching。
- **Packaging**：target identity、hash/signature、freshness、inventory、size、offline install。

### 8.2 differential harness 原则

- 输入 fixture 固定且经过脱敏/人工审查；
- 比较公开 DTO、canonical bytes/hash、数据库状态和可观察错误类别；
- 不锁定 Node 私有类、调用顺序、日志全文或临时 worker 消息；
- 浮点必须按契约选择 exact、ULP/tolerance 或 versioned result，不能临时放宽；
- Node oracle 与 Rust candidate 的工具链/fingerprint 写入报告；
- 接受一个 slice 后，将测试 SSOT 转移到语言中立 corpus，不能永久依赖执行 Node 才能判断 Rust 正确性。

### 8.3 五平台矩阵

- macOS x64
- macOS arm64
- Windows x64
- Linux x64
- Linux arm64

R2 起每个 prebuild 必须构建；R7 起 repository/canonical fault tests 必须在五平台执行；R9 前每个平台至少一次 clean-machine Zotero 实机测试。

## 9. 包体、性能与供应链门槛

### 9.1 硬包体预算

| 工件 | 压缩后硬上限 |
| --- | ---: |
| 每个 target native runtime | 15 MiB |
| 五 target runtime 合计 | 75 MiB |
| 最终 universal XPI | 100 MiB |

CI 必须同时报告未压缩、stripped 与最终归档大小，并显示相对上一基线的增量。超过任何硬上限直接失败，不以“后续再优化”放行。预算如需调整，必须由独立 change 说明用户价值与替代方案，不能在实现 PR 中顺手放宽。

### 9.2 性能门槛

- handshake 与 first request 不得因 cold worker 启动产生不可接受回退；
- engine capability 分别记录 p50/p95、峰值 RSS 与 output size；
- large build/transfer 必须有有界内存与取消行为；
- repository/canonical durability 不得为追求 benchmark 关闭 fsync/事务语义。

精确阈值由各 capability change 基于现有 Node/插件基线制定；R9 汇总为实机 acceptance budget。

### 9.3 provenance 与安全

- pin Rust toolchain 与 `Cargo.lock`；
- 每个 binary 记录源码 commit、target、toolchain、lock hash、feature set；
- 生成 per-file SHA-256、SBOM 和平台签名；
- release 只接受 CI 生成且 fingerprint 匹配的 prebuild；
- XPI assembly 不从开发机或缓存目录捡取未登记 binary。

## 10. runtime manifest v2 草案边界

manifest v2 至少表达：

- `implementation: "rust-native"`；
- manifest、protocol 与 service 版本；
- target triple 与 platform signature；
- executable relative path；
- build fingerprint、toolchain 与 lock provenance；
- files、sizes 与 SHA-256；
- capability inventory；
- created/expiry policy；
- signature metadata。

不得再包含 Node upstream archive、`nodeVersion`、Node executable 或 JavaScript entrypoint。字段的最终 schema、升级与 active/previous 规则由 R8 change 决定。

## 11. 回滚与恢复

### 11.1 迁移期间

生产 owner 仍是现有实现，Rust 使用隔离 roots。发现问题时禁用 candidate 即可，不需要回滚数据，也不允许 Rust 触碰 production root 后再声称“shadow”。

### 11.2 native cutover 后

- active/previous 只指向 manifest v2 的兼容 Rust bundles；
- schema migration 必须有 preflight、备份和 forward recovery；
- canonical promotion 保持 journal/backup/recovery；
- 不允许把 Node bundle 作为 previous；
- 若无法在兼容 Rust bundle 内恢复，进入 fail-closed/operator recovery，而不是静默切回 Node。

## 12. OpenSpec 实施序列

建议按以下独立 change 推进，名称可在创建时微调但边界不得合并成一个巨型 change：

1. `define-synthesis-cross-language-canonical-semantics`
2. `introduce-synthesis-rust-sidecar-metrics-vertical-slice`
3. `migrate-synthesis-deterministic-kernels-to-rust`
4. `migrate-synthesis-complex-kernels-and-transfer-to-rust`
5. `introduce-synthesis-citation-layout-v2`
6. `migrate-synthesis-durable-foundation-to-rust`
7. `introduce-synthesis-native-runtime-manifest-v2`
8. `cut-over-synthesis-production-owner-to-rust`
9. `remove-synthesis-node-runtime-and-legacy-implementation`

第 8、9 项可以在同一 release milestone 中执行，但 spec、验证证据与删除 inventory 必须分别可审计。若 cutover change 未删除 runtime fallback，则不得宣告完成。

## 13. 预计文件影响

### 13.1 新增

- `native/synthesis-sidecar/**`
- language-neutral schemas/corpora 目录（由 R1 确定）
- Rust build/test/release workflows 与 artifact manifests
- 五平台 native fault/real-machine evidence

### 13.2 逐步修改

- `packages/synthesis-contracts/**`
- `packages/synthesis-engine/**`
- `packages/synthesis-application/**`
- `packages/synthesis-repository/**`
- 插件 sidecar installer/supervisor/client/launch/discovery 相关模块
- XPI inventory、release、prebuild freshness 与实机测试脚本
- `doc/synthesis-layer/**` 与相关 artifact

### 13.3 最终删除

- `apps/synthesis-service/**`
- Node runtime bundle/prebuild/download 资产与 scripts
- JavaScript worker 实现
- runtime D3 copies
- 已被 Rust 替代且不再作为 fixture 所需的 TypeScript compute/repository/application 实现

删除必须基于 `rg`/inventory/callers/build graph 审计，不能仅删除顶层入口后留下死包、依赖或 release 分支。

## 14. 停止条件

命中以下任一条件时停止向后推进，先建立独立决策或修复 change：

- R1 无法获得跨语言 canonical bytes/hash 一致性；
- 最小 Rust 骨架已超过单平台 15 MiB；
- 新依赖不支持五平台、license 不可接受或 provenance 不可复现；
- 某 slice 只能靠 production runtime Node fallback 才能工作；
- Node/Rust 需要共享 writer、database 或 canonical root 才能比较；
- worker hang 无法被主 service 可靠终止与隔离；
- repository/canonical fault injection 在任一目标平台不稳定；
- Force layout 无法在 versioned v2 契约内给出可接受质量/性能；
- cutover 需要保留 Node production bundle 作为长期回滚。

停止不等于恢复 Node 路线；它意味着重新评审 Rust slice、契约或交付边界。

## 15. Definition of Done

本轮 Rust 迁移只有同时满足以下条件才算完成：

- 五平台交付单一 native executable，不依赖 Node、npm、系统 runtime 或安装后下载；
- 最终 XPI 与各 target runtime 满足硬包体预算；
- 公开 capability、wire errors、canonical bytes/hash、数据库与 durable recovery 满足已批准兼容契约；
- Force layout 通过显式 v2 契约完成迁移；
- bounded CPU work 运行在可替换 worker process，超时/崩溃不会拖死 service；
- production database/canonical owner 唯一属于 Rust sidecar；
- clean install、upgrade、offline、损坏 bundle、crash recovery 五平台实机矩阵通过；
- Node service/runtime/worker/D3 runtime、旧 release workflow 与过时插件内实现已经删除；
- active docs、OpenSpec、build inventory 与真实代码一致；
- 仅保留兼容 Rust bundle 之间的回滚路径，不存在隐藏 Node fallback。

在这些条件满足前，应使用“Rust 迁移进行中”，不得描述为“WS5 后 Node sidecar 已可进入正式实机交付”或“Rust sidecar 已完成”。
