# Design

## Context

动机见 proposal.md。受影响链路跨越 Host managed artifact read、Synthesis 共享适配层、深读 runtime 和 Rust Citation Graph read surface。本 change 补记已完成的修复，不重新定义现有领域边界。

规范 digest read 返回 `{ markdown }`。既有 adapter 将其作为字符串消费，最近四次运行的输入 `digest.md` 已包含 `[object Object]`。topic 查询发出 `paper_ref`，而当前 codec 要求 `paper_refs` 数组。排查中的图快照有 80 个节点、79 条边；持久化布局只覆盖其中 13 个节点、12 条边，包含当前论文，完整覆盖要求使整个布局结果为空。

## Goals / Non-Goals

**Goals:** 在数据拥有者处修复读取契约；保留默认调用方行为、内容身份、当前 graph basis 和有界读取；允许深读展示已有有效坐标覆盖的子图。

**Non-Goals:** 重新生成已有 HTML、计算或补造布局、扩展 topic 选择产品流程、变更存储格式、发布原生二进制或插件。

## Decisions

### 在共享 adapter 投影规范 digest 正文

`libraryAdapter.ts` 读取 payload 的 `markdown` 字符串，缺失或类型错误继续走 `decode_error`。扫描与定位读取使用同一内容投影，因此描述器和 hash 保护继续覆盖真实正文。未采用渲染端替换 `[object Object]`：此时源 bundle 已丢失正文，替换无法恢复内容。

### topic 查询和选择沿用当前 Host 契约

runtime 发送 `paper_refs: [paperRef]`，查询失败保留诊断，与成功但无关联区分。单候选作为默认 topic，多候选要求 Agent 提供 `selected_topic_id`；Skill 指引请求可用的 topic context。最终是否展示 timeline 取决于实际可用数据，不把查询失败推断成无关联。

### stale 坐标读取显式启用

TS 类型、JSON schema 和 Rust 请求解析共同声明 `allowStale?: boolean`，默认 false，深读请求 true。application/repository 继续使用短 reader transaction、当前 read-view basis 校验和有界节点读取，只投影请求节点中有限且有效的持久化坐标。

布局未满足当前完整性时仍返回 `status: "stale"`、`layout_status: "stale"`、`ok: false`；允许读取不等于重新宣称 ready。legacy 非规范布局保持原处理。未采用全局放宽 ready 条件，以免改变 Workbench 的默认行为。

### 在深读视图取可绘制交集

runtime 将当前快照节点与有效坐标按节点 id 相交，仅保留两端均在交集中的边；没有可绘制节点时省略图区域。保留原始布局及诊断，不触发布局计算或写入。此处选择部分展示，避免已有有效数据因覆盖不全全部消失。

## Risks / Trade-offs

- stale 坐标可能降低当前拓扑的空间可读性 → 显式启用并保留 stale 状态，仅展示真实持久化坐标。
- 旧产物中的正文已经丢失 → 修复不会回写旧 HTML，需要重新运行深读。
- Windows 已映射的生成 JS 阻止一次原地覆盖测试 → 已用隔离源码快照验证双次生成的 23 个文件确定性及与内置包一致性，保留原测试失败记录。
- 本地源码验证不等于插件交付验收 → 后续构建先运行项目 build preflight；本次未做 XPI 构建或 Zotero 实机验收。

## Migration Plan

无需存储迁移。源码、内置 Skill 生成包和主规格已经同步；后续按既有原生运行时和插件构建流程交付。回退时调用方可省略或关闭 `allowStale` 以采用默认严格读取。受污染的深读产物在更新后重新生成。
