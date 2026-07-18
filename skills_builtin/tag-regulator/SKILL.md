---
name: tag-regulator
description: Literature Tag Normalization Skill. Normalizes input tags input_tags into entries from a controlled vocabulary valid_tags, and can infer tags based on bibliographic metadata or literature digests, yielding tag suggestions suggest_tags that conform to the controlled vocabulary protocol. It can also operate in pure inference mode without providing valid_tags. Suitable for use with Zotero, but can also be applied to tag inference for any literature (as long as the original text can be converted to Markdown and directly supplied as digest_markdown).
metadata:
  author: joshua
  version: "0.1.0"
---

# Tag Regulator

## 目的

给定 prompt 内的 payload：

- `{{ input.metadata }}`：论文元数据（允许自由类型，只要语义明确即可，推荐：JSON/文本/bibtex-like）
- `{{ input.input_tags }}`：可选待规范的原始 tag 列表（字符串数组；缺失时按空数组处理）
- `{{ parameter.infer_tag }}`：是否启用 metadata/digest 驱动的补充推断（布尔语义；受控词表模式与纯推断模式的有效行为见下）
- `{{ parameter.valid_tags_format }}`：受控词表文件格式（`yaml|json|auto`），默认 `yaml`；仅在提供 `valid_tags` 时生效
- `{{ parameter.tag_note_language }}`：`suggest_tags[].note` 使用的语言（自由字符串，推荐 BCP 47，如 `zh-CN`/`en-US`）
- `{{ input.valid_tags }}`：可选受控词表文件路径；缺失或空值时进入纯推断模式
- `{{ input.digest_markdown }}`：可选 digest Markdown 文件路径（用于推断补充语义证据）

在 stdout 输出**且只能输出一个 JSON 对象**，描述：

- 需要从输入列表中移除哪些 tag（`remove_tags`；纯推断模式恒为空）
- 需要新增哪些受控 tag（`add_tags`；提供 `valid_tags` 时必须属于 `valid_tags`，纯推断模式恒为空）
- 需要建议哪些“已规范但未进入 `add_tags`”的 tag（`suggest_tags`，对象项含 `tag` 与 `note`）

这是一个 **Agent Skill**：核心工作依赖语义理解（同义、改写、隐含含义），脚本仅用于校验/格式化等辅助，不承担语义决策。
发布包内仅保留运行时必需脚本：

- `tag-regulator/scripts/validate_valid_tags.py`（提供 `valid_tags` 时，在执行开始阶段校验 `valid_tags`）
- `tag-regulator/scripts/normalize_output.py`（输出前做确定性收敛）

## 强约束（必须遵守）

1) 非交互：不得提问；遇到分歧/不确定性采用保守默认行为并完成运行。
2) stdout：**只输出一个 JSON 对象**（不得输出日志、解释、Markdown code fence 或多段 JSON）。
3) 输出 JSON 必须包含下列 key（即使为空也必须存在）：
   - `metadata`（回显；必须与输入一致，不得改写；缺失时使用 `null`）
   - `input_tags`（回显；必须与输入一致，不得改写；缺失时使用 `[]`）
   - `remove_tags`（数组；元素必须来自 `input_tags` 原始条目）
   - `add_tags`（数组；不重复；提供 `valid_tags` 时每个元素必须属于 `valid_tags`；纯推断模式必须为空）
   - `suggest_tags`（对象数组；每项必须包含 `tag`/`note` 字符串；按 `tag` 去重并稳定排序；提供 `valid_tags` 时 `tag` 不得属于 `valid_tags`）
   - `provenance.generated_at`（UTC ISO-8601 字符串，以 `Z` 结尾）
   - `warnings`（数组）
   - `error`（`object`，成功时用 `{}` 表示无错误）
4) 失败兜底：
   - `input_tags` 缺失时按 `[]` 处理；若已提供但不是字符串数组，则按输入非法失败。
   - 读取/解析已提供的 `{{ input.valid_tags }}` 失败（不可读/类型错误/编码异常/格式不符）时，必须返回 schema 兼容 JSON：
     - `remove_tags=[]`，`add_tags=[]`
     - `error` 为非空对象，至少包含 `{ "code": "...", "message": "..." }`
     - 仍需包含 `warnings`、`provenance.generated_at`，并在可用时回显 `metadata`/`input_tags`
   - `{{ input.valid_tags }}` 缺失或空值不是错误，必须进入纯推断模式并在成功时输出 `error={}`。
   - 若 `metadata`、可读非空 `digest_markdown`、`input_tags`、`valid_tags` 均缺失或为空，必须直接返回 `error.type="insufficient_input"` 的 schema 兼容 JSON。
