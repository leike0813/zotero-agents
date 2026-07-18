# Transport 组件说明

## 当前状态

当前版本没有面向 Workflow/runtime 的通用 `src/transport/` 抽象。网络协议仍由各 Provider 自行实现：

- `src/transport/` 目录为空
- SkillRunner HTTP：`src/providers/skillrunner/client.ts`
- Generic HTTP：`src/providers/generic-http/provider.ts`

ACP 本地进程使用独立且已启用的 transport 实现 `src/modules/acpTransport.ts`。该模块负责：

- 通过统一 platform command/subprocess 服务解析并启动 ACP 命令
- 将 Node、Mozilla Subprocess 与 Windows WebSocket Bridge 归一为同一 stdio 接口
- 管理 stdin EOF、进程树清理、退出码、stdout/stderr 尾部和结构化生命周期快照
- 将 process close 与 pipe drain 分开收敛

因此，“没有通用 transport 层”不等于 ACP 没有 transport；两者的抽象边界不同。

## 设计结论

- 现阶段不再将“传输协议”作为独立层对外暴露
- 执行协议由 Provider 决定并自行实现
- Workflow/runtime 仅依赖 Provider 抽象，不依赖 transport 细节
- ACP Chat、ACP Skills 和 backend probe 通过 `acpConnectionAdapter.ts` 共享 ACP transport 边界

## ACP 关闭与诊断

Mozilla Subprocess 创建成功后立即启动 stdout pump 与 stderr capture，再执行进程身份查询。stdout pump 将协议字节保存在队列中，`AcpClientConnection` 从队列读取，不会因诊断 capture 吞掉 ACP 消息。

进程结束后，transport 在固定上限内等待 stdout/stderr pump 收敛，随后冻结退出码、输出尾部及 `pipeDrainCompleted`/`pipeDrainTimedOut` 生命周期字段。`AcpClientConnection.closed` 另外区分：

- `local`：插件主动关闭
- `remote-eof`：远端正常结束消息流
- `receive-error`：读取、NDJSON framing 或 JSON-RPC 接收循环失败

adapter 对 initialize/close 错误采用稳定优先级：接收循环错误、已 drain 的 stderr、非零退出码、通用关闭提示。只有完成 initialize 的最终 connection 会向 SessionManager 发布 close；被 npx cache recovery 替换的物理尝试只执行局部清理。

## 通用层抽取条件

仅当多个 Provider 复用同一网络执行器时才需要新增通用 `src/transport/` 层：

- 至少两个 Provider 出现明显重复的 HTTP/上传/轮询逻辑
- 抽离后不会引入额外协议耦合（例如再次固化成单一 request 形态）
