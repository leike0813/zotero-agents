#### 总体总结
SAM 3 论文通过整合多个研究脉络，构建了一个统一的概念分割框架。论文以 SAM 2 的视频分割能力为基础，引入 Perception Encoder 作为共享视觉骨干，结合 DETR 系列的端到端检测架构，实现了对任意视觉概念的 promptable 分割。在方法设计上，论文借鉴了开放词汇检测的思路，使模型能够处理训练时未见的概念类别。


#### 关键文献

- [AY-4] Daniel Bolya, 2025: Perception encoder: The best visual embeddings are not at the output of the network (Uncategorized)

- [AY-8] Zhi Cai, 2024: Align-detr: Enhancing end-to-end object detection with aligned loss (Uncategorized)

- [AY-14] Zheng Ding, 2022: Open-vocabulary universal image segmentation with maskclip (Uncategorized)

- [AY-15] Xiuye Gu, 2021: Open-vocabulary object detection via vision and language knowledge distillation (Uncategorized)

- [AY-10] Zhengdong Hu, 2023: DAC-DETR: Divide the attention layers and conquer (Uncategorized)

- [AY-7] Aishwarya Kamath, 2021: Mdetr-modulated detection for end-to-end multi-modal understanding (Uncategorized)

- [AY-18] Feng Liang, 2023: Open-vocabulary semantic segmentation with mask-adapted clip (Uncategorized)

- [AY-11] Yutong Lin, 2023: Detr doesn’t need multi-scale or locality design (Uncategorized)

- [AY-19] Matthias Minderer, 2022: Simple open-vocabulary object detection (Uncategorized)

- [AY-3] Matthias Minderer, 2024: Scaling open-vocabulary object detection (Uncategorized)

- [AY-2] Nikhila Ravi, 2024: SAM 2: Segment anything in images and videos (Uncategorized)

- [AY-41] Hao Zhang, 2022: Dino: Detr with improved denoising anchor boxes for end-to-end object detection (Uncategorized)

- [AY-12] Xizhou Zhu, 2020: Deformable detr: Deformable transformers for end-to-end object detection (Uncategorized)



#### 范围
- 章节：Introduction + Related Work
- 行号：11-185

#### 按功能归类


##### Background

- [AY-31] Philipp Bergmann, 2019
  - 标题：Tracking without bells and whistles
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-32] Alex Bewley, 2016
  - 标题：Simple online and realtime tracking
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-9] Bowen Cheng, 2021
  - 标题：Schwing, and Alexander Kirillov. Per-pixel classification is not all you need for semantic segmentation
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-34] Christoph Feichtenhofer, 2017
  - 标题：Detect to track and track to detect
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-6] Agrim Gupta, 2019
  - 标题：Lvis: A dataset for large vocabulary instance segmentation
  - 关键词：dataset, training data, benchmark
  - 总结：论文引用这些数据集工作以说明训练数据来源或评估基准。

- [AY-35] Junjie Jiang, 2025
  - 标题：Sam2mot: A novel paradigm of multi-object tracking by segmentation
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-25] Shilong Liu, 2023
  - 标题：Grounding dino: Marrying dino with grounded pre-training for open-set object detection
  - 关键词：visual grounding, referring expression, phrase localization
  - 总结：论文引用视觉定位工作以展示相关研究脉络。

- [AY-36] Tim Meinhardt, 2022
  - 标题：Trackformer: Multi-object tracking with transformers
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-27] Hanoona Rasheed, 2024
  - 标题：Glamm: Pixel grounding large multimodal model
  - 关键词：visual grounding, referring expression, phrase localization
  - 总结：论文引用视觉定位工作以展示相关研究脉络。

- [AY-37] Peize Sun, 2020
  - 标题：Transtrack: Multiple object tracking with transformer
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-38] Nicolai Wojke, 2017
  - 标题：Simple online and realtime tracking with a deep association metric
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-39] En Yu, 2023
  - 标题：Motrv3: Release-fetch supervision for end-to-end multi-object tracking
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-40] Fangao Zeng, 2022
  - 标题：Motr: End-to-end multipleobject tracking with transformer
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。



##### Uncategorized

- [AY-4] Daniel Bolya, 2025
  - 标题：Perception encoder: The best visual embeddings are not at the output of the network
  - 关键词：Perception Encoder, visual backbone, feature embeddings
  - 总结：SAM 3 的检测器和跟踪器共享 Perception Encoder 骨干网络，提供对齐的视觉 - 语言输入。

