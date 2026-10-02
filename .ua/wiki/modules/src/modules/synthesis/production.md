
# src/modules/synthesis/production
> 目录聚合页：2 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/synthesis/production/synthesisProductionOwner.ts](../../../../files/src/modules/synthesis/production/synthesisProductionOwner.ts.md) | 文件 | 0 | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [src/modules/synthesis/production/synthesisProductionRpcPolicy.ts](../../../../files/src/modules/synthesis/production/synthesisProductionRpcPolicy.ts.md) | 文件 | 0 | 生产客户端 RPC 策略层：以 contract-set 的 operations.json 为 SSOT，为每个 capability 解析请求/结果数据面、工作模型、receipt 形态与 deadline，避免在客户端各处硬编码超时。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/synthesis/sidecar](sidecar.md) | 5 |
| [packages/synthesis-contracts/src](../../../packages/synthesis-contracts/src.md) | 2 |
| [src/modules/synthesis/reverseHost](reverseHost.md) | 2 |
| [src/platform](../../platform.md) | 2 |
| [packages/synthesis-contracts/contract-set/synthesis-production-client-v1](../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1.md) | 1 |
| [src/modules](../../modules.md) | 1 |
| [src/modules/synthesisClient](../synthesisClient.md) | 1 |
