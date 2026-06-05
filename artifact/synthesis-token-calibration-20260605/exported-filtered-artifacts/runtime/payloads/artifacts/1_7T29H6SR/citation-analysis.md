#### 总体总结
本文围绕'如何高效利用自监督基础模型表征进行图像分割'这一核心问题组织引文。先用 FCN、U-Net 等奠基性工作和 DINO、MAE 等自监督模型铺垫技术背景，再将 CNN/Transformer/Mamba/扩散等多种分割路线并置比较，最后通过 SAM 模型的计算开销问题和现有 DINO 适配方法的重型解码器缺陷，引出本文冻结 DINOv3 + 轻量 MLP 解码器的路线。实验部分的大量镜面检测和阴影检测基线方法进一步证明了 SegDINO 在自然图像任务上的广泛适用性。


#### 关键文献

- [AY-18] Mathilde Caron, 2021: Emerging properties in self-supervised vision transformers (Background)

- [AY-4] Alexander Kirillov, 2023: Segment anything (Contrast)

- [AY-6] Jonathan Long, 2015: Fully convolutional networks for semantic segmentation (Background)

- [AY-25] Maxime Oquab, 2023: Dinov2: Learning robust visual features without supervision (Background)

- [AY-10] Olaf Ronneberger, 2015: U-net: Convolutional networks for biomedical image segmentation (Background)

- [AY-20] Oriane Simeoni, 2025: Dinov3 (Background)



#### 范围
- 章节: INTRODUCTION + METHODOLOGY + EXPERIMENTS
- 行号: 9-118

#### 按功能归类


##### Baseline

- [AY-40] Md Zahangir Alom, 2018
  - 标题: Recurrent residual convolutional neural network based on u-net (r2u-net) for medical image segmentation
  - 关键词: R2U-Net, medical segmentation baseline, recurrent residual
  - 总结: 该工作作为医学图像分割的经典基线方法被纳入实验对比，用于证明SegDINO在医学数据集上的性能优势。

- [AY-41] Vijay Badrinarayanan, 2017
  - 标题: Segnet: A deep convolutional encoderdecoder architecture for image segmentation
  - 关键词: SegNet, encoder-decoder, medical baseline
  - 总结: 该工作是经典的编码器-解码器分割架构，被用作医学图像分割实验的对比基线。

- [AY-34] Jieneng Chen, 2021
  - 标题: Transunet: Transformers make strong encoders for medical image segmentation
  - 关键词: TransUNet, transformer medical, baseline
  - 总结: 该工作是Transformer应用于医学图像分割的代表方法，在实验中作为最强竞争者被对比。

- [AY-45] Zhihao Chen, 2020
  - 标题: A multi-task mean teacher for semi-supervised shadow detection
  - 关键词: mean teacher, semi-supervised, shadow detection
  - 总结: 该工作被用作视频阴影检测任务的对比基线。

- [AY-46] Ho Kei Cheng, 2021
  - 标题: Rethinking space-time networks with improved memory coverage for efficient video object segmentation
  - 关键词: video object segmentation, space-time memory, STCN
  - 总结: 该工作是视频对象分割的经典方法，被纳入VMD-D视频镜面检测的对比实验。

- [AY-47] Xinpeng Ding, 2022
  - 标题: Learning shadow correspondence for video shadow detection
  - 关键词: shadow correspondence, video shadow, Sc-Cor
  - 总结: 该工作通过学习阴影对应关系进行视频阴影检测，被纳入ViSha数据集的对比实验。

- [AY-48] Huankang Guan, 2022
  - 标题: Learning semantic associations for mirror detection
  - 关键词: semantic association, mirror detection, SANet
  - 总结: 该工作通过学习语义关联进行镜面检测，被纳入MSD数据集的对比实验。

- [AY-49] Ruozhen He, 2023
  - 标题: Efficient mirror detection via multi-level heterogeneous learning
  - 关键词: heterogeneous learning, mirror detection, HetNet
  - 总结: 该工作是MSD镜面检测数据集上的第二好方法，被用来证明SegDINO的性能优势。

