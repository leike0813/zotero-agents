#### 总体总结
引言与相关工作部分的引文组织遵循清晰的技术叙事脉络：首先用早期目标检测与Siamese架构工作铺出技术背景，再把DETR的慢收敛问题与现有解决方案并置比较，最后借Siamese匹配与注意力机制相关文献把本文的语义对齐匹配路线明确出来。整体引用策略是先铺技术背景、再比较主流检测范式、最后引出本文路线。


#### 关键文献

- [3] End-toend object detection with transformers: End-toend object detection with transformers (Background)

- [11] A twofold siamese network for real-time object tracking: A twofold siamese network for real-time object tracking (Background)

- [31] Depu Meng， Xiaokang Chen， Zejia Fan, 2021: Conditional DETR for fast training convergence (Component)

- [32] Libra R-CNN: Towards balanced learning for object detection: Libra R-CNN: Towards balanced learning for object detection (Historical)

- [47] Ning Wang，Wengang Zhou, 2021: Transformer meets tracker:Exploiting temporal context for robust visual tracking (Background)



#### 范围
- 章节: Introduction + Related Work
- 行号: 11-35

#### 按功能归类


##### Background

- [1] Fully-convolutional siamese networks for object tracking
  - 标题: Fully-convolutional siamese networks for object tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [3] End-toend object detection with transformers
  - 标题: End-toend object detection with transformers
  - 关键词: 目标检测背景, background, transformer
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [4] Transformer tracking
  - 标题: Transformer tracking
  - 关键词: Siamese匹配架构, background, transformer
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [5] A two stream siamese convolutional neural network for person re-identification
  - 标题: A two stream siamese convolutional neural network for person re-identification
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [8] Triplet loss in siamese network for object tracking
  - 标题: Triplet loss in siamese network for object tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [9] Fewshot object detection with attention-RPN and multi-relation detector
  - 标题: Fewshot object detection with attention-RPN and multi-relation detector
  - 关键词: 目标检测背景, background, attention
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [10] Peng Gao, 2021
  - 标题: Fast convergence of DETR with spatially modulated co-attention
  - 关键词: 相关研究工作, background, attention
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [11] A twofold siamese network for real-time object tracking
  - 标题: A twofold siamese network for real-time object tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [14] TransReID: Transformer-based object reidentification
  - 标题: TransReID: Transformer-based object reidentification
  - 关键词: 行人重识别, background, transformer
  - 总结: 该工作被用来交代行人重识别的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [15] One-shot object detection with co-attention and co-excitation
  - 标题: One-shot object detection with co-attention and co-excitation
  - 关键词: 目标检测背景, background, attention
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [16] Han Hu, 2018
  - 标题: Relation networks for object detection
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [17] Few-shot object detection via feature reweighting
  - 标题: Few-shot object detection via feature reweighting
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [19] Siamese neural networks for one-shot image recognition
  - 标题: Siamese neural networks for one-shot image recognition
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [20] Bo Li, 2019
  - 标题: SiamRPN++: Evolution of siamese visual tracking with very deep networks
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [21] High performance visual tracking with siamese region proposal network
  - 标题: High performance visual tracking with siamese region proposal network
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [22] Diverse part discovery: Occluded person re-identification with part-aware transformer
  - 标题: Diverse part discovery: Occluded person re-identification with part-aware transformer
  - 关键词: 行人重识别, background, transformer
  - 总结: 该工作被用来交代行人重识别的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [23] Minghui Liao, 2021
  - 标题: Mask TextSpotter: An end-toend trainable neural network for spoting text with arbitrary shapes
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [27] Li Liu, 2020
  - 标题: Deep learning for generic object detection: A survey
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [28] Receptive field block net for accurate and fast object detection
  - 标题: Receptive field block net for accurate and fast object detection
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [29] Wei Liu, 2016
  - 标题: SSD: Single shot multibox detector
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [33] Incremental few-shot object detection
  - 标题: Incremental few-shot object detection
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [34] YOLO 9000: Better, faster, stronger
  - 标题: YOLO 9000: Better, faster, stronger
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [36] Florian Schroff, 2015
  - 标题: FaceNet: A unified embedding for face recognition and clustering
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [38] Yantao Shen, 2017
  - 标题: Learning deep neural networks for vehicle Re-ID with visual-spatio-temporal path proposals
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [39] Prototypical networks for few-shot learning
  - 标题: Prototypical networks for few-shot learning
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [41] Learning to compare: Relation network for few-shot learning
  - 标题: Learning to compare: Relation network for few-shot learning
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [42] Siamese instance search for tracking
  - 标题: Siamese instance search for tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [43] FCOS: Fully convolutional one-stage object detection
  - 标题: FCOS: Fully convolutional one-stage object detection
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [44] Improving object localization with fitness NMS and bounded IoU loss
  - 标题: Improving object localization with fitness NMS and bounded IoU loss
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [45] Ashish Vaswani, 2017
  - 标题: Gomez,L.Kaiser,and Illia Polosukhin. Attention is all you need.In NeurIPS,2017．2,3,
  - 关键词: 相关研究工作, background, attention
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [46] Paul Voigtlaender, 2020
  - 标题: Siam R-CNN: Visual tracking by re-detection
  - 关键词: Siamese匹配架构, background
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [47] Ning Wang，Wengang Zhou, 2021
  - 标题: Transformer meets tracker:Exploiting temporal context for robust visual tracking
  - 关键词: Siamese匹配架构, background, transformer
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [48] Lin Wu, 2018
  - 标题: Where-andwhen to look:Deep siamese attention networks for videobased person re-identification
  - 关键词: Siamese匹配架构, background, attention, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [49] Few-shot object detection and viewpoint estimation for objects in the wild
  - 标题: Few-shot object detection and viewpoint estimation for objects in the wild
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [50] Chuhui Xue, 2021
  - 标题: I2C2W: Image-to-character-to-word transformers for accurate scene text recognition
  - 关键词: 相关研究工作, background, transformer
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [52] Fangao Zeng, 2021
  - 标题: MOTR: End-to-end Multiple-Object tracking with TRansformer
  - 关键词: Siamese匹配架构, background, transformer
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [53] Gongjie Zhang, 213
  - 标题: PNPDet: Efficient few-shot detection without forgetting via plug-and-play sub-networks. In WACV,
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [54] IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024,
  - 标题: IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024,
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [55] Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation
  - 标题: Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [57] Single-shot refinement neural network for object detection
  - 标题: Single-shot refinement neural network for object detection
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [58] Deeper and wider siamese networks for real-time visual tracking．
  - 标题: Deeper and wider siamese networks for real-time visual tracking．
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [59] Re-identification with consistent attentive siamese networks
  - 标题: Re-identification with consistent attentive siamese networks
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [60] PTTR: Relational 3D point cloud object tracking with transformer
  - 标题: PTTR: Relational 3D point cloud object tracking with transformer
  - 关键词: Siamese匹配架构, background, transformer
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [61] Xingyi Zhou, 2019
  - 标题: Objects as points
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [62] Bottom-up object detection by grouping extreme and center points
  - 标题: Bottom-up object detection by grouping extreme and center points
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [64] Distractor-aware siamese networks for visual object tracking
  - 标题: Distractor-aware siamese networks for visual object tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。



