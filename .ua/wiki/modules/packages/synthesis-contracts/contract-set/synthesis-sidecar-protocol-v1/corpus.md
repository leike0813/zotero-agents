
# packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus
> 目录聚合页：14 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-artifact-library-debug.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-artifact-library-debug.json.md) | 配置 | 0 | Synthesis Sidecar 协议契约语料，锁定 artifact 库调试相关的 artifact-row 与 debug-operation 线缆形状：嵌套正例（nested positive）与开放字段负例（open negative）各成对出现，用于约束客户端解析时的封闭字段集合。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-citation-graph.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-citation-graph.json.md) | 配置 | 0 | 引用图谱（Citation Graph）方向的协议语料，覆盖 citation-graph 查询请求与 citation-metrics 计算结果的嵌套结构，并包含 snake_case 别名请求与通用 item 结果形态，锁定跨语言线缆字段命名。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-concept-topic-graph.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-concept-topic-graph.json.md) | 配置 | 0 | 概念与主题图（concept/topic graph）方向的协议语料，约束 concept 查询请求与 topic-graph 变更请求的嵌套字段封闭性，并以负例锁定 concept match 与 topic graph diagnostic 的开放字段。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-reference-canonical.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-reference-canonical.json.md) | 配置 | 0 | Reference 规范化事实方向的协议语料，约束 reference manual target 与 rank row 的嵌套结构，并以负例锁定 reference target 开放字段与 rank author type 的取值集合。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-tag.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-tag.json.md) | 配置 | 0 | 标签（tag）方向的协议语料，覆盖 tag 保存请求与 tag 导入预览结果的嵌套结构，并以负例区分 legacy entry 与冲突项开放字段这两类历史兼容形态。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json.md) | 配置 | 0 | Topic Workbench 工作台的协议语料主文件，收录 29 个用例，覆盖 chrome 请求、graph surface 请求、index/review registry 等工作台注册表结构，是本批中用例密度最高的契约基准。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-webdav-maintenance.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-webdav-maintenance.json.md) | 配置 | 0 | WebDAV 与公共维护操作（maintenance）方向的协议语料，约束 webdav state 与 maintenance operation 的嵌套视图，并以负例锁定 diagnostic 开放字段与 scope row 结构。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json.md) | 配置 | 0 | 工作流审阅（workflow review）方向的协议语料，验证递归 review 结构与 review 请求字段，并以负例锁定嵌套开放字段与别名路径，防止客户端按宽松形状解析。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/compute.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/compute.json.md) | 配置 | 0 | 计算能力（compute）方向的协议语料，覆盖 layout 请求与 metrics 结果的嵌套形状，并以 unknown-field 与 open diagnostics 负例约束结果的封闭性。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/lifecycle.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/lifecycle.json.md) | 配置 | 0 | Sidecar 生命周期语料，含 8 个用例：reverse-host 嵌套投影、runtime provenance 的 path/hash 区分、sidecar error details 与 observation 事件结构，并以负例锁定 provenance 必须使用 path 而非 hash。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json.md) | 配置 | 0 | 反向宿主（reverse-host）调用语料集，是本批唯一使用独立 schema 标识的语料文件，收录 10 个用例覆盖 related-items、tag effect、representative image、WebDAV description、artifact scan 与 delivery 等反向宿主结果形状。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/system.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/system.json.md) | 配置 | 0 | 系统面协议语料，覆盖 workbench operational chrome 结果、canonical inspect 结果、死状态载荷与通用 job 进度事件，锁定系统级快照与进度通知的线缆形状。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/transfer.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/transfer.json.md) | 配置 | 0 | 数据传输（transfer）语料，覆盖 citation 输入 manifest 与 topic 资产输出页的判别联合（discriminated union）形状，并以负例锁定未知字段与 page kind 行不匹配这两类错误边界。 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/worker.json](../../../../../files/packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/worker.json.md) | 配置 | 0 | Sidecar worker 语料集（独立 schema 标识），覆盖 worker tag entry 与 concept alias 的嵌套正例，并以未知嵌套字段与错误嵌套两类负例锁定 worker 层解析边界。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas](schemas.md) | 14 |
