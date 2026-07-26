## Why

ACP Chat Replay 的 `target-active` surface 通过普通 conversation selector 激活 synthetic owner，导致不存在于 backend registry 的 `acp-replay` 在 profiler、trace、R2 与 drain 启动前被拒绝。首次 lifecycle 修复后，真实 Zotero matrix 又证明 Workspace backend preload 会通过 registry refresh 覆盖已经激活的 synthetic foreground，冷 Workspace 的首次 forced publication 也可能被并发 init build 淘汰后永久等待。现有 matrix v2 还会把 setup 失败级联成缺失测量，并可能把零事件精确相等误报为 R1 captured，因此需要把 synthetic selection 纳入 Replay target 生命周期、让 lease 在 registry refresh 中保持所有权、使 publication ack 可重试，并保留准确的阶段化失败证据。

## What Changes

- 为每个 Replay target 增加显式、幂等的 activation 生命周期，并固定 create、activate、Workspace prepare、profile、replay/R2、drain、finish、cleanup 的顺序。
- 为 ACP Chat 增加仅限 debug/replay source 的 synthetic activation lease；该路径绕过 backend registry 与 transport 创建，保存并按 owner/token 安全恢复原 foreground selection。
- 有效 synthetic lease 期间，正常 backend registry refresh 继续刷新真实 backend 缓存，但不得覆盖或持久化 lease 所有的 foreground selection。
- Workspace diagnostics publication 在冷启动构建被淘汰或未产生 revision 时串行重试幂等 forced publication，直到 render acknowledgement 或终止条件。
- 将 Chat 与 Workflow synthetic owner identity 收敛为 Replay target 的单一事实源，并保持现有 owner 格式。
- 扩展 matrix v2 的结构化 failure phase、cleanup warning 和 `not-run` 证据，阻止 setup 失败产生 R1 零事件 captured 假阳性。
- 保持普通 ACP Chat selector 对不存在 backend 的 fail-closed 行为，以及 Replay-disabled/production bundle 的零字节剔除约束。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-runtime-replay-profiler`: Synthetic target activation/restore 生命周期、setup 失败阶段证据、严格 R1 captured 判定与 release-elision 要求。

## Impact

影响 ACP runtime Replay targets、Chat session manager 的 debug-exclusive synthetic seam、matrix v2 runner/report contracts、相关 core/node/UI 测试和 profiler 规格。不会注册虚假 backend、启动真实 adapter/transport、修改 trace NDJSON 或改变真实 ACP Chat selection 行为。
