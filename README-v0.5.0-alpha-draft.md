<p align="center">
  <img src="assets/poster.png" alt="Zotero Skills" width="800" />
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
</p>

---

读了上百篇论文，但没法快速看清它们**之间的关系**？

想做文献综述，但光是**梳理主题和线索**就耗费了数周？

> **Zotero Skills 让 AI Agent 直接在你的 Zotero 文献库中工作** — 自动提取、解读、关联文献，把零散的论文变成可探索的知识网络。

---

## 快速导航

| 我是… | 从这里开始 |
|--------|-----------|
| 🔰 新用户，想了解能做什么 | → [核心功能](#核心功能) → [3 步快速上手](#3-步快速上手) |
| 📄 想快速处理论文（摘要、解读） | → [日常文献处理](#日常文献处理) |
| 📊 在做文献综述，需要系统化知识 | → [文献综合工作台](#文献综合工作台) |
| 🛠 开发者，想看架构和 API | → [架构概览](#架构概览) |
| 📚 需要完整使用手册 | → [用户文档站](https://leike0813.github.io/Zotero-Skills/) |

---

## 核心功能

### 日常文献处理

每天都要用到的功能，右键论文即可触发。

| 功能 | 说明 | 怎么用 |
|------|------|--------|
| 🔍 **文献摘要** | AI 自动生成论文摘要、提取参考文献、输出引文分析报告 | 右键论文 → `文献分析` |
| 💬 **交互式文献解读** | 多轮对话深入理解论文，像跟导师讨论一样 | 右键论文 → `文献解读` |
| 📖 **深度阅读** | 生成结构化精读视图，支持多段翻译和概念解析 | 右键论文 → `深度阅读` |
| 🏷️ **标签规范化** | 基于受控词表自动规整标签，推断新标签 | 右键条目 → `标签规范化` |
| 🔎 **文献搜索与入库** | 搜索新文献，确认后直接入库到 Zotero | Dashboard → `文献搜索与入库` |
| 📋 **PDF 解析** | 将 PDF 转为 Markdown（调用 MinerU 服务） | 右键 PDF → `MinerU` |
| 📤 **笔记导出/导入** | 批量导出摘要和笔记为 Markdown，或导入外部笔记 | 右键选中条目 → 导出/导入 |

---

### 文献综合工作台

把零散的论文变成**可探索的知识网络**。这是本插件与其他 Zotero 工具最根本的不同。

> 日常文献处理帮你**读**论文，文献综合工作台帮你**组织**知识。

工作台是 Zotero 中的一个完整 Workspace Tab，包含 8 个 Surface：

| Surface | 功能 |
|---------|------|
| **Home** | 文献库概览仪表板：库洞察卡片、Git 同步面板、热门主题入口 |
| **Topics** | 主题管理（创建/更新/浏览），支持图/网格/列表三种视图 |
| **Index** | 规范参考文献索引：论文注册表 + 引用绑定 + 合并/去重/重定向 |
| **Review** | 审核中心：引用匹配审核、概念审核、主题图关系审核（接受/拒绝/批量操作）|
| **Graph** | 引文图谱可视化（力导向/径向/组件布局），按主题过滤，节点搜索 |
| **Tags** | 受控标签词表管理 + AI 标签建议审批（Promote/Discard） |
| **Concepts** | 概念知识库：概念/义项/别名/关系四层结构，可叠加到主题图和阅读器 |
| **Reader** | 主题阅读器：Overview / Taxonomy / Claims / Compare / Future Directions / Coverage / References / Report 8 个子页面 |

工作台还内置 **Git 同步**功能，可将标签词表、主题综合、概念知识库等结构化数据同步到 Git 仓库，实现版本管理和团队协作。

---

### 让你的 Zotero 成为可编程的文献服务

Zotero 启动时，插件会自动运行一个本地 Host Bridge 服务。外部 AI 工具（如 Codex、OpenCode 等）可以**直接访问你的 Zotero 文献库** — 读取论文、搜索条目、管理标签，甚至触发 AI 工作流。

- 🔌 外部 Agent 直接读取 Zotero 文献库，无需手动导出
- ⚡ 通过桥接触发 AI 工作流执行
- 🔒 本地运行，Token 认证，数据不外传

---

### AI 引擎推荐

本插件不绑定任何 AI 服务商。你用自己的订阅额度、Coding Plan 或 API Key 直接连接后端。Skill-Runner 后端支持 5 种引擎：

| 引擎 | 适合场景 | 费用 | 推荐度 |
|------|---------|------|--------|
| **Codex** | 综合最佳，速度与质量兼得 | 免费版可用 | ⭐ 首选 |
| **Opencode** | 配合国内 Coding Plan（百炼、智谱等） | 低成本 | ⭐ 强烈推荐 |
| **Qwen Code** | 阿里生态用户 | 免费额度已结束 | 可选 |
| **Gemini CLI** | 简单任务 | 免费版可用 | 一般 |
| **Claude Code** | 质量高但执行效率较低，更适合代码 | 付费 | 按需选 |

> 各引擎的详细对比可参考[用户文档站](https://leike0813.github.io/Zotero-Skills/backends/skill-runner#引擎系统)。

---

## 3 步快速上手

### 1. 安装插件

从 [Releases](https://github.com/leike0813/Zotero-Skills/releases) 下载 `.xpi` 文件，在 Zotero 中：`工具` → `附加组件` → ⚙️ → `从文件安装附加组件…`，重启即可。

### 2. 一键部署 AI 后端

打开 `编辑` → `首选项` → `Zotero Skills` → `SkillRunner Local Runtime`，点击 **Deploy**，等待部署完成。

### 3. 在任意一篇论文上右键运行

部署完成后，在 Zotero 文献列表中**右键一篇论文**，选择 `Zotero Skills` → `文献分析`。几分钟后，你会在笔记面板中看到 AI 生成的摘要、参考文献清单和引文分析。

> 详细的配置和用法见[用户文档站](https://leike0813.github.io/Zotero-Skills/)。

---

## 安装与配置

### 系统要求

- [Zotero 7](https://www.zotero.org/download/)（版本 ≥ 6.999）
- 对于 `skillrunner` 工作流：运行中的 [Skill-Runner](https://github.com/leike0813/Skill-Runner) 实例（一键部署已包含）
- 如需使用 ACP 后端（Codex、OpenCode 等）：已安装对应的 CLI 工具

### 后端配置

插件支持 4 种后端类型，可在 Backend Manager 中配置：

| 后端类型 | 用途 | 配置方式 |
|---------|------|---------|
| **Skill-Runner** | 通用技能执行（默认），支持一键部署 | 偏好设置中 Deploy / 远程 URL 配置 |
| **ACP** | 直连 Agent CLI（Codex、OpenCode 等） | 在 Backend Manager 中添加 |
| **Generic HTTP** | 对接任意 HTTP API（如 MinerU） | 在 Backend Manager 中添加 |
| **Pass-Through** | 纯本地执行，无需外部后端 | 自动可用，无需配置 |

---

## 常见使用场景

### 场景 A：新论文入库 → 快速了解

```
下载新论文 → 右键 PDF → MinerU（转 Markdown）
           → 右键论文 → 文献分析（AI 摘要 + 参考文献 + 引文分析）
           → 右键论文 → 文献解读（交互式问答深入理解）
```

### 场景 B：撰写文献综述

```
打开工作台 → 进入"文献综合工作台"
  → 在 Home 页面查看当前库的论文数和主题分布
  → 创建新 Topic（触发 AI 流水线自动分析）
  → 在 Topic Inspector 中浏览 Taxonomy / Claims / Compare / Report
  → 在 Graph 页面查看引文图谱，检查引用完整性
  → 用 Git 同步保存研究进度
```

### 场景 C：团队标签规范

```
打开工作台 → 进入 Tags 页面
  → 导入或定义团队受控词表（8 个 Facet）
  → 选中一批论文 → "标签规范化"
  → AI 建议的标签通过审核后加入词表
  → 词表通过 Git 同步给团队成员
```

### 场景 D：文献引用溯源

```
打开工作台 → 进入 Graph 页面
  → 搜索关键论文 → 查看其引用和被引关系
  → 切换到 Radial 布局以该论文为中心展开
  → 进入 Index 页面查看引用绑定状态
  → 切换到 Review 页面审核匹配结果
```

---

## 架构概览

<details>
<summary>展开架构图</summary>

```
用户触发（右键菜单 / 工作台 / 侧边栏）
    │
    ▼
选择上下文 ──► Workflow 引擎 ──► Provider 注册中心 ──► 任务队列
                  │                   │                  │
            workflow.json        后端配置解析       FIFO + 并发控制
            + hook 脚本
                  │                   │                  │
                  ▼                   ▼                  ▼
            构建请求 ──► 解析 Provider ──► 执行 & 结果落库
                                                  │
                                              applyResult hook
                                                  │
                                                  ▼
                                          Zotero Handlers:
                                          笔记 / 标签 / 附件 / 条目
```

核心设计理念：插件本身是一个**执行外壳**，不包含具体业务逻辑。通过声明式 `workflow.json` manifest 和 hook 脚本定义"做什么"，插件负责"怎么执行"。工作流系统采用**插拔式架构**，用户可自行编写自定义 workflow。

</details>

更多架构细节见[用户文档站：自定义 Workflow](https://leike0813.github.io/Zotero-Skills/workflows/custom/)。

---

## 过渡版本说明

> **v0.5.0-alpha 是迈向"Zotero Agents"的重要里程碑。** 当前版本已具备文献综合工作台、ACP 后端支持、Host Bridge、受控词表管理等核心能力，可以在日常使用中稳定工作。
>
> 后续版本将继续：
> - 完善多语言支持
> - 统一安装和配置体验
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
npm start            # 启动开发服务器（含 mock Skill-Runner）
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

</details>

---

## 用户文档

完整的使用手册见在线文档站：[https://leike0813.github.io/Zotero-Skills/](https://leike0813.github.io/Zotero-Skills/)

涵盖：安装、后端配置、Workflow 调用、Dashboard、侧边栏、Synthesis Workbench、偏好设置、自定义 Workflow 开发等全部功能。

---

## 许可证

[AGPL-3.0-or-later](LICENSE)

## 致谢

- 基于 [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) 构建
- 使用 [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- 由 [@windingwind](https://github.com/windingwind) 的插件生态支持
