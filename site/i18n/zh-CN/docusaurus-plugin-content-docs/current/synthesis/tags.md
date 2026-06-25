# Tags 管理

## 什么是 Tag Vocabulary？

Tag Vocabulary（受控标签词表）是一个规范化的标签体系，用于对文献进行一致的标注。与 Zotero 原生的自由标签不同，受控词表中的标签遵循统一的命名规范，有利于统计和检索。

## Facet（标签维度）

每个标签属于一个 Facet（维度），目前支持以下维度：

| Facet | 说明 | 示例 |
|-------|------|------|
| `field` | 研究领域 | `field:natural_language_processing` |
| `topic` | 研究主题 | `topic:transformer_architecture` |
| `method` | 研究方法 | `method:reinforcement_learning` |
| `model` | 使用的模型 | `model:gpt-4` |
| `ai_task` | AI 任务类型 | `ai_task:text_summarization` |
| `data` | 数据集 | `data:imagenet` |
| `tool` | 工具 | `tool:python` |
| `status` | 状态标记 | `status:to_read` |

标签格式：`^[a-z_]+:[a-zA-Z0-9/_.-]+$`，最长 120 字符。

## Vocabulary Tab（词表管理）

在 Synthesis Workbench → Tags → Vocabulary 页面可以：

- **查看**：所有已定义的规范标签，显示状态、Facet、别名、使用次数
- **新增**：创建新的规范标签
- **编辑**：修改标签的元数据
- **弃用**：将标签标记为已弃用，可指定替代标签
- **导入 JSON**：从 JSON 文件导入标签词表（支持预览后再确认）
- **导出 JSON**：将当前词表导出为 JSON 文件

![Synthesis Tags 页面](/img/docs/synthesis/tags.png)

标签状态：
- `active`：活动中
- `deprecated`：已弃用（有替代标签）
- `warning`：警告（可能需要审查）

## Staged Tab（待审批标签）

**tag-regulator** 技能会自动分析文献元数据，生成受控标签建议，显示在 Staged 页面。

### 审批流程

1. 查看建议的标签列表
2. 每个标签可以：
   - **Promote（晋升）**：将该标签加入规范词表
   - **Discard（丢弃）**：拒绝该建议
   - **Clear Staged（清空待定）**：批量丢弃所有建议

### 导入/导出格式

标签词表支持 JSON 格式的导入导出（TagVocab 格式），方便：

- 跨库迁移标签体系
- 团队共享标签规范
- 备份和版本管理

## 相关 Workflow

标签的规范化和自动推断由 [标签规范化](../workflows/tag-regulator) workflow 驱动。运行该 workflow 可以基于受控词表自动清理和补充标签。