- [AY-8] Zhi Cai, 2024
  - 标题：Align-detr: Enhancing end-to-end object detection with aligned loss
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-33] Jinkun Cao, 2023
  - 标题：Observation-centric sort: Rethinking sort for robust multi-object tracking
  - 关键词：tracking-by-detection, SORT, multi-object tracking
  - 总结：论文将 SAM 3 的跟踪方法与传统的 tracking-by-detection 方法进行对比。

- [AY-5] Nicolas Carion, 2020
  - 标题：End-to-end object detection with transformers
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-21] Gheorghe Comanici, 2025
  - 标题：Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation agentic capabilities
  - 关键词：MLLM, multimodal, reasoning
  - 总结：SAM 3 可与 MLLM 结合使用以处理更复杂的语言查询。

- [AY-22] Matt Deitke, 2025
  - 标题：Molmo and pixmo: Open weights and open data for state-of-the-art vision-language models
  - 关键词：MLLM, multimodal, reasoning
  - 总结：SAM 3 可与 MLLM 结合使用以处理更复杂的语言查询。

- [AY-14] Zheng Ding, 2022
  - 标题：Open-vocabulary universal image segmentation with maskclip
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-13] Abhimanyu Dubey, 2024
  - 标题：The llama 3 herd of models
  - 关键词：MLLM, multimodal, reasoning
  - 总结：SAM 3 可与 MLLM 结合使用以处理更复杂的语言查询。

- [AY-15] Xiuye Gu, 2021
  - 标题：Open-vocabulary object detection via vision and language knowledge distillation
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-10] Zhengdong Hu, 2023
  - 标题：DAC-DETR: Divide the attention layers and conquer
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-16] Qing Jiang, 2024
  - 标题：T-rex2: Towards generic object detection via text-visual prompt synergy
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-7] Aishwarya Kamath, 2021
  - 标题：Mdetr-modulated detection for end-to-end multi-modal understanding
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-1] Alexander Kirillov, 2023
  - 标题：Segment anything
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-23] Xin Lai, 2024
  - 标题：Lisa: Reasoning segmentation via large language model
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-24] Chunyuan Li, 2022
  - 标题：Elevater: A benchmark and toolkit for evaluating language-augmented visual models. Advances in Neural Information Processing Systems, 35:9287–9301
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-17] Feng Li, 2023
  - 标题：Visual in-context prompting. 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pp. 12861–12871
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-18] Feng Liang, 2023
  - 标题：Open-vocabulary semantic segmentation with mask-adapted clip
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-11] Yutong Lin, 2023
  - 标题：Detr doesn’t need multi-scale or locality design
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-19] Matthias Minderer, 2022
  - 标题：Simple open-vocabulary object detection
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-3] Matthias Minderer, 2024
  - 标题：Scaling open-vocabulary object detection
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-26] Bryan A Plummer, 2020
  - 标题：Revisiting image-language networks for open-ended phrase detection. IEEE transactions on pattern analysis and machine intelligence, 44(4):2155–2167
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-20] Alec Radford, 2021
  - 标题：Learning transferable visual models from natural language supervision
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-2] Nikhila Ravi, 2024
  - 标题：SAM 2: Segment anything in images and videos
  - 关键词：SAM 2, promptable segmentation, video segmentation
  - 总结：SAM 3 继承并扩展了 SAM 2 的架构，将跟踪能力与新的概念分割功能结合。

- [AY-28] Junfeng Wu, 2024
  - 标题：General object foundation model for images and videos at scale
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-29] Yifan Xu, 2023
  - 标题：Multi-modal queried object detection in the wild. Advances in Neural Information Processing Systems, 36:4452–4469
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-41] Hao Zhang, 2022
  - 标题：Dino: Detr with improved denoising anchor boxes for end-to-end object detection
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-30] Tao Zhang, 2024
  - 标题：Omg-llava: Bridging image-level, object-level, pixel-level reasoning and understanding. Advances in neural information processing systems, 37:71737–71767
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-12] Xizhou Zhu, 2020
  - 标题：Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。





#### 时间线分析

##### 早期
2016-2019 年的早期工作建立了视频跟踪和 DETR 检测的基础方法。


- [AY-31] Philipp Bergmann, 2019: Tracking without bells and whistles

- [AY-32] Alex Bewley, 2016: Simple online and realtime tracking

- [AY-34] Christoph Feichtenhofer, 2017: Detect to track and track to detect

