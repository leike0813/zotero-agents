# Workflow 介绍

## 什么是 Workflow？

Workflow（工作流）是 Zotero Agents 的核心功能，它允许您将多个技能步骤组合成自动化的处理流水线。一个 Workflow 定义了一个完整的任务：从接收输入、处理数据、到输出结果。

## Workflow 的结构

```
workflow.json（清单文件）
├── manifest：声明元数据、版本、名称
├── parameters：定义可配置的参数
├── inputs：定义输入类型（附件、条目、笔记等）
├── validateSelection：声明式输入验证和过滤
├── hooks：JavaScript 钩子脚本（预检、构建请求、应用结果）
└── provider：指定需要的后端类型
```

### 输入单元类型

| 类型 | 说明 |
|------|------|
| `attachment` | 条目的附件文件 |
| `parent` | 选中条目的父条目 |
| `child` | 子条目 |
| `selection` | 直接选中的条目 |
| `note` | 笔记条目 |
| `generated-note` | 由 workflow 生成的笔记 |
| `digest-image-target` | 摘要代表图片目标 |
| `workflow` | 批量作用域（无需选择） |

### 钩子系统（Hooks）

Workflow 可以在执行的各个阶段运行自定义 JavaScript 脚本：

- **validateSelection**：在 JavaScript hook 运行之前声明式地过滤和验证输入
- **preflight**：检查已解析的输入单元，附加执行上下文，跳过、短路到 `applyResult`，或将一个输入扩展为多个请求单元
- **buildRequest**：构建发送给后端的请求内容
- **normalizeSettings**：规范化用户设置
- **applyResult**：将后端返回的结果应用到 Zotero

## 四种执行方式

Workflow 可以通过四种后端类型执行：

| 后端 | 请求类型 | 适用场景 |
|------|---------|---------|
| **Skill-Runner** | `skillrunner.job.v1` / `skillrunner.sequence.v1` | 通用技能执行，支持交互模式 |
| **ACP** | `acp.prompt.v1` / `acp.skill.run.v1` / `skillrunner.sequence.v1` | 对话或技能执行通过 ACP 后端 |
| **Generic HTTP** | `generic-http.request.v1` / `generic-http.steps.v1` | HTTP API 调用 |
| **Pass-through** | `pass-through.run.v1` | 纯本地操作，无需远程后端 |

## 官方 Workflow 包

官方 Workflow 以**独立包**的形式发布和安装，与插件本体解耦。安装方式：

- 右键菜单 → **Zotero Agents** → **📦 安装官方 Workflow 包**
- 偏好设置中点击 **安装官方 Workflow 包**

官方包支持 stable / beta / dev 三个更新频道，插件启动时自动检查更新。

## 官方 Workflows

插件附带了一系列官方 workflow，按功能分组：

### 📚 文献分析工具包

| Workflow | 用途 | 输入 | 后端 | 文档 |
|---------|------|------|------|------|
| **文献分析** ⭐ | 从 PDF/MD 生成摘要、参考文献、引文分析。可级联标签规范化 | 附件 | Skill-Runner | [详情](literature-analysis) |
| **文献元数据整理** | 查询、修正并补全 Zotero 条目的书目元数据 | 父条目 | Skill-Runner | [详情](literature-metadata-curator) |
| **文献翻译** | 带术语管理和质量门禁的学术文献翻译 | 附件 | Skill-Runner | [详情](literature-translator) |
| **交互式文献解读** | 与 AI 多轮对话深入理解文献，答案经验证门禁防幻觉 | 附件 | Skill-Runner | [详情](literature-explainer) |
| **深度阅读** | 生成结构化精读 HTML 视图，支持翻译 | 附件 | ACP | [详情](literature-deep-reading) |
| **文献搜索与入库** | 让 Agent 搜索学术文献并直接入库到 Zotero | workflow | ACP | [详情](literature-search-ingest) |
| **导出/导入文献包** | 导出/导入含元数据、附件和笔记的 Zotero 条目便携式 ZIP 包 | 父条目 / workflow | Pass-through | [详情](export-import-literature-bundle) |
| **导出研究包** | 从现有库和 Synthesis 上下文自动组装论文项目的只读研究包 | workflow | Skill-Runner | [详情](export-research-bundle) |
| **标签审计** | 扫描库中所有条目的受控标签词表合规性并报告 | workflow | Pass-through | [详情](tag-auditor) |
| **Collection 文献收集器** | 根据指定范围从现有文献库中筛选文献并加入 collection | workflow | ACP | [详情](collection-collector) |
| **标签词表初始化** | 与 AI 交互创建研究领域的受控标签词表 | workflow | Skill-Runner | [详情](tag-bootstrapper) |
| **标签规范化** | 基于受控词表规范化标签，推断新标签 | 父条目 | Skill-Runner | [详情](tag-regulator) |
| **导出/导入笔记** | 导出或导入分析笔记，支持编辑后重新导入 | 父条目 | Pass-through | [详情](export-import-notes) |
| **Add Digest Representative Image** | 为文献摘要添加代表图片 | 父条目 | ACP | — |

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
