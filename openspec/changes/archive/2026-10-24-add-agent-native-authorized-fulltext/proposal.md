# Proposal

## Why

用户已有个人或机构订阅，但 literature-search-ingest 当前只允许公开全文，Agent 无法使用 Zotero 本机授权完成 PDF 入库。原生知网单篇验证已证明同会话请求可取得匹配 PDF；需要将它建设为可观察、可取消、保持认证及正文在本机的 Host 能力。

## What Changes

- 增加 Zotero 原生浏览器获取能力，区分跨重启登录配置、任务内页面及目标、任务内下载及文件三种寿命。
- ACP 与 SkillRunner 的真实任务获得独立 acquisition grant，通过共享 registry 的 CLI／MCP 投影操作；批准论文范围覆盖任务内访问及下载，附件写入沿用现有审批。
- 下载结果以仅供本机附件导入的 opaque 文件引用交接，复用 lease、private prepared-file 与 canonical mutation，不自动开放远程正文传输。
- 主 Agent 先保存或复用条目，再补授权 PDF，读取附件 receipt 后形成 ledger 和最终输出；取消保留部分成功，applyResult 维护状态投影。
- 保留公开 PDF 探测顺序，增加知网授权补充路线。首轮 Linux／Zotero 10、兰州交通大学 CARSI、PDF-only；不用外部下载运行时。
- 将真实跨重启认证及同会话下载作为首个实施检查点；不满足时停止后续自动功能实施，记录未完成任务。

## Capabilities

### New Capabilities

- `zotero-host-native-browser-acquisition`: 持久认证配置、原生页面操作、同会话下载、短调用、隔离和生命周期。
- `literature-search-ingest-authorized-fulltext`: Agent 授权获取、论文匹配、附件提交、证据及恢复。

### Modified Capabilities

- `host-bridge-file-downloads`: 获取文件的用途限制及带 lease 的附件准备。
- `host-bridge-workflow-control`: 本机获取文件可作为既有附件写入入口的来源。
- `zotero-host-access-prompt-injection`: ACP／SkillRunner 获取权限注入、真实任务绑定和撤销。
- `zotero-mcp-host-bridge-capability-catalog`: 获取能力使用独立的任务授权准入。
- `literature-workbench-package`: 公开路线后的授权补充、最终附件证据与取消后的部分结果。
- `literature-workbench-workflows`: Agent 最终结果、主 Agent 串行写入及缺全文状态投影。

## Impact

涉及 Broker 及原生 browser owner、Bridge registry／permissions／文件 registry、ACP 与 SkillRunner 的任务准备和终态清理、CLI 合同及受治理的 Agent surfaces、literature-search-ingest 的 Skill／schema／gate 脚本、workflow apply hook 与说明。复用既有附件 authority 和统一 Zotero E2E；不升级 Workflow Host v12，不增加依赖、外部服务或通用后台队列。

需求依据为 `artifacts/authorized-fulltext-wayfinder/integration-contract-draft.md`（已闭合接入契约）；单篇证据只覆盖 Linux／Zotero 10.0.5，不代表持久认证、生产接口或完整 workflow 已验收。没有提交、归档或发布授权。
