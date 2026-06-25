# Zotero Agents

一个用于执行 Agent 技能的 Zotero 插件。

![Zotero Agents 插件图标](/img/icon_full.png)

## 什么是 Zotero Agents？

Zotero Agents 让 Zotero 成为智能体时代的个人研究工作台。它把文献库、Agent 后端、Workflow、知识图谱和外部工具连接起来，让文献分析从一次性的问答，走向可持续积累、可审校、可扩展的研究流程。

插件的第一层能力是**可插拔 Workflow**。研究者可以把复杂的文献任务拆解为可复用的流程：论文解析、深度阅读、引文分析、标签规范化、文献检索、主题综合、综述材料生成等。Workflow 可以接入不同 Agent 或服务后端，借助智能体的长上下文、工具调用和多步骤推理能力，把原本需要人工反复操作的文献管理与分析流程自动化，并随着研究需求不断扩展。

第二层能力是 **Assistant Sidebar**。它提供类似 coding agent 的对话式交互体验，支持通过 ACP 协议连接各种 Agent 后端，也可以通过 Skill-Runner 后端执行具体 Workflow。你可以让 Agent 基于当前条目、选中文献或整个文献库回答问题、分析论文、检索相关工作、补充文献到库中，或在长任务执行过程中继续对话、确认、修正和追踪进度。

第三层能力是 **Synthesis Workbench**。它面向文献库级别的长期知识建设，把单篇论文分析产生的摘要、参考文献、引文语义、标签、概念和主题关系汇入统一的知识平台。研究者可以在这里管理参考文献网络，审校引用匹配，查看引文图谱，围绕主题组织文献，并通过 Topic Synthesis 梳理一个研究方向的基础文献、前沿工作、关键论点、方法分歧、覆盖空白和未来方向。它的目标是把大量阅读转化为可用于综述、开题、论文引言和研究路线设计的结构化材料。

第四层能力是 **Host Bridge**。通过 `zotero-bridge` CLI 和 MCP 服务，外部 Agent 可以直接与 Zotero 文献库交互：读取文献上下文，检索条目，添加新文献，调用分析任务，写回结构化结果。借助 OpenClaw、Hermes 等 Agent 工作流，你可以把文献搜索、筛选、分析、总结和综述草稿撰写委派出去，让长流程研究任务在后台持续推进。

Zotero Agents 的核心价值，是让 Zotero 文献库成为 Agent 可以真正工作的研究环境。每一次阅读、分析、审校和写作准备，都可以沉淀为下一步研究继续使用的知识。

## 功能特性

- **⚙️ 后端管理** — 支持 ACP、Skill-Runner、Generic HTTP 三种后端类型
- **🔧 Workflow 系统** — 定义多步骤自动化处理流水线
- **📊 Dashboard** — 监控任务运行状态、浏览历史记录和检查日志
- **🖥️ 侧边栏面板** — 不离开当前工作上下文即可与后端交互
- **💬 ACP Chat** — 以文献为上下文的 AI 对话
- **🔬 Synthesis Workbench** — 深度文献分析平台
- **🏷️ Tags 管理** — 受控标签词表与自动打标
- **📈 引文图谱** — 引用关系可视化分析
- **📝 Topic 综合** — 自动化的主题分析与报告生成

## 快速链接

- [安装指南](/installation) — 安装插件及其依赖
- [快速开始](/getting-started) — 配置第一个后端并运行技能
- [后端配置](/backends/) — 了解支持的三种后端类型

## 文档目录

| 章节 | 说明 |
|------|------|
| [后端配置](/backends/) | ACP、Skill-Runner、Generic HTTP 后端的配置说明 |
| [Workflow](/workflows/) | Workflow 介绍与调用指南 |
| [Dashboard](/dashboard) | 中央监控面板使用说明 |
| [侧边栏与 ACP Chat](/sidebar/) | 侧边栏面板和对话功能 |
| [Synthesis Workbench](/synthesis/) | 综合工作台使用指南 |
| [偏好设置](/preferences) | 插件设置项说明 |

## 项目资源

- [GitHub 仓库](https://github.com/leike0813/zotero-agents)
- [问题追踪](https://github.com/leike0813/zotero-agents/issues)
