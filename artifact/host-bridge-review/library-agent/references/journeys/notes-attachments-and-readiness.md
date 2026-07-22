# 笔记、附件与就绪状态

对笔记内容、嵌入式 workflow payload、阅读器标注、附件访问或缺失输入审计使用本旅程。

## 正确读取笔记

- `library note get` 返回一个笔记体片段；使用 offset/limit 继续直到请求的笔记体完整。
- `library note payloads` 枚举嵌入式 payload 描述符。在 `library note payload` 之前选择 payload id/类型；不要从笔记 HTML 猜测 payload 布局。
- `library annotation list` 返回结构化标注记录。当可移植导出格式是所需证据时使用 `annotation export`。

## 审计就绪状态

使用 `readiness missing-pdf`、`missing-markdown` 或 `missing-analysis` 获取单个聚焦的修复列表。当任务需要多个检查及其状态时使用 `readiness audit`。这些读取识别缺失制品；它们不获取、转换、分析或写入任何内容。

对于"选中论文缺失 PDF"：读取选择、规范化父引用、在支持时将就绪状态查询约束到这些引用，并报告缺失集合。在用户单独授权 workflow 或具体写入之前停止，不进行修复。

## 附件访问与证据

附件元数据和文件字节是不同的证据。如果 `library item attachments` 返回 bridge-download 访问，保留其 `fileId` 并使用 `file download`。验证校验和和字节数。如果访问不可用，报告附件记录及其错误，而非直接读取 Zotero 存储。

## 恢复

从最后接受的 offset 恢复片段/payload 分页。如果注册文件过期，重新读取附件记录以获取当前访问。绝不用笔记 id、附件 id、条目引用、本地路径或 `fileId` 互相替代。
