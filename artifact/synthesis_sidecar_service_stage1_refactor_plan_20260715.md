# Stage 1 Detailed Refactor Plan: Synthesis Sidecar Service

> 状态：实施中；`Stage 1 / WS5 — Private Isolated Synthesis Foundation Complete` 已完成；2026-07-18 起暂停原 Node WS6/WS7 路线，下一阶段改为 Rust parity 与 native cutover；这不表示 Rust 实现、生产切换、生产就绪或真实机器验收已经完成
>
> 日期：2026-07-15
>
> 上位规划：`artifact/long_horizon_refactor_plan_20260715.md`
>
> 范围：仅限第一阶段——把 Synthesis 应用用例、重计算、持久化和 canonical topic file store 移入独立本地服务

## 1. 执行摘要

第一阶段原计划将现有插件内 Synthesis runtime 改造成一个同仓库、独立构建、独立进程的 TypeScript/Node 服务。WS0-WS5 已按该路线建立迁移 seam 与可执行 Node oracle；由于五平台 Node prebuild 的实测包体不满足产品交付约束，最终 sidecar 目标已于 2026-07-18 转为同仓库、独立构建、独立进程的 Rust native service。

完成后：

- Synthesis Service 独占 `synthesis.db`；
- Synthesis Service 独占 Topic canonical current files；
- Zotero 插件不再执行 Synthesis graph、matching、layout、index/rebuild 等领域计算；
- Zotero 插件只保留 typed client、服务生命周期、Workbench bridge、Host Bridge/MCP proxy 和 Zotero Host Adapter；
- Topic canonical 文件是真源，Zotero note shards 是 mirror；
- Synthesis Service 不直接读取 Zotero DB，也不导入 `Zotero`、`addon` 或插件 toolkit；
- 插件和未来 Electron shell 使用同一套 service/host contracts；
- 正式 XPI 只分发匹配平台的 native Rust executable，不包含 Node，也不在安装后下载 runtime；
- Rust service 主进程只负责协议、operation、SQLite 和 canonical commit，重计算进入可替换的独立 worker 进程；
- Node service 冻结为迁移 oracle，不获得 production DB、canonical files 或 Zotero effects 的所有权；
- 生产状态不存在 DB 双写、文件双写或自动 in-process fallback。

本阶段采用“先建立 client/port seam 与 Node 可执行 oracle；再建立语言中立 contract/corpus 并按 capability 迁移到 Rust；最后只向 Rust 原子切换 single writer”的迁移方式。详细后续路线见 `artifact/synthesis_sidecar_rust_migration_plan_20260718.md`。

### 1.1 2026-07-18 Rust 路线转向（后续实施的优先规则）

本节与 `artifact/synthesis_sidecar_rust_migration_plan_20260718.md` 是 WS5 之后的实施 SSOT。本文其余章节继续保留 WS0-WS5 的历史目标、决策与验证证据；若旧章节仍把 Node WS6/WS7、Node universal XPI、安装后 Node runtime 或“Rust 仅为 benchmark fallback”描述为后续路线，以本节和 Rust 迁移总计划为准。

- 五平台 Node prebuild 已验证可构建，但合计约 `203,071,203` bytes，尚未同步进 XPI，也不再作为正式交付目标。
- 原 WS6 改为跨语言 contract、Rust engine parity、独立 worker process 与五平台 native canary。
- 原 WS7 改为 Rust repository/canonical/application parity、native service/lifecycle/manifest v2，以及一次性 production single-writer cutover。
- 原 WS8 扩展为同时删除插件内旧 implementation 与 Node service/runtime/worker/D3 runtime。
- 原 WS9 改为 Rust native build、签名、provenance、包体预算、XPI inventory 与五平台实机验收。
- Node/Rust 只能在测试 harness 中对隔离数据双执行；production route 无逐请求 fallback，也不共享 live DB/canonical root/write lease。
- production DB 格式与 canonical bytes/hash 保持兼容；Force layout 通过显式 `layoutVersion: 2` 迁移。
- native runtime 压缩后每平台不超过 15 MiB、五平台合计不超过 75 MiB、最终 XPI 不超过 100 MiB。
- Rust cutover 后 active/previous 只允许兼容 Rust bundle，不支持回滚至 Node。

## 2. 已确认决策

| ID | 决策 | 状态 |
| --- | --- | --- |
| S1-D001 | 第一阶段最终由后端独占 Synthesis DB 和应用用例，不止转移 CPU 计算 | 已确认 |
| S1-D002 | Topic canonical 文件是真源，Zotero note mirror 不是 canonical | 已确认 |
| S1-D003 | TypeScript/Node、同仓库、插件托管、per-profile sidecar | 已完成的 WS0-WS5 历史路线；最终 runtime 被 S1-D014 取代 |
| S1-D004 | Synthesis Service 是领域服务，不是 agent provider | 已确认 |
| S1-D005 | service 与 plugin 不共享 `synthesis.db` 写入权 | 已确认 |
| S1-D006 | 本地通信优先采用 loopback HTTP/JSON；进度使用 SSE，必要时保留 polling | 规划决策 |
| S1-D007 | 插件通过受限 Host Capability API 提供 Zotero 访问，不允许 service 直接读 Zotero DB | 规划决策 |
| S1-D008 | 切换后不保留自动 in-process fallback；发布 rollback 必须先停止 service 并恢复单一所有者 | 规划决策 |
| S1-D009 | service 只按 profile 共享，不在第一阶段实现跨 profile daemon | 规划决策 |
| S1-D010 | Node runtime 作为插件资产直接分发和管理，用户无需安装 Node，launcher 禁止查询系统 PATH | Node oracle 已实现；正式交付被 S1-D014/S1-D019 取代 |
| S1-D011 | Node 主进程是控制面、DB/file 单一写入者；CPU 密集任务必须进入有界 worker pool | 隔离模型保留，控制面实现改为 Rust |
| S1-D012 | Rust 只由 normal/target/stress benchmark 驱动，用于替换纯计算 kernel，不拥有 DB、canonical files 或 Zotero effects | 被 S1-D014-S1-D018 取代 |
| S1-D013 | Synthesis supervisor 必须提供 owner lock、ready/health 分离、parent lease、有限重启和 crash-loop 熔断，不能只复制无状态 ACP Bridge 的 best-effort 生命周期 | 已确认 |
| S1-D014 | Rust native service 是唯一正式 sidecar 交付目标；Node 只作为迁移 oracle | 已确认 |
| S1-D015 | WS6/WS7 之前冻结 Node capability、生产 writer 与正式 XPI 集成 | 已确认 |
| S1-D016 | 先建立 versioned language-neutral schema/corpus/canonical semantics，再迁移领域实现 | 已确认 |
| S1-D017 | bounded CPU work 保持独立、可终止、可替换的 Rust worker process | 已确认 |
| S1-D018 | production DB/canonical semantics 保持兼容；Force layout 显式升级为 layout v2 | 已确认 |
| S1-D019 | native runtime 每平台 ≤15 MiB、五平台 ≤75 MiB、最终 XPI ≤100 MiB | 已确认 |
| S1-D020 | native cutover 后仅支持 Rust-to-Rust rollback，不支持 Node downgrade | 已确认 |

如果平台 spike 证明 SSE 或 loopback HTTP 在目标 Zotero 平台不可行，可以在不改变 DTO/用例语义的前提下替换 transport；不得因此退回共享 service object。

## 3. 范围

### 3.1 包含

- Synthesis contracts；
- Synthesis typed client；
- plugin in-process adapter（仅迁移期）；
- Zotero Host Capability contracts 和 adapter；
- 纯 Synthesis engine；
- product-owned Rust native runtime、独立 compute worker process、health、auth、discovery、supervisor lifecycle；Node 对应实现仅作为冻结 oracle；
- Synthesis application use cases；
- Synthesis repository 和 schema ownership；
- Topic canonical file ownership；
- operation、cache basis、review decision、sync state；
- Workbench chrome/surface query；
- workflow apply；
- Host Bridge/MCP proxy；
- 数据迁移、shadow verification、cutover、rollback；
- 相关测试、active docs、OpenSpec specs 和 release/build 流程。

### 3.2 不包含

- 全项目 `src/modules` 重排；
- hooks 全面瘦身；
- ACP、SkillRunner、workflow runtime 的全面重构；
- Assistant Workspace transcript/rendering 改造；
- Synthesis Workbench 前端大重写；
- Electron 应用开发；
- 一次性逐文件翻译全部 TypeScript，或在没有语言中立契约与分阶段退出门禁时进行巨型 Rust 重写；
- 依赖用户安装的 Node、npm、系统 PATH 或用户 shell 配置；
- 跨设备常驻 Synthesis daemon；
- 直接读取 Zotero SQLite；
- 自动整库同步、dirty event fan-out 或通用 worker queue；
- 为迁移保留永久兼容 API。

## 4. 当前状态与根因

### 4.1 主要热点

| 文件 | 现状 |
| --- | --- |
| `src/modules/synthesis/service.ts` | 约 21,265 行；`createSynthesisService()` 返回近百个方法；直接依赖 handlers、runtime persistence、logging、Host Bridge file registry、plugin state、SQLite、sync、UI model 和多个领域算法 |
| `src/modules/synthesis/repository.ts` | 约 9,329 行；schema、record types、queries、commands 和 reset 集中；默认通过插件 `guardedSqlite` 打开 DB |
| `src/modules/synthesis/libraryAdapter.ts` | 已有 `SynthesisLibraryAdapter` 雏形，但直接导入 Zotero host modules，并包含整库数组式方法 |
| `src/modules/synthesis/uiModel.ts` | 多 surface DTO 和 projection 构造集中 |
| `src/modules/synthesisWorkbenchTab.ts` | Workbench command 与 `getDefaultSynthesisService()` 直接耦合 |
| `src/workflows/hostApi.ts` | workflow hooks 直接获得插件内 service |
| `src/modules/hostBridgeCapabilityRegistry.ts` | capability handler 直接获得插件内 service |
| `src/modules/zoteroMcpProtocol.ts` | MCP adapter 直接获得插件内 service |
| `src/hooks.ts` | 启动和偏好事件直接调用 Synthesis service |

### 4.2 当前可复用的 seam

现有代码并非全部推倒。以下抽象可以作为迁移起点，但需要收窄和环境中立化：

- `SynthesisLibraryAdapter`：改造成分页、hash-first 的 `HostLibraryPort`；
- `SynthesisMirrorAdapter`：改造成 command/receipt 形式的 `HostMirrorPort`；
- `RelatedItemsSyncHost`：改造成受控 external-effect port；
- `SqlAdapter`：保留 repository port 思路，但 Node adapter 归 service；
- `SynthesisMcpServiceContext`：可作为只读 capability 分组参考，不能直接作为完整远程 API；
- surface-scoped Workbench input：保留 chrome/surface 分离；
- `synt_operation` 与 `synt_cache_basis`：继续分别承担操作状态和数据 readiness。

### 4.3 现有 Rust ACP Bridge 可复用与不可复用部分

当前 Rust ACP WebSocket Bridge 是仅用于 Windows 的无状态传输/子进程适配器，不是 Synthesis 领域服务。它可以证明 Zotero 能通过 Mozilla Subprocess 启动随插件分发的原生资产，但不能证明一个持有 SQLite、canonical files 和 durable operations 的服务已经具备完整生命周期。

可复用思路：

- 包内二进制提取到 runtime root；
- singleton launch promise；
- localhost 随机端口和随机 token；
- ready file 和启动超时；
- `proc.wait()` 感知退出；
- shutdown step timeout 和进程终止。

必须强化：

- 当前 SHA/versioned path 思路升级为包内资产和已解压 runtime 的真实哈希/签名验证；
- 从 ready file 扩展为 ready/health/schema/profile 分层门禁；
- 增加 profile owner lock、instance nonce、parent/host lease 和 stale discovery 清理；
- 增加有限退避重启和 crash-loop 熔断；
- 增加 DB/canonical recovery 和 worker drain；
- 建立 Windows、macOS、Linux 及目标 CPU 架构的完整发布矩阵。

