
# src/modules/hostBridge/workflow/researchBundleService.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/workflow](../../../../../modules/src/modules/hostBridge/workflow.md)
<!-- node: file:src/modules/hostBridge/workflow/researchBundleService.ts -->

研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。
源码：[src/modules/hostBridge/workflow/researchBundleService.ts](../../../../../../../src/modules/hostBridge/workflow/researchBundleService.ts)

## 符号（14）
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:createCanonicalResearchBundleMaterializer -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:createDirectResearchBundleApplication -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:createResearchBundleImportEffects -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:createResearchBundleImporter -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:createResearchBundleMaterializer -->
<!-- node: class:src/modules/hostBridge/workflow/researchBundleService.ts:DirectResearchBundleError -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:formatResearchBundleArtifact -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:materializeResearchBundlePapers -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:publishDirectResearchBundle -->
<!-- node: class:src/modules/hostBridge/workflow/researchBundleService.ts:ResearchBundleImportValidationError -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:resolveMarkdownImagePath -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:rewriteMarkdownImages -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:rewriteTopicReportDigestLinks -->
<!-- node: function:src/modules/hostBridge/workflow/researchBundleService.ts:validateCanonicalResearchSnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createCanonicalResearchBundleMaterializer | 函数 | 2767–2921 | 复杂 | factory、物化、canonical | 0 | 构造基于 canonical 快照的研究包物化器，保证导出内容与已校验的库状态绑定。 |
| createDirectResearchBundleApplication | 函数 | 1158–1391 | 复杂 | 应用层、用例编排、factory、研究包 | 0 | 构造直连研究包的应用层用例：解析 selector、装配依赖并把请求编排为发布流程。 |
| [createResearchBundleImportEffects](../../../../../symbols/src/modules/hostBridge/workflow/researchBundleService.ts/createResearchBundleImportEffects.md) | 函数 | 1597–1910 | 复杂 | 导入、effect、broker、mutation-authority | 1 | 构造研究包导入所需的宿主 effects：创建文献、写入附件、建立 parent set 并汇总 mutation 凭证。 |
| createResearchBundleImporter | 函数 | 2209–2623 | 复杂 | 导入、用例编排、校验、研究包 | 0 | 研究包导入的主用例：校验 portable ref 与产物形态、逐项执行 effects 并输出可回放的导入回执。 |
| createResearchBundleMaterializer | 函数 | 617–660 | 简单 | factory、依赖注入、物化 | 0 | 注入文件系统依赖后构造研究包物化器，屏蔽运行时 adapter 差异。 |
| DirectResearchBundleError | 类 | 161–175 | 简单 | error-type、host-bridge、研究包 | 0 | 直连研究包（direct research bundle）能力的错误类型，携带错误码与结构化诊断。 |
| formatResearchBundleArtifact | 函数 | 402–454 | 中等 | 文献产物、序列化、研究包 | 0 | 把 canonical 文献产物格式化为 bundle 中的文件内容，按产物类型选择 JSON 或 Markdown 表达。 |
| [materializeResearchBundlePapers](../../../../../symbols/src/modules/hostBridge/workflow/researchBundleService.ts/materializeResearchBundlePapers.md) | 函数 | 456–615 | 复杂 | 物化、文件写入、研究包、产物导出 | 2 | 将一组论文及其产物、附件写入 bundle 目录，返回产物文件与附件的相对路径清单。 |
| [publishDirectResearchBundle](../../../../../symbols/src/modules/hostBridge/workflow/researchBundleService.ts/publishDirectResearchBundle.md) | 函数 | 839–1033 | 复杂 | 物化、导出交付、文件注册、研究包 | 1 | 发布直连研究包：物化目录、生成索引清单、注册 Host Bridge 文件句柄并返回下载描述符。 |
| ResearchBundleImportValidationError | 类 | 1417–1430 | 简单 | error-type、校验、导入 | 0 | 研究包导入阶段的校验错误类型，累积字段级校验失败项供工作流回显。 |
| resolveMarkdownImagePath | 函数 | 269–309 | 中等 | markdown、路径解析、研究包 | 1 | 解析 Markdown 中图片引用的相对路径，并判定其是否落在 bundle 目标目录内。 |
| rewriteMarkdownImages | 函数 | 311–359 | 中等 | markdown、重写、物化 | 0 | 重写 Markdown 里的图片链接，使其指向 bundle 内物化后的相对位置并跳过越界引用。 |
| rewriteTopicReportDigestLinks | 函数 | 662–712 | 中等 | markdown、重写、topic-report | 0 | 把 topic 报告中对 digest 产物的引用改写为 bundle 内的相对链接。 |
| [validateCanonicalResearchSnapshot](../../../../../symbols/src/modules/hostBridge/workflow/researchBundleService.ts/validateCanonicalResearchSnapshot.md) | 函数 | 2655–2765 | 复杂 | 校验、canonical、快照 | 1 | 校验 canonical 研究快照与请求的 ref 一致性，确保物化来源绑定到具体库与条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [archive.ts](../../../workflows/archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [hostBridgeFileRegistry.ts](../server/hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [referenceProjection.ts](../../../../packages/synthesis-application/src/referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [runtimeFileTransfer.ts](../../runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [sourceReferenceArtifact.ts](../../../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostMutationAuthority.ts](../../zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityRegistry.ts](../../hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](../server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeServer.ts](../server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [workflowHostOwners.ts](../../../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [zoteroMcpProtocol.ts](../mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createCanonicalResearchBundleMaterializer | 函数 | 2767–2921 | 构造基于 canonical 快照的研究包物化器，保证导出内容与已校验的库状态绑定。 |
| createDirectResearchBundleApplication | 函数 | 1158–1391 | 构造直连研究包的应用层用例：解析 selector、装配依赖并把请求编排为发布流程。 |
| [createResearchBundleImportEffects](../../../../../symbols/src/modules/hostBridge/workflow/researchBundleService.ts/createResearchBundleImportEffects.md) | 函数 | 1597–1910 | 构造研究包导入所需的宿主 effects：创建文献、写入附件、建立 parent set 并汇总 mutation 凭证。 |
| createResearchBundleImporter | 函数 | 2209–2623 | 研究包导入的主用例：校验 portable ref 与产物形态、逐项执行 effects 并输出可回放的导入回执。 |
| createResearchBundleMaterializer | 函数 | 617–660 | 注入文件系统依赖后构造研究包物化器，屏蔽运行时 adapter 差异。 |
| DirectResearchBundleError | 类 | 161–175 | 直连研究包（direct research bundle）能力的错误类型，携带错误码与结构化诊断。 |
| formatResearchBundleArtifact | 函数 | 402–454 | 把 canonical 文献产物格式化为 bundle 中的文件内容，按产物类型选择 JSON 或 Markdown 表达。 |
| [materializeResearchBundlePapers](../../../../../symbols/src/modules/hostBridge/workflow/researchBundleService.ts/materializeResearchBundlePapers.md) | 函数 | 456–615 | 将一组论文及其产物、附件写入 bundle 目录，返回产物文件与附件的相对路径清单。 |
| [publishDirectResearchBundle](../../../../../symbols/src/modules/hostBridge/workflow/researchBundleService.ts/publishDirectResearchBundle.md) | 函数 | 839–1033 | 发布直连研究包：物化目录、生成索引清单、注册 Host Bridge 文件句柄并返回下载描述符。 |
| ResearchBundleImportValidationError | 类 | 1417–1430 | 研究包导入阶段的校验错误类型，累积字段级校验失败项供工作流回显。 |
| rewriteTopicReportDigestLinks | 函数 | 662–712 | 把 topic 报告中对 digest 产物的引用改写为 bundle 内的相对链接。 |
