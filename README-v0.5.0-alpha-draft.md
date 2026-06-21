<!-- hero banner -->
<p align="center">
  <img src="assets/poster.png" alt="Zotero Skills – Turn your library into an AI-powered research hub" width="800" />
</p>

<p align="center">
  <img src="addon/content/icons/icon_full.png" alt="Zotero Skills" width="96" />
</p>

<h1 align="center">Zotero Skills</h1>
<h4 align="center" style="color: #888;">迈向 Zotero Agents</h4>

<p align="center">
  <strong>你的 Zotero 文献库，现在由 AI Agent 驱动。</strong>
</p>

<p align="center">
  <a href="https://github.com/leike0813/Zotero-Skills/releases"><img src="https://img.shields.io/badge/version-v0.5.0--alpha-orange?style=flat-square" alt="v0.5.0-alpha" /></a>
  <img src="https://img.shields.io/badge/Zotero-7-CC2936?style=flat-square&logo=zotero&logoColor=white" alt="Zotero 7" />
  <a href="https://github.com/leike0813/Zotero-Skills/blob/main/LICENSE"><img src="https://img.shields.io/github/license/leike0813/Zotero-Skills?style=flat-square" alt="AGPL-3.0" /></a>
  <img src="https://img.shields.io/badge/TypeScript-4.0+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <a href="README-zhCN.md">简体中文</a> ·
  <a href="README-frFR.md">Français</a> ·
  <a href="README-jaJP.md">日本語</a> ·
  <a href="https://leike0813.github.io/Zotero-Skills/">📖 Documentation</a>
</p>

---

读了上百篇论文，但没法快速看清它们**之间的关系**？

想做文献综述，但光是**梳理主题和线索**就耗费了数周？

> **Zotero Skills 让 AI Agent 直接在你的 Zotero 文献库中工作** — 自动提取、解读、关联文献，把零散的论文变成可探索的知识网络。

---

## 快速导航