##### Historical

- [2] Cascade R-CNN: Delving into high quality object detection
  - 标题: Cascade R-CNN: Delving into high quality object detection
  - 关键词: 两阶段检测器, historical
  - 总结: 该工作被用来交代两阶段检测器的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [32] Libra R-CNN: Towards balanced learning for object detection
  - 标题: Libra R-CNN: Towards balanced learning for object detection
  - 关键词: 两阶段检测器, historical
  - 总结: 该工作被用来交代两阶段检测器的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [35] Faster R-CNN: Towards real-time object detection with region proposal networks
  - 标题: Faster R-CNN: Towards real-time object detection with region proposal networks
  - 关键词: 两阶段检测器, historical
  - 总结: 该工作被用来交代两阶段检测器的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [51] Xiaopeng Yan, 2019
  - 标题: Meta R-CNN: Towards general solver for instance-level low-shot learning
  - 关键词: 两阶段检测器, historical
  - 总结: 该工作被用来交代两阶段检测器的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [56] DA-DETR:Domain adaptive detection transformer by hybrid attention
  - 标题: DA-DETR:Domain adaptive detection transformer by hybrid attention
  - 关键词: Transformer架构, historical, transformer, attention
  - 总结: 该工作被用来交代Transformer架构的技术背景，帮助原文把自身方法放回相关技术谱系中。



