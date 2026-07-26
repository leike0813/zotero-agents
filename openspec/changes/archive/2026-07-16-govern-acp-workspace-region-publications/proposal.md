## Why

ACP Chat 的 live trace 在 target-active 表面会为高频 transcript 与 message-count 变化重复构建并发布整份 Workspace snapshot；一次现有 trace 产生 109 次完整 `prepare → signature → post`，并累计处理 6,265,747 bytes 的 signature 输入。现有签名还排除了错误字段 `transcriptPage`，没有排除真实字段 `selectedTranscriptPage`，因此既不能代表实际发布 payload，也不能可靠保护非 transcript 区域的 DOM identity。

## What Changes

- 将 ACP runtime UI change 分类为 baseline/status、message-counts、transcript、plan、permission、reply/hint、context/details，并在 source/owner guard 后只构建对应区域 DTO。
- 为 Assistant Workspace 定义 owner-scoped typed region publication；Chat owner 使用 `backendId + "\n" + conversationId`，Skills owner 使用 `requestId`。
- 在 host、shell 与 child renderer 建立区域级 signature、revision 和 owner guard，阻止 transcript-only/message-count-only 更新重建 chrome、Runner pane 或其他 managed regions。
- 为实际发送的 publication 增加 shell receive、child apply、render complete acknowledgement，并拒绝旧 owner 或过期 revision。
- 让 replay drain 等待准确 publication identity 的宿主 render acknowledgement，并隔离 prepare、warm-up 与后续 formal 轮次的迟到 acknowledgement。
- 修正 R3 profiler/replay 证据：分别记录 requested、dropped-before-build、prepare、signature-skip、post、shell-forward、child-apply、render-ack，区分 matching-target、opposite-active、inactive-source，并分别报告 signature input bytes 与 actual posted bytes。
- 以 live Chat trace 生成 corrected before/after 证据；logical cadence 只用于稳定计数与 bytes 对比，不解释真实宿主延迟。
- 保持 owner-first、loading-first、page-first、pinned live mirror、owner-scoped cold LRU，以及 ACP Skills 现有业务行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `assistant-workspace-ui-refresh-governance`: Workspace publication 从整面板 snapshot 刷新收敛为 owner-scoped typed region publication，并要求 managed region signature guard 与 render acknowledgement。
- `acp-chat-performance-ui`: Chat message-count 与 transcript-only change 不得触发 baseline/full snapshot 构建或发布，且必须保持非 transcript DOM identity。
- `acp-runtime-performance-profiler`: R3 profiler 改为按 publication lifecycle、因果标签、实际 DTO bytes 与 duration 聚合记录可信证据。
- `acp-runtime-replay-profiler`: Replay 仅在 host、shell、child 与 render acknowledgement 指标完整时声明 R3 captured，并提供同 provenance 的 live before/after 比较。

## Impact

- Host/read model：`assistantWorkspaceSidebar.ts`、`acpChatPanelReadModel.ts`、`acpSessionManager.ts` 的 UI change 路由与区域 DTO。
- Shell/child：Assistant Workspace shell、ACP Chat 与 ACP Skills child renderer 的 typed publication、区域签名和 acknowledgement。
- Diagnostics：ACP runtime performance profiler、replay profiler 与报告聚合。
- Tests/docs：现有 session manager、Workspace UI smoke、profiler/replay 测试，以及 R3 审计工件。
- 不改变外部 API、conversation/transcript store、工作流协议、用户配置或依赖。
