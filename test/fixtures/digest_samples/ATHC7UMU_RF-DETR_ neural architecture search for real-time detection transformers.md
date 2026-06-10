## TL;DR

本文提出 RF-DETR，一种轻量级专用检测 Transformer，通过权重共享神经架构搜索（NAS）为任意目标数据集发现精度-延迟 Pareto 曲线。该方法在目标数据集上微调预训练基础网络，无需重新训练即可评估数千种具有不同精度-延迟权衡的网络配置。

RF-DETR 重新审视了 NAS 的"可调旋钮"以提高 DETR 向多样化目标域的可迁移性，包括 patch size、解码器层数、查询 token 数、图像分辨率和每个注意力块的窗口数。在推理时通过丢弃查询 token 和解码器层来改变延迟，而无需重新训练。

在 COCO 上，RF-DETR（nano）达到 48.0 AP，以相似延迟超越 D-FINE（nano）5.3 AP；RF-DETR（2x-large）是首个在 COCO 上超过 60 AP 的实时检测器。在 Roboflow100-VL 上，RF-DETR（2x-large）超越 GroundingDINO（tiny）1.2 AP，同时速度快 20 倍。

本文还提出了一种标准化的延迟评估协议：在前向传播之间缓冲 200ms 以减轻 GPU 功率节流导致的测量方差。此外，RF-DETR 采用无调度器训练策略，避免了对特定数据集特性的隐式过拟合。

## 研究问题与贡献

- 研究问题：如何在保持实时推理效率的同时，通过权重共享 NAS 使专用检测 Transformer 能够适应多样化的目标数据集和硬件平台，并避免对 COCO 等标准基准的隐式过拟合？

- 提出 RF-DETR 系列基于 NAS 的无调度器检测和分割模型，在 RF100-VL 和 COCO（延迟 ≤ 40ms）上超越先前 SOTA 实时方法

- 首次将端到端权重共享 NAS 应用于目标检测和分割任务，探索了 patch size、解码器层数、查询 token 数、图像分辨率和窗口数等"可调旋钮"对精度-延迟权衡的影响

- 利用大规模预训练和权重共享 NAS 实现向小数据集的有效迁移，无需针对每个硬件平台重复搜索和训练过程

- 重新审视当前延迟基准测试协议，提出在连续前向传播之间缓冲 200ms 的标准化程序以提高可复现性

## 方法要点

- 用 DINOv2 预训练 ViT 骨干网络替代 LW-DETR 的 CAEv2 骨干，显著提升小数据集上的检测精度

- 采用 FlexiVIT 风格的变换在训练期间插值不同 patch size，使 NAS 搜索空间包含多种分辨率配置

- 在所有解码器层输出上应用回归损失，允许在推理时丢弃任意解码器块，甚至完全移除解码器将模型变为单阶段检测器

- 按编码器输出处对应 token 的类 logit 最大 sigmoid 值排序丢弃查询 token，以在不重新训练的情况下减少最大检测数和推理延迟

- 预分配 N 个位置嵌入对应最大图像分辨率除以最小 patch size，对较小分辨率或较大 patch size 进行插值

- 窗口注意力将自注意力限制为仅处理固定数量的相邻 token，通过增减每个块的窗口数来平衡精度、全局信息混合和计算效率

- 添加轻量级实例分割头，通过双线性插值编码器输出并学习轻量级投影器生成像素嵌入图，与检测头共享低分辨率特征图以最小化延迟

- 使用层归一替代批归一以支持消费者级 GPU 上的梯度累积训练

- 采用无调度器训练策略：使用 EMA 调度器但不使用学习率预热，避免 cosine 调度对已知优化 horizon 的假设

- 限制数据增强仅为水平翻转和随机裁剪，避免垂直翻转等在安全关键领域可能产生负面偏置的增强

- 在批次级别调整图像大小以最小化每批填充像素数，并确保所有位置编码分辨率在训练时被等概率看到

## 关键结果

