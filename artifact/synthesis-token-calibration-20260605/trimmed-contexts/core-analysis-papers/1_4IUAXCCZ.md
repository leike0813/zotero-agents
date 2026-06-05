# Joint perceptual learning for enhancement and object detection in underwater scenarios (2023)

- Paper ref: 1:4IUAXCCZ
- Title: Joint perceptual learning for enhancement and object detection in underwater scenarios
- Year: 2023

## Filtered Digest

#### TL;DR

- 这篇论文提出 DETR（DEtection TRansformer），把目标检测重新表述为“直接集合预测”问题，而不是先生成 proposal、anchor 或中心点再做分类/回归。

- 方法核心有两个：一是基于 Hungarian matching 的集合损失，用一对一匹配强制预测去重；二是 CNN + Transformer 编码器-解码器架构，用固定数量的 object queries 并行输出检测结果。

- 与当时主流检测器相比，DETR 的最大卖点不是单点指标碾压，而是训练与推理范式的统一化：不需要 anchor 设计、不需要 NMS、不需要定制化 detection head。

- 在 COCO 上，ResNet-50 版本的 DETR 达到 42.0 AP，DETR-DC5 达到 43.3 AP，ResNet-101 + DC5 达到 44.9 AP；整体与强调参的 Faster R-CNN 基线相当。

- 它的性能特征非常鲜明：大目标效果明显更强， AP_L 达到 61.1/62.3，但小目标仍然偏弱，说明全局建模优势并没有自动解决尺度问题。

- 训练策略与传统检测器差异很大：使用 AdamW、超长训练（300/500 epochs）、随机裁剪增强、辅助解码损失，以及对“no object”槽位的特殊处理；这也是其复现实验时最需要关注的部分。

- 论文还把同一设计延伸到 panoptic segmentation，只需在 DETR 上增加一个 mask head，就能用统一框架同时处理 thing 与 stuff，并在 COCO panoptic 上达到有竞争力的 PQ。

- 消融结果表明，encoder 的全局自注意力、多层 decoder、FFN、位置编码都不是可有可无的装饰；去掉这些模块会明显损伤 AP 或去重能力。

- 从研究意义看，DETR 的真正贡献是把“检测系统工程”中的大量手工先验换成集合损失与全局注意力，从而打开后续 query-based detection 一整条路线。

- 局限同样明确：小目标弱、训练慢、DC5 计算代价高，而且论文中的性能可比性建立在更长训练与特殊优化配方之上。

#### 研究问题与贡献

- 研究问题：能否把目标检测从 proposal/anchor 驱动的代理任务，改写为端到端的集合预测任务。

- 方法贡献：提出 Hungarian matching 驱动的 set loss，使每个真实目标只匹配一个预测，从训练目标上消除重复框问题。

- 架构贡献：用标准 CNN backbone + Transformer encoder-decoder + object queries 构成检测器，不再依赖 NMS、anchor 生成或定制算子。

- 实证贡献：在 COCO 上取得与强 Faster R-CNN 基线相当的 AP，同时在大目标上显著更强，并展示对 panoptic segmentation 的自然扩展性。

- 方法论贡献：证明 query-based、set-based、end-to-end 的检测设计是可行的，为后续大量 Transformer 检测器奠定范式基础。

#### 方法要点

- 固定输出槽位：decoder 一次性输出长度为 N 的预测集合， N 远大于常见图像中的目标数，多余槽位学习输出 no object 。

- 匹配机制：先用 Hungarian algorithm 求预测集合与真实集合的一对一最优匹配，再仅对匹配结果计算分类与框回归损失。

- 匹配代价：由类别概率与框相似度共同构成；框损失由 L1 + generalized IoU 线性组合实现，兼顾绝对误差与尺度不变性。

- 编码器：CNN 产出低分辨率特征图，经 1x1 conv 降维后展平为序列，再加位置编码输入 Transformer encoder。

- 解码器：使用一组可学习的 object queries 作为查询，借助 self-attention 和 encoder-decoder attention 从全局图像上下文中检索对象。

- 预测头：共享 FFN 直接输出类别与归一化框坐标；每层 decoder 还接辅助损失以稳定训练并帮助模型学习对象个数。

- 设计哲学：把“去重、分配、结构约束”尽量交给集合损失和全局注意力，而不是后处理规则或手工先验。

#### 关键结果

- COCO 检测：ResNet-50 DETR 为 42.0 AP，DETR-DC5 为 43.3 AP，DETR-R101 为 43.5 AP，DETR-DC5-R101 为 44.9 AP。

- 效率特征：基础 DETR 约 86 GFLOPS / 28 FPS / 41M 参数，参数量与 Faster R-CNN-FPN 接近，但计算路径更简单。

- 尺度表现：DETR 的核心优势在大目标， AP_L 相比同规模 Faster R-CNN 有明显提升；但 AP_S 仍显著落后。

- 消融结果：去掉 encoder 会让整体 AP 下降 3.9，且大目标下降更明显；decoder 从首层到末层累计可带来约 +8.2 AP / +9.5 AP50 。

- NMS 分析：前几层 decoder 输出仍可能重复，NMS 有时能帮助；但在后层，模型已通过 self-attention 学会抑制重复，NMS 反而损害最终 AP。

- Panoptic segmentation：在统一 thing/stuff 框架下，R101 + DC5 版本达到 45.6 PQ，且在 stuff 类别上表现尤其强。
