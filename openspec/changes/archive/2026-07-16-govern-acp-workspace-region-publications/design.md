## Context

Assistant Workspace 当前以 panel snapshot 为主要 host-to-child 发布单位。ACP Chat 的 typed panel change 虽然已经比通用 frontend subscription 更精确，但 message-count 与 transcript 高频变化仍会进入完整 snapshot 的 prepare、signature 与 post 路径。host 签名对整份对象 stringify，排除字段名又与真实 `selectedTranscriptPage` 不一致；child 只能在收到整份 snapshot 后尝试用 transcript revision 避免局部重绘。这使发布成本、跨 tab 工作和 DOM identity 风险发生在 child guard 之前。

R3 profiler 目前把 full-snapshot signature 输入 bytes 当作主要体量证据，无法区分实际 posted payload；生命周期也没有完整覆盖 source guard、shell forward、child apply 与 render acknowledgement。本 change 需要同时建立可执行的区域协议和可信测量，否则无法证明治理效果。

约束包括：Zotero 7/9 插件环境不能依赖 Node.js API；transcript 首屏必须 owner-first、loading-first、page-first；live/prompting mirror 必须 pinned；cold cache 不是正确性 SSOT；Chat 与 Skills 不能互相触发 snapshot；外部 API、store 格式与 workflow 协议保持不变。

## Goals / Non-Goals

**Goals:**

- 在 domain change 到 child renderer 之间建立 owner-scoped typed region publication。
- 在构建 DTO 前丢弃 inactive source 和 owner mismatch，在 post 前用区域 DTO 的稳定 signature 去重。
- 让 transcript-only 与 message-count-only change 不执行 baseline/full snapshot prepare、signature 或 post。
- 让 shell 只转发 publication，让 child 仅更新目标 managed region，并返回可归因的 render acknowledgement。
- 让 R3 profiler/replay 分别记录 lifecycle counts、causality、signature input bytes、posted bytes 及 count/totalMs/maxMs。
- 保持 Chat 既有流式、边界、交互、终止和 owner 切换语义，并只对 Skills 做共享协议适配与回归保护。

**Non-Goals:**

- 不治理 R1 diagnostic/persistence 或 R2 Host socket reader。
- 不重写 transcript store、分页缓存、full mirror hydrate 或 cold LRU。
- 不做无关的 Skills 性能重构。
- 不把 logical cadence wall time 解释为真实 Zotero 卡顿。

## Decisions

### 1. Domain change 与 publication 使用两个独立 discriminated union

`AcpRuntimeDomainChange` 描述 runtime 发生了什么：`baseline-status`、`message-counts`、`transcript`、`plan`、`permission`、`reply-hint`、`context-details`。`AssistantWorkspacePublication` 描述 UI 要发布什么，并只携带该区域渲染所需 DTO。二者分离使 domain routing 不依赖当前 DOM 结构，也避免泛化 reason 回退到整面板 snapshot。

备选方案是继续在 full snapshot 上增加忽略字段。该方案仍需构建、读取 transcript page 和序列化整份对象，不能满足 dropped-before-build 和实际 payload 归因，因此不采用。

### 2. Owner 与 revision 是 publication envelope 的一等字段

`WorkspacePublicationOwner` 对 Chat 使用 `backendId + "\n" + conversationId`，对 Skills 使用 `requestId`。每个 publication 包含 kind、owner、revision 与 region DTO；host、shell、child 都验证当前 source/owner，child 对同 owner 拒绝旧 revision。owner 切换先发 loading-first/empty transcript publication，再异步读取 indexed page 或 hydrate mirror。

首次初始化和真实 tab activation 作为显式 baseline init publication 计数，不混入 steady-state change。

### 3. Guard 顺序固定且尽可能靠前

数据流为：

`domain change → source/owner guard → region DTO → region signature guard → shell → child region renderer → render ack`

source inactive 或 owner mismatch 必须在 transcript page read、DTO 构建与 serialization 之前返回。signature 直接针对待发送的 region DTO；相同 owner/kind/signature 在 prepare/post 前跳过。强制 init/activation 可绕过相同 signature，但必须单独归因。

### 4. Baseline/chrome DTO 明确排除 transcript 易变状态

baseline/chrome 不含 `selectedTranscriptPage`、transcript revision、streaming chunk/event count、message-count revision 或 transcript loading。toolbar、banner、plan、hint、reply、context drawer、details drawer、permission drawer 各自维护仅包含用户可见内容与 open/collapsed 状态的 signature。message counts 若可见则使用独立 region DTO，不借用 metadata/status baseline。

