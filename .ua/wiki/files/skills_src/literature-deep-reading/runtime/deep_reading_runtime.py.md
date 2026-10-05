
# skills_src/literature-deep-reading/runtime/deep_reading_runtime.py
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/literature-deep-reading/runtime](../../../../modules/skills_src/literature-deep-reading/runtime.md)
<!-- node: file:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py -->

literature-deep-reading skill 的 Python 运行时，单文件实现 10/20/30/40 四阶段的宿主预检、payload 校验、SQLite 持久化、桥接调用与静态 HTML 渲染。
源码：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py](../../../../../../skills_src/literature-deep-reading/runtime/deep_reading_runtime.py)

## 符号（52）
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:bootstrap -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:bridge_executable -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_citation_graph_model -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_concept_overlay_view -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_navigation -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_preface_topic_timeline -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_preface_view -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_references_view -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_section_insights_view -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_static_shell_fragments -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_summary_view -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_synthesis_graph_from_model -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:build_translation_view_from_translator_alignment -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:collect_citation_graph -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:collect_concepts -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:collect_reference_digests -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:ensure_stage10_tables -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:export_filtered_paper_artifacts -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:hydrate_input_from_provider_manifest -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:initialize_database -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:main -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:make_translation_batch -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:parse_markdown -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:persist_stage10_db -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:persist_stage20_db -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:persist_stage30_db -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:persist_stage40_db -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:prepare_translation_batches -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:remote_export_delivery_message -->
<!-- node: class:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:RemoteBridgeDownloadRequired -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:render_final_html -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:render_markdown_fragment -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:resolve_reference_digest_result -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:run_bridge_json -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:run_host_preflight -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:sanitize_table_html -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:static_citation_graph_html -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:static_preface_timeline_html -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:static_reading_region -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:status -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:submit_block_translations -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:submit_context_request -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:submit_final_review -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:submit_reading_enrichment -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_block_translations -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_block_translations_payload -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_bootstrap -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_context_request -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_final_output -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_final_review_payload -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_reading_enrichment -->
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_reading_enrichment_payload -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [bootstrap](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/bootstrap.md) | 函数 | 2539–2689 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 1 | 初始化运行目录、数据库与初始输入，为后续阶段建立一致的起点状态。 |
| [bridge_executable](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/bridge_executable.md) | 函数 | 710–732 | 简单 | runtime、literature-deep-reading、stage-pipeline | 2 | 定位宿主桥可执行文件，校验存在性并返回绝对路径。 |
| [build_citation_graph_model](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/build_citation_graph_model.md) | 函数 | 5726–5833 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 2 | 把图谱原始数据整理为渲染模型，聚合度数、聚类与布局度量。 |
| build_concept_overlay_view | 函数 | 3945–4014 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 构建概念标注层，把术语与概念解释映射到阅读区节点。 |
| build_navigation | 函数 | 6173–6216 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | 由阅读块标题推导导航结构与锚点。 |
| build_preface_topic_timeline | 函数 | 4173–4246 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 构建前言主题时间线，按年份比例排布事件节点。 |
| build_preface_view | 函数 | 4272–4305 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | 组装前言区域视图，包含稳定卡片、时间线与上下文摘要。 |
| build_references_view | 函数 | 4447–4488 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | 构建参考文献视图，整合引用索引、来源标签与可用产物。 |
| build_section_insights_view | 函数 | 4308–4356 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | 构建章节洞察视图，把结构化洞察投影为可读条目。 |
| build_static_shell_fragments | 函数 | 6627–6650 | 简单 | runtime、literature-deep-reading、stage-pipeline | 1 | 生成页面骨架各区域的静态 HTML 片段，与运行时视图共享同一套结构。 |
| build_summary_view | 函数 | 4530–4552 | 简单 | runtime、literature-deep-reading、stage-pipeline | 0 | 构建摘要视图，抽取摘要正文并过滤仅含标题的部分。 |
| build_synthesis_graph_from_model | 函数 | 5933–6032 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 0 | 由渲染模型构建 Synthesis 图谱快照，输出稳定的节点与坐标集合。 |
| build_translation_view_from_translator_alignment | 函数 | 4755–4868 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 0 | 从 translator alignment 投影出翻译视图，保留双语对照结构。 |
| collect_citation_graph | 函数 | 3293–3389 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 0 | 汇总引用图谱数据，构建节点、边与度量模型供渲染使用。 |
| collect_concepts | 函数 | 3455–3488 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 从阶段产物中收集概念集合，去重并规范化为统一结构。 |
| collect_reference_digests | 函数 | 3241–3290 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 收集参考文献对应的摘要与 digest 条目，供详情弹层展示。 |
| [ensure_stage10_tables](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/ensure_stage10_tables.md) | 函数 | 2436–2536 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 1 | 幂等地确保 stage10 所需的表与索引存在。 |
| export_filtered_paper_artifacts | 函数 | 1786–1801 | 简单 | runtime、literature-deep-reading、stage-pipeline | 0 | 按过滤条件导出文献产物到 run 目录并写出 export manifest。 |
| hydrate_input_from_provider_manifest | 函数 | 209–249 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | 从 provider manifest 补全阶段输入，合并 manifest 声明的参数与请求。 |
| [initialize_database](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/initialize_database.md) | 函数 | 2219–2433 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 2 | 创建运行态数据库的表结构与初始元数据，返回可用的连接。 |
| main | 函数 | 7349–7426 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | 运行时 CLI 入口，解析阶段与命令后分发到 bootstrap、status、validate 与各阶段提交逻辑。 |
| make_translation_batch | 函数 | 4700–4752 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 构造单个翻译批次，包含源块、目标语言 profile 与 prompt 文本。 |
| [parse_markdown](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/parse_markdown.md) | 函数 | 1100–1290 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 3 | 受控 Markdown 解析器主入口，逐块解析标题、表格、图片、公式与普通段落。 |
| [persist_stage10_db](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/persist_stage10_db.md) | 函数 | 6816–6942 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 1 | 把 stage10 上下文请求写入数据库，更新 workset 与引用绑定。 |
| persist_stage20_db | 函数 | 4590–4636 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | 把 stage20 阅读富化结果持久化到数据库。 |
| persist_stage30_db | 函数 | 5515–5546 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 把 stage30 翻译批次结果持久化。 |
| persist_stage40_db | 函数 | 6705–6720 | 简单 | runtime、literature-deep-reading、stage-pipeline | 0 | 把 stage40 终审结论持久化并登记最终产物。 |
| prepare_translation_batches | 函数 | 4894–4966 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 按体量与结构约束把待译块切分为翻译批次并写出 prompt。 |
| remote_export_delivery_message | 函数 | 1747–1771 | 简单 | runtime、literature-deep-reading、stage-pipeline | 1 | 生成远端产物交付说明，告知调用方产物落点与复制方式。 |
| RemoteBridgeDownloadRequired | 类 | 109–110 | 简单 | exception、bridge、literature-deep-reading | 0 | 远端桥接下载缺失时抛出的专用异常，携带缺失的可执行文件路径便于运行时提示用户。 |
| render_final_html | 函数 | 6653–6690 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 渲染最终静态 HTML，把各区域片段与样式、脚本拼装为完整页面。 |
| render_markdown_fragment | 函数 | 1006–1034 | 简单 | runtime、literature-deep-reading、stage-pipeline | 1 | 把 Markdown 片段渲染为受限 HTML，只允许白名单结构。 |
| resolve_reference_digest_result | 函数 | 3147–3175 | 简单 | runtime、literature-deep-reading、stage-pipeline | 1 | 解析参考文献对应的 digest 结果，返回正文与元信息。 |
| run_bridge_json | 函数 | 735–753 | 简单 | runtime、literature-deep-reading、stage-pipeline | 1 | 以 JSON 协议调用宿主桥，解析返回数据并向上抛出结构化错误。 |
| [run_host_preflight](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/run_host_preflight.md) | 函数 | 2049–2142 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 1 | 调用宿主桥执行 preflight，收集文献、导出产物与远端清单等上下文事实。 |
| sanitize_table_html | 函数 | 881–949 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 净化表格 HTML 片段，剥离脚本与不安全属性后输出。 |
| static_citation_graph_html | 函数 | 6563–6624 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 生成引用图谱区域的静态 HTML 兜底内容。 |
| static_preface_timeline_html | 函数 | 6430–6480 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 生成前言时间线区域的静态 HTML。 |
| static_reading_region | 函数 | 6377–6378 | 简单 | runtime、literature-deep-reading、stage-pipeline | 1 | 生成正文阅读区的静态 HTML 容器。 |
| status | 函数 | 7059–7069 | 简单 | runtime、literature-deep-reading、stage-pipeline | 1 | 查询运行状态，输出当前阶段、已完成阶段与已登记产物。 |
| submit_block_translations | 函数 | 5564–5610 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | stage30 提交入口，校验后写库并准备终审。 |
| submit_context_request | 函数 | 6945–7056 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 0 | stage10 提交入口，校验后落库并生成下一阶段指令。 |
| submit_final_review | 函数 | 6738–6813 | 中等 | runtime、literature-deep-reading、stage-pipeline | 0 | stage40 提交入口，校验后物化静态 HTML 与产物清单。 |
| submit_reading_enrichment | 函数 | 4969–5063 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 0 | stage20 提交入口，校验后写库并推进翻译批次准备。 |
| validate_block_translations | 函数 | 7234–7286 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 校验 stage30 块级翻译 payload 的覆盖率与结构一致性。 |
| validate_block_translations_payload | 函数 | 5390–5462 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 深度校验块级翻译 payload，处理表格与图片的结构化翻译约束。 |
| validate_bootstrap | 函数 | 7072–7112 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 校验 bootstrap 阶段提交的 payload 是否符合契约。 |
| [validate_context_request](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/validate_context_request.md) | 函数 | 7115–7170 | 中等 | runtime、literature-deep-reading、stage-pipeline | 2 | 校验 stage10 上下文请求 payload 的字段与引用合法性。 |
| validate_final_output | 函数 | 7289–7346 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 校验 stage40 最终输出，确认各章节与引用索引完整。 |
| validate_final_review_payload | 函数 | 5613–5653 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 校验终审 payload 的章节字段与引用绑定。 |
| validate_reading_enrichment | 函数 | 7173–7231 | 中等 | runtime、literature-deep-reading、stage-pipeline | 1 | 校验 stage20 阅读富化 payload，检测空提交与结构缺失。 |
| [validate_reading_enrichment_payload](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/validate_reading_enrichment_payload.md) | 函数 | 3761–3898 | 复杂 | runtime、literature-deep-reading、stage-pipeline | 1 | 深度校验阅读富化 payload 的结构、翻译质量与概念引用一致性。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citation-graph-synthesis-app.js](../renderer/templates/citation-graph-synthesis-app.js.md) | skills_src/literature-deep-reading/renderer/templates/citation-graph-synthesis-app.js | 引用图谱应用视图模板，把 Synthesis 图谱快照投影为可交互的图谱页面结构与节点/边渲染逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [bootstrap](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/bootstrap.md) | 函数 | 2539–2689 | 初始化运行目录、数据库与初始输入，为后续阶段建立一致的起点状态。 |
| [bridge_executable](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/bridge_executable.md) | 函数 | 710–732 | 定位宿主桥可执行文件，校验存在性并返回绝对路径。 |
| [build_citation_graph_model](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/build_citation_graph_model.md) | 函数 | 5726–5833 | 把图谱原始数据整理为渲染模型，聚合度数、聚类与布局度量。 |
| build_concept_overlay_view | 函数 | 3945–4014 | 构建概念标注层，把术语与概念解释映射到阅读区节点。 |
| build_navigation | 函数 | 6173–6216 | 由阅读块标题推导导航结构与锚点。 |
| build_preface_topic_timeline | 函数 | 4173–4246 | 构建前言主题时间线，按年份比例排布事件节点。 |
| build_preface_view | 函数 | 4272–4305 | 组装前言区域视图，包含稳定卡片、时间线与上下文摘要。 |
| build_references_view | 函数 | 4447–4488 | 构建参考文献视图，整合引用索引、来源标签与可用产物。 |
| build_section_insights_view | 函数 | 4308–4356 | 构建章节洞察视图，把结构化洞察投影为可读条目。 |
| build_static_shell_fragments | 函数 | 6627–6650 | 生成页面骨架各区域的静态 HTML 片段，与运行时视图共享同一套结构。 |
| build_summary_view | 函数 | 4530–4552 | 构建摘要视图，抽取摘要正文并过滤仅含标题的部分。 |
| build_synthesis_graph_from_model | 函数 | 5933–6032 | 由渲染模型构建 Synthesis 图谱快照，输出稳定的节点与坐标集合。 |
| build_translation_view_from_translator_alignment | 函数 | 4755–4868 | 从 translator alignment 投影出翻译视图，保留双语对照结构。 |
| collect_citation_graph | 函数 | 3293–3389 | 汇总引用图谱数据，构建节点、边与度量模型供渲染使用。 |
| collect_concepts | 函数 | 3455–3488 | 从阶段产物中收集概念集合，去重并规范化为统一结构。 |
| collect_reference_digests | 函数 | 3241–3290 | 收集参考文献对应的摘要与 digest 条目，供详情弹层展示。 |
| [ensure_stage10_tables](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/ensure_stage10_tables.md) | 函数 | 2436–2536 | 幂等地确保 stage10 所需的表与索引存在。 |
| export_filtered_paper_artifacts | 函数 | 1786–1801 | 按过滤条件导出文献产物到 run 目录并写出 export manifest。 |
| hydrate_input_from_provider_manifest | 函数 | 209–249 | 从 provider manifest 补全阶段输入，合并 manifest 声明的参数与请求。 |
| [initialize_database](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/initialize_database.md) | 函数 | 2219–2433 | 创建运行态数据库的表结构与初始元数据，返回可用的连接。 |
| main | 函数 | 7349–7426 | 运行时 CLI 入口，解析阶段与命令后分发到 bootstrap、status、validate 与各阶段提交逻辑。 |
| make_translation_batch | 函数 | 4700–4752 | 构造单个翻译批次，包含源块、目标语言 profile 与 prompt 文本。 |
| [parse_markdown](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/parse_markdown.md) | 函数 | 1100–1290 | 受控 Markdown 解析器主入口，逐块解析标题、表格、图片、公式与普通段落。 |
| [persist_stage10_db](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/persist_stage10_db.md) | 函数 | 6816–6942 | 把 stage10 上下文请求写入数据库，更新 workset 与引用绑定。 |
| persist_stage20_db | 函数 | 4590–4636 | 把 stage20 阅读富化结果持久化到数据库。 |
| persist_stage30_db | 函数 | 5515–5546 | 把 stage30 翻译批次结果持久化。 |
| persist_stage40_db | 函数 | 6705–6720 | 把 stage40 终审结论持久化并登记最终产物。 |
| prepare_translation_batches | 函数 | 4894–4966 | 按体量与结构约束把待译块切分为翻译批次并写出 prompt。 |
| remote_export_delivery_message | 函数 | 1747–1771 | 生成远端产物交付说明，告知调用方产物落点与复制方式。 |
| render_final_html | 函数 | 6653–6690 | 渲染最终静态 HTML，把各区域片段与样式、脚本拼装为完整页面。 |
| render_markdown_fragment | 函数 | 1006–1034 | 把 Markdown 片段渲染为受限 HTML，只允许白名单结构。 |
| resolve_reference_digest_result | 函数 | 3147–3175 | 解析参考文献对应的 digest 结果，返回正文与元信息。 |
| run_bridge_json | 函数 | 735–753 | 以 JSON 协议调用宿主桥，解析返回数据并向上抛出结构化错误。 |
| [run_host_preflight](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/run_host_preflight.md) | 函数 | 2049–2142 | 调用宿主桥执行 preflight，收集文献、导出产物与远端清单等上下文事实。 |
| sanitize_table_html | 函数 | 881–949 | 净化表格 HTML 片段，剥离脚本与不安全属性后输出。 |
| static_citation_graph_html | 函数 | 6563–6624 | 生成引用图谱区域的静态 HTML 兜底内容。 |
| static_preface_timeline_html | 函数 | 6430–6480 | 生成前言时间线区域的静态 HTML。 |
| static_reading_region | 函数 | 6377–6378 | 生成正文阅读区的静态 HTML 容器。 |
| status | 函数 | 7059–7069 | 查询运行状态，输出当前阶段、已完成阶段与已登记产物。 |
| submit_block_translations | 函数 | 5564–5610 | stage30 提交入口，校验后写库并准备终审。 |
| submit_context_request | 函数 | 6945–7056 | stage10 提交入口，校验后落库并生成下一阶段指令。 |
| submit_final_review | 函数 | 6738–6813 | stage40 提交入口，校验后物化静态 HTML 与产物清单。 |
| submit_reading_enrichment | 函数 | 4969–5063 | stage20 提交入口，校验后写库并推进翻译批次准备。 |
| validate_block_translations | 函数 | 7234–7286 | 校验 stage30 块级翻译 payload 的覆盖率与结构一致性。 |
| validate_block_translations_payload | 函数 | 5390–5462 | 深度校验块级翻译 payload，处理表格与图片的结构化翻译约束。 |
| validate_bootstrap | 函数 | 7072–7112 | 校验 bootstrap 阶段提交的 payload 是否符合契约。 |
| [validate_context_request](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/validate_context_request.md) | 函数 | 7115–7170 | 校验 stage10 上下文请求 payload 的字段与引用合法性。 |
| validate_final_output | 函数 | 7289–7346 | 校验 stage40 最终输出，确认各章节与引用索引完整。 |
| validate_final_review_payload | 函数 | 5613–5653 | 校验终审 payload 的章节字段与引用绑定。 |
| validate_reading_enrichment | 函数 | 7173–7231 | 校验 stage20 阅读富化 payload，检测空提交与结构缺失。 |
| [validate_reading_enrichment_payload](../../../../symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/validate_reading_enrichment_payload.md) | 函数 | 3761–3898 | 深度校验阅读富化 payload 的结构、翻译质量与概念引用一致性。 |
