
# src/modules/synthesisClient
> 目录聚合页：5 个文件、8 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/synthesisClient/clientPortAdapter.ts](../../../files/src/modules/synthesisClient/clientPortAdapter.ts.md) | 文件 | 0 | Synthesis 客户端 Port 适配器：把抽象的 `SynthesisClientPort` 调用翻译为契约重建 + 受控执行，是 UI 与原生实现之间的统一入参校验与错误归一化边界。 |
| [src/modules/synthesisClient/defaultClient.ts](../../../files/src/modules/synthesisClient/defaultClient.ts.md) | 文件 | 3 | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [src/modules/synthesisClient/nativeComposition.ts](../../../files/src/modules/synthesisClient/nativeComposition.ts.md) | 文件 | 0 | 原生合成客户端装配层：把 RPC 客户端、传输客户端、业务审计与生产 supervisor 组装为实现 `SynthesisClient` 的原生 Port，负责资产物化、请求 transfer 与 RPC 错误到客户端错误的映射。 |
| [src/modules/synthesisClient/workbenchUiAdapter.ts](../../../files/src/modules/synthesisClient/workbenchUiAdapter.ts.md) | 文件 | 0 | 工作台 UI 适配层：把客户端侧的 workbench 读取结果与图谱失败翻译为 UI 可直接消费的形态，包括图谱布局失败的分类、忙状态识别与 read state 构造。 |
| [src/modules/synthesisClient/workflowHostClient.ts](../../../files/src/modules/synthesisClient/workflowHostClient.ts.md) | 文件 | 5 | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../../packages/synthesis-contracts/src.md) | 5 |
| [src/modules/synthesis/sidecar](synthesis/sidecar.md) | 5 |
| [src/modules](../modules.md) | 3 |
| [src/workflows](../workflows.md) | 2 |
| [src/modules/synthesis](synthesis.md) | 1 |
| [src/modules/synthesis/production](synthesis/production.md) | 1 |
| [src/modules/synthesis/workbench](synthesis/workbench.md) | 1 |
