
# parse_markdown
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:parse_markdown -->

受控 Markdown 解析器主入口，逐块解析标题、表格、图片、公式与普通段落。
类型：函数  
复杂度：复杂  
入边数：3  
标签：runtime、literature-deep-reading、stage-pipeline  
所属文件：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md)
源码：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:1100](../../../../../../../skills_src/literature-deep-reading/runtime/deep_reading_runtime.py#L1100)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [build_navigation](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:6173–6216 | 由阅读块标题推导导航结构与锚点。 |
| [build_summary_view](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:4530–4552 | 构建摘要视图，抽取摘要正文并过滤仅含标题的部分。 |
| [render_final_html](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:6653–6690 | 渲染最终静态 HTML，把各区域片段与样式、脚本拼装为完整页面。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [render_markdown_fragment](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:1006–1034 | 把 Markdown 片段渲染为受限 HTML，只允许白名单结构。 |
| [sanitize_table_html](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:881–949 | 净化表格 HTML 片段，剥离脚本与不安全属性后输出。 |
