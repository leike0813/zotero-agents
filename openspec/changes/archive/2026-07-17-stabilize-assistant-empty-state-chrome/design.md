## Context

三个 Assistant 子面板已经共享 managed panel renderer，但空态来源不同：ACP 在无 owner 时只发布 navigation/service/transcript，SkillRunner 则发送 `session: null` 并在页面层切换到独立空态 section。共享 model 因而缺少固定 banner 槽位，SkillRunner 还会隐藏包含回复区的整个主布局。

Assistant Workspace 要求 transcript 更新与其它 managed region 解耦，owner 切换也必须先呈现稳定的 loading/empty shell。因此空态应是同一 panel model 的一种投影，而不是替换页面结构或伪造 owner 数据。

## Goals / Non-Goals

**Goals:**

- 三个面板在空态和非空态间保持相同的 managed region 与主要 DOM identity。
- 用固定槽位、muted 状态和 disabled 控件表达“存在但当前不可用”。
- 保持全局导航和 Host Bridge 等全局服务的真实状态。
- 正确区分 SkillRunner 真正的 `session: null` 与尚未获得 requestId 的已选 session。

**Non-Goals:**

- 不修改 publication、ACP/SkillRunner 后端协议或 transcript 存储。
- 不在空态合成 owner、session、usage 或 Auto Reply 能力。
- 不改变非空态的运行时控制、workflow apply 或恢复语义。

## Decisions

- 在共享 panel model 边界集中投影 source-aware empty chrome。ACP 保持 strict owner publication，不向上游增加假的 owner-control/presentation。
- metadata 模型保留空值条目，`-` 仍由共享 renderer 生成，避免占位字符串进入领域 DTO。
- owner-scoped Connection/Interaction 指示器使用 unavailable/muted；Host Bridge 继续消费真实全局 service snapshot。
- ACP Chat/Skills 的 owner 相关 banner 控件与 composer 控件常驻但禁用；toolbar 中会话/任务、管理后端和显示模式保持可用，Details 禁用。
- SkillRunner 以 envelope 是否显式拥有 `session` 字段判定格式；`session: null` 才是新 workspace envelope 的空态，没有该字段的旧式直接 snapshot 继续兼容。
- 删除 SkillRunner 独立空态 section 和 main hidden 切换；无任务文案由共享 transcript 空态承担。
- 增加共享短副标题标签：Chat 使用“无会话”，Skills/SkillRunner 使用“无任务”。

## Risks / Trade-offs

- [Risk] 固定空 metadata 会改变 banner 高度 → 以非空态已有字段顺序作为唯一布局，空态仅替换 value。
- [Risk] 将无 requestId 误判为空态会隐藏已选任务 → 只以显式 `session: null` 判空，并保留 pre-ready 回归测试。
- [Risk] 空态控件常驻后错误触发 action → model 和 renderer 双层使用 disabled/enabled 语义，测试锁定所有 owner-scoped action。
- [Risk] transcript 更新带动整面板重建 → 继续使用 region signature guard，并增加 empty/selected 切换与 transcript-only DOM identity 测试。
