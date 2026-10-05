
# src/workflows/zipBundleReader.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/zipBundleReader.ts -->

zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。
源码：[src/workflows/zipBundleReader.ts](../../../../../src/workflows/zipBundleReader.ts)

## 符号（1）
<!-- node: class:src/workflows/zipBundleReader.ts:ZipBundleReader -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ZipBundleReader | 类 | 56–208 | 复杂 | zip、归档读取、路径安全、解压 | 0 | zip bundle 读取器：按平台选择 Zotero 内部或 Node 解压实现，校验条目路径安全后按需解包并读取文本。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [archive.ts](archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [subprocess.ts](../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [testLeakProbeTempArtifacts.ts](../modules/testLeakProbeTempArtifacts.ts.md) | src/modules/testLeakProbeTempArtifacts.ts | 测试泄漏探针的临时工件收集器：记录测试运行期产生的临时路径，在断言阶段统一校验并清理，用于捕捉忘记删除的运行时残留。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bundleIO.ts](../modules/workflowExecution/bundleIO.ts.md) | src/modules/workflowExecution/bundleIO.ts | 运行结果 bundle 的跨运行时 IO 封装：解析临时路径、读写字节、清理文件，并提供目录型与不可用型 BundleReader 供结果上下文读取。 |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ZipBundleReader | 类 | 56–208 | zip bundle 读取器：按平台选择 Zotero 内部或 Node 解压实现，校验条目路径安全后按需解包并读取文本。 |
