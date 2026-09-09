#### 总体总结
在 Introduction 与 Related work 中，原文先用 PDF/文档解析工具和文档图像分析工作说明真实表格结构抽取的应用背景，再把 TSR 研究划分为 image-to-sequence、graph-based 与 detection-based 三条路线。随后，作者将 Cascade R-CNN、DETR、Sparse R-CNN、PubTables1M、COCO/TEDS 等关键引用组织成一条更聚焦的论证：检测式 TSR 的瓶颈不只是模型精度，而是完整组件定义、多标签同框、proposal 生成、检测指标与结构指标错配共同造成的。最后，相关工作引用被用来为本文的三项改造铺垫依据，即单标签化 formulation、RPN 参数调整，以及局部特征与长程依赖的联合建模。


#### 关键文献

- [AY-22] Cai, Z., 2018: Cascade r-cnn: Delving into high quality object detection (Baseline)

- [AY-23] Carion, N., 2020: End-to-end object detection with transformers (Baseline)

- [AY-24] Dai, J., 2017: Deformable convolutional networks (Component)

- [AY-1] Fernandes, J., 2023: Tablestrrec: framework for table structure recognition in data sheet images (Baseline)

- [AY-26] Lin, T.-Y., 2014: Microsoft coco: Common objects in context (Dataset)

- [AY-28] Smock, B., 2022: Pubtables-1 m: Towards comprehensive table extraction from unstructured documents (Dataset)

- [AY-37] Vaswani, A., 2017: Attention is all you need (Historical)

- [AY-17] Zhong, X., 2020: Image-based table recognition: data, model, and evaluation (Dataset)



#### 范围
- 章节: Introduction + Related work
- 行号: 20-68

#### 按功能归类


##### Background

- [AY-39] Adiga, D., 2019
  - 标题: Table structure recognition based on cell relationship, a bottom-up approach
  - 关键词: TSR, cell relationship, prior work
  - 总结: 原文使用《Table structure recognition based on cell relationship, a bottom-up approach》来支撑“早期 cell-relationship TSR 路线”这一论述位置。具体作用是：原文在 Related work 中把它列为近年来 TSR 研究之一，用来铺出 TSR 方法族谱。

- [AY-31] Bacea, D.-S., 2023
  - 标题: Single stage architecture for improved accuracy realtime object detection on mobile devices
  - 关键词: one-stage detector, mobile detection, YOLO context
  - 总结: 原文使用《Single stage architecture for improved accuracy realtime object detection on mobile devices》来支撑“一阶段目标检测器”这一论述位置。具体作用是：原文借它和 YOLO 系列一起说明一阶段检测器把 proposal、分类和回归整合到单一网络中。

- [AY-35] Chen, F., 2023
  - 标题: Enhanced training of query-based object detection via selective query recollection
  - 关键词: query recollection, DETR series, training
  - 总结: 原文使用《Enhanced training of query-based object detection via selective query recollection》来支撑“query-based detector 训练改良”这一论述位置。具体作用是：原文在介绍 DETR 系列阶段职责不平衡时引用它，说明 query recollection 属于近期 query-based detector 改良。

- [AY-36] Hong, Q., 2022
  - 标题: Dynamic sparse r-cnn
  - 关键词: Sparse R-CNN variant, NMS, assignment
  - 总结: 原文使用《Dynamic sparse r-cnn》来支撑“Dynamic Sparse R-CNN”这一论述位置。具体作用是：原文在 end-to-end detector 脉络中提到它，说明 DETR 类方法可通过 many-to-one assignment 和 NMS 扩展。

- [AY-2] Hu, P., 2021
  - 标题: Touching text line segmentation combined local baseline and connected component for uchen tibetan historical documents
  - 关键词: document analysis, text line segmentation, historical documents
  - 总结: 原文使用《Touching text line segmentation combined local baseline and connected component for uchen tibetan historical documents》来支撑“文档图像分析任务”这一论述位置。具体作用是：原文在引言中把它作为 document analysis 的相关任务示例，说明 TSR 位于更广的文档理解应用背景中。

- [AY-4] Li, C., 2022
  - 标题: Yolov6: A singlestage object detection framework for industrial applications
  - 关键词: YOLO, one-stage detector, industrial detection
  - 总结: 原文使用《Yolov6: A singlestage object detection framework for industrial applications》来支撑“YOLOv6 一阶段检测”这一论述位置。具体作用是：原文用它和其他 YOLO 文献共同说明一阶段检测器的代表路线与实时检测背景。