- RF-DETR（nano）在 COCO 上达到 48.0 AP，以相似延迟超越 D-FINE（nano）5.3 AP，超越 LW-DETR（tiny）5+ AP

- RF-DETR（2x-large）是首个在 COCO 上超过 60 AP 的实时检测器

- RF-DETR（2x-large）在 RF100-VL 上超越 GroundingDINO（tiny）1.2 AP，同时运行速度快 20 倍

- RF-DETR-Seg（nano）在 COCO 上超越 FastInst 5.4 AP，同时运行速度快近 10 倍

- RF-DETR-Seg（nano）超越所有已报告的 YOLOv8 和 YOLOv11 模型尺寸的分割性能

- 用 DINOv2 替代 CAEv2 骨干带来 2% AP 提升；额外的 Objects-365 预训练再提升 0.7% AP

- 权重共享 NAS 在基础配置上再提升 0.3% AP 而不增加延迟

- 在 RF100-VL 上，YOLOv8 和 YOLOv11 持续表现不如基于 DETR 的检测器，且增大模型尺寸无法改善其性能

- D-FINE 在 RF100-VL 上表现不如 RT-DETR，表明其超参数可能过度优化了 COCO

- 通过 200ms 缓冲标准化延迟评估后，YOLOv8（M）FP32 延迟从报告的 5.86ms 变为 14.8ms，揭示了功率节流对测量的显著影响

- 天真的 FP16 量化可使 D-FINE 性能降至 0.5 AP，强调应使用相同模型工件报告精度和延迟

- NAS 后微调在 COCO 上收益有限，但在 RF100-VL 上小模型有显著提升（nano +1.1 AP）

- 将 COCO 优化的固定架构迁移到 RF100-VL 表现良好，但数据集特定 NAS 仍带来显著额外增益

- RF-DETR 对未见过的 patch size（如 27、18）表现出强泛化能力，性能与 Pareto 最优族几乎相同

## 局限与可复现性线索

- TensorRT 编译期间的非确定性行为导致延迟测量仍有高达 0.1ms 的方差，重新编译相同 ONNX 工件可产生不同延迟结果

- 仅报告一位小数精度的延迟值以反映测量不确定性

- 用层归一替代批归一虽然支持消费者硬件训练，但导致性能下降 1.0%

- SAM2 和 SigLIPv2 骨干在 FP16 下表现不佳，需使用 FP32 ONNX 精度作为 FP16 TensorRT 延迟的上界估计

- YOLOv8 和 YOLOv11 在 TensorRT 中的 mAP 结果无法复现，可能因为这些模型评估时使用多类 NMS 但推理时仅使用单类 NMS

- 权重共享 NAS 的"架构增强"正则化在小数据集上需要超过 100 个 epoch 才能收敛

- 代码已在 GitHub 上开源，但训练代码未完全公开

- 独立延迟基准测试工具已在 GitHub 上发布

## 分章节总结

### ABSTRACT

- 开放词汇检测器在 COCO 上表现优异，但往往无法泛化到具有预训练中不常见分布外类别的真实世界数据集

- RF-DETR 是一种轻量级专用检测 Transformer，通过权重共享 NAS 为任意目标数据集发现精度-延迟 Pareto 曲线

- 方法在目标数据集上微调预训练基础网络，无需重新训练即可评估数千种不同精度-延迟权衡的网络配置

- RF-DETR（nano）在 COCO 上达到 48.0 AP，以相似延迟超越 D-FINE（nano）5.3 AP

- RF-DETR（2x-large）在 RF100-VL 上超越 GroundingDINO（tiny）1.2 AP，同时速度快 20 倍

- RF-DETR（2x-large）是首个在 COCO 上超过 60 AP 的实时检测器

### 1 INTRODUCTION

- 目标检测是计算机视觉的基本问题，近年已趋成熟；开放词汇检测器如 GroundingDINO 和 YOLO-World 在常见类别上实现出色的零样本性能

