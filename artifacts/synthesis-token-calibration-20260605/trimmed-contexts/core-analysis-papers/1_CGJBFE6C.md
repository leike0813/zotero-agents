# Enhancing DETRs variants through improved content query and similar query aggregation (2024)

- Paper ref: 1:CGJBFE6C
- Title: Enhancing DETRs variants through improved content query and similar query aggregation
- Year: 2024

## Filtered Digest

#### TL;DR

- DETR 及其变体的 object query 由位置查询（positional）与内容查询（content）组成，但多数工作将内容查询初始化为全零或可学习向量，缺少与输入图像相关的“内容先验”，导致第一层 decoder cross-attention 聚焦不稳、训练收敛变慢。

- 本文提出可插拔的 Self-Adaptive Content Query（SACQ） ：从 encoder 特征中用自注意力池化生成内容查询，使每个 query 的内容部分随图像自适应，第一层 decoder 即能更好覆盖目标区域。

- SACQ 由两段组成：全局池化用于初始化第一层内容查询；从第二层开始，再利用上一层预测框做 RoI-Align 获取局部特征，并用共享参数的局部池化模块逐层增强内容查询。

- 由于 SACQ 让多个 query 更容易产生“高度相似且高质量”的候选框，传统 Hungarian one-to-one matching 会只奖励其中一个并抑制其余，带来正样本利用率低与训练不稳定。

- 为此本文提出 Similar Query Aggregation（QA） ：在 set matching 之前合并相似候选（基于类别分布的对称 KL 与预测框 IoU），以减少“相似高质量候选互相抑制”的震荡。

- 在 COCO 2017 验证集上，方法在 6 个 DETR 变体（Deformable-DETR / SAM-DETR / SAP-DETR / DAB-DETR / DN-DETR / DINO）上普遍带来提升，平均增益 > 1.0 AP。

- 典型结果：Deformable-DETR 在 iterative refinement / two-stage 配置下分别提升约 +1.5 / +1.1 AP；DN-DETR（12 epoch）提升约 +1.3 AP；DINO 增益较小（约 +0.4 AP）。

- 代价方面：加入 SACQ+QA 会增加训练时长并降低推理 FPS；QA 的 IoU 阈值较敏感（过小会误合并非同一目标候选导致性能回落）。

#### 研究问题与贡献

- 问题：现有 DETR 变体多聚焦位置查询设计与匹配策略， 内容查询 常被忽视（零初始化/learnable embedding），缺乏输入先验。

- 贡献 1：提出 SACQ （plug-and-play），用 encoder 特征自适应生成内容查询（全局初始化 + 局部逐层增强）。

- 贡献 2：提出与 SACQ 协同的 QA ，在 Hungarian matching 前合并相似候选，缓解 one-to-one 造成的候选抑制与优化不稳定。

- 贡献 3：在多种 DETR 变体与配置上系统验证有效性，并给出注意力可视化与阈值敏感性分析。

#### 方法要点

- Query 拆分：object query = content query $Q^c$ + positional query $Q^p$；本文强调仅改进 $Q^c$，不改变各变体的 $Q^p$ 语义。

- SACQ 核心模块 SAPM：

- AMP（多层卷积）生成每个 query 的注意力图 $A\in\mathbb{R}^{q\times h\times w}$；

- WP 用 $A$ 做空间加权池化得到 query 级特征；

- CR（参考通道重标定思想）进一步强化通道选择性。

- 全局初始化：encoder 输出特征 $F^E$ 经全局 SAPM 得到第一层 decoder 的初始 $Q_0^c$，为 cross-attention 提供对象相关内容先验。

- 局部逐层增强：从第 2 层起，利用上一层预测框做 RoI-Align 得到局部特征，再经局部 SAPM 产生增量并与当前内容查询相加，实现“step-by-step content query refinement”。

- QA（相似查询聚合）：

- 类别相似度：对类别分布 $p_i,p_j$ 计算对称 KL（$KL(p_i\|\|p_j)+KL(p_j\|\|p_i)$）；

- 框相似度：$IoU(B_i,B_j)$；

- 以阈值 $t_c,t_b$ 判定合并，将多个相似高质量候选合并后再做 Hungarian matching。

#### 关键结果

- 跨 6 个 DETR 变体整体提升，说明“内容查询优化”与既有“位置查询/匹配改进”多数是正交可叠加的。

- 消融：全局内容初始化（SACQ-Global）带来最显著增益；局部增强与 CR 模块进一步提升；QA 的类别阈值影响较小，但 IoU 阈值 对性能更敏感。

- 讨论：用 RoI-Align 特征直接替代 SACQ 的初始化会下降（示例：two-stage Deformable-DETR 上约 -1.1 AP），原因包括第一阶段框质量与 RoI 特征混入背景。
