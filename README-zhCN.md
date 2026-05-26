<p align="center">
  <img src="addon/content/icons/icon_full.png" alt="Zotero Skills" width="128" />
</p>

<h1 align="center">Zotero Skills</h1>

<p align="center">
  <strong>面向 Zotero 7 的可插拔工作流引擎 — 将你的文献库变成 AI 驱动的研究中心。</strong>
</p>

<p align="center">
  <a href="https://github.com/leike0813/Zotero-Skills/releases"><img src="https://img.shields.io/github/v/release/leike0813/Zotero-Skills?style=flat-square&color=blue" alt="Release" /></a>
  <a href="https://github.com/leike0813/Zotero-Skills/blob/main/LICENSE"><img src="https://img.shields.io/github/license/leike0813/Zotero-Skills?style=flat-square" alt="License" /></a>
  <a href="https://www.zotero.org/"><img src="https://img.shields.io/badge/Zotero-7-CC2936?style=flat-square&logo=zotero&logoColor=white" alt="Zotero 7" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  简体中文 ·
  <a href="README-frFR.md">Français</a> ·
  <a href="README-jaJP.md">日本語</a>
</p>

---

## ✨ 什么是 Zotero Skills？

Zotero Skills 是一个面向 Zotero 7 的**框架型插件**，它提供了统一的 AI 与自动化工作流执行壳层：