### 4.4 根因

根因是 composition、领域编排、基础设施和宿主访问共处一个对象。若直接把 `service.ts` 搬进 Node：

- Node 无法使用 Zotero APIs 和插件 runtime；
- remote facade 仍有近百个方法；
- 数据传输会倾向整库 JSON；
- service/plugin 会争夺 DB 和文件；
- Host Bridge/MCP/UI 会同时依赖一个不稳定大协议；
- 未来 Electron 仍无法替换 Zotero host。

因此第一步必须建立 contracts 和 ports，而不是移动实现文件。

## 5. 目标进程拓扑

```text
Zotero process / profile P

  Workbench Browser UI
          |
          | host messages
          v
  Plugin Synthesis Bridge
          |
          | SynthesisClient
          | loopback HTTP + auth token
          v
  Synthesis Service process P
    - protocol server
    - application use cases
    - repository
    - operation manager
    - canonical topic file store
    - sync/import/export
    - compute scheduler
          |
          | pure DTO + cancel/budget
          v
    Bounded Worker Pool
      - graph build / metrics / layout
      - reference matcher
      - tag / concept / topic graph index
      - TypeScript workers by default
      - optional benchmark-approved Rust kernel later
          |
          | bounded Host Capability RPC
          | separate scoped credential
          v
  Plugin Zotero Host Adapter
    - item/note/attachment reads
    - artifact payload reads
    - Zotero mirror writes
    - related-item writes
    - permission and receipts
```

### 5.1 Profile ownership

- 一个 Zotero profile 对应一个 service owner scope；
- discovery record 包含 profile identity、service instance id、port、protocol version 和 token locator；
- service data root 由启动参数提供，不能由普通 API 任意指定；
- 同 profile 第二个 service 启动必须因 owner lock 失败；
- library id 仍是每个 command/query 的显式 scope；
- 第一阶段不支持一个 daemon 同时打开多个 profile 的数据。

### 5.2 启动

1. 插件完成 Zotero 必需初始化；
2. 非阻塞地进入 `starting` 状态，不等待整库扫描或 surface warmup；
3. service lifecycle manager 检查 discovery/owner lock；
4. 从插件资产解析匹配平台/架构的 product-owned runtime，验证真实哈希/签名并选择原子 active version；
5. 直接执行受控 runtime 路径，禁止 PATH search；
6. 等待 ready，然后完成 health/capability/protocol/schema/profile handshake；
7. 初始化有界 worker pool，但不执行 warmup/rebuild；
8. 发布 `ready`、`unavailable` 或 `incompatible`；
9. Workbench 仅请求当前可见 surface。

插件 startup 不得因为 service 启动慢而阻塞 Zotero 主窗口。

### 5.3 关闭与崩溃

- 正常插件关闭：停止接收新操作，给当前 operation 一个有界 checkpoint/cancel 窗口，然后关闭 service；
- 插件崩溃：service 通过 host lease/parent process 监测进入 host unavailable；不得继续发起 Zotero writes；
- service 崩溃：插件显示 unavailable，旧 cache/canonical files 不由插件直接读取作为 fallback；
- worker 卡死或崩溃：主进程终止/替换该 worker，将当前 phase 标记失败或取消，previous projection 保持可读；
- worker 不得拥有 DB/file/Host effect，因此 worker crash 不能留下半提交生产状态；
- service 重启：检查 DB/canonical root，处理上次残留 `running` operation，将其标记为 canceled/interrupted diagnostic，除非某个用例明确支持受控 continuation；
- supervisor 只允许有限、退避的自动重启；超过阈值进入 crash-loop fused/unavailable，等待明确恢复动作；
- stdout/stderr 必须持续排空，防止子进程因管道阻塞；
- unhandled exception/rejection 采用 fail-fast，由 supervisor 恢复，不能维持半失效进程；
- shutdown 顺序为停止 mutation、完成短事务、checkpoint/cancel workers、authenticated shutdown、超时 terminate、最终清理进程树；
- 不恢复全局 queue drain；
- window reload 或 Workbench tab 重建不能被视为 profile/service 重启。

## 6. 数据所有权

### 6.1 真源矩阵

| 数据 | 真源/所有者 | service 行为 | plugin 行为 |
| --- | --- | --- | --- |
| Zotero item、metadata、tags、collections、relations | Zotero Library | 通过 host port 按需读；不得复制为独立 library truth | 唯一 Zotero API adapter |
| digest/reference/citation-analysis workflow artifacts | Zotero note/attachment 或明确 artifact file | 保存 locator/hash/派生 reference rows | 读取和提供 payload |
| Topic `current/**` canonical files | Synthesis Service canonical file store | 唯一写入者；validate/stage/promote/read | 不直接读写 canonical files |
| Zotero Topic mirror shards | Zotero Library mirror | 生成 mirror plan、记录结果和 diagnostic | 执行 mirror effects 并返回 receipt |
| Synthesis cache projection | `synthesis.db` | 唯一读写者 | 不打开 DB |
| binding/dedupe/review decisions | `synthesis.db` durable facts | 保留 provenance 和 review semantics | 仅传递用户 command |
| operation progress | `synt_operation` | 唯一状态源 | 读取 DTO，不建立第二套状态 |
| cache readiness | `synt_cache_basis` | 唯一 readiness 源 | 读取 DTO，不从 operation 推断 |
| Workbench local selection/drawer state | plugin/UI | 不持久化为领域事实 | UI owner |
| service discovery/session token | profile runtime area | 进程启动/握手使用 | lifecycle manager 管理 |

### 6.2 Topic apply commit 顺序

Topic canonical 文件是真源，apply 采用以下顺序：

1. service 验证 result bundle、base/read-set 和 schema；
2. 在 service-owned staging root 生成完整 candidate；
3. 校验 manifest、sections、hash、metadata 和 path scope；
4. 原子 promote candidate 为 `current/**`；
5. 更新 DB 中的 topic metadata、operation 和派生 sidecars；
6. 生成 Zotero mirror effect plan；
7. plugin host adapter 执行 mirror writes；
8. service 保存 receipt 或 mirror warning。

约束：

- canonical promote 成功后，mirror 失败不得回滚 canonical files；
- mirror 失败返回 success-with-warning/diagnostic，而不是伪装完全成功；
- canonical promote 前的失败不得更新 current；
- update patch 继续使用 section read-set optimistic checks；
- plugin 不自行组装 canonical files；
- candidate workspace 可在冲突或失败时按受控策略保留。

### 6.3 Digest apply 失败语义

digest/reference artifacts 的真源在 Zotero。若 artifact apply 已成功而 Synthesis Service 不可用：

- artifact apply 本身不因 cache sidecar 不可用而回滚；
- 返回 bounded warning；
- 不建立隐式整库 dirty queue；
- 后续由显式 reference sidecar refresh 修复；
- 如果引入精确 delivery outbox，它只能保存已提交的单条 apply receipt，不能演化为整库同步队列；是否需要 outbox 应在对应 OpenSpec change 中单独论证。

Topic apply 不同：canonical files 由 service 持有，因此 service unavailable 时必须明确失败并保留 workflow candidate，不能声称已提交。

### 6.4 单一写入者门禁

在生产 cutover 前后都必须满足：

- plugin 和 service 不能同时打开 production `synthesis.db` 进行写入；
- plugin 和 service 不能同时写 production Topic canonical root；
- shadow DB/root 使用独立目录、独立 owner id，并禁止对 Zotero 写；
- 切换后禁止自动 fallback 到 in-process implementation；
- rollback 前必须先停止 service、验证 owner lock 释放，再恢复旧版本和备份。

## 7. 代码和 package 边界

以下为目标目录意图，具体命名可在 OpenSpec design 中调整，但依赖方向不可反转。

```text
packages/
  synthesis-contracts/
    src/
      protocol/
      system/
      workbench/
      operations/
      workflow-apply/
      topics/
      references/
      graph/
      knowledge/
      sync/
      host-capabilities/

  synthesis-engine/
    src/
      graph/
      reference-matching/
      tag-vocabulary/
      concept-kb/
      topic-graph/
      topic-artifact/

apps/
  synthesis-service/
    src/
      server/
      supervisor/
      workers/
      application/
      domain/
      ports/
      infrastructure/
        sqlite/
        files/
        host-client/
        sync/
      composition/

src/
  modules/
    synthesisClient/
    synthesisServiceRuntime/
    synthesisHostAdapter/
    synthesisWorkbenchTab.ts
  workflows/
    hostApi.ts
```

### 7.1 `synthesis-contracts`

规则：

- 不导入 Node、Zotero、DOM、plugin toolkit；
- 只包含跨边界 schema、DTO、error、capability 和 protocol helpers；
- DTO 字段使用 JSON-safe 值；
- 不导出 repository records；
- 不暴露 SQLite table/column；
- 不暴露本地绝对路径；
- 文件使用 asset handle、relative asset id 或受控 stream endpoint；
- query 和 command 分离；
- 所有 list 均有明确 limit/cursor；
- unknown fields 的处理由 protocol version 规则定义。

### 7.2 `synthesis-engine`

规则：

- 纯 TypeScript；
- 不读写文件、DB、网络、Zotero；
- clock、hash policy、budget/cancel check 通过参数；
- 输入输出是领域 DTO，不是 UI row 或 SQL row；
- graph layout、metrics、reference matching 等长计算支持 checkpoint/cancel；
- 算法版本是显式 basis；
- 输入输出可安全跨 worker boundary 序列化；大输入优先使用 batch、transferable buffer 或等价有界数据布局；
- 初始实现为 TypeScript；compute port 不绑定实现语言，未来 Rust kernel 必须通过同一 contract 和基准；
- 现有算法测试迁移，不复制。

### 7.3 `synthesis-service`

内部按用例聚合，不按技术工具堆放：

- workbench queries；
- explicit operations；
- workflow apply；
- topic artifact lifecycle；
- reference sidecar；
- matching/review；
- citation graph；
- tags/concepts/topic graph；
- sync/import/export；
- debug/diagnostics。

repository 可按 table family 拆分，但 application 不能拼接任意 SQL。事务由 use case 或 repository unit 明确拥有。

service 主进程是 repository、canonical files 和 Host effects 的唯一 owner。worker 只能运行纯计算，不能打开 production DB、写文件或调用 Host Capability。

### 7.4 plugin adapters

plugin 中只保留：

- `SynthesisClient` 的 HTTP 实现；
- 迁移期 in-process client adapter；
- service process launcher/discovery/health；
- Zotero item/artifact/mirror/relation host capabilities；
- Workbench message/command routing；
- Host Bridge/MCP proxy；
- prefs/permission UX。

迁移完成后删除 in-process adapter 和插件内 Synthesis repository/application implementation。

## 8. Service Protocol

### 8.1 公共 envelope

推荐请求：

```json
{
  "protocol_version": "1.0",
  "request_id": "req-...",
  "profile_id": "profile-...",
  "library_id": 1,
  "capability": "workbench.surface.read",
  "idempotency_key": null,
  "payload": {}
}
```

推荐成功响应：

```json
{
  "ok": true,
  "request_id": "req-...",
  "service_instance_id": "svc-...",
  "data": {},
  "diagnostics": []
}
```

推荐失败响应：

```json
{
  "ok": false,
  "request_id": "req-...",
  "error": {
    "code": "stable_error_code",
    "message": "bounded human-readable summary",
    "retryable": false,
    "details": {}
  }
}
```

`message` 不是测试或控制流 SSOT；调用方依据 `code`、HTTP status 和结构化字段处理。

### 8.2 System API

最小能力：

- `system.health`；
- `system.capabilities`；
- `system.version`；
- `system.profile_status`；
- `system.storage_status`；
- `system.shutdown`（仅 lifecycle credential）；
- `system.diagnostics_summary`。

