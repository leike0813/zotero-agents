
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs -->

分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs)

## 符号（45）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:atomic_write -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:begin -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:ByteBudget -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:commit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:content_text_chunks -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:descriptors_direction -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:dispatch_transfer_action -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:execute -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:fail_attempt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:finish_attempt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:get_output_manifest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:get_output_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:handle -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:handle_content -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:NativeTransferOwner -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:new -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:next_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:output_kind -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:page_identity -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:parse_publication -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:production_client_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:progress -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:publish_client_result -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:publish_content -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:put_input_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:queue_transfer_execution -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:reap -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:reject_queued -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:request_cleanup -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:reserve -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:seal_input -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:secure_directory -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:snapshot -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:stage_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:status -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:topic_apply_assets -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:TransferActionDto -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:TransferInputSource -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:TransferOutputSink -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:valid_string_list -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:validate_descriptor -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:validate_manifest_dto -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:validate_page_dto -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:validate_scope -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:validate_transfer_action_contract -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| atomic_write | 函数 | 2326–2336 | 简单 | transfer、rust、runtime | 0 | 分页传输中的 atomic write 步骤实现。 |
| begin | 函数 | 1563–1619 | 中等 | transfer、rust、runtime | 0 | 开启一次传输会话，分配 session 并记录 manifest 头。 |
| ByteBudget | 类 | 521–523 | 简单 | transfer、rust、type、lifecycle | 0 | 字节预算：按上限预留与结算传输字节，超限即失败。 |
| commit | 函数 | 1955–2002 | 简单 | transfer、rust、write-path | 0 | 提交 staging 页：原子落盘并登记 page identity。 |
| content_text_chunks | 函数 | 2309–2324 | 简单 | transfer、rust、runtime | 0 | 分页传输中的 content text chunks 步骤实现。 |
| descriptors_direction | 函数 | 2102–2183 | 中等 | transfer、rust、runtime | 0 | 分页传输中的 descriptors direction 步骤实现。 |
| dispatch_transfer_action | 函数 | 354–395 | 简单 | transfer、rust、routing | 1 | 传输动作分发：按 action 选择 begin/put/seal/execute/get/cleanup 路径并施加预算约束。 |
| execute | 函数 | 1705–1795 | 中等 | transfer、rust、lifecycle | 0 | 在会话上执行传输任务，并按类型选择 worker 或 content 路径。 |
| fail_attempt | 函数 | 2018–2039 | 简单 | transfer、rust、runtime | 0 | 把一次执行尝试标记为失败并释放其占用的预算。 |
| finish_attempt | 函数 | 1157–1196 | 简单 | transfer、rust、runtime | 0 | 完成一次执行尝试，回收句柄并结算预算与进度。 |
| get_output_manifest | 函数 | 1797–1806 | 简单 | transfer、rust、read-path | 0 | 读取输出 manifest 头，供消费方判断输出形态。 |
| get_output_page | 函数 | 1808–1823 | 简单 | transfer、rust、read-path | 0 | 按页号读取输出页，页未提交时明确失败而不返回半成品。 |
| handle | 函数 | 1067–1104 | 简单 | transfer、rust、routing | 0 | 分页传输中的 handle 步骤实现。 |
| handle_content | 函数 | 1106–1128 | 简单 | transfer、rust、routing | 0 | 在content路径上完成请求分发与结果投影。 |
| NativeTransferOwner | 类 | 328–336 | 简单 | transfer、rust、type、lifecycle | 0 | 传输所有者：管理并发会话上限、页预算、TTL 回收以及输入输出页的 staging/commit 与原子发布。 |
| new | 函数 | 1002–1020 | 简单 | transfer、rust、runtime | 0 | 构造该类型的实例，完成必要字段初始化。 |
| next_page | 函数 | 1879–1905 | 简单 | transfer、rust、runtime | 0 | 计算下一页的页号与方向，累计方向页与总字节上限。 |
| output_kind | 函数 | 2283–2293 | 简单 | transfer、rust、runtime | 0 | 分页传输中的 output kind 步骤实现。 |
| page_identity | 函数 | 2185–2217 | 简单 | transfer、rust、runtime | 0 | 分页传输中的 page identity 步骤实现。 |
| parse_publication | 函数 | 2043–2071 | 简单 | transfer、rust、runtime | 0 | 解析 publication 输入并归一为内部强类型结构。 |
| production_client_request | 函数 | 1306–1363 | 中等 | transfer、rust、runtime | 0 | 分页传输中的 production client request 步骤实现。 |
| progress | 函数 | 2219–2247 | 简单 | transfer、rust、runtime | 0 | 汇报当前传输进度：已提交页数与剩余字节估算。 |
| publish_client_result | 函数 | 1538–1552 | 简单 | transfer、rust、write-path | 0 | 把执行结果发布为客户端可读形态，并推进会话状态。 |
| publish_content | 函数 | 1365–1536 | 中等 | transfer、rust、write-path | 0 | 发布 content 传输结果：按 target 字节切块、原子写出并登记 page identity。 |
| put_input_page | 函数 | 1621–1673 | 中等 | transfer、rust、runtime | 0 | 接收一页输入：校验页结构与字节预算后 staging，等待 seal 时统一提交。 |
| queue_transfer_execution | 函数 | 397–488 | 中等 | transfer、rust、runtime | 0 | 把已封口的传输请求排入执行队列，并在预算内启动一次执行尝试。 |
| reap | 函数 | 1035–1049 | 简单 | transfer、rust、runtime | 0 | 回收已完成或已过期的会话，释放预算。 |
| reject_queued | 函数 | 1139–1155 | 简单 | transfer、rust、runtime | 0 | 推进 reject queued 状态转换，并保证失败路径不留下半完成状态。 |
| request_cleanup | 函数 | 1835–1845 | 简单 | transfer、rust、runtime | 0 | 请求清理未消费的输出页与 staging 资源。 |
| reserve | 函数 | 964–976 | 简单 | transfer、rust、runtime | 0 | 分页传输中的 reserve 步骤实现。 |
| seal_input | 函数 | 1675–1694 | 简单 | transfer、rust、runtime | 0 | 封口输入：校验页序列完整后把 staging 页提升为可执行输入。 |
| secure_directory | 函数 | 2338–2347 | 简单 | transfer、rust、runtime | 0 | 分页传输中的 secure directory 步骤实现。 |
| snapshot | 函数 | 1022–1033 | 简单 | transfer、rust、runtime | 0 | 输出传输状态快照：活跃会话、页进度与字节占用。 |
| stage_page | 函数 | 1917–1953 | 简单 | transfer、rust、write-path | 0 | 把一页写入 staging 区，等待 commit 后再对外可见。 |
| status | 函数 | 2249–2273 | 简单 | transfer、rust、runtime | 0 | 查询单个会话的状态与阶段。 |
| topic_apply_assets | 函数 | 1198–1304 | 中等 | transfer、rust、runtime | 0 | 应用 topic 相关资产到 canonical 存储，作为传输完成后的必要尾部动作。 |
| TransferActionDto | 类 | 262–300 | 简单 | transfer、rust、type、lifecycle | 0 | 传输动作 wire DTO，描述 action、session 与参数。 |
| TransferInputSource | 类 | 499–507 | 简单 | transfer、rust、type、lifecycle | 0 | 传输输入来源抽象，供 worker 从会话读取分页输入。 |
| TransferOutputSink | 类 | 509–519 | 简单 | transfer、rust、type、lifecycle | 0 | 传输输出接收抽象，供 worker 写入分页输出。 |
| valid_string_list | 函数 | 877–886 | 简单 | transfer、rust、runtime | 0 | 判定 valid string list 条件是否成立。 |
| validate_descriptor | 函数 | 561–581 | 简单 | transfer、rust、validation | 0 | 校验  descriptor 的结构、版本与预算约束，拒绝不合规输入。 |
| validate_manifest_dto | 函数 | 583–726 | 中等 | transfer、rust、validation | 0 | 校验传输 manifest：版本、编码、节形状与页预算必须与协议一致。 |
| validate_page_dto | 函数 | 728–875 | 中等 | transfer、rust、validation | 0 | 校验单页 DTO：页号连续性、字节上限与内容类型。 |
| validate_scope | 函数 | 547–559 | 简单 | transfer、rust、validation | 0 | 校验  scope 的结构、版本与预算约束，拒绝不合规输入。 |
| validate_transfer_action_contract | 函数 | 895–955 | 中等 | transfer、rust、validation | 0 | 校验传输动作与当前会话状态匹配，拒绝非法状态转移。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_background_tasks.rs](runtime_background_tasks.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs | 后台任务所有者：注册后台线程、停止准入、协作式取消，并在共享 deadline 内 drain，回报残留任务数与 panic 计数。 |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_lifecycle.rs](runtime_lifecycle.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs | 生命周期与所有权：StopSignal 合并停止原因并让首个 failure 成为 primary，RuntimeOwnership 以独占锁与原子写管理 discovery、runtime root 与 data root。 |
| [runtime_worker_pool.rs](runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| dispatch_transfer_action | 函数 | 354–395 | 传输动作分发：按 action 选择 begin/put/seal/execute/get/cleanup 路径并施加预算约束。 |
| finish_attempt | 函数 | 1157–1196 | 完成一次执行尝试，回收句柄并结算预算与进度。 |
| handle | 函数 | 1067–1104 | 分页传输中的 handle 步骤实现。 |
| handle_content | 函数 | 1106–1128 | 在content路径上完成请求分发与结果投影。 |
| NativeTransferOwner | 类 | 328–336 | 传输所有者：管理并发会话上限、页预算、TTL 回收以及输入输出页的 staging/commit 与原子发布。 |
| new | 函数 | 1002–1020 | 构造该类型的实例，完成必要字段初始化。 |
| production_client_request | 函数 | 1306–1363 | 分页传输中的 production client request 步骤实现。 |
| publish_client_result | 函数 | 1538–1552 | 把执行结果发布为客户端可读形态，并推进会话状态。 |
| reap | 函数 | 1035–1049 | 回收已完成或已过期的会话，释放预算。 |
| reject_queued | 函数 | 1139–1155 | 推进 reject queued 状态转换，并保证失败路径不留下半完成状态。 |
| snapshot | 函数 | 1022–1033 | 输出传输状态快照：活跃会话、页进度与字节占用。 |
| topic_apply_assets | 函数 | 1198–1304 | 应用 topic 相关资产到 canonical 存储，作为传输完成后的必要尾部动作。 |
| TransferInputSource | 类 | 499–507 | 传输输入来源抽象，供 worker 从会话读取分页输入。 |
| TransferOutputSink | 类 | 509–519 | 传输输出接收抽象，供 worker 写入分页输出。 |
