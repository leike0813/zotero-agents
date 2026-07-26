## 1. 扩展回退触发条件

- [x] 1.1 重命名 `isKiloNoneInvalidParametersFallback` → `isKiloEffortInvalidParametersFallback`
- [x] 1.2 移除 `normalize(args.value) === "none"` 检查
- [x] 1.3 新增 `/effort/i.test(String(args.error.message || ""))` 检查

## 2. 统一 ACP Skills 路径回退行为

- [x] 2.1 将 `reasoningResult.kind === "fallback"` 分支从 `throw reasoningResult.error` 改为记录 `stage: "provider-profile-option-fallback"` 的 warn 级事件
- [x] 2.2 移除 `recordApplyFailure` 调用

## 3. 更新 ACP Chat 路径 diagnostic 消息

- [x] 3.1 将 `"Kilo rejected the None reasoning effort"` 改为 `"Kilo rejected the reasoning effort"`

## 4. 测试

- [x] 4.1 新增 "keeps Chat effort when Kilo rejects medium" 测试
- [x] 4.2 新增 "throws when Kilo returns -32602 for non-effort config error" 测试
- [x] 4.3 确认现有 "keeps Chat effort when Kilo rejects none" 测试继续通过

## 5. 验证

- [x] 5.1 `tsc --noEmit` 类型检查通过
- [x] 5.2 ESLint 通过
- [x] 5.3 全部 15 个 session manager runtime options 测试通过
