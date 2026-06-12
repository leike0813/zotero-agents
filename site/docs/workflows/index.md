# Workflow 介绍

## 什么是 Workflow？

Workflow（工作流）是 Zotero Skills 的核心功能，它允许您将多个技能步骤组合成自动化的处理流水线。一个 Workflow 定义了一个完整的任务：从接收输入、处理数据、到输出结果。

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

插件附带了一系列内建 workflow，存放在 `workflows_builtin/` 目录：

- **literature-workbench-package**：文献工作台工具包（添加摘要、导出/导入笔记、文献解读、深度阅读、标签管理等）
- **mineru**：PDF 文档解析
- **synthesis-layer**：Synthesis 编排
- **topic-synthesis**：Topic 综合创建流水线
- **workflow-debug-probe**：调试工具

## 下一步

- [Workflow 调用与配置](./invocation)
- [后端配置](../backends/) — 配置后端的详细说明
