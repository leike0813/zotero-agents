# 工作流目录参考

使用本地工作流目录提交已知工作流，无需重新查询其 schema。使用以下命令刷新目录：

```powershell
scripts/zotero_librarian_index_service.py workflow-refresh
```

<!-- zotero-librarian:workflow-catalog:start -->
## 内置工作流目录

使用 `scripts/zotero_librarian_index_service.py workflow-refresh` 刷新运行时目录。

| Workflow | Label | Provider | Inputs | Parameters | Agent-owned |
| --- | --- | --- | --- | --- | --- |
| `add-digest-representative-image` | Add Digest Representative Image | pass-through | workflow | markdown_src | yes |
| `collection-collector` | Collection Collector | skillrunner | workflow | collection, collectionScope | no |
| `create-topic-synthesis` | Create Topic Synthesis | skillrunner | workflow | topicSeed, language | yes |
| `export-literature-bundle` | Export Literature Bundle | pass-through | workflow | none | yes |
| `export-notes` | Export Notes | pass-through | workflow | none | yes |
| `export-research-bundle` | Export Research Bundle | skillrunner | workflow | paperTitle, articleType, researchContent, maxTopics, maxCorePapers, maxRelatedPapers | yes |
| `import-literature-bundle` | Import Literature Bundle | pass-through | workflow | none | yes |
| `import-notes` | Import Notes | pass-through | parent | none | yes |
| `literature-analysis` | Literature Analysis | skillrunner | attachment per_parent | language, auto_tag_regulator, auto_tag_infer_tag | yes |
| `literature-deep-reading` | Literature Deep Reading | skillrunner | attachment per_parent | target_language, mode | yes |
| `literature-explainer` | Literature Explainer | skillrunner | attachment per_parent | language | yes |
| `literature-metadata-curator` | Literature Metadata Curator | skillrunner | parent | skip_identifier_fast_path | yes |
| `literature-search-ingest` | Literature Search Ingest | skillrunner | workflow | query, searchMode, searchBreadth, languageHints, targetCollection | yes |
| `literature-translator` | Literature Translator | skillrunner | attachment per_parent | target_language, mode | yes |
| `manuscript-literature-framing` | Manuscript Literature Framing | skillrunner | workflow | paperTitle, language, targetVenue, articleType, stylePreference | yes |
| `mineru` | MinerU | generic-http | attachment | none | yes |
| `tag-auditor` | Tag Auditor | pass-through | workflow | none | yes |
| `tag-bootstrapper` | Tag Bootstrapper | skillrunner | workflow | tag_note_language | yes |
| `tag-regulator` | Tag Regulator | skillrunner | parent | infer_tag, tag_note_language | yes |
| `update-topic-synthesis` | Update Topic Synthesis | skillrunner | workflow | topicId | yes |

## `add-digest-representative-image` — 添加摘要代表性图片

- 目的：从已分析的文献中选择一张图片，并将其作为摘要代表性图片附加。
- 声明的运行时模式：`auto`。
- Provider：`pass-through`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - `markdown_src`：字符串；required=false；default="" — 相对于源 Markdown 文件的图片路径，例如 figures/overview.jpg。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `collection-collector` — 集合收集器

- 目的：查找与集合含义匹配的库文献，并将审查后的匹配项添加到该 Zotero 集合中。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；不支持 agent-owned，因为 agent-run 无法提供所需的 workflow 选项。
- 完成证据：`result/result.json`。
- 参数：
  - `collection`：字符串；required=true — 将接收匹配文献的现有 Zotero 集合。
  - `collectionScope`：字符串；required=true — 集合所代表的含义、研究主题或文献边界。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `create-topic-synthesis` — 创建主题综合

