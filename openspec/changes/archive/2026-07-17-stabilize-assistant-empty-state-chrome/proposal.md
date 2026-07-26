## Why

ACP Chat、ACP Skills 与 SkillRunner 在未选择会话或任务时会丢失 banner 信息槽位、上下文控件或整个回复区域，导致空态与工作态布局跳变，也使用户无法从稳定的界面结构判断哪些能力当前不可用。

## What Changes

- 让三个 Assistant 面板在无 owner/session 时继续渲染与非空态同构的 banner、transcript 和回复区域。
- 固定保留来源相关的元数据、状态 badge、LED、选择器和按钮，以 `-`、muted 和 disabled 表达不可用状态。
- 保持 Host Bridge 等全局服务的真实状态以及会话/任务导航能力，不伪造 owner 或运行时数据。
- 移除 SkillRunner 独立空态页面分支，使共享主区域和回复区始终挂载。
- 增加短空态副标题的本地化标签，并锁定空态/非空态切换时非 transcript managed region 的 DOM identity。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `assistant-sidebar-ui`: 规定 ACP Chat、ACP Skills 与 SkillRunner 的同构空态 chrome、可用性语义和稳定挂载行为。

## Impact

- 影响共享 Assistant panel model、SkillRunner run dialog 挂载逻辑、Assistant panel labels/locales 和相关 UI 测试。
- 不改变 ACP/SkillRunner 后端协议、publication DTO、transcript store、缓存或持久化格式。
