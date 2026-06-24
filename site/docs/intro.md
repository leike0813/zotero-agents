# Zotero Agents

一个用于执行 Agent 技能的 Zotero 插件。

## 什么是 Zotero Agents？

Zotero Agents 扩展了 Zotero 的能力，使其能够运行 **Agent 技能**——这些基于 AI 的工作流可以处理文献、生成摘要、管理标签等。

插件连接到 **Skill-Runner** 或 **ACP 兼容** 后端来执行任务，并提供丰富的 UI 面板来管理运行、查看日志和配置工作流。

> **支持的 Zotero 版本**：本插件支持 Zotero 7 和 Zotero 9。主要开发与测试在 Zotero 9 上进行。Zotero 8 理论上可完整支持（8/9 插件框架无变化）。Zotero 7 理论上也能运行，但未做深入测试，未来维护重点在 Zotero 9。Zotero 7 用户如遇问题请在 [Issues](https://github.com/leike0813/zotero-agents/issues) 反馈。

:::tip 提示
插件安装后**不含任何业务逻辑**。所有 Workflow 均通过独立的**官方 Workflow 包**提供，需要用户在安装插件后手动下载安装。详见[安装指南](/installation)。
:::

## 功能特性

- **⚙️ 后端管理** — 支持 ACP、Skill-Runner、Generic HTTP 三种后端类型
- **🔧 Workflow 系统** — 定义多步骤自动化处理流水线
- **📊 Dashboard** — 监控任务运行状态、浏览历史记录和检查日志
- **🖥️ 侧边栏面板** — 不离开当前工作上下文即可与后端交互
- **📖 内置 Markdown 阅读器** — 双击 `.md` 附件在 Zotero 内打开，支持大纲、搜索、公式渲染、代码高亮
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
| [安装指南](/installation) | 插件安装、官方 Workflow 包安装、Skill-Runner 后端部署 |
| [内置 Markdown 阅读器](/markdown-reader) | 双击 `.md` 文件在 Zotero 内打开，支持大纲、搜索、公式渲染 |
| [后端配置](/backends/) | ACP、Skill-Runner、Generic HTTP 后端的配置说明 |
| [Workflow](/workflows/) | Workflow 介绍与调用指南 |
| [Dashboard](/dashboard) | 中央监控面板使用说明 |
| [侧边栏与 ACP Chat](/sidebar/) | 侧边栏面板和对话功能 |
| [Synthesis Workbench](/synthesis/) | 综合工作台使用指南 |
| [偏好设置](/preferences) | 插件设置项说明 |

## 项目资源

- [GitHub 仓库](https://github.com/leike0813/zotero-agents)
- [问题追踪](https://github.com/leike0813/zotero-agents/issues)
- [Gitee 镜像](https://gitee.com/leike0813/zotero-agents)