- [AY-51] Tianyu Huang, 2023
  - 标题: Symmetry-aware transformer-based mirror detection
  - 关键词: symmetry-aware, mirror detection, SATNet
  - 总结: 该工作利用对称感知Transformer进行镜面检测，被纳入MSD数据集的对比实验。

- [AY-42] Chenxin Li, 2025
  - 标题: U-kan makes strong backbone for medical image segmentation and generation
  - 关键词: U-KAN, medical segmentation, KAN
  - 总结: 该工作将KAN架构用于医学图像分割，在ISIC数据集上是第二好的方法。

- [AY-52] Jiaying Lin, 2020
  - 标题: Progressive mirror detection
  - 关键词: progressive mirror, PMDNet, mirror detection
  - 总结: 该工作提出了渐进式镜面检测方法，被纳入MSD和VMD-D数据集的对比实验。

- [AY-53] Jiaying Lin, 2021
  - 标题: Rich context aggregation with reflection prior for glass surface detection
  - 关键词: glass detection, GlassNet, reflection prior
  - 总结: 该工作提出了玻璃表面检测方法，被纳入VMD-D视频镜面检测的对比实验。

- [AY-54] Fang Liu, 2024
  - 标题: Multi-view dynamic reflection prior for video glass surface detection
  - 关键词: multi-view dynamic, glass detection, MVDRP
  - 总结: 该工作利用多视角动态反射先验进行视频玻璃表面检测，被纳入VMD-D对比实验。

- [AY-55] Lihao Liu, 2023
  - 标题: Scotch and soda: A transformer video shadow detection framework
  - 关键词: video shadow detection, transformer, Scotch-Soda
  - 总结: 该工作提出了基于Transformer的视频阴影检测框架，被纳入ViSha数据集的对比实验。

- [AY-56] Xiankai Lu, 2019
  - 标题: See more, know more: Unsupervised video object segmentation with co-attention siamese networks
  - 关键词: co-attention, video segmentation, COS-Net
  - 总结: 该工作利用协同注意孪生网络进行视频对象分割，被纳入ViSha数据集的对比实验。

- [AY-57] Xiao Lu, 2022
  - 标题: Video shadow detection via spatio-temporal interpolation consistency training
  - 关键词: spatio-temporal, shadow detection, STICT
  - 总结: 该工作通过时空插一致性训练进行视频阴影检测，被纳入ViSha和VMD-D的对比实验。

- [AY-58] Seoung Wug Oh, 2019
  - 标题: Video object segmentation using space-time memory networks
  - 关键词: space-time memory, video segmentation, STM
  - 总结: 该工作提出了时空记忆网络进行视频对象分割，被纳入ViSha数据集的对比实验。

- [AY-43] Ozan Oktay, 2018
  - 标题: Attention u-net: Learning where to look for the pancreas
  - 关键词: Attention U-Net, attention mechanism, medical
  - 总结: 该工作将注意力机制引入U-Net，被用作医学图像分割实验的对比基线。

- [AY-59] Gensheng Pei, 2022
  - 标题: Hierarchical feature alignment network for unsupervised video object segmentation
  - 关键词: hierarchical feature, video segmentation, HFAN
  - 总结: 该工作提出了层次特征对齐网络用于视频对象分割，被纳入VMD-D对比实验。

- [AY-60] Xin Tan, 2022
  - 标题: Mirror detection with the visual chirality cue
  - 关键词: visual chirality, mirror detection, VCNet
  - 总结: 该工作利用视觉手性线索进行镜面检测，被纳入MSD和VMD-D的对比实验。

- [AY-44] Jeya Maria Jose Valanarasu, 2022
  - 标题: Unext: Mlp-based rapid medical image segmentation network
  - 关键词: U-NeXt, MLP segmentation, medical
  - 总结: 该工作提出了基于MLP的快速医学图像分割网络，被用作医学图像分割实验的对比基线。

- [AY-28] Enze Xie, 2021
  - 标题: Segformer: Simple and efficient design for semantic segmentation with transformers
  - 关键词: SegFormer, semantic segmentation, efficient
  - 总结: 该工作提出了简洁高效的Transformer分割设计，既是重型解码器问题的代表，也是MSD镜面分割的对比基线。

