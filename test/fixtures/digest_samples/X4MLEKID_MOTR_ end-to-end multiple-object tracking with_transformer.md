## TL;DR

MOTR 提出一种端到端的在线多目标跟踪框架，把 MOT 从“检测后关联”的两阶段流程改写为“集合的序列预测”（set of sequence prediction）。

核心是把 DETR 的 object query 扩展为可跨帧传递与迭代更新的 track query：每个 track query 表示一条轨迹的隐藏状态，并在每一帧通过 Transformer 解码器与当前帧特征交互来更新，再直接回归该帧目标框。

为解决“一个 query 对应一条轨迹”与“目标出生/消失”问题，MOTR 引入 tracklet-aware label assignment（TALA），将 detect query 只匹配新生目标（newborn-only），track query 继承上一帧的一致指派（target-consistent），并配合 entrance/exit 机制动态维护可变长度的 track query 集合。

在时序建模上，论文提出 query interaction module（QIM）与 temporal aggregation network（TAN），通过聚合 track query 的历史状态增强长期运动/外观建模；训练端提出 collective average loss（CAL），以多帧 clip 为训练样本并在 clip 级别汇总归一化损失，缓解仅两帧训练导致的长程运动学习不足。

实验显示 MOTR 在 DanceTrack 上显著优于 ByteTrack：HOTA 提升约 6.5 个百分点（并在 AssA 上也有明显提升）；在 MOT17 上更突出的是关联/身份一致性指标（如 IDF1、IDS）表现，但 MOTA 仍受新生目标检测能力制约。

实现基于 Deformable DETR + ResNet-50，输入分辨率短边 800、长边最多 1536，V100 上约 7.5 FPS；训练使用 5 帧 clip（并采用逐步增大 clip 长度的策略）、AdamW，以及初始化自 COCO 预训练权重。

论文也指出两点主要局限：detect query 对新生目标的检测仍不够强；以及逐帧的 query 传递/更新方式在训练效率与并行化上存在限制。

## 研究问题与贡献

- 问题：传统 MOT 依赖基于外观/运动的相似度启发式与后处理匹配，导致时序信息难以端到端地在序列中流动与优化。

- 贡献 1：提出 MOTR，把多目标跟踪建模为 set-of-sequence prediction，用 track query 表示轨迹隐藏状态并跨帧迭代预测。

- 贡献 2：提出 TALA（newborn-only + target-consistent）与 entrance/exit 机制，使得推理阶段不再需要显式的 IoU matching、track NMS 等关联后处理。

- 贡献 3：提出 TAN 与 CAL，分别从“历史状态聚合”和“多帧训练/损失汇总”增强时序关系学习。

- 贡献 4：在 DanceTrack 与 MOT17 等数据集上给出系统实验与消融，展示端到端 Transformer 跟踪的可行基线。

## 方法要点

- Query 设计：同时使用固定长度的 learnable detect queries（负责新生目标）与动态维护的 track queries（负责已跟踪目标）。

- TALA 指派：detect queries 只与新生目标做二分图匹配；track queries 的指派由上一帧继承并与新生目标的指派拼接，避免“同一 query 在不同帧监督不同 ID”。

- 动态轨迹集合：通过 QIM 的 entrance/exit 规则（阈值 τ_en/τ_ex 与连续 M 帧判定）实现轨迹进入与退出。

- TAN：在 QIM 内引入改造的 Transformer 解码层，将上一帧 track query 与当前帧过滤后的 hidden states 做聚合，强化历史信息注入。

- CAL：以 N 帧 clip 为单位收集预测与匹配结果，在 clip 级别计算并按对象数归一化损失；单帧损失由分类（focal loss）+ L1 + GIoU 组成。

- 训练技巧：随机关键帧间隔采样应对可变帧率；以 p_drop 擦除 track queries 增加新生样本，以 p_insert 插入假阳性 track queries 模拟目标终止。

## 关键结果

- DanceTrack：MOTR 在 HOTA 上达到 54.2，并显著超过 ByteTrack（47.7），对应约 +6.5 个百分点的 HOTA 增益；AssA 等关联指标同样更强。

- MOT17：相较 TransTrack/TrackFormer，MOTR 在 HOTA 与 IDF1 等更偏关联的指标上更优，并显著降低 IDS；但论文也观察到其 MOTA 仍可能弱于检测更强的路线。

- BDD100k（多类别场景泛化）：在验证集上 mMOTA 达到 32.0。

- 消融：引入 track query 后 IDF1 从极低水平跃升；在此基础上叠加 TAN 与 CAL 可进一步显著提升 MOTA/IDF1 并减少 IDS，说明“历史聚合 + 多帧训练”对时序学习关键。

## 局限与可复现性线索

- 局限：新生目标检测仍是短板（detect query 会被对已跟踪目标的响应所抑制）；逐帧 query passing 限制训练并行效率。

