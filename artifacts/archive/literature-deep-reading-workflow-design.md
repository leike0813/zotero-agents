# 文献精读 Workflow 宏观设计与合同草案

本文记录 `literature-deep-reading` workflow 的宏观设计草案。当前产品形态采用 seamless reader，而不是幻灯片式摘要报告：产物必须帮助用户阅读论文原文，并在原文周围提供宏观导读、章节精读说明、可选译文、总结、参考文献和拓展图谱。

本文不是正式 spec。字段、stage 名称和 schema 仍可在后续实现中调整，但本文件中的结构边界应作为样例产物和后续 OpenSpec change 的当前基准。

## 目标

`literature-deep-reading` 的目标是把目标论文转换成一个独立 HTML 精读 artifact：

```text
result/deep-reading.html
```

核心阅读结构：

```text
阅读前导读（Preface）
  ↓
论文正文 seamless reader
  - original / translated / compare / focus 模式
  - 原文必须出现
  - 译文可选，启用时按同结构 block 对照
  ↓
Summary 总结
  ↓
References
  ↓
Citation Graph / Topic Extensions
```

产物应满足：

- 原文是主阅读对象，不用摘要替代正文。
- 首选 MinerU Markdown + 可用图片；PDF fallback 只做 best effort。
- 当用户语言与原文语言不一致时，可生成译文层；对照阅读应按结构化 block 顶部对齐。
- 正文前的阅读前导读使用 synthesis layer / topic / graph 上下文，帮助读者理解研究领域、具体研究方向、方向之间的关系、本文承接了哪些上游工作、又影响了哪些后续工作。
- 正文右侧精读栏随滚动动态更新，展示当前章节的阅读目标、相关概念、误读提醒、可能的问题和 citation analysis 派生的引用线索；问题应放在引用线索之前。
- 正文后的 Summary 优先复用 `digest.md` artifact；缺失时由 agent 基于原文生成简短 fallback summary。
- References 优先使用 `references.json` 结构化渲染；缺失时回退 Markdown 原文。
- Citation graph、topic extensions、concept overlay 都是拓展辅助，不覆盖目标论文原文主线。
- 用户可见文案必须面向文献阅读和文献分析，不暴露 workflow 设计词、内部 role hint、数据管线说明或样例制作说明。

非目标：

- 不生成替代论文原文的长篇二手报告。
- 不要求每个段落都深度批注。
- 不保证 PDF fallback 的文本抽取、图片抽取和 section 识别质量。
- 不把 topic graph relation proposal、concept proposal、digest 或 citation analysis 当作正文真源。

## Source Bundle 合同

workflow 提交 skill 时统一使用单文件 source bundle，避免 SkillRunner 后端和本地 ACP 后端在 Markdown、图片、sidecar artifact 文件处理上分裂：

```text
source_bundle.zip
  source.md
  original.pdf
  images/
  artifacts/
    references.json
    digest.md
    citation-analysis.md
    citation_analysis.json
    artifact-manifest.json
  source-manifest.json
```

skill 输入只接受：

```json
{
  "source_bundle_path": "..."
}
```

provider 适配语义：

- SkillRunner 后端：`source_bundle_path` 是上传后的相对路径，`upload_files` 上传本地 zip。
- 本地 ACP 后端：workflow preparation 将 `source_bundle_path` 改写成本地绝对 zip 路径，并移除 `upload_files`。

workflow 的 `buildRequest` / preflight hook 负责 materialize source bundle：

1. 优先定位选中条目的 MinerU Markdown 附件。
2. 读取 Markdown，解析 Markdown image 语法和 HTML `<img src="...">`。
3. 将允许的本地图片复制到 bundle `images/`，并把 `source.md` 中的图片路径重写为 bundle 内相对路径。
4. 不存在 Markdown 时，将 PDF 放入 bundle 并标记 `source_kind = "pdf_fallback"`。
5. best-effort 查找同一 Zotero 条目的 digest / references / citation_analysis artifacts，解码原始 payload 写入 `artifacts/`。
6. 写入 `source-manifest.json` 和 `artifacts/artifact-manifest.json`。
7. 打包 `source_bundle.zip`，请求中只传 `source_bundle_path`。

`source-manifest.json` 至少记录：