handshake 至少校验：

- protocol major/minor；
- service package version；
- schema version；
- profile identity；
- data root identity；
- capability set；
- mutation enabled/disabled；
- host connection state。

protocol major 不匹配时必须 fail closed，禁止 mutation。minor capability 差异通过 capability negotiation 处理。

### 8.3 Workbench Query API

保持现有 surface-scoped 规则：

- `workbench.chrome.read`；
- `workbench.surface.read`；
- `workbench.topic_detail.read`；
- `workbench.paper_digest.read`；
- `workbench.options.read`；
- `workbench.surface.invalidate` 仅为 service 内部/事件语义，不允许普通 read 触发写入。

`workbench.surface.read` 必须携带：

- surface name；
- filters；
- cursor/limit；
- owner/library scope；
- optional known revision/signature。

不能提供普通 UI 使用的 full snapshot endpoint。full snapshot 仅保留 bounded debug capability。

### 8.4 Operation API

- `operations.submit`；
- `operations.get`；
- `operations.list`；
- `operations.cancel`；
- `operations.continue`；
- `operations.events`。

状态建议：

- `pending`：请求已记录但尚未开始；不是可被任意 worker claim 的队列；
- `running`；
- `waiting_for_host`；
- `completed`；
- `failed`；
- `canceled`。

重启遗留 operation 使用 terminal status 加稳定 diagnostic，例如 `synthesis_operation_interrupted_after_service_restart`，不自动重放。

进度：

- 有真实 total 时 determinate；
- 未知 total 时 indeterminate；
- 不伪造百分比；
- progress event 只更新 Workbench chrome；
- completion event 只声明需要 invalidate 的 surfaces。

### 8.5 Workflow Apply API

- `workflow_apply.literature_digest`；
- `workflow_apply.reference_matching`；
- `workflow_apply.topic_synthesis`；
- 后续 sidecar proposal ingestion 使用明确 DTO，不传任意 service method name。

每个 mutation 必须携带：

- idempotency key；
- run/request identity；
- source refs；
- base/read-set hashes；
- artifact locators/hashes；
- actor/source；
- expected library/profile。

### 8.6 Domain API 分组

不建立一个包含近百个 RPC 的平铺 service。按能力分组：

| 分组 | 示例 |
| --- | --- |
| `topics` | list、detail、context、apply、delete、purge、source-check |
| `references` | sidecar status/refresh、index page、advanced matching、proposal actions |
| `graph` | slice、metrics、layout、incremental refresh、full rebuild |
| `knowledge.tags` | vocabulary read/validate/import/stage/promote |
| `knowledge.concepts` | read、review、delete、checkpoint、index rebuild |
| `knowledge.topic_graph` | read、review、checkpoint、index rebuild |
| `sync` | state、start、pause、resume、retry、conflict action |
| `maintenance` | status、bounded repair、protected reset/import/export |
| `debug` | bounded snapshots、inspect、diff、profiler |

协议只暴露用户/调用方可观察的 use case，不暴露 private helper。

## 9. Host Capability Protocol

### 9.1 目标

service 需要 Zotero 数据，但不能拥有 Zotero implementation。Host Capability API 是反腐层，不是把全部 Zotero JavaScript API 暴露给 Node。

### 9.2 能力分组

| 能力 | 作用 | 约束 |
| --- | --- | --- |
| `host.library.items.page` | 按 scope 分页读取 item summaries | max limit、稳定 cursor、只读 |
| `host.library.items.by_ref` | 读取选定 item summaries | 有界 refs |
| `host.artifacts.scan_page` | 扫描 artifact existence/locator/hash | 不返回完整 payload |
| `host.artifacts.read` | 按 locator/hash 读取变更 payload | 大 payload 流式或有界 |
| `host.topic_mirror.inspect` | 读取 mirror 状态 | 不把 mirror 当 canonical |
| `host.topic_mirror.apply` | 执行受控 mirror plan | optimistic guard、receipt |
| `host.related_items.inspect` | 验证当前 relation | bounded |
| `host.related_items.apply` | 执行已批准 relation effect | permission/provenance/receipt |
| `host.library.notifications` | 发布 UI invalidation hint | 不能成为 correctness SSOT |

### 9.3 两阶段 Reference Sidecar Refresh

跨进程后继续沿用现有语义：

第一阶段：

1. service 创建 explicit operation；
2. 通过 host port 分页扫描 selected scope 的 artifact locator/hash；
3. service 更新 artifact sidecar；
4. 比较 previous/current references hash；
5. 形成 changed source set。

第二阶段：

1. service 只读取 changed references payload；
2. stale 旧 raw references；
3. 插入新 raw references；
4. incremental canonical dedupe；
5. safe deterministic binding；
6. 标记 graph/related-items stale；
7. 不自动启动 graph rebuild。

不得把 `getRegistryInputs(): Promise<ReferenceSidecarInput[]>` 这种整库数组接口原样变成 RPC。

### 9.4 Host effect receipt

所有 Zotero mutation 至少包含：

- effect id；
- intended action；
- source/target refs；
- expected current state/version；
- permission context；
- result status；
- Zotero object refs；
- applied/already-existed/stale-target/failed；
- bounded diagnostic；
- timestamp。

service 在调用 host 前持久化 pending effect；plugin 返回 receipt 后再更新 effect。Host IO 不得发生在 SQLite write transaction 内。

## 10. Transport、认证与大数据

### 10.1 Transport

推荐：

- command/query：HTTP/1.1 loopback JSON；
- progress/invalidation：SSE；
- health/discovery：短 HTTP 请求；
- 大 artifact：bounded body、chunked stream 或临时 asset handle；
- polling 是 SSE 不可用时的受控替代，不改变 operation SSOT。

第一阶段不引入 gRPC、通用 message broker 或外部数据库。

### 10.2 认证

- 只 bind `127.0.0.1`/`::1`；
- 每次 service launch 生成高熵 session token；
- token 只保存在 profile runtime scope；
- lifecycle/admin token 与普通 client token 分权；
- reverse Host Capability 使用单独 scoped grant；
- token rotation 不改变 profile/data owner；
- 日志不记录 token/header；
- debug endpoint 默认关闭或受 capability/auth 约束。

### 10.3 大数据边界

- 默认 list page 50，普通 max 100，debug max 1000，沿用 active performance contracts；
- 所有 truncated response 明确 `truncated` 和 next cursor；
- 先传 hash/locator，再传 changed payload；
- graph 查询返回 slice/page，不返回无界完整图；
- reference matching 输入按 block/batch；
- service 自己从 DB 读计算输入，不经 plugin 往返；
- plugin 主线程只处理有界 DTO，不解析数十万 reference 的完整数组。

## 11. Service 内部设计

### 11.1 Application layer

每个 use case 负责：

- 输入验证；
- authorization/capability；
- operation lifecycle；
- transaction boundaries；
- host calls；
- domain engine；
- staging/promote；
- diagnostics；
- affected surface invalidation。

禁止：

- UI 组件决定 repository transaction；
- repository 自动发 host command；
- read query 隐式提交 maintenance；
- domain engine 读取 global config/path。

### 11.2 Repository

将现有 `repository.ts` 按稳定 table family 拆分，例如：

- schema/migrations；
- operations/cache basis；
- artifact/raw/canonical references；
- bindings/proposals；
- citation graph/metrics/layout；
- topics/discovery；
- concepts；
- topic graph；
- tags；
- review/overrides；
- sync/effects。

repository 对外提供领域操作，不导出任意 table CRUD。跨 family transaction 由 application unit 显式编排。

### 11.3 Canonical files

canonical file adapter 负责：

- path scope；
- canonical JSON；
- staging；
- fsync/atomic rename 能力探测；
- manifest/hash validation；
- current/deleted lifecycle；
- recovery/diagnostics；
- export/import asset handles。

普通 API 不接受绝对输出路径。显式 export 使用经过 plugin/user 授权的 destination handle 或 service-managed export registry。

### 11.4 Operation executor

operation executor 不是通用 worker queue：

- operation 由明确 command 创建；
- 一个 service 内可有受控并发上限；
- 同 scope 冲突通过 owner/scope lock 拒绝或串行；
- 不提供任意 claim、steal、queue drain；
- continuation 由特定 operation 明确支持；
- cancellation 在 batch/checkpoint 检查；
- crash 后不伪装继续；
- cache promotion 与 operation completion 分离。

## 12. 迁移方法

### 12.1 总体顺序

```text
Baseline
  -> typed contracts
  -> all plugin consumers use SynthesisClient
  -> host ports replace direct Zotero access
  -> pure engine extraction
  -> Node service + private foundation (WS4-WS5 complete; freeze as oracle)
  -> language-neutral schema + canonical corpus
  -> Rust worker/service vertical slices
  -> Rust engine parity + layout v2
  -> Rust application/repository/canonical parity in isolated roots
  -> native manifest v2 + five-platform acceptance
  -> atomic DB/file owner cutover to Rust
  -> remove in-process and Node implementations
```

### 12.2 为什么先改 consumers

如果先启动 Node service，而 UI、Host Bridge、MCP 和 workflow 仍直接获得完整 service：

- 会出现两套入口；
- 每迁移一个方法都要修改所有消费者；
- 无法明确何时可删除旧 service；
- 远程和进程内行为容易漂移。

因此先让所有消费者依赖 `SynthesisClient`。最初 client 仍调用现有实现，从而在无进程变更时验证 API 分组和错误语义。

### 12.3 为什么不逐表生产迁移

引用、graph、topics、review 和 Workbench projection 存在跨域读取。逐表让 plugin/service 分别写同一个 DB 或两个生产 DB，会产生：

- cross-domain join 漂移；
- operation/cache basis 分裂；
- review 决策复制；
- 难以定义 rollback；
- 隐蔽双写。

功能可在 isolated/shadow store 中逐项验证，但 production `synthesis.db` 和 canonical root 的 ownership 必须一次切换。

## 13. 实施 Workstreams

每个 workstream 应先建立对应 OpenSpec change，按 TDD 执行。下面的文件清单是目标变化范围，不代表一次 change 同时修改全部文件。

### WS0：基线、规范和迁移清单

#### 目标

建立可以判断“行为未漂移”和“边界已完成”的基线。

#### 任务

- 生成 `SynthesisService` 公共方法清单和所有调用者清单；
- 将方法分类为 query、command、host effect、debug、private leakage；
- 建立现有测试到目标 package/layer 的映射；
- 记录 representative fixtures、DB schema、canonical topic tree；
- 记录 graph rebuild、advanced matching、Workbench surface 的 wall time、CPU、peak RSS/heap、event-loop lag、cancellation latency 和 payload 基线；
- 记录 clean machine 无系统 Node、runtime 缺失/损坏、升级失败和 crash-loop 的部署基线；
- 解决 active docs 对 Topic canonical source 的冲突；
- 明确 service-unavailable、mirror-failure、restart 的规范；
- 建立禁止双写、禁止整库 RPC、禁止 Node-in-plugin 的 invariant IDs；
- 建立禁止 system Node/PATH、禁止主事件循环长计算、禁止 worker 写 DB/file/Host effect 的 invariant IDs。

#### 影响文档

- `doc/synthesis-layer/README.md`；
- `domain-model.md`；
- `library-ssot-and-sidecar-cache.md`；
- `runtime-and-rebuild.md`；
- `persistence-and-files.md`；
- `sequences.md`；
- `workbench-ui.md`；
- 相关 `openspec/specs/synthesis-*`。

active docs 应随实现分批更新为当前状态；目标态先记录在 OpenSpec design 和本计划中。

#### 测试先行

- 建立 service API inventory guard；
- 建立 boundary scan，检测新 direct consumers；
- 建立 canonical file/mirror ownership characterization；
- 不新增锁定完整文案或内部调用顺序的测试。

#### 退出门禁

- 每个 service method 有目标 capability/use case 或明确删除结论；
- 真源和 failure semantics 无文档冲突；
- migration fixture 可重复构造；
- 现有生产 DB 和 canonical root 有备份/恢复演练方案。

