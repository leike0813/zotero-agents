
# scripts/build-help-docs.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/build-help-docs.ts -->

帮助中心文档生成器：读取多语言 Markdown 源文档，重写内部链接、转换 admonition 与图片引用，生成 sidebar 配置、复制图片资产并校验输出目录。
源码：[scripts/build-help-docs.ts](../../../../scripts/build-help-docs.ts)

## 符号（16）
<!-- node: function:scripts/build-help-docs.ts:admonitionLabel -->
<!-- node: function:scripts/build-help-docs.ts:build -->
<!-- node: function:scripts/build-help-docs.ts:buildSidebar -->
<!-- node: function:scripts/build-help-docs.ts:convertAdmonitions -->
<!-- node: function:scripts/build-help-docs.ts:copyOrCompressAsset -->
<!-- node: function:scripts/build-help-docs.ts:discoverLocaleInputs -->
<!-- node: function:scripts/build-help-docs.ts:escapeHtmlAttribute -->
<!-- node: function:scripts/build-help-docs.ts:flattenSidebarItems -->
<!-- node: function:scripts/build-help-docs.ts:listMarkdownFiles -->
<!-- node: function:scripts/build-help-docs.ts:loadSourceDocs -->
<!-- node: function:scripts/build-help-docs.ts:normalizeImageReference -->
<!-- node: function:scripts/build-help-docs.ts:renderImageFigure -->
<!-- node: function:scripts/build-help-docs.ts:resolveDocId -->
<!-- node: function:scripts/build-help-docs.ts:rewriteMarkdown -->
<!-- node: function:scripts/build-help-docs.ts:validateOutput -->
<!-- node: function:scripts/build-help-docs.ts:writeGeneratedDocs -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| admonitionLabel | 函数 | 132–144 | 简单 | markdown、documentation、i18n、formatting | 0 | 把 GitHub 风格 admonition 类型映射为帮助文档使用的中英文显示标签。 |
| build | 函数 | 546–590 | 中等 | build-system、documentation、orchestration、entry-point | 0 | 帮助文档构建总流程：发现 locale、加载源文档、重写内容、生成 sidebar 与资源，最后执行输出校验。 |
| buildSidebar | 函数 | 468–481 | 简单 | documentation、navigation、i18n、generator | 0 | 为每个 locale 生成 sidebar 导航数据，只保留实际存在对应文档的条目。 |
| convertAdmonitions | 函数 | 146–180 | 中等 | markdown、documentation、transformation、formatting | 0 | 将 ::: note/warning 等 admonition 块转换为带样式的 HTML 提示框，并保留原语言标题。 |
| copyOrCompressAsset | 函数 | 396–411 | 简单 | build-system、asset、filesystem、documentation | 0 | 按文件类型选择复制或压缩方式，把引用的图片资产输出到帮助中心资源目录。 |
| discoverLocaleInputs | 函数 | 49–85 | 中等 | build-system、i18n、documentation、discovery | 0 | 扫描帮助文档源目录，推断出参与构建的 locale 列表及其输入输出根路径。 |
| escapeHtmlAttribute | 函数 | 106–121 | 简单 | utility、html、escaping、sanitization | 0 | 转义写入 HTML 属性中的字符，防止 Markdown 内容破坏生成的页面结构。 |
| flattenSidebarItems | 函数 | 428–466 | 中等 | documentation、navigation、transformation、i18n | 0 | 展开 sidebar 配置的分组与文档条目，形成与生成文档一一对应的扁平导航结构。 |
| listMarkdownFiles | 函数 | 182–196 | 简单 | utility、filesystem、documentation、discovery | 0 | 递归列出目录下所有 Markdown 源文件并返回排序后的相对路径集合。 |
| loadSourceDocs | 函数 | 198–221 | 中等 | documentation、parsing、markdown、i18n | 0 | 读取并解析各 locale 的源文档，剥离 frontmatter、提取标题并缓存原始内容。 |
| normalizeImageReference | 函数 | 278–299 | 中等 | documentation、asset、path-resolution、markdown | 0 | 归一化图片引用路径，区分站内资源与外部链接并附加版本化查询参数。 |
| renderImageFigure | 函数 | 325–336 | 简单 | documentation、markdown、html、rendering | 0 | 把图片引用渲染为带说明文字与响应式样式的 figure 元素。 |
| resolveDocId | 函数 | 246–276 | 中等 | documentation、link-resolution、i18n、routing | 0 | 把文档内相对链接解析为目标 locale 中存在的 docId，找不到对应文档时回退到原链接。 |
| rewriteMarkdown | 函数 | 338–368 | 中等 | documentation、markdown、transformation、build-system | 0 | 对单篇文档执行完整重写：admonition 转换、内部链接重解析、图片替换与资源收集。 |
| validateOutput | 函数 | 503–544 | 中等 | validation、build-system、documentation、quality-gate | 0 | 校验生成结果：输出目录体量、manifest 一致性与缺失文档，发现异常即中止构建。 |
| writeGeneratedDocs | 函数 | 378–394 | 简单 | documentation、build-system、filesystem、writing | 0 | 把重写后的各 locale 文档写入生成目录，并确保目标路径位于仓库内。 |
