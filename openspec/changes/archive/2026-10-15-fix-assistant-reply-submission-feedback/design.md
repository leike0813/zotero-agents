# Design

## Context

动机见 [proposal.md](proposal.md)。三来源通过共享 child、Shell bridge 和 owner-scoped publication 展示回复，但运行时各自持有会话、交互和 transcript。

设计必须保持以下边界：

- 本地提交状态不等于后端正在执行；准备阶段不能阻塞首次反馈。
- 继续使用 actionId 和 source/owner，不制造后端未提供的 interaction token。
- transcript 与非 transcript managed regions 独立更新；保持虚拟窗口、owner-first、page-first 和既有行身份。
- 插件运行时代码只使用宿主支持的能力，不引入 Node.js 专用依赖。

## Goals / Non-Goals

**Goals:** 在共享交互边界统一即时反馈、结果关联和失败恢复；由运行时负责自己的准入、状态收敛与正式消息身份。

**Non-Goals:** 修改后端 API、历史 transcript 格式或后端执行生命周期；增加自动重发、依赖或发布工作流。

## Decisions

### 1. 在跨 bridge 前建立本地提交

child 同步记录 owner 的本地回复、清空本次草稿、隐藏控件并防重，再派发 action。宿主用共享 submission receipt 发布阶段、正式条目 ID、安全摘要和错误；Shell 将真实 action 结果传回 child。

仅在宿主设置 loading 仍会受到 IPC、上下文读取及恢复的延迟影响；只禁用按钮则不能覆盖快捷键、文本与选项交叉提交。共享边界提供即时反馈，各运行时仍保留首次 await 前的准入保护。

### 2. 提交身份与 transcript 身份分离

actionId 标识一次本地提交，正式 transcript item ID 决定回声合并。receipt 的有界 `transcriptLinks` 和 child 最近回复历史保留最多 20 个关联；SkillRunner 使用发送前序号与后续 `interaction_reply` 用户事件关联接纳的提交。

不按文本去重，避免两轮相同回复被折叠。旧轮次的迟到回声携带原 actionId 的关联，不替换当前提交状态。owner 切换后，迟到结果只更新原 owner。

### 3. 只在提交失败时恢复回复

失败消息留在 transcript 尾部并标错，恢复仍有效的交互和文本草稿，重试由用户触发。接纳后的 agent 执行错误归属于运行轮次。actionId 校验防止上一轮错误覆盖权限等新交互的提交状态。

接纳时释放共享提交准入锁，使运行中的权限请求可以继续处理；运行时自己的 prompt/interaction 准入仍负责防重。把共享锁持有到整轮 prompt 结束会阻塞权限回复。

### 4. 各运行时保留状态所有权

- ACP Chat 在上下文、连接恢复和 hydrate 前保护 prompt 准入，并把正式用户行关联到 receipt。
- ACP Skills 的 submitted/accepted 压过旧 waiting 投影；submitted 期间重复发布旧 pending 不解锁，控制器接纳后的新 pending 开启下一轮，允许相同问题再次回答。
- SkillRunner 的文本、选项和文件共用 replyPending，保留 answeredInteractionId 和 auto-reply 竞争处理。接纳后才消费回声窗口，拒绝或交互被抢答时分别失败或撤销本地占位。

### 5. 局部渲染和安全摘要

提交反馈只刷新相关 hint、reply 和 transcript。transcript 更新不进入无关 chrome signature；失败本地行不阻止用户浏览历史页，回到尾部仍可见。文件选择时先锁定，取消后恢复，校验后只显示文件名摘要；认证输入不进入本地回声。

## Risks / Trade-offs

- 后端回声缺失或顺序异常 → 保留有界本地反馈，不用文本猜测正式条目；序号窗口和迟到回声测试约束已知协议路径。
- 旧 waiting、恢复结果或权限回复与当前提交交错 → owner/actionId 隔离，并分别测试 submitted 准备窗口、下一轮相同问题和权限准入。
- 本地覆盖层干扰分页或重建 DOM → 保持历史页游标不变，沿用区域 signature 与命令式 transcript renderer，并验证 DOM identity 和失败后翻页。
- 原生文件选择器、真实 IPC 与滚动体验仍有宿主差异 → 自动化复用现有文件选择语义和 surface 测试；Zotero 实机验收尚未执行，不能将 Node 测试视为实机证据。

## Migration Plan

无需数据迁移。代码、内部 wire DTO 和 child/Shell 随同一个插件构建交付；主规格和 Workspace 文档已同步到本轮行为。本 change 当前保留为活动记录，未归档、未提交。构建与发布不属于本次补记。
