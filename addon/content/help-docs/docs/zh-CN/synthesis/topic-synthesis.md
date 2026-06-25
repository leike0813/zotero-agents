# 创建 Topic 综合

## 什么是 Topic Synthesis？

Topic Synthesis（主题综合）是对一组相关文献进行系统化分析和综合的过程。它通过 AI 工作流自动提取关键信息、识别主题结构、生成综合分析报告。

## Topics 表面

在 Synthesis Workbench → Topics 页面，可以浏览和管理所有已创建的主题。Topics 表面支持 **三种视图模式**：

| 视图 | 说明 | 适用场景 |
|------|------|---------|
| **图视图** | 力导向图，主题为节点，关系为边 | 直观了解主题间关联 |
| **网格视图** | 带标题、论文数、摘要和操作按钮的卡片 | 浏览和查找主题 |
| **列表视图** | 带列的表格视图：名称、论文数、创建时间、更新日期、状态 | 排序和批量操作 |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/topic-graph.webp" alt="Synthesis Topics 图谱视图" title="Synthesis Topics 图谱视图" loading="lazy" /><figcaption>Synthesis Topics 图谱视图</figcaption></figure>

### 主题管理操作

- **搜索**：按主题名称和描述搜索
- **排序**：按标题、论文数量、更新日期排序
- **创建新 Topic**：点击创建按钮，启动 Workflow 流水线
- **更新 Topic**：重新运行 pipeline 更新主题分析
- **删除 Topic**：移除不再需要的主题

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

- 已配置 [Skill-Runner 后端](#doc/backends%2Fskill-runner)
- 文献库中有相关论文
- 论文已生成了摘要（Digest）和引文分析（可选，推荐）

该 pipeline 由 [Topic 综合创建](#doc/workflows%2Ftopic-synthesis) workflow 编排执行。

## Topic Inspector（主题检查器）

创建 Topic 后，点击主题即可进入 Topic Inspector。这是一个多页面的阅读器，包含 8 个子页面，每个页面展示主题的不同维度。

### Overview（概览）

- 主题名称、描述、重要度评分
- 核心主张摘要
- 统计数据（论文数、分类数、声明数等）
- 关联的 Topic Graph 位置信息

### Taxonomy（分类体系）

展示主题的层级化分类结构：

- 上位主题（broader）：更广泛的主题领域
- 下位主题（narrower）：更具体的子主题
- 相关主题（related）：与之关联的其他主题
- 在 Topic Graph 中的位置和层次

### Claims（关键声明）

从文献中提取的核心声明和主张：

- 每条声明包含原文证据引用
- 标注声明来源的论文
- 声明类型（发现/假设/结论等）
- 支持该声明的论文数量

### Compare（对比分析）

不同论文在同一主题上的观点对比：

- 对比维度（方法、结论、数据集等）
- 各论文的立场和论点
- 共识与分歧的可视化

### Future Directions（未来方向）

基于文献分析识别的研究空白和未来方向：

- 开放性问题
- 潜在研究方向
- 相关挑战和建议

### Coverage（覆盖度分析）

分析 Topic 对相关文献的覆盖程度：

- 该主题涵盖的论文列表
- 论文的完整度（是否有摘要/引文分析等产物）
- 覆盖的方面和未覆盖的方面

### References（参考文献）

该主题关联的所有参考文献，包含绑定细节：

- 每条引用的 Zotero 条目链接
- 引用在 Topic 中的角色（支持/对比/背景）
- 引用来源和上下文

### Report（完整报告）

生成的结构化综合分析报告（Markdown 格式）：

- 完整的主题分析文本
- 可导出为 Markdown 或自包含 HTML
- 适合用于学术写作的参考资料

## Topic Graph（主题图谱）

Topic Graph 是一个层次化的主题网络，展示主题之间的关系：

### 节点类型

| 类型 | 说明 |
|------|------|
| **materialized** | 已实际创建的结构化主题 |
| **placeholder** | 推断存在但尚未创建的主题占位符 |

### 边状态

| 状态 | 说明 |
|------|------|
| `suggested` | 系统建议的关系（等待审核） |
| `confirmed` | 用户确认的关系 |
| `rejected` | 用户拒绝的关系 |
| `stale` | 数据过期，待重新评估 |
| `deleted` | 已删除的关系 |

### 关系类型

| 关系 | 说明 |
|------|------|
| `broader_than` | A 是 B 的上位主题（更广泛） |
| `related_to` | 两个主题相关 |
| `overlaps_with` | 两个主题有重叠 |
| `contrasts_with` | 两个主题形成对比 |

### 管理 Topic

- **创建新 Topic**：在 Topics 页面点击"创建"
- **编辑 Topic**：修改名称、描述、重要度等
- **关联论文**：向 Topic 添加或移除论文
- **浏览 Topic Graph**：查看主题间的关系网络

## 相关 Workflow

- [Topic 综合创建](#doc/workflows%2Ftopic-synthesis) — 创建 Topic 的 Workflow 详情
- [论文写作框架](#doc/workflows%2Fmanuscript-literature-framing) — 基于 Topic 分析撰写论文
