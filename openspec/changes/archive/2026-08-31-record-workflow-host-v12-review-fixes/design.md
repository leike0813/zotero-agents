## Context

本 change 是审计记录型 change：动机与验证结果见 proposal.md 的 Why。架构审阅的固定对照基线是 `artifact/workflow-host-v12-architecture-decisions.md`（ADR），审阅范围是 61bf8772 以来的 Workflow Host v12 系列改动（15 提交、429 文件）。实施已完成，本文档记录关键修复的设计决策，以及为什么部分修复项不立 spec requirement。

ADR 与本仓库硬约束决定了修复的落点：`ZoteroHostCapabilityBroker` 是 host capability 语义的唯一事实源，Workflow Host 只做显式投影；`mutations` 写路径共用 mutation authority 的 reservation/receipt/attempt 语义；Synthesis sidecar 的 application/repository 分层各自持有 run 生命周期与持久化。

## Goals / Non-Goals

**Goals:**

- 让 main specs 准确描述已落地的 spec 级行为修正（fail-closed、coverage digest 确定性、错误 taxonomy、DTO 对齐、role 门禁、admission/幂等语义）。
- 记录每条修复归类的理由：哪些进 delta spec，哪些属于实现层缺陷修复。

**Non-Goals:**

- 不改任何已实现的行为；本文档不提出新设计。
- 不处理 ADR 中仍 deferred 的事项（如 §9.12 operation telemetry，仍留待后续 Synthesis operation/history 专项切片）。
- 不触及发布流程、Gitee 同步或 Host Bridge release。

## Decisions

- **Coverage digest 跨进程确定性**：插件侧 traversal 在 completion 时把已交付的 (ref, revision, tagDigest) tuple 缓冲后按 (libraryId, key) 码元序排序再哈希，而不是按分页交付顺序流式哈希。备选方案（要求分页本身按 identity 排序交付）会侵入 listItems 的分页契约且仍无法保证跨进程一致，被否决。跨语言一致性由两侧共用码元序比较（插件 `compareCanonicalTextCodeUnits`、contracts `rebuildAuditTags` 的严格升序校验）保证，Rust 侧补一致性单测。
- **Tag 读取 fail-closed 而非 fail-open**：写路径与 snapshot 序列化在 tag 读取失败/截断时拒绝，因为静默丢 tag 会把错误的 tagDigest 写进 mutation receipt 与 completion evidence，破坏 tag audit 的证据链。代价是以前"能跑通"的调用现在会失败——这是有意为之的硬切换。
- **重试形成 successor attempt 而非 replay**：`retry_same_operation` 语义承诺的是"重新执行同一 operation"，返回陈旧 failed terminal 等于把恢复契约变成永久失败缓存。删除记录重跑保持了 operationId + semantic input 的幂等键不变（不同 input 仍以 idempotency_conflict 拒绝）。
- **Attachment ordinary-role 门禁放在 mutation 入口而非各 operation 内部**：updateMetadata/replaceFile/move/remove 共用同一段 ref 解析，在解析后立即检查 role，避免四条路径各自特判；note_image/note_payload 的写入仍由 notes/upsertPayload 等命名接口拥有。
- **Synthesis 错误归一化在 facade 边界一次完成**：sidecar 的 reason/code 是内部机制（ADR §9 明确 repository/lease/fencing/telemetry 不外泄），facade 用固定映射表把已知 token 译成 stable conflict reason，未知错误统一落 `execution_failed`；details 只含映射后的 taxonomy 字段。
- **卡死 run 回收用 begin 携带 active set**：facade 进程内维护 activeTagAuditRunIds 并串行化 begin，sidecar repository 在 admit 前 abandon 同 host 不在 active set 中的 run。备选方案（lease 超时自动回收）需要 sidecar 引入时钟语义并改变 fencing 模型，超出本次修复范围。
- **scoped hostApi 晚绑定 defaultControl/inputScope**：runtime 每次 hook run 新建 AbortController 并在叶子 scope 内组合 scoped host，符合"Workflow Host runtime adapter 必须按调用晚绑定"的硬约束；显式 control（含 `{}`）优先于默认。

### 实现层修复（不立 spec requirement）的归类理由

- **withItemSnapshot 改用注入 broker 的工厂**：组合根内部接线变化，closed composition root 的 spec 要求（显式字面量投影、禁止 spread/proxy）不变，公开 identity 与调用方行为不变。
- **workflows_builtin 消费方迁移（interactionMode、archive v12 调用形态）**：`interactionMode` 元数据与 archive v12 签名在既有 spec 中已声明，内置包改为按既有契约调用属于消费方缺陷修复；archive 成员的契约面由新增 requirement 覆盖。
- **静态门禁补强（test/node/core/187 forbidden 列表、删除死调用）**：测试基础设施演进，不改变系统行为。
- **低危清扫（删除空实现/死代码 export、zipBundleReader 收编 platform subprocess seam、ensureFileFromPath 改经 runtimePersistence、旧 tasks.md 状态更正）**：均为删除死代码或既有 adapter 选择规则的落实，`runtimePersistence` 作为 adapter 选择唯一事实源的约束已在项目硬约束中，无需新增 requirement。
- **Traversal 交付前 revision 二次读取删除（TOCTOU）与跨语言码元序统一**：已并入 MODIFIED 的 traversal requirement（同一 read 交付 revision、码元序确定性），不单列。
- **host-bridge capabilities.v2.json 与 materialized surfaces 同步、test fixture 更新**：属于 snapshot item DTO requirement 的契约发布物同步，不单独立 requirement。

## Risks / Trade-offs

- [Fail-closed 使部分先前可用的调用路径开始失败] → 这是 ADR 要求的语义；内置包与测试已同步验证全绿（3214+254 TS、96+61 Rust），无已知受影响工作流。
- [Coverage digest 算法变更使新旧 digest 不可比] → digest 只在单次 audit run 的证据链内消费，无跨版本持久化比较场景。
- [码元序依赖 JS 字符串 `<`/`>` 的 UTF-16 语义与 Rust 侧一致] → 由 contracts 的严格升序校验与 Rust 一致性单测锁定。

## Migration Plan

无部署或数据迁移：实施已合入并验证，本 change 仅记录。归档时按 delta 同步 main specs（MODIFIED 的 traversal requirement 全量替换，ADDED 的八条 requirement 追加）。
