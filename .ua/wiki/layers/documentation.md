
# 项目文档与规范

项目与资产的说明性文档：多语言 README、AGENTS.md 工程约束、CONTEXT.md 上下文说明，以及工作流包与 Skill 目录内的使用说明。
> 本页由知识图谱分层 `layer:documentation` 生成，共 44 个文件级节点。

## 目录分布

| 目录 | 文件数 |
| --- | --- |
| [.](../modules/index.md) | 13 |
| [skills_src/zotero-bridge-cli](../modules/skills_src/zotero-bridge-cli.md) | 2 |
| [skills_src/literature-deep-reading/templates](../modules/skills_src/literature-deep-reading/templates.md) | 1 |
| [skills_src/zotero-library-agent/skills/zotero-library-agent](../modules/skills_src/zotero-library-agent/skills/zotero-library-agent.md) | 1 |
| [skills_src/zotero-library-agent/skills/zotero-library-curation](../modules/skills_src/zotero-library-agent/skills/zotero-library-curation.md) | 1 |
| [skills_src/zotero-library-agent/skills/zotero-library-query](../modules/skills_src/zotero-library-agent/skills/zotero-library-query.md) | 1 |
| [skills_src/zotero-library-agent/skills/zotero-literature-acquisition](../modules/skills_src/zotero-library-agent/skills/zotero-literature-acquisition.md) | 1 |
| [skills_src/zotero-library-agent/skills/zotero-literature-analysis](../modules/skills_src/zotero-library-agent/skills/zotero-literature-analysis.md) | 1 |
| [skills_src/zotero-library-agent/skills/zotero-research-synthesis](../modules/skills_src/zotero-library-agent/skills/zotero-research-synthesis.md) | 1 |
| [tools/synthesis-index-harness](../modules/tools/synthesis-index-harness.md) | 1 |
| [workflows_builtin/literature-workbench-package/collection-collector](../modules/workflows_builtin/literature-workbench-package/collection-collector.md) | 1 |
| [workflows_builtin/literature-workbench-package/export-literature-bundle](../modules/workflows_builtin/literature-workbench-package/export-literature-bundle.md) | 1 |
| [workflows_builtin/literature-workbench-package/export-notes](../modules/workflows_builtin/literature-workbench-package/export-notes.md) | 1 |
| [workflows_builtin/literature-workbench-package/export-research-bundle](../modules/workflows_builtin/literature-workbench-package/export-research-bundle.md) | 1 |
| [workflows_builtin/literature-workbench-package/import-literature-bundle](../modules/workflows_builtin/literature-workbench-package/import-literature-bundle.md) | 1 |
| [workflows_builtin/literature-workbench-package/import-notes](../modules/workflows_builtin/literature-workbench-package/import-notes.md) | 1 |
| [workflows_builtin/literature-workbench-package/literature-analysis](../modules/workflows_builtin/literature-workbench-package/literature-analysis.md) | 1 |
| [workflows_builtin/literature-workbench-package/literature-deep-reading](../modules/workflows_builtin/literature-workbench-package/literature-deep-reading.md) | 1 |
| [workflows_builtin/literature-workbench-package/literature-explainer](../modules/workflows_builtin/literature-workbench-package/literature-explainer.md) | 1 |
| [workflows_builtin/literature-workbench-package/literature-metadata-curator](../modules/workflows_builtin/literature-workbench-package/literature-metadata-curator.md) | 1 |
| [workflows_builtin/literature-workbench-package/literature-search-ingest](../modules/workflows_builtin/literature-workbench-package/literature-search-ingest.md) | 1 |
| [workflows_builtin/literature-workbench-package/literature-translator](../modules/workflows_builtin/literature-workbench-package/literature-translator.md) | 1 |
| [workflows_builtin/literature-workbench-package/tag-auditor](../modules/workflows_builtin/literature-workbench-package/tag-auditor.md) | 1 |
| [workflows_builtin/literature-workbench-package/tag-bootstrapper](../modules/workflows_builtin/literature-workbench-package/tag-bootstrapper.md) | 1 |
| [workflows_builtin/literature-workbench-package/tag-regulator](../modules/workflows_builtin/literature-workbench-package/tag-regulator.md) | 1 |
| [workflows_builtin/mineru](../modules/workflows_builtin/mineru.md) | 1 |
| [workflows_builtin/synthesis-layer/create-topic-synthesis](../modules/workflows_builtin/synthesis-layer/create-topic-synthesis.md) | 1 |
| [workflows_builtin/synthesis-layer/manuscript-literature-framing](../modules/workflows_builtin/synthesis-layer/manuscript-literature-framing.md) | 1 |
| [workflows_builtin/synthesis-layer/topic-planner](../modules/workflows_builtin/synthesis-layer/topic-planner.md) | 1 |
| [workflows_builtin/synthesis-layer/update-topic-synthesis](../modules/workflows_builtin/synthesis-layer/update-topic-synthesis.md) | 1 |
| [workflows_builtin/workflow-debug-probe](../modules/workflows_builtin/workflow-debug-probe.md) | 1 |

