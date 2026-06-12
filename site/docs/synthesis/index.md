# Synthesis Workbench 概览

## 什么是 Synthesis Workbench？

Synthesis Workbench（综合工作台）是 Zotero Skills 提供的深度文献分析平台。它将您的文献库转化为结构化的知识网络，支持主题综合、引文分析、概念管理和受控词表管理。

## 打开方式

1. 通过 **工具栏按钮** 或 **菜单** 打开 Dashboard / Synthesis Workspace
2. 在 Workspace Tab 中切换到 **Synthesis** 视图

## 所有 Surface（页面）

| Surface | 功能 |
|---------|------|
| **Home** | 文献库概览：热门主题、Git 同步状态、已注册论文数、生成产物数、待审核项 |
| **Topics** | 主题列表、创建主题、主题检查器（详情、分类、主张、对比、未来方向、覆盖度、参考文献、报告） |
| **Index** | Canonical Reference 索引：搜索、元数据编辑、合并、重定向、审校、去重 |
| **Review** | 三项审核：Reference Matching（绑定审核）、Concepts（概念提案）、Topic Graph（主题关系提案） |
| **Graph** | 引文图谱可视化（力导向/径向/组件布局），按主题过滤 |
| **Tags** | 受控标签词表管理 + 自动打标建议审批 |
| **Concepts** | 概念知识库管理 |
| **Reader** | 单篇论文的深度阅读视图 |

## 核心概念

### Canonical Store（规范存储）

一个基于文件的知识图谱，存储在 Zotero 数据目录中。所有 Synthesis 数据以规范 JSON 格式保存，使用内容可寻址哈希。

### Reference Sidecar（参考文献侧车）

每篇论文的附属产物（摘要、参考文献、引文分析），作为 Zotero 笔记附件存储。

### 数据流

```
Zotero 文献库 → 技能/Workflow 处理 → Canonical Store + Sidecars → Synthesis Workbench
                                                      ↓
                                              引文图谱 / 主题网络 / 概念 KB
```

## 前提条件

使用 Synthesis Workbench 需要：
- 已配置 [Skill-Runner](../backends/skill-runner) 后端（用于执行合成 workflow）
- 文献库中已有论文条目

## 下一步

- [Tags 管理](./tags)
- [索引与引文图谱](./index-and-citation)
- [创建 Topic 综合](./topic-synthesis)