### WS1：`synthesis-contracts` 与 `SynthesisClient` seam

#### 目标

在不改变进程和数据所有权的情况下，让所有消费者不再依赖完整 service object。

#### 任务

- 创建 environment-neutral contract package；
- 定义 common result/error/envelope；
- 按 system/workbench/operations/workflow/topics/references/graph/knowledge/sync 分组；
- 创建 `SynthesisClient` interface；
- 创建迁移期 in-process client adapter；
- 将 Workbench Tab 改为只依赖 client；
- 将 workflow host API 改为 client command；
- 将 Host Bridge capability 改为 client proxy；
- 将 Zotero MCP protocol 改为 client proxy；
- 将 workflow parameter options 改为 query client；
- 将 hooks 只调用 lifecycle/client status；
- 禁止新增 `getDefaultSynthesisService()` consumer。

#### 主要现有文件

- `src/modules/synthesisWorkbenchTab.ts`；
- `src/workflows/hostApi.ts`；
- `src/modules/hostBridgeCapabilityRegistry.ts`；
- `src/modules/zoteroMcpProtocol.ts`；
- `src/modules/workflowParameterOptions.ts`；
- `src/modules/synthesis/itemObserver.ts`；
- `src/hooks.ts`；
- `src/modules/synthesis/service.ts`。

#### 测试先行

- contract schema tests；
- in-process client 与现有可观察结果的 parity tests；
- stable error mapping tests；
- Workbench surface command routing tests；
- Host Bridge/MCP 不获取完整 service 的 dependency guard。

#### 退出门禁

- 生产消费者全部只依赖 `SynthesisClient`；
- `getDefaultSynthesisService()` 仅存在于迁移期 adapter/composition；
- remote client 可在不修改消费者的情况下替换 in-process client；
- client API 不平铺复制近百个 service 方法。

### WS2：Host Capability ports

#### 目标

消除 Synthesis application 对 Zotero/plugin modules 的直接依赖。

#### 任务

- 从 `SynthesisLibraryAdapter` 提取分页 Host Library contract；
- 从 `SynthesisMirrorAdapter` 提取 mirror plan/receipt contract；
- 从 `RelatedItemsSyncHost` 提取 relation effect contract；
- 把 artifact scan 与 payload read 分开；
- 把 item summary 与 item detail 分开；
- 所有 host reads 增加 bounds/cursor；
- 所有 host writes 增加 precondition/permission/receipt；
- plugin 实现 Zotero adapter；
- service/application 在进程内测试阶段只依赖 port；
- 禁止 service domain 接触 Zotero object 或 function-valued DTO。

#### 主要现有文件

- `src/modules/synthesis/libraryAdapter.ts`；
- `src/modules/synthesis/service.ts`；
- `src/modules/zoteroHostCapabilityBroker.ts`；
- `src/modules/zoteroNotePayloadResolver.ts`；
- `src/modules/notePayloadCodec.ts`；
- Topic mirror 相关实现；
- related-items sync 实现。

#### 测试先行

- paged item/artifact reads；
- hash-first changed payload reads；
- malformed locator/path rejection；
- mirror success/warning receipt；
- related-item optimistic guard；
- host unavailable/timeout；
- no Zotero imports boundary test。

#### 退出门禁

- Synthesis application 可以用 mock HostPort 在 Node 测试；
- 无 unbounded library array contract；
- host write 只有 semantic commands；
- Host IO 不发生在 repository transaction 内。

### WS3：提取 `synthesis-engine`

#### 目标

把重计算变成环境无关、可取消、可版本化的领域内核。

#### 推荐顺序

1. Citation Graph layout；
2. Citation Graph metrics；
3. Unified Citation Graph build；
4. Reference Matcher blocking/scoring/dedupe；
5. Tag Vocabulary index/validation；
6. Concept KB index；
7. Topic Graph index；
8. Topic structured artifact assembly/validation。

graph layout 作为第一条 process canary，因为：

- 纯计算；
- 输出可重建；
- 无用户批准事实；
- 容易比较 deterministic/hash invariants；
- 能较早验证取消和进程隔离。

第一阶段默认所有 kernel 仍使用 TypeScript。Rust 评估只能在 TypeScript worker 已完成算法、数据布局和分片优化后进行，不能把语言切换混入架构 parity change。

#### 任务

- 将算法输入从 repository/UI records 转成 domain DTO；
- 注入 algorithm/policy version；
- 增加 cancellation/budget checkpoint；
- 定义可跨 worker boundary 的纯输入/纯输出 compute contract；
- 建立主进程 scheduler、worker concurrency、backpressure 和结果校验要求；
- 避免把无界 object graph 通过 structured clone 发送给 worker；对大输入使用 batch、transferable buffer 或经过基准验证的等价表示；
- 删除插件 runtime imports；
- 将现有测试迁移到 engine package；
- 不改变算法语义，算法调优另开 change。

#### 主要现有文件

- `src/modules/synthesis/citationGraph.ts`；
- `src/modules/synthesis/referenceMatcher.ts`；
- `src/modules/synthesis/tagVocabulary.ts`；
- `src/modules/synthesis/conceptKb.ts`；
- `src/modules/synthesis/topicGraph.ts`；
- `src/modules/synthesis/topicStructuredArtifact.ts`；
- `src/modules/synthesis/foundation.ts` 中纯函数部分。

#### 测试先行

- 复用 `122-synthesis-citation-graph`；
- 复用 `151-synthesis-reference-resolution-matcher`；
- 复用 `153-synthesis-index-harness`；
- 复用 tag/concept/topic graph tests；
- 增加 cancellation/budget 的稳定行为测试；
- 增加 worker serialization、worker crash、worker hang、resource limit 和控制面响应测试；
- 在 normal/target/stress fixture 记录 TypeScript worker 基线；
- 不锁定私有迭代顺序。

#### 退出门禁

- engine package 不导入 Node、Zotero、plugin、DOM；
- graph/matcher 结果与基线一致；
- algorithm version 可进入 cache basis；
- 长计算具有检查取消的边界；
- worker 不能访问 production DB、canonical files 或 Host Capability；
- TypeScript worker 是第一阶段唯一必需实现，Rust 没有成为 cutover 依赖。

### WS4：Node service runtime（已完成，冻结为迁移 oracle）

#### 目标

建立尚不接管生产数据的独立 service runtime。

#### 当前进度

- 已交付首个独立切片 `add-synthesis-sidecar-runtime-foundation`：私有 Node
  workspace、loopback health、鉴权 handshake、独立 lifecycle token、严格有界
  wire input、结构化脱敏日志和有界关闭。
- 已交付 `package-synthesis-sidecar-runtime`：固定 Node `24.18.0` 的五平台
  product-owned runtime、严格 bundle manifest、上游签名与文件哈希门禁、版本化
  staged install、atomic active/previous pointer、repair 和 rollback。
- 已交付 `supervise-synthesis-sidecar-runtime`：插件按 profile 非阻塞启动、发现和
  监督 verified runtime，以低频单 scheduler 维护 lease/health，并提供 bounded
  shutdown、restart backoff 与 crash-loop fuse。
- 已交付 `add-synthesis-sidecar-compute-worker-pool`：service 懒启动单 worker，固定
  一项 active、两项 waiting、五秒 deadline、100ms cancel grace、500ms shutdown
  预算和三次连续故障熔断；Citation Graph layout 是首个 authenticated canary。
- 已交付 `increase-synthesis-sidecar-compute-wire-capacity`：compute request/response
  envelope 各自严格限制为 8 MiB，request/result JSON 结构分别限制为
  250,000/50,000 nodes，并在 client、HTTP reader、dispatch 与 response 边界对称
  拒绝超限；general/system request 仍保持 1 MiB。
- 已交付 `route-synthesis-citation-graph-layout-through-sidecar-worker`：默认生产
  composition 仅将 Citation Graph layout 纯计算路由到当前 ready 的 authenticated
  worker，固定五秒 deadline，并校验 request/service instance identity；未 ready、
  restart、transport 或 worker failure 均立即失败，不等待、重试或 in-process
  fallback。插件继续持有 DB 读取、graph basis 校验、promotion、canonical files
  和其它七个 production engine。
- 已交付 `route-synthesis-citation-graph-metrics-through-sidecar-worker`：默认生产
  composition 将 Citation Graph metrics 作为第二个固定 operation 路由到同一
  authenticated worker，共享一项 active、两项 waiting、五秒 deadline、取消、
  replacement 和 degraded fuse；插件继续持有 graph capture/hash/basis、DB、
  canonical metrics hashing 与 promotion，失败不重试或 in-process fallback。当前
  其余六个 production engine 仍在插件进程内。
- 已交付 `add-synthesis-citation-graph-build-sidecar-canary`：新增第三个固定
  `citation_graph_build.v1` operation，使用同一 authenticated worker、全局 admission、
  五秒 deadline、取消、replacement 与 degraded fuse；仅内部 client 和测试可显式
  调用 wire-bounded full/source-slice canary。生产 graph build 继续使用 in-process
  engine，现有 8 MiB、250,000 request nodes、50,000 response nodes 不承诺承载
  25,000 sources / 1,250,000 references / 750,000 targets 的 engine 上界，大载荷
  transfer/data layout 由后续独立 change 解决。
- 已交付 `define-synthesis-citation-graph-build-large-transfer-contract`：新增
  authenticated `compute.citation_graph_build_transfer` staging session，以 4 MiB、
  100,000 JSON nodes 的 canonical row pages、完整 manifest/root hash、幂等重试、
  两 session/2 GiB service 上限、idle/absolute TTL 和 500ms logical shutdown
  预算承载超过单一 8 MiB envelope 的输入与结果访问。
- 已交付 `connect-synthesis-citation-graph-build-transfer-to-streaming-worker`：sealed
  session 可通过 authenticated `execute` 进入共享单 worker pool；service main 与 worker
  以单页 transferable buffer/ACK 交换数据，worker 使用 string table/typed columns，
  output 仅在 attempt manifest 原子提交后可见。normal 2,000 sources / 100,000
  references 在 256 MiB old-generation 与 30 秒 active deadline 下作为硬门禁；
  target/stress 仍为 report-only。生产 graph build、Host/basis/DB promotion 继续由插件持有。
- runtime 仍不提供 remote `SynthesisClient`，不访问生产 SQLite/canonical/Host
  数据；五平台 prebuild 由独立 release 流程按新 fingerprint 重新生成和同步，
  在此之前 freshness/XPI release gate 保持 fail closed。

#### 任务

以下清单是 WS4 已交付的 runtime foundation。其 remote-capable client、process event
parity、production cutover 与正式 Node release 不再继续实现；可观察契约与隔离模型由新的
Rust WS6/WS7 承接。Node bundle 只用于 migration oracle 与 differential tests。

- 独立 package/build/entrypoint；
- 将 matching platform/architecture 的 Node executable、service bundle 和必要原生组件作为插件资产直接分发；
- launcher 只执行 product-owned runtime 的绝对受控路径，禁止 PATH search、系统 Node、npm 或用户 shell；
- 对包内资产和已解压 runtime 执行真实哈希校验，并按平台接入签名/公证验证；
- runtime 使用 versioned install directory、atomic active pointer 和上一版 rollback；
- loopback server；
- discovery/owner lock；
- instance nonce、stale PID/discovery 清理；
- token 生成和权限分级；
- ready 与 health 分离；health 校验 version、capabilities、schema、profile、data root、DB 和 canonical root；
- profile/data root validation；
- structured logging；
- 持续排空 stdout/stderr；
- bounded shutdown 和跨平台 process-tree termination；
- parent/host lease；
- `proc.wait()` crash detection、有限退避 restart 和 crash-loop fuse；
- fail-fast unhandled exception/rejection policy；
- 有界 worker pool、resource limits、cancel/terminate/replacement；
- event-loop lag、worker state/restart count、RSS/heap telemetry。