- `source_kind`: `mineru_markdown` / `markdown_unknown` / `pdf_fallback`。
- `source_attachment`: 原附件 key、title、contentType、原始路径诊断。
- `markdown`: `source.md` 路径、原始文件名、图片引用数量。
- `images`: 每个图片的 `original_src`、`bundle_path`、`status`、`reason`。
- `pdf`: `original.pdf` 路径和 fallback 状态。
- `sidecar_artifacts`: 每个可选 artifact 的 type、payload type、bundle path、status、sha256、bytes 和来源诊断。
- `diagnostics`: 缺失图片、远程图片、越界路径、低质量输入、artifact 解码失败等。

`artifacts/artifact-manifest.json` 至少记录：

- `artifact_type`: `digest` / `references` / `citation_analysis`。
- `payload_type`: `digest-markdown` / `references-json` / `citation-analysis-markdown` / `citation-analysis-json`。
- `bundle_path`: bundle 内相对路径。
- `source`: Host Bridge artifact locator、note key、本地导出路径或 workflow 诊断来源。
- `status`: `available` / `missing` / `unreadable` / `decode_failed`。
- `sha256`、`bytes`: payload 可用时记录。

缺失或不可解析的 sidecar artifact 不阻塞核心阅读 HTML 生成，只进入 diagnostics 和对应 view 的空状态。

## Runtime Views

skill/runtime 解包 source bundle 后，应将原文和 sidecar artifacts 归一化为 runtime-owned views；agent 只写语义内容，不直接写最终 HTML。

当前核心 views：

- `source-structure.json`: Markdown heading、section span、reading block 数量。
- `image-manifest.json`: bundle 图片和 Markdown 图片引用映射。
- `preface-view.json`: 正文前导读，来源优先级为 topic synthesis summary/statistics、citation graph analysis signals、concept context；内部 role hint 只能作为生成依据，不能原样出现在用户界面。
- `reading-blocks` 或 `sections.json.reading_blocks`: seamless reader 使用的结构化正文 block。
- `summary-view.json`: 正文后总结，来源优先级为 `digest.md` → agent fallback。
- `section-insights-view.json`: 按 section anchor 组织 citation notes 和预设 Q&A。
- `references-view.json`: 结构化 references；缺失时 renderer 回退 Markdown References。
- `concept-overlay-view.json`: 概念 overlay 的 label、alias、definition 和状态。
- `citation-graph-snapshot.json`: 固化的 2-hop citation graph snapshot。
- `citation-graph-layout.json`: 固化布局坐标；优先来自插件默认 force layout，其次可使用 synthesis state 中持久化的布局快照，HTML 不在运行时调用 Host Bridge。
- `topic-context.json` / `graph-context.json`: 文末 topic / graph 拓展说明。

最终 `sections/sections.json` 是 renderer 的聚合 view，至少包含：

```json
{
  "schema_version": "literature-deep-reading.seamless-scroll.v0",
  "navigation": [],
  "preface": {},
  "sections": [],
  "reading_blocks": [],
  "summary": {},
  "post_reading_markdown": "",
  "section_insights": {},
  "references_source": "artifact",
  "references": {},
  "concepts": {},
  "citation_graph": {},
  "extensions": []
}
```

### Preface / 阅读前导读

`preface-view.json` 是正文前的阅读前导读。用户界面建议使用“阅读前导读”这类自然标题，`Preface` 仅作为合同和 schema 名称：

- `source`: `topic_synthesis_artifacts` / `agent_fallback` / `none`。
- `anchor`: stable DOM anchor，例如 `preface`。
- `cards`: 研究领域、研究方向、方向关系、文献位置。文献位置应解释为“本文接续了哪些问题、改变了什么研究假设、后续工作主要沿哪些方向改进”，不使用 `external-heavy`、`foundation`、`internal_in_degree` 等内部标签。
- `reading_path`: 进入正文前的阅读路线。
- `takeaways`: topic synthesis key takeaways 的 bounded 摘要。
- `concepts`: 与本文相关的核心概念标签。
- `reading_aid`: 右侧栏显示的目标、相关概念、误读提醒、可能的问题和引用线索。相关概念应复用 `concept-overlay-view.json`，能命中 concept 的 chip 应支持 hover/focus/click 说明。

Preface 只用于定位阅读，不插入论文正文，也不替代摘要或结论。

### Reading Blocks 和翻译层

正文 Markdown 应先解析为稳定 block 列表，再基于相同 block id 生成译文。

