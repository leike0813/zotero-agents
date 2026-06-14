# Synthesis Workbench 概览

Synthesis Workbench（综合工作台）是 Zotero Skills 提供的深度文献分析平台。它将您的文献库转化为结构化的知识网络，支持主题综合、引文分析、概念管理和受控词表管理。

## 打开方式

1. 通过 **工具栏按钮** 或 **菜单** 打开 Dashboard / Synthesis Workspace
2. 在 Workspace Tab 中切换到 **Synthesis** 视图

## 所有 Surface（页面）

Synthesis Workbench 包含 8 个 Surface，每个提供不同的功能视图：

| Surface | 功能 | 文档 |
|---------|------|------|
| **Home** | 文献库概览仪表板：库洞察（已注册论文/主题数/图节点）、Git 同步状态面板、热门主题卡片列表 | [详情](home) |
| **Topics** | 主题列表和管理：3 种视图模式（图/网格/列表）、创建和更新主题、主题检索和排序 | [详情](topic-synthesis) |
| **Index** | Canonical Reference 索引：论文注册表视图（论文列表 + 引用行 + 绑定状态）、规范参考视图（搜索/合并/重定向/去重） | [详情](index-and-citation) |
| **Review** | 审核中心：3 个子标签页——引用匹配审核（接受/拒绝绑定提案）、概念审核、主题图关系审核 | [详情](review) |
| **Graph** | 引文图谱可视化（力导向/径向/组件 3 种布局），支持按主题过滤、节点/边交互 | [详情](index-and-citation) |
| **Tags** | 受控标签词表管理 + 自动打标建议审批 | [详情](tags) |
| **Concepts** | 概念知识库管理：概念/义项/别名/关系四层结构，可叠加到主题图和阅读器 | [详情](concepts) |
| **Reader** | 主题阅读器：完整的 Topic Detail 页面，含 8 个子页面（Overview、Taxonomy、Claims、Compare、Future Directions、Coverage、References、Report） | [详情](topic-synthesis) |

## 核心概念

### Canonical Store（规范存储）

Canonical Store 是 Synthesis 系统的底层知识图谱存储。它以内容可寻址的 JSON 文件形式，存储在 Zotero 数据目录中。

**存储位置：** `<Zotero 数据目录>/zotero-agents/data/synthesis/`

**目录结构：**

```
synthesis/
├── topics/             # 主题综合的结构化产物
├── concepts/           # 概念知识库
├── topic-graph/        # 主题图谱节点和边
├── citation-graph/     # 引文图谱快照
├── tags/               # 受控标签词表
├── sync/               # Git 同步工作树
└── state/              # 运行时状态（事务、收据、缓存等）
```

每个文件使用 JSON 包裹格式（CanonicalEnvelope），包含 schema ID、版本号、时间戳和经过模式验证的数据体。写入操作使用事务语义：先暂存到事务目录，验证通过后再提升到正式位置，失败时自动回滚。

### Reference Sidecar（参考文献侧车）

Reference Sidecar 是每篇论文附属产物的索引。当 workflow 处理一篇文献并生成摘要、参考文献列表和引文分析后，这些产物以结构化注释（Zotero Note）的形式挂载在论文条目下。Sidecar 系统会扫描这些 notes，将产物状态（完整/部分/缺失）记录到索引中。

**Sidecar 扫描周期：** Sidecar 在以下时机被触发扫描：

- Workflow 执行完成并写入产物后
- 显式触发 Sidecar 刷新操作
- 系统启动时检测到 Sidecar 过期

**产物类型：**

| 产物 | 说明 |
|------|------|
| `digest` | 文献摘要（Markdown） |
| `references` | 参考文献列表（JSON） |
| `citation_analysis` | 引文分析报告（JSON） |

Sidecar 数据是 Canonical Reference Index 的基础输入——系统从 references 产物中提取引用记录，建立规范引用，再尝试与库内条目匹配绑定。

### 数据流

```
Zotero 文献库
    │
    ├──→ Workflow 执行（文献分析/深度阅读）
    │         │
    │         ↓
    │   产物 Notes（摘要/参考文献/引文分析）
    │         │
    │         ↓
    │   Reference Sidecar ← 扫描产物状态
    │         │
    │         ├──→ 规范引用索引（Canonical Reference Index）
    │         │         │
    │         │         ├──→ 引用绑定（绑定到 Zotero 条目）
    │         │         └──→ 引文图谱（Citation Graph）
    │         │
    │         └──→ 主题综合（Topic Synthesis）
    │                   │
    │                   ├──→ Topic Graph（主题关系）
    │                   └──→ 概念关联（Concept KB）
    │
    └──→ Git 同步 ←→ 远程仓库（版本管理和备份）
```

## 前提条件

使用 Synthesis Workbench 需要：

- 已配置 [Skill-Runner](../backends/skill-runner) 后端（用于执行合成 workflow）
- 文献库中已有论文条目

## 下一步

- [Home 仪表板](home) — 查看库概览和同步状态
- [Tags 管理](tags) — 管理受控标签词表
- [索引与引文图谱](index-and-citation) — 了解引用索引和引文网络
- [创建 Topic 综合](topic-synthesis) — 创建主题分析
- [审核中心](review) — 审核引用匹配、概念和主题图提案
- [概念知识库](concepts) — 管理核心概念
- [Git 同步](git-sync) — 配置数据同步和备份