#### 测试先行

- service start/health/shutdown；
- clean machine without system Node/PATH；
- packaged runtime hash/signature validation；
- partial install、corrupt active runtime、atomic upgrade 和上一版 rollback；
- second owner rejection；
- invalid token；
- protocol mismatch；
- profile mismatch；
- port conflict/retry；
- crash/restart；
- stale discovery/PID、parent death、orphan prevention；
- crash-loop fuse；
- stdout/stderr backpressure；
- worker hang/crash/OOM simulation 和 bounded replacement；
- 长计算期间 health/cancel/shutdown 响应；
- log redaction。

#### 退出门禁

- service bundle 可通过 product-owned runtime 独立启动；
- 用户环境完全没有 Node、npm 或相关 PATH 配置时也可启动；
- plugin 可非阻塞启动/连接/显示 unavailable；
- service runtime 不访问生产 DB/canonical root；
- packaged service 能被开发构建发现；
- supervisor 能阻止双实例、孤儿进程和无限 crash restart；
- 主事件循环不直接执行 CPU 密集 kernel。

### WS5：Private isolated application、repository 和 canonical foundation（已完成）

#### 目标

完成 `Stage 1 / WS5 — Private Isolated Synthesis Foundation Complete`：让 Stage 1
所需的环境中立 application、repository、canonical 和 debug/maintenance foundation
在 Node service 内对隔离 DB/root 运行，但不注册生产 route、不接管生产数据或 Host effect。

#### 当前进度

- 已交付 `add-synthesis-sidecar-isolated-repository-foundation`：新增环境中立的
  `packages/synthesis-repository`，将 `synt_schema_meta`、`synt_cache_basis`、
  `synt_operation` 的类型、严格 row rebuild、DDL/index 和 CRUD 收敛为 SSOT；插件
  repository 已复用该 foundation，其他 table family、Zotero adapter、legacy migration
  与生产 composition 保持原位。
- service 主进程使用固定 Node `24.18.0` 自带的 `node:sqlite`，只在
  `profileRuntimeRoot/shadow-repository/<dataRootId>/synthesis.db` 打开持久化隔离库；
  marker/schema/reconcile 在 discovery 前完成，running operation 在 restart 时取消，
  terminal operation 与 cache basis 保留。
- health/handshake 只暴露 path-free O(1) `isolated_shadow` snapshot；
  `mutationEnabled: false`、108 methods / 1 direct consumer、八个 engine 的生产 owner
  和两个 production worker 均未改变。
- `packages/synthesis-application` 已承接第一个环境中立 use case：固定读取两项 cache
  readiness 与最多 50 个 running、20 个 current failed operation。插件 chrome/progress
  复用同一投影；认证 `workbench.chrome.read` 只针对隔离 shadow 运行，不接入生产
  `SynthesisClient` 或 Workbench。
- `packages/synthesis-application` 同时收口 Topic canonical snapshot、hash、path/section
  filename、canonical text 与 inspect projection；插件通过兼容导出复用同一规则。
  service 主进程只在 `shadow-canonical/<dataRootId>/` 持有 identity-bound shadow，使用
  完整 staging、fsync、expected-basis CAS、单 journal/receipt、rollback 与 restart recovery。
  认证 `topics.canonical.inspect` 只返回 hashes/descriptors，不进入 worker pool，也不提供
  apply/promote/archive capability。
- `add-synthesis-sidecar-topic-application-foundation` 在隔离 composition 内增加严格
  Topic list/detail/apply：只接受有界 materialized assets，支持 complete 与 structured
  patch assembly，使用 expected-basis CAS 作为 commit point，并在 commit 后幂等写入
  Topic registry、graph、concept、interest 与 discovery JSON-safe projection。应用只从
  indexed shadow state 列表、detail 最多读取一个 complete current，restart 后状态保持。
  它在 repository/canonical recovery 后初始化、shutdown 时先停止 admission，且没有
  注册 authenticated RPC、worker route 或 production `SynthesisClient` route。
- production Topic bundle validation 与 optimistic apply decision 已移至环境中立
  application SSOT 并由插件兼容导出复用；production canonical metadata hash 语义与严格
  shadow envelope 不同，因此 production list/detail/apply 明确保留原 composition，避免
  隐式 hash 漂移。完整迁移与 single-writer cutover 仍由后续 change 负责。
- `add-synthesis-sidecar-citation-graph-application-foundation` 已完成拆分优先级第 4 项的
  私有 shadow application：严格 full rebuild、bounded slice/metrics/layout reads、显式
  metrics/layout recompute 与全局单 mutation admission 组合在 recovery 后的隔离 repository
  之上。结构/light metrics 在一个 expected-graph transaction 内替换；complex metrics 和
  layout 只在 graph hash 仍 active 时提升。所有 kernel 继续通过同一 bounded worker，直接
  build admission 保持 8 MiB/250k/50k 且不自动转 packed transfer。该 application 没有
  authenticated RPC、自动 shadow invocation、production fallback 或 `SynthesisClient` route。
- `add-synthesis-sidecar-reference-refresh-application-foundation` 已推进拆分优先级第 5 项的
  refresh foundation：新增 private inspect/read/prepare/apply/discard application，严格完整
  descriptor 先产生 changed-only Host read plan，再由单次 8 MiB/250k materialization 完成
  full 或最多 100 sources 的 expected-reference CAS promotion。digest 不读取 payload；缺失、
  多余、重复、locator/hash stale 在写入前失败；manual binding/redirect/rejected decision 保持，
  protected stale canonical 只产生 revision review row。当前不包含 Advanced Matching、generic
  review actions、graph incremental execution、related-items effect、Host route 或 production cutover。
- `add-synthesis-sidecar-reference-matching-review-application-foundation` 已补完拆分优先级第 5 项的
  private Advanced Matching/Review foundation：单次 preparation 在 SQLite 外执行 binding 与 canonical
  dedupe 两个 strict engine pass，apply 仅在 Host/reference basis 均保持 current 时事务提升 accepted
  binding、deterministic redirect 与 review proposal。proposal 的 open/accepted/rejected/superseded/
  retargeted 状态、rejected-basis suppression 与 proposal 持久化由 shared application/repository
  SSOT 管理；designated Node adapter 投影 isolated accepted facts、撤销和 manual audit proposal。
  私有 composition 只持久化 isolated facts 并标记 graph/related
  stale，不执行 downstream effect，也不新增 Host/RPC/production route。
- `add-synthesis-sidecar-tag-vocabulary-application-foundation` 已完成拆分优先级第 6 项中除
  checkpoint/import 外的 15 个 Tag Vocabulary use case：strict DTO 与 row schema 收敛到 shared
  contracts/repository/application，validation 与 index construction 通过两个内部 bounded worker
  operation 在 SQLite 外执行，并在 revision recapture 后 CAS 提升。vocabulary、staged suggestion、
  audit 与 pending Host effect 持久化在独立 shadow table family；promotion 先原子提交 vocabulary/
  staged/effect，再投递 Host，失败只保留 pending effect，不回滚已提交词表。legacy numeric parent
  binding 在 promotion 前经既有 migration port 升级为 stable ref。当前没有 authenticated RPC、
  public capability、production `SynthesisClient` route、WebDAV、checkpoint 或 import preview/apply。
- `add-synthesis-sidecar-concept-kb-application-foundation` 已完成拆分优先级第 6 项的
  Concept KB application foundation：六类 row、manifest/revision、last-good index 与 stale state
  收敛到 shared contracts/repository/application；proposal create/exact merge、ambiguous/low
  confidence review、approve/merge/reject、display update 与 delete cascade 通过 expected-manifest
  CAS 原子提升。index 与只读 query 使用两个内部 bounded worker operation；失败、malformed
  result 或 basis supersession 不替换 last-good index。当前没有 checkpoint/import/export、canonical
  asset delivery、WebDAV、authenticated RPC、public capability 或 production route。
- `add-synthesis-sidecar-topic-graph-application-foundation` 已完成拆分优先级第 6 项的
  Topic Graph application foundation：node、edge、review item 与独立 manifest/revision、stale、
  last-good index state 收敛到 shared contracts/repository/application。完整 snapshot replacement、
  topic upsert/materialization、proposal ingestion、relation/review decision、mark/purge cleanup 均使用
  expected-manifest CAS 和短事务；稳定 relation/review ID、proposal mapping、cycle 检查与 production
  row/policy 复用同一 SSOT。index build 使用一个内部 bounded worker operation，仅在 captured
  manifest 仍 active 时提升；失败、malformed result 或 supersession 保留 last-good index。当前没有
  checkpoint/import/export、canonical asset delivery、discovery cascade、authenticated RPC、public
  capability 或 production route。
- `add-synthesis-sidecar-knowledge-checkpoint-application-foundation` 已完成拆分优先级第 7 项的
  SQLite-only 首个闭合切片：严格、版本化、有界的 checkpoint 覆盖 active Tag Vocabulary、
  Concept KB 六类 row 与 Topic Graph 三类 row，hash 绑定规范化 payload、三个 domain basis 与
  contract version。preview 最多保留一个进程内 receipt，并报告完整 replacement diff 与用户决定
  覆盖；apply 要求 checkpoint hash、单次 receipt 和显式 full-replacement 确认，在一个 repository
  transaction 内执行三 basis CAS。Tag staged/audit/pending effect 保持，三个 last-good index payload
  保持但统一标记 stale。该 coordinator 没有 HTTP/RPC、worker operation、public capability 或
  production route；生产 checkpoint/import composition 仍由后续切片负责。
- `add-synthesis-sidecar-durable-bundle-export-foundation` 已完成拆分优先级第 7 项的
  第二个闭合切片：shared contract 覆盖现有 23 类 durable entity，严格验证 exact fields、schema、
  path、identity、count、canonical-text length 与 hash，builder 只生成确定性 v2 bundle/manifest，
  reader 同时接受严格 legacy v1。私有 application 在一个事务内捕获全部当前可用 SQLite facts
  与 Topic registry bases，读取 canonical current 后同时 recapture repository 与 canonical hashes，
  任一缺失、损坏或 supersession 都整体失败；sink 始终先写排序稳定的 bundles、最后写 manifest。
  production durable sync 复用 shared codec，但原有 DTO、paths、progress、preview/apply、sync index、
  conflict、WebDAV HEAD/ETag/retry/credentials/Host port 行为保持不变。该 export foundation 没有公开
  route、worker operation 或 remote transport；import/apply 已由下述 sibling foundation 补齐。
- `add-synthesis-sidecar-durable-bundle-import-foundation` 已完成拆分优先级第 7 项的
  第三个闭合切片：shared contract 统一 live identity、严格 sync index 与 base/local/remote classifier；
  私有 application 以单次 receipt 执行 preview/apply，冲突和 tombstone 阻断 apply，unbased update
  需要显式确认。repository 在一个 aggregate/index CAS transaction 中增量写入 22 类 live facts、
  auxiliary owners、stale bases、sync metadata 与 commit receipt；Topic current JSON/Markdown 通过
  strict multi-Topic batch 在 SQLite commit 后同步提升，restart 按 matching receipt forward recovery，
  无 receipt 则丢弃 staging，mismatch fail closed。production preview/apply、WebDAV transport、HEAD/ETag、
  retry、credentials、Host port 与公开 capability 均未迁移。
- `add-synthesis-sidecar-webdav-sync-application-foundation` 已完成拆分优先级第 7 项的
  第四个闭合切片：strict shared contract 统一 HEAD、state、conflict、progress、remote path、retry
  与 lifecycle policy；environment-neutral application 通过 durable port 和 secret-free Host port
  执行 lazy remote read、preview-first import、unbased acknowledgement gate、排序稳定的
  bundle/manifest/HEAD publication、observed ETag conflict、四次有界 retry、single-active admission
  与 shutdown drain。Node composition 在 durable recovery 后创建 identity-bound atomic shadow state，
  默认 Host port disabled，无 route、自动触发、credential 或生产 mutation authority。production
  WebDAV 保留公开 DTO、paths、progress、prefs/credentials、HTTP/abort 与 Host wire shape，通过适配器
  复用 shared orchestration。priority-7 至此闭合。
