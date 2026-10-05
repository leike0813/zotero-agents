
# workflows_builtin/mineru/workflow.json

语言：json
所属分层：[内置工作流包与 Skill 资产](../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/mineru](../../../modules/workflows_builtin/mineru.md)
<!-- node: config:workflows_builtin/mineru/workflow.json -->

MinerU 工作流的声明式定义：使用 schemaVersion 2 协议，绑定 generic-http Provider，要求存在 PDF 附件选择，通过 available 阶段的选择校验（源文件存在、同名 mineru-markdown 产物缺失），并以 generic-http.steps.v1 声明创建上传地址、PUT 上传、轮询解析结果直至 done/failed、下载 zip 包四个步骤，配套 preflight / buildRequest / applyResult 三个 hook 与 10 分钟超时。

规模：148 行
源码：[workflows_builtin/mineru/workflow.json](../../../../../workflows_builtin/mineru/workflow.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](hooks/applyResult.mjs.md) | workflows_builtin/mineru/hooks/applyResult.mjs | MinerU 工作流的 execute 后置 hook，负责把解析结果落盘为 Markdown 与图片附件：内置一整套跨运行时文件系统工具（读写、复制、移动、列举），将 MinerU 输出的分片 Markdown 合并、其中的图片引用重写到暂存目录，再物化为 Zotero 附件或本地文件。 |
| [buildRequest.mjs](hooks/buildRequest.mjs.md) | workflows_builtin/mineru/hooks/buildRequest.mjs | MinerU 工作流的 request 构建 hook，依据 split plan 中的分片条目生成后端请求的 steps 列表，把每个 PDF 分片的路径、页码范围等参数组装成 MinerU 服务可消费的调用步骤。 |
| [preflight.mjs](hooks/preflight.mjs.md) | workflows_builtin/mineru/hooks/preflight.mjs | MinerU 工作流的 preflight hook，在请求发出前校验源附件是否可读、页数等元数据是否齐备，并通过 readPdfSplitMetadata 计算 PDF 拆分方案，缺条件时以结构化错误中止。 |
