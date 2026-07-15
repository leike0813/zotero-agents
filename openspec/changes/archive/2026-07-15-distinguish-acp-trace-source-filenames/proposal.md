## Why

ACP Chat 与 ACP Skills 目前生成相同 `acp-trace-<timestamp>` 形式的默认文件名，只看目录无法区分来源，Replay 结果名也因此缺少 source identity。已有真实工件已经同时包含两类 trace，现在需要让文件名直接表达来源并保持 Replay 级联命名一致。

## What Changes

- 默认 Chat trace 使用 `acp-trace-chat-<timestamp>-<nonce>.ndjson`。
- 默认 ACP Skills trace 使用 `acp-trace-skills-<timestamp>-<nonce>.ndjson`。
- Replay 继续以 trace basename 派生 sample，使新结果自然使用 `acp-replay-chat-*` 或 `acp-replay-skills-*`，不新增重复映射。
- 将现有 trace 和对应 Replay JSON/Markdown pairs 按 source kind 级联改名，不改写工件内容或 digest。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-runtime-semantic-trace`: 默认 trace 文件名必须包含 Chat 或 Skills source token。
- `acp-runtime-replay-profiler`: trace-derived sample 与 Replay artifact filename 必须保留 source token。

## Impact

影响 semantic trace recorder 的默认 stem、相关 core 测试、Replay artifact 命名规格，以及用户指定运行时目录中的 2 个 trace 与 8 个 Replay 结果文件。Trace schema、内容、digest、解析兼容性和 Replay 保存逻辑不变。