##### Dataset

- [26] Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context
  - 标题: Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context
  - 关键词: 数据集与评估, dataset
  - 总结: 该工作被用来交代数据集与评估的技术背景，帮助原文把自身方法放回相关技术谱系中。



##### Component

- [31] Depu Meng， Xiaokang Chen， Zejia Fan, 2021
  - 标题: Conditional DETR for fast training convergence
  - 关键词: DETR收敛加速方案, component
  - 总结: 该工作被用来交代DETR收敛加速方案的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [63] Deformable DETR:Deformable transformers for end-to-end object detection
  - 标题: Deformable DETR:Deformable transformers for end-to-end object detection
  - 关键词: DETR收敛加速方案, component, transformer
  - 总结: 该工作被用来交代DETR收敛加速方案的技术背景，帮助原文把自身方法放回相关技术谱系中。





#### 时间线分析

##### 早期
早期工作主要奠定了目标检测的基础框架与Siamese匹配架构的思想，包括Faster R-CNN等两阶段检测器、ResNet骨干网络以及早期注意力机制。


- [26] Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context: Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context

- [19] Siamese neural networks for one-shot image recognition: Siamese neural networks for one-shot image recognition

- [35] Faster R-CNN: Towards real-time object detection with region proposal networks: Faster R-CNN: Towards real-time object detection with region proposal networks

- [36] Florian Schroff, 2015: FaceNet: A unified embedding for face recognition and clustering

- [1] Fully-convolutional siamese networks for object tracking: Fully-convolutional siamese networks for object tracking

- [29] Wei Liu, 2016: SSD: Single shot multibox detector

- [42] Siamese instance search for tracking: Siamese instance search for tracking

- [5] A two stream siamese convolutional neural network for person re-identification: A two stream siamese convolutional neural network for person re-identification

- [34] YOLO 9000: Better, faster, stronger: YOLO 9000: Better, faster, stronger

- [38] Yantao Shen, 2017: Learning deep neural networks for vehicle Re-ID with visual-spatio-temporal path proposals

- [39] Prototypical networks for few-shot learning: Prototypical networks for few-shot learning

- [45] Ashish Vaswani, 2017: Gomez,L.Kaiser,and Illia Polosukhin. Attention is all you need.In NeurIPS,2017．2,3,

- [2] Cascade R-CNN: Delving into high quality object detection: Cascade R-CNN: Delving into high quality object detection

- [8] Triplet loss in siamese network for object tracking: Triplet loss in siamese network for object tracking

- [11] A twofold siamese network for real-time object tracking: A twofold siamese network for real-time object tracking

- [16] Han Hu, 2018: Relation networks for object detection

- [21] High performance visual tracking with siamese region proposal network: High performance visual tracking with siamese region proposal network

- [28] Receptive field block net for accurate and fast object detection: Receptive field block net for accurate and fast object detection




##### 中期
中期工作把目标检测推向更成熟的深度学习路线，包括单阶段检测器、特征金字塔、Focal Loss等关键技术，以及Transformer在视觉任务中的初步应用。