- 但 SOTA 视觉语言模型（VLM）仍难以泛化到预训练中不常见的分布外类别、任务和成像模态

- 微调 VLM 可显著提升域内性能，但以运行时效率（重型文本编码器）和开放词汇泛化为代价

- 专用检测器如 D-FINE 和 RT-DETR 实现实时推理，但性能不如微调的 VLM

- 本文通过结合互联网规模预训练和实时架构来现代化专用检测器

- 发现近期专用检测器在 COCO 上隐式过拟合，使用定制模型架构、学习率调度器和增强调度器牺牲了真实世界性能

- 重新审视 NAS 在端到端目标检测和分割中的应用，受 OFA 启发在训练期间变化图像分辨率和 patch size 等模型输入

- 权重共享 NAS 允许修改推理配置如解码器层数和查询 token 数来专门化基础模型而无需微调

- 识别出 GPU 功率节流是延迟评估不可复现的主要原因，提出在前向传播之间缓冲 200ms 以标准化延迟评估

### 2 RELATED WORKS

- NAS 自动识别具有不同精度-延迟权衡的模型架构族；早期方法主要关注最大化精度，计算成本高

- OFA 提出权重共享 NAS，通过同时优化数千个具有不同精度-延迟权衡的子网来解耦训练和搜索

- 实时目标检测对安全和交互式应用至关重要；DETR 移除了 NMS 和 anchor box 等手工组件

- RT-DETR 和 LW-DETR 成功将高性能 DETR 适配到实时应用

- 视觉语言模型在大规模弱监督图像-文本对上训练，是开放词汇目标检测的关键使能者

- 许多 VLM 速度过慢，难以用于实时任务；RF-DETR 结合实时检测器的快速推理和 VLM 的互联网规模先验

### 3 RF-DETR: WEIGHT-SHARING NAS WITH FOUNDATION MODELS

- 用 DINOv2 预训练权重初始化骨干显著提升小数据集检测精度

- 权重共享 NAS 评估数千种模型配置：不同输入图像分辨率、patch size、窗口注意力块、解码器层和查询 token

- 每次训练迭代均匀采样随机模型配置进行梯度更新，高效并行训练数千个子网

- Patch Size：较小 patch 带来更高精度但计算成本更大；采用 FlexiVIT 风格变换在训练期间插值不同 patch size

- 解码器层数：对所有解码器层输出应用回归损失，可在推理时丢弃任意解码器块

- 查询 token 数：按编码器输出处对应 token 类 logit 的最大 sigmoid 值排序丢弃

- 图像分辨率：较高分辨率改善小物体检测，较低分辨率改善运行时；预分配 N 个位置嵌入并插值

- SOTA 检测器通常需要仔细超参数调优以最大化标准基准性能，但这种定制程序隐式偏向某些数据集特性

- 限制增强仅为水平翻转和随机裁剪；在批次级别调整图像大小以最小化每批填充像素数

### 4 EXPERIMENTS

- 在 COCO 和 RF100-VL 上评估 RF-DETR，证明在实时方法中达到 SOTA 精度

- YOLO 模型常在计算延迟时省略 NMS，导致与端到端检测器的不公平比较

- 在前向传播之间暂停 200ms 可大幅减轻功率节流，产生更稳定的延迟测量

- RF-DETR（nano）在 COCO 上超越 D-FINE（nano）和 LW-DETR（tiny）超过 5 AP

- RF-DETR-Seg（nano）超越 FastInst 5.4%，同时运行速度快近 10 倍

- RF100-VL 是由 100 个多样化数据集组成的具有挑战性的检测基准

- 采用比 LW-DETR 更温和的超参数使性能下降 1.0%，但用 DINOv2 替代 CAEv2 骨干提升 2% AP

- 仅依赖验证集进行模型选择和评估可能导致过拟合；主张未来检测器也应评估具有公开验证和测试分割的数据集

### 5 CONCLUSION

