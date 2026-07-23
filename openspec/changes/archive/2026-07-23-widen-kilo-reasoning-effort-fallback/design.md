## Context

当前 `isKiloNoneInvalidParametersFallback` 仅当 `value === "none"` 时触发回退。但 Kilo 后端实际返回的 `-32602` 错误可能对应任何不支持的 effort 值（如 "medium"）。需要扩展回退条件并在两条消费路径（ACP Chat、ACP Skills）上统一回退行为。

## Decisions

### 1. 回退触发条件扩展

- **原条件**: Kilo family + `thought_level` + `value="none"` + `RequestError(-32602)`
- **新条件**: Kilo family + `thought_level` + `RequestError(-32602)` + 错误消息匹配 `/effort/i`
- **理由**: `-32602` 是通用 JSON-RPC 无效参数错误码，可能由非 effort 原因触发（如 unknown category）。错误文本中的 "effort" 是可靠的语义信号，用于精确锁定 effort 相关拒绝。
- **函数重命名**: `isKiloNoneInvalidParametersFallback` → `isKiloEffortInvalidParametersFallback`

### 2. ACP Skills 路径回退行为变更

- **原行为**: `reasoningResult.kind === "fallback"` 时记录 `recordApplyFailure` 并 `throw`，中止技能运行
- **新行为**: 记录 `stage: "provider-profile-option-fallback"` 的 warn 级事件，不 throw，继续执行 prompt
- **理由**: 与 ACP Chat 路径行为对齐，且回退语义下缺少 effort 设置不应视为致命错误。模型将使用其默认推理强度。

### 3. ACP Chat 路径 diagnostic 消息更新

- **原消息**: `"Kilo rejected the None reasoning effort; retaining the model default."`
- **新消息**: `"Kilo rejected the reasoning effort; retaining the model default."`
- **理由**: 去掉 "None" 限定词，消息现在适用于任何被拒绝的 effort 值。

## Risks / Trade-offs

- Skills 路径不再 throw：如果未来有依赖 `throw behavior` 的代码路径，需要检查。当前 `runPrompt` 和 `recoverAcpSkillRunConversation` 两个调用方均无 try/catch 包围此代码，变更无影响。
- 错误文本匹配 `/effort/i` 可能匹配到非 effort 相关的错误消息。当前 Kilo 的 `-32602` 错误格式为 `"Invalid params: effort not found: {value}"`，`/effort/` 精确匹配。如果 Kilo 未来改变错误消息格式，需同步更新正则。
