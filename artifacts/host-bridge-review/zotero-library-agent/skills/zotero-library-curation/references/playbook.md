# 库策展 Playbook

## 变更分类与提案

从当前 Zotero 状态解析目标并分类所请求的影响：

| 变更 | 先读证据 | proposal 必须暴露 |
| --- | --- | --- |
| Item 元数据 | 当前字段值、item 类型、纠正来源 | 逐字段前后值与冲突 |
| Tags | 当前 tags 与确切 item refs | 添加/移除集合，已知时的自动/手动含义 |
| Collections | 当前成员关系与 collection identity | Item、目标 collection、添加/移除影响 |
| Notes 与 payloads | 当前 note 正文/payload 身份 | 创建/更新/upsert 内容与父关系 |
| 文件与 attachments | 父 item、本地 artifact 或已签发文件、当前 attachments | 上传/附加序列、显示名、媒体类型、校验和 |
| 重复/合并/relink | 完整候选记录与相关状态 | 幸存者、已移除/已 relink 状态、更广后果 |
| 就绪或生成的 artifacts | 当前缺失输入/分析状态 | 指名的 workflow 或具体修复与期望输出 |
| Product 移除 | Product 记录与所选 asset 事实 | 记录移除效果而不暗示立即删除托管文件 |

使用可靠的更正证据。当外部元数据与已整理字段冲突时，呈现来源与选择，而不是自动选择最新或最完整的值。宽泛请求按共同影响与风险分批；破坏性或异构变更获得更小的审阅组。

仅在不再有语义推断时选择直接 mutation。若操作仍需要分类、内容生成、多步协调、provider 执行或可复用契约，使用描述过的 workflow。Navigation 可帮助用户查看目标，但绝不能替代写入路径。

## Mutation 与文件 workflow

对通用 mutation，用受支持的 preview 构建并检查 payload。对简单已知操作，使用语义 item、tag、collection、note 或 attachment 命令。呈现目标 refs 与声明效果，然后让 Zotero 侧 approval 步骤决定执行。

对于文件写回：

1. 核实本地 artifact、role、内容类型、校验和与预期父级；
2. 上传它并保留短命 `fileId` 加返回的元数据；
3. 通过已批准的 mutation 把该已签发句柄附加到当前父 item；
4. 刷新 parent 的 attachments 并识别新持久化的记录。

本地路径不能用作 Zotero attachment 目标。`fileId` 不能替代 Product 或 attachment ID。若附件前访问过期，确认未创建 attachment 后只重复传输步骤。

对 note 操作，区分子 note 创建、note 正文更新与嵌入 payload upsert。先检查 note 与 payload 描述符；不要从渲染 HTML 推导 payload 结构。除非当前命令契约明确暴露写入，否则此 surface 上的 Annotation 操作保持为读取/导出。

## Products 与持久 artifacts

Products、workflow artifacts、文件与 attachments 有不同的所有权：

- Product list/get 识别 Dashboard 输出记录；
- Product 下载传输所选 asset；
- Product 移除通过 approval 作用于 Product 记录；
- workflow artifacts 属于其 run 或 item 契约；
- 上传文件是短暂的传输输入；
- Zotero attachments 是 item 下的实时子对象。

workflow 完成后检查预期 Product，并显式选择预期 asset。验证下载的字节。若用户请求将导出的 Product 或 workflow artifact 附加到 Zotero，将下载、本地验证、上传、附件变更与实时确认视为具有不同证据的独立阶段。

artifact 报告可记录 proposal 或结果，但只有实时对象读取或持久 operation/apply receipt 才能确立 Zotero 状态。保留来源、Product/artifact 身份、校验和、本地路径、已上传 handle 与最终附件身份，而不混淆它们。

## 验证与部分结果

执行后，重新读取确切目标，并将相关字段、成员关系、note 内容、附件或 Products 与已批准 proposal 比较。记录：

- 已应用与未变化的目标；
- 被拒、冲突、失败或未尝试的目标；
- operation 或 workflow receipt 与 approval 结果；
- 无法验证的状态；
- 剩余 delta，若有。

被接受的请求或终止的 workflow 不证明所期望的字段变更已发生。当响应不确定时，检查 `operationId`、`stateChange` 与 `handleConsumption`，然后在重试前读取目标。若变更已应用但无法验证，将结果报告为未验证而不是已完成。

对部分结果，绝不重放原始批次。从剩余提议中移除实时验证的成功项，且若残余效果与已审查范围有实质差异，请求新的权限。

## 批次 proposal 记录

仅当变更共享目标类型、证据基础、操作与风险时才分组。把每个批次表示为：

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

