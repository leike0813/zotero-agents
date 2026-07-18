# Zotero Tag 维护说明（分面体系 + 受控词表 + 大写缩写规则）

> 目标：Collections 做项目管理；Tags 做学科/方向、方法/模型、以及状态管理。
> 本方案强调：**概念清晰、可扩展、可控词表、低噪音、易维护**。
> 特别规则：**鼓励缩写**；核心缩写 **必须大写**；其余内容 **小写**。

---

## 1. 分工边界

### 1.1 Collections（分类）= 项目管理（你已经决定的用法）
- 每个论文/报告/课题对应一个集合（或集合树）。
- 同一条文献可同时属于多个项目集合（复用）。
- Collections 不承担知识结构（学科、方法、状态）功能。

### 1.2 Tags（标签）= 知识与工作流管理
Tags 只用于下列维度（分面 / Facet）：
- `field:` 学科体系（一级学科/二级学科/方向）
- `topic:` 研究对象/问题域（中观）
- `method:` 研究方法/流程（怎么做）
- `model:` 模型/算法/本构（用什么）
- `ai_task:` AI 任务类型（仅 AI 文献）
- `data:` 数据类型/模态（仅 AI/监测/数据驱动类）
- `tool:` 工具/平台/框架
- `status:` workflow 待办状态

---

## 2. 命名规范（强制）

### 2.1 统一格式
- 统一用：`facet:path` 或 `facet:value`
- `facet`（冒号前）**永远小写**：`field:`, `topic:`, `method:`…
- 层级用 `/`：`field:CE/UG/TBM`
- 多词用 `-`：`topic:face-stability`

### 2.2 大小写规则（本方案的关键）
**规则 A：核心缩写（在“缩写注册表”里的）必须大写。**
例如：`AI`, `DL`, `ML`, `CV`, `FE`, `DEM`, `MC`, `TBM`, `NATM`, `AHP` 等。

**规则 B：非缩写部分一律小写。**
例如：`topic:rockburst`, `topic:groundwater`, `method:risk/bayesian`。

**规则 C：鼓励缩写优先。**
- 优先用 `field:CE/UG/Tunnel` 而不是 `field:civil/underground-engineering/tunneling`
- 优先用 `model:FE`, `model:MC` 而不是 `model:fe`, `model:mc`

> 缩写注册表见《受控词表》文档；新增缩写必须走治理流程（第 7 节）。

### 2.3 禁止项
- 禁止空格（避免同义重复/导出不稳）
- 禁止散装状态标签（如 `todo`, `read`）；必须用 `status:*`
- 禁止“同义并存”：如 `DL` 与 `deep-learning` 同时出现
- 禁止随意造 `field:`（学科体系最严格）

---

## 3. Field（学科体系）组织规则：一级/二级/方向

### 3.1 `field:` 的定义
`field:` 用于回答：**“这篇文献属于哪个学科体系？”**
每篇文献至少 1 个 `field:`（最多 2 个，用于交叉学科）。

### 3.2 学科体系结构（统一三段式）
统一结构为：

- `field:<一级>/<二级>/<方向>`（方向可省略，但尽量给到二级）

例如：
- `field:CE/UG/Tunnel`
- `field:CS/AI/CV`
- `field:MGMT/Risk/Assessment`

### 3.3 “包含关系合并”的原则（你提出的 tunneling/underground 合并）
- `UG`（Underground Engineering）作为二级学科
- `Tunnel` 作为 `UG` 下的方向
因此不再保留 `field:tunneling` 这种并列根节点写法。

---

## 4. 受控词表与自由度策略（防止 tag 爆炸）

### 4.1 严格受控（强约束）
以下分面应尽量枚举、不要随意新增：
- `field:`（最严格）
- `status:`（五个 builtin 由插件维护；自定义项必须具有明确、持久的业务语义）
- `ai_task:`（尽量固定）
- `model:`（尽量固定，必要时扩展）
- `tool:`（只收你实际用的）

### 4.2 半受控（允许扩展，但要治理）
- `topic:`（允许扩展，但必须遵守命名规范；建议每月合并同义词）

