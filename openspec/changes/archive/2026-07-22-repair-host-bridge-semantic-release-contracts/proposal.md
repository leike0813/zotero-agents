## Why

Host Bridge 的 CLI、Agent Surface、运行时 DTO、agent apply 恢复状态与三面发布身份已经出现可观察的合同漂移，部分错误会直接诱导 Agent 使用错误字段、无限等待或不安全重试。发布链同时无法证明 release set 绑定了最终七平台字节，现有人工审阅镜像也不能可靠地保持一源一目标。

## What Changes

- **BREAKING**：将 CLI stdout、surface identity、Host manifest 与公开 workflow DTO 统一为 v3；workflow submit 只返回 `workflowRunId`。
- **BREAKING**：以三态 state/handle outcome 和 operation receipt 取代无法表达未知结果的布尔控制字段；所有状态变更命令获得幂等 operation id。
- 将 agent-run、apply lease、逐请求 receipt 和恢复状态持久化，并提供 30 天保留、renew 与 abandon。
- 从 socket peer 与 listener 构造可信 locality；将 `autoApproveWrites` 改为 Host 签发、短期、可撤销的运行期 grant。
- **BREAKING**：新 Host Bridge 发布改用 release-set/receipt v2；先产生内容寻址七平台 prebuild，再确定最终 releaseSetId，发布失败持续写 partial/failed receipt。
- 以显式 DTO/schema、Rust Clap inventory 和领域 semantic supplements 生成 Agent Surface，修正 result schema、参数关系、示例、typed handles、effects、搜索与恢复图。
- 对齐 CLI Wrapper、Zotero Library Agent 与 Zotero Librarian profile 的当前态语义，并升级 review mirror 技能与确定性结构校验。
- 明确不改变 bearer token 的传输或落盘方式，也不拆分现有 permission action。

## Capabilities

### New Capabilities

- `host-bridge-operation-receipts`: 定义状态变更请求的 operation id、幂等执行、未知结果与可查询 receipt。
- `host-bridge-review-mirror`: 定义三个语义发布面的逐文件中文审阅镜像、来源清单、结构校验与机器合同摘要。

### Modified Capabilities

- `host-bridge-cli-interface`: 统一 v3 identity/output、公开 DTO、参数约束、JSON usage error、typed handles 与 surface search。
- `host-bridge-workflow-control`: 持久化 agent-run/apply 状态机、逐请求 receipt、并发 one-shot、renew/abandon 与 30 天保留。
- `host-bridge-service`: 服务端从可信 transport identity 推导 locality，而不是信任客户端声明。
- `host-bridge-approval-prompts`: `autoApproveWrites` 必须由活跃 run 绑定的短期 Host grant 证明。
- `host-bridge-release-pipeline`: 使用 prebuild-first、内容寻址 release-set v2、完整 surface/payload 校验和可恢复 receipt v2。
- `zotero-library-agent-bundle`: 修正书目标识符路由、共享控制合同和 agent-owned handoff 恢复语义。
- `zotero-librarian-profile`: 修正逐阶段命令卡加载、共享控制合同和常驻恢复语义。

## Impact

- 影响 Rust CLI、Host Bridge server/workflow/persistence、Agent Surface renderer、发布规划/工作流/schema、三面正式语义源、OpenSpec 主规格以及 review mirror 技能和审阅产物。
- 新发布面和新 CLI 使用破坏性的 v3/v2 当前态合同；历史 release v1 receipt 仅保留只读识别。
- 不新增第三方依赖；复用现有 SQLite、runtime persistence、Rust/TypeScript 测试与内容 renderer。