- 目的：使用当前库、参考和引用图证据，从自然语言种子创建新的主题综合。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/final-output.candidate.json`。
- 参数：
  - `topicSeed`：字符串；required=false — 新综合主题的自然语言种子。
  - `language`：字符串；required=false；default="zh-CN"；enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — 输出语言，如 auto、zh-CN 或 en-US。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `export-literature-bundle` — 导出文献包

- 目的：将选定的文献及其生成的分析工件导出为可移植包。
- 声明的运行时模式：`auto`。
- Provider：`pass-through`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - 无。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `export-notes` — 导出笔记

- 目的：将受支持的生成的 Zotero 笔记导出为可编辑的外部文件。
- 声明的运行时模式：`auto`。
- Provider：`pass-through`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - 无。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `export-research-bundle` — 导出研究包

- 目的：将面向手稿的研究材料、分析的文献工件和综合证据导出为可移植包。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/result.json`、`result/export-research-bundle-artifacts.json`。
- 参数：
  - `paperTitle`：字符串；required=false — 用于查找研究材料的工作手稿标题。
  - `articleType`：字符串；required=false；default="original research" — 手稿类型。v1 针对原创研究进行了优化。
  - `researchContent`：字符串；required=false — 研究问题、方法、范围和预期贡献。
  - `maxTopics`：数字；required=false；default=5 — 最大主题数
  - `maxCorePapers`：数字；required=false；default=20 — 最大核心论文数
  - `maxRelatedPapers`：数字；required=false；default=80 — 最大相关论文数
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `import-literature-bundle` — 导入文献包

- 目的：导入文献包并协调其受支持的 Zotero 文献工件。
- 声明的运行时模式：`auto`。
- Provider：`pass-through`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - 无。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `import-notes` — 导入笔记

- 目的：导入受支持的外部分析文件并更新其生成的 Zotero 笔记。
- 声明的运行时模式：`auto`。
- Provider：`pass-through`；输入模式：`parent`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - 无。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `literature-analysis` — 文献分析

- 目的：分析一个文献源，并将其摘要、结构化引用、引用分析及可选的规范化标签应用到 Zotero。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`attachment per_parent`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/result.json`、`artifacts/digest.md,artifacts/references.json,artifacts/citation_analysis.json`。
- 参数：
  - `language`：字符串；required=false；default="zh-CN"；enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — 语言
  - `auto_tag_regulator`：布尔值；required=false；default=true — 自动标签规范化
  - `auto_tag_infer_tag`：布尔值；required=false；default=true — 推断标签
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `literature-deep-reading` — 文献深度阅读

- 目的：为一个文献源生成并应用详细的、基于证据的深度阅读分析。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`attachment per_parent`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`literature-deep-reading.result.json`、`result/deep-reading.html,result/deep-reading-manifest.json`。
- 参数：
  - `target_language`：字符串；required=false；default="zh-CN"；enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — 目标语言
  - `mode`：字符串；required=false；default="fast"；enum=fast, high_quality — 翻译模式
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `literature-explainer` — 文献解释器

- 目的：为一个文献源运行有状态的问答和学习笔记会话。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`attachment per_parent`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/result.json`。
- 参数：
  - `language`：字符串；required=false；default="zh-CN"；enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — 语言
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `literature-metadata-curator` — 文献元数据管理器

- 目的：使用标识符和搜索证据审计和修复选定文献的书目元数据。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`parent`；是否需要选择：是。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/result.json`。
- 参数：
  - `skip_identifier_fast_path`：布尔值；required=false；default=false — 绕过 Zotero 标识符查找，直接运行 literature-metadata-search。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `literature-search-ingest` — 文献搜索摄取

- 目的：搜索学术资源、审查候选项，并将去重后的文献及其来源摄取到 Zotero 库中。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/result.json`。
- 参数：
  - `query`：字符串；required=false；default="" — 可选的搜索查询或种子。在 auto 模式下留空以启动引导式搜索规划对话。
  - `searchMode`：字符串；required=false；default="auto"；enum=auto, guided, topic_expansion, paper_seed_expansion, targeted_ingest — 选择自动检测、引导式搜索规划、主题扩展、论文种子扩展或精确目标摄取。
  - `searchBreadth`：字符串；required=false；default="broad"；enum=broad, balanced, quick — 选择广泛的多通道发现、平衡覆盖或快速初步扫描。
  - `languageHints`：数组；required=false；default=[] — 可选的 BCP 47 语言提示，如 en、zh-CN、ja 或 de。它们扩展查询和来源，但从不过滤其他语言。
  - `targetCollection`：字符串；required=false；default="" — 用于创建或现有项目的可选 Zotero 集合。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `literature-translator` — 文献翻译器