- [AY-61] Zhifeng Xie, 2024
  - 标题: Csfwinformer: Cross-spacefrequency window transformer for mirror detection
  - 关键词: CSFwinformer, mirror detection, cross-frequency
  - 总结: 该工作提出了跨空频窗口的Transformer镜面检测方法，被纳入MSD和ViSha的对比实验。

- [AY-21] Haipeng Zhou, 2024
  - 标题: Timeline and boundary guided diffusion network for video shadow detection
  - 关键词: TBG-Diff, video shadow, diffusion
  - 总结: 该工作提出了时间边界引导扩散网络用于视频阴影检测，是ViSha数据集上的第二好方法。



##### Background

- [AY-1] Tomer Amit, 2021
  - 标题: Segdiff: Image segmentation with diffusion probabilistic models
  - 关键词: diffusion models, image segmentation, probabilistic
  - 总结: 该工作被用来展示图像分割领域中扩散模型架构的兴起，与CNN、Transformer、Mamba等并列说明当前分割方法的多元化趋势。

- [AY-22] Lev Ayzenberg, 2024
  - 标题: Dinov2 based self supervised learning for few shot medical image segmentation
  - 关键词: DINOv2, few-shot medical, self-supervised
  - 总结: 该工作展示了DINOv2在少样本医学图像分割中的应用，佐证了DINO系列在医学领域的迁移能力。

- [AY-2] Reza Azad, 2024
  - 标题: Medical image segmentation review: The success of u-net
  - 关键词: U-Net survey, medical segmentation, review
  - 总结: 该综述被引用来论证U-Net在医学图像分割中的持续成功与广泛影响。

- [AY-18] Mathilde Caron, 2021
  - 标题: Emerging properties in self-supervised vision transformers
  - 关键词: DINO, self-supervised, vision transformer
  - 总结: 该工作是DINO系列的开创性论文，被用来追溯自监督视觉Transformer的技术起点。

- [AY-23] Simon Damm, 2025
  - 标题: Anomalydino: Boosting patch-based few-shot anomaly detection with dinov2
  - 关键词: DINOv2, anomaly detection, few-shot
  - 总结: 该工作展示了DINOv2在异常检测任务中的应用，佐证了DINO系列的广泛迁移能力。

- [AY-19] Kaiming He, 2022
  - 标题: Masked au- ´ toencoders are scalable vision learners
  - 关键词: MAE, self-supervised, masked autoencoder
  - 总结: 该工作是掩码自编码器的开创性论文，被用来论证自监督基础模型在视觉领域的兴起。

- [AY-3] Jitesh Jain, 2023
  - 标题: Oneformer: One transformer to rule universal image segmentation
  - 关键词: OneFormer, universal segmentation, transformer
  - 总结: 该工作是通用图像分割的Transformer方法，被用来说明Transformer在分割任务中的广泛应用。

- [AY-5] Xiangtai Li, 2024
  - 标题: Transformer-based visual segmentation: A survey
  - 关键词: segmentation survey, transformer, review
  - 总结: 该综述被用来说明Transformer在视觉分割领域的最新进展。

- [AY-6] Jonathan Long, 2015
  - 标题: Fully convolutional networks for semantic segmentation
  - 关键词: FCN, fully convolutional, semantic segmentation
  - 总结: 该工作是全卷积网络的开创性论文，被用来追溯卷积分割方法的技术起点。

- [AY-7] Jun Ma, 2024
  - 标题: U-mamba: Enhancing long-range dependency for biomedical image segmentation
  - 关键词: U-Mamba, mamba, biomedical segmentation
  - 总结: 该工作将Mamba架构用于 biomedical 图像分割，被用来说明分割方法的多样化发展。

- [AY-9] Shervin Minaee, 2021
  - 标题: Image segmentation using deep learning: A survey
  - 关键词: deep learning survey, image segmentation, review
  - 总结: 该综述被用来说明图像分割在图像分析中的核心地位和深度学习方法的进展。

- [AY-25] Maxime Oquab, 2023
  - 标题: Dinov2: Learning robust visual features without supervision
  - 关键词: DINOv2, self-supervised, robust features
  - 总结: 该工作是DINOv2的原始论文，被用来说明DINO系列在自监督特征学习中的重要进展。

