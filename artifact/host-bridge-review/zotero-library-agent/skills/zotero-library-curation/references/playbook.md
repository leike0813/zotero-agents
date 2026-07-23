# 文献库整理操作手册

## 变更分类与 proposal

从当前 Zotero 状态解析目标，并对请求 effect 分类：

| 变更 | 先读证据 | Proposal 必须公开 |
| --- | --- | --- |
| 条目元数据 | 当前字段值、条目类型、修正来源 | 逐字段变更前/后值及冲突 |
| 标签 | 当前标签与确切 item ref | add/remove 集合，以及已知时自动/手工影响 |
| 分类 | 当前 membership 与 collection 身份 | 条目、目标 collection、add/remove effect |
| 笔记与 payload | 当前笔记正文/payload 身份 | create/update/upsert 内容与父关系 |
| 文件与附件 | 父条目、本地 artifact 或已签发文件、当前附件 | upload/attach 序列、显示名称、media type、checksum |
| Duplicate/merge/relink | 完整候选记录与相关状态 | survivor、removed/relinked 状态及更广后果 |
| Readiness 或生成 artifact | 当前缺失输入/分析状态 | 指定工作流或具体修复与预期输出 |
| Product removal | Product 记录与所选 asset 事实 | 记录 removal effect，不暗示立即删除托管文件 |

使用可靠修正证据。外部元数据与已策展字段冲突时，呈现来源与选择，不得自动选取最新或最完整值。宽泛请求按共同 effect 和风险分批；破坏性或异构变更采用更小审阅组。

只有不再需要语义推断后才选择直接 mutation。操作仍需分类、内容生成、多步协调、provider 执行或可复用合同时，使用已描述工作流。导航可帮助用户查看目标，但绝不能替代写路径。

## Mutation 与文件工作流

通用 mutation 使用受支持 preview 构建并检查 payload。简单已知操作使用语义 item、tag、collection、note 或 attachment 命令。呈现目标 ref 与声明 effect，再由 Zotero 端 approval 步骤决定执行。

对于文件回写：

1. 验证本地 artifact、role、content type、checksum 与预期父条目；
2. 上传并保留短期 `fileId` 与返回元数据；
3. 通过已批准 mutation 将签发 handle 附加到当前父条目；
4. 刷新父条目附件并识别新持久化记录。

本地路径不能用作 Zotero 附件目标。`fileId` 不能替代 Product 或附件 ID。attach 前访问过期时，先确认未创建附件，再只重复传输步骤。

笔记操作应区分子笔记创建、笔记正文更新与嵌入 payload upsert。先检查笔记与 payload descriptor；不得从渲染 HTML 派生 payload 结构。除非当前命令合同明确公开写入，否则此发布面的 annotation 操作仍仅为 read/export。

## Product 与持久 artifact

Product、工作流 artifact、文件与附件具有不同所有权：

- Product list/get 识别 Dashboard 输出记录；
- Product download 传输所选 asset；
- Product removal 经 approval 作用于 Product 记录；
- 工作流 artifact 属于其 run 或条目合同；
- 已上传文件是临时传输输入；
- Zotero 附件是条目下的实时子对象。

工作流完成后检查预期 Product，并显式选择预期 asset。验证已下载字节。用户请求把 export Product 或工作流 artifact 附加到 Zotero 时，将 download、本地 verification、upload、附件 mutation 与实时 confirmation 视为具有不同证据的独立阶段。

artifact 报告可记录 proposal 或结果，但只有实时对象读取或持久 operation/apply receipt 能确定 Zotero 状态。保留 origin、Product/artifact 身份、checksum、本地路径、已上传 handle 与最终附件身份，不得混淆。

## 验证与部分结果

执行后重新读取确切目标，将相关字段、membership、笔记内容、附件或 Product 与已批准 proposal 比较。记录：

- applied 与 unchanged 目标；
- denied、conflicted、failed 或 unattempted 目标；
- operation 或 workflow receipt 与 approval 结果；
- 无法验证的状态；
- 存在时的剩余 delta。

已接受请求或终态工作流不能证明期望字段变更。响应不确定时，检查 `operationId`、`stateChange` 与 `handleConsumption`，随后在重试前读取目标。mutation 已应用但无法验证时，将结果报告为 unverified，而非 completed。

部分结果绝不能重放原始批次。从剩余 proposal 中移除经实时验证的成功项；若残余 effect 与已审阅 scope 存在实质差异，则请求新权限。

## 恢复与易错边界

- 标题匹配或生成报告不足以证明目标身份；先解析实时对象。
- Denial 表示不写入。不得选择其他 mutation 或工作流获得同一 effect。
- Merge、deletion、Product removal 与 relinking 比添加 tag 或 collection 变更后果更广，需要显式目标级审阅。
- 修正来源有歧义时，返回备选项与当前状态，不得覆盖字段。
- 工作流完成但缺少承诺条目变更时，保留 run 输出并报告验证失败。
- 写入成功但后续报告 artifact 失败时，不得重复写入；只恢复缺失报告阶段。
- 定时 hygiene 或 attention 结果识别候选项时，将其保留为 proposal。周期性维护属于托管 facet。