| 我是…                           | 从这里开始                                                     |
| ------------------------------- | ------------------------------------------------------------- |
| 🔰 新用户，想了解能做什么       | → [核心功能](#核心功能) → [3 步快速上手](#3-步快速上手)         |
| 📄 想快速处理论文（摘要、解读） | → [日常文献处理](#日常文献处理)                                 |
| 📊 在做文献综述，需要系统化知识 | → [文献综合工作台](#文献综合工作台)                              |
| 💬 想与 AI 围绕文献对话         | → [AI 交互面板](#ai-交互面板)                                  |
| 🔌 对外集成，让 Agent 读你的库  | → [Host Bridge 与 MCP](#host-bridge--mcp-server)               |
| 🛠 开发者，想扩展或贡献         | → [架构概览](#架构概览) · [开发者文档](#开发者文档)              |
| 📚 需要完整使用手册             | → [用户文档站](https://leike0813.github.io/Zotero-Skills/)     |

---

## v0.5.0 主要变化

> 从 v0.4.0 到 v0.5.0 跨越了 **42 个 commit**，是一次从"Skill-Runner 前端"到"通用 Agent 执行框架"的全面进化。

<table>
<tr>
<td width="50%">

### ✨ 新增

- **ACP 后端** — 直连 Codex、OpenCode、Claude Code、Gemini CLI、Qwen Code 等 Agent CLI
- **ACP Chat 面板** — 以文献为上下文的持续对话，支持模型/模式切换和 Token 用量可视化
- **ACP Skill Runs 面板** — 监控技能运行全程，含转写、权限审批、输出预览
- **文献综合工作台** — 完整的 Synthesis Workbench，8 大 Surface
- **引文图谱** — 力导向/径向/组件布局，支持主题过滤和指标计算
- **概念知识库** — 概念/义项/别名/关系四层结构，可叠加到主题图
- **深度阅读** — 结构化精读视图，带概念覆盖和引文上下文
- **Host Bridge + MCP Server** — 把 Zotero 变成可编程服务
- **Sequence 执行** — 多 Skill 按序串联，支持中间结果传递
- **Backend Manager 对话框** — 统一管理所有后端配置
- **WebDAV 同步** — 轻量级 Synthesis 数据跨设备同步

</td>
<td width="50%">

### ♻️ 改进

- **Dashboard 全面重构** — 新增后端视图、产物浏览器、Skill Feedback、日志诊断导出
- **声明式选择验证** — `validateSelection` 取代命令式 `filterInputs`，零 JS 即可定义输入约束
- **SkillRunner 连接治理** — 连接密度优化、预请求状态可视化、故障恢复增强
- **多语言 UI** — Synthesis Workbench 和 Workflow 系统支持中/英/法/日
- **Cross-platform CLI** — Host Bridge CLI 新增 Linux ARM/ARM64/x86 预编译
- **运行时数据管理** — 偏好设置中可查看存储用量、清理各类缓存数据
- **Skill Run Feedback** — 成功运行后可自动收集 AI 反馈报告

### ⚡ 弃用

- **Git Sync** → 已被 **WebDAV Durable Bundle Sync** 取代

</td>
</tr>
</table>

---

## 核心功能

### 日常文献处理

每天都要用到的功能，右键论文即可触发。

| 功能 | 说明 | 触发方式 |
|------|------|----------|
| 🔍 **文献摘要** | AI 自动生成论文摘要、提取参考文献、输出引文分析报告 | 右键论文 → `文献分析` |
| 💬 **交互式文献解读** | 多轮对话深入理解论文，对话记录自动保存为笔记 | 右键论文 → `文献解读` |
| 📖 **深度阅读** | 生成结构化精读视图，支持多段翻译和概念解析 | 右键论文 → `深度阅读` |
| 🏷️ **标签规范化** | 基于受控词表自动规整标签，AI 推断新标签并等待审核 | 右键条目 → `标签规范化` |
| 🔎 **文献搜索与入库** | 搜索新文献，确认后通过 Host Bridge 直接入库到 Zotero | Dashboard → `文献搜索与入库` |
| 📋 **PDF 解析** | 将 PDF 转为 Markdown（调用 MinerU 服务） | 右键 PDF → `MinerU` |
| 📤 **笔记导出/导入** | 批量导出摘要和笔记为 Markdown，或导入外部笔记 | 右键选中条目 → 导出/导入 |

<!-- 📸 TODO: 截图 — 右键菜单展开效果 -->

---

### 文献综合工作台

把零散的论文变成**可探索的知识网络**。这是本插件与其他 Zotero AI 工具最根本的不同。

> 日常文献处理帮你**读**论文，文献综合工作台帮你**组织**知识。

工作台是 Zotero 中的一个完整 Workspace Tab，包含 8 个 Surface：

| Surface | 功能 |
|---------|------|
| **Home** | 文献库概览仪表板：库洞察卡片、同步状态面板、审核项摘要、热门主题入口 |
| **Topics** | 主题管理（创建/更新/浏览），支持图/网格/列表三种视图 |
| **Index** | 规范参考文献索引：论文注册表 + 引用绑定 + 合并/去重/重定向 |
| **Review** | 审核中心：引用匹配审核、概念审核、主题图关系审核（接受/拒绝/批量操作）|
| **Graph** | 引文图谱可视化（力导向/径向/组件布局），支持主题过滤与指标分析 |
| **Tags** | 受控标签词表管理 + AI 标签建议审批（Promote/Discard） |
| **Concepts** | 概念知识库：概念/义项/别名/关系四层结构，可叠加到主题图和阅读器 |
| **Reader** | 主题深度阅读器：Overview / Taxonomy / Claims / Compare / Future Directions / Coverage / References / Report |

工作台内置 **WebDAV 同步**功能，可将标签词表、主题综合、概念知识库等结构化数据通过 WebDAV 协议同步到远端，实现轻量级的跨设备同步与备份。

<!-- 📸 TODO: 截图组 — 工作台各 Surface 截图（Home / Graph / Topics / Reader） -->

---

### AI 交互面板

v0.5.0 新增了完整的 AI 交互侧边栏，提供三种交互模式：

<table>
<tr>
<td width="33%" align="center">

**💬 ACP Chat**

以文献为上下文的持续对话。
支持多会话、模型/模式切换、
Token 用量可视化、
Markdown 渲染和工具调用展示。

</td>
<td width="33%" align="center">

**⚙️ ACP Skills**

监控 Skill Run 全过程：
实时转写、计划进度、
权限审批（命令预览 + 一键批准）、
输出版本历史和结果 JSON 预览。

</td>
<td width="33%" align="center">

**🔧 SkillRunner Tab**

传统 Skill-Runner 的任务面板：
状态追踪、交互式回复、
认证工作流和调试日志。

</td>
</tr>
</table>

<!-- 📸 TODO: 截图 — 侧边栏的 ACP Chat 面板 -->

---

### Host Bridge & MCP Server

Zotero 启动时，插件自动运行一个本地 Host Bridge 服务。外部 AI 工具（Codex、OpenCode 等）可以**直接访问你的 Zotero 文献库** — 读取论文、搜索条目、管理标签，甚至触发工作流。

| 能力 | 说明 |
|------|------|
| 🔌 **库访问** | 外部 Agent 直接读取 Zotero 条目、笔记、附件、标签、合集 |
| ⚡ **工作流触发** | 通过 Bridge API 远程触发 AI 工作流执行 |
| 📊 **Synthesis 查询** | 查询引文图谱、主题、概念知识库、参考文献索引 |
| 🖥 **MCP 工具** | 内嵌 MCP Server，为 ACP Agent 提供结构化的 Zotero 操作工具 |
| 🔒 **安全** | Token 认证 + 写操作审批，数据不离开本地 |

```
外部 Agent ←── zotero-bridge CLI / HTTP ──► Host Bridge (localhost)
                                              │
                                              ├─ 文献库 API
                                              ├─ Synthesis API
                                              └─ MCP Protocol
```

Host Bridge CLI (`zotero-bridge`) 提供 20+ 子命令，支持 Windows / macOS / Linux（含 ARM）。

---

### 可插拔的 Workflow 引擎

插件本身不包含具体业务逻辑 — 所有 AI 能力通过**外部 Workflow 包**接入。

- 📦 **即插即用**：将 workflow 包放入目录，立即可用，无需重新构建
- 📝 **声明式定义**：通过 `workflow.json` manifest + 少量 hook 脚本描述"做什么"
- 🔗 **Sequence 编排**：多个 Skill 按序串联，支持 handoff、workspace 隔离和提前终止
- 🌐 **多后端路由**：同一个 workflow 可以在 Skill-Runner、ACP、HTTP 等不同后端上执行
- 🌍 **多语言**：workflow 内置 i18n 支持，UI 文本随 Zotero 语言自动切换
- ✅ **声明式输入验证**：`validateSelection` — 无需写 JS 即可约束输入条件

> 完整的自定义 Workflow 开发指南见[用户文档站](https://leike0813.github.io/Zotero-Skills/workflows/custom/)。

---

## AI 引擎推荐

本插件不绑定任何 AI 服务商。你用自己的订阅额度、Coding Plan 或 API Key 直接连接后端 — **没有中间商，没有 per-token 加价**。

### 为什么用 Coding Plan 而不是 API？

文献处理是 **token 消耗大户**：论文摘要、引文分析、主题综合、交互式 Q&A — 每次运行轻松消耗数万 token。按量付费的 API 价格很快就会变得不划算。而 Coding Plan（如阿里百炼、智谱等）提供包月额度，更适合这种大吞吐场景。

### 引擎对比

| 引擎 | 适合场景 | 费用 | 推荐度 |
|------|---------|------|--------|
| **Codex** | 综合最佳，速度与质量兼得。支持思维流式展示 | 免费版可用（模型受限） | ⭐⭐⭐ 首选 |
| **Opencode** | 配合国内 Coding Plan（百炼、智谱等），Qwen3.5-Plus / Kimi-K2.5 / GLM-5 等模型在文献任务上表现优秀 | 低成本 | ⭐⭐⭐ 强推 |
| **Qwen Code** | 阿里生态用户，配合百炼 Coding Plan | 自带额度已结束，依赖 Plan | ⭐⭐ 可选 |
| **Gemini CLI** | 简单任务 | 免费版可用 | ⭐ 一般 |
| **Claude Code** | 指令执行质量高，但效率较低 | 付费 | 按需选 |

> 各引擎的详细部署指南见[用户文档站](https://leike0813.github.io/Zotero-Skills/backends/skill-runner#引擎系统)。

---

## 3 步快速上手

### 1️⃣ 安装插件

从 [Releases](https://github.com/leike0813/Zotero-Skills/releases) 下载 `.xpi` 文件 →  Zotero `工具` → `附加组件` → ⚙️ → `从文件安装附加组件…` → 重启 Zotero。

### 2️⃣ 配置 AI 后端

**方案 A — 一键部署 Skill-Runner（最简单）**

`编辑` → `首选项` → `Zotero Skills` → `SkillRunner Local Runtime` → 点击 **Deploy**，等待部署完成。

**方案 B — 直连 ACP Agent**

`编辑` → `首选项` → `Zotero Skills` → `后端管理器` → 在 ACP Tab 中从预置（Codex / OpenCode 等）添加一个后端。

### 3️⃣ 右键运行

在 Zotero 文献列表中**右键一篇论文**，选择 `Zotero Skills` → `文献分析`。几分钟后，你会在笔记面板中看到 AI 生成的摘要、参考文献清单和引文分析。

> 详细的配置和使用说明见 [用户文档站](https://leike0813.github.io/Zotero-Skills/)。

---

## 安装与配置

### 系统要求

- [Zotero 7](https://www.zotero.org/download/)（版本 ≥ 6.999）
- 对于 `skillrunner` 工作流：运行中的 [Skill-Runner](https://github.com/leike0813/Skill-Runner) 实例（一键部署已包含）
- 如需使用 ACP 后端：已安装对应的 CLI 工具（`npx` 自动安装亦可）

### 后端类型

| 后端类型 | 用途 | 配置方式 |
|---------|------|---------:|
| **Skill-Runner** | 通用技能执行（默认），支持一键部署和 Docker 部署 | 偏好设置中 Deploy，或手动填写远程 URL |
| **ACP** | 直连 Agent CLI（Codex、OpenCode、Claude Code、Gemini CLI、Qwen Code） | Backend Manager 中添加，支持从预置创建 |
| **Generic HTTP** | 对接任意 HTTP API（如 MinerU PDF 解析服务） | Backend Manager 中添加 |
| **Pass-Through** | 纯本地执行，无需外部后端 | 自动可用 |

---

## 常见使用场景

<details>
<summary><b>场景 A：新论文入库 → 快速了解</b></summary>

```
下载新论文 → 右键 PDF → MinerU（转 Markdown）
           → 右键论文 → 文献分析（AI 摘要 + 参考文献 + 引文分析）
           → 右键论文 → 文献解读（交互式问答深入理解）
```

</details>

<details>
<summary><b>场景 B：撰写文献综述</b></summary>

```
打开文献综合工作台（Workspace Tab）
  → Home 页面查看当前库的论文分布和热门主题
  → 创建新 Topic（触发 3 步 AI 流水线自动分析）
  → 在 Topic Reader 中浏览 Taxonomy / Claims / Compare / Report
  → 在 Graph 页面查看引文图谱，检查引用完整性
  → 通过 WebDAV 同步保存研究进度
```

</details>

<details>
<summary><b>场景 C：团队标签规范</b></summary>

```
打开工作台 → 进入 Tags 页面
  → 导入或定义团队受控词表（8 个 Facet）
  → 选中一批论文 → 触发"标签规范化"
  → AI 建议的标签通过 Staged 审核后加入词表
  → 词表通过 WebDAV 同步给团队成员
```

</details>

<details>
<summary><b>场景 D：以文献为上下文与 AI 对话</b></summary>

```
选中一篇论文 → 打开侧边栏 ACP Chat
  → 选择 ACP 后端（如 Codex）
  → 围绕论文内容自由对话
  → Host Bridge 自动提供文献上下文
  → 切换模型/模式以调整回答风格
```

</details>

<details>
<summary><b>场景 E：引文溯源与图谱分析</b></summary>

```
打开工作台 → Graph 页面
  → 搜索关键论文 → 查看其引用和被引关系
  → 切换到 Radial 布局以该论文为中心展开
  → 检查 PageRank、frontier score 等指标
  → 进入 Index 页面审查引用绑定状态
```

</details>

---

## 内建 Workflow

### 文献处理

| Workflow | 后端 | 说明 |
|----------|------|------|
| **文献分析** | `skillrunner` | 生成摘要 + 参考文献 + 引文分析笔记 |
| **文献解读** | `skillrunner` | 多轮对话式文献理解，记录保存为笔记 |
| **深度阅读** | `acp` | 结构化精读视图（HTML），含概念覆盖和引文上下文 |
| **文献搜索与入库** | `acp` | 搜索、筛选、确认后直接入库到 Zotero |
| **MinerU** | `generic-http` | PDF → Markdown 转换（调用 MinerU 服务） |

### 综合与整理

| Workflow | 后端 | 说明 |
|----------|------|------|
| **Topic 综合** | `acp` | 3 步 Sequence：准备 → 核心增强 → 定稿 |
| **文稿文献框架** | `acp` | 交互式生成 Introduction + Related Work |
| **标签规范化** | `skillrunner` | LLM 驱动的标签推断 + 受控词表规整 |

### 工具

| Workflow | 后端 | 说明 |
|----------|------|------|
| **笔记导出** | `pass-through` | 批量导出摘要/笔记为 Markdown |
| **笔记导入** | `pass-through` | 导入外部 Markdown 为 Zotero 笔记 |
| **Debug Probe** | 多种 | 13 个调试探针，验证序列执行、apply 合约、Host Bridge 连通性等 |

---

## 架构概览

<details>
<summary>展开架构图</summary>

```
用户触发（右键菜单 / Dashboard / 侧边栏）
    │
    ▼
 选择上下文 ──► validateSelection ──► Workflow 引擎 ──► Provider 注册中心
                                          │                   │
                                    workflow.json        后端配置解析
                                    + hook 脚本          (多后端路由)
                                          │                   │
                                          ▼                   ▼
                                    构建请求 ──────► 解析 Provider ──► 任务队列
                                                                        │
                                                                  FIFO + 并发控制
                                                                        │
                                                        ┌───────────────┼───────────────┐
                                                        ▼               ▼               ▼
                                                  Single Run    Sequence Run    Pass-Through
                                                        │               │               │
                                                        └───────┬───────┘               │
                                                                ▼                       ▼
                                                         applyResult hook ──► Zotero Handlers
                                                                              笔记 / 标签 /
                                                                              附件 / 条目
```

核心设计理念：插件本身是一个**执行外壳**，不包含具体业务逻辑。通过声明式 `workflow.json` manifest 和 hook 脚本定义"做什么"，插件负责"怎么执行"。

</details>

更多架构细节见[用户文档站：自定义 Workflow](https://leike0813.github.io/Zotero-Skills/workflows/custom/)。

---

## 过渡版本说明

> **v0.5.0-alpha 是迈向"Zotero Agents"的重要里程碑。** 相比 v0.4.0（纯 Skill-Runner 前端），v0.5.0 完成了向通用 Agent 执行框架的全面转型 — 新增 ACP 后端支持、文献综合工作台、引文图谱、概念知识库、Host Bridge、MCP Server 等核心能力，已可在日常研究中稳定使用。
>
> 后续版本将继续：
> - 完善多语言支持和用户引导
> - 提升跨后端的一致性体验
> - 持续打磨稳定性和性能
>
> 如遇到问题请在 [Issues](https://github.com/leike0813/Zotero-Skills/issues) 反馈。

---

## 开发者文档

<details>
<summary>展开开发指南</summary>

### 本地开发

```bash
npm install          # 安装依赖
npm start            # 启动开发服务器
npm test             # 运行 lite 测试
npm run test:full    # 运行全量测试
npm run build        # 生产构建
```

### 文档索引

| 文档 | 说明 |
|------|------|
| [架构流程](doc/architecture-flow.md) | 执行管线总览（含 Mermaid 流程图） |
| [开发指南](doc/dev_guide.md) | 核心组件、配置模型、执行链路 |
| [工作流组件](doc/components/workflows.md) | Manifest schema、hooks、输入筛选、执行语义 |
| [Provider 组件](doc/components/providers.md) | Provider 契约系统、请求类型 |
| [测试策略](doc/testing-framework.md) | 双运行环境、lite/full 模式、CI 门禁 |
| [Synthesis 层](doc/synthesis-layer/README.md) | 知识图谱、引文图谱、概念知识库的内部设计 |

</details>

---

## 用户文档

完整的使用手册见在线文档站：[https://leike0813.github.io/Zotero-Skills/](https://leike0813.github.io/Zotero-Skills/)

涵盖：安装、后端配置、Backend Manager、Workflow 调用、Dashboard、侧边栏（ACP Chat / ACP Skills / SkillRunner）、Synthesis Workbench、WebDAV 同步、偏好设置、自定义 Workflow 开发等全部功能。

---

## 许可证

[AGPL-3.0-or-later](LICENSE)

## 致谢

- 基于 [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) 构建
- 使用 [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- 由 [@windingwind](https://github.com/windingwind) 的插件生态支持
