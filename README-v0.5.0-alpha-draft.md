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

参考文献格式混乱，一篇篇手工整理 citekey 要花一下午？

想做文献综述，但光是**梳理主题和线索**就耗费了数周？

> **Zotero Skills 让 AI Agent 直接在你的 Zotero 文献库中工作** — 自动提取、解读、关联文献，把零散的论文变成可探索的知识网络。

---

## 快速导航

| 我是… | 从这里开始 |
|--------|-----------|
| 🔰 新用户，想了解能做什么 | → [核心功能](#核心功能) → [3 步快速上手](#3-步快速上手) |
| 📄 想快速处理论文（摘要、解读、匹配） | → [日常文献处理](#日常文献处理) |
| 📊 在做文献综述，需要系统化知识 | → [文献综合工作台](#文献综合工作台) |
| 🛠 开发者，想看架构和 API | → [开发者文档](#开发者文档) |

---

## 核心功能

### 日常文献处理

每天都要用到的功能，右键论文即可触发。

| 功能 | 说明 | 怎么用 |
|------|------|--------|
| 🔍 **文献速读** | AI 自动生成论文摘要、提取参考文献、输出引用分析笔记 | 右键论文 → `文献摘要` |
| 💬 **文献问答** | 交互式对话解读论文，像跟导师讨论一样深入理解 | 右键论文 → `文献解读` |
| 🔗 **引用匹配** | 自动匹配 Better BibTeX citekey，告别手工整理引用列表 | 打开摘要笔记 → 触发匹配 |
| ✏️ **引用编辑** | 结构化编辑参考文献条目，支持批量维护 | 笔记面板 → 参考文献编辑器 |
| 📋 **PDF 解析** | 将 PDF 论文一键转成整洁的 Markdown 文档 | 右键 PDF → `MinerU` |
| 📤 **笔记导入/导出** | 批量导出摘要和笔记为 Markdown，或导入外部笔记 | 右键选中条目 |

<!-- TODO: 右键菜单截图 -->

---

### 文献综合工作台

把零散的论文变成**可探索的知识网络**。这是本插件与其他 Zotero 工具最根本的不同。

> 日常文献处理帮你**读**论文，文献综合工作台帮你**组织**知识。

<!-- TODO: 工作台总览截图 -->

| 📊 **引用图谱可视化** | 📑 **主题合成** | 🏷️ **受控词表管理** |
|:--|:--|:--|
| 谁引用了谁？一目了然。 | 按主题组织文献，一键生成综述报告。 | 规范标签体系，分类不再混乱。 |
| • 交互式 sigma.js 图谱<br>• 节点搜索与高亮<br>• 引用方向指示<br>• 外部引用联动 | • 按研究主题聚合论文<br>• 提取核心论点与证据<br>• 自动发现遗漏文献<br>• 综述报告导出 | • 标签增删改查<br>• 导入/导出/验证<br>• GitHub 团队同步<br>• AI 标签规范化 |

| 🧠 **概念知识库** | 🔍 **引用审查中心** | 📖 **文献阅读器** |
|:--|:--|:--|
| 自动提取论文关键概念，消解歧义，管理概念间关系。 | 集中审查所有引用匹配、清理索引数据。 | 多段式详情视图，一站式浏览论文信息与证据。 |
| • 概念自动提取<br>• 歧义消解<br>• 概念关系管理<br>• 与主题联动 | • 统一审查面板<br>• 引用匹配审核<br>• 索引清理<br>• 批量接受/拒绝 | • 分类/声明/引用/对比等多段视图<br>• 证据浏览器<br>• 时间线聚类<br>• 摘要模态框 |

<!-- TODO: 引用图谱截图 / GIF -->

---

### 让你的 Zotero 成为可编程的文献服务

启动 Zotero 时，插件会自动运行一个本地 HTTP 服务。外部 AI 工具（如 Codex、OpenCode 等）可以**直接访问你的 Zotero 文献库** — 读取论文、搜索条目、管理标签，甚至触发 AI 工作流。

- 🔌 外部 Agent 直接读取 Zotero 文献库，无需手动导出
- ⚡ 通过桥接触发 AI 工作流执行
- 🔒 本地运行，Token 认证，数据不外传

---

### AI 引擎推荐

本插件不绑定任何 AI 服务商。你用自己的订阅额度、Coding Plan 或 API Key 直接连接后端，**零中间商赚差价**。

| 引擎 | 适合场景 | 费用 | 推荐度 |
|------|---------|------|--------|
| **Codex** | 综合最佳，速度与质量兼得 | 免费版可用 | ⭐ 首选 |
| **Opencode** | 配合国内 Coding Plan（百炼、智谱等） | 低成本 | ⭐ 强烈推荐 |
| **Qwen Code** | 阿里生态用户 | 免费额度已结束 | 可选 |
| **Gemini CLI** | 简单任务 | 免费版可用 | 一般 |
| **Claude Code** | 质量高但门槛高 | 付费 | 富哥专属 |

<details>
<summary>各引擎详细评测</summary>

**Codex** — 无论是 Agent CLI 工具还是 LLM 模型，都有标杆级性能（速度、理解能力、输出稳定性）。支持思考过程输出，执行稳定。免费版有模型访问限制。

**Opencode** — 支持多种模型提供商。Qwen3.5-Plus、MiniMax-M2.5、Kimi-K2.5、GLM-5 等模型在文献理解、提炼、总结方面的表现已完全满足实用要求。DeepSeek API 可用但 V3.2 性能已落后。支持第三方 antigravity 配额（有封号风险）。

**Qwen Code** — 配合阿里 Coding Plan 效果不错。官方每日免费 1000 次额度已于 2026 年 4 月结束。

**Gemini CLI** — 启动较慢，交互式任务体验一般。Google 已大幅削减 Pro 订阅配额。Gemini-3-Flash 可用于简单任务。

**Claude Code** — 指令执行效果好，输出稳定。执行效率较低，更适合代码类工作。官方集成门槛高。第三方提供商入口可用。

</details>

---

## 3 步快速上手

### 1. 安装插件

从 [Releases](https://github.com/leike0813/Zotero-Skills/releases) 下载 `.xpi` 文件，在 Zotero 中：`工具` → `附加组件` → ⚙️ → `从文件安装附加组件…`，重启即可。

### 2. 一键部署 AI 后端

打开 `编辑` → `首选项` → `Zotero Skills` → `SkillRunner Local Runtime`，点击 **Deploy**，等待部署完成。后端将自动配置，无需额外操作。

<!-- TODO: 一键部署截图 -->

<details>
<summary>或使用 Docker 部署（适合生产环境）</summary>

```bash
mkdir -p skills data
docker compose up -d --build
```

- API: `http://localhost:9813/v1`
- Admin UI: `http://localhost:9813/ui`

详见 [Skill-Runner](https://github.com/leike0813/Skill-Runner)。

</details>

### 3. 首次体验

在 Zotero 文献列表中**右键一篇论文**，选择 `Zotero-Skills` → `文献摘要`。几分钟后，你会在笔记面板中看到 AI 生成的摘要、参考文献清单和引用分析。

<!-- TODO: 首次体验 GIF -->

---

## 安装与配置

### 系统要求

- [Zotero 7](https://www.zotero.org/download/)（版本 ≥ 6.999）
- 对于 `skillrunner` 工作流：运行中的 [Skill-Runner](https://github.com/leike0813/Skill-Runner) 实例（一键部署已包含）
- 如需使用 ACP 后端（Codex、OpenCode 等）：已安装对应的 CLI 工具

### 多后端配置

你可以在 `首选项` → `Backend Manager` 中添加多个后端配置，不同工作流可路由到不同后端。

<!-- TODO: 后端配置截图 -->

- **Skill-Runner**：默认后端，一键部署即可使用
- **ACP**：直连 Codex、OpenCode、Qwen Code 等 Agent CLI
- **Generic HTTP**：对接任意 HTTP API
- **Pass-Through**：纯本地运行，无需外部后端

### 工作流目录

工作流包存放在可配置的目录中（默认为 Zotero 数据目录下的 `workflows/`）。内置工作流已随插件分发，但你也可以放置自定义工作流包。

---

## 常见使用场景

### 场景 A：新论文入库 → 快速了解

```
下载新论文 → 右键 PDF → MinerU（转 Markdown）
           → 右键论文 → 文献摘要（AI 自动摘要 + 提取参考文献）
           → 右键论文 → 文献解读（交互式问答深入理解）
```

### 场景 B：撰写文献综述

```
打开工作台 → 进入"文献综合工作台"
  → 按研究主题创建"主题"
  → 将相关论文加入主题
  → AI 自动发现遗漏文献，提取核心论点
  → 生成综述报告
  → 在"引用图谱"中检查引用完整性
  → 用 Git 同步保存研究进度
```

### 场景 C：团队标签规范

```
打开工作台 → 进入"受控词表管理"
  → 导入或定义团队的受控词表
  → 选中一批论文 → "AI 标签规整"
  → 词表通过 GitHub 同步给团队成员
  → 定期运行"验证"检查标签一致性
```

### 场景 D：文献引用溯源

```
打开工作台 → 进入"引用图谱"
  → 搜索关键论文 → 查看其引用和被引关系
  → 点击节点直达论文详情
  → 发现跨领域引用线索
  → 在"引用审查中心"审核匹配结果
```

---

## 过渡版本说明

> **v0.5.0-alpha 是一个过渡版本。** 它包含了大量新功能（文献综合工作台、ACP 后端支持、Host Bridge 等），但仍需在实际使用中测试成熟，并在后续进行一轮技术债务清理。
>
> 稳定版将在重构完成后以 **Zotero Agents** 的名义正式发布，届时将有：
> - 更稳定的 API 接口
> - 更完善的多语言支持
> - 更统一的安装和配置体验
>
> 欢迎尝鲜使用！如遇到问题请在 [Issues](https://github.com/leike0813/Zotero-Skills/issues) 反馈。

---

## 架构概览

<details>
<summary>展开架构图</summary>

```
用户触发（右键菜单 / 工作台）
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

核心设计理念：插件本身是一个**执行外壳**，不包含具体业务逻辑。你通过声明式 manifest 和 hook 脚本定义"做什么"，插件负责"怎么执行"。

</details>

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

## 许可证

[AGPL-3.0-or-later](LICENSE)

## 致谢

- 基于 [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) 构建
- 使用 [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- 由 [@windingwind](https://github.com/windingwind) 的插件生态支持
