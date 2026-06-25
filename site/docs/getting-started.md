# 快速开始

## 1. 安装官方 Workflow 包

插件本身不含业务逻辑。安装插件后，首先需要安装官方 Workflow 包：

1. 在任意 Zotero 条目上右键 → **Zotero Agents** → **📦 安装官方 Workflow 包**
2. 等待下载和安装完成
3. 安装成功后可在 Dashboard 中看到所有官方 Workflow

也可以随时在 **Zotero → 设置 → Zotero Agents** 中安装或更新官方包。

## 2. 配置后端

### ACP 后端（首选）

这是最推荐的方案——只要本机安装了任意一款支持 ACP 的 Agent 工具即可，零额外配置。

1. 打开 **工具 → [后端管理器](backends/backend-manager)**
2. 切换到 **ACP** Tab
3. 从 **Add from Preset** 下拉菜单选择你的 Agent 工具（Codex / OpenCode / Claude Code 等）
4. 预置自动填充命令，点击右下角 **保存**

**首次使用 Agent 工具？** 请参照对应工具的官方文档完成安装：

| Agent | 安装指引 |
|-------|---------|
| **OpenCode** | [opencode.ai 文档](https://opencode.ai/docs) |
| **Codex** | [OpenAI Codex 文档](https://platform.openai.com/docs) |
| **Claude Code** | [Anthropic 文档](https://docs.anthropic.com/en/docs/claude-code) |
| **Gemini CLI** | [Google 文档](https://github.com/google-gemini/gemini-cli) |
| **Qwen Code** | [阿里云文档](https://help.aliyun.com/zh/model-studio/qwen-code) |

→ 详见 [ACP 后端配置](backends/acp)

### MinerU 后端（用于 PDF 解析）

MinerU workflow 可以将 PDF 转为 Markdown，是后续所有文献分析的最佳前置步骤。配置很简单：

1. 访问 [mineru.net](https://mineru.net) 注册账号，在 **API → API 管理** 获取 API Token
2. 打开 **工具 → [后端管理器](backends/backend-manager)**
3. 切换到 **Generic HTTP** Tab，点击 **添加 Generic HTTP**
4. 填写：显示名称 `MinerU Official` · Base URL `https://mineru.net` · 认证方式 `bearer` · 认证令牌粘贴 API Token · 超时 `60000`
5. 点击右下角 **保存**

→ 详见 [MinerU 使用文档](workflows/mineru)

### 备选：Docker 部署 Skill-Runner

如果需要后台持续执行或局域网共享，可以 [Docker 部署 Skill-Runner](backends/skill-runner#推荐docker-常驻部署)。部署后在 SkillRunner Tab 中添加后端实例。

> 详细的对话操作指南参见 [后端管理器](backends/backend-manager)。

## 3. 完整操作流程

以下是一个从零到一的完整流程，建议按顺序逐步体验。首先，在文献库中挑选一篇有 PDF 附件的文献。

### 第一步：PDF → Markdown（MinerU）

右键这篇文献（或直接右键其 PDF 附件），选择 **Zotero Agents → MinerU**。稍作等待后，PDF 同目录下会生成一篇 `.md` 格式的论文原文。

### 第二步：体验内置 Markdown 阅读器

在 Zotero 附件列表中找到刚生成的 `.md` 文件，**双击即可在内置阅读器中打开**——支持大纲导航、搜索、数学公式和代码高亮渲染。如果不习惯内置阅读器，可以在偏好设置中关闭，改回系统默认打开方式。

→ 详见 [内置 Markdown 阅读器](markdown-reader)

### 第三步：执行文献分析

右键这篇文献（或直接右键 `.md` 附件），选择 **Zotero Agents → 文献分析**。Agent 将自动生成三份产物，完成后在条目下会出现三个笔记附件：

| 笔记 | 内容 |
|------|------|
| **Digest** | 文献摘要——研究背景、方法、结果和结论 |
| **References** | 结构化参考文献——表格形式的引用清单 |
| **Citation Analysis** | 引文分析报告——引用上下文和引用意图分类 |

→ 详见 [文献分析](workflows/literature-analysis)

### 第四步：交互式文献解读

如果对这篇文献有任何疑问，右键选择 **Zotero Agents → 文献解读**。侧边栏会自动打开聊天面板，你可以与 Agent 围绕文献内容自由对话。Agent 的回答经过验证门禁，不用担心凭空编造。对话结束后，问答记录会生成为学习笔记。

→ 详见 [文献解读](workflows/literature-explainer)

### 第五步：深度阅读

当你需要全面、系统地精读一篇重要论文时，右键选择 **Zotero Agents → 深度阅读**。Agent 会产出一份精美的独立 HTML 文档——包含章节分析、关键概念、参考文献和双语翻译。叠加你的文献库信息后（如有），这份文档还会携带领域研究脉络、相关概念和关键问题等更丰富的内容。

→ 详见 [深度阅读](workflows/literature-deep-reading)

### 第六步：Topic 综合——从单篇到全局

当文献库拥有一定规模，且相关文献都已经执行过文献分析和标签规范化之后，就可以创建 Topic 综合了。

从 Dashboard 运行 **Create Topic Synthesis**，输入研究方向描述，Agent 会自动梳理库内相关文献，生成一份极尽严谨、准确、全面的综合分析报告。这份报告完全基于你的文献库内容编写，远比通用 AI 的回答更精确可靠。

→ 详见 [Topic 综合创建](workflows/topic-synthesis)

## 下一步

- **批量化处理**：对库内文献批量执行 [文献分析](workflows/literature-analysis)，为 Synthesis 打基础
- **标签体系**：用 [Tag Bootstrapper](workflows/tag-bootstrapper) 创建受控词表，让元数据更规范
- **图谱探索**：在 [Synthesis Workbench](synthesis) 中可视化你的引文网络
- **自定义开发**：参考 [自定义 Workflow](workflows/custom/) 创建专属工作流
- **反馈问题**：在 [GitHub](https://github.com/leike0813/zotero-agents/issues) 或 [Gitee](https://gitee.com/leike0813/zotero-agents/issues) 报告问题