每个 block 至少包含：

- `id`
- `kind`: `heading` / `paragraph` / `image` / `table` / `formula`
- `section_anchor`
- `source_markdown`
- `translation`: 可选；仅在需要翻译时生成

renderer 支持：

- `original`: 只显示原文。
- `translated`: 只显示译文。
- `compare`: 原文与译文左右对照。
- `focus`: 隐藏右侧拓展，只保留正文主阅读区。

References 及之后的内容不进入双栏翻译区，应保持全宽渲染。

### Summary

`summary-view.json` 是正文后、References 前的总结：

- `source`: `digest_artifact` / `agent_fallback`。
- `artifact_path`: digest 可用时记录 `artifacts/digest.md`。
- `sections`: 建议包含 `TL;DR`、`研究问题与贡献`、`方法要点`、`关键结果`。
- `reading_aid`: Summary 处右侧栏显示的复盘目标和边界提醒。

Summary 只用于读后复盘；不应作为正文替代物，也不应删除或压缩论文原文。

### Section Insights

`section-insights-view.json` 按 `section_anchor` 组织精读说明：

- `questions`: 预设 Q&A，每条必须包含 `id`、`question`、`answer`、`section_anchor`。
- `citation_note`: citation_analysis 派生的本节引用线索。
- `citation_references`: 关键引用条目，字段可宽松包含 `ref`、`title`、`keywords`、`summary`。

Q&A 是章节级阅读辅助，不是全局 FAQ；renderer 将其显示在右侧栏并置于引用线索之前，不插入论文正文流。右侧栏空间有限，行距、标题间距和卡片内边距应保持紧凑，避免把一个章节的辅助信息拆成松散的大块。

### References

如果 `references-view.json.source === "artifact"`，renderer 应使用结构化 references 面板替换 Markdown References section body。

v1 renderer 只消费宽松字段：

- `id`
- `authors`
- `title`
- `year`
- 可选 `venue`、`doi`、`url`、`arxiv`、`citeKey`、`matchStatus`、`raw`

字段不足时只展示已有信息，不伪造。

### Concept Overlay

`concept-overlay-view.json` 用于正文概念 overlay：

- `source`: `topic_synthesis_artifacts` / `concept_overlay_context` / `none`。
- `enabled`: 默认 true，但 UI 必须可关闭。
- `concepts`: `label`、`aliases`、`kind`、`definition`、`source`、`status`。

renderer 做 DOM 后处理时必须跳过公式、代码、表格控件、已有链接、References cards 和 graph 区域。

右侧栏中的“相关概念”不是独立术语表，而是 `concept-overlay-view.json` 在当前 section 的局部入口：

- 如果 `reading_aid.terms` / `reading_aid.concepts` 能命中 concept label 或 alias，应渲染为可交互 chip，行为与正文中的 concept mention 保持一致。
- 如果未命中 concept，runtime 应优先补入一个低置信度 concept 条目；确实无法解释时才作为普通关键词显示，并避免视觉上伪装成可交互概念。
- 点击 concept chip 应能打开解释，并尽可能定位到正文中首次出现的位置。

### Citation Graph

`citation-graph-snapshot.json` 和 `citation-graph-layout.json` 固化 2-hop citation graph：

- snapshot 优先来自 Host Bridge / citation graph，只读获取；Host Bridge 不可用时，可回退到本地 synthesis state 中已经固化的 citation graph snapshot。
- layout 优先使用插件默认 force 布局坐标；Host Bridge 不可用但本地存在持久化 force layout 时，应复用该布局，而不是在浏览器中重新布局或清空图。
- 只有 snapshot 和可用 fallback 都缺失时，才显示 citation graph 空状态。
- HTML 使用本地 SVG renderer，不运行实时 force layout，不调用 Host Bridge。
- hover/select 效果尽量遵照插件 citation graph：目标论文可特殊高亮，hover/select 只显示一跳库内文献标题，库外标题仅在 select 后 hover 查看。用户可见文案应解释“上游来源、下游影响、文献汇合点”等文献分析含义，不直接暴露内部 role hint。
- 不生成伪造节点、伪造边或伪造 citation role。

## Skill 形态

初版保持单体 skill：

```text
literature-deep-reading
```

内部 stage 可保持为 runtime/agent 分层，但不预先拆成多 skill：

