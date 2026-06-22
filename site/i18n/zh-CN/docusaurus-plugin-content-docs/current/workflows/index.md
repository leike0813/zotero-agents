# Workflow 介绍

## 什么是 Workflow？

Workflow（工作流）是 Zotero Agents 的核心功能，它允许您将多个技能步骤组合成自动化的处理流水线。一个 Workflow 定义了一个完整的任务：从接收输入、处理数据、到输出结果。

## Workflow 的结构

```
workflow.json（清单文件）
├── manifest：声明元数据、版本、名称
├── parameters：定义可配置的参数
├── inputs：定义输入类型（附件、条目、笔记等）
├── hooks：JavaScript 钩子脚本（过滤输入、构建请求、应用结果）
└── provider：指定需要的后端类型
```

### 输入单元类型

| 类型 | 说明 |
|------|------|
| `attachment` | 条目的附件文件 |
| `parent` | 选中条目的父条目 |
| `note` | 笔记条目 |
| `workflow` | 批量作用域 |

### 钩子系统（Hooks）

Workflow 可以在执行的各个阶段运行自定义 JavaScript 脚本：

- **filterInputs**：对输入进行过滤和筛选
- **buildRequest**：构建发送给后端的请求内容
- **normalizeSettings**：规范化用户设置
- **applyResult**：将后端返回的结果应用到 Zotero

## 三种执行方式

Workflow 可以通过三种后端类型执行：

| 后端 | 请求类型 | 适用场景 |
|------|---------|---------|
| **Skill-Runner** | `skill.run.v1` | 通用技能执行，支持交互模式 |
| **ACP** | `acp.skill.run.v1` | ACP 后端的技能执行 |
| **Generic HTTP** | `generic-http.request.v1` | HTTP API 调用 |

## 内建 Workflows

插件附带了一系列内建 workflow，按功能分组：

### 📚 文献分析工具包

| Workflow | 用途 | 输入 | 后端 | 文档 |
|---------|------|------|------|------|
| **文献分析** | 从 PDF/MD 生成摘要、参考文献、引文分析 | 附件 | Skill-Runner | [详情](literature-analysis) |
| **交互式文献解读** | 与 AI 多轮对话深入理解文献 | 附件 | Skill-Runner | [详情](literature-explainer) |
| **深度阅读** | 生成结构化精读 HTML 视图，支持翻译 | 附件 | ACP | [详情](literature-deep-reading) |
| **文献搜索与入库** | 搜索学术文献并直接入库到 Zotero | workflow | ACP | [详情](literature-search-ingest) |
| **标签规范化** | 基于受控词表规范化标签，推断新标签 | 父条目 | Skill-Runner | [详情](tag-regulator) |
| **导出/导入笔记** | 导出或导入分析笔记（摘要/参考文献/引文） | 父条目 | 无需后端 | [详情](export-import-notes) |

### 🛠️ 实用工具

| Workflow | 用途 | 输入 | 后端 | 文档 |
|---------|------|------|------|------|
| **MinerU PDF 解析** | 调用 MinerU 服务解析 PDF 为 Markdown | 附件 | Generic HTTP | [详情](mineru) |
| **Topic 综合创建** | 三步流水线创建主题综合分析与报告 | workflow | ACP | [详情](topic-synthesis) |
| **论文写作框架** | 生成 Introduction / Related Work LaTeX 草稿 | workflow | ACP | [详情](manuscript-literature-framing) |

### 🔧 调试工具

| Workflow | 用途 | 后端 | 文档 |
|---------|------|------|------|
| **调试工具包** | Workflow 系统开发测试和诊断 | Skill-Runner | [详情](debug-probe) |

## 下一步

- [Workflow 调用与配置](invocation)
- [后端配置](../backends/) — 配置后端的详细说明