5) 受控词表：
   - 提供 `valid_tags` 时，`add_tags ⊆ valid_tags` 为硬约束。
   - 提供 `valid_tags` 时，不在 `valid_tags` 但语义相关的候选 tag 只能进入 `suggest_tags`（先按命名规范归一化）。
   - 未提供 `valid_tags` 时，`remove_tags=[]` 且 `add_tags=[]` 为硬约束；所有候选只能进入 `suggest_tags`。
6) `tag_note_language` 作用域：
   - 仅影响 `suggest_tags[].note` 的语言表达；
   - 不得影响 `remove_tags`、`add_tags`、`suggest_tags[].tag`、`warnings`、`error` 的取值与决策逻辑。

## `infer_tag` 有效行为（必须遵守）

先判断可用语义证据：

- `input_tags` 非空：可作为语义证据。
- `metadata` 非空：可作为 metadata 推断证据。
- `digest_markdown` 可读且内容非空：可作为 digest 推断证据。
- `valid_tags` 存在且合法：可作为受控词表模式的规范化目标。

有效规则：

1) 若 `metadata`、可读非空 `digest_markdown`、`input_tags`、`valid_tags` 均缺失或为空 → 直接输出 `insufficient_input` 错误，不进入语义流程。
2) 受控词表模式下，`input_tags` 规范化始终执行（只要 `input_tags` 非空），不受 `infer_tag=false` 影响。
3) 受控词表模式下，若 `infer_tag` 可解释为 `false` → 仅禁用 metadata/digest 驱动的补充推断；不得禁用 `input_tags` 到 `valid_tags` 的规范化。
4) 受控词表模式下，若 `infer_tag` 可解释为 `true`，或未提供/无法解释且存在 metadata 或 digest 证据 → 启用 metadata/digest 补充推断。
5) 纯推断模式下，若存在任一语义证据（`input_tags`、metadata、digest），即使 `infer_tag=false` 也必须执行纯推断并输出可能的 `suggest_tags`；可在 `warnings` 记录已忽略该 false 值以避免 no-op。
6) `digest_markdown` 不可读或编码异常时不算可用证据，只记录 warning 后忽略。

## `tag_note_language` 默认与作用域（必须遵守）

1) 该参数是可选自由字符串（推荐 BCP 47 命名，如 `zh-CN`、`en-US`），不做严格语法校验。
2) 若未提供 `tag_note_language` 或无法从 `tag_note_language` 的语义中解析出语言意图，默认回退为 `zh-CN`。
3) 该参数只影响 `suggest_tags[].note`，不得影响其他字段和决策路径。

## Tag 命名规范（生成 `suggest_tags` 时必须应用）

遵循仓库中的规则（参考 `references/tag_standard.md`；提供受控词表时，词表内容以 `{{ input.valid_tags }}` 为准）：

- 统一格式：`facet:value` 或 `facet:path`（`facet` 永远小写）
- 层级使用 `/`（例如 `field:CE/UG/Tunnel`）
- 多词使用 `-`（例如 `topic:face-stability`）
- 注册缩写必须大写（例如 `DL`、`ML`、`CV`、`FE`、`MC`、`TBM`、`NATM`）
- 非缩写部分一律小写
- 详细规则参考 `references/tag_standard.md`

## Builtin workflow status 边界（必须遵守）

- Treat every `status:need-*` entry supplied by the plugin as a read-only reserved builtin.
- 五个插件内建 workflow status 已由插件在启动时写入 `valid_tags`；它们是合规词表项，保持原样，不需要也不允许由 Tag Regulator 创建或维护。
- Builtin workflow status tags must not enter `add_tags`, `remove_tags`, or `suggest_tags`。如果它们已经存在于 `input_tags`，不得删除、重命名、换 facet、废弃或映射为其他 tag。
- The model must not infer builtin workflow status from metadata, digest, topic, language, full text, attachment presence, or any other paper content. 只有宿主 workflow 生命周期或用户直接操作 Zotero 条目才能增删这些实例。
- 用户自定义的其他 `status:*` 仍是普通 tag；仅当其表达用户明确指定、稳定且不与 builtin 重复的业务流程时，才按普通受控词表规则处理。