- [41] Learning to compare: Relation network for few-shot learning: Learning to compare: Relation network for few-shot learning

- [44] Improving object localization with fitness NMS and bounded IoU loss: Improving object localization with fitness NMS and bounded IoU loss

- [48] Lin Wu, 2018: Where-andwhen to look:Deep siamese attention networks for videobased person re-identification

- [57] Single-shot refinement neural network for object detection: Single-shot refinement neural network for object detection

- [64] Distractor-aware siamese networks for visual object tracking: Distractor-aware siamese networks for visual object tracking

- [15] One-shot object detection with co-attention and co-excitation: One-shot object detection with co-attention and co-excitation

- [17] Few-shot object detection via feature reweighting: Few-shot object detection via feature reweighting

- [20] Bo Li, 2019: SiamRPN++: Evolution of siamese visual tracking with very deep networks

- [32] Libra R-CNN: Towards balanced learning for object detection: Libra R-CNN: Towards balanced learning for object detection

- [43] FCOS: Fully convolutional one-stage object detection: FCOS: Fully convolutional one-stage object detection

- [51] Xiaopeng Yan, 2019: Meta R-CNN: Towards general solver for instance-level low-shot learning

- [54] IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024,: IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024,

- [58] Deeper and wider siamese networks for real-time visual tracking．: Deeper and wider siamese networks for real-time visual tracking．

- [59] Re-identification with consistent attentive siamese networks: Re-identification with consistent attentive siamese networks

- [61] Xingyi Zhou, 2019: Objects as points

- [62] Bottom-up object detection by grouping extreme and center points: Bottom-up object detection by grouping extreme and center points

- [3] End-toend object detection with transformers: End-toend object detection with transformers

- [9] Fewshot object detection with attention-RPN and multi-relation detector: Fewshot object detection with attention-RPN and multi-relation detector




##### 近期
近期工作则更直接地收束到本文所处的方法脉络，包括DETR及其变体、Siamese跟踪器以及少样本检测等前沿方向。


- [27] Li Liu, 2020: Deep learning for generic object detection: A survey

- [33] Incremental few-shot object detection: Incremental few-shot object detection

- [46] Paul Voigtlaender, 2020: Siam R-CNN: Visual tracking by re-detection

- [49] Few-shot object detection and viewpoint estimation for objects in the wild: Few-shot object detection and viewpoint estimation for objects in the wild

- [4] Transformer tracking: Transformer tracking

- [10] Peng Gao, 2021: Fast convergence of DETR with spatially modulated co-attention

- [14] TransReID: Transformer-based object reidentification: TransReID: Transformer-based object reidentification

- [22] Diverse part discovery: Occluded person re-identification with part-aware transformer: Diverse part discovery: Occluded person re-identification with part-aware transformer

- [23] Minghui Liao, 2021: Mask TextSpotter: An end-toend trainable neural network for spoting text with arbitrary shapes

- [31] Depu Meng， Xiaokang Chen， Zejia Fan, 2021: Conditional DETR for fast training convergence

- [47] Ning Wang，Wengang Zhou, 2021: Transformer meets tracker:Exploiting temporal context for robust visual tracking

- [50] Chuhui Xue, 2021: I2C2W: Image-to-character-to-word transformers for accurate scene text recognition

- [52] Fangao Zeng, 2021: MOTR: End-to-end Multiple-Object tracking with TRansformer

- [53] Gongjie Zhang, 213: PNPDet: Efficient few-shot detection without forgetting via plug-and-play sub-networks. In WACV,

- [55] Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation: Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation

- [56] DA-DETR:Domain adaptive detection transformer by hybrid attention: DA-DETR:Domain adaptive detection transformer by hybrid attention

- [63] Deformable DETR:Deformable transformers for end-to-end object detection: Deformable DETR:Deformable transformers for end-to-end object detection

- [60] PTTR: Relational 3D point cloud object tracking with transformer: PTTR: Relational 3D point cloud object tracking with transformer
