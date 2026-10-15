# Proposal

## Why

文献深读将规范 digest payload 隐式转换为字符串，导致 Summary 显示 `[object Object]`；topic 查询字段错误和不完整布局被整体丢弃，又使已有 timeline 与 citation graph 无法嵌入。需要恢复“有可用数据就嵌入，没有就省略”的行为，并保留共享读取层的身份校验与默认布局读取语义。

## What Changes

- 共享 Host read adapter 从规范 digest payload 的 `markdown` 字段读取正文，保留描述器身份、hash 保护与错误语义。
- 深读 topic 查询使用 `paper_refs` 数组；单候选自动选定，多候选由 Agent 选择，有可用 timeline 时嵌入。
- Layout read 增加默认关闭的 `allowStale`，深读显式开启；在有界、basis 校验的读取中返回已有有效坐标，并保留 stale 状态。
- 深读只绘制当前子图与有效坐标的交集及端点闭合的边；无可绘制节点时省略区域。
- 同步 Skill 源码、内置生成包、相关主规格与项目约束。

本 change 补记已经完成的实现与主规格同步；任务状态按已有验证证据记录。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `literature-deep-reading-skill`：规范 digest 正文读取、topic 查询及 timeline 选择、部分或 stale 布局嵌入。
- `synthesis-native-citation-graph-surface`：显式接受 stale 坐标的有界布局读取，默认严格行为保持不变。

## Impact

- 涉及 `src/modules/synthesis/libraryAdapter.ts`、深读 runtime/Skill 模板及生成包、Synthesis TS/JSON 契约、Rust application/repository/runtime 和既有回归测试。
- `allowStale` 是可选请求字段；Workbench 未启用时沿用默认行为。无需存储迁移，不重算布局，不补造坐标。
- 现有损坏 HTML 需要重新生成。此次未进行插件/XPI 构建、Zotero 实机验收、发布、提交或归档；后续插件构建仍须先执行 build preflight。
