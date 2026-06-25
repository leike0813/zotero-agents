# 索引与引文图谱

## Index 表面

在 Synthesis Workbench → Index 页面，可以管理 Canonical Reference Index。Index 表面包含 **两个子视图**：

### 注册表视图（Registry View）

显示库中所有已跟踪论文的列表，每行展示一篇论文及其覆盖状态：

- **论文信息**：标题、作者、年份
- **覆盖度**：完整/部分/缺失（摘要、参考文献、引文分析三类产物的覆盖状态）
- **展开行**：展开后显示该论文的参考文献列表，每条引用标记其绑定状态（未绑定/候选/已接受/已拒绝）
- **筛选**：按范围（全部/库内/被引用）、覆盖度、搜索筛选

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/index.webp" alt="Synthesis Index 注册表视图" title="Synthesis Index 注册表视图" loading="lazy" /><figcaption>Synthesis Index 注册表视图</figcaption></figure>

### 规范参考视图（Canonical Reference View）

当活动索引工具切换为"修订规范"时显示：

- **规范引用列表**：去重后的规范引用记录
- **搜索与筛选**：按绑定状态、图谱可见性、重定向状态、是否有重复候选筛选
- **操作**：元数据编辑、合并重复引用、创建重定向、查看审核项

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/index_canonical-revision.webp" alt="Synthesis Index 修订规范引用视图" title="Synthesis Index 修订规范引用视图" loading="lazy" /><figcaption>Synthesis Index 修订规范引用视图</figcaption></figure>

## Canonical Reference Index（规范参考文献索引）