- 目的：翻译一个文献源并应用翻译后的工件，同时保留学术结构。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`attachment per_parent`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/result.json`。
- 参数：
  - `target_language`：字符串；required=false；default="zh-CN"；enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — 目标语言
  - `mode`：字符串；required=false；default="fast"；enum=fast, high_quality — 模式
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `manuscript-literature-framing` — 手稿文献框架

- 目的：从选定的综合主题和库证据生成手稿引言和相关工作框架。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/result.json`、`result/manuscript-literature-framing-artifacts.json`。
- 参数：
  - `paperTitle`：字符串；required=false — 用于构建引言和相关工作框架的工作手稿标题。
  - `language`：字符串；required=false；default="auto" — 输出语言，如 auto、zh-CN 或 en-US。
  - `targetVenue`：字符串；required=false；default="" — 目标期刊、会议或风格系列。
  - `articleType`：字符串；required=false；default="original research" — 手稿类型。v1 针对原创研究进行了优化。
  - `stylePreference`：字符串；required=false；default="" — 可选的写作偏好，如简洁、IEEE 风格、Nature 风格或中文草稿。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `mineru` — MinerU

- 目的：将选定的 PDF 附件转换为结构化的 Markdown 和图片工件，并将结果附加到 Zotero。
- 声明的运行时模式：`auto`。
- Provider：`generic-http`；输入模式：`attachment`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - 无。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `tag-auditor` — 标签审计器

- 目的：根据受控词汇表审计选定的文献标签，而不悄然更改不相关的元数据。
- 声明的运行时模式：`auto`。
- Provider：`pass-through`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - 无。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `tag-bootstrapper` — 标签引导器

- 目的：从当前库证据和可审查的建议引导受控标签词汇表。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - `tag_note_language`：字符串；required=false；default="zh-CN"；enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — 标签注释语言
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `tag-regulator` — 标签规范化器

- 目的：根据受控词汇表规范化和推断选定的文献标签。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`parent`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：终端运行结果及任何声明的 Product/output 契约。
- 参数：
  - `infer_tag`：布尔值；required=false；default=true — 推断标签
  - `tag_note_language`：字符串；required=false；default="zh-CN"；enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — 标签注释语言
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

## `update-topic-synthesis` — 更新主题综合

- 目的：从其当前的解析器范围、证据和变更状态更新现有的主题综合。
- 声明的运行时模式：`auto`。
- Provider：`skillrunner`；输入模式：`workflow`；是否需要选择：否。
- 执行：支持 Host-owned；支持 agent-owned。
- 完成证据：`result/final-output.candidate.json`。
- 参数：
  - `topicId`：字符串；required=false — 现有的综合主题 ID。Host 从选定的主题派生更新范围、模式、原因和语言。
- 选择规则：仅当其标签、声明的输入、参数和结果证据与请求的结果匹配时才选择此工作流；执行前确认实时 `workflow describe`。

在直接提交或交接之前，使用 `workflow-show <workflow-id>` 和实时 `workflow describe` executionModes。
仅使用 `run-register` 和 `run-watch` 注册和监控 Host-owned 提交的工作流运行。
<!-- zotero-librarian:workflow-catalog:end -->

`workflow submit` 之后，调用：

```powershell
scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id <workflow-id>
scripts/zotero_librarian_index_service.py run-watch
```
