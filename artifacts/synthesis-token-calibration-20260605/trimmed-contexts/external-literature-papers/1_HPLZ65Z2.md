# DINO: DETR with improved DeNoising anchor boxes for end-to-end object detection (2022)

- Paper ref: 1:HPLZ65Z2
- Title: DINO: DETR with improved DeNoising anchor boxes for end-to-end object detection
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Bochkovskiy, A.; Wang, C.-Y.; et al. | Yolov4: Optimal speed and accuracy of object detection |
| ref-2 | 2020 | Carion, N.; Massa, F.; et al. | End-to-end object detection with transformers |
| ref-3 | 2019 | Chen, K.; Pang, J.; et al. | Hybrid task cascade for instance segmentation |
| ref-4 | 2019 | Chen, K.; Wang, J.; et al. | Mmdetection: Open mmlab detection toolbox and benchmark |
| ref-5 | 2016 | Chen, T.; Xu, B.; et al. | Training deep nets with sublinear memory cost |
| ref-6 | 2021 | Dai, X.; Chen, Y.; et al. | Dynamic head: Unifying object detection heads with attentions |
| ref-7 | 2021 | Dai, X.; Chen, Y.; et al. | Dynamic detr: End-to-end object detection with dynamic attention |
| ref-8 | 2009 | Deng, J.; Dong, W.; et al. | Imagenet: A large-scale hierarchical image database |
| ref-9 | 2018 | Devlin, J.; Chang, M.-W.; et al. | Bert: Pretraining of deep bidirectional transformers for language understanding |
| ref-10 | 2021 | Gao, P.; Zheng, M.; et al. | Fast convergence of detr with spatially modulated co-attention |
| ref-11 | 2021 | Ge, Z.; Liu, S.; et al. | Yolox: Exceeding yolo series in 2021 |
| ref-12 | 2017 | He, K.; Gkioxari, G.; et al. | Mask r-cnn |
| ref-13 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-14 | 2021 | Kamath, A.; Singh, M.; et al. | Mdetr – modulated detection for end-to-end multi-modal understanding |
| ref-15 | 2014 | Kingma, D.P.; Ba, J. | Adam: A method for stochastic optimization |
| ref-16 | 2022 | Li, F.; Zhang, H.; et al. | Dndetr: Accelerate detr training by introducing query denoising |
| ref-17 | 2020 | Lin, T.-Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-18 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |
| ref-19 | 2022 | Liu, S.; Li, F.; et al. | DAB-DETR: Dynamic anchor boxes are better queries for DETR |
| ref-20 | 2021 | Liu, Z.; Hu, H.; et al. | Swin transformer v2: Scaling up capacity and resolution |
| ref-21 | 2021 | Liu, Z.; Lin, Y.; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-22 | 2017 | Loshchilov, I.; Hutter, F. | Decoupled weight decay regularization |
| ref-23 | 2021 | Meng, D.; Chen, X.; et al. | Conditional detr for fast training convergence |
| ref-24 | 2018 | Micikevicius, P.; Narang, S.; et al. | Mixed precision training |
| ref-25 | 2021 | Radford, A.; Kim, J.W.; et al. | Learning transferable visual models from natural language supervision |
| ref-26 | 2017 | Redmon, J.; Farhadi, A. | Yolo9000: better, faster, stronger |
| ref-27 | 2018 | Redmon, J.; Farhadi, A. | Yolov3: An incremental improvement |
| ref-28 | 2015 | Ren, S.; He, K.; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-29 | 2017 | Ren, S.; He, K.; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-30 | 2019 | Rezatofighi, H.; Tsoi, N.; et al. | Generalized intersection over union: A metric and a loss for bounding box regression |
| ref-31 | 2019 | Shao, S.; Li, Z.; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-32 | 2020 | Sun, Z.; Cao, S.; et al. | Rethinking transformer-based set prediction for object detection |
| ref-33 | 2019 | Tian, Z.; Shen, C.; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-34 | 2017 | Vaswani, A.; Shazeer, N.; et al. | Attention is all you need |
| ref-35 | 2021 | Wang, Y.; Zhang, X.; et al. | Anchor detr: Query design for transformer-based detector |
| ref-36 | 2021 | Xu, M.; Zhang, Z.; et al. | End-to-end semi-supervised object detection with soft teacher |
| ref-37 | 2021 | Yao, Z.; Ai, J.; et al. | Efficient detr: Improving end-to-end object detector with dense prior |
| ref-38 | 2021 | Yuan, L.; Chen, D.; et al. | Florence: A new foundation model for computer vision |
| ref-39 | 2021 | Zhu, X.; Su, W.; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 按功能归类