- `add-synthesis-sidecar-debug-maintenance-application-foundation` 已完成 priority-8 与 WS5 闭合：
  shared strict contract/repository projection/application 提供有界、JSON-safe 的 status、schema、cache、
  operation、snapshot、paper/Topic inspect、pure diff 与 optional redacted profiler。SQLite transaction 内
  捕获 repository basis，transaction 外 inspect canonical descriptor，再 recapture；变化返回
  `superseded`。所有 read 均零写入，Node profiler 默认 unavailable，checkpoint/durable/protected reset
  复用既有 owner。私有 composition 无 route/worker/client/Host capability，并在 shutdown 首先 drain。
  六项 WS5 exit gate 已由 Core、boundary、inventory 与 runtime/XPI 检查锁定；下一阶段改为 Rust parity。
- 此切片不是 production repository mirror 或 route。新的 WS6 先完成 Rust parity，
  新的 WS7 再一次性向 Rust 切换 DB/canonical single writer；当前 Node service 不接触生产
  `synthesis.db`、production canonical files、Host capability 或公开 `SynthesisClient`。

#### 任务

- 将 repository table families、schema 和严格 row rebuild 收敛到环境中立 SSOT，
  并提供只打开隔离数据库的 Node SQLite adapter；
- 在 identity-bound shadow root 中实现 service-owned canonical adapter、journal、CAS、
  rollback 和 restart recovery；
- 在 private Node composition 中承接 Workbench chrome、explicit operations、Topic、
  Reference、Graph、Knowledge、durable sync 和 debug/maintenance foundation；
- service 主进程只拥有隔离 DB/canonical commit，compute workers 只返回待验证结果；
- 删除 environment-neutral application 对 plugin runtime persistence、logging 和 prefs
  的依赖；
- WebDAV application 只依赖 secret-free `SynthesisHostWebDavSyncPort`；production
  plugin adapter 继续独占 prefs、credentials、URL resolution 和 HTTP；
- remote export application 只通过 `SynthesisHostExportDeliveryPort` 提供有界 canonical
  text entries；production plugin Host adapter 继续独占临时 ZIP、integrity metadata、
  opaque Host Bridge registration、delivery 和 cleanup；
- private foundation 不注册 production RPC、`SynthesisClient` route 或自动调用。

#### 拆分优先级

1. schema/health/cache basis/operations；
2. Workbench chrome；
3. Topic canonical read/apply（隔离 foundation 已完成；production cutover 待后续 change）；
4. graph read/layout/rebuild；
5. reference sidecar/matching/review；
6. tags/concepts/topic graph；
7. knowledge checkpoint、durable bundle export/import 与 WebDAV sync foundation 已完成；
8. debug/maintenance（已完成）。

这里的优先级用于实现和测试，不代表生产逐表切换。

#### 测试先行

- 迁移现有 repository foundation tests；
- canonical stage/promote/failure tests；
- topic apply + mirror warning tests；
- explicit operation/cache basis separation；
- graph failure preserves previous projection；
- user decisions survive rebuild；
- import/export/sync durable facts；
- Node fixture service 与 in-process baseline 的 use-case parity。

#### 退出门禁

- service 对隔离 DB/root 提供完整必需用例；
- service 不导入任何 plugin module；
- canonical topic lifecycle 在 Node 环境通过；
- repository transaction 不包含 host/file/network 长 IO；
- repository transaction 和 canonical commit 不运行在 compute worker；
- 所有生产 capability 均已记录为 private foundation、保留的 plugin owner、WS6 parity、
  WS7 cutover 或明确从 Stage 1 删除，不把尚未路由的生产 consumer 计为已实现。

### WS6：Rust parity、shadow verification 和 native process canary

> 2026-07-18 路线替换：原 Node remote route/shadow 草案不再作为交付任务。本工作流按
> `artifact/synthesis_sidecar_rust_migration_plan_20260718.md` 的 R1-R6 执行：先锁定
> language-neutral schema/canonical corpus，再按 metrics、确定性 kernels、复杂 kernels、
> build/transfer、layout v2 的顺序建立 Rust parity。Node 仅在测试 harness 中读取固定 fixture
> 或隔离副本，不注册新的 production route。

#### 目标

在不写生产状态的前提下验证 Rust remote implementation。

#### 任务

- 为代表性 private application capability 增加 authenticated remote route 和
  remote-capable `SynthesisClient` transport，默认 production client 保持不变；
- 为 explicit operations 增加有界 SSE/polling event、timeout、abort 和 cancellation
  parity；
- 通过 reverse Host canary 验证 secret-free WebDAV port 与有界
  `SynthesisHostExportDeliveryPort`，不得把 credentials、prefs、本地路径或 service-owned
  asset registry 引入 wire contract；
- 对固定 fixture 或 production input 的只读、脱敏、有界 snapshot 执行语义、资源和
  failure parity，结果只写独立 shadow DB/root；
- 在 production copy 上演练 cutover runbook，但不改变 production owner。

#### 允许的 shadow

- 固定 fixtures；
- production input 的只读、脱敏、有界 snapshot；
- 独立 shadow DB/root；
- graph layout/metrics 结果对比；
- Workbench read model 对比；
- reference matching proposal 对比但不应用；
- canonical candidate validation 但不 promote production。

#### 禁止的 shadow

- 写 production `synthesis.db`；
- 写 production canonical root；
- 写 Zotero mirror/relation；
- 把 shadow operation 展示为 production operation；
- 自动修复差异。

#### 对比指标

- result hash/semantic counts；
- cache basis；
- operation phases/counts；
- Workbench stable fields；
- proposal precision/recall 基准；
- elapsed、CPU、peak RSS/heap、event-loop lag、worker utilization 和 cancellation latency；
- payload size 和 round trips；
- degraded/failure behavior；
- control-plane health/SSE/shutdown latency under normal/target/stress compute load；
- worker input serialization/copy cost；
- Rust worker 与冻结 Node oracle 的同 contract 结果、性能和资源对比。

#### 测试先行

- graph layout process canary；
- graph rebuild isolated canary；
- advanced matching isolated canary；
- Workbench surface remote parity；
- host pagination/cancellation；
- service crash during staging；
- plugin disconnect during host call；
- Rust worker 满载时的 control-plane responsiveness；
- worker crash/hang 后 previous projection 和 operation semantics；
- benchmark spike 不写 production DB/file/Host effect。

#### 退出门禁

- representative data 无未解释语义差异；
- target scale 不使用 unbounded RPC；
- Rust engine/worker 对已纳入 slice 的 capability 通过 language-neutral corpus、语义、错误与资源 parity；
- Rust service 主进程在 target/stress compute 下保持 health/cancel/shutdown 可响应；
- 五平台 native canary 可复现，单平台压缩 runtime 不超过 15 MiB；
- process crash 不破坏 fixture current/DB；
- cutover runbook 在副本上演练成功。

### WS7：Rust durable foundation 与 production single-writer cutover

> 2026-07-18 路线替换：原 Node production cutover 禁止执行。本工作流按 Rust 总计划的
> R7-R9 完成 repository、canonical store、application、native service/lifecycle 与 manifest v2，
> 通过五平台 fault injection、包体和实机门禁后，只向 Rust 原子切换 production owner。

#### 目标

一次切换 production DB 和 canonical root 所有权。

#### 任务

- 为全部 production use case 完成 service capability 和 remote-capable client routing；
- 将 WebDAV、export delivery、library/artifact read 与 Zotero effect 等受限 Host port 接入
  production reverse-host transport，同时保持 secrets 和临时资产由 plugin adapter 持有；
- 将所有 production consumers 从 in-process implementation 迁移到同一 grouped client
  contract，并在切换前保持唯一 plugin writer；
- 按 runbook 原子转移 production DB/canonical ownership，将 remote client 设为唯一
  implementation，且不保留自动 in-process fallback。

#### 前置条件

- WS0–WS6 全部门禁完成；
- release artifact 包含匹配的 plugin/service/contracts；
- release artifact 包含匹配平台/架构且已验证的 native Rust executable，不包含或依赖 Node；
- migration dry-run 成功；
- 备份和 restore 验证完成；
- 所有 consumers 已使用 remote-capable client；
- service capabilities 覆盖 production use cases；
- 无未解决 schema/canonical drift；
- 用户可见维护窗口和失败提示已准备。

#### Cutover runbook

1. 禁止新的 Synthesis mutations；
2. 等待或取消当前 explicit operations；
3. flush/close plugin Synthesis repository；
4. 备份 `synthesis.db`、WAL/SHM 和 Topic canonical root；
5. 记录 schema、file manifest、hash 和 owner marker；
6. 启动 service migration dry-run；
7. 获取 production owner lock；
8. service 执行必要 schema/file validation/migration；
9. service 打开 production DB/root；
10. plugin 切换 remote client 为唯一 implementation；
11. 验证 system health、storage、chrome；
12. 验证 topic list/detail 和 canonical file；
13. 验证 reference/cache status；
14. 验证 graph read；
15. 执行一个无破坏性 worker operation，并验证期间 health/cancel/event 响应；
16. 启用 Synthesis mutations；
17. 记录 runtime fingerprint、worker implementation/version 和 cutover receipt。

#### 失败处理

- 在第 8 步前失败：释放 lock，旧 implementation 仍可使用；
- service 已迁移但未启用 mutation：停止 service，依据 migration compatibility 或备份决定 rollback；
- mutation 已启用后失败：不自动切回旧 implementation；进入 service recovery 或受控 restore；
- 不允许 plugin 在 service uncertain 状态下尝试直接写 DB；
- mirror failure 不视为 DB ownership cutover 失败。

#### 测试先行

- production-copy cutover rehearsal；
- owner lock；
- migration idempotency；
- health gate fail closed；
- rollback before mutation；
- restore after simulated migration failure；
- no in-process fallback guard。

#### 退出门禁

- service 是 production DB/root 唯一所有者；
- plugin production build 不再初始化 Synthesis repository；
- 关键读写 smoke 通过；
- 无双写和 fallback；
- cutover/backup/restore receipt 完整。

### WS8：删除插件内旧 runtime、Node oracle 和收口入口

#### 目标

删除迁移脚手架，确保架构不是“两套实现”。

#### 任务

- 删除 in-process client adapter；
- 删除 `getDefaultSynthesisService()`；
- 删除插件内 repository 创建；
- 删除插件内 canonical file write；
- 删除 Synthesis application/engine 旧文件；
- 删除 `apps/synthesis-service` Node service、JavaScript worker、Node runtime bundle/prebuild/download 与 D3 runtime copy；
- 删除 plugin-specific duplicate DTO；
- Host Bridge/MCP 只保留 proxy；
- Workbench 只保留 client message bridge；
- hooks 只保留 service lifecycle；
- 清理 obsolete prefs、task rows、debug reset；
- 更新 active docs/specs；
- 加入 static boundary checks。

#### 预期删除/迁移

| 现有文件/区域 | 目标 |
| --- | --- |
| `src/modules/synthesis/service.ts` | 拆入 service application 后删除 |
| `src/modules/synthesis/repository.ts` | 拆入 service infrastructure 后删除 |
| `src/modules/synthesis/libraryAdapter.ts` | Zotero 部分转为 plugin Host Adapter；domain DTO 转 contracts |
| graph/matcher/tag/concept/topic graph 算法 | 转 `synthesis-engine` |
| `src/modules/synthesis/uiModel.ts` | DTO 转 contracts；projection builder 转 service |
| `src/modules/synthesisWorkbenchTab.ts` | 保留 UI host，但只调用 client |
| `src/synthesisWorkbenchApp.ts` | 第一阶段保留；只调整消息协议，第二阶段再拆 UI |
| Host Bridge/MCP handlers | 改为 remote client proxy |

