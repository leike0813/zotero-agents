
# src/modules/skillRunner/connection
> 目录聚合页：8 个文件、35 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts](../../../../files/src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | 文件 | 9 | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts](../../../../files/src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts.md) | 文件 | 6 | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts](../../../../files/src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts.md) | 文件 | 1 | 连接审计的读取门面：把 connection governor 的核心快照与连接审计事件存储合并为单一诊断快照。 |
| [src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts](../../../../files/src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts.md) | 文件 | 3 | SkillRunner 连接审计事件的内存存储：按 governor 实例保留有界事件流与分类计数，供调试开关打开时查询连接排队、超时、跳过与迟到结算等行为。 |
| [src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts](../../../../files/src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts.md) | 文件 | 7 | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |
| [src/modules/skillRunner/connection/skillRunnerHandshake.ts](../../../../files/src/modules/skillRunner/connection/skillRunnerHandshake.ts.md) | 文件 | 3 | SkillRunner 协议握手层：向后端查询其支持的能力与协议集合并做带 TTL 的缓存，同时提供执行前断言所需协议的校验函数。 |
| [src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts](../../../../files/src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts.md) | 文件 | 5 | 握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。 |
| [src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts](../../../../files/src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts.md) | 文件 | 1 | SkillRunner 管理客户端的构造工厂，把后端实例的 baseUrl 与管理鉴权的读取/持久化回调注入客户端，并统一本地化错误提示。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/backends](../../backends.md) | 5 |
| [src/providers/skillrunner](../../providers/skillrunner.md) | 4 |
| [src/modules](../../modules.md) | 3 |
| [src/config](../../config.md) | 2 |
| [src/utils](../../utils.md) | 2 |
| [.](../../../index.md) | 1 |
| [src/modules/skillRunner/surface](surface.md) | 1 |
| [src/shared](../../shared.md) | 1 |
