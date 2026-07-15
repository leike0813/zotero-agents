## Why

ACP Chat 与 ACP Skills 的 publication 治理方向需要继续统一，但 Round2 只共享了协议骨架，仍保留了 `selectedTranscript`、`selectedTranscriptPage` 与 `transcriptState` 等分叉词汇，并以完整 page 反向 diff 生成 steady mutation。结果是共享 receiver 写入 Skills 字段而 Chat 永久 loading、Skills Replay 不释放 boundary 文本、真实 ACK/rebase 链不闭合，且 Chat 性能仍随累计 transcript 增长。

## What Changes

- **BREAKING**：以内部 v3 publication 协议原子替换现有 Workspace typed publication；Host、Shell、Chat child、Skills child 同时迁移，不提供旧字段 decoder、alias、双写或 full-snapshot fallback。
- ACP Chat 与 ACP Skills 使用同一个 `AssistantWorkspaceTranscriptRegion`、owner/page/request、item/mutation、publication 与 ACK 字段词汇。
- 从 Workspace 生产代码彻底删除 `selectedTranscript`、`selectedTranscriptPage` 与 `transcriptState`，并消除 page 级 `requestId`、无作用域 `revision` 和重复 publication identity 字段。
- 在两侧 store event seam 直接投影共享 UI mutation；steady transcript 不再读取完整 page、索引或反向 diff。
- 共享 projection、coordinator、Shell typed in-flight delivery、receiver、page request action、ack/rebase 与 profiler 状态机；surface adapter 只负责 owner、store item/page 转换和文案/action。
- 以参数化 production-adapter conformance、字段词汇 guard、真实 Shell ACK 链和双 surface Zotero Replay 作为原子验收门禁。

## Capabilities

### New Capabilities

- `assistant-workspace-publication-data-plane`: 定义 Chat/Skills 唯一 v3 publication 词汇、transcript region、producer mutation、coordinator、delivery、receiver 与 ACK/rebase 契约。

### Modified Capabilities

- `assistant-workspace-ui-refresh-governance`: 要求两侧共享同一 transcript region 与状态机，禁止 surface 字段别名、重复状态机和 steady full snapshot fallback。
- `acp-chat-performance-ui`: 要求 Chat steady transcript/count publication 使用 producer-native mutation 与共享协议，成本不随累计 page/text 增长。
- `acp-chat-file-backed-transcript-state`: 将 Chat owner-first/page-first read model 收敛到统一 transcript region，不暴露 Chat 专属 lifecycle 字段。
- `acp-skill-run-file-backed-runtime-state`: 将 Skills transcript/progress/runtime-options 收敛到同一 region vocabulary，并在 Replay hard boundary 释放共享 mutation。
- `acp-runtime-performance-profiler`: 使用与 v3 wire 相同的 surface/form/cause/revision 语义，并观测禁止的 materialization。
- `acp-runtime-replay-profiler`: 以精确 publication barrier 和完整 ACK identity 链验收两个 surface。

## Impact

影响 Assistant Workspace 内部 publication schema、Chat/Skills panel read model与producer、Shell/child消息、shared transcript renderer、Replay target/sidecar、profiler聚合、相关Node/Zotero测试与性能文档。不会修改Chat conversation store、Skills run store、transcript JSONL/索引格式、外部API、用户设置或依赖。
