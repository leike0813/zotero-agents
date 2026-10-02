
# workflows_builtin/mineru/hooks/buildRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/mineru/hooks](../../../../modules/workflows_builtin/mineru/hooks.md)
<!-- node: file:workflows_builtin/mineru/hooks/buildRequest.mjs -->

MinerU 工作流的 request 构建 hook，依据 split plan 中的分片条目生成后端请求的 steps 列表，把每个 PDF 分片的路径、页码范围等参数组装成 MinerU 服务可消费的调用步骤。
源码：[workflows_builtin/mineru/hooks/buildRequest.mjs](../../../../../../workflows_builtin/mineru/hooks/buildRequest.mjs)

## 符号（2）
<!-- node: function:workflows_builtin/mineru/hooks/buildRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/mineru/hooks/buildRequest.mjs:buildSteps -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 73–117 | 中等 | entry-point、workflow-hook、request-builder | 0 | request hook 入口：解析源附件路径与文件名，剔除 preflight 遗留的内部上下文字段，组装 generic-http.steps.v1 请求、context 与轮询参数。 |
| buildSteps | 函数 | 10–71 | 中等 | request-pipeline、step-definition、mineru、http-steps | 1 | 声明 MinerU 通用 HTTP 调用的四步流水线：申请上传 URL、二进制上传、轮询解析结果直至 done/failed、下载结果 zip。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [pdfSplitPlan.mjs](../lib/pdfSplitPlan.mjs.md) | workflows_builtin/mineru/lib/pdfSplitPlan.mjs | MinerU 工作流的 PDF 拆分计划库，读取 Zotero 附件的页数与 outline（优先 pdf.js、其次元数据 helper、最后回退到 PDF 文本启发式），并按 outline 章节边界切分页码区间，输出可供各 hook 消费的 split plan 与聚合 id。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 73–117 | request hook 入口：解析源附件路径与文件名，剔除 preflight 遗留的内部上下文字段，组装 generic-http.steps.v1 请求、context 与轮询参数。 |