对于字段修正，当当前值不同时，`proposed_delta` 是逐 item 的字段映射，而非共享补丁。对于 tag 与 collection，将新增与移除分开。对于文件，包含源 artifact identity、校验和、目标 parents、预期 attachment 名称，以及现有 attachment 是否可能冲突。

在以下情况拆分提案：

- 一个目标有较弱的更正证据；
- 一个 item 需要不同的保留记录、collection 或父项；
- 增量与破坏性效果混合；
- 子集可由直接 mutation 表达，而另一部分需要 workflow 语义；
- 验证差异过大，单个 receipt 无法解释结果。

审阅摘要可以聚合计数，但 approval 与结果记录保留确切目标 refs 与差异。

## 破坏性变更审阅

合并、删除、移除、替换或 relink 前回答：

1. 每个实时目标是否独立于显示文本被识别？
2. 哪些子附件、notes、annotations、collections、tags、relations、Products 或 workflow artifacts 可能变得不可达或改变所有权？
3. 哪些记录幸存，预期哪些字段或链接胜出？
4. 该效果能否通过暴露的 operation 逆转，还是只能从外部证据恢复？
5. 当前状态是否仍与提案预检一致？
- 6. 更窄的增量或修正操作能否满足请求？
7. 哪次确切的实时读取会证明破坏性影响？

使用这些审查模式：

| 操作 | 必需比较 |
| --- | --- |
| 重复项合并 | 幸存者与每个候选、冲突元数据、子级状态处置 |
| Item 或 note 删除 | 目标 identity、parent/child 可达性、请求的范围 |
| Tag 或 collection 移除 | 确切的成员关系 delta，以及移除是全局还是 item 范围 |
| 附件替换/移除 | 既有子级身份、来源文件证据、下游引用 |
| Product 移除 | Product 记录与所选 asset 事实；托管文件生命周期仍保持分离 |
| 重新链接 | 新旧父/目标身份加所有受影响关系 |

若任何后果无法确定，收窄提案或将其退回人工审阅。不要把 workflow 当作绕过缺失破坏性操作证据的途径。

## 残余 delta 恢复

在部分或不确定结果后，从实时状态推导下一 proposal：

1. 读取先前 receipt 指名的每个目标；
2. 将当前状态与已批准的期望状态比较；
3. 移除已满足的 deltas 与不变的 no-ops；
- 4. 分别对冲突、被拒目标与不可验证目标分类；
5. 验证已消耗的文件 handles 或 workflow 输入是否需要重新生成；
- 6. 仅为剩余效果创建新的残余提议。

| 残余类别 | 含义 | 恢复 |
| --- | --- | --- |
| 已验证成功 | 期望状态已实时生效 | 保留证据；排除在重试之外 |
| 已验证无操作 | 状态在执行前或执行中已匹配 | 报告 unchanged；从重试中排除 |
| 被拒/已取消 | Approval 不允许该影响 | 停止；不要重构同一写入 |
| 冲突 | 实时状态偏离已审查的预检 | 重新读取证据并请求新决策 |
| 失败、可重试 | 未观察到期望状态且 receipt 允许重试 | 重建最小有效请求 |
| 失败、不可重试 | 契约称再次尝试不安全或不受支持 | 返回 diagnostics 与替代路径 |
| 已应用但未验证 | receipt 表明已变更，但实时读取不可用 | 不要重试；先恢复验证 |
| Handle 已消耗、状态不确定 | Transfer/apply handle 可能不再可复用 | 在获取新 handle 前检查持久 receipt 与目标 |

若元数据已应用后，后续的报告或附件阶段失败，只恢复该后续阶段。剩余 delta 由当前 Zotero 状态定义，而非原始请求 payload。

## 恢复与接近命中

- 标题匹配或生成的报告不足以作为目标身份；先解析实时对象。
- 拒绝即不写入。不要选择另一 mutation 或 workflow 来取得相同效果。
- 合并、删除、Product 移除与重新链接比追加性 tag 或 collection 变更影响更广，需要显式的目标级审查。
- 若更正来源有歧义，返回替代项与当前状态，而不是覆盖字段。
- 若 workflow 未完成承诺的 item 更改，保留 run 输出并报告失败的验证。
- 若写入成功但后续报告 artifact 失败，不要重复写入；只恢复缺失的报告阶段。
- 若计划中的卫生或 attention 结果识别出候选，将其保持为提议。周期性维护属于托管面。
## 端到端决策轨迹

这些 trace 演示了模糊的清理语言如何变成可审查的提议，以及部分或不明确的写入如何产生残余 delta 而非重放。