#### 测试先行

- forbidden import scans；
- no direct DB open；
- no direct canonical root write；
- no `getDefaultSynthesisService`；
- plugin bundle 不包含 Node runtime、Node-only service code 或 D3 runtime copy；
- native service bundle 不包含 Zotero/plugin code、JavaScript entrypoint 或 npm tree。

#### 退出门禁

- 迁移期 fallback/adapter 全部删除；
- 无重复 Synthesis implementation；
- active code 与 active docs 一致；
- Stage 1 Definition of Done 全部满足。

### WS9：Rust native build、发布和运维

#### 目标

让 service 成为可发布、可诊断、可恢复的插件组成部分。

#### 任务

- 为 Rust workspace/service 建立独立、locked、可复现的五平台 build target；
- plugin 构建不打入 Node runtime、Node-only service code、JavaScript worker 或 D3 runtime copy；
- 插件包直接携带各目标平台/架构的 native executable，用户无需另行安装或下载 runtime；
- service artifact 包含 executable、protocol、schema、capability 与 build fingerprint；
- 固定 Rust toolchain、Cargo lock、crate/native component 的来源与构建 provenance，生成许可证清单与 SBOM；
- release preflight 检查已知漏洞，并为 Rust runtime/dependency 安全更新定义受影响版本识别、补丁时限和 rollback 边界；
- launcher 处理 Windows/macOS/Linux 路径、CPU 架构、可执行权限、签名、公证和安全软件诊断；
- 安装/升级时重新校验包内及已解压 runtime 的真实 hash/signature；
- 使用 versioned runtime directory、atomic active pointer 和完整上一版 rollback；
- release 不得要求用户安装 Node/npm/system Rust，也不得从 PATH 或 shell profile 解析外部 runtime；
- plugin/service/protocol/schema 兼容矩阵；
- release preflight 加入离线 clean machine、worker 满载 health/cancel、parent death、crash-loop、包体硬预算和关键 smoke；
- debug bundle 收集 bounded service status/log；
- 文档说明 service unavailable、restart、repair 和 reset；
- release pipeline 增加 service package publication/fingerprint gates。

#### 测试先行

- packaged artifact discovery；
- clean/offline environment without Node/npm/system Rust/PATH dependency；
- version mismatch；
- upgrade migration；
- partial extraction、hash/signature mismatch、active pointer failure 和上一版 rollback；
- runtime provenance、SBOM、许可证清单和已知漏洞门禁；
- clean install；
- existing profile upgrade；
- service binary missing/corrupt；
- path with spaces/non-ASCII；
- Windows command resolution；
- macOS executable/signing/quarantine and Linux executable permission；
- parent death/orphan cleanup、crash-loop fuse 和 process-tree termination；
- worker saturation/crash/hang 下的 health/cancel/shutdown；
- shutdown leaves no writer lock；
- debug bundle redaction。

#### 退出门禁

- 三平台构建/启动策略明确并验证；
- 用户无需安装任何外部 runtime；
- release pipeline 能发现 plugin/service 漂移；
- release pipeline 能发现 executable/service/worker/schema/native component 的 fingerprint 错配；
- release pipeline 能发现 runtime 来源、许可证、SBOM 或安全版本门禁缺失；
- clean install 和 upgrade smoke 通过；
- 运维文档可执行。

## 14. 建议的 OpenSpec Change 序列

不建议用一个 change 承载全部实施。WS0-WS5 的既有 change 继续作为历史证据；2026-07-18 后的活动序列如下：

| 顺序 | Change 建议名 | 主要范围 | 依赖 |
| --- | --- | --- | --- |
| R0 | `pivot-synthesis-sidecar-runtime-to-rust` | 冻结、治理、文档、预算和 change sequence | WS5 |
| R1 | `define-synthesis-cross-language-canonical-semantics` | versioned schemas、positive/negative corpus、canonical bytes/hash、解除 contracts 反向依赖 | R0 |
| R2-R3 | `introduce-synthesis-rust-sidecar-metrics-vertical-slice` | Cargo workspace、五平台 CI、serve/worker framing、metrics end-to-end | R1 |
| R4 | `migrate-synthesis-deterministic-kernels-to-rust` | Tag Vocabulary、Concept KB、Topic Graph index | R2-R3 |
| R5 | `migrate-synthesis-complex-kernels-and-transfer-to-rust` | matcher、structured artifacts、graph build/packed transfer | R4 |
| R6 | `introduce-synthesis-citation-layout-v2` | Rust layout v2、cache invalidation、删除 runtime D3 | R5 |
| R7 | `migrate-synthesis-durable-foundation-to-rust` | SQLite、canonical store、applications、五平台 fault injection | R6 |
| R8 | `introduce-synthesis-native-runtime-manifest-v2` | native bundle、installer、supervisor、launch/discovery/handshake | R7 |
| R9a | `cut-over-synthesis-production-owner-to-rust` | production copy rehearsal、single-writer cutover、实机 gates | R8 |
| R9b | `remove-synthesis-node-runtime-and-legacy-implementation` | 删除 Node、旧 plugin implementation、依赖和 release branches | R9a，同一 release milestone |

2026-07-27 当前状态：R9a 已建立本地 change，并完成 capability
fingerprint、native client adapter、reverse-Host 闭集、持久化 cutover
receipt/coordinator、legacy SQLite writer 释放、验证式备份恢复、Rust
production-copy preflight 与 pre-admission owner lock。完整 Rust production
RPC、mutation admission、supervisor wiring 和 default-client 切换仍未完成；
生产 owner 尚未改变。R8 远端、签名/XPI 与实机证据单独保留为外部验收债务。

下表是原 Stage 1 Node 路线的历史编排。0-5 已为当前迁移提供 seam/oracle；6-9 的 Node 目标已由上表取代，不再创建或继续：

| 顺序 | Change 建议名 | 主要范围 | 依赖 |
| --- | --- | --- | --- |
| 0 | `define-synthesis-sidecar-service-boundary` | ownership、protocol、failure、invariants | 无 |
| 1 | `introduce-synthesis-client-contracts` | contracts、client、in-process seam、consumer migration | 0 |
| 2 | `introduce-synthesis-host-capability-ports` | paged host reads、mirror/relation receipts | 0–1 |
| 3 | `extract-synthesis-domain-engine` | graph/matcher/knowledge pure code、worker-safe compute contracts、benchmark baseline | 0 |
| 4 | `add-synthesis-sidecar-runtime` | bundled Node、server、supervisor、worker pool、auth、discovery、remote client | 1、3 |
| 5 | `port-synthesis-application-and-persistence` | repository、canonical files、use cases | 2–4 |
| 6 | `verify-synthesis-sidecar-parity` | fixtures、shadow、worker canaries、performance/lifecycle gates、cutover rehearsal | 5 |
| 7 | `cut-over-synthesis-sidecar-ownership` | production migration、single writer | 6 |
| 8 | `remove-plugin-synthesis-runtime` | delete fallback/old implementation、docs | 7 |
| 9 | `publish-synthesis-sidecar-runtime` | bundled runtime、三平台 packaging、签名/校验、upgrade/rollback/operations | 可与 7–8 协调 |

每个 change 应有自己的 proposal/design/spec/tasks 和最小验证，不跨多个门禁长期保持半完成状态。

## 15. TDD 与现有测试迁移

### 15.1 原则

- 每个 use case 先写或调整稳定行为测试；
- 优先移动现有测试，不为新目录复制测试；
- contract tests 不断言完整错误文案；
- adapter tests 不锁定内部调用顺序；
- UI tests 锁定用户可见状态和 DOM identity，不锁定大段 HTML；
- process tests 锁定 crash/reconnect/idempotency/single-writer；
- runtime tests 锁定无系统 Node、真实完整性校验、原子升级/rollback、父进程租约和 crash-loop 熔断；
- worker tests 锁定纯输入/输出、控制面响应、取消、资源上限和 crash isolation，不锁定线程调度顺序；
- 算法调优和架构迁移分开。

### 15.2 现有测试的大致归属

| 测试区域 | 目标归属 |
| --- | --- |
| `120-synthesis-layer-foundation`、`122-synthesis-citation-graph` | engine/domain |
| `121-synthesis-reference-sidecar-index`、`146-synthesis-repository-foundation` | service repository/application |
| `151-synthesis-reference-resolution-matcher`、reference harness | engine/benchmark |
| `140–142` tag/topic graph/concept | engine + service use cases |
| `143` reference/citation integration | service application |
| `144`、`158`、`159` sync | service infrastructure/application |
| `125-synthesis-tab-ui` | plugin client/Workbench |
| `123`、`128` MCP | plugin proxy + contract |
| `129` integration、`130` Zotero smoke | cross-process + Zotero adapter |
| `132`、`133`、`136`、`155` topic workflow | workflow apply client/service |

实际移动前需要检查每个测试断言是否仍代表稳定行为。仅锁定旧内部文件布局或方法名的测试应删除或改写。

### 15.3 必增的高价值回归测试

- service unavailable 不阻塞 Zotero startup；
- protocol incompatible 禁止 mutation；
- plugin/service 不可能同时获得 DB owner lock；
- Topic canonical promote 成功、mirror 失败时 canonical 保留；
- service crash during staging 不替换 current；
- cache rebuild 失败保留 previous projection；
- operation completion 不自动等于 cache ready；
- plugin disconnect 后不执行 Zotero write；
- host effect idempotency；
- digest apply source success + sidecar warning；
- Topic apply service unavailable 明确失败并保留 candidate；
- Workbench progress 只更新 chrome，surface completion 只 invalidate 声明区域；
- large reference refresh 使用分页且只读取 changed payload；
- cutover 后 plugin 无 DB/file fallback。
- clean environment 无 Node/npm/PATH 时 Synthesis 正常启动；
- packaged runtime 被篡改或部分解压时 fail closed；
- worker 满载时 health、SSE、cancel 和 shutdown 保持响应；
- worker crash/hang 不破坏 previous projection、DB 或 canonical current；
- parent process 消失后不遗留可继续写 DB/Host 的孤儿 service；
- crash-loop 达阈值后停止自动重启并显示稳定 unavailable；
- Rust benchmark spike 使用同一 compute contract 且没有生产副作用。

## 16. 性能门禁

继续采用 active `performance-and-scale.md` 的规模和 p95 目标，同时增加跨进程指标。

### 16.1 UI

- Zotero startup 不等待 Synthesis warmup；
- Workbench chrome p95 目标 150ms；
- active surface p95 目标 500ms；
- progress event 不重建 content surface；
- Index/Review/Graph 保持各自分页；
- service starting/unavailable 状态在有界时间内返回。

### 16.2 Transport

- 记录每个 capability payload bytes、round trips、serialization time；
- normal response 不超过明确 budget；
- artifact read 只传 changed payload；
- graph default view 返回 bounded slice；
- 不出现一次 RPC 传输 10k item/500k reference；
- SSE backlog 有界，断线后通过 operation query 恢复，而不是重放无界 event log。

### 16.3 Compute

- CPU-heavy phases 不运行在 Zotero 线程；
- CPU-heavy phases 不运行在 Node service 主事件循环；
- service 主进程只负责协议、operation、短 DB transaction、canonical commit 和 worker orchestration；
- worker pool 有明确并发、CPU、内存、输入大小、排队和 backpressure 上限；
- cancellation 在 bounded slice 内生效；
- layout/metrics/matching 记录 algorithm version 和 phase；
- 记录 worker wall/CPU、peak RSS/heap、event-loop lag、serialization/copy cost 和 cancellation latency；
- DB transaction 保持短小；
- file/network/host IO 不在 DB write transaction 中。

### 16.4 Rust 实施门禁

Rust 已是默认 sidecar 目标，但不允许跳过以下门禁：