| Internal stage | 目的 | 主要产物 |
| --- | --- | --- |
| `prepare_source` | 解包 source bundle、建立 block/image/artifact/context views | `runtime/views/*` |
| `reading_enrichment` | 生成译文、章节精读说明、Q&A 和图表/公式辅助说明 | `runtime/payloads/section-enrichment.json` |
| `synthesis_extension` | 生成 Preface、topic/citation graph 拓展和读后路线 | `runtime/payloads/synthesis-extension.json` |
| `finalize` | 校验 anchors、引用和 view shape，渲染 HTML artifact | `result/deep-reading.html` |

后续只有在实测证明存在明确瓶颈时，才考虑拆分 skill。例如：翻译成本需要独立缓存、topic/graph 拓展需要异步追加、或上下文窗口长期不可控。

## Renderer 合同

最终 HTML 应是离线可打开的静态 artifact。样例可以使用 CDN 渲染 KaTeX/Markdown，真实 skill 实现应优先走 Python 栈本地渲染器或打包本地 vendor assets。

renderer 必须：

- 保持论文原文完整可读。
- 在正文前渲染 Preface。
- 在正文后、References 前渲染 Summary。
- References 之后渲染 Citation Graph 和 Topic Extensions。
- 左侧导航包含 Preface、论文正文标题、Summary、References、Citation Graph、Extensions。
- 右侧栏随滚动动态更新 Preface / section / Summary / graph / extension 的阅读辅助信息。
- 右侧栏信息顺序保持为：当前位置/阅读目标、相关概念、误读提醒、可能的问题、引用线索；Q&A 必须先于引用线索。
- 读后拓展应围绕“后续工作解决了什么问题”“引用网络说明了什么文献关系”组织，不直接倾倒 topic/graph 数据字段。
- 不在用户 HTML 中展示 workflow 设计原则、内部 artifact manifest 细节或实现说明。
- 不在用户 HTML 中展示 `external-heavy`、`foundation`、`internal_in_degree`、`role hint` 等内部分析标签；如需表达，应改写为读者能理解的文献分析语言。
- 如果 view 缺失或 artifact 不可用，显示用户可理解的空状态或降级内容，不阻塞核心正文阅读。

## 验证要求

样例和后续真实 workflow 的最小验证：

- `source_bundle.zip` 可解包，包含 `source.md`、`source-manifest.json`、`images/` 和可选 `artifacts/`。
- `preface-view.json`、`summary-view.json`、`section-insights-view.json` 能生成，并在 `sections/sections.json` 中聚合。
- digest 可用时 Summary 来源为 `digest_artifact`；digest 缺失时来源为 `agent_fallback`。
- citation_analysis 可用时 Introduction / Related Work 等章节有 citation notes；缺失时 Q&A 仍可显示。
- 所有 `navigation.anchor`、section anchor、Q&A id、graph anchor 和 extension anchor 都能在 DOM 中解析。
- 右侧栏中的相关概念要么能在 `concept-overlay-view.json` 中解析并交互，要么明确以普通关键词降级显示。
- Q&A 在右侧栏中的顺序早于引用线索。
- Host Bridge citation graph 不可用但本地持久化 snapshot/layout 可用时，最终 HTML 仍应渲染非空 citation graph。
- `node --check result/assets/deep-reading.js` 通过。
- 原文 / 译文 / 对照 / 专注模式不影响 Preface、Summary、References 的全宽布局。
- 不出现伪造图片、伪造引用、伪造 citation graph 节点、内部 role hint 原文或面向开发者的设计说明。

## 当前样例边界

DETR 样例位于：

```text
artifact/literature-deep-reading-detr-sample/
```

入口：

```text
artifact/literature-deep-reading-detr-sample/result/deep-reading.html
```

样例手工模拟未来 runtime 流程，不实现真实 workflow 代码。它使用真实 DETR Markdown/PDF/图片、topic synthesis artifact、digest/reference/citation_analysis sidecar artifacts、concept overlay context 和固化 citation graph snapshot。

当前样例的 citation graph 数据优先尝试 Host Bridge；当 Host Bridge 返回不可用时，回退到本地 synthesis state 中的 `citation-graph-snapshot.json` 和 `citation-graph-layouts.json`，并标记 snapshot source 为 `local_synthesis_state`、layout source 为 `local_persisted_force_layout`。这一回退路径属于后续 workflow/skill 应保留的产品能力，而不是样例临时补丁。
