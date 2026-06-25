# 论文写作框架

## 用途

辅助撰写学术论文的 Introduction（引言）和 Related Work（相关工作）部分。通过交互式对话明确论文定位，收集相关文献，分析写作框架，生成 LaTeX 草稿。

## 适用场景

- 撰写论文初稿，需要梳理文献框架
- 确定论文的定位和创新点
- 生成 Introduction 和 Related Work 的 LaTeX 草稿

## 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | workflow（无需选中条目） |
| 触发方式 | Dashboard 中直接运行 |

## 运行过程

该 workflow 为交互式执行，按以下阶段推进：

```
1. 论文信息确认
   └── 确认论文标题和研究范围
       └── 明确目标期刊/会议和写作风格

2. 材料收集
   └── 从 Zotero 库检索相关文献
       └── 获取文献元数据和引用信息

3. 多角度框架分析
   └── 分析论文在领域中的定位
       └── 识别可用的写作角度和叙事线

4. 写作计划
   └── 生成 Introduction 结构计划
       └── 生成 Related Work 组织方案

5. 草稿生成
   └── 输出 Introduction LaTeX 草稿
       └── 输出 Related Work LaTeX 草稿
       └── 附带引用映射和证据清单
```

### 交互说明

- 每个阶段需要用户确认后再推进
- 用户可以在对话中调整方向
- 可在 Dashboard 中查看进度

## 预估耗时

取决于对话轮数和文献库规模。AI 分析阶段约 5-10 分钟，加上各阶段的用户确认时间。

## 运行产物

执行完成后，产物可通过 Apply Result 钩子写入 Zotero（作为笔记）或下载：

| 产物 | 格式 | 说明 |
|------|------|------|
| `introduction.tex` | LaTeX | Introduction 草稿 |
| `related-work.tex` | LaTeX | Related Work 草稿 |
| `framing-analysis.json` | JSON | 多角度框架分析 |
| `writing-plan.json` | JSON | 写作计划 |
| `evidence-inventory.json` | JSON | 证据/引用清单 |
| `citation-map.json` | JSON | 引用映射关系 |
| `intent-brief.json` | JSON | 论文定位摘要 |

:::tip 产物获取
生成的 LaTeX 草稿等产物可在 **Dashboard 的产物区**找到。你可以直接将产物放入你的 LaTeX 文稿，或导出后进一步加工。
:::

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `paperTitle` | string | 论文标题 | — |
| `language` | string | 输出语言 | `auto` |
| `targetVenue` | string | 目标期刊/会议（可选） | 空 |
| `articleType` | string | 文章类型 | `original research` |
| `stylePreference` | string | 写作风格偏好（可选） | 空 |

### 写作风格示例

- `concise`：简洁风格
- `IEEE-like`：IEEE 风格
- `Nature-like`：Nature 风格
- `Chinese draft`：中文草稿

## 依赖

- **后端**：ACP 后端
- **Zotero 库**：需要库内有相关文献条目

:::tip 推荐工作流程
要获得最佳效果，建议在运行此 workflow 前完成以下准备：
1. 收集并入库足够的相关文献
2. 对所有文献执行 [文献分析](literature-analysis) + [标签规范化](tag-regulator)
3. 在 Synthesis Workbench 中执行 Advance Matching 并处理审批项
4. 创建几个相关的 [Topic 综合](topic-synthesis)
:::

## 模型建议

🟡 建议使用**长上下文**模型。撰写 Introduction 和 Related Work 需要整合大量文献的摘要、引文分析和 Topic 综合结果，对上下文窗口有较高要求。

## 相关工作流

- [文献分析](literature-analysis) — 为文献建立结构化知识基础
- [Topic 综合创建](topic-synthesis) — 先创建主题综合，再基于分析结果撰写论文
