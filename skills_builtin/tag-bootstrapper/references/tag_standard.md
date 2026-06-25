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
- `status:` 阅读与加工状态（工作流主轴）
- `match_status:` 文献↔研究笔记匹配状态

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
- `status:`
- `match_status:`
- `ai_task:`（尽量固定）
- `model:`（尽量固定，必要时扩展）
- `tool:`（只收你实际用的）

### 4.2 半受控（允许扩展，但要治理）
- `topic:`（允许扩展，但必须遵守命名规范；建议每月合并同义词）

### 4.3 每篇文献建议标签数量（可维护上限）
- `field:` 1–2
- `method:` 1–2
- `status:` 1（必打）
- `match_status:` 1（若启用）
- `topic:` 0–4（只标你会筛选的）
- `model:` 0–3（数值/AI 文献建议打）
- `ai_task:` 0–2（仅 AI 文献）
- `data:` 0–2（仅 AI/监测/数据驱动）
- `tool:` 0–2

---

## 5. 工作流（推荐执行）

### 5.1 新入库（inbox）流程
1) 入库后立即确保存在：
- `status:0-inbox`
- `match_status:unmatched`

2) 30 秒 triage：
- 补 `field:`（至少 1）
- 补 `method:`（至少 1；数值/AI 再补 `model:`）
- 明确对象的补 `topic:` 1–2 个
- 状态改为 `status:1-triaged` 或 `status:2-to-read`

### 5.2 阅读与提取
- 阅读中：`status:3-reading`
- 标注完成：`status:4-annotated`
- 要点已写入研究笔记：`status:5-extracted`
- 已被稿件引用：`status:6-cited`
- 建立笔记映射：`match_status:matched`（或 `partial` / `needs-review`）

---

## 6. 彩色标签（强烈推荐）
将 `status:*` 设置为彩色标签（最多 9 个）：
- `status:0-inbox`
- `status:2-to-read`
- `status:3-reading`
- `status:4-annotated`
- `status:5-extracted`
- `status:6-cited`
- `status:x-parked`

效果：列表里一眼可见处理进度；也便于键盘 1–9 快速打标。

---

## 7. 新增/修改 Tag 的治理流程（必须执行）

### 7.1 新增 tag 的优先级
允许新增（从容易到严格）：
1) `topic:`（你确实会用它筛选）
2) `tool:`（你确实使用的新工具）
3) `model:`（你的研究加入了重要模型/算法）
4) `method:`（新增重要方法族）

强烈不建议新增：
- `status:`（固定工作流）
- `match_status:`（保持少而稳）
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
- 排查遗漏：是否存在没有 `status:*` 或 `match_status:*` 的条目

---

## 9. 快速示例（按本规则写法）

### 9.1 隧道围岩-结构数值仿真
- `field:CE/UG/Tunnel`
- `field:CE/GT/Rock`
- `method:numerical/simulation`
- `model:FE`
- `model:MC`
- `tool:Abaqus`
- `status:2-to-read`
- `match_status:unmatched`

### 9.2 隧道衬砌病害视觉识别（CV/DL）
- `field:CE/UG/Tunnel`
- `field:CS/AI/CV`
- `topic:crack`
- `ai_task:segmentation`
- `model:DL/CNN`
- `data:image`
- `tool:PyTorch`
- `status:2-to-read`
- `match_status:unmatched`

### 9.3 隧道工程风险评估
- `field:MGMT/Risk/Assessment`
- `field:CE/UG/Tunnel`
- `method:risk/bayesian`
- `topic:risk-factor`
- `status:2-to-read`
- `match_status:unmatched`

---

## 10. 版本记录
- v2.0：引入“大写缩写注册表”、`field:` 三段式（一级/二级/方向）、合并 UG 与 Tunnel 体系；拆分为维护说明与受控词表两个文档。
- v1.0：初版发布。