- [AY-6] Agrim Gupta, 2019: Lvis: A dataset for large vocabulary instance segmentation

- [AY-39] En Yu, 2023: Motrv3: Release-fetch supervision for end-to-end multi-object tracking




##### 中期
2020-2023 年的中期发展包括 DETR 改进、开放词汇检测、SAM 基础模型和跟踪器架构。


- [AY-8] Zhi Cai, 2024: Align-detr: Enhancing end-to-end object detection with aligned loss

- [AY-33] Jinkun Cao, 2023: Observation-centric sort: Rethinking sort for robust multi-object tracking

- [AY-5] Nicolas Carion, 2020: End-to-end object detection with transformers

- [AY-9] Bowen Cheng, 2021: Schwing, and Alexander Kirillov. Per-pixel classification is not all you need for semantic segmentation

- [AY-14] Zheng Ding, 2022: Open-vocabulary universal image segmentation with maskclip

- [AY-15] Xiuye Gu, 2021: Open-vocabulary object detection via vision and language knowledge distillation

- [AY-10] Zhengdong Hu, 2023: DAC-DETR: Divide the attention layers and conquer

- [AY-35] Junjie Jiang, 2025: Sam2mot: A novel paradigm of multi-object tracking by segmentation

- [AY-7] Aishwarya Kamath, 2021: Mdetr-modulated detection for end-to-end multi-modal understanding

- [AY-1] Alexander Kirillov, 2023: Segment anything

- [AY-18] Feng Liang, 2023: Open-vocabulary semantic segmentation with mask-adapted clip

- [AY-11] Yutong Lin, 2023: Detr doesn’t need multi-scale or locality design

- [AY-25] Shilong Liu, 2023: Grounding dino: Marrying dino with grounded pre-training for open-set object detection

- [AY-36] Tim Meinhardt, 2022: Trackformer: Multi-object tracking with transformers

- [AY-19] Matthias Minderer, 2022: Simple open-vocabulary object detection

- [AY-3] Matthias Minderer, 2024: Scaling open-vocabulary object detection

- [AY-26] Bryan A Plummer, 2020: Revisiting image-language networks for open-ended phrase detection. IEEE transactions on pattern analysis and machine intelligence, 44(4):2155–2167

- [AY-20] Alec Radford, 2021: Learning transferable visual models from natural language supervision

- [AY-37] Peize Sun, 2020: Transtrack: Multiple object tracking with transformer

- [AY-38] Nicolai Wojke, 2017: Simple online and realtime tracking with a deep association metric

- [AY-40] Fangao Zeng, 2022: Motr: End-to-end multipleobject tracking with transformer

- [AY-41] Hao Zhang, 2022: Dino: Detr with improved denoising anchor boxes for end-to-end object detection

- [AY-12] Xizhou Zhu, 2020: Deformable detr: Deformable transformers for end-to-end object detection




##### 近期
2024-2025 年的最新进展涵盖 SAM 2、Perception Encoder、多模态大语言模型和新一代检测跟踪系统。


- [AY-4] Daniel Bolya, 2025: Perception encoder: The best visual embeddings are not at the output of the network

- [AY-21] Gheorghe Comanici, 2025: Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation agentic capabilities

- [AY-22] Matt Deitke, 2025: Molmo and pixmo: Open weights and open data for state-of-the-art vision-language models

- [AY-13] Abhimanyu Dubey, 2024: The llama 3 herd of models

- [AY-16] Qing Jiang, 2024: T-rex2: Towards generic object detection via text-visual prompt synergy

- [AY-23] Xin Lai, 2024: Lisa: Reasoning segmentation via large language model

- [AY-24] Chunyuan Li, 2022: Elevater: A benchmark and toolkit for evaluating language-augmented visual models. Advances in Neural Information Processing Systems, 35:9287–9301

- [AY-17] Feng Li, 2023: Visual in-context prompting. 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pp. 12861–12871

- [AY-27] Hanoona Rasheed, 2024: Glamm: Pixel grounding large multimodal model

- [AY-2] Nikhila Ravi, 2024: SAM 2: Segment anything in images and videos

- [AY-28] Junfeng Wu, 2024: General object foundation model for images and videos at scale

- [AY-29] Yifan Xu, 2023: Multi-modal queried object detection in the wild. Advances in Neural Information Processing Systems, 36:4452–4469

- [AY-30] Tao Zhang, 2024: Omg-llava: Bridging image-level, object-level, pixel-level reasoning and understanding. Advances in neural information processing systems, 37:71737–71767
