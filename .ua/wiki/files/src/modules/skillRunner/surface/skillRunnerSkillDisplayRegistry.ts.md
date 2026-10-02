
# src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/surface](../../../../../modules/src/modules/skillRunner/surface.md)
<!-- node: file:src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts -->

Skill 展示注册表：保存后端上报的 skill 展示名快照，避免每次渲染都往返后端。
源码：[src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts](../../../../../../../src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts)

## 符号（2）
<!-- node: function:src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts:hydrate -->
<!-- node: function:src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts:registerSkillRunnerSkillDisplaySnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| hydrate | 函数 | 20–47 | 简单 | skillrunner、registry、persistence | 1 | 从 prefs 载入展示快照到内存，解析失败时回退为空集合而不阻断启动。 |
| registerSkillRunnerSkillDisplaySnapshot | 函数 | 57–86 | 中等 | skillrunner、registry、persistence、core | 0 | 注册一份 skill 展示快照并持久化到 prefs，合并同名 skill 的最新展示信息。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerRunStore.ts](../run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| registerSkillRunnerSkillDisplaySnapshot | 函数 | 57–86 | 注册一份 skill 展示快照并持久化到 prefs，合并同名 skill 的最新展示信息。 |
