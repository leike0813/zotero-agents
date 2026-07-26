## Context

Host Bridge 的控制合同分散在 Rust Clap、TypeScript DTO、capability registry、Agent Surface builder、三个语义发布面和 release pipeline 中。当前这些层分别硬编码 identity、结果形状、恢复布尔值与发布摘要，导致 v1/v2/v3 分裂、不可验证的 result schema、内存 receipt、并发 apply 和非内容寻址 release set。实现必须保持 Zotero 插件环境无 Node-only 依赖，并遵守正式发布只由显式 dispatch 触发的边界。

## Goals / Non-Goals

**Goals:**

- 让 v3 CLI identity、stdout DTO、typed handles、错误恢复与 Agent Surface 由明确合同生成并可通过真实运行输出验证。
- 让所有状态变更有 operation receipt，让 agent apply 有持久、并发安全、逐请求可恢复的状态机。
- 让 locality 和 auto-approval 依赖 Host 可信上下文，而不是可重放的客户端声明。
- 让 release-set v2 绑定已存在的七平台字节和三个 surface 内容，并在部分失败时留下可恢复 receipt。
- 让三个语义面和中文审阅镜像忠实反映正式源与机器合同。

**Non-Goals:**

- 不改变 HTTP/TLS、bearer token 传输、well-known profile token 落盘或 token 存储。
- 不拆分 permission action，不发布 release，不同步 Gitee。
- 不保留 v3 公开 DTO 的旧字段别名，也不在 Agent skills 中写迁移历史。

## Decisions

1. TypeScript 共享合同声明当前 CLI/identity schema、outcome、handle taxonomy 和直接 endpoint result schema；Rust 从编译期嵌入的 Agent Surface 读取 identity，避免第二份版本常量。
2. `resultSchema` 只描述 CLI stdout `.data`。Direct endpoints 使用显式 DTO schema；capability commands 使用 `{capability, approval, data}` wrapper，只有已有稳定 output contract 时才收紧 inner data。
3. Error v3 使用 `stateChange` 与 `handleConsumption` 三态。所有状态变更命令携带 operationId；Host 在 SQLite 中以 operationId + canonical request digest 幂等执行并提供只读查询。
4. `plugin_task_contexts` 继续作为持久化底座，新增事务内 compare-and-set API；`host-bridge-operations` 与 `host-bridge-agent-runs` 通过领域 store 隔离 payload 和状态机。
5. Agent apply 在任何 await 前 CAS 取得 lease；首次可能写入前持久化 applying，逐请求写入前后更新 receipt。启动恢复时，将遗留 applying 变为 outcome_unknown。
6. Agent-run 各生命周期状态从最近一次状态变化保留 30 天。Prepared/expired 可 renew，prepared/expired 可 abandon；status read 不续期。
7. Trusted request context 由 accepted socket 的 peer 与 listener 构造。客户端 connection-mode header 只能把 local 降级为 remote。Auto-approve 使用进程内随机 grant，绑定 active run、runtime credential、trusted locality 与到期时间。
8. 七平台 prebuild 是正式 release set 的输入而不是正式发布 workflow 的产物。Release-set v2 的内容 ID 排除 source commit/status 等 provenance 或派生字段，纳入七平台字节和三个 surface 内容身份。
9. 发布 controller 持续写 publishing/partial/failed/complete receipt，并以远端 tag/ref/payload digest 为恢复事实。历史 v1 只读，新 dispatch 只接受 v2。
10. Rust inventory 拥有 argv 关系，semantic JSON 拥有 command-specific intent/example/near-miss/evidence/recovery，renderer 只组合事实。Review mirror 的翻译仍由 Agent 负责，脚本只做 inventory、结构校验和 manifest。

## Risks / Trade-offs

- [Breaking v3 output may break old callers] → 当前三个发布面同时切换并以真实 CLI contract tests 阻止混装，不保留重复别名。
- [SQLite journal cannot atomically cover Zotero side effects] → 写入前标 applying，崩溃后的当前项标 unknown，绝不自动重放。
- [Cross-repository mutable pointers cannot be atomic] → receipt 精确记录 partial 状态，resume 以远端事实幂等补齐。
- [Prebuild-first adds one preparation action] → build-only workflow不触发正式发布，最终 release set 在用户授权前已确定。
- [Mirror structural checks cannot judge translation quality] → 技能保留逐文件人工翻译职责，脚本只验证不可变结构和来源身份。

## Migration Plan

1. 先落地 v3 identity/DTO 和 operation/agent-run durable contracts，同时更新测试。
2. 增加 release v2 与 prebuild-first 工具；保留 v1 parser 只读，切断新 v1 dispatch。
3. 更新正式语义源并执行 content-only renderer。
4. 升级 mirror 技能并从新生成面刷新审阅产物。
5. 运行本地门禁；不 dispatch。回滚通过恢复旧代码和重新渲染生成面完成，不修改历史 release assets。

## Open Questions

无。用户已确认直接 v3、统一 30 天保留、prebuild-first、release schema v2 与单一总变更。