- [AY-29] Sun, P., 2021
  - 标题: What makes for end-to-end object detection? In International conference on machine learning (pp
  - 关键词: one-to-one assignment, NMS, end-to-end detection
  - 总结: 原文使用《What makes for end-to-end object detection? In International conference on machine learning (pp》来支撑“end-to-end object detection 成因分析”这一论述位置。具体作用是：原文用它说明 one-to-one label assignment 有助于 end-to-end detector，但不足以完全移除 NMS。

- [AY-32] Tian, Z., 2019
  - 标题: Fcos: Fully convolutional one-stage object detection
  - 关键词: FCOS, one-stage, detector taxonomy
  - 总结: 原文使用《Fcos: Fully convolutional one-stage object detection》来支撑“FCOS 一阶段检测器”这一论述位置。具体作用是：原文用它作为 one-stage detector 代表，帮助区分 one-stage 与 two-stage 检测范式。

- [AY-33] Wang, C.-Y., 2023
  - 标题: YOLOv7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors
  - 关键词: YOLOv7, real-time detection, one-stage
  - 总结: 原文使用《YOLOv7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors》来支撑“YOLOv7 实时检测”这一论述位置。具体作用是：原文将它列入 YOLO 系列，说明一阶段检测器在实时目标检测中的代表性。

- [AY-12] Wu, X., 2023
  - 标题: Drfn: A unified framework for complex document layout analysis
  - 关键词: document layout, visually rich documents, deep learning
  - 总结: 原文使用《Drfn: A unified framework for complex document layout analysis》来支撑“文档版面分析”这一论述位置。具体作用是：原文在引言中把它作为 document layout analysis 代表，说明文档图像通常先被转化为视觉理解任务。

- [AY-15] Yu, F., 2023
  - 标题: An effective method for figures and tables detection in academic literature
  - 关键词: table detection, academic literature, document images
  - 总结: 原文使用《An effective method for figures and tables detection in academic literature》来支撑“学术文献图表检测”这一论述位置。具体作用是：原文在引言中把它作为 Table Detection 代表，说明 TSR 前置任务和文档图像检测背景。

- [AY-34] Zhang, S., 2023
  - 标题: Dense distinct query for end-to-end object detection
  - 关键词: dense queries, DDQ, end-to-end detection
  - 总结: 原文使用《Dense distinct query for end-to-end object detection》来支撑“Dense Distinct Queries”这一论述位置。具体作用是：原文用它说明 DETR/query 路线中 dense queries 与 one-to-one assignment 的优化问题及 DDQ 改良。



##### Baseline

- [AY-22] Cai, Z., 2018
  - 标题: Cascade r-cnn: Delving into high quality object detection
  - 关键词: Cascade R-CNN, two-stage detection, RPN
  - 总结: 原文使用《Cascade r-cnn: Delving into high quality object detection》来支撑“Cascade R-CNN 两阶段检测器”这一论述位置。具体作用是：原文把它作为典型 two-stage detector 和本文改造对象，用来说明 RPN、proposal 与多标签同框问题的限制。

- [AY-23] Carion, N., 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, set prediction, transformer detector
  - 总结: 原文使用《End-to-end object detection with transformers》来支撑“DETR / transformer-based end-to-end 检测”这一论述位置。具体作用是：原文用它界定 transformer-based detection models，并与 Cascade R-CNN 对比其处理多标签检测的潜力。

- [AY-1] Fernandes, J., 2023
  - 标题: Tablestrrec: framework for table structure recognition in data sheet images
  - 关键词: detection-based TSR, TableStrRec, information loss
  - 总结: 原文使用《Tablestrrec: framework for table structure recognition in data sheet images》来支撑“TableStrRec 检测式 TSR”这一论述位置。具体作用是：原文把它作为 detection-based TSR 代表，用来说明只定义部分表格组件会造成 header 信息缺失或 formulation 过简。

- [AY-25] Hashmi, K. A., 2021
  - 标题: Guided table structure recognition through anchor optimization
  - 关键词: anchor optimization, detection TSR, Column Header
  - 总结: 原文使用《Guided table structure recognition through anchor optimization》来支撑“anchor optimization TSR”这一论述位置。具体作用是：原文把它列为检测模型加后处理的 TSR 既有工作，并指出这类方法常未定义 Column Header。

- [AY-3] Huang, Y., 2023
  - 标题: Improving table structure recognition with visual-alignment sequential coordinate modeling
  - 关键词: image-to-sequence, visual alignment, coordinate decoder
  - 总结: 原文使用《Improving table structure recognition with visual-alignment sequential coordinate modeling》来支撑“VAST / visual-alignment image-to-sequence TSR”这一论述位置。具体作用是：原文用它代表 image-to-sequence TSR 中关注 cell bounding box 精度和视觉对齐损失的路线。

- [AY-40] Liu, H., 2022
  - 标题: Neural collaborative graph machines for table structure recognition
  - 关键词: graph-based TSR, relation modeling, table cells
  - 总结: 原文使用《Neural collaborative graph machines for table structure recognition》来支撑“协同图机器 TSR”这一论述位置。具体作用是：原文在 graph-based TSR 综述中引用它，说明图建模路线可用于表格结构关系恢复。

- [AY-5] Ly, N. T., 2023
  - 标题: An end-to-end multi-task learning model for image-based table recognition
  - 关键词: multi-task TSR, HTML generation, cell recognition
  - 总结: 原文使用《An end-to-end multi-task learning model for image-based table recognition》来支撑“MTL-TabNet 多任务 image-based TSR”这一论述位置。具体作用是：原文把它作为 image-to-sequence TSR 代表，说明多解码器同时处理 cell box、内容识别和 HTML 生成。

- [AY-6] Ma, C., 2023
  - 标题: Robust table detection and structure recognition from heterogeneous document images
  - 关键词: grid CNN, separator prediction, heterogeneous documents
  - 总结: 原文使用《Robust table detection and structure recognition from heterogeneous document images》来支撑“RobustTabNet / heterogeneous documents”这一论述位置。具体作用是：原文在 graph/grid 路线中引用它，说明先预测行列分隔线再用 Grid CNN 合并单元格的做法。

- [AY-8] Nassar, A., 2022
  - 标题: Tableformer: Table structure understanding with transformers
  - 关键词: TableFormer, transformer TSR, baseline
  - 总结: 原文使用《Tableformer: Table structure understanding with transformers》来支撑“TableFormer transformer TSR”这一论述位置。具体作用是：原文在引言中把它列为 TSR 研究代表，用来显示 image-to-sequence / transformer TSR 已经是重要对比路线。

- [AY-44] Nguyen, N. Q., 2023
  - 标题: Formerge: Recover spanning cells in complex table structure using transformer network
  - 关键词: spanning cells, transformer, complex tables
  - 总结: 原文使用《Formerge: Recover spanning cells in complex table structure using transformer network》来支撑“FOR MERGE / spanning cell 恢复”这一论述位置。具体作用是：原文在 graph-based 或 grid-based 综述中引用它，说明 transformer network 可用于复杂表格 spanning cell 恢复。

- [AY-9] Qiao, L., 2021
  - 标题: Lgpma: Complicated table structure recognition with local and global pyramid mask alignment
  - 关键词: LGPMA, mask alignment, cell matching
  - 总结: 原文使用《Lgpma: Complicated table structure recognition with local and global pyramid mask alignment》来支撑“LGPMA 局部/全局金字塔 mask 对齐”这一论述位置。具体作用是：原文把它作为 graph-based TSR 的代表，用来说明 cell localization、matching 和 empty-cell merging 管线。

- [AY-42] Schreiber, S., 2017
  - 标题: Deepdesrt: Deep learning for detection and structure recognition of tables in document images
  - 关键词: DeepDeSRT, table detection, structure recognition
  - 总结: 原文使用《Deepdesrt: Deep learning for detection and structure recognition of tables in document images》来支撑“DeepDeSRT 检测与结构识别”这一论述位置。具体作用是：原文把它放在早期 TSR 研究列表中，用来代表深度学习检测表格并识别结构的基础路线。

- [AY-20] Shen, H., 2023
  - 标题: Divide rows and conquer cells: Towards structure recognition for large tables
  - 关键词: large tables, error accumulation, two-step decoding
  - 总结: 原文使用《Divide rows and conquer cells: Towards structure recognition for large tables》来支撑“大表格 row/cell 分治识别”这一论述位置。具体作用是：原文在 image-to-sequence TSR 中引用它，说明大尺寸输入下自回归解码存在错误累积，DRCC 用两步解码缓解。

- [AY-27] Siddiqui, S. A., 2019
  - 标题: Deeptabstr: Deep learning based table structure recognition
  - 关键词: DeepTabStR, row-column detection, information loss
  - 总结: 原文使用《Deeptabstr: Deep learning based table structure recognition》来支撑“DeepTabStR 检测式 TSR”这一论述位置。具体作用是：原文用它作为 detection-based TSR 的早期代表，并指出仅检测 row/column 会导致 spanning/header 信息丢失。

- [AY-45] Tensmeyer, C., 2019
  - 标题: Deep splitting and merging for table structure decomposition
  - 关键词: split-and-merge, grid cells, table decomposition
  - 总结: 原文使用《Deep splitting and merging for table structure decomposition》来支撑“SPLERGE split-and-merge TSR”这一论述位置。具体作用是：原文在 grid-based 路线中引用它，说明先预测 row/column projections 再 merge grid cells 的方法。

- [AY-13] Xiao, B., 2022
  - 标题: Efficient information sharing in ict supply chain social network via table structure recognition
  - 关键词: prior TSR work, ICT supply chain, detection formulation
  - 总结: 原文使用《Efficient information sharing in ict supply chain social network via table structure recognition》来支撑“作者前作中的 ICT 供应链 TSR”这一论述位置。具体作用是：原文把它作为 detection-based TSR 相关前作之一，并在 formulation 讨论中说明其简化组件定义的局限。

- [AY-46] Xue, W., 2021
  - 标题: Tgrnet: A table graph reconstruction network for table structure recognition
  - 关键词: graph reconstruction, logical location, GCN
  - 总结: 原文使用《Tgrnet: A table graph reconstruction network for table structure recognition》来支撑“TGRNet 图重建 TSR”这一论述位置。具体作用是：原文在 graph-based 方法中引用它，说明通过 cell detection 与 logical location prediction 共同重建表格结构。

- [AY-21] Ye, J., 2021
  - 标题: Pingan-vcgroup’s solution for icdar 2021 competition on scientific literature parsing task b: Table recognition to html
  - 关键词: ICDAR, table to HTML, competition
  - 总结: 原文使用《Pingan-vcgroup’s solution for icdar 2021 competition on scientific literature parsing task b: Table recognition to html》来支撑“ICDAR 表格识别竞赛方案”这一论述位置。具体作用是：原文引用它作为 TSR 研究和表格转 HTML 任务的代表工作，用来补充已有方法谱系。

- [AY-47] Zhang, Z., 2022
  - 标题: Split, embed and merge: An accurate table structure recognizer
  - 关键词: segmentation, embedder, grid merging
  - 总结: 原文使用《Split, embed and merge: An accurate table structure recognizer》来支撑“SEM split-embed-merge TSR”这一论述位置。具体作用是：原文在 grid-based 方法中引用它，说明 segmentation、Embedder 和 Merger 网络可用于 grid element 合并。

- [AY-16] Zheng, X., 2021
  - 标题: Global table extractor (gte): A framework for joint table identification and cell structure recognition using visual context
  - 关键词: GTE, visual context, TSR dataset
  - 总结: 原文使用《Global table extractor (gte): A framework for joint table identification and cell structure recognition using visual context》来支撑“GTE 视觉上下文表格抽取”这一论述位置。具体作用是：原文在引言和 Related work 中把它作为 TSR/表格识别代表，并在实验贡献中关联 FinTabNet。

- [AY-38] Zhu, X., 2021
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, transformer detector, multi-scale attention
  - 总结: 原文使用《Deformable detr: Deformable transformers for end-to-end object detection》来支撑“Deformable DETR”这一论述位置。具体作用是：原文把它列为 transformer-based detection model 的变体，用来界定本文比较的 end-to-end detector 家族。



##### Dataset

- [AY-30] Chi, Z., 2019
  - 标题: Complicated table structure recognition
  - 关键词: SciTSR, TSR dataset, evaluation
  - 总结: 原文使用《Complicated table structure recognition》来支撑“SciTSR 表格结构识别数据集”这一论述位置。具体作用是：原文既在引言中把它列为 TSR 代表研究，也在贡献和实验设置中用它作为主要评测数据集。

- [AY-26] Lin, T.-Y., 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, mAP, object detection metric
  - 总结: 原文使用《Microsoft coco: Common objects in context》来支撑“COCO 检测基准”这一论述位置。具体作用是：原文借 COCO 说明常规检测框架默认参数和 mAP/IoU 评价来源，并强调这些设置不一定适合 TSR。

- [AY-28] Smock, B., 2022
  - 标题: Pubtables-1 m: Towards comprehensive table extraction from unstructured documents
  - 关键词: PubTables1M, six components, multi-label detection
  - 总结: 原文使用《Pubtables-1 m: Towards comprehensive table extraction from unstructured documents》来支撑“PubTables1M 六类表格组件定义”这一论述位置。具体作用是：原文反复引用它作为信息完整但多标签同框的关键 formulation，对本文 pseudo-class 单标签改写最直接。

- [AY-17] Zhong, X., 2020
  - 标题: Image-based table recognition: data, model, and evaluation
  - 关键词: PubTabNet, TEDS, HTML sequence
  - 总结: 原文使用《Image-based table recognition: data, model, and evaluation》来支撑“PubTabNet 数据、模型与评价”这一论述位置。具体作用是：原文用它定义 PubTabNet / TEDS 相关背景，并作为 image-based table recognition 的关键基准。



##### Component

- [AY-24] Dai, J., 2017
  - 标题: Deformable convolutional networks
  - 关键词: deformable convolution, local features, TEDS mismatch
  - 总结: 原文使用《Deformable convolutional networks》来支撑“deformable convolution”这一论述位置。具体作用是：原文引用它说明 deformable convolution 可改善局部特征，但也用它引出单独优化检测边界可能损害 TEDS 的风险。

- [AY-43] He, K., 2017
  - 标题: Mask r-cnn
  - 关键词: Mask R-CNN, segmentation, cell localization
  - 总结: 原文使用《Mask r-cnn》来支撑“Mask R-CNN / instance segmentation 基础”这一论述位置。具体作用是：原文在 graph-based TSR 中用它说明 LGPMA 等方法可把 cell localization 表述为检测或分割问题。

- [AY-41] Lu, N., 2021
  - 标题: Master: Multiaspect non-local network for scene text recognition
  - 关键词: MASTER, scene text, encoder-decoder
  - 总结: 原文使用《Master: Multiaspect non-local network for scene text recognition》来支撑“MASTER 场景文本识别架构”这一论述位置。具体作用是：原文说明 TableMaster 继承 MASTER 的 transformer 场景文本生成架构，用来定位 image-to-sequence TSR 的模型来源。



##### Tooling

- [AY-18] JaidedA, I., 2022
  - 标题: Easyocr
  - 关键词: OCR, tooling, text extraction
  - 总结: 原文使用《Easyocr》来支撑“EasyOCR 工具”这一论述位置。具体作用是：原文在说明部分 image-to-sequence TSR 需要或规避外部 OCR 工具时引用它，作为 OCR 工具依赖的例子。

- [AY-19] Kuang, Z., 2021
  - 标题: Mmocr: A comprehensive toolbox for text detection, recognition and understanding
  - 关键词: MMOCR, OCR toolbox, text recognition
  - 总结: 原文使用《Mmocr: A comprehensive toolbox for text detection, recognition and understanding》来支撑“MMOCR 工具箱”这一论述位置。具体作用是：原文将它与 EasyOCR 一起作为 OCR / text detection 工具示例，说明端到端 TSR 尝试减少外部 OCR 依赖。

- [AY-7] Mendes, J., 2017
  - 标题: Tabula: A language to model spreadsheet tables
  - 关键词: PDF parsing, table extraction, tool limitation
  - 总结: 原文使用《Tabula: A language to model spreadsheet tables》来支撑“Tabula PDF 表格抽取”这一论述位置。具体作用是：原文在引言中引用它说明传统 PDF 表格解析工具能抽取文本和表格，但难以处理复杂结构和扫描图像。

- [AY-10] Rastan, R., 2019
  - 标题: Texus: A unified framework for extracting and understanding tables in pdf documents
  - 关键词: PDF tables, table extraction, visual context
  - 总结: 原文使用《Texus: A unified framework for extracting and understanding tables in pdf documents》来支撑“TexUS PDF 表格抽取框架”这一论述位置。具体作用是：原文在引言中用它说明直接解析 PDF 的工具/系统仍难以覆盖复杂结构和扫描文档。

- [AY-11] Singer-Vine, J., 2022
  - 标题: Pdfplumber
  - 关键词: PDF parsing, pdfplumber, table extraction
  - 总结: 原文使用《Pdfplumber》来支撑“pdfplumber PDF 表格工具”这一论述位置。具体作用是：原文把它作为直接解析 PDF 表格的工具例子，用于界定传统解析方法在复杂结构和扫描文档上的不足。

- [AY-14] Xiao, B., 2023
  - 标题: Multi-modal ocr system for the ict global supply chain
  - 关键词: OCR, multimodal system, text extraction
  - 总结: 原文使用《Multi-modal ocr system for the ict global supply chain》来支撑“多模态 OCR 系统”这一论述位置。具体作用是：原文用它说明部分端到端 TSR 或图像表格处理仍与 OCR/text extraction 工具链相关。



##### Historical

- [AY-37] Vaswani, A., 2017
  - 标题: Attention is all you need
  - 关键词: transformer, attention, sequence modeling
  - 总结: 原文使用《Attention is all you need》来支撑“Transformer 架构”这一论述位置。具体作用是：原文多处引用它作为 image-to-sequence TSR、DETR 和 transformer-based detectors 的共同技术背景。