- RF-DETR 是一种 SOTA 基于 NAS 的方法，用于为目标数据集和硬件平台微调专用端到端目标检测器

- 在 COCO 和 RF100-VL 上超越先前 SOTA 实时方法，在 COCO 上超越 D-FINE（nano）5% AP

- 当前架构、学习率调度器和增强调度器针对最大化 COCO 性能定制，社区应在多样化大规模数据集上基准测试模型以防止隐式过拟合

- 强调功率节流导致延迟基准测试的高方差，提出标准化协议提高可复现性

### A IMPLEMENTATION DETAILS

- 用 SAM2 伪标注 Objects365 以允许在同一数据上预训练分割和检测头

- 使用 1e-4 学习率，批量大小 128；使用 EMA 调度器但省略学习率预热

- 使用 CUDA graphs 在 TensorRT 中预排队所有核函数，加速 RT-DETR、LW-DETR 和 RF-DETR

### B ABLATION ON QUERY TOKENS AND DECODER LAYERS

- 在推理时通过丢弃最低置信度查询来减少查询数而无需重新训练

- 丢弃 100 个最低置信度查询不会显著降低性能，但适度改善所有解码器层的延迟

- 消除最终解码器层减少 10% 延迟，仅带来 2 mAP 性能下降

### C BENCHMARKING FLOPS

- 使用 PyTorch 的 FlopCounterMode 基准测试 FLOPs，比 CalFLOPs 提供更可靠结果

- LW-DETR 的 FLOPs 计数约为原报告结果的两倍，差异可归因于 LW-DETR 报告的是 MACs 而非 FLOPs

### D IMPACT OF CLASS-NAMES ON OPEN-VOCABULARY DETECTORS

- 评估在 RF100-VL 上用类名微调开放词汇检测器的影响

- 发现在 RF100-VL 上微调 GroundingDINO 在使用类名和类索引时性能几乎相同

- 表明端到端微调削弱了互联网规模预训练的影响

### E BENCHMARKING LARGER MODEL VARIANTS

- LW-DETR 和 D-FINE 手工设计更大变体来扩展模型族；RF-DETR 通过基于网格的搜索自动发现扩展策略

- DINOv2-B 骨干族显示性能差距随延迟增加而缩小，RF-DETR（2x-large）在 mAP 50:95 上超越 D-FINE

- 扩展 RF-DETR 模型族很简单：可直接从同一 NAS 搜索中采样更高延迟变体而无需重新训练

### F IMPACT ON NAS FINE-TUNING ON COCO

- NAS 后微调在 COCO 上收益有限

- NAS"架构增强"作为强正则化器，在没有此正则化的额外训练会导致过拟合

- 在 RF100-VL 上训练的模型从微调中受益更多，可能需要超过 100 个 epoch 才能收敛

### G IMPACT OF FIXED ARCHITECTURE ON RF100-VL

- 评估将针对 COCO 优化的 NAS 架构迁移到 RF100-VL 的影响

- 固定架构模型在没有进一步数据集特定 NAS 的情况下表现良好

- 但数据集特定 NAS 带来显著额外增益

### H DISCUSSION ON NOTABLE DISCOVERED ARCHITECTURES

- 所有"可调"旋钮在定义 Pareto 最优模型族时都被使用，验证了搜索空间的选择

- Pareto 最优模型倾向于使用相同的 patch size；DINOv2-S 骨干收敛到 16，DINOv2-B 收敛到 20

- RF-DETR 的性能取决于空间位置数（分辨率除以 patch size）而非单独的分辨率或 patch size

- 未见过的 patch size（27、18）展现出强泛化能力

- 大多数 Pareto 最优 RF-DETR 模型在 2 个窗口时表现最佳，而 LW-DETR 在 4 个窗口时最佳

### I VISUALIZING MODEL PREDICTIONS

- RF-DETR（nano）预测更少的假阳性（如将路标误认为人）

- RF-DETR-Seg（nano）预测更精确的对象边界