1. 先为跨进程 DTO 建立 versioned schema、positive/negative corpus 与 canonical bytes/hash SSOT；
2. 每个 slice 使用同一公开 contract、gold result、错误类别和可重复 benchmark 与 Node oracle 对比；
3. 双执行只存在于测试 harness，使用固定 fixture 或隔离 roots；production route 无 Node fallback；
4. bounded CPU work 进入可替换 worker process，worker 不直接拥有 DB、canonical files 或 Host Capability；
5. repository/canonical 迁移锁定 transaction、fsync、journal、recovery 与五平台 fault semantics；
6. 每次新增依赖都审查 license、供应链、五平台构建、lock provenance 与 compressed binary 增量；
7. 每平台 native runtime ≤15 MiB、五平台总量 ≤75 MiB、最终 XPI ≤100 MiB；
8. Force layout 只通过显式 layout v2 change 迁移；
9. 接受一个 slice 后删除被替代的活动实现，禁止双栈长期化。

现有 Windows ACP Bridge 仍只是无状态传输适配器；它既不能替代上述门禁，也不是 Synthesis Rust service 的复用前提。

## 17. 故障语义

| 场景 | 预期行为 |
| --- | --- |
| service 尚未启动 | Workbench 显示 starting；Zotero 主窗口继续 |
| service 启动失败 | Workbench unavailable + bounded diagnostic；非 Synthesis 功能继续 |
| protocol major 不兼容 | 显示 incompatible；禁止 mutation |
| service 请求超时 | client 返回 stable timeout；不自动重复非幂等 command |
| service 计算崩溃 | operation failed/canceled；previous projection 保留 |
| worker crash | 主进程回收 worker；当前 phase 失败/取消；DB/current 不变 |
| worker hang 或超资源预算 | cancel 后有界 terminate；记录 diagnostic；必要时替换 worker |
| Node 主事件循环延迟超限 | health 标记 degraded；停止接收新的重计算并保留查询/取消能力 |
| parent/host lease 失效 | 停止 Host writes 和新 mutation；有界关闭，避免孤儿 writer |
| service 连续崩溃 | supervisor 有限退避后熔断，显示 unavailable，不无限重启 |
| bundled runtime 缺失、篡改或版本错配 | 启动 fail closed；保留上一版完整 runtime 或进入 repair |
| 系统未安装 Node | 无影响；launcher 使用插件自带 runtime |
| plugin host 断开 | host-dependent operation waiting/failed；禁止 Zotero writes |
| canonical staging 失败 | current 不变 |
| canonical promote 后 mirror 失败 | canonical 成功；mirror warning/repair action |
| DB migration 失败 | 不启用 service mutation；保留备份 |
| DB corruption | fail closed；diagnostic/export/repair，不让 plugin 直读 fallback |
| SSE 断开 | polling/query operation state；不改变 operation |
| duplicate command | idempotency key 返回原 receipt/result |
| Zotero relation precondition 变化 | stale_target/needs_attention；不强制覆盖 |

## 18. Rollback 与恢复

### 18.1 Cutover 前

- in-process adapter 仍是唯一 production owner；
- remote service 只操作 isolated data；
- 任意失败可关闭 remote path，不涉及 production data rollback。

### 18.2 Cutover 窗口

- 备份 DB、WAL/SHM、canonical root 和 manifest；
- 记录旧/new schema；
- 迁移工具 dry-run；
- owner lock 保证单写者；
- rollback 只能在 service 停止且 lock 释放后执行。

### 18.3 Cutover 后

- 不自动 fallback；
- 优先修复/重启 service；
- schema/file migration 不可逆时使用备份 restore；
- restore 后再次验证 canonical manifest 和 durable decisions；
- projection 可重建，但用户决策需要完整校验；
- Zotero mirror 可从 canonical files 显式重建。

## 19. Active 文档与 Spec 漂移治理

第一阶段会改变以下当前假设：

1. “Synthesis runs inside a single Zotero plugin process”改为 service process；
2. plugin startup 取消 stale operation 改为 service lifecycle reconciliation；
3. “no external process requirement”不再是目标；
4. Topic local canonical files 与 Zotero mirror 的所有权明确；
5. plugin-side service 改为 remote domain service；
6. Host Bridge/MCP 从直接 service access 改为 proxy；
7. Workbench surface 规则保留，但数据来源改为 typed client；
8. `synthesis.db` 路径仍在 profile persistence root，owner 改为 service。

需要审查：

- `doc/synthesis-layer/README.md`；
- `domain-model.md`；
- `library-ssot-and-sidecar-cache.md`；
- `runtime-and-rebuild.md`；
- `persistence-and-files.md`；
- `performance-and-scale.md`；
- `sequences.md`；
- `state-machines.md`；
- `workbench-ui.md`；
- `openspec/specs/synthesis-layer-integration/spec.md`；
- `synthesis-work-governance/spec.md`；
- `synthesis-maintenance/spec.md`；
- `synthesis-incremental-update-triggers/spec.md`；
- 相关 MCP、Host Bridge、topic workflow specs。

active docs 只描述已落地 current state。每个 change 实施时同步对应文档，不在第一步把全部 active docs 提前改成未来状态。

## 20. 静态边界守卫

完成后应有机器化检查：

- plugin 禁止导入 `apps/synthesis-service/**`；
- service 禁止导入 `src/**` 插件内部；
- contracts 禁止 Node/Zotero/DOM imports；
- engine 禁止 filesystem/network/SQLite/Zotero imports；
- plugin 禁止创建 Synthesis repository；
- plugin 禁止打开 `synthesis.db`；
- plugin 禁止写 Topic canonical root；
- service 禁止访问 `globalThis.Zotero`；
- launcher 禁止 PATH search、系统 Node、npm 和用户 shell 解析；
- service 主事件循环禁止直接调用 CPU-heavy engine entry；
- compute worker 禁止 repository、canonical file、Host Capability 和 Zotero imports；
- Rust worker（若未来存在）禁止拥有 production persistence/effect adapter；
- 禁止新 `getDefaultSynthesisService`；
- 禁止 Host Bridge/MCP 获取完整 service implementation；
- 禁止 Workbench full snapshot 用于普通 surface。

完成时建议的检查应使下列搜索无生产命中或仅命中明确 adapter/composition：

```text
getDefaultSynthesisService
createSynthesisRepository
getGuardedSqliteConnection
globalThis.Zotero
runtimePersistence
hostBridgeCapabilityRegistry
```

检查范围需按 package 边界配置，不能简单禁止合法的 plugin Host Adapter 使用 Zotero。

## 21. 第一阶段 Definition of Done

### 架构

- [ ] service 独立 Rust native 构建并按 profile 运行；
- [ ] XPI 携带五平台 native executable，不包含 Node/npm 或安装后 runtime 下载；
- [ ] launcher 不搜索 PATH，只执行经过验证的 product-owned native runtime；
- [ ] Rust service 主进程与可替换 compute worker process 职责分离；
- [ ] language-neutral schema/corpus/canonical semantics 是跨语言 SSOT；
- [ ] plugin/service/contracts/engine 依赖方向由静态规则保护；
- [ ] 所有 production consumers 使用 typed client；
- [ ] Synthesis Service 不属于 backend/provider registry；
- [ ] 没有 remote god object。

### 数据

- [ ] service 独占 production `synthesis.db`；
- [ ] service 独占 Topic canonical root；
- [ ] Topic files 是真源，Zotero mirror 有 receipt/diagnostic；
- [ ] plugin 不直接读写 DB/canonical root；
- [ ] 无 production dual-write；
- [ ] durable user decisions 迁移和恢复验证通过。

### 宿主

- [ ] service 不直接读 Zotero DB；
- [ ] 所有 Zotero reads/writes 经 bounded Host Capability；
- [ ] host writes 有 precondition、permission 和 receipt；
- [ ] host unavailable 不产生未受控副作用。

### 行为

- [ ] explicit operation 语义保留；
- [ ] cache readiness 与 operation status 分离；
- [ ] read 不触发 maintenance；
- [ ] reference refresh 仍为两阶段；
- [ ] graph/layout/matching 失败保留旧 projection；
- [ ] service unavailable 的 digest/topic 语义明确并测试；
- [ ] worker crash/hang/cancel 不破坏 DB、canonical current 或 previous projection；
- [ ] parent lease、有限重启和 crash-loop fuse 行为明确并测试。

### UI

- [ ] Zotero startup 不等待 service warmup；
- [ ] Workbench chrome/surface 分离；
- [ ] progress 不重建 content surfaces；
- [ ] unavailable/incompatible/degraded 可见且稳定；
- [ ] 不恢复 full snapshot hot path。

### 测试与性能

- [ ] contract、engine、service、adapter、cross-process、shell 测试通过；
- [ ] representative fixture parity 通过；
- [ ] target scale 使用分页/batch；
- [ ] 重计算不占用 Zotero UI 线程；
- [ ] 重计算不占用 Rust service 控制面；
- [ ] target tier worker 满载时 health、progress、cancel 和 shutdown 保持响应；
- [ ] normal/target/stress benchmark 记录 worker、memory、event-loop 和 serialization 指标；
  - 2026-07-17：canary、2k/20k boundary 和 normal 已记录；target/stress 在 768 MiB 隔离父进程内终止，等待有界 large-transfer layout 后继续，因此本项保持未完成。
- [ ] cutover/rollback/restore 演练通过。

### 清理与发布

- [ ] in-process adapter 删除；
- [ ] `getDefaultSynthesisService()` 删除；
- [ ] 插件内 service/repository/engine 旧实现删除；
- [ ] Node service/runtime/worker、D3 runtime 与 Node-only release workflow 删除；
- [ ] active docs/specs 与实现一致；
- [ ] package/release/fingerprint/upgrade smoke 完成；
- [ ] runtime provenance、许可证清单、SBOM、漏洞门禁和安全更新流程完整；
- [ ] offline clean machine、runtime corruption、partial upgrade、parent death 和 crash-loop smoke 完成；
- [ ] 包内及已解压 runtime 的 hash/signature 校验和上一版 rollback 通过；
- [ ] 每平台 runtime、五平台总量和最终 XPI 满足 15/75/100 MiB 硬预算；
- [ ] 无未解决的高风险项。

## 22. 第一阶段停止条件

以下情况出现时不得继续 cutover：

- Topic canonical/mirror 所有权再次出现冲突；
- service 尚需直接导入插件模块；
- 任一生产 consumer 仍绕过 client；
- remote API 需要传输无界整库数组；
- service/plugin 需要同时写 DB 或 canonical files；
- durable decisions 无可靠迁移/验证；
- packaged service 无法稳定启动或鉴权；
- launcher 仍依赖系统 Node/system Rust、PATH、npm/cargo 或用户 shell；
- Rust service 控制面仍执行 graph/matcher/layout 等长计算；
- worker 可以直接写 DB、canonical files 或调用 Host Capability；
- worker pool 没有有界并发、内存、取消和 crash isolation；
- runtime 缺少真实完整性验证、原子升级或 rollback；
- supervisor 无法防止孤儿 writer 或无限 crash restart；
- Rust 未先满足 language-neutral contract/corpus、五平台或包体门禁；
- production route 仍保留 Node fallback，或 Node/Rust 共享 live DB/canonical root/write lease；
- performance regression 无法解释；
- crash/staging 测试会破坏 current；
- rollback 尚未在生产副本上演练。

## 23. 实施后的阶段交接

第一阶段完成后，第二阶段可以把 plugin 中剩余的：

- `synthesisClient`；
- `synthesisServiceRuntime`；
- `synthesisHostAdapter`；
- Workbench host；
- Host Bridge/MCP proxies；

作为已经稳定的深模块边界，不再触碰 Synthesis 内部实现。随后再治理 hooks、`src/modules`、ACP/SkillRunner/workflow/bridge 和 Assistant Workspace。

这也是第一阶段最重要的长期价值：它不仅解决 Zotero UI 线程上的 Synthesis 重计算，还为未来 Electron shell 建立了第一条真实、经过生产验证的宿主无关边界。
