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

使用可靠修正证据。外部元数据与已整理字段冲突时，呈现来源与选择，不得自动选取最新或最完整值。宽泛请求按共同 effect 和风险分批；破坏性或异构变更采用更小审阅组。

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

## 批次 proposal 记录

只有变更的 target type、evidence basis、operation 与风险相同时，才将其分组。每个批次表示为：

```text
batch_id:
change_kind:
targets:
evidence_source:
before_state:
proposed_delta:
unchanged_fields:
expected_side_effects:
verification_read:
risk_class: additive | corrective | destructive
```

对于 field correction，当当前值不同时，`proposed_delta` 应是逐 item field map，而不是共享 patch。对于 tag 与 collection，分别表示 add 和 remove。对于 file，包含 source artifact identity、checksum、target parent、预期 attachment name，以及是否可能与现有 attachment 冲突。

以下情况应拆分 proposal：

- 某个 target 的修正证据更弱；
- 某个 item 需要不同的 survivor、collection 或 parent；
- additive 与 destructive effect 混在一起；
- 一部分可由 direct mutation 表达，另一部分需要 workflow 语义；
- verification 差异过大，一份 receipt 无法解释结果。

审阅摘要可以聚合数量，但 approval 与 outcome record 必须保留确切 target ref 与 delta。

## 破坏性变更审阅

在 merge、delete、remove、replace 或 relink 前，回答：

1. 每个实时 target 是否都独立于显示文本完成身份确认？
2. 哪些 child attachment、note、annotation、collection、tag、relation、Product 或 workflow artifact 可能变得不可达或改变所有权？
3. 哪个 record 将存续，预期哪些 field 或 link 胜出？
4. Effect 能否通过已公开 operation 撤销，还是只能依据外部证据恢复？
5. 当前状态是否仍与 proposal preflight 一致？
6. 更窄的 additive 或 corrective operation 能否满足请求？
7. 哪项确切实时读取能够证明破坏性 effect？

使用以下审阅模式：

| Operation | 必需比较 |
| --- | --- |
| Duplicate merge | Survivor 与每个 candidate、冲突 metadata、child-state 去向 |
| Item 或 note deletion | Target identity、parent/child 可达性、请求 scope |
| Tag 或 collection removal | 确切 membership delta，以及 removal 是全局还是 item-scoped |
| Attachment replacement/removal | 现有 child identity、source file evidence、下游 reference |
| Product removal | Product record 与所选 asset 事实；managed-file 生命周期仍然独立 |
| Relinking | 旧、新 parent/target identity 及所有受影响关系 |

如果任何后果无法确立，应收窄 proposal 或交回人工审阅。不得用 workflow 绕过缺失的破坏性 operation 证据。

## 剩余 delta 恢复

发生部分或不确定结果后，从实时状态推导下一份 proposal：

1. 读取前一份 receipt 命名的每个 target；
2. 比较当前状态与获批期望状态；
3. 删除已满足 delta 与不改变状态的 no-op；
4. 分别分类 conflict、denied target 与 unverifiable target；
5. 确认已消费 file handle 或 workflow input 是否需要重新生成；
6. 仅为剩余 effect 创建新的 residual proposal。

| 剩余类别 | 含义 | 恢复方式 |
| --- | --- | --- |
| Verified success | 期望状态已实时存在 | 保留证据；从 retry 排除 |
| Verified no-op | 执行前或执行中状态已经匹配 | 报告 unchanged；从 retry 排除 |
| Denied/canceled | Approval 不允许该 effect | 停止；不得换一种说法重试同一写入 |
| Conflict | 实时状态偏离已审阅 preflight | 重新读取证据并请求新决策 |
| Failed, retryable | 未观察到期望状态，且 receipt 允许 retry | 重建最小有效请求 |
| Failed, non-retryable | 合同指出再次尝试不安全或不受支持 | 返回诊断与备选路径 |
| Applied, unverified | Receipt 表明可能变更，但实时读取不可用 | 不得 retry；先恢复 verification |
| Handle consumed, state uncertain | Transfer/apply handle 可能不能复用 | 获取新 handle 前检查持久 receipt 与 target |

如果 metadata 已应用，但后续 report 或 attachment 阶段失败，只恢复后续阶段。Remaining delta 由当前 Zotero 状态定义，而不是由原始 request payload 定义。

## 恢复与易错边界

- 标题匹配或生成报告不足以证明目标身份；先解析实时对象。
- Denial 表示不写入。不得选择其他 mutation 或工作流获得同一 effect。
- Merge、deletion、Product removal 与 relinking 比添加 tag 或 collection 变更后果更广，需要显式目标级审阅。
- 修正来源有歧义时，返回备选项与当前状态，不得覆盖字段。
- 工作流完成但缺少承诺条目变更时，保留 run 输出并报告验证失败。
- 写入成功但后续报告 artifact 失败时，不得重复写入；只恢复缺失报告阶段。
- 定时 hygiene 或 attention 结果识别候选项时，将其保留为 proposal。周期性维护属于托管 facet。
## 端到端决策轨迹

这些痕迹展示了模糊的清理语言如何成为可审查的提案，以及部分或不确定的写入如何产生残留增量而不是重放。

### Trace 1：“清理这些标签”

用户话语：

> 清理这些论文张上的标签。

歧义之处：

- 目标集可能取决于当前的选择；
- “清理”可能意味着拼写规范化、受控词汇映射、重复数据删除、删除或推断添加；
- 删除可能会放弃用户含义；
- 异构标签可能需要不同的证据。

第一个行动：