- 📦 **可插拔工作流** — 业务逻辑以外部工作流包的形式存在，核心插件不包含任何具体业务代码。
- 🔌 **多后端支持** — 可将任务路由到 [Skill-Runner](https://github.com/leike0813/Skill-Runner)、通用 HTTP API 或本地透传逻辑。
- ⚡ **统一执行** — 选区上下文构建、请求编译、任务排队、结果落库和错误汇总均由共享运行时统一处理。

> 你可以把它理解为 **Zotero 中的工作流引擎** — 通过声明式 manifest 和 hook 脚本定义「做什么」，插件负责「怎么执行」。

## 🚀 核心能力

| 能力                  | 说明                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| **工作流引擎**        | 声明式 `workflow.json` + 可选 hooks（`filterInputs`、`buildRequest`、`applyResult`） |
| **Provider 注册中心** | 三种内建 provider：`skillrunner`、`generic-http`、`pass-through`                     |
| **后端管理器**        | GUI 管理每种 provider 下的多个后端配置                                               |
| **任务 Dashboard**    | 实时任务监控、SkillRunner 交互式对话、运行日志                                       |
| **Workflow 设置**     | 每个 workflow 支持持久化与一次性参数覆盖                                             |
| **Note 编辑器**   | 基于 Host 的渲染器框架，用于结构化数据编辑（如参考文献笔记）                         |
| **日志查看器**        | 可过滤的运行日志窗口，支持 NDJSON 导出用于诊断                                       |

## ✨ 为什么选择 Zotero Skills？

### 用订阅额度和 Coding Plan，而不是按量付费

文献分析类任务是 **Token 燃烧器** — 论文摘要、参考文献提取、引用分析、交互式问答，每一项都会消耗大量 Token。按量付费的 API 调用费用增长极快。

本插件让你直接用已有的 **Coding Plan** 和 **订阅额度**（OpenAI、Google、阿里百炼、智谱等）来运行 AI 工作流，零中间商赚差价。你的凭证直达后端，没有额外加价。

### 可插拔的工作流与 Skill

插件是一个**框架**，不是功能单体。所有东西都是可插拔的：

- **自带工作流**：把 workflow 包放进 workflows 目录，立即生效，无需重新编译插件。
- **自定义 Skill-Runner 技能**：用 Skill-Runner 的技能打包系统定义自己的 AI 技能，通过同一执行管线运行。
- **可共享的包**：Workflow 包支持共享 `lib/` 模块，方便构建内聚的工作流套件。

### 多后端灵活性

- 不同工作流路由到不同后端 — 有些走 Skill-Runner，有些走直连 HTTP API 或本地透传逻辑。
- 切换后端不需要改工作流定义 — provider 层处理转换。
- 提供稳定可靠的 agentic 业务执行框架和用户友好的开发界面。内建的工作流只是起点，执行管线才是核心资产。

## 💡 Engine 推荐

### Codex（首选推荐）

- **优点**：无论是 agent CLI 工具还是 LLM 模型都有标杆级的性能（速度、理解能力、输出稳定性等），支持思考过程输出，执行稳定。免费版可用，但有模型访问限制。
- **缺点**：免费版有模型访问限制（可能无法使用最新/最强的模型）。
- **结论**：大多数用户的首选推荐。即使免费版也能提供出色的结果。

### Opencode

- **优点**：支持多种模型提供商。推荐配合阿里巴巴的百炼 coding plan、智谱 coding plan 等使用。qwen3.5-plus、minimax-m2.5、kimi-k2.5、glm-5 等模型在文献理解、提炼、总结方面的性能已经可以完全满足实用要求。
- **缺点**：速度有时不太稳定。配合 deepseek API Key 勉强可用，但 deepseek v3.2 的性能已经严重落后；选 reasoner tier 可能需要忍受较慢的速度。支持通过第三方插件使用 antigravity 模型配额，但有封号风险。
- **结论**：如果您有符合条件的 API Key 或兼容订阅，这是最好的免费/低成本选择。

### Qwen Code

- **优点**：通过官方 OAuth 登录可~~**每天免费调用 1000 次**~~ Qwen3.6-Plus — 该免费额度已于 2026 年 4 月 15 日结束，但可以期待后续的官方活动。配合阿里巴巴 Coding Plan 中的 qwen 系列模型效果还不错。
- **缺点**：相对来说没有其他 engine 成熟。
- **结论**：配合阿里巴巴 Coding Plan 使用是个不错的选择。

### Gemini-CLI

- **优点**：有免费版可用。
- **缺点**：启动较慢，交互式任务体验不太好。**Google 已大幅削减 Pro 订阅用户配额**，性价比一般。
- **结论**：gemini-3-flash 模型可用于简单任务。

### Claude Code

- **优点**：指令执行效果好，输出稳定。
- **缺点**：执行效率较低，更适合代码类工作。
- **说明**：官方 Claude Code 集成（官方认证 + 官方模型）**作者未测试** — 直白说，**没买 Anthropic 订阅**。这么说吧，Anthropic 可能太"合法合规"了🤷。
- **替代方案**：本项目提供了第三方提供商的便捷配置入口。有自己 API Key 或其他渠道的用户可自行配置。
- **BTW**：拿这么贵的订阅来跑本项目有点大材小用 — 官方订阅**仅推荐富哥使用**。
- **结论**：如果你已有其他渠道的 Claude 访问权限，效果不错 — 但门槛比其他选项高。

## 📋 内建工作流

### Literature Workbench Package（文献工作bench包）

统一的文献处理工作流包：

| 工作流           | Provider       | 说明                                              |
| ---------------- | -------------- | ------------------------------------------------- |
| **文献摘要**     | `skillrunner`  | 从 markdown/PDF 生成 digest、参考文献和引用分析笔记  |
| **文献解读**     | `skillrunner`  | 交互式对话文献解读，结果以 conversation note 写回 |
| **导出笔记**     | `pass-through` | 导出自定义笔记（markdown/HTML）及文献摘要产物     |
| **导入笔记**     | `pass-through` | 导入 markdown 文件为自定义笔记，支持多文件选择    |
| **参考文献匹配** | `pass-through` | 将参考文献匹配为 citekey，回写结构化 payload      |
| **参考文献编辑** | `pass-through` | 在独立编辑窗口中维护结构化参考文献条目            |

### Tag Vocabulary Package（标签词表包）

受控词表管理工作流：

| 工作流       | Provider       | 说明                                                        |
| ------------ | -------------- | ----------------------------------------------------------- |
| **Tag 管理** | `pass-through` | 受控词表增删改查、facet 过滤、GitHub 同步（订阅/发布）      |
| **Tag 规整** | `skillrunner`  | 通过 LLM 建议规范化标签，将受控标签纳入条目                 |

### 其他工作流

| 工作流             | Provider       | 说明                                                  |
| ------------------ | -------------- | ----------------------------------------------------- |
| **MinerU**         | `generic-http` | 解析 PDF 附件，物化 markdown/资源并挂载到父条目       |
| **Workflow 调试探针** | `pass-through` | 用于排查运行时故障的诊断工作流（仅调试模式可见）  |

## 📥 安装

### 前置条件

- [Zotero 7](https://www.zotero.org/download/)（版本 ≥ 6.999）
- 使用 `skillrunner` 工作流时需要运行中的 [Skill-Runner](https://github.com/leike0813/Skill-Runner) 实例

### 安装步骤

1. 从 [Releases](https://github.com/leike0813/Zotero-Skills/releases) 页面下载最新的 `.xpi` 文件。
2. 在 Zotero 中：`工具` → `附加组件` → ⚙️ → `从文件安装附加组件…`
3. 选择下载的 `.xpi` 文件，重启 Zotero。

### 快速上手

#### 1. 部署 Skill-Runner（前置条件）

**一键本地部署**（推荐用于快速测试）

1. 打开 `编辑` → `首选项` → `Zotero Skills` → `SkillRunner Local Runtime`
2. 点击 **Deploy** 按钮，等待部署完成
3. 后端将自动配置完成

**Docker 部署**（推荐用于生产环境）

推荐采用 Docker 部署，详见 [Skill-Runner](https://github.com/leike0813/Skill-Runner) 项目说明：

```bash
mkdir -p skills data
docker compose up -d --build
```

- **API**: http://localhost:9813/v1
- **Admin UI**: http://localhost:9813/ui

#### 2. 配置后端

_若不使用一键部署_：打开 `编辑` → `首选项` → `Zotero Skills` → `Backend Manager`，添加 Skill-Runner 端点。

#### 3. 放置工作流

将工作流文件夹复制到工作流目录（可在首选项中配置）。

#### 4. 立即使用

右键选中的条目 → `Zotero-Skills` → 选择一个工作流。

## 🏗️ 架构概览

```
用户触发
    │
    ▼
选区上下文 ──► 工作流引擎 ──► Provider 注册中心 ──► 任务队列
                  │                   │                 │
            workflow.json        后端配置解析       FIFO + 并发控制
            + hook 脚本
                  │                   │                 │
                  ▼                   ▼                 ▼
            构建请求 ──► 解析 Provider ──► 执行 & 结果落库
                                              │
                                         Handlers:
                                         笔记 / 标签 /
                                         附件 / 条目
```

## 🧑‍💻 开发

```bash
npm install          # 安装依赖
npm start            # 启动开发服务器（含 mock Skill-Runner）
npm test             # 运行 lite 测试
npm run test:full    # 运行全量测试
npm run build        # 生产构建
```

详见 [开发指南](dev_guide.md)。

## 📖 文档索引

| 文档                                     | 说明                                       |
| ---------------------------------------- | ------------------------------------------ |
| [架构流程](architecture-flow.md)         | 执行管线总览（含 Mermaid 流程图）          |
| [开发指南](dev_guide.md)                 | 核心组件、配置模型、执行链路               |
| [工作流组件](components/workflows.md)    | Manifest schema、hooks、输入筛选、执行语义 |
| [Provider 组件](components/providers.md) | Provider 契约系统、请求类型                |
| [测试策略](testing-framework.md)         | 双运行环境、lite/full 模式、CI 门禁        |

## 📄 许可证

[AGPL-3.0-or-later](../LICENSE)

## 🙏 致谢

- 基于 [@windingwind](https://github.com/windingwind) 的 [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) 构建
- 使用 [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
