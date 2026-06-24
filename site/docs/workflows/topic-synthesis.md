# Topic 综合创建

## 用途

通过三步自动化流水线创建 Topic Synthesis（主题综合），对一组相关文献进行系统化分析和综合。

与 Synthesis Workbench 中的 Topic 创建流程对应，该 workflow 提供了从主题种子到完整分析报告的端到端处理。

## 适用场景

- 围绕一个研究方向创建综合性的主题分析
- 自动构建主题分类体系（Taxonomy）、关键声明、时间线和未来方向
- 生成结构化的综合分析报告

## 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | workflow（无需选中条目） |
| 触发方式 | Dashboard 中运行，或在 Synthesis Workbench 中触发 |

## 运行过程

该 workflow 由 **3 个顺序执行的 skill** 组成，自动接力完成：

```
1. create-topic-synthesis-prepare
   └── 接收主题种子
       └── 创建主题意图
       └── 构建文献工作集
       └── 准备分析上下文

2. topic-synthesis-core-enrichment
   └── 核心富化
       └── 编写 Taxonomy（分类体系）
       └── 构建 Timeline（时间线）
       └── 提取 Claims（关键声明）
       └── 分析 Future Directions（未来方向）
       └── 生成 Review Outline（综述大纲）
       └── 知识图谱补全

3. topic-synthesis-finalize
   └── 覆盖判定
       └── 生成外部上下文摘要
       └── 收藏建议
       └── 生成最终分析摘要
```

## 运行产物

执行完成后，主题综合的结果会写入 Synthesis 系统的持久化存储，并反映在 Synthesis Workbench 的 Topics 和 Graph 视图中。

具体产出包括：

- **Topic 元数据**：名称、描述、创建时间
- **Taxonomy**：层级化的主题分类体系
- **Timeline Events**：按时间线组织的重要事件
- **Claims**：提取的关键声明及其证据
- **Comparisons**：不同维度的对比分析
- **Future Directions**：未来研究方向建议
- **Coverage**：文献覆盖度分析
- **Report**：综合分析报告

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `topicSeed` | string | 主题种子，描述要创建的主题 | — |
| `language` | string | 输出语言 | `auto` |

### language 说明

- `auto`：自动检测（通常使用插件界面语言）
- `zh-CN`：中文
- `en-US`：英文

## 依赖

- **后端**：ACP 后端
- **Synthesis 系统**：需要 Synthesis Workbench 已初始化
- **库内文献**：建议已有足够的相关文献条目

:::tip 前置准备建议
在创建 Topic 之前，建议：
1. 确保相关文献已全部运行过 [文献分析](literature-analysis)
2. 确保相关文献已运行 [标签规范化](tag-regulator)
3. 在 Synthesis Workbench 的 Index 页面执行一次 **Advance Matching**（高级引用匹配去重）
4. 在 Review 页面处理好所有审批项（记得将 pending 的决策「应用」）

准确的引文图谱关系会直接影响 Topic 综合中文献重要程度的计算质量（PageRank、frontier score 等），进而提升 Topic 导览的整体质量。
:::

## 预估耗时

| 主题规模 | 预估耗时 |
|---------|---------|
| 小型主题（≤10 篇文献） | 8-12 分钟 |
| 中型主题（10-30 篇） | 12-18 分钟 |
| 大型主题（30+ 篇） | 18-25 分钟 |

如果文献数量非常多，建议先用更新功能增量迭代。

## 模型建议

🔴 建议使用**强文本理解能力 + 长上下文**的模型。Topic Synthesis 需要综合分析大量文献摘要、引文关系、标签和概念知识，属于计算密集型任务。如果后端支持 subagent 委派能力，多步 pipeline 可以更高效地执行。

## 相关工作流

- [Synthesis Workbench 概览](../synthesis/) — 综合工作台使用指南
- [论文写作框架](manuscript-literature-framing) — 基于 Topic 综合撰写论文引言