Canonical Reference Index 是 Synthesis 系统的核心索引，对文献库中所有论文的参考文献进行去重和规范化管理。它从 Reference Sidecar（参见[概览](#doc/synthesis%2Findex)中的"Reference Sidecar"章节）获取原始引用数据，经过提取、规范化和匹配绑定后形成。

### 功能

- **全文搜索**：在所有规范化引用中搜索
- **元数据编辑**：修改引用记录的元数据
- **合并**：将重复的引用记录合并（自动创建重定向）
- **重定向**：将一个引用指向另一个规范记录
- **审校**：查看引用匹配的质量审核项
- **去重**：发现可能的重复引用

### 引用记录类型

| 类型 | 说明 |
|------|------|
| **已绑定**（bound） | 已与 Zotero 库中的条目关联 |
| **外部引用**（external） | 知道该文献但不在当前 Zotero 库中 |
| **未解析**（unresolved） | 从参考文献中提取但尚未识别 |

## Reference Matching Pipeline（引用匹配流水线）

引用匹配是自动将论文中提取的参考文献与 Zotero 文献库条目建立关联的过程。系统采用**两阶段模型**，兼顾性能与精度。

### 两阶段模型

#### 第一阶段：轻量级 Sidecar 刷新

在常规操作中运行（如摘要应用后），扫描 Sidecar 状态，对比引用产物哈希，仅处理有变更的引用。**不运行高级去重或索引构建**，仅执行轻量级的规范分配和绑定。

- 触发时机：Workflow 执行完成并写入产物后、显式刷新操作
- 处理范围：增量（仅变更的引用）
- 算法：简单标识符匹配（DOI、arXiv、ISBN）

#### 第二阶段：高级引用匹配

显式触发的深度匹配操作。构建一个完整的引用匹配索引，运行全面的匹配和去重算法。

- 触发时机：用户手动触发、定期维护
- 处理范围：全量
- 算法：多策略匹配 + 聚类去重

:::caution 性能提示
高级引用匹配、刷新索引、重建 Citation Graph 等操作计算量较大。由于 Zotero 采用单一宿主进程架构，这些操作在执行期间可能导致 UI 短暂卡顿，请耐心等待。此问题计划在后续版本的架构重构中解决。
:::

### 匹配策略

| 策略 | 匹配依据 | 置信度 | 说明 |
|------|---------|--------|------|
| DOI 匹配 | DOI 标识符 | 确定性 | 精确匹配，自动接受 |
| arXiv 匹配 | arXiv ID | 确定性 | 精确匹配，自动接受 |
| ISBN 匹配 | ISBN 号 | 确定性 | 精确匹配，自动接受 |
| 标题相似度 | 模糊标题匹配 | 高/中/低 | 使用标准化标题、紧凑标题进行相似度计算 |
| 作者+年份 | 作者名和发表年份 | 中/低 | 结合作者规范化和年份范围进行匹配 |

### 置信度级别

| 级别 | 说明 | 操作建议 |
|------|------|---------|
| `deterministic` | 确定性匹配 | 自动接受 |
| `high` | 高置信度 | 可接受 |
| `medium` | 中等置信度 | 建议审核 |
| `low` | 低置信度 | 需要审核 |
| `review` | 需要人工判断 | 必须审核 |

### 聚类去重

高级匹配阶段会对规范引用进行聚类去重，算法流程：

1. 为每个规范引用构建去重记录（含资格过滤和书目噪声分析）
2. 成对比较产生聚类边（标识符精确匹配、标题规范匹配、模糊标题匹配等）
3. 边聚合成集群和子集群
4. 生成自动重定向或建议审核的去重提案

安全约束：低置信度的匹配（如 `contained_extension_risk`）从不触发自动重定向，需要用户审核。

### Review 表面

在 [审核中心](#doc/synthesis%2Freview) 中，可以查看和处理引用匹配提案，逐条进行接受或拒绝操作。

## Citation Graph（引文图谱）

引文图谱将文献库中的论文及其参考文献可视化为网络图。图谱数据以 SQLite 投影的形式构建，可容忍一定的数据过期（非实时镜像）。

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/citation-graph.webp" alt="Synthesis Citation Graph 引文图谱" title="Synthesis Citation Graph 引文图谱" loading="lazy" /><figcaption>Synthesis Citation Graph 引文图谱</figcaption></figure>

### 节点类型

| 节点 | 颜色 | 说明 |
|------|------|------|
| `library_paper` | 蓝色 | Zotero 库中已有的论文 |
| `external_reference` | 绿色 | 已知但不在库中的引用 |
| `unresolved_reference` | 灰色 | 提取但未识别的引用 |

### 边信息

每条引文边包含：

- **mention_count**：被引次数
- **primary_role**：主要引用角色（如 background、comparison、support、contrast）
- **aux_roles**：辅助角色列表
- **role_evidence**：角色判断依据

### 图谱指标

引文图谱可以计算出多项指标，帮助识别核心论文和有影响力的工作：

| 指标 | 说明 |
|------|------|
| **被引次数** | 论文被引用的总次数 |
| **PageRank** | 基于图结构的节点重要性评分 |
| **Foundation 分数** | 作为领域基础工作的程度 |
| **Frontier 分数** | 作为前沿工作的程度 |

### 可视化布局

| 布局 | 说明 | 适用场景 |
|------|------|---------|
| **Force（力导向）** | d3-force 力导向布局 | 探索整体结构 |
| **Radial（径向）** | 以选定节点为中心展开 | 分析某篇论文的引用网络 |
| **Components** | 按连通组件分组 | 发现独立的引用集群 |

### 交互操作

- **缩放/平移**：自由浏览图谱
- **悬停**：查看节点标签和基本信息
- **点击节点**：在 Zotero 中打开对应的论文条目
- **筛选**：按角色、主题、节点类型筛选显示的引文
- **切换低信号引用**：显示/隐藏低引用次数的边
- **深度滑块**：控制引文网络的展开深度

### 主题过滤

可以按 Topic 过滤引文图谱，只显示与特定主题相关的论文和引用关系。主题范围在图谱中以不同的颜色和分组展示。

## 下一步

- [审核中心](#doc/synthesis%2Freview) — 审核引用匹配和去重提案
- [创建 Topic 综合](#doc/synthesis%2Ftopic-synthesis) — 基于引文网络创建主题分析
- [Home 仪表板](#doc/synthesis%2Fhome) — 查看库洞察指标
- [WebDAV 同步](#doc/synthesis%2Fwebdav-sync) — 跨设备同步引文绑定数据
