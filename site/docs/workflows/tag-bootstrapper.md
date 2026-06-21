# 标签词表初始化

## 用途

与 AI 交互式创建研究领域的受控标签词表。建议在首次执行[文献分析](literature-analysis)之前运行，为后续的自动标签规范化建立基础。

## 适用场景

- 开始一个新的研究方向，需要建立标签体系
- 当前 Zotero 库中还没有受控标签词表
- 想要让 AI 帮助设计领域标签分类

## 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | workflow（无需选中条目） |
| 触发方式 | Dashboard 中运行 |

## 运行过程

```
1. 启动交互
   └── 在 Dashboard 中与 AI 对话

2. 定义领域
   └── 描述你的研究领域和关注方向
       └── AI 提议标签分类体系

3. 迭代优化
   └── 审核 AI 建议的标签
       └── 调整、增删、重命名

4. 确认写入
   └── 将最终标签词表写入 Synthesis 系统
```

### 交互说明

- 对话过程中可以随时调整方向
- 可以参考已有文献的关键词来定义标签
- AI 会根据你的研究领域推荐合理的标签层次

## 运行产物

执行完成后，受控标签词表会写入 Synthesis 系统，可在 Synthesis Workbench 的 Tags 页面查看和管理。

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `tag_note_language` | string | 标签笔记语言 | `zh-CN` |

可选值：`zh-CN`、`en-US`、`ja-JP`、`ko-KR`、`de-DE`、`fr-FR`、`es-ES`、`ru-RU`，支持自定义输入。

## 依赖

- **后端**：Skill-Runner 服务
- **Backend 配置**：在 Backend Manager 中配置 Skill-Runner 类型的后端
- **Skill**：Skill-Runner 端需部署 `tag-bootstrapper` skill

## 相关工作流

- [文献分析](literature-analysis) — 分析时可自动级联执行标签规范化
- [标签规范化](tag-regulator) — 对已有文献执行标签规整
