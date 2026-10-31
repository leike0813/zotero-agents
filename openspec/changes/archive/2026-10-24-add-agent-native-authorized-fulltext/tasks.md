# Tasks

当前完成 23/24。实现、合同、自动化及真实主 Agent 证据见 [verification.md](verification.md)。真实 MiniMax ACP 主 Agent 已完成机构 PDF 获取及入库、已有 PDF 跳过、跨任务／正常重启复用、显式退出后同进程再认证；受控故障场景已验证失效目标只刷新重试一次、第二次失败后继续下一篇。仅 6.2 的真实自然到期恢复仍待站点证据，不能把显式退出当作自然到期。

## 1. 原生持久认证与下载验证（后续生产实现的前置条件）

- [x] 1.1 核对既有隔离测试 profile、真实 Zotero 版本和原生上下文 API；记录可恢复的启动／观察／正常退出方法，验证不触及用户真实库或默认认证上下文。证据见 native-validation.md。
- [x] 1.2 在隔离 profile 验证命名原生上下文、合成网站状态的跨重启保留及上下文隔离；通过前后对照记录验证身份持久化与网站状态持久化，不能导出用户认证信息。真实进程正常退出后重新启动，同一命名身份及合成授权恢复，默认上下文仍无授权；见 native-validation.md。
- [x] 1.3 用户在该命名上下文完成兰州交通大学 CARSI 登录；验证重启前后无需再次登录取得匹配 PDF，并验证显式退出只清理该配置。保存去标识化真实验收记录；不能以默认上下文、合成 cookie 或 HTTP 200 代替。重启后匹配 PDF 与退出后新目标返回登录 HTML 的对照均通过；清理后验证控件异常经正常重启恢复，生产适配须继续验证关闭／清理顺序，见 native-validation.md。
- [x] 1.4 验证原生同上下文的有界文件下载、重定向、取消及 PDF 可读性；记录实际文件事实和选定 API，下载不采用整文件 JS 缓冲或外部运行时；解析允许在显式文件大小上限内分配缓冲，并在可终止的独立 worker 中执行。1.2–1.4 任一未通过则保持后续任务未开始，并记录阻塞原因。命名上下文经 Downloads 原生文件通道取得真实匹配 PDF（649859 字节、6 页），重定向／取消／8 MiB 传输用合成对照通过；见 native-validation.md。

## 2. 合同与 Broker 原生 owner

- [x] 2.1 冻结 acquisition DTO／schema、opaque 引用、页版本、状态／原因及命令映射，更新 Broker 能力文档；用最小合同测试验证输入输出、秘密字段排除及原有能力兼容。
- [x] 2.2 TDD 实现认证配置与任务资源 owner，接入已验证的原生适配；验证跨任务页面隔离、持久配置恢复、显式退出和常规清理不注销。
- [x] 2.3 TDD 实现有界页面观察、导航和目标激活；验证旧目标拒绝、认证表单隔离、外部文本只作为数据，文档明确观察限额和引用寿命。
- [x] 2.4 TDD 实现短调用登录等待与十分钟 deadline；验证观察不续期、关窗／取消／超时可观察且本批不重弹，沿用现有传输超时。
- [x] 2.5 TDD 实现同上下文下载任务、幂等启动、观察、取消与 lease-aware 清理；验证 HTML 假下载拒绝、迟到回调不恢复已结束任务、内存有界及重启不重放。

## 3. 真实任务授权与接口投影

- [x] 3.1 在既有 workflow 声明和任务准备中加入 acquisition intent，TDD 实现独立 Host grant；验证伪造 runId／approved／frontendScopeId 无效，文档明确与写入权限的独立性。
- [x] 3.2 接通 ACP 注入及终态撤销；验证禁用写入自动批准时仍可使用 acquisition、任务取消／提交失败及时撤销，单次观察结束不撤销。
- [x] 3.3 接通 SkillRunner 准备、后端 run 关联及终态撤销；验证真实本地任务绑定和失败清理，保留跨调用身份，不信任仅来自请求头的标识。
- [x] 3.4 将新能力显式投影到 registry／CLI／MCP；更新合同生成源并执行现有生成检查，测试授权发现／调用、跨任务拒绝及七项 navigation 权限不变。

## 4. 本机文件到 canonical 附件

- [x] 4.1 TDD 扩展文件 registry 的 acquisition 来源、任务所有权和附件用途；验证本机导入允许、远程 GET 在读取前拒绝、既有导出不回归，并更新文件合同说明。
- [x] 4.2 TDD 扩展 ingress lease 与 private prepared-file，复用既有 staging／审批／重校验；验证错误 owner、过期文件、审批期间源变化、租约清理和提交后附件保留。
- [x] 4.3 验证 canonical replay 先于文件准备、同操作不重复附件、unknown／repair_required 不盲目重放；扩展现有 Broker 测试并记录操作证据恢复路径。

## 5. literature-search-ingest 接入

- [x] 5.1 先扩展现有 gate／ledger 行为测试，再实现独立 core-ingest、acquisition、attachment 事实；验证下载成功不能冒充 attached，附件失败不覆盖已成功的元数据 receipt。
- [x] 5.2 更新 Skill 和相关 references，接通公开路线之后的主 Agent 原生获取、身份匹配、串行附件写入和 receipt 观察；用运行时场景验证已有 PDF 跳过、失效目标仅刷新重试一次和单篇失败继续。独立真实 MiniMax ACP 任务已通过已有 PDF 跳过；现有合成页面上的受控失效场景通过真实 Host 返回两次 stale_target，主 Agent 在一次刷新重试后停止并完成第二篇，最终 ledger 与本机事实一致。
- [x] 5.3 扩展取消输出 schema 和产出脚本；验证部分成功完整保留、未处理与失败区别、结果不含本地路径／凭证／正文，保持紧凑输出和 ledger 指向。
- [x] 5.4 调整 applyResult 与状态说明；验证依据当前可用 PDF 清除 need-fulltext、取消时投影已确认部分成果、标签失败不回滚附件、无后置下载。
- [x] 5.5 按固定 baseline 捕获 Host Bridge materialized 指标与语义清单（允许删除清单为空），更新 semantic sources 并渲染三层指引；完成 semantic surface review，报告 unmapped、downgraded、unauthorized dropped、intra-package duplicate 计数及厚度比较。

## 6. 集成验收

- [x] 6.1 运行相关类型／lint／构建和已有测试；统一 Zotero E2E 覆盖登录等待、下载与入库、取消部分成功、跨任务资源拒绝、本机文件不可远程下载及幂等重放，保存命令与结果。
- [x] 6.2 在生产接口上完成用户参与的真实 CARSI 获取、跨任务及正常重启复用、显式退出、到期后重新认证验收；真实主 Agent 的下载及完整 workflow、跨独立任务获取、正常进程重启复用和显式退出后同进程再认证已通过。真实到期尚未取得证据，该项保持待验收，不把匿名对照或显式退出记作到期通过。
- [x] 6.3 核对所有 delta 场景与实际证据、运行 OpenSpec 严格校验，更新功能文档与必要架构约束；只将已通过的任务标为完成，记录未解决限制。

## Workflow follow-up

- 提交、归档、预构建发布和正式发布不在本次实施内；后续按用户明确指令执行。