- [AY-10] Olaf Ronneberger, 2015
  - 标题: U-net: Convolutional networks for biomedical image segmentation
  - 关键词: U-Net, biomedical segmentation, CNN
  - 总结: 该工作是U-Net的原始论文，既是CNN分割方法的代表性工作，也在实验中作为医学图像分割的基线。

- [AY-20] Oriane Simeoni, 2025
  - 标题: Dinov3
  - 关键词: DINOv3, self-supervised, foundation model
  - 总结: 该工作是DINOv3的原始论文，是本文冻结骨干网络的来源，在引言和方法中被多次引用。

- [AY-11] Robin Strudel, 2021
  - 标题: Segmenter: Transformer for semantic segmentation
  - 关键词: Segmenter, transformer segmentation, semantic
  - 总结: 该工作将Transformer用于语义分割，被用来说明Transformer在分割任务中的应用。

- [AY-12] Hongqiu Wang, 2024
  - 标题: Dual-reference source-free active domain adaptation for nasopharyngeal carcinoma tumor segmentation across multiple hospitals
  - 关键词: domain adaptation, medical segmentation, computer-aided
  - 总结: 该工作涉及医学图像分割的域适应问题，被用来说明分割在计算机辅助诊断中的应用。

- [AY-26] Hongqiu Wang, 2025
  - 标题: Serp-mamba: Advancing high-resolution retinal vessel segmentation with selective state-space model
  - 关键词: SERP-Mamba, retinal vessel, state-space
  - 总结: 该工作将Mamba状态空间模型用于高分辨率视网膜血管分割，被用来说明Mamba在医学分割中的应用。

- [AY-13] Junde Wu, 2024
  - 标题: Medsegdiff: Medical image segmentation with diffusion probabilistic model
  - 关键词: MedSegDiff, diffusion medical, probabilistic
  - 总结: 该工作将扩散概率模型用于医学图像分割，被用来说明扩散方法在医学分割中的应用。

- [AY-14] Zhaohu Xing, 2024
  - 标题: Segmamba: Long-range sequential modeling mamba for 3d medical image segmentation
  - 关键词: SegMamba, 3D medical, long-range
  - 总结: 该工作将Mamba用于3D医学图像的长序列建模分割，被用来说明Mamba在医学分割中的应用。

- [AY-15] Chiyuan Zhang, 2021
  - 标题: Understanding deep learning (still) requires rethinking generalization
  - 关键词: generalization, deep learning, rethinking
  - 总结: 该工作被用来论证深度学习在训练数据有限时的泛化挑战。

- [AY-27] Lei Zhu, 2024
  - 标题: Scaling the codebook size of vq-gan to 100,000 with a utilization rate of 99%
  - 关键词: VQ-GAN, codebook scaling, representation
  - 总结: 该工作涉及VQ-GAN码本缩放，被用来说明DINO系列在表征学习中的应用范围。



##### Dataset

- [AY-31] Noel CF Codella, 2018
  - 标题: Skin lesion analysis toward melanoma detection: A challenge at the 2017 international symposium on biomedical imaging (isbi), hosted by the international skin imaging collaboration (isic)
  - 关键词: ISIC dataset, skin lesion, benchmark
  - 总结: 该文献描述了ISIC皮肤病变分割基准数据集，是本文三个医学图像评估基准之一。

- [AY-32] Haifan Gong, 2023
  - 标题: Thyroid region prior guided attention for ultrasound segmentation of thyroid nodules
  - 关键词: TN3K dataset, thyroid nodule, ultrasound
  - 总结: 该文献描述了TN3K甲状腺结节分割数据集，是本文三个医学图像评估基准之一。

- [AY-50] Xiaowei Hu, 2021
  - 标题: Revisiting shadow detection: A new benchmark dataset for complex world
  - 关键词: shadow detection benchmark, complex world, FSD
  - 总结: 该工作提出了复杂世界的阴影检测新基准数据集，被纳入ViSha数据集的对比实验。

- [AY-33] Debesh Jha, 2019
  - 标题: Kvasir-seg: A segmented polyp dataset
  - 关键词: Kvasir-SEG, polyp segmentation, colonoscopy
  - 总结: 该文献描述了Kvasir-SEG息肉分割数据集，是本文三个医学图像评估基准之一。

