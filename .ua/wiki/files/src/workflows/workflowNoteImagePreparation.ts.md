
# src/workflows/workflowNoteImagePreparation.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/workflowNoteImagePreparation.ts -->

笔记图片准备：解码并校验 base64 图片、推断 MIME、按有界尺寸与 token 化引用生成 prepared image，供后续在原生事务中导入为笔记附件。

规模：801 行
源码：[src/workflows/workflowNoteImagePreparation.ts](../../../../../src/workflows/workflowNoteImagePreparation.ts)

## 符号（12）
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:computeBoundedSize -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:createOpaqueToken -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:createWorkflowNoteImagePreparation -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:createWorkflowPreparedImageScope -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:decodeBase64 -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:detectImageMimeType -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:estimateBase64Bytes -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:inferImageMimeType -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:normalizeOptions -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:normalizePreparedImageOptions -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:normalizeSource -->
<!-- node: function:src/workflows/workflowNoteImagePreparation.ts:resolveCanvasDocument -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| computeBoundedSize | 函数 | 343–355 | 简单 | image、scaling、bounds | 0 | 按宽高上限等比缩放并计算最终尺寸。 |
| createOpaqueToken | 函数 | 124–138 | 简单 | token、security、prepared-file | 0 | 为 prepared image 生成不可预测的引用 token，避免暴露宿主路径。 |
| createWorkflowNoteImagePreparation | 函数 | 490–573 | 中等 | factory、image、prepared-file、exported | 0 | 创建图片准备器，绑定画布能力、摘要与错误映射。 |
| createWorkflowPreparedImageScope | 函数 | 575–798 | 复杂 | scope、prepared-file、lifecycle、exported | 0 | 创建 prepared image 作用域，统一管理 token 到路径的映射与清理。 |
| decodeBase64 | 函数 | 153–177 | 简单 | base64、decoding、validation | 0 | 严格解码 base64 图片字节，拒绝非白名单字符。 |
| detectImageMimeType | 函数 | 179–210 | 简单 | image、detection、mime | 0 | 按字节魔数识别图片 MIME 类型。 |
| estimateBase64Bytes | 函数 | 140–151 | 简单 | base64、estimation、bounds | 0 | 按 base64 长度估算解码后的字节数，用于早期限额拦截。 |
| inferImageMimeType | 函数 | 268–277 | 简单 | image、mime、inference | 0 | 结合魔数与声明类型推断最终 MIME。 |
| normalizeOptions | 函数 | 279–298 | 简单 | normalization、image、validation | 0 | 统一规范化图片准备请求的各字段。 |
| normalizePreparedImageOptions | 函数 | 212–257 | 简单 | validation、options、image | 0 | 规范化图片准备选项的大小与质量上限。 |
| normalizeSource | 函数 | 300–341 | 简单 | normalization、image、validation | 0 | 规范化图片来源，拒绝非允许的 base64 或宿主路径形态。 |
| resolveCanvasDocument | 函数 | 357–369 | 简单 | runtime、canvas、resolution | 0 | 在候选宿主窗口中解析出可用的 canvas 文档。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createWorkflowNoteImagePreparation | 函数 | 490–573 | 创建图片准备器，绑定画布能力、摘要与错误映射。 |
| createWorkflowPreparedImageScope | 函数 | 575–798 | 创建 prepared image 作用域，统一管理 token 到路径的映射与清理。 |
