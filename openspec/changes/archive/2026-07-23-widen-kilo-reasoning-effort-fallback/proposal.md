## Why

Kilo ACP 后端拒绝不支持的 `thought_level` 值时返回 JSON-RPC `-32602`（Invalid params），错误消息格式为 `"effort not found: {value}"`。当前回退逻辑仅对 `value="none"` 生效，但 Kilo 实际也会拒绝 "medium" 等值。用户选择 "medium" 后，ACP Skills 执行会直接抛出异常中止，ACP Chat 也会因未命中回退而抛出错误。需要将回退触发条件从仅匹配 `none` 扩展为匹配任何被 Kilo 以 `-32602` 拒绝且错误文本含 "effort" 的 effort 值。

## What Changes

- **MODIFIED** `acp-model-effort-selector`: 将 "Kilo none falls back" 场景扩展为任意 effort 值被拒绝时的回退，增加错误文本匹配条件
- **MODIFIED** `acp-skillrunner-compatible-runner`: 将 `thought_level=none` 回退扩展为任意 `thought_level` 值的回退，回退时记录诊断事件而非 throw
- `acpReasoningEffortFallback.ts`: `isKiloNoneInvalidParametersFallback` 重命名为 `isKiloEffortInvalidParametersFallback`，移除 `value="none"` 硬编码，新增 `/effort/i` 错误文本匹配
- `acpSkillRunnerOrchestrator.ts`: Skills 路径回退时不再 throw，改记录诊断事件并继续执行
- `acpSessionManager.ts`: 更新 diagnostic 消息去掉 "None" 限定词

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `acp-model-effort-selector`: 扩展 "Kilo none falls back" 需求为通用 effort 回退，新增错误文本匹配条件
- `acp-skillrunner-compatible-runner`: 扩展 `thought_level=none` 回退为任意 `thought_level` 值回退，统一回退行为为诊断记录而非抛错

## Impact

- `src/modules/acpReasoningEffortFallback.ts`: 核心回退判断逻辑
- `src/modules/acpSkillRunnerOrchestrator.ts`: Skills 路径回退消费
- `src/modules/acpSessionManager.ts`: Chat 路径回退消费
- `test/core/96-acp-session-manager-runtime-options.test.ts`: 新增 2 个测试用例