## 职责边界

### LLM

- 负责同义表达、隐含含义、facet 选择和 tag 语义映射。
- 负责从 metadata、digest 与原始 tag 中保守推断具有长期检索价值的普通 tag。
- 必须执行上述 builtin workflow status 语义边界。

### Scripts

- `scripts/validate_valid_tags.py` 只负责受控词表格式与顶层字符串数组校验。
- `scripts/normalize_output.py` 只负责确定性的去重、顺序与输出整形。
- scripts 不做 tag 语义判断，也不复制插件 builtin status policy。

### Host workflow apply boundary

- 宿主从 `statusTags.getPolicy()` 获取 builtin 集合，并在正式写入 Zotero 条目前确定性过滤任何违规的 add/remove/suggest 输出。
- skill 不创建、修改或持久化受控词表定义。

## 执行流程

### Step 0：读取并校验 payload

- 若 `input_tags` 缺失，则按空数组处理并在输出中回显 `input_tags=[]`；若已提供，则必须是字符串数组。
- `metadata` 允许自由类型（JSON 对象、纯文本、bibtex-like 字符串均可）。
- 若提供 `{{ input.valid_tags }}` 文件路径，则确定 `valid_tags_format`（默认 `yaml`）并进入受控词表模式。
- 若 `{{ input.valid_tags }}` 缺失或空值，则进入纯推断模式：不读取受控词表、不调用 `validate_valid_tags.py`、不写入 `remove_tags` 或 `add_tags`。
- `digest_markdown` 为可选输入：缺失或空值时直接忽略；不可读/编码异常时记录 `warnings` 后忽略，不得触发失败兜底；可读但内容为空时不算可用语义证据。
- 若 `metadata`、可读非空 `digest_markdown`、`input_tags`、`valid_tags` 均缺失或为空 → 直接返回 `insufficient_input` 错误输出。
- 若 `input_tags` 已提供但非法，或在已提供 `{{ input.valid_tags }}` 时读取/解析/结构校验失败 → 按“失败兜底”直接返回错误输出。

#### valid_tags_format 解析规则（仅在提供 `valid_tags` 时适用）

- 默认 `valid_tags_format=yaml`。
- 支持：`yaml|json|auto`。**（不支持 markdown / txt 这类无结构约束的文本文件，因为当文件损坏时容易形成误解析，导致产出错误，污染 tag）**
- 当 `valid_tags_format` 为 `yaml|json` 且解析失败：**不得尝试其它格式，直接失败兜底（返回 `error`）**。
- 当且仅当 `valid_tags_format=auto`（显式指定）时，才允许按 `yaml -> json` 顺序尝试；并在 `warnings` 中记录最终采用的格式。

YAML（推荐）：

- 文件内容顶层为字符串列表，例如：
  - `- field:CS/AI/CV`

JSON：

- 文件内容顶层为字符串数组，例如：
  - `["field:CS/AI/CV", "model:DL/Transformer"]`

#### Step 0.5：运行时前置校验脚本（提供 `valid_tags` 时必须先执行）

- 若提供 `valid_tags`，在进入受控词表语义规范化前先调用：
  - `python tag-regulator/scripts/validate_valid_tags.py --valid-tags "{{ input.valid_tags }}" --format "<resolved_valid_tags_format>"`
- 脚本职责只有两件事：
  - 按允许格式（`yaml|json|auto`）解析 `valid_tags` 文件；
  - 断言解析结果是“顶层字符串数组”。
- 若脚本返回非 0：立即走“失败兜底”，不得进入后续语义流程。
- 若运行环境无法调用脚本：必须执行等价回退校验（按同样格式规则解析并断言“顶层字符串数组”）；回退失败同样直接兜底。
- 仅在前置校验成功后，才把解析结果作为 `valid_tags` 进入 Step 1。
- 若未提供 `valid_tags`，不得调用该脚本，直接进入纯推断模式。

### Step 1：确定运行模式

- **受控词表模式**（提供 `valid_tags`）：将 `valid_tags` 视为唯一允许写入 `add_tags` 的规范 tag 集合；做语义映射时，优先在 `valid_tags` 内寻找最佳匹配。
- **纯推断模式**（未提供 `valid_tags`）：不存在可写入 `add_tags` 的规范集合；`input_tags`、`metadata` 与可读非空 `digest_markdown` 只作为生成 `suggest_tags` 的证据；即使 `infer_tag=false` 也不得跳过该模式的推断。