- [AY-35] Jiaying Lin, 2023
  - 标题: Learning to detect mirrors from videos via dual correspondences
  - 关键词: VMD-D dataset, video mirror, dual correspondence
  - 总结: 该文献既描述了VMD-D视频镜面检测数据集，也提出了双对应视频镜面检测方法。

- [AY-36] Xin Yang, 2019
  - 标题: Where is my mirror? In Proceedings of the IEEE/CVF International Conference on Computer Vision, pp
  - 关键词: MSD dataset, mirror detection, MirrorNet
  - 总结: 该文献既描述了MSD静态镜面分割数据集，也提出了MirrorNet方法，被用于MSD和VMD-D的对比实验。



##### Contrast

- [AY-24] Yifan Gao, 2025
  - 标题: Dino u-net: Exploiting highfidelity dense features from foundation models for medical image segmentation, 2025
  - 关键词: DINO U-Net, dense features, medical
  - 总结: 该工作代表了利用DINO密集特征进行医学图像分割的技术路线，与本文方法形成对比。

- [AY-4] Alexander Kirillov, 2023
  - 标题: Segment anything
  - 关键词: SAM, zero-shot, segment anything
  - 总结: 该工作提出了Segment Anything模型，被用来说明零样本分割方法虽然强大但需要大量微调且计算开销大。

- [AY-8] Maciej A Mazurowski, 2023
  - 标题: Segment anything model for medical image analysis: an experimental study
  - 关键词: SAM medical, experimental study, medical image
  - 总结: 该工作对SAM模型在医学图像分析中的应用进行了实验研究，佐证了SAM在医学领域的适用性但同时也暗示了其局限性。

- [AY-29] Lihe Yang, 2025
  - 标题: Unimatch v2: Pushing the limit of semi-supervised semantic segmentation
  - 关键词: UniMatch v2, semi-supervised, segmentation
  - 总结: 该工作代表了半监督语义分割中重型解码器的技术路线，被用来说明现有DINO适配方法的复杂度问题。

- [AY-16] Zhuoyang Zhang, 2024
  - 标题: Efficientvit-sam: Accelerated segment anything model without performance loss
  - 关键词: EfficientViT-SAM, accelerated SAM, efficiency
  - 总结: 该工作尝试加速SAM模型，被用来说明SAM计算开销大的问题以及轻量化努力的必要性。

- [AY-17] Xu Zhao, 2023
  - 标题: Fast segment anything
  - 关键词: Fast SAM, segment anything, speed
  - 总结: 该工作提出了快速SAM方法，被用来说明SAM模型在轻量或资源受限场景中的计算开销问题。



##### Tooling

- [AY-37] Ilya Loshchilov, 2017
  - 标题: Decoupled weight decay regularization
  - 关键词: AdamW, optimizer, weight decay
  - 总结: 该文献描述了AdamW优化器，是本文实验设置中使用的优化方法。

- [AY-38] Adam Paszke, 2019
  - 标题: Pytorch: An imperative style, highperformance deep learning library
  - 关键词: PyTorch, deep learning framework, implementation
  - 总结: 该文献描述了PyTorch框架，是本文实验的实现基础。

- [AY-39] Tomas F Yago Vicente, 2017
  - 标题: Leave-one-out kernel optimization for shadow detection and removal
  - 关键词: shadow BER, evaluation metric, leave-one-out
  - 总结: 该文献描述了阴影检测中使用的评估指标方法，是本文阴影分割实验指标的来源。



##### Component

- [AY-30] Rene Ranftl, 2021
  - 标题: Vision transformers for dense prediction
  - 关键词: ViT dense prediction, upsampling, decoder design
  - 总结: 该工作提出了Vision Transformer用于密集预测的方法，其升采样和通道集成设计被本文L-Decoder借鉴。





#### 时间线分析

