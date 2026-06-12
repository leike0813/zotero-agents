# 创建 Topic 综合

## 什么是 Topic Synthesis？

Topic Synthesis（主题综合）是对一组相关文献进行系统化分析和综合的过程。它通过 AI 工作流自动提取关键信息、识别主题结构、生成综合分析报告。

## 创建流程

Topic 的创建由 Workflow 驱动，是一个多步骤的自动化流水线：

```
1. create-topic-prepare
   → 收集文献数据，构建论文集
   
2. topic-synthesis-core-enrichment
   → 核心富化：提取信息、关联知识
   
3. topic-synthesis-finalize
   → 生成最终的分析产物和报告

（update-topic-synthesis-prepare 用于更新已有 Topic）
```

### 前提条件

- 已配置 [Skill-Runner 后端](../backends/skill-runner)
- 文献库中有相关论文
- 论文已生成了摘要（Digest）和引文分析（可选，推荐）

## Topic Inspector（主题检查器）

创建 Topic 后，在 Synthesis Workbench → Topics 页面可以查看和管理 Topic，每个 Topic 有完整的检查器页面：

### 各页面说明

| 页面 | 内容 |
|------|------|
| **Overview** | 主题概览：名称、描述、重要性、核心主张 |
| **Taxonomy** | 主题在 Topic Graph 中的位置和层次 |
| **Claims** | 该主题涉及的主要主张和发现 |
| **Compare** | 不同论文在该主题上的观点对比 |
| **Future Directions** | 未来研究方向建议 |
| **Coverage** | 论文覆盖度分析 |
| **References** | 该主题关联的参考文献列表 |
| **Report** | 完整的 Markdown 综合分析报告 |

## Topic Graph（主题图谱）

Topic Graph 是一个层次化的主题网络，展示主题之间的关系：

| 关系类型 | 说明 |
|---------|------|
| `broader_than` | A 是 B 的上位主题 |
| `related_to` | 两个主题相关 |
| `overlaps_with` | 两个主题有重叠 |
| `contrasts_with` | 两个主题形成对比 |

### 管理 Topic

- **创建新 Topic**：在 Topics 页面点击"创建"
- **编辑 Topic**：修改名称、描述、重要度等
- **关联论文**：向 Topic 添加或移除论文
- **浏览 Topic Graph**：查看主题间的关系网络

## 内建 Pipeline

| Workflow | 用途 |
|---------|------|
| `create-topic-synthesis-prepare` | 准备创建 Topic 的数据 |
| `topic-synthesis-core-enrichment` | 核心信息富化 |
| `topic-synthesis-finalize` | 生成最终结果 |
| `update-topic-synthesis-prepare` | 更新已有 Topic |