**Background（背景与基础）：**
- DETR [3]：开创性端到端 Transformer 检测器，消除手工组件，建模为集合预测任务
- Faster R-CNN [30]：经典两阶段检测器代表，使用 RPN 生成候选框
- Efficient DETR [39]：通过密集先验改进检测器，选择 top-K 特征增强查询
- Conditional DETR [25]：解耦查询的位置和内容信息，加速训练收敛

**Component（DINO 的组成基础）：**
- Deformable DETR [41]：提出可变形注意力机制和查询选择技术，DINO 直接采用
- DAB-DETR [21]：将查询公式化为 4D 动态锚框，DINO 跟随此表示方法
- DN-DETR [17]：引入去噪训练稳定二分匹配，DINO 扩展为对比去噪
- Swin Transformer [23]：提供层次化 Transformer 骨干，DINO 使用 SwinL 变体
- ResNet [14]：基础卷积骨干网络，DINO 使用 ResNet-50 进行基准实验

**Contrast（对比与超越目标）：**
- DyHead [7]：改进后的经典卷积检测器，COCO 上顶尖性能，DETR 需超越的目标
- HTC++ [4]：另一经典 SOTA 检测器框架，与 DyHead 同为 DINO 超越目标
- SwinV2-G [22]：超大模型 SOTA（30 亿参数，70M 私有数据），DINO 以 1/15 参数量实现更好性能
- Florence [40]：海量数据 SOTA（9 亿图像 - 文本对），DINO 以 1/60 骨干数据 +1/5 检测数据实现更好性能

**Dataset（数据集）：**
- COCO [20]：目标检测标准基准，所有主要实验在此进行
- Objects365 [33]：大规模公开检测数据集（1.7M 图像），DINO 预训练使用

#### 按引用编号列举

- [3] DETR：作为 DETR 类检测器的开创性工作被多次引用，定义查询结构、集合预测范式
- [4] HTC++：作为经典 SOTA 检测器被引用，代表 DINO 需超越的目标
- [7] DyHead：作为经典 SOTA 检测器被引用，与 HTC++ 同为性能对比基线
- [14] ResNet：作为基础骨干网络被引用，用于 DINO 基础实验
- [17] DN-DETR：作为 DINO 的直接基础被频繁引用，去噪训练方法被扩展为对比去噪
- [20] COCO：作为标准基准数据集被引用，所有实验在此进行
- [21] DAB-DETR：作为 DINO 的直接基础被引用，4D 锚框表示被采用
- [22] SwinV2-G：作为 SOTA 对比目标被引用，DINO 以更小模型实现更好性能
- [23] Swin Transformer：作为骨干网络被引用，SwinL 变体用于大规模实验
- [25] Conditional DETR：作为查询结构分析的基础被引用
- [30] Faster R-CNN：作为经典检测器代表被引用，性能对比基线
- [33] Objects365：作为预训练数据集被引用，DINO 实现 SOTA 的关键
- [39] Efficient DETR：作为查询选择技术的早期探索被引用
- [40] Florence：作为海量数据 SOTA 被引用，DINO 以更少数据实现更好性能
- [41] Deformable DETR：作为 DINO 的直接基础被频繁引用，可变形注意力和查询选择被采用
