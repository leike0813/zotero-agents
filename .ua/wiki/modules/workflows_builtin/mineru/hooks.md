
# workflows_builtin/mineru/hooks
> 目录聚合页：3 个文件、14 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [workflows_builtin/mineru/hooks/applyResult.mjs](../../../files/workflows_builtin/mineru/hooks/applyResult.mjs.md) | 文件 | 11 | MinerU 工作流的 execute 后置 hook，负责把解析结果落盘为 Markdown 与图片附件：内置一整套跨运行时文件系统工具（读写、复制、移动、列举），将 MinerU 输出的分片 Markdown 合并、其中的图片引用重写到暂存目录，再物化为 Zotero 附件或本地文件。 |
| [workflows_builtin/mineru/hooks/buildRequest.mjs](../../../files/workflows_builtin/mineru/hooks/buildRequest.mjs.md) | 文件 | 2 | MinerU 工作流的 request 构建 hook，依据 split plan 中的分片条目生成后端请求的 steps 列表，把每个 PDF 分片的路径、页码范围等参数组装成 MinerU 服务可消费的调用步骤。 |
| [workflows_builtin/mineru/hooks/preflight.mjs](../../../files/workflows_builtin/mineru/hooks/preflight.mjs.md) | 文件 | 1 | MinerU 工作流的 preflight hook，在请求发出前校验源附件是否可读、页数等元数据是否齐备，并通过 readPdfSplitMetadata 计算 PDF 拆分方案，缺条件时以结构化错误中止。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [workflows_builtin/mineru/lib](lib.md) | 3 |