### Step 2：对 `input_tags` 做语义驱动规范化

对 `input_tags` 中每个 tag `t`，选择以下一种处理：

1) **保持不变**（不产生变更）：
   - 若 `t` 与某个 `valid_tags` 条目完全相同，则对此 tag 不做任何处理。

2) **映射为受控 tag**：
   - 若 `t` 是某个受控 tag `v ∈ valid_tags` 的大小写/空格/标点变体或语义同义表达，则：
     - 将 `t` 放入 `remove_tags`
     - 将 `v` 放入 `add_tags`
   - 保守处理：仅在把握较高时才将 `v` 加入 `add_tags`。

3) **建议（不在受控词表中）**：
   - 若 `t` 表达的概念与任务相关，但无法映射到任何 `v ∈ valid_tags`，则：
     - 当 `t` 非标准/噪声/重复时，将 `t` 放入 `remove_tags`
     - 生成一个按命名规范归一化后的候选对象并放入 `suggest_tags`：
       - `tag`: 规范化候选 tag
       - `note`: 对 `tag` 语义的简明解释（语言由 `tag_note_language` 指定）
   - `suggest_tags` 用于后续词表治理；除非其已存在于 `valid_tags`，否则不得加入 `add_tags`。

4) **作为噪声移除**：
   - 若 `t` 与任务无关、格式异常或冗余，则将其放入 `remove_tags`。

纯推断模式下，对每个 `input_tags` 只作为语义证据处理：

- 不输出 `remove_tags`（保持 `remove_tags=[]`，避免在缺少受控目标时触发下游删除）。
- 不输出 `add_tags`（保持 `add_tags=[]`）。
- 若 `t` 可归一化为符合 `references/tag_standard.md` 的相关 tag，则将候选对象放入 `suggest_tags`。
- 明显无关或无法规范化的 `t` 直接忽略；必要时在 `warnings` 记录不确定性。

约束：

- `remove_tags` 中的元素必须严格从 `input_tags` 原始条目中选择（不得发明新字符串）。
- `add_tags` 不得重复；受控词表模式下每个元素必须属于 `valid_tags`，纯推断模式下必须为空。
- `suggest_tags[].tag` 不得重复；受控词表模式下不得包含任何已在 `valid_tags` 中的条目。

### Step 3：从 `metadata` / `digest_markdown` 推断 tag（若启用）

若启用推断，从以下字段（若存在）提取语义并推断候选 tag，优先级如下：

1) `title`
2) `abstract`
3) `keywords`
4) `conference_name`
5) `publication_title`
6) `digest_markdown`（仅当可读时，作为 metadata 之后的补充语义证据）

推断规则：

- 受控词表模式下，受控词表约束最高；`input_tags` 与 `metadata` 为主证据；可读非空 `digest_markdown` 可在 metadata 缺失或不足时补充任务/方法/模型语义并提升 `suggest_tags[].note` 质量。
- 受控词表模式下，推断结果必须优先映射到 `valid_tags`（即：只把受控词表支持的 tag 写入 `add_tags`）。
- 受控词表模式下，`digest_markdown` 不得绕过词表约束直接写入 `add_tags`。
- 纯推断模式下，不存在受控写入目标；所有推断候选必须归一化后写入 `suggest_tags`，不得写入 `add_tags`。
- 若某个概念很相关但不能进入 `add_tags`，则将其归一化后写入 `suggest_tags[].tag`，并生成对应 `suggest_tags[].note`。
- suggest_tags[].note **必须是简短的，直接的对于 `suggest_tags[].tag` 的语义描述，例如 `目标检测`、`DEtection TRansformer`、`端到端训练` 等，不需要对原因进行说明！不允许加入额外的描述！**
- suggest_tags[].note 如果是不适合翻译的专有概念（如 `Vision Transformer`、`Ground Truth`等），可以保留原文而不进行翻译。
- 受控词表模式下 `infer_tag=false` 时，必须忽略 metadata/digest 补充推断，但仍可执行 `input_tags` 规范化。
- 纯推断模式下 `infer_tag=false` 时，不得跳过基于 `input_tags`、metadata 或 digest 的建议生成。
- 若不确定，倾向于不添加，并在 `warnings` 中说明不确定性。

### Step 4：确定性输出整形（稳定排序）

输出需稳定、适合批处理自动化：