##### 早期
早期工作奠定了图像分割的基础架构与评估方法。FCN (Long et al., 2015) 开创了全卷积分割范式，U-Net (Ronneberger et al., 2015) 确立了编码器-解码器架构在医学图像分割中的主导地位。SegNet、Attention U-Net、R2U-Net 等变体进一步丰富了 CNN 分割方法。同时，PyTorch 框架和 AdamW 优化器等工具性工为后续深度学习实验提供了基础设施。MSD、Kvasir-SEG、ISIC 等基准数据集和 MirrorNet 等镜面检测方法也在这一时期建立。


- [AY-40] Md Zahangir Alom, 2018: Recurrent residual convolutional neural network based on u-net (r2u-net) for medical image segmentation

- [AY-41] Vijay Badrinarayanan, 2017: Segnet: A deep convolutional encoderdecoder architecture for image segmentation

- [AY-31] Noel CF Codella, 2018: Skin lesion analysis toward melanoma detection: A challenge at the 2017 international symposium on biomedical imaging (isbi), hosted by the international skin imaging collaboration (isic)

- [AY-33] Debesh Jha, 2019: Kvasir-seg: A segmented polyp dataset

- [AY-6] Jonathan Long, 2015: Fully convolutional networks for semantic segmentation

- [AY-37] Ilya Loshchilov, 2017: Decoupled weight decay regularization

- [AY-56] Xiankai Lu, 2019: See more, know more: Unsupervised video object segmentation with co-attention siamese networks

- [AY-58] Seoung Wug Oh, 2019: Video object segmentation using space-time memory networks

- [AY-43] Ozan Oktay, 2018: Attention u-net: Learning where to look for the pancreas

- [AY-38] Adam Paszke, 2019: Pytorch: An imperative style, highperformance deep learning library

- [AY-10] Olaf Ronneberger, 2015: U-net: Convolutional networks for biomedical image segmentation

- [AY-39] Tomas F Yago Vicente, 2017: Leave-one-out kernel optimization for shadow detection and removal

- [AY-36] Xin Yang, 2019: Where is my mirror? In Proceedings of the IEEE/CVF International Conference on Computer Vision, pp




##### 中期
中期工作将 Transformer 和自监督学习引入分割领域。DINO (Caron et al., 2021) 和 MAE (He et al., 2022) 开创了自监督视觉表征学习路线，TransUNet 将 Transformer 引入医学图像分割。Diffusion 模型（SegDiff、MedSegDiff）为分割提供了新的概率建框架。Segmenter、OneFormer 等方法推动了纯 Transformer 分割的发展。同时，镜面检测（PMDNet、VCNet、SANet、HetNet）和视频阴影检测（COS-Net、STM、STICT、Scotch-Soda）等特定任务方法也在这一时期快速发展。


- [AY-1] Tomer Amit, 2021: Segdiff: Image segmentation with diffusion probabilistic models

- [AY-18] Mathilde Caron, 2021: Emerging properties in self-supervised vision transformers

- [AY-34] Jieneng Chen, 2021: Transunet: Transformers make strong encoders for medical image segmentation

- [AY-45] Zhihao Chen, 2020: A multi-task mean teacher for semi-supervised shadow detection

- [AY-46] Ho Kei Cheng, 2021: Rethinking space-time networks with improved memory coverage for efficient video object segmentation

- [AY-47] Xinpeng Ding, 2022: Learning shadow correspondence for video shadow detection

- [AY-48] Huankang Guan, 2022: Learning semantic associations for mirror detection

- [AY-19] Kaiming He, 2022: Masked au- ´ toencoders are scalable vision learners

- [AY-50] Xiaowei Hu, 2021: Revisiting shadow detection: A new benchmark dataset for complex world

- [AY-52] Jiaying Lin, 2020: Progressive mirror detection

- [AY-53] Jiaying Lin, 2021: Rich context aggregation with reflection prior for glass surface detection

- [AY-57] Xiao Lu, 2022: Video shadow detection via spatio-temporal interpolation consistency training

- [AY-9] Shervin Minaee, 2021: Image segmentation using deep learning: A survey

- [AY-59] Gensheng Pei, 2022: Hierarchical feature alignment network for unsupervised video object segmentation

- [AY-30] Rene Ranftl, 2021: Vision transformers for dense prediction

- [AY-11] Robin Strudel, 2021: Segmenter: Transformer for semantic segmentation

- [AY-60] Xin Tan, 2022: Mirror detection with the visual chirality cue

