
# workflows_builtin/mineru/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/mineru/hooks](../../../../modules/workflows_builtin/mineru/hooks.md)
<!-- node: file:workflows_builtin/mineru/hooks/applyResult.mjs -->

MinerU 工作流的 execute 后置 hook，负责把解析结果落盘为 Markdown 与图片附件：内置一整套跨运行时文件系统工具（读写、复制、移动、列举），将 MinerU 输出的分片 Markdown 合并、其中的图片引用重写到暂存目录，再物化为 Zotero 附件或本地文件。
源码：[workflows_builtin/mineru/hooks/applyResult.mjs](../../../../../../workflows_builtin/mineru/hooks/applyResult.mjs)

## 符号（11）
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:collectBundlePart -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:copyImagesIntoStage -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:copyPath -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:findEntryByBaseName -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:findOutputAttachmentForPath -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:joinPath -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:materializeParts -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:resolveSourceAttachmentMetadata -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:rewriteMarkdownImagePaths -->
<!-- node: function:workflows_builtin/mineru/hooks/applyResult.mjs:stringifyUnknownError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 520–601 | 复杂 | entry-point、workflow-hook、aggregation、error-handling、status-tags | 0 | execute hook 入口：按 stage 推进地解析源附件、收集各分片 bundle、物化合并产物，并尝试清除父条目的 need-fulltext/need-markdown 状态标签；状态切换失败降级为 partial 警告而非中断。 |
| collectBundlePart | 函数 | 311–334 | 中等 | bundle、markdown、extraction | 1 | 从单个分片的 bundle 中读取必需的 full.md 与可选 images 目录，缺 full.md 时按分片标签报错。 |
| copyImagesIntoStage | 函数 | 363–386 | 中等 | file-system、merge、conflict-detection | 1 | 把分片图片目录合并进暂存目录，检测到同名文件冲突即报错，避免多分片图片互相覆盖。 |
| [copyPath](../../../../symbols/workflows_builtin/mineru/hooks/applyResult.mjs/copyPath.md) | 函数 | 193–221 | 中等 | file-system、copy、cross-runtime | 2 | 基于宿主 file API 的递归复制实现，先确保父目录存在再逐项复制，支持目录与文件两种源。 |
| findEntryByBaseName | 函数 | 231–255 | 中等 | bundle、lookup、filesystem | 1 | 在 bundle 解压目录中按基础名查找条目（full.md 或 images 目录），容忍嵌套层级并按 isDir 过滤。 |
| findOutputAttachmentForPath | 函数 | 89–112 | 中等 | attachment、lookup、idempotency | 1 | 在父条目下按归一化路径查找已有的 Markdown 输出附件，用于判定应替换文件还是新建附件。 |
| [joinPath](../../../../symbols/workflows_builtin/mineru/hooks/applyResult.mjs/joinPath.md) | 函数 | 48–72 | 中等 | path-utils、cross-platform、utility | 2 | 跨平台路径拼接，按宿主分隔符规则归一化并处理绝对路径、盘符与尾部分隔符，替代 Node 的 path 模块。 |
| [materializeParts](../../../../symbols/workflows_builtin/mineru/hooks/applyResult.mjs/materializeParts.md) | 函数 | 388–471 | 复杂 | materialization、attachment、core-logic、file-system、idempotency | 1 | 物化核心：先把各分片 Markdown 合并、图片重写到暂存目录，再原子替换目标图片目录并写盘 Markdown，最后以 stored_file 方式创建或替换父条目下的附件，清理发生在 finally 中。 |
| resolveSourceAttachmentMetadata | 函数 | 277–300 | 中等 | attachment、host-api、metadata | 1 | 从请求上下文解析源附件 ref，取得其父条目 ref 与本地路径，缺少附件或父条目时直接失败。 |
| rewriteMarkdownImagePaths | 函数 | 257–275 | 中等 | markdown、path-rewrite、text-processing | 1 | 重写 Markdown 与内联 HTML 中的 images/ 图片引用前缀，指向合并后的 Images_<key> 目录。 |
| stringifyUnknownError | 函数 | 473–518 | 中等 | error-handling、diagnostics、utility | 1 | 把形态未知的错误值（宿主错误对象等）尽力转成可读字符串，逐字段拼接后回退到 JSON 序列化。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [pdfSplitPlan.mjs](../lib/pdfSplitPlan.mjs.md) | workflows_builtin/mineru/lib/pdfSplitPlan.mjs | MinerU 工作流的 PDF 拆分计划库，读取 Zotero 附件的页数与 outline（优先 pdf.js、其次元数据 helper、最后回退到 PDF 文本启发式），并按 outline 章节边界切分页码区间，输出可供各 hook 消费的 split plan 与聚合 id。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 520–601 | execute hook 入口：按 stage 推进地解析源附件、收集各分片 bundle、物化合并产物，并尝试清除父条目的 need-fulltext/need-markdown 状态标签；状态切换失败降级为 partial 警告而非中断。 |