### 5. Shell 无状态转发，child 以现有 DOM region 为边界 apply

shell 不缓存或合并 transcript 与 chrome，只校验 envelope 并转发给当前 child。Chat/Skills child 用现有 region renderer 更新目标 DOM；未命中的 publication 不得 clear/rebuild Runner pane 或其他 managed region。实际 apply 完成后 child 返回 `WorkspacePublicationAck`，包含 owner、kind、revision/signature 和 `shell-receive`、`child-apply`、`render-complete` 阶段。

### 6. Profiler 记录真实 lifecycle，而非 profiler-only full stringify

R3 每类 publication 分别记录 requested、dropped-before-build、prepare、signature-skip、post、shell-forward、child-apply、render-ack，并标记 matching-target、opposite-active、inactive-source。bytes 分为 region signature input bytes 与实际 post envelope bytes；duration 聚合分别输出 count、totalMs、maxMs，不再以累计值冒充单次 duration。

Replay 只有在 required host/shell/child/render-ack 家族完整时标记 R3 captured。closed 应无 R3，open-inactive 可记录 target change 的 dropped-before-build 但不得构建 matching/opposite publication，target-active 必须形成完整 ack 链。

### 7. Replay drain 以宿主 acknowledgement ledger 为完成边界

host 为已 post 的 publication 维护有界 lifecycle ledger；强制诊断发布返回准确 publication ID。drain 只有在该 ID 完成 `render-complete applied` 且同 tab 没有更早的 pending publication 时才能成功，不再用 child 收到 delivery revision 或单个 animation frame 近似渲染完成。

Profiler 在独立的有界 lifecycle sidecar 中记录 publication ID 与 post、shell-forward、child-apply、render-ack 阶段；普通 metric series 继续按 kind、causality、phase 聚合，避免 publication ID 造成高基数 series。Replay completion 按 ID 集合精确匹配各阶段，上一轮迟到 acknowledgement 不得补足下一轮缺口。

shell 对被新 generation 取代的 identified cache 发布显式 `superseded` 终态；drain 对 owner-first 切换期间的瞬时 `old-owner` 或 `superseded` 结果执行有界、单飞重试。Chat 与 Skills child 对同一 animation frame 前收到的 full snapshots 使用有序队列。已经 post 并获得 publication identity 的 snapshot 不得在 shell cache 或 child pending state 中被静默覆盖。

## Risks / Trade-offs

- [区域 DTO 拆分遗漏可见状态，造成 UI 不刷新] → 先用现有 snapshot 测试锁定可见行为，再逐区域迁移；未知结构性 change 保留显式 baseline-status，而不是泛化 reason fallback。
- [多阶段 ack 在 disabled diagnostics 下污染热路径] → ack sidecar 沿用 profiler/replay 的构建期 source gate；正常发布协议只保留必要 owner/revision 字段。
- [publication identity 形成高基数 profiler series] → identity 存入独立且有界的 lifecycle sidecar，报告指标仍按稳定区域标签聚合。
- [owner 切换与异步 transcript read 竞态] → owner-first publication 同步更新选中 owner，后续 page/hydrate publication 带 owner/revision 并在 child 拒绝旧值。
- [signature 计算仍可能昂贵] → 只序列化有界 region DTO，并在其前执行 source/owner guard；profiler 分别量化 prepare、signature 与 post。
- [Chat/Skills 共享协议导致范围扩张] → 共享 envelope/type/ack，Skills 仅适配现有区域发布入口和 identity 回归，不重构其 store/read model。

## Migration Plan

1. 增加协议、profiler lifecycle 与测试，在旧发布行为下采集 corrected pre-governance live Chat 基线。
2. 拆分 Chat domain change routing 和 host region builders，保留显式 init/activation baseline。
3. 改造 shell 与 Chat/Skills child apply/ack，迁移 managed region signature guard。
4. 更新 replay completion/报告与审计工件，采集同 provenance after 矩阵。
5. 运行 Node/Zotero 相关测试、lint、build 与严格 OpenSpec 校验；真实 Zotero 7/9 formal run 在可用宿主中完成。

实现可按 change 整体回滚；没有持久化迁移或外部协议迁移。

## Open Questions

无阻塞问题。真实 Zotero 7/9 recorded-cadence formal run 依赖可用宿主，将在自动化机制验证后作为宿主验收证据执行或明确标记未执行。