## 文件清单

| 文件 | 类型 | 语言 | 摘要 |
| --- | --- | --- | --- |
| [AGENTS.md](../files/AGENTS.md.md) | 文档 | — | 面向 AI 编码代理的项目规约文档：规定目录结构、工作流/Transcript/Broker 等领域概念，以及 Synthesis sidecar、Citation Graph、Assistant Workspace 等模块的硬性架构约束。 |
| [CONTEXT.md](../files/CONTEXT.md.md) | 文档 | — | 项目领域词汇表：以"术语 + 应避免的近义说法"的形式定义 System End-to-End Test、Contract Integration Test、Reference 体系、Citation Graph Application、Zotero Host Capability Broker、Workflow Host API Projection 等核心概念。 |
| [README-de.md](../files/README-de.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（德语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-esES.md](../files/README-esES.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（西班牙语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-frFR.md](../files/README-frFR.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（法语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-itIT.md](../files/README-itIT.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（意大利语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-jaJP.md](../files/README-jaJP.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（日语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-koKR.md](../files/README-koKR.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（韩语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-ptBR.md](../files/README-ptBR.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（巴西葡萄牙语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-ruRU.md](../files/README-ruRU.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（俄语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-zhCN.md](../files/README-zhCN.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（简体中文），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-zhTW.md](../files/README-zhTW.md.md) | 文档 | — | Zotero Agents 插件的多语言项目说明文档（繁体中文），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README.md](../files/README.md.md) | 文档 | — | Zotero Agents 插件的主项目文档（英文内容源）：说明以工作流协议与 ACP 驱动 AI Agent 在 Zotero 文献库内执行文献分析、引用图谱与知识综合的定位，涵盖特性、安装构建、目录结构、内置工作流与 Skill、测试与 E2E 流程、致谢。 |
| [skills_src/literature-deep-reading/templates/SKILL.md](../files/skills_src/literature-deep-reading/templates/SKILL.md.md) | 文档 | — | literature-deep-reading skill 的代理说明文档，定义各阶段任务、提交要求、产物契约与渲染约束。 |
| [skills_src/zotero-bridge-cli/README.md](../files/skills_src/zotero-bridge-cli/README.md.md) | 文档 | — | Zotero Bridge CLI Skill 包的入口说明文档，仅一句话指引 Agent 阅读同目录的 SKILL.md 了解 Zotero Bridge CLI 的使用方式。 |
| [skills_src/zotero-bridge-cli/SKILL.md](../files/skills_src/zotero-bridge-cli/SKILL.md.md) | 文档 | — | Zotero Bridge CLI Skill 的完整 Agent 指令手册，以 24 个小节规定可执行文件与 profile 选择、参数语义、命令发现、输出边界与续接纪律、身份与分页、导航与审批授权、Synthesis 操作边界、硬约束、失败处理与 References 引用。 |
| [skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md](../files/skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md.md) | 文档 | — | 库级总控 Skill 指令：把有界的 Zotero 研究请求路由到最小可用的专项 Skill，或协调多个 Skill 序列并保持 identity、evidence 与 authority 边界。 |
| [skills_src/zotero-library-agent/skills/zotero-library-curation/SKILL.md](../files/skills_src/zotero-library-agent/skills/zotero-library-curation/SKILL.md.md) | 文档 | — | 文献整理 Skill 指令：安全检视、提出、应用并 live-verify 对元数据、标签、分类、笔记、链接等库状态的变更。 |
| [skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md](../files/skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md.md) | 文档 | — | 库查询 Skill 指令：针对有界问题做只读实时检索，区分 live 事实与解释，产出有来源支撑的答案。 |
| [skills_src/zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md](../files/skills_src/zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md.md) | 文档 | — | 文献获取 Skill 指令：把有界文献需求转为可追溯的候选评估或经审批的获取结果，保留外部来源、Zotero identity 与重复状态。 |
| [skills_src/zotero-library-agent/skills/zotero-literature-analysis/SKILL.md](../files/skills_src/zotero-library-agent/skills/zotero-literature-analysis/SKILL.md.md) | 文档 | — | 文献分析 Skill 指令：从已验证的 Zotero 来源产出有界摘要、抽取、对比或解读，带明确证据深度与定位符。 |
| [skills_src/zotero-library-agent/skills/zotero-research-synthesis/SKILL.md](../files/skills_src/zotero-library-agent/skills/zotero-research-synthesis/SKILL.md.md) | 文档 | — | 研究综合 Skill 指令：围绕问题/topic/claim/图谱/缺口综合已验证来源，保留来源分歧、模型来源与新鲜度证据。 |
| [tools/synthesis-index-harness/README.md](../files/tools/synthesis-index-harness/README.md.md) | 文档 | — | Synthesis 索引测试 harness 的说明文档，介绍其用途、启动方式与页面构成。 |
| [workflows_builtin/literature-workbench-package/collection-collector/README.md](../files/workflows_builtin/literature-workbench-package/collection-collector/README.md.md) | 文档 | — | collection-collector 工作流的说明文档，解释用途、参数与产物。 |
| [workflows_builtin/literature-workbench-package/export-literature-bundle/README.md](../files/workflows_builtin/literature-workbench-package/export-literature-bundle/README.md.md) | 文档 | — | export-literature-bundle 工作流文档，说明文献 bundle 导出格式与选项。 |
| [workflows_builtin/literature-workbench-package/export-notes/README.md](../files/workflows_builtin/literature-workbench-package/export-notes/README.md.md) | 文档 | — | export-notes 工作流文档，说明笔记导出范围、格式与使用方式。 |
| [workflows_builtin/literature-workbench-package/export-research-bundle/README.md](../files/workflows_builtin/literature-workbench-package/export-research-bundle/README.md.md) | 文档 | — | export-research-bundle 工作流文档，说明研究 bundle 的组成、导出入口与注意事项。 |
| [workflows_builtin/literature-workbench-package/import-literature-bundle/README.md](../files/workflows_builtin/literature-workbench-package/import-literature-bundle/README.md.md) | 文档 | — | import-literature-bundle 工作流文档，说明 bundle 导入的校验、去重与冲突处理。 |
| [workflows_builtin/literature-workbench-package/import-notes/README.md](../files/workflows_builtin/literature-workbench-package/import-notes/README.md.md) | 文档 | — | import-notes 工作流文档，说明笔记导入的映射规则与限制。 |
| [workflows_builtin/literature-workbench-package/literature-analysis/README.md](../files/workflows_builtin/literature-workbench-package/literature-analysis/README.md.md) | 文档 | — | literature-analysis 工作流的用户文档，说明前置准备、输入方式、耗时估算，以及四类产出笔记（摘要、参考文献、引文分析、论文评分）的构成。 |
| [workflows_builtin/literature-workbench-package/literature-deep-reading/README.md](../files/workflows_builtin/literature-workbench-package/literature-deep-reading/README.md.md) | 文档 | — | literature-deep-reading 工作流文档，说明单篇精读的输入、执行方式、耗时与产出，并串联相关工作流的衔接关系。 |
| [workflows_builtin/literature-workbench-package/literature-explainer/README.md](../files/workflows_builtin/literature-workbench-package/literature-explainer/README.md.md) | 文档 | — | literature-explainer 工作流文档，解释如何对选中文献生成通俗解读并写入对话笔记（Conversation Note）。 |
| [workflows_builtin/literature-workbench-package/literature-metadata-curator/README.md](../files/workflows_builtin/literature-workbench-package/literature-metadata-curator/README.md.md) | 文档 | — | literature-metadata-curator 工作流文档，说明元数据补全与规范化的输入、产出与参数。 |
| [workflows_builtin/literature-workbench-package/literature-search-ingest/README.md](../files/workflows_builtin/literature-workbench-package/literature-search-ingest/README.md.md) | 文档 | — | literature-search-ingest 工作流文档，按检索计划、发现轮次、入库范围、研究与载荷准备、逐篇入库等阶段说明检索入库流水线。 |
| [workflows_builtin/literature-workbench-package/literature-translator/README.md](../files/workflows_builtin/literature-workbench-package/literature-translator/README.md.md) | 文档 | — | literature-translator 工作流文档，说明文献翻译工作流的输入、执行方式、耗时与产出笔记。 |
| [workflows_builtin/literature-workbench-package/tag-auditor/README.md](../files/workflows_builtin/literature-workbench-package/tag-auditor/README.md.md) | 文档 | — | tag-auditor 工作流文档，说明对文献标签体系的审计方式与产出。 |
| [workflows_builtin/literature-workbench-package/tag-bootstrapper/README.md](../files/workflows_builtin/literature-workbench-package/tag-bootstrapper/README.md.md) | 文档 | — | tag-bootstrapper 工作流文档，说明从零开始为文献建立初始标签的输入、执行方式与产出。 |
| [workflows_builtin/literature-workbench-package/tag-regulator/README.md](../files/workflows_builtin/literature-workbench-package/tag-regulator/README.md.md) | 文档 | — | tag-regulator 工作流文档，说明标签治理的自动应用变更与弹窗审核建议标签两条产出路径。 |
| [workflows_builtin/mineru/README.md](../files/workflows_builtin/mineru/README.md.md) | 文档 | markdown | MinerU 工作流包的中文使用文档：说明该工作流调用 MinerU 云服务把 PDF 附件解析为 Markdown 与图片，涵盖 API Token 与 Generic HTTP Profile 配置、PDF 选择与同名冲突跳过规则、>200 页长 PDF 按页码分片、耗时预估、产物落盘位置与 status 标签清理，以及与 Literature Analysis / Deep Reading 的衔接。 |
| [workflows_builtin/synthesis-layer/create-topic-synthesis/README.md](../files/workflows_builtin/synthesis-layer/create-topic-synthesis/README.md.md) | 文档 | — | create-topic-synthesis 工作流文档，说明如何从库内条目构建主题综述产出及其输入、耗时与参数。 |
| [workflows_builtin/synthesis-layer/manuscript-literature-framing/README.md](../files/workflows_builtin/synthesis-layer/manuscript-literature-framing/README.md.md) | 文档 | — | manuscript-literature-framing 工作流的说明文档，介绍该工作流的用途、输入输出与运行方式。 |
| [workflows_builtin/synthesis-layer/topic-planner/README.md](../files/workflows_builtin/synthesis-layer/topic-planner/README.md.md) | 文档 | — | topic-planner 工作流的简要说明，指出该工作流用于生成主题规划结果。 |
| [workflows_builtin/synthesis-layer/update-topic-synthesis/README.md](../files/workflows_builtin/synthesis-layer/update-topic-synthesis/README.md.md) | 文档 | — | update-topic-synthesis 工作流的说明文档，描述主题综合更新流程的输入、阶段划分与产物。 |
| [workflows_builtin/workflow-debug-probe/README.md](../files/workflows_builtin/workflow-debug-probe/README.md.md) | 文档 | — | 调试探针工作流包的说明文档，介绍 debug_only 探针工作流（Host Bridge 连通性、sequence 编排、apply 契约）以及 debug-apply-existing-parent-bundle 对已选父条目的附加语义。 |

## 对其它分层的依赖

| 目标分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [内置工作流包与 Skill 资产](workflow-assets.md) | 6 | depends_on×6 |

## 被其它分层依赖

| 来源分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [内置工作流包与 Skill 资产](workflow-assets.md) | 1 | configures×1 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 1 | configures×1 |
