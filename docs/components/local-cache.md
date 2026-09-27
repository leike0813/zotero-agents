# Local Cache 组件说明

## 目标

用于缓存重复请求的结果，减少重复执行成本。当前版本仅保留占位设计，暂不实现具体逻辑。

## 职责（占位）

- 定义缓存键与缓存数据结构
- 记录输入摘要与输出结果映射
- 提供命中查询与失效策略

## 输入

- `Selection/Context` 输入摘要
- `Workflow` 与 `parameters`

## 输出

- 缓存命中结果（例如 ProviderExecutionResult / 衍生结果快照）
- 未命中（继续执行）

## 缓存键（建议）

```
cacheKey = sha256(inputs) + workflowId + normalizedParameters + inputFlags
```

## 行为与边界

- 当前阶段：仅文档设计，暂不实现
- 后续可选：内存缓存 / 本地文件缓存 / Zotero prefs 持久化

## 测试点（TDD）

- 缓存键一致性
- 命中/未命中分支
