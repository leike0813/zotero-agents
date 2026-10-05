
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs -->

计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs)

## 符号（39）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:admit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:append_paged_frames -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:append_worker_stderr_tail -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:begin -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:commit -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:ComputeReservation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:crash_code -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:drop -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:from_protocol_name -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:InMemoryPagedInput -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:InMemoryPagedOutput -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:NativeComputePool -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:InMemoryPagedInput::new -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:InMemoryPagedOutput::new -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:NativeComputePool::new -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:paged_section_rows -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:paged_section_value -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:PagedInputSource -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:PagedOutputCommit -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:PagedOutputSink -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:protocol_name -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:record_failure -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:recv_frame -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:reserve -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:run_direct -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:run_direct_json -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:run_paged -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:runtime_fault -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:send -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:snapshot -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:spawn -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:stage_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:stop -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:validate_direct_result -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:wait -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:with_worker -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:WorkerChild -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:WorkerExecution -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:WorkerOperation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| admit | 函数 | 659–694 | 简单 | worker、rust、runtime | 0 | 在并发与字节预算内为一次计算操作取得预留，超限则快速失败。 |
| append_paged_frames | 函数 | 396–430 | 简单 | worker、rust、runtime | 0 | 记录 append paged frames，用于诊断、观测或状态留痕。 |
| append_worker_stderr_tail | 函数 | 1155–1169 | 简单 | worker、rust、runtime | 0 | 截取 worker stderr 尾部字节，附加到故障诊断中而不整体保留。 |
| begin | 函数 | 246–259 | 简单 | worker、rust、runtime | 0 | 推进 begin 状态转换，并保证失败路径不留下半完成状态。 |
| commit | 函数 | 296–316 | 简单 | worker、rust、write-path | 0 | 推进 commit 状态转换，并保证失败路径不留下半完成状态。 |
| ComputeReservation | 类 | 622–626 | 简单 | worker、rust、type、lifecycle | 0 | admission 预留：并发额度与字节预算的持有凭证，drop 时自动归还。 |
| crash_code | 函数 | 557–569 | 简单 | worker、rust、runtime | 0 | 把子进程异常退出折叠为稳定的 crash 错误码。 |
| drop | 函数 | 1130–1140 | 简单 | worker、rust、runtime | 0 | 池析构时停止准入并回收全部子进程，避免遗留孤儿进程。 |
| from_protocol_name | 函数 | 68–87 | 简单 | worker、rust、runtime | 1 | 构造或转换 from protocol name 所需的中间结构。 |
| InMemoryPagedInput | 类 | 165–169 | 简单 | worker、rust、type、lifecycle | 0 | 内存态分页输入，供直连与测试场景使用。 |
| InMemoryPagedOutput | 类 | 222–229 | 简单 | worker、rust、type、lifecycle | 0 | 内存态分页输出，按页累积并支持读取已提交内容。 |
| NativeComputePool | 类 | 608–616 | 简单 | worker、rust、type、lifecycle | 0 | 计算 worker 池所有者：维护子进程、admission 预留、direct 与 paged 执行，以及故障记录与停止。 |
| new | 函数 | 172–205 | 简单 | worker、rust、runtime | 0 | 构造该类型的实例，完成必要字段初始化。 |
| new | 函数 | 232–242 | 简单 | worker、rust、runtime | 0 | 构造该类型的实例，完成必要字段初始化。 |
| new | 函数 | 629–649 | 简单 | worker、rust、runtime | 0 | 构造该类型的实例，完成必要字段初始化。 |
| paged_section_rows | 函数 | 327–364 | 简单 | worker、rust、runtime | 0 | worker CLI 适配中的 paged section rows 步骤实现。 |
| paged_section_value | 函数 | 366–394 | 简单 | worker、rust、runtime | 0 | worker CLI 适配中的 paged section value 步骤实现。 |
| PagedInputSource | 类 | 117–121 | 简单 | worker、rust、type、lifecycle | 0 | 分页输入来源抽象，屏蔽内存态与传输态两种实现差异。 |
| PagedOutputCommit | 类 | 129–132 | 简单 | worker、rust、type、lifecycle | 0 | 分页输出提交凭证：确保页先 staging 后才按序 commit，避免消费方读到半成品。 |
| PagedOutputSink | 类 | 158–163 | 简单 | worker、rust、type、lifecycle | 0 | 分页输出接收抽象，屏蔽内存态与传输落盘两种实现差异。 |
| protocol_name | 函数 | 89–107 | 简单 | worker、rust、runtime | 0 | worker CLI 适配中的 protocol name 步骤实现。 |
| record_failure | 函数 | 1010–1025 | 简单 | worker、rust、runtime | 0 | 登记一次 worker 故障，折叠为 typed fault 并触发进程替换。 |
| recv_frame | 函数 | 527–555 | 简单 | worker、rust、runtime | 0 | 从子进程 stdout 读取一个完整帧，处理部分读取与超大帧拒绝。 |
| reserve | 函数 | 696–719 | 简单 | worker、rust、runtime | 0 | 实际预留额度并生成可跨阶段持有的 reservation。 |
| run_direct | 函数 | 721–733 | 简单 | worker、rust、lifecycle | 0 | 以 direct 形态执行一次 worker 操作并校验结果结构。 |
| run_direct_json | 函数 | 735–804 | 中等 | worker、rust、lifecycle | 0 | direct 执行的 JSON 实现：完成帧交换、结果解析与 validate_direct_result 校验。 |
| run_paged | 函数 | 806–959 | 中等 | worker、rust、lifecycle | 0 | 以 paged 形态执行：按页推送输入、拉取输出页并提交，未消费的输出被请求清理。 |
| runtime_fault | 函数 | 1143–1153 | 简单 | worker、rust、lifecycle | 0 | 把内部 worker 故障转换为对外可识别的 fault 描述。 |
| send | 函数 | 514–525 | 简单 | worker、rust、runtime | 0 | worker CLI 适配中的 send 步骤实现。 |
| snapshot | 函数 | 1042–1054 | 简单 | worker、rust、runtime | 0 | 输出池状态快照：活跃 worker、排队任务与累计故障计数。 |
| spawn | 函数 | 465–512 | 简单 | worker、rust、lifecycle | 0 | 以固定构建 fingerprint 启动 worker 子进程并完成就绪握手。 |
| stage_page | 函数 | 261–294 | 简单 | worker、rust、write-path | 0 | 推进 stage page 状态转换，并保证失败路径不留下半完成状态。 |
| stop | 函数 | 1027–1040 | 简单 | worker、rust、lifecycle | 0 | 停止准入、取消在途操作并回收子进程。 |
| validate_direct_result | 函数 | 1186–1335 | 中等 | worker、rust、validation | 0 | 校验 direct 执行返回的 JSON 结构与必需字段，不合预期即判为 worker 失败。 |
| wait | 函数 | 1075–1126 | 中等 | worker、rust、lifecycle | 0 | 在共享 deadline 内等待子进程退出，超时则强制结束并保留 stderr 尾部。 |
| with_worker | 函数 | 968–986 | 简单 | worker、rust、runtime | 0 | 在池内取得一个可用 worker 执行闭包，结束时归还并记录故障。 |
| WorkerChild | 类 | 441–446 | 简单 | worker、rust、type、lifecycle | 0 | 单个 worker 子进程封装：负责 spawn、帧收发、stderr 尾部收集与崩溃码归类。 |
| WorkerExecution | 类 | 448–459 | 简单 | worker、rust、type、lifecycle | 0 | worker 执行形态抽象，隔离子进程与内存态两类执行路径。 |
| WorkerOperation | 类 | 34–50 | 简单 | worker、rust、type、lifecycle | 0 | worker 操作类型枚举，携带协议名、deadline 分级与 paged/direct 执行形态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_deadline.rs](runtime_deadline.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs | 请求级 deadline：以 thread-local 记录请求截止时间，把下游 timeout 收敛为有界剩余时间，并在操作结束后恢复先前值。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |
| [runtime_transfer.rs](runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |
| [runtime_worker.rs](runtime_worker.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs | worker CLI 适配：按 stdin/stdout 帧协议读取任务、装配分页输入，并把分页结果按 graph 与 concept 两种形态写出。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| admit | 函数 | 659–694 | 在并发与字节预算内为一次计算操作取得预留，超限则快速失败。 |
| ComputeReservation | 类 | 622–626 | admission 预留：并发额度与字节预算的持有凭证，drop 时自动归还。 |
| from_protocol_name | 函数 | 68–87 | 构造或转换 from protocol name 所需的中间结构。 |
| NativeComputePool | 类 | 608–616 | 计算 worker 池所有者：维护子进程、admission 预留、direct 与 paged 执行，以及故障记录与停止。 |
| new | 函数 | 172–205 | 构造该类型的实例，完成必要字段初始化。 |
| new | 函数 | 232–242 | 构造该类型的实例，完成必要字段初始化。 |
| new | 函数 | 629–649 | 构造该类型的实例，完成必要字段初始化。 |
| PagedInputSource | 类 | 117–121 | 分页输入来源抽象，屏蔽内存态与传输态两种实现差异。 |
| PagedOutputCommit | 类 | 129–132 | 分页输出提交凭证：确保页先 staging 后才按序 commit，避免消费方读到半成品。 |
| PagedOutputSink | 类 | 158–163 | 分页输出接收抽象，屏蔽内存态与传输落盘两种实现差异。 |
| protocol_name | 函数 | 89–107 | worker CLI 适配中的 protocol name 步骤实现。 |
| record_failure | 函数 | 1010–1025 | 登记一次 worker 故障，折叠为 typed fault 并触发进程替换。 |
| reserve | 函数 | 696–719 | 实际预留额度并生成可跨阶段持有的 reservation。 |
| run_direct | 函数 | 721–733 | 以 direct 形态执行一次 worker 操作并校验结果结构。 |
| run_paged | 函数 | 806–959 | 以 paged 形态执行：按页推送输入、拉取输出页并提交，未消费的输出被请求清理。 |
| snapshot | 函数 | 1042–1054 | 输出池状态快照：活跃 worker、排队任务与累计故障计数。 |
| stop | 函数 | 1027–1040 | 停止准入、取消在途操作并回收子进程。 |
| wait | 函数 | 1075–1126 | 在共享 deadline 内等待子进程退出，超时则强制结束并保留 stderr 尾部。 |
| WorkerOperation | 类 | 34–50 | worker 操作类型枚举，携带协议名、deadline 分级与 paged/direct 执行形态。 |