- [AY-44] Jeya Maria Jose Valanarasu, 2022: Unext: Mlp-based rapid medical image segmentation network

- [AY-28] Enze Xie, 2021: Segformer: Simple and efficient design for semantic segmentation with transformers

- [AY-15] Chiyuan Zhang, 2021: Understanding deep learning (still) requires rethinking generalization




##### 近期
近期工作收束到本文所处的方法脉络。DINOv2/v3 (Oquab et al., 2023; Simeoni et al., 2025) 显著提升了自监督骨干的表征能力，DINO U-Net (Gao et al., 2025) 等探索了 DINO 密集特征用于医学分割。SAM (Kirillov et al., 2023) 虽然零样本能力强但计算开销大，EfficientViT-SAM 和 Fast SAM 尝试加速。Mamba 架构（U-Mamba、SegMamba、SERP-Mamba）为长序列建模提供了 CNN/Transformer 之外的新路线。TBG-Diff 等扩散方法在阴影检测中达到 SOTA。这些工作共同构成了 SegDINO 的技术背景与对比基线。


- [AY-22] Lev Ayzenberg, 2024: Dinov2 based self supervised learning for few shot medical image segmentation

- [AY-2] Reza Azad, 2024: Medical image segmentation review: The success of u-net

- [AY-23] Simon Damm, 2025: Anomalydino: Boosting patch-based few-shot anomaly detection with dinov2

- [AY-24] Yifan Gao, 2025: Dino u-net: Exploiting highfidelity dense features from foundation models for medical image segmentation, 2025

- [AY-32] Haifan Gong, 2023: Thyroid region prior guided attention for ultrasound segmentation of thyroid nodules

- [AY-49] Ruozhen He, 2023: Efficient mirror detection via multi-level heterogeneous learning

- [AY-51] Tianyu Huang, 2023: Symmetry-aware transformer-based mirror detection

- [AY-3] Jitesh Jain, 2023: Oneformer: One transformer to rule universal image segmentation

- [AY-4] Alexander Kirillov, 2023: Segment anything

- [AY-42] Chenxin Li, 2025: U-kan makes strong backbone for medical image segmentation and generation

- [AY-5] Xiangtai Li, 2024: Transformer-based visual segmentation: A survey

- [AY-35] Jiaying Lin, 2023: Learning to detect mirrors from videos via dual correspondences

- [AY-54] Fang Liu, 2024: Multi-view dynamic reflection prior for video glass surface detection

- [AY-55] Lihao Liu, 2023: Scotch and soda: A transformer video shadow detection framework

- [AY-7] Jun Ma, 2024: U-mamba: Enhancing long-range dependency for biomedical image segmentation

- [AY-8] Maciej A Mazurowski, 2023: Segment anything model for medical image analysis: an experimental study

- [AY-25] Maxime Oquab, 2023: Dinov2: Learning robust visual features without supervision

- [AY-20] Oriane Simeoni, 2025: Dinov3

- [AY-12] Hongqiu Wang, 2024: Dual-reference source-free active domain adaptation for nasopharyngeal carcinoma tumor segmentation across multiple hospitals

- [AY-26] Hongqiu Wang, 2025: Serp-mamba: Advancing high-resolution retinal vessel segmentation with selective state-space model

- [AY-13] Junde Wu, 2024: Medsegdiff: Medical image segmentation with diffusion probabilistic model

- [AY-61] Zhifeng Xie, 2024: Csfwinformer: Cross-spacefrequency window transformer for mirror detection

- [AY-14] Zhaohu Xing, 2024: Segmamba: Long-range sequential modeling mamba for 3d medical image segmentation

- [AY-29] Lihe Yang, 2025: Unimatch v2: Pushing the limit of semi-supervised semantic segmentation

- [AY-16] Zhuoyang Zhang, 2024: Efficientvit-sam: Accelerated segment anything model without performance loss

- [AY-17] Xu Zhao, 2023: Fast segment anything

- [AY-21] Haipeng Zhou, 2024: Timeline and boundary guided diffusion network for video shadow detection

- [AY-27] Lei Zhu, 2024: Scaling the codebook size of vq-gan to 100,000 with a utilization rate of 99%