### 4.3 每篇文献建议标签数量（可维护上限）
- `field:` 1–2
- `method:` 1–2
- `status:` 0 或多个
- `topic:` 0–4（只标你会筛选的）
- `model:` 0–3（数值/AI 文献建议打）
- `ai_task:` 0–2（仅 AI 文献）
- `data:` 0–2（仅 AI/监测/数据驱动）
- `tool:` 0–2

---

## 5. Workflow 状态（插件内建）

### 5.1 `status:` 的定义
`status:` 用于表示尚待 workflow 完成的工作，不是阅读进度轴。一篇文献可以有零个或多个 `status:*`，多个待办状态可以同时存在。

插件启动时会主动初始化以下五个受控词表定义，用户不需要运行 Tag Bootstrapper：

- `status:need-metadata-curation`
- `status:need-fulltext`
- `status:need-markdown`
- `status:need-analysis`
- `status:need-deep-reading`

### 5.2 builtin 定义与文献标签实例的边界
- 五个 builtin 的词表定义只由插件 builtin policy 创建和维护。
- Tag Bootstrapper 和 Tag Regulator 不得创建、删除、重命名、换 facet、废弃或替换这些定义。
- builtin 的 note 和 aliases 仍通过插件现有词表治理入口维护。
- 对文献条目上 builtin 标签实例的增删，只能由对应 workflow 生命周期或用户直接操作完成。
- Tag Bootstrapper 不得把 builtin 输出到 `add_tags`；Tag Regulator 不得把 builtin 输出到 `add_tags`、`remove_tags` 或 `suggest_tags`。
- 不得根据论文主题、语言、元数据、摘要或正文推断 builtin workflow status。

---

## 6. 自定义 `status:` 的使用原则
- 用户可以新增具有明确、持久业务语义的自定义 `status:*`，但不得重复五个 builtin 的含义。
- 自定义 status 是普通受控词表项，可以按现有治理规则新增、修改和删除。
- 不得因为文献没有 `status:*` 就把它视为遗漏；零个状态表示当前没有由该 facet 表达的 workflow 待办。
- 不使用 `status:` 表达阅读中、已标注、已摘录、已引用等人工阅读进度。

---

## 7. 新增/修改 Tag 的治理流程（必须执行）

### 7.1 新增 tag 的优先级
允许新增（从容易到严格）：
1) `topic:`（你确实会用它筛选）
2) `tool:`（你确实使用的新工具）
3) `model:`（你的研究加入了重要模型/算法）
4) `method:`（新增重要方法族）
5) 自定义 `status:`（用户明确提出了稳定业务流程，且不与 builtin 重复）

强烈不建议新增：
- `field:`（最严格：新增前需评估学科体系是否真的扩展）

### 7.2 新增 tag 的步骤
1) 查重：是否已有同义 tag（大小写、拼写变体都算）
2) 按命名规范拟定新 tag（含大写缩写规则）
3) 在《受控词表》登记（新增条目 + 简短定义 + 示例）
4) 试运行：只在 3–10 篇文献上使用
5) 一周后复盘：没检索价值就撤回并合并/删除

---

## 8. 维护巡检（建议每月一次）
- 清理不规范大小写（如 `dl` 应改为 `DL`）
- 合并同义 `topic:`（例如 `topic:cracking` vs `topic:crack`）
- 检查 `field:` 是否被滥造（必须收敛）
- 检查自定义 `status:` 是否具有持续业务价值，是否与 builtin 重复
- 审计时将五个 builtin 视为合规保留项，不向文献添加或从文献删除

---

## 9. 快速示例（按本规则写法）

以下示例只展示可从文献主题与内容判断的知识标签；workflow status 由宿主实际调度或完成情况决定，不从这些示例推断。

### 9.1 隧道围岩-结构数值仿真
- `field:CE/UG/Tunnel`
- `field:CE/GT/Rock`
- `method:numerical/simulation`
- `model:FE`
- `model:MC`
- `tool:Abaqus`

### 9.2 隧道衬砌病害视觉识别（CV/DL）
- `field:CE/UG/Tunnel`
- `field:CS/AI/CV`
- `topic:crack`
- `ai_task:segmentation`
- `model:DL/CNN`
- `data:image`
- `tool:PyTorch`

### 9.3 隧道工程风险评估
- `field:MGMT/Risk/Assessment`
- `field:CE/UG/Tunnel`
- `method:risk/bayesian`
- `topic:risk-factor`
