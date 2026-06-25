# Tag Regulator

## 这个 Workflow 做什么？

基于已创建的受控标签词表，对选中文献的标签进行**规范化清理**和**AI 智能推荐**。它会移除不合规范的标签，补充推荐标签，并建议可能的新标签供你审核。

## 前置准备

> **必须先有受控词表**。通过 [Tag Bootstrapper](../tag-bootstrapper/README.md) 创建词表，或在 Synthesis Workbench → Tags 页面手动定义。

> **建议**：如果这篇文章已经执行过 [Literature Analysis](../literature-analysis/README.md)，AI 会利用已有的摘要（digest）来提升标签推断质量。

## 怎么输入？

- **选中父条目**：在 Zotero 条目列表中选中一个或多个条目，右键运行此 workflow
- 插件从每个父条目提取：当前标签、元数据（标题、作者、摘要）、以及已有的 digest（如有）
- **不会自动跳过**：即使条目已有标签，仍会执行规范化

## 执行方式

提交后**自动执行**，后端处理完成后**可能会弹出对话框**：如果 AI 建议了新标签（不在当前词表中），会弹出审核对话框让你决定是否加入（10 秒倒计时自动暂存）。没有新建议时静默完成。

## 需要多长时间？

| 场景 | 单篇预估耗时 |
|------|-------------|
| 无摘要（未执行 Literature Analysis） | 约 1 分钟 |
| 有摘要（已执行 Literature Analysis） | 1-3 分钟 |

如果条目已有 digest，AI 会将摘要作为额外上下文输入，推断更精准但耗时更长。

## 产出什么？

### 1. 标签变更（自动应用）
- **remove_tags**：从条目中移除不在词表的标签
- **add_tags**：向条目添加推荐的规范标签
- 直接应用到选中的 Zotero 条目

### 2. 建议标签（弹窗审核）
- AI 提议的新标签通过弹窗展示
- **加入**：直接添加到受控词表
- **暂存**：存入暂存区，稍后在 Tags 页面审核
- **拒绝**：忽略
- 支持批量全部加入/暂存/拒绝

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `infer_tag` | boolean | `true` | 是否让 AI 推断新标签 |
| `valid_tags_format` | string | `yaml` | 词表格式，可选 yaml / json / auto |
| `tag_note_language` | string | `zh-CN` | 建议标签的说明语言 |

## 模型建议

🟢 轻量模型即可——标签规范化本质上是简单的分类和匹配任务，不需要最强模型。

## 依赖

- **受控词表**：需要先有词表
- **后端**：Skill-Runner
- **Skill**：`tag-regulator`

## 相关 Workflow

- [Tag Bootstrapper](../tag-bootstrapper/README.md) — 创建受控标签词表
- [Literature Analysis](../literature-analysis/README.md) — 分析时可自动级联标签规范化