### Trace 1：“清理这些 tags”

用户表述：

> 清理这些论文上的 tags。

歧义：

- 目标集合可能依赖当前选择；
- “clean up”可能意味着拼写规范化、受控词汇映射、去重、移除或推断性添加；
- 移除可能丢弃用户含义；
- 异质 tags 可能需要不同证据。

首要动作：

1. 解析选定的 items。
2. 实时读取当前 tags。
3. 询问或识别受控词表与允许的转换。
4. 分离确定性规范化与语义 tag 推断。
5. 构建逐 item 提案。

提议行：

- item 引用；
- 当前 tags；
- 提议的已添加、已替换与已移除 tags；
- 转换规则或证据；
- 显式保留的 tags；
- 预期副作用；
- approval 范围；
- 验证读取。

安全默认：

- 产出提议而不写入。
- 保留未知用户 tags。
- 除非请求，否则不要推断新的语义 tags。

面向用户的提案：

> 我发现了拼写/大小写重复、到所提供词汇的映射，以及六个含义含混的 tags。前两组可作为一个批次审查；含混的 tags 在您决定前保持不变。

authority 前的已取消结果：

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

接近命中：

- Tag 规范分析结果不是变更实时 item 的许可。

### Trace 2：合并带受影响子级的重复

用户表述：

> 合并这些重复项并保留更好的记录。

必需检查：

- 稳定 refs 与强标识符；
- 版本/版次关系；
- 元数据冲突；
- collections；
- tags；
- notes 与 annotations；
- attachments；
- relations 与链接的 Products；
- 破坏性后果。

实质性决策：

- "better" 未识别幸存者。
- 相关预印本与发表版本可能不是重复。
- 子内容可能不会自动合并。

提案：

1. 呈现候选幸存者与理由。
- 2. 列出从每条记录保留的字段。
3. 列出受影响的子项与关系。
4. 识别任何移除。
5. 陈述期望的实时事后状态。
6. 把 merge 与合并不要求的元数据修正分开。

授权：

- 为确切的一对与幸存者获取当前破坏性 approval。
- 不要把 approval 扩展到其他相似记录。

执行与验证：

- 只应用一次。
- 保留操作 receipt。
- 重新读取幸存者、已移除身份状态、子级、collections、tags 与关系。
- 报告任何不完整传输。

不完整子项传输的失败结果：

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
- 检查当前幸存者与附件状态。
- 只准备残余的附件变更。

### Trace 3：附加分析 artifact 时状态未知

用户表述：

> 将此分析附加到该论文。

准备：

1. 核实本地 artifact 路径、字节、媒体类型与预期 role。
2. 解析确切的父级 Zotero item。
- 3. 读取当前 attachments。
4. 上传文件。
5. 保留返回的 `fileId`、校验和、大小与消耗事实。
6. 预览 attachment mutation。
7. 获取当前授权。

失败：

- attachment mutation 调用在提交后丢失传输。
- 远端效果未知。

必需响应：

- 保留上传事实与 operation 句柄。
- 不要再次上传。
- 不要重复 attachment mutation。
- 检查持久 receipt。
- 重读父 attachments。

可能的结果：

- Attachment 存在且校验和匹配：标记目标完成。
- 回执证明未变：如获允许，用有效句柄准备安全的残余 mutation。
- 状态仍未知：返回 `failed` 并要求手动/当前状态解决。

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

不安全的备选方案：

- 因未收到成功响应而重试；
- 再次上传相同字节；
- 假定本地 artifact 路径是 Zotero attachment；
- 附加到标题匹配。

## Curation 对话与记录模式

模糊请求：

> "清理"可能意味着几种不同更改。我将先生成每个目标的逐项前后提议，并保持实时 Zotero 状态不变。

破坏性请求：

> 此合并将删除一条记录并影响其 notes 与 attachments。请确认精确的幸存者与所列子项处理方式。

部分结果：

> 六项变更已实时核实，一项被拒，一项仍未知。残余提案排除六个已核实的成功。

未知结果：

> 调用可能已到达 Zotero。在考虑任何重试前，我会检查持久 receipt 与当前目标。

每条 curation 决策记录都应保留：

- 目标 ref；
- 之前状态；
- 期望状态；
- 修正证据；
- 语义更改类型；
- 破坏性后果；
- 批次身份；
- 预览；
- 当前权限；
- operation/apply 回执；
- 实时后状态；
- 残余 delta。

保持提议 artifact、业务结果与实时 Zotero 状态相互独立。提议描述意图，结果描述已验证执行，只有实时读取证明当前状态。