1. 解决选定的项目。
2. 实时读取当前标签。
3. 询问或识别受控词汇和允许的转换。
4. 将确定性归一化与语义标签推断分开。
5. 制定每个项目的提案。

提案行：

- 项目ref；
- 当前标签；
- 提议添加、替换和删除标签；
- 变换规则或证据；
- 明确保留的标签；
- 预期的副作用；
- approval scope;
- 验证读取。

安全默认值：

- 无需书面即可提出提案。
- 保留未知的用户标签。
- 除非有要求，否则不要推断新的语义标签。

面向用户的建议：

> 我发现了拼写/大小写重复、到所提供词汇的映射以及六个含义不明确的标签。前两组可作为一批进行评审；不明确的标签将保持不变，直到您做出决定。

权威前取消的结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "canceled",
  "summary": "Prepared a reviewable tag-normalization proposal and stopped before mutation because approval and six ambiguous mappings are still required.",
  "artifacts": [
    {
      "path": "/workspace/tag-change-proposal.md",
      "role": "change-proposal",
      "mediaType": "text/markdown"
    }
  ],
  "diagnostics": [
    {
      "code": "tag_decisions_required",
      "message": "Six existing tags have no unambiguous controlled-vocabulary mapping."
    }
  ]
}
```

有惊无险：

- 标签调节分析结果并不批准写入变更活体项目。

### Trace 2：合并重复项及其受影响子项

用户话语：

> 合并这些重复项并保留更好的记录。

所需检查：

- 稳定的refs和强大的标识符；
- 版本/版本关系；
- 元数据冲突；
- 收藏品；
- 标签；
- 注释和注释；
- 附件；
- 关系并链接Products；
- 破坏性的后果。

重大决定：

- “更好”并不能识别幸存者。
- 相关预印本和出版版本不得重复。
- 子内容可能不会自动合并。

建议：

1. 目前的候选幸存者及其理由。
2. 列出每条记录中保留的字段。
3. 列出受影响的儿童和亲属。
4. 识别是否有任何删除。
5. 状态预计在状态后进行。
6. 将合并与合并不需要的元数据更正分开。

权威机构：

- 为确切的配对和幸存者获得当前的破坏性批准。
- 请勿将批准范围扩大到其他类似记录。

执行与验证：

- 申请一次。
- 保留操作receipt。
- 重新读取幸存者，删除身份状态、子项、集合、标签和关系。
- 报告任何不完整的传输。

不完整的子传输失败结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "The approved duplicate merge changed the library, but one attachment relation was not verified on the survivor, so the requested merge is not fully complete.",
  "evidence": [
    {
      "kind": "operation-receipt",
      "ref": {
        "operationId": "merge-operation-1"
      },
      "description": "Durable receipt for the one attempted merge."
    }
  ],
  "diagnostics": [
    {
      "code": "merge_child_unverified",
      "message": "One attachment relation requires a separate residual proposal after live inspection."
    }
  ]
}
```

恢复：

- 不要重复合并。
- 检查当前幸存者和附件状态。
- 仅准备剩余的附件更改。

### Trace 3：附加分析 artifact 时出现未知状态

用户话语：

> 将此分析附在论文中。

准备工作：

1. 验证本地 artifact 路径、字节、媒体类型和预期角色。
2. 解析确切的父项 Zotero 项。
3. 阅读当前附件。
4. 上传文件。
5. 保留返回的`fileId`、校验和、大小和消耗事实。
6. 预览附件写入变更。
7. 获得当前授权。

失败：

- 附着写入变更调用在提交后失去传输。
- 远程影响未知。

所需回应：

- 保留上传事实和操作handle。
- 请勿再次上传。
- 不要重复附着写入变更。
- 检查耐用的receipt。
- 重新阅读家长附件。

可能的结果：

- 附件存在并匹配校验和：将目标标记为完成。
- 收据证明未更改：如果允许，使用有效 handle准备安全残留写入变更。
- 状态仍然未知：返回`failed`并需要手动/当前状态解析。

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "The approved attachment write has an uncertain remote outcome; no retry was attempted while the durable receipt and live parent state remain unresolved.",
  "evidence": [
    {
      "kind": "zotero-item",
      "ref": {
        "libraryId": 1,
        "key": "PARENT01"
      },
      "description": "The exact target parent for live recovery."
    }
  ],
  "diagnostics": [
    {
      "code": "attachment_write_unknown",
      "message": "Inspect the operation receipt and current attachments before any new write."
    }
  ]
}
```

不安全的替代方案：

- 由于未收到成功响应而重试；
- 再次上传相同的字节；
- 假设本地 artifact 路径是 Zotero 附件；
- 附加到标题匹配。

## 整理对话与记录模板

模糊的要求：

> “清理”可能意味着几种不同的改变。我将首先在提案之前/之后生成每个目标，并保持实时 Zotero 状态不变。

破坏性请求：

> 此合并将删除一条记录并影响其注释和附件。请确认确切的幸存者和列出的儿童处理方式。

部分结果：

> 六项变更已得到实时验证，一项被拒绝，一项仍未知。剩余提案不包括六项已验证的成功。

未知结果：

> 呼叫可能已到达 Zotero。在考虑重试之前，我将检查持久的receipt和当前目标。

每个整理决策记录都应保存：

- 目标ref；
- 状态之前；
- 期望的状态；
- 更正证据；
- 语义变化类型；
- 破坏性后果；
- 批次标识；
- 预览;
- 现任权力机构；
- 操作/应用receipt；
- 生活在状态之后；
- 剩余增量。

保持提案artifact、业务结果和当前 Zotero 状态不同。提案描述了意图，结果描述了经过验证的执行，只有实时读取才能证明当前状态。