- `remove_tags`：按 `input_tags` 中出现顺序输出，并去重。
- `add_tags`：去重后按字典序排序。
- `suggest_tags`：按 `tag` 去重（同一 `tag` 多次出现时保留首个有效 `note`），并按 `tag` 字典序稳定排序。

### Step 4.5：运行时脚本调用时机（若可用）

- 在得到候选输出 JSON 后、最终写入 stdout 前，调用 `tag-regulator/scripts/normalize_output.py` 对输出进行收敛。
- 输入：候选输出 JSON（文件形式或等价内存对象）。
- 期望效果：`remove_tags` 顺序/去重一致，`add_tags` 去重并稳定排序，`suggest_tags` 按 `tag` 去重并稳定排序。
- 调用失败时不得中断主流程：记录一条 `warnings`，并执行“无脚本回退流程”。

### Step 4.6：无脚本回退流程（必须可执行）

当运行环境无法调用 `tag-regulator/scripts/normalize_output.py` 时，必须执行等价规则：

- `remove_tags`：按 `input_tags` 原始顺序过滤并去重。
- `add_tags`：去重后按字典序排序。
- `suggest_tags`：按 `tag` 去重（保留首个有效 `note`），再按 `tag` 字典序排序。

回退后仍必须满足全部契约：stdout 单 JSON、required keys 完整、受控词表模式下 `add_tags ⊆ valid_tags`、纯推断模式下 `add_tags=[]`、`remove_tags ⊆ input_tags`。

### Step 5：输出 JSON

输出且仅输出一个 JSON 对象，包含：

- required keys（全部必须存在）
- `provenance.generated_at` 为 UTC ISO-8601（例如 `2026-02-11T12:34:56Z`）
- `warnings`：描述不确定性或降级行为
- 成功时 `error={}`

## 输出 schema（required keys）

```json
{
  "metadata": {},
  "input_tags": [],
  "remove_tags": [],
  "add_tags": [],
  "suggest_tags": [{ "tag": "facet:value", "note": "explanation text" }],
  "provenance": { "generated_at": "YYYY-MM-DDTHH:MM:SSZ" },
  "warnings": [],
  "error": {}
}
```

## 示例（锚定示例）

### 示例 A：无变更（已受控；metadata 为空但 input_tags 仍可规范化）

输入 payload：

```json
{
  "metadata": {},
  "input_tags": ["status:need-analysis", "field:CE/UG/Tunnel"],
  "infer_tag": true,
  "valid_tags_format": "yaml",
  "valid_tags": "/abs/path/to/uploads/valid_tags"
}
```

- `valid_tags`:

```yaml
- status:need-analysis
- field:CE/UG/Tunnel
- ...
```

输出（stdout；仅 JSON）：

```json
{
  "metadata": {},
  "input_tags": ["status:need-analysis", "field:CE/UG/Tunnel"],
  "remove_tags": [],
  "add_tags": [],
  "suggest_tags": [],
  "provenance": { "generated_at": "2026-02-11T00:00:00Z" },
  "warnings": [],
  "error": {}
}
```

### 示例 B：同义/非标准写法规范化为受控 tag (JSON valid_tags 输入)

输入 payload：

```json
{
  "metadata": { "title": "Tunnel inspection with deep learning" },
  "input_tags": ["field:tunneling", "tool:pytorch"],
  "infer_tag": false,
  "valid_tags_format": "json",
  "valid_tags": "/abs/path/to/uploads/valid_tags"
}
```

- `valid_tags`:

```json
[
  "field:CE/UG/Tunnel",
  "tool:PyTorch"
]
```

输出：

```json
{
  "metadata": { "title": "Tunnel inspection with deep learning" },
  "input_tags": ["field:tunneling", "tool:pytorch"],
  "remove_tags": ["field:tunneling", "tool:pytorch"],
  "add_tags": ["field:CE/UG/Tunnel", "tool:PyTorch"],
  "suggest_tags": [],
  "provenance": { "generated_at": "2026-02-11T00:00:00Z" },
  "warnings": [],
  "error": {}
}
```

### 示例 C：推断新增受控 tag；不在词表中的概念进入建议

输入 payload：

```json
{
  "metadata": {
    "title": "Crack segmentation in tunnel linings using UNet",
    "keywords": ["tunnel", "crack", "segmentation", "vision transformer"]
  },
  "input_tags": ["topic:cracking", "backbone:vit"],
  "infer_tag": true,
  "tag_note_language": "zh-CN",
  "valid_tags_format": "yaml",
  "valid_tags": "/abs/path/to/uploads/valid_tags"
}
```

