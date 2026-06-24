# Tag Bootstrapper

## 这个 Workflow 做什么？

与 AI 交互式地**创建或扩展**你的研究领域受控标签词表。AI 会根据你描述的研究方向，提议一套标签分类体系，你可以审核、调整，确认后写入 Synthesis 系统。

建议在首次执行 [Literature Analysis](../literature-analysis/README.md) 之前运行，为后续的自动标签规范化建立基础。

## 前置准备

无硬性前置条件。但如果你已经有库内文献可作参考，标签体系会更贴合实际需求。

## 怎么输入？

无需选中任何条目。从 Dashboard 中直接运行此 workflow 即可。

## 执行方式

**交互式**。运行后在 Dashboard 中与 AI 对话：
1. 描述你的研究领域和关注方向
2. AI 提议标签分类体系
3. 你审核、调整、增删
4. 确认后写入受控词表

可以随时调整方向，也可以参考已有文献的关键词来定义标签。

## 需要多长时间？

| 场景 | 预估耗时 |
|------|---------|
| 初次创建词表 | 3-8 分钟 |
| 追加标签 | 3-5 分钟 |

## 产出什么？

受控标签词表写入 Synthesis 系统。可在 **Synthesis Workbench → Tags** 页面查看和管理。词表中的标签会被 [Tag Regulator](../tag-regulator/README.md) 用于规范化和自动打标。

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tag_note_language` | string | `zh-CN` | AI 提议标签时使用的说明语言 |

## 模型建议

🟢 中等能力的模型即可胜任，无需最强模型。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`tag-bootstrapper`

## 相关 Workflow

- [Literature Analysis](../literature-analysis/README.md) — 分析时可自动级联执行标签规范化
- [Tag Regulator](../tag-regulator/README.md) — 对已有文献执行标签规整