- 复现线索：代码仓库在论文中给出；实现基于 Deformable DETR + ResNet-50，输入短边 800、最大边 1536；训练使用 AdamW（2e-4），batch size=1（每 batch 为 5 帧 clip），并从 COCO 预训练权重初始化；clip 长度在训练中逐步从 2 增到 5。

- 超参敏感性：p_drop、p_insert、τ_en/τ_ex 与采样 interval 会影响 IDS/MOTA；论文提供了对应消融与经验取值（如 p_drop≈0.1、p_insert≈0.3 在其设置下较优）。

## 分章节总结

### Abstract

- 将 MOT 的难点归结为时序建模与端到端优化的缺失，提出 track query、TALA、TAN、CAL 作为关键组件。

- 强调在 DanceTrack 上对 ByteTrack 的显著提升，以及在 MOT17 上更强的关联表现。

### 1 Introduction

- 回顾传统 MOT 以外观相似度与运动启发式做后处理关联，指出其阻断了跨帧的端到端时序信息流。

- 以 DETR 的 set prediction 与迭代式解码类比，提出把 MOT 视为“集合的序列预测”，用 track query 表示轨迹隐藏状态并逐帧更新。

### 2 Related Work

- 总结 Transformer 在多领域（语音、视觉）与多任务（检测、分类、视频分割）中的发展脉络，并重点回顾 DETR/Deformable DETR 的端到端检测范式。

- 梳理 MOT 的 tracking-by-detection 主流路线（SORT/DeepSORT/Tracktor 等）以及联合检测与 Re-ID 的发展，并对 Transformer-based MOT（TransMOT、TransTrack、TrackFormer）进行定位。

- 通过 seq2seq/迭代预测相关工作引出“隐藏状态迭代更新生成序列”的思想，为 track query 的设计提供动机。

### 3 Method（总体）

- 用 detect query 负责新生目标、track query 负责已跟踪目标，并通过在解码器中拼接两类 query 完成统一的端到端预测。

### 3.2 Detect Query 与 Track Query

- track query 集合在时间上可变：新生目标的 hidden states 会生成下一帧的 track queries；终止目标对应的 track queries 会被移除。

### 3.3 Tracklet-Aware Label Assignment（TALA）

- detect queries：仅与新生目标做 bipartite matching（newborn-only），避免与已跟踪目标竞争。

- track queries：继承上一帧的一致指派（target-consistent），实现“一个 track query 对应同一 ID 的整段轨迹监督”。

### 3.4–3.5 架构、QIM 与 TAN

- 架构基于 CNN backbone + Deformable DETR 编码器/解码器；每帧输出的 hidden states 同时用于框预测与生成下一帧的 track queries。

- QIM 使用 entrance/exit 规则过滤与更新 track query 集合；TAN 在此基础上聚合上一帧 track query 与当前帧 hidden states，注入历史信息。

### 3.6 Collective Average Loss（CAL）

- 采用多帧 clip 训练，损失在 clip 级别汇总并按对象数归一化，增强长程运动学习并减少遮挡场景中的重复框与 ID switch。

### 3.7 Discussion（与并行工作对比）

- 对比 TransTrack 将跟踪分解为短 tracklet 并依赖 IoU-matching 的两阶段思想；以及 TrackFormer 仍较依赖短期训练与额外启发式过滤。

- 强调 MOTR 借助 CAL/TAN 增强时序学习，从而减少对 NMS、Re-ID 等后处理依赖。

### 4 Experiments

#### 4.1 数据集与指标

- 在 DanceTrack、MOT17、BDD100k 上评估；指标涵盖 HOTA/AssA/DetA、MOTA、IDF1、IDS 等。

#### 4.2 实现细节

- 数据增广包括随机翻转/裁剪；短边 800、最大边 1536；V100 上约 7.5 FPS。

- 基于 Deformable DETR（COCO 预训练）训练，并逐步增大 clip 长度；通过 p_drop/p_insert 与随机采样 interval 构造更丰富的出生/终止样本。

#### 4.3 MOT17 对比

- 相对 Transformer-based 方法在 HOTA/IDF1 等关联指标上更强，并减少 IDS；同时论文承认其在 MOTA 上可能不如检测更强的方法，提示新生目标检测仍是瓶颈。

#### 4.4 DanceTrack 对比

- 在外观相似、运动多样的场景下体现端到端时序建模优势：HOTA=54.2，显著超过 ByteTrack（47.7）。

#### 4.5 多类别场景泛化（BDD100k）

- 在多类别 MOT 设定下取得更高的 mMOTA，并展示一定泛化能力。

#### 4.6 消融

- 逐步加入 track query、TAN、CAL 带来稳定增益，并分析 p_drop/p_insert、阈值与采样 interval 对 IDS/MOTA 的影响。

### 5 Limitations

- 指出新生目标检测不足与逐帧 query passing 的训练效率限制，作为后续研究方向。