- `valid_tags`:

```yaml
- field:CE/UG/Tunnel
- topic:crack
- ai_task:segmentation
- model:DL/UNet
```

输出：

```json
{
  "metadata": {
    "title": "Crack segmentation in tunnel linings using UNet",
    "keywords": ["tunnel", "crack", "segmentation", "vision transformer"]
  },
  "input_tags": ["topic:cracking", "backbone:vit"],
  "remove_tags": ["topic:cracking", "backbone:vit"],
  "add_tags": ["ai_task:segmentation", "field:CE/UG/Tunnel", "model:DL/UNet", "topic:crack"],
  "suggest_tags": [
    {
      "tag": "model:DL/ViT",
      "note": "Vision Transformer"
    }
  ],
  "provenance": { "generated_at": "2026-02-11T00:00:00Z" },
  "warnings": ["推断具有启发式性质；如结果异常请人工复核"],
  "error": {}
}
```

### 示例 D：无 valid_tags 的纯推断模式

输入 payload：

```json
{
  "metadata": {
    "title": "Accelerating DETR Convergence via Semantic-Aligned Matching",
    "keywords": ["DETR", "transformer", "object detection"]
  },
  "input_tags": ["Transformer", "Object detection", "Training"],
  "infer_tag": true,
  "tag_note_language": "zh-CN"
}
```

输出：

```json
{
  "metadata": {
    "title": "Accelerating DETR Convergence via Semantic-Aligned Matching",
    "keywords": ["DETR", "transformer", "object detection"]
  },
  "input_tags": ["Transformer", "Object detection", "Training"],
  "remove_tags": [],
  "add_tags": [],
  "suggest_tags": [
    {
      "tag": "ai_task:detection",
      "note": "目标检测"
    },
    {
      "tag": "model:DL/DETR",
      "note": "DEtection TRansformer"
    },
    {
      "tag": "model:DL/Transformer",
      "note": "Transformer"
    }
  ],
  "provenance": { "generated_at": "2026-02-11T00:00:00Z" },
  "warnings": [],
  "error": {}
}
```

### 示例 E：无 valid_tags 且 infer_tag=false 仍执行纯推断

输入 payload：

```json
{
  "metadata": {
    "title": "Object detection with DETR"
  },
  "input_tags": [],
  "infer_tag": false,
  "tag_note_language": "zh-CN"
}
```

输出：

```json
{
  "metadata": {
    "title": "Object detection with DETR"
  },
  "input_tags": [],
  "remove_tags": [],
  "add_tags": [],
  "suggest_tags": [
    {
      "tag": "ai_task:detection",
      "note": "目标检测"
    },
    {
      "tag": "model:DL/DETR",
      "note": "DEtection TRansformer"
    }
  ],
  "provenance": { "generated_at": "2026-02-11T00:00:00Z" },
  "warnings": ["纯推断模式下已忽略 infer_tag=false，以避免无输出"],
  "error": {}
}
```

## 失败模式示例（锚定示例）

### 失败 A：已提供 `valid_tags` 但非法

输入 payload：

```json
{
  "metadata": {},
  "input_tags": ["topic:tunnel"],
  "valid_tags_format": "yaml",
  "valid_tags": "/abs/path/to/uploads/valid_tags"
}
```

- `valid_tags`:

```yaml
tags:
  - topic:tunnel
```

输出：

```json
{
  "metadata": {},
  "input_tags": ["topic:tunnel"],
  "remove_tags": [],
  "add_tags": [],
  "suggest_tags": [],
  "provenance": { "generated_at": "2026-02-11T00:00:00Z" },
  "warnings": [],
  "error": { "code": "invalid_input", "message": "`valid_tags` must parse as a top-level list of strings" }
}
```

### 失败 B：没有任何可用输入证据

输入 payload：

```json
{}
```

输出：

```json
{
  "metadata": null,
  "input_tags": [],
  "remove_tags": [],
  "add_tags": [],
  "suggest_tags": [],
  "provenance": { "generated_at": "2026-02-11T00:00:00Z" },
  "warnings": [],
  "error": { "code": "insufficient_input", "message": "No metadata, digest_markdown, input_tags, or valid_tags evidence was provided" }
}
```
