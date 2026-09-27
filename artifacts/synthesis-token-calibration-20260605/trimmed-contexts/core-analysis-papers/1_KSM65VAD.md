# MOTR: end-to-end multiple-object tracking with transformer (2022)

- Paper ref: 1:KSM65VAD
- Title: MOTR: end-to-end multiple-object tracking with transformer
- Year: 2022

## Filtered Digest

#### TL;DR

MOTR 提出一种端到端的在线多目标跟踪框架，把 MOT 从“检测后关联”的两阶段流程改写为“集合的序列预测”（set of sequence prediction）。

核心是把 DETR 的 object query 扩展为可跨帧传递与迭代更新的 track query：每个 track query 表示一条轨迹的隐藏状态，并在每一帧通过 Transformer 解码器与当前帧特征交互来更新，再直接回归该帧目标框。

为解决“一个 query 对应一条轨迹”与“目标出生/消失”问题，MOTR 引入 tracklet-aware label assignment（TALA），将 detect query 只匹配新生目标（newborn-only），track query 继承上一帧的一致指派（target-consistent），并配合 entrance/exit 机制动态维护可变长度的 track query 集合。

在时序建模上，论文提出 query interaction module（QIM）与 temporal aggregation network（TAN），通过聚合 track query 的历史状态增强长期运动/外观建模；训练端提出 collective average loss（CAL），以多帧 clip 为训练样本并在 clip 级别汇总归一化损失，缓解仅两帧训练导致的长程运动学习不足。

实验显示 MOTR 在 DanceTrack 上显著优于 ByteTrack：HOTA 提升约 6.5 个百分点（并在 AssA 上也有明显提升）；在 MOT17 上更突出的是关联/身份一致性指标（如 IDF1、IDS）表现，但 MOTA 仍受新生目标检测能力制约。

实现基于 Deformable DETR + ResNet-50，输入分辨率短边 800、长边最多 1536，V100 上约 7.5 FPS；训练使用 5 帧 clip（并采用逐步增大 clip 长度的策略）、AdamW，以及初始化自 COCO 预训练权重。

论文也指出两点主要局限：detect query 对新生目标的检测仍不够强；以及逐帧的 query 传递/更新方式在训练效率与并行化上存在限制。

#### 研究问题与贡献

- 问题：传统 MOT 依赖基于外观/运动的相似度启发式与后处理匹配，导致时序信息难以端到端地在序列中流动与优化。

- 贡献 1：提出 MOTR，把多目标跟踪建模为 set-of-sequence prediction，用 track query 表示轨迹隐藏状态并跨帧迭代预测。

- 贡献 2：提出 TALA（newborn-only + target-consistent）与 entrance/exit 机制，使得推理阶段不再需要显式的 IoU matching、track NMS 等关联后处理。

- 贡献 3：提出 TAN 与 CAL，分别从“历史状态聚合”和“多帧训练/损失汇总”增强时序关系学习。

- 贡献 4：在 DanceTrack 与 MOT17 等数据集上给出系统实验与消融，展示端到端 Transformer 跟踪的可行基线。

#### 方法要点

- Query 设计：同时使用固定长度的 learnable detect queries（负责新生目标）与动态维护的 track queries（负责已跟踪目标）。

- TALA 指派：detect queries 只与新生目标做二分图匹配；track queries 的指派由上一帧继承并与新生目标的指派拼接，避免“同一 query 在不同帧监督不同 ID”。

- 动态轨迹集合：通过 QIM 的 entrance/exit 规则（阈值 τ_en/τ_ex 与连续 M 帧判定）实现轨迹进入与退出。

- TAN：在 QIM 内引入改造的 Transformer 解码层，将上一帧 track query 与当前帧过滤后的 hidden states 做聚合，强化历史信息注入。

- CAL：以 N 帧 clip 为单位收集预测与匹配结果，在 clip 级别计算并按对象数归一化损失；单帧损失由分类（focal loss）+ L1 + GIoU 组成。

- 训练技巧：随机关键帧间隔采样应对可变帧率；以 p_drop 擦除 track queries 增加新生样本，以 p_insert 插入假阳性 track queries 模拟目标终止。

#### 关键结果

- DanceTrack：MOTR 在 HOTA 上达到 54.2，并显著超过 ByteTrack（47.7），对应约 +6.5 个百分点的 HOTA 增益；AssA 等关联指标同样更强。

- MOT17：相较 TransTrack/TrackFormer，MOTR 在 HOTA 与 IDF1 等更偏关联的指标上更优，并显著降低 IDS；但论文也观察到其 MOTA 仍可能弱于检测更强的路线。

- BDD100k（多类别场景泛化）：在验证集上 mMOTA 达到 32.0。

- 消融：引入 track query 后 IDF1 从极低水平跃升；在此基础上叠加 TAN 与 CAL 可进一步显著提升 MOTA/IDF1 并减少 IDS，说明“历史聚合 + 多帧训练”对时序学习关键。
