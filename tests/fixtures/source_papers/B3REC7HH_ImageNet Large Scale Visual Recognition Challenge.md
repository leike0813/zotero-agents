# ImageNet Large Scale Visual Recognition Challenge

Olga Russakovsky\* · Jia Deng\* · Hao Su · Jonathan Krause · Sanjeev Satheesh · Sean Ma · Zhiheng Huang · Andrej Karpathy · Aditya Khosla · Michael Bernstein · Alexander C. Berg · Li Fei-Fei

Received: date / Accepted: date

Abstract The ImageNet Large Scale Visual Recognition Challenge is a benchmark in object category classification and detection on hundreds of object categories and millions of images. The challenge has been run annually from 2010 to present, attracting participation from more than fifty institutions.

This paper describes the creation of this benchmark dataset and the advances in object recognition that have been possible as a result. We discuss the chal-

lenges of collecting large-scale ground truth annotation, highlight key breakthroughs in categorical object recognition, provide a detailed analysis of the current state of the field of large-scale image classification and object detection, and compare the state-of-the-art computer vision accuracy with human accuracy. We conclude with lessons learned in the five years of the challenge, and propose future directions and improvements.

Keywords Dataset · Large-scale · Benchmark · Object recognition · Object detection

## 1 Introduction

Overview. The ImageNet Large Scale Visual Recognition Challenge (ILSVRC) has been running annually for five years (since 2010) and has become the standard benchmark for large-scale object recognition.1 ILSVRC follows in the footsteps of the PASCAL VOC challenge (Everingham et al., 2012), established in 2005, which set the precedent for standardized evaluation of recognition algorithms in the form of yearly competitions. As in PASCAL VOC, ILSVRC consists of two components: (1) a publically available dataset, and (2) an annual competition and corresponding workshop. The dataset allows for the development and comparison of categorical object recognition algorithms, and the competition and workshop provide a way to track the progress and discuss the lessons learned from the most successful and innovative entries each year.

The publically released dataset contains a set of manually annotated training images. A set of test images is also released, with the manual annotations withheld.2 Participants train their algorithms using the training images and then automatically annotate the test images. These predicted annotations are submitted to the evaluation server. Results of the evaluation are revealed at the end of the competition period and authors are invited to share insights at the workshop held at the International Conference on Computer Vision (ICCV) or European Conference on Computer Vision (ECCV) in alternate years.

ILSVRC annotations fall into one of two categories: (1) image-level annotation of a binary label for the presence or absence of an object class in the image, e.g., “there are cars in this image” but “there are no tigers,” and (2) object-level annotation of a tight bounding box and class label around an object instance in the image, e.g., “there is a screwdriver centered at position (20,25) with width of 50 pixels and height of 30 pixels”.

Large-scale challenges and innovations. In creating the dataset, several challenges had to be addressed. Scaling up from 19,737 images in PASCAL VOC 2010 to 1,461,406 in ILSVRC 2010 and from 20 object classes to 1000 object classes brings with it several challenges. It is no longer feasible for a small group of annotators to annotate the data as is done for other datasets (Fei-Fei et al., 2004; Criminisi, 2004; Everingham et al., 2012; Xiao et al., 2010). Instead we turn to designing novel crowdsourcing approaches for collecting large-scale annotations (Su et al., 2012; Deng et al., 2009, 2014).

Some of the 1000 object classes may not be as easy to annotate as the 20 categories of PASCAL VOC: e.g., bananas which appear in bunches may not be as easy to delineate as the basic-level categories of aeroplanes or cars. Having more than a million images makes it infeasible to annotate the locations of all objects (much less with object segmentations, human body parts, and other detailed annotations that subsets of PASCAL VOC contain). New evaluation criteria have to be defined to take into account the facts that obtaining perfect manual annotations in this setting may be infeasible.

Once the challenge dataset was collected, its scale allowed for unprecedented opportunities both in evaluation of object recognition algorithms and in developing new techniques. Novel algorithmic innovations emerge with the availability of large-scale training data. The broad spectrum of object categories motivated the need for algorithms that are even able to distinguish classes which are visually very similar. We highlight the most successful of these algorithms in this paper, and compare their performance with human-level accuracy.

Finally, the large variety of object classes in ILSVRC allows us to perform an analysis of statistical properties of objects and their impact on recognition algorithms. This type of analysis allows for a deeper understanding of object recognition, and for designing the next generation of general object recognition algorithms.

Goals. This paper has three key goals:

1. To discuss the challenges of creating this large-scale object recognition benchmark dataset,

2. To highlight the developments in object classification and detection that have resulted from this effort, and

3. To take a closer look at the current state of the field of categorical object recognition.

The paper may be of interest to researchers working on creating large-scale datasets, as well as to anybody interested in better understanding the history and the current state of large-scale object recognition.

The collected dataset and additional information about ILSVRC can be found at:

http://image-net.org/challenges/LSVRC/

## 1.1 Related work

We briefly discuss some prior work in constructing benchmark image datasets.

Image classification datasets. Caltech 101 (Fei-Fei et al., 2004) was among the first standardized datasets for multi-category image classification, with 101 object classes and commonly 15-30 training images per class. Caltech 256 (Griffin et al., 2007) increased the number of object classes to 256 and added images with greater scale and background variability. The TinyImages dataset (Torralba et al., 2008) contains 80 million 32x32 low resolution images collected from the internet using synsets in WordNet (Miller, 1995) as queries. However, since this data has not been manually verified, there are many errors, making it less suitable for algorithm evaluation. Datasets such as 15 Scenes (Oliva and Torralba, 2001; Fei-Fei and Perona, 2005; Lazebnik et al., 2006) or recent Places (Zhou et al., 2014) provide a single scene category label (as opposed to an object category).

The ImageNet dataset (Deng et al., 2009) is the backbone of ILSVRC. ImageNet is an image dataset organized according to the WordNet hierarchy (Miller, 1995). Each concept in WordNet, possibly described by multiple words or word phrases, is called a “synonym set” or “synset”. ImageNet populates 21,841 synsets of WordNet with an average of 650 manually verified and full resolution images. As a result, ImageNet contains 14,197,122 annotated images organized by the semantic hierarchy of WordNet (as of August 2014). ImageNet is larger in scale and diversity than the other image classification datasets. ILSVRC uses a subset of ImageNet images for training the algorithms and some of ImageNet’s image collection protocols for annotating additional images for testing the algorithms.

Image parsing datasets. Many datasets aim to provide richer image annotations beyond image-category labels. LabelMe (Russell et al., 2007) contains general photographs with multiple objects per image. It has bounding polygon annotations around objects, but the object names are not standardized: annotators are free to choose which objects to label and what to name each object. The SUN2012 (Xiao et al., 2010) dataset contains 16,873 manually cleaned up and fully annotated images more suitable for standard object detection training and evaluation. SIFT Flow (Liu et al., 2011) contains 2,688 images labeled using the LabelMe system. The LotusHill dataset (Yao et al., 2007) contains very detailed annotations of objects in 636,748 images and video frames, but it is not available for free. Several datasets provide pixel-level segmentations: for example, MSRC dataset (Criminisi, 2004) with 591 images and 23 object classes, Stanford Background Dataset (Gould et al., 2009) with 715 images and 8 classes, and the Berkeley Segmentation dataset (Arbelaez et al., 2011) with 500 images annotated with object boundaries. OpenSurfaces segments surfaces from consumer photographs and annotates them with surface properties, including material, texture, and contextual information (Bell et al., 2013) .

The closest to ILSVRC is the PASCAL VOC dataset (Everingham et al., 2010, 2014), which provides a standardized test bed for object detection, image classification, object segmentation, person layout, and action classification. Much of the design choices in ILSVRC have been inspired by PASCAL VOC and the similarities and differences between the datasets are discussed at length throughout the paper. ILSVRC scales up PASCAL VOC’s goal of standardized training and evaluation of recognition algorithms by more than an order of magnitude in number of object classes and images: PASCAL VOC 2012 has 20 object classes and 21,738 images compared to ILSVRC2012 with 1000 object classes and 1,431,167 annotated images.

The recently released COCO dataset (Lin et al., 2014b) contains more than 328,000 images with 2.5 million object instances manually segmented. It has fewer object categories than ILSVRC (91 in COCO versus 200 in ILSVRC object detection) but more instances per category (27K on average compared to about 1K in ILSVRC object detection). Further, it contains object segmentation annotations which are not currently available in ILSVRC. COCO is likely to become another important large-scale benchmark.

Large-scale annotation. ILSVRC makes extensive use of Amazon Mechanical Turk to obtain accurate annotations (Sorokin and Forsyth, 2008). Works such as (Welinder et al., 2010; Sheng et al., 2008; Vittayakorn and Hays, 2011) describe quality control mechanisms for this marketplace. (Vondrick et al., 2012) provides a detailed overview of crowdsourcing video annotation. A related line of work is to obtain annotations through well-designed games, e.g. (von Ahn and Dabbish, 2005). Our novel approaches to crowdsourcing accurate image annotations are in Sections 3.1.3, 3.2.1 and 3.3.3.

Standardized challenges. There are several datasets with standardized online evaluation similar to ILSVRC: the aforementioned PASCAL VOC (Everingham et al., 2012), Labeled Faces in the Wild (Huang et al., 2007) for unconstrained face recognition, Reconstruction meets Recognition (Urtasun et al., 2014) for 3D reconstruction and KITTI (Geiger et al., 2013) for computer vision in autonomous driving. These datasets along with ILSVRC help benchmark progress in different areas of computer vision. Works such as (Torralba and Efros, 2011) emphasize the importance of examining the bias inherent in any standardized dataset.

## 1.2 Paper layout

We begin with a brief overview of ILSVRC challenge tasks in Section 2. Dataset collection and annotation are described at length in Section 3. Section 4 discusses the evaluation criteria of algorithms in the large-scale recognition setting. Section 5 provides an overview of the methods developed by ILSVRC participants.

Section 6 contains an in-depth analysis of ILSVRC results: Section 6.1 documents the progress of largescale recognition over the years, Section 6.2 concludes that ILSVRC results are statistically significant, Section 6.3 thoroughly analyzes the current state of the field of object recognition, and Section 6.4 compares state-of-the-art computer vision accuracy with human accuracy. We conclude and discuss lessons learned from ILSVRC in Section 7.

## 2 Challenge tasks

The goal of ILSVRC is to estimate the content of photographs for the purpose of retrieval and automatic annotation. Test images are presented with no initial annotation, and algorithms have to produce labelings specifying what objects are present in the images. New test images are collected and labeled especially for this competition and are not part of the previously published ImageNet dataset (Deng et al., 2009).

ILSVRC over the years has consisted of one or more of the following tasks (years in parentheses):3

1. Image classification (2010-2014): Algorithms produce a list of object categories present in the image.

2. Single-object localization (2011-2014): Algorithms produce a list of object categories present in the image, along with an axis-aligned bounding box indicating the position and scale of one instance of each object category.

3. Object detection (2013-2014): Algorithms produce a list of object categories present in the image along with an axis-aligned bounding box indicating the position and scale of every instance of each object category.

This section provides an overview and history of each of the three tasks. Table 1 shows summary statistics.

## 2.1 Image classification task

Data for the image classification task consists of photographs collected from Flickr4 and other search engines, manually labeled with the presence of one of 1000 object categories. Each image contains one ground truth label.

For each image, algorithms produce a list of object categories present in the image. The quality of a labeling is evaluated based on the label that best matches the ground truth label for the image (see Section 4.1).

Constructing ImageNet was an effort to scale up an image classification dataset to cover most nouns in English using tens of millions of manually verified photographs (Deng et al., 2009). The image classification task of ILSVRC came as a direct extension of this effort. A subset of categories and images was chosen and fixed to provide a standardized benchmark while the rest of ImageNet continued to grow.

## 2.2 Single-object localization task

The single-object localization task, introduced in 2011, built off of the image classification task to evaluate the ability of algorithms to learn the appearance of the target object itself rather than its image context.

Data for the single-object localization task consists of the same photographs collected for the image classification task, hand labeled with the presence of one of 1000 object categories. Each image contains one ground truth label. Additionally, every instance of this category is annotated with an axis-aligned bounding box.

For each image, algorithms produce a list of object categories present in the image, along with a bounding box indicating the position and scale of one instance of each object category. The quality of a labeling is evaluated based on the object category label that best matches the ground truth label, with the additional requirement that the location of the predicted instance is also accurate (see Section 4.2).

## 2.3 Object detection task

The object detection task went a step beyond singleobject localization and tackled the problem of localizing multiple object categories in the image. This task has been a part of the PASCAL VOC for many years on the scale of 20 object categories and tens of thousands of images, but scaling it up by an order of magnitude in object categories and in images proved to be very challenging from a dataset collection and annotation point of view (see Section 3.3).

Data for the detection tasks consists of new photographs collected from Flickr using scene-level queries. The images are annotated with axis-aligned bounding boxes indicating the position and scale of every instance of each target object category. The training set is additionally supplemented with (a) data from the singleobject localization task, which contains annotations for all instances of just one object category, and (b) negative images known not to contain any instance of some object categories.

For each image, algorithms produce bounding boxes indicating the position and scale of all instances of all target object categories. The quality of labeling is evaluated by recall, or number of target object instances detected, and precision, or the number of spurious detections produced by the algorithm (see Section 4.3).

<table><tr><td rowspan=1 colspan=2>Task</td><td rowspan=1 colspan=1>Imageclassification</td><td rowspan=1 colspan=1>Single-objectlocalization</td><td rowspan=1 colspan=1>Objectdetection</td></tr><tr><td rowspan=2 colspan=1>Manual labelingon training set</td><td rowspan=1 colspan=1>Number of object classes annotated per image</td><td rowspan=1 colspan=1>1</td><td rowspan=1 colspan=1>1</td><td rowspan=1 colspan=1>1 or more</td></tr><tr><td rowspan=1 colspan=1>Locations ofannotated classes</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>all instanceson some images</td><td rowspan=1 colspan=1>all instanceson all images</td></tr><tr><td rowspan=2 colspan=1>Manual labelingon validationand test sets</td><td rowspan=1 colspan=1>Number of object classesannotated per image</td><td rowspan=1 colspan=1>1</td><td rowspan=1 colspan=1>1</td><td rowspan=1 colspan=1>all target classes</td></tr><tr><td rowspan=1 colspan=1>Locations ofannotated classes</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>all instanceson all images</td><td rowspan=1 colspan=1>all instanceson all images</td></tr></table>

Table 1 Overview of the provided annotations for each of the tasks in ILSVRC.

## 3 Dataset construction at large scale

Our process of constructing large-scale object recognition image datasets consists of three key steps.

The first step is defining the set of target object categories. To do this, we select from among the existing ImageNet (Deng et al., 2009) categories. By using WordNet as a backbone (Miller, 1995), ImageNet already takes care of disambiguating word meanings and of combining together synonyms into the same object category. Since the selection of object categories needs to be done only once per challenge task, we use a combination of automatic heuristics and manual postprocessing to create the list of target categories appropriate for each task. For example, for image classification we may include broader scene categories such as a type of beach, but for single-object localization and object detection we want to focus only on object categories which can be unambiguously localized in images (Sections 3.1.1 and 3.3.1).

The second step is collecting a diverse set of candidate images to represent the selected categories. We use both automatic and manual strategies on multiple search engines to do the image collection. The process is modified for the different ILSVRC tasks. For example, for object detection we focus our efforts on collecting scene-like images using generic queries such as “African safari” to find pictures likely to contain multiple animals in one scene (Section 3.3.2).

The third (and most challenging) step is annotating the millions of collected images to obtain a clean dataset. We carefully design crowdsourcing strategies targeted to each individual ILSVRC task. For example, the bounding box annotation system used for localization and detection tasks consists of three distinct parts in order to include automatic crowdsourced quality control (Section 3.2.1). Annotating images fully with all target object categories (on a reasonable budget) for object detection requires an additional hierarchical image labeling system (Section 3.3.3).

We describe the data collection and annotation procedure for each of the ILSVRC tasks in order: image classification (Section 3.1), single-object localization (Section 3.2), and object detection (Section 3.3), focusing on the three key steps for each dataset.

## 3.1 Image classification dataset construction

The image classification task tests the ability of an algorithm to name the objects present in the image, without necessarily localizing them.

We describe the choices we made in constructing the ILSVRC image classification dataset: selecting the target object categories from ImageNet (Section 3.1.1), collecting a diverse set of candidate images by using multiple search engines and an expanded set of queries in multiple languages (Section 3.1.2), and finally filtering the millions of collected images using the carefully designed crowdsourcing strategy of ImageNet (Deng et al., 2009) (Section 3.1.3).

## 3.1.1 Defining object categories for the image classification dataset

The 1000 categories used for the image classification task were selected from the ImageNet (Deng et al., 2009) categories. The 1000 synsets are selected such that there is no overlap between synsets: for any synsets i and j, i is not an ancestor of j in the ImageNet hierarchy. These synsets are part of the larger hierarchy and may have children in ImageNet; however, for ILSVRC we do not consider their child subcategories. The synset hierarchy of ILSVRC can be thought of as a “trimmed” version of the complete ImageNet hierarchy. Figure 1 visualizes the diversity of the ILSVRC2012 object categories.

The exact 1000 synsets used for the image classification and single-object localization tasks have changed over the years. There are 639 synsets which have been used in all five ILSVRC challenges so far. In the first year of the challenge synsets were selected randomly from the available ImageNet synsets at the time, followed by manual filtering to make sure the object categories were not too obscure. With the introduction of the object localization challenge in 2011 there were 321 synsets that changed: categories such as “New Zealand beach” which were inherently difficult to localize were removed, and some new categories from ImageNet containing object localization annotations were added. In ILSVRC2012, 90 synsets were replaced with categories corresponding to dog breeds to allow for evaluation of more fine-grained object classification, as shown in Figure 2. The synsets have remained consistent since year 2012. Appendix A provides the complete list of object categories used in ILSVRC2012-2014.

![](Images_26M35FQL/282f307d344a99689131b9817704a53ccb58fba6a7ebe13a83bed04ce2920e98.jpg)  
Fig. 1 The diversity of data in the ILSVRC image classification and single-object localization tasks. For each of the eight dimensions, we show example object categories along the range of that property. Object scale, number of instances and image clutter for each object category are computed using the metrics defined in Section 3.2.2 and in Appendix B. The other properties were computed by asking human subjects to annotate each of the 1000 object categories (Russakovsky et al., 2013).

## 3.1.2 Collecting candidate images for the image classification dataset

Image collection for ILSVRC classification task is the same as the strategy employed for constructing ImageNet (Deng et al., 2009). Training images are taken directly from ImageNet. Additional images are collected for the ILSVRC using this strategy and randomly partitioned into the validation and test sets.

We briefly summarize the process; (Deng et al., 2009) contains further details. Candidate images are collected from the Internet by querying several image search engines. For each synset, the queries are the set of Word-Net synonyms. Search engines typically limit the number of retrievable images (on the order of a few hundred to a thousand). To obtain as many images as possible, we expand the query set by appending the queries with the word from parent synsets, if the same word appears in the glossary of the target synset. For example, when querying “whippet”, according to WordNet’s glossary a “small slender dog of greyhound type developed in England”, we also use “whippet dog” and “whippet greyhound.” To further enlarge and diversify the candidate pool, we translate the queries into other languages, including Chinese, Spanish, Dutch and Italian. We obtain accurate translations using WordNets in those languages.

## 3.1.3 Image classification dataset annotation

Annotating images with corresponding object classes follows the strategy employed by ImageNet (Deng et al., 2009). We summarize it briefly here.

To collect a highly accurate dataset, we rely on humans to verify each candidate image collected in the previous step for a given synset. This is achieved by using Amazon Mechanical Turk (AMT), an online platform on which one can put up tasks for users for a monetary reward. With a global user base, AMT is particularly suitable for large scale labeling. In each of our labeling tasks, we present the users with a set of candidate images and the definition of the target synset (including a link to Wikipedia). We then ask the users to verify whether each image contains objects of the synset. We encourage users to select images regardless of occlusions, number of objects and clutter in the scene to ensure diversity.

While users are instructed to make accurate judgment, we need to set up a quality control system to ensure this accuracy. There are two issues to consider. First, human users make mistakes and not all users follow the instructions. Second, users do not always agree with each other, especially for more subtle or confusing synsets, typically at the deeper levels of the tree. The solution to these issues is to have multiple users independently label the same image. An image is considered positive only if it gets a convincing majority of the votes. We observe, however, that different categories require different levels of consensus among users. For example, while five users might be necessary for obtaining a good consensus on Burmese cat images, a much smaller number is needed for cat images. We develop a simple algorithm to dynamically determine the number of agreements needed for different categories of images. For each synset, we first randomly sample an initial subset of images. At least 10 users are asked to vote on each of these images. We then obtain a confidence score table, indicating the probability of an image being a good image given the consensus among user votes. For each of the remaining candidate images in this synset, we proceed with the AMT user labeling until a predetermined confidence score threshold is reached.

Empirical evaluation. Evaluation of the accuracy of the large-scale crowdsourced image annotation system was done on the entire ImageNet (Deng et al., 2009). A total of 80 synsets were randomly sampled at every tree depth of the mammal and vehicle subtrees. An independent group of subjects verified the correctness of each of the images. An average of 99.7% precision is achieved across the synsets. We expect similar accuracy on ILSVRC image classification dataset since the image annotation pipeline has remained the same. To verify, we manually checked 1500 ILSVRC2012-2014 image classification test set images (the test set has remained unchanged in these three years). We found 5 annotation errors, corresponding as expected to 99.7% precision.

## 3.1.4 Image classification dataset statistics

Using the image collection and annotation procedure described in previous sections, we collected a largescale dataset used for ILSVRC classification task. There are 1000 object classes and approximately 1.2 million training images, 50 thousand validation images and 100 thousand test images. Table 2 (top) documents the size of the dataset over the years of the challenge.

![](Images_26M35FQL/a62772f690df07f96b8994c2e798bbb1468cc94210e72aa4a95e61ea8414bf7e.jpg)  
Fig. 2 The ILSVRC dataset contains many more fine-grained classes compared to the standard PASCAL VOC benchmark; for example, instead of the PASCAL “dog” category there are 120 different breeds of dogs in ILSVRC2012-2014 classification and single-object localization tasks.

## 3.2 Single-object localization dataset construction

The single-object localization task evaluates the ability of an algorithm to localize one instance of an object category. It was introduced as a taster task in ILSVRC 2011, and became an official part of ILSVRC in 2012.

The key challenge was developing a scalable crowdsourcing method for object bounding box annotation. Our three-step self-verifying pipeline is described in Section 3.2.1. Having the dataset collected, we perform detailed analysis in Section 3.2.2 to ensure that the dataset is sufficiently varied to be suitable for evaluation of object localization algorithms.

Object classes and candidate images. The object classes for single-object localization task are the same as the object classes for image classification task described above in Section 3.1. The training images for localization task are a subset of the training images used for image classification task, and the validation and test images are the same between both tasks.

Bounding box annotation. Recall that for the image classification task every image was annotated with one object class label, corresponding to one object that is present in an image. For the single-object localization task, every validation and test image and a subset of the training images are annotated with axis-aligned bounding boxes around every instance of this object.

Every bounding box is required to be as small as possible while including all visible parts of the object instance. An alternate annotation procedure could be to annotate the full (estimated) extent of the object: e.g., if a person’s legs are occluded and only the torso is visible, the bounding box could be drawn to include the likely location of the legs. However, this alternative procedure is inherently ambiguous and ill-defined, leading to disagreement among annotators and among researchers (what is the true “most likely” extent of this object?). We follow the standard protocol of only annotating visible object parts (Russell et al., 2007; Everingham et al., 2010).5

## 3.2.1 Bounding box object annotation system

We summarize the crowdsourced bounding box annotation system described in detail in (Su et al., 2012). The goal is to build a system that is fully automated, highly accurate, and cost-effective. Given a collection of images where the object of interest has been verified to exist, for each image the system collects a tight bounding box for every instance of the object.

Image classification annotations (1000 object classes)
<table><tr><td rowspan=1 colspan=1>Year</td><td rowspan=1 colspan=1>Train images (per class)</td><td rowspan=1 colspan=1>Val images (per class)</td><td rowspan=1 colspan=1>Test images (per class)</td></tr><tr><td rowspan=1 colspan=1>ILSVRC2010</td><td rowspan=1 colspan=1>1,261,406 (668-3047)</td><td rowspan=1 colspan=1>50,000 (50)</td><td rowspan=1 colspan=1>150,000 (150)</td></tr><tr><td rowspan=1 colspan=1>ILSVRC2011</td><td rowspan=1 colspan=1>1,229,413 (384-1300)</td><td rowspan=1 colspan=1>50,000 (50)</td><td rowspan=1 colspan=1>100,000 (100)</td></tr><tr><td rowspan=1 colspan=1>ILSVRC2012-14</td><td rowspan=1 colspan=1>1,281,167 (732-1300)</td><td rowspan=1 colspan=1>50,000 (50)</td><td rowspan=1 colspan=1>100,000 (100)</td></tr></table>

Additional annotations for single-object localization (1000 object classes)
<table><tr><td rowspan=1 colspan=1>Year</td><td rowspan=1 colspan=1>Train images withbbox annotations(per class)</td><td rowspan=1 colspan=1>Train bboxesannotated(per class)</td><td rowspan=1 colspan=1>Val images withbbox annotations(per class)</td><td rowspan=1 colspan=1>Val bboxesannotated(per class)</td><td rowspan=1 colspan=1>Test images withbbox annotations</td></tr><tr><td rowspan=1 colspan=1>ILSVRC2011</td><td rowspan=1 colspan=1>315,525 (104-1256)</td><td rowspan=1 colspan=1>344,233 (114-1502)</td><td rowspan=1 colspan=1>50,000 (50)</td><td rowspan=1 colspan=1>55,388 (50-118)</td><td rowspan=1 colspan=1>100,000</td></tr><tr><td rowspan=1 colspan=1>ILSVRC2012-14</td><td rowspan=1 colspan=1>523,966 (91-1268)</td><td rowspan=1 colspan=1>593,173 (92-1418)</td><td rowspan=1 colspan=1>50,000 (50)</td><td rowspan=1 colspan=1>64,058 (50-189)</td><td rowspan=1 colspan=1>100,000</td></tr></table>

Table 2 Scale of ILSVRC image classification task (top) and single-object localization task (bottom). The numbers in parentheses correspond to (minimum per class - maximum per class). The 1000 classes change from year to year but are consistent between image classification and single-object localization tasks in the same year. All images from the image classification task may be used for single-object localization.

There are two requirements:

Quality Each bounding box needs to be tight, i.e. the smallest among all bounding boxes that contains all visible parts of the object. This facilitates the object detection learning algorithms by providing the precise location of each object instance;

Coverage Every object instance needs to have a bounding box. This is important for training localization algorithms because it tells the learning algorithms with certainty what is not the object.

The core challenge of building such a system is effectively controlling the data quality with minimal cost. Our key observation is that drawing a bounding box is significantly more difficult and time consuming than giving answers to multiple choice questions. Thus quality control through additional verification tasks is more cost-effective than consensus-based algorithms. This leads to the following workflow with simple basic subtasks:

1. Drawing A worker draws one bounding box around one instance of an object on the given image.

2. Quality verification A second worker checks if the bounding box is correctly drawn.

3. Coverage verification A third worker checks if all object instances have bounding boxes.

The sub-tasks are designed following two principles. First, the tasks are made as simple as possible. For example, instead of asking the worker to draw all bounding boxes on the same image, we ask the worker to draw only one. This reduces the complexity of the task. Second, each task has a fixed and predictable amount of work. For example, assuming that the input images are clean (object presence is correctly verified) and the coverage verification tasks give correct results, the amount of work of the drawing task is always that of providing exactly one bounding box.

Quality control on Tasks 2 and 3 is implemented by embedding “gold standard” images where the correct answer is known. Worker training for each of these subtasks is described in detail in (Su et al., 2012).

Empirical evaluation. The system is evaluated on 10 categories with ImageNet (Deng et al., 2009): balloon, bear, bed, bench, beach, bird, bookshelf, basketball hoop, bottle, and people. A subset of 200 images are randomly sampled from each category. On the image level, our evaluation shows that 97.9% images are completely covered with bounding boxes. For the remaining 2.1%, some bounding boxes are missing. However, these are all difficult cases: the size is too small, the boundary is blurry, or there is strong shadow.

On the bounding box level, 99.2% of all bounding boxes are accurate (the bounding boxes are visibly tight). The remaining 0.8% are somewhat off. No bounding boxes are found to have less than 50% intersection over union overlap with ground truth.

Additional evaluation of the overall cost and an analysis of quality control can be found in (Su et al., 2012).

## 3.2.2 Single-object localization dataset statistics

Using the annotation procedure described above, we collect a large set of bounding box annotations for the ILSVRC single-object classification task. All 50 thousand images in the validation set and 100 thousand images in the test set are annotated with bounding boxes around all instances of the ground truth object class (one object class per image). In addition, in ILSVRC2011 25% of training images are annotated with bounding boxes the same way, yielding more than 310 thousand annotated images with more than 340 thousand annotated object instances. In ILSVRC2012 40% of training images are annotated, yielding more than 520 thousand annotated images with more than 590 thousand annotated object instances. Table 2 (bottom) documents the size of this dataset.

In addition to the size of the dataset, we also analyze the level of difficulty of object localization in these images compared to the PASCAL VOC benchmark. We compute statistics on the ILSVRC2012 single-object localization validation set images compared to PASCAL VOC 2012 validation images.

Real-world scenes are likely to contain multiple instances of some objects, and nearby object instances are particularly difficult to delineate. The average object category in ILSVRC has 1.61 target object instances on average per positive image, with each instance having on average 0.47 neighbors (adjacent instances of the same object category). This is comparable to 1.69 instances per positive image and 0.52 neighbors per instance for an average object class in PASCAL.

As described in (Hoiem et al., 2012), smaller objects tend to be significantly more difficult to localize. In the average object category in PASCAL the object occupies 24.1% of the image area, and in ILSVRC 35.8%. However, PASCAL has only 20 object categories while ILSVRC has 1000. The 537 object categories of ILSVRC with the smallest objects on average occupy the same fraction of the image as PASCAL objects: 24.1%. Thus even though on average the object instances tend to be bigger in ILSVRC images, there are more than 25 times more object categories than in PAS-CAL VOC with the same average object scale.

Appendix B and (Russakovsky et al., 2013) have additional comparisons.

## 3.3 Object detection dataset construction

The ILSVRC task of object detection evaluates the ability of an algorithm to name and localize all instances of all target objects present in an image. It is much more challenging than object localization because some object instances may be small/occluded/difficult to accurately localize, and the algorithm is expected to locate them all, not just the one it finds easiest.

There are three key challenges in collecting the object detection dataset. The first challenge is selecting the set of common objects which tend to appear in cluttered photographs and are well-suited for benchmarking object detection performance. Our approach relies on statistics of the object localization dataset and the tradition of the PASCAL VOC challenge (Section 3.3.1).

<table><tr><td rowspan=2 colspan=1>Class name inPASCAL VOC(20 classes)</td><td rowspan=2 colspan=1>Closest class inILSVRC-DET(200 classes)</td><td rowspan=1 colspan=2>Avg object scale (%)</td></tr><tr><td rowspan=1 colspan=1>PASCALVOC</td><td rowspan=1 colspan=1>ILSVRC-DET</td></tr><tr><td rowspan=1 colspan=1>aeroplane</td><td rowspan=1 colspan=1>airplane</td><td rowspan=1 colspan=1>29.7</td><td rowspan=1 colspan=1>22.4</td></tr><tr><td rowspan=1 colspan=1>bicycle</td><td rowspan=1 colspan=1>bicycle</td><td rowspan=1 colspan=1>29.3</td><td rowspan=1 colspan=1>14.3</td></tr><tr><td rowspan=1 colspan=1>bird</td><td rowspan=1 colspan=1>bird</td><td rowspan=1 colspan=1>15.9</td><td rowspan=1 colspan=1>20.1</td></tr><tr><td rowspan=1 colspan=1>boat</td><td rowspan=1 colspan=1>watercraft</td><td rowspan=1 colspan=1>15.2</td><td rowspan=1 colspan=1>16.5</td></tr><tr><td rowspan=1 colspan=1>bottle</td><td rowspan=1 colspan=1>wine bottle</td><td rowspan=1 colspan=1>7.3</td><td rowspan=1 colspan=1>10.4</td></tr><tr><td rowspan=1 colspan=1>bus</td><td rowspan=1 colspan=1>bus</td><td rowspan=1 colspan=1>29.9</td><td rowspan=1 colspan=1>22.1</td></tr><tr><td rowspan=1 colspan=1>car</td><td rowspan=1 colspan=1>car</td><td rowspan=1 colspan=1>14.0</td><td rowspan=1 colspan=1>13.4</td></tr><tr><td rowspan=1 colspan=1>cat</td><td rowspan=1 colspan=1>domestic cat</td><td rowspan=1 colspan=1>46.8</td><td rowspan=1 colspan=1>29.8</td></tr><tr><td rowspan=1 colspan=1>chair</td><td rowspan=1 colspan=1>chair</td><td rowspan=1 colspan=1>12.8</td><td rowspan=1 colspan=1>10.1</td></tr><tr><td rowspan=1 colspan=1>cow</td><td rowspan=1 colspan=1>cattle</td><td rowspan=1 colspan=1>19.3</td><td rowspan=1 colspan=1>13.5</td></tr><tr><td rowspan=1 colspan=1>diningtable</td><td rowspan=1 colspan=1>table</td><td rowspan=1 colspan=1>29.1</td><td rowspan=1 colspan=1>30.3</td></tr><tr><td rowspan=1 colspan=1>dog</td><td rowspan=1 colspan=1>dog</td><td rowspan=1 colspan=1>37.0</td><td rowspan=1 colspan=1>28.9</td></tr><tr><td rowspan=1 colspan=1>horse</td><td rowspan=1 colspan=1>horse</td><td rowspan=1 colspan=1>29.5</td><td rowspan=1 colspan=1>18.5</td></tr><tr><td rowspan=1 colspan=1>motorbike</td><td rowspan=1 colspan=1>motorcyle</td><td rowspan=1 colspan=1>32.0</td><td rowspan=1 colspan=1>20.7</td></tr><tr><td rowspan=1 colspan=1>person</td><td rowspan=1 colspan=1>person</td><td rowspan=1 colspan=1>17.5</td><td rowspan=1 colspan=1>19.3</td></tr><tr><td rowspan=1 colspan=1>potted plant</td><td rowspan=1 colspan=1>flower pot</td><td rowspan=1 colspan=1>12.3</td><td rowspan=1 colspan=1>8.1</td></tr><tr><td rowspan=1 colspan=1>sheep</td><td rowspan=1 colspan=1>sheep</td><td rowspan=1 colspan=1>12.2</td><td rowspan=1 colspan=1>17.3</td></tr><tr><td rowspan=1 colspan=1>sofa</td><td rowspan=1 colspan=1>sofa</td><td rowspan=1 colspan=1>41.7</td><td rowspan=1 colspan=1>44.4</td></tr><tr><td rowspan=1 colspan=1>train</td><td rowspan=1 colspan=1>train</td><td rowspan=1 colspan=1>35.4</td><td rowspan=1 colspan=1>35.1</td></tr><tr><td rowspan=1 colspan=1>tv/monitor</td><td rowspan=1 colspan=1>tv or monitor</td><td rowspan=1 colspan=1>14.6</td><td rowspan=1 colspan=1>11.2</td></tr></table>

Table 3 Correspondences between the object classes in the PASCAL VOC (Everingham et al., 2010) and the ILSVRC detection task. Object scale is the fraction of image area (reported in percent) occupied by an object instance. It is computed on the validation sets of PASCAL VOC 2012 and of ILSVRC-DET. The average object scale is 24.1% across the 20 PASCAL VOC categories and 20.3% across the 20 corresponding ILSVRC-DET categories. Section 3.3.4 reports additional dataset statistics.

The second challenge is obtaining a much more varied set of scene images than those used for the image classification and single-object localization datasets. Section 3.3.2 describes the procedure for utilizing as much data from the single-object localization dataset as possible and supplementing it with Flickr images queried using hundreds of manually designed high-level queries.

The third, and biggest, challenge is completely annotating this dataset with all the objects. This is done in two parts. Section 3.3.3 describes the first part: our hierarchical strategy for obtaining the list of all target objects which occur within every image. This is necessary since annotating in a straight-forward way by creating a task for every (image, object class) pair is no longer feasible at this scale. Appendix E describes the second part: annotating the bounding boxes around these objects, using the single-object localization bounding box annotation pipeline of Section 3.2.1 along with extra verification to ensure that every instance of the object is annotated with exactly one bounding box.

## 3.3.1 Defining object categories for the object detection dataset

There are 200 object classes hand-selected for the detection task, eacg corresponding to a synset within ImageNet. These were chosen to be mostly basic-level object categories that would be easy for people to identify and label. The rationale is that the object detection system developed for this task can later be combined with a fine-grained classification model to further classify the objects if a finer subdivision is desired.6 As with the 1000 classification classes, the synsets are selected such that there is no overlap: for any synsets i and j, i is not an ancestor of j in the ImageNet hierarchy.

The selection of the 200 object detection classes in 2013 was guided by the ILSVRC 2012 classification and localization dataset. Starting with 1000 object classes and their bounding box annotations we first eliminated all object classes which tended to be too “big” in the image (on average the object area was greater than 50% of the image area). These were classes such as T-shirt, spiderweb, or manhole cover. We then manually eliminated all classes which we did not feel were well-suited for detection, such as hay, barbershop, or poncho. This left 494 object classes which were merged into basic-level categories: for example, different species of birds were merged into just the “bird” class. The classes remained the same in ILSVRC2014. Appendix D contains the complete list of object categories used in ILSVRC2013-2014 (in the context of the hierarchy described in Section 3.3.3).

Staying mindful of the tradition of the PASCAL VOC dataset we also tried to ensure that the set of 200 classes contains as many of the 20 PASCAL VOC classes as possible. Table 3 shows the correspondences. The changes that were done were to ensure more accurate and consistent crowdsourced annotations. The object class with the weakest correspondence is “potted plant” in PASCAL VOC, corresponding to “flower pot” in ILSVRC. “Potted plant” was one of the most challenging object classes to annotate consistently among the PASCAL VOC classes, and in order to obtain accurate annotations using crowdsourcing we had to restrict the definition to a more concrete object.

## 3.3.2 Collecting images for the object detection dataset

Many images for the detection task were collected differently than the images in ImageNet and the classification and single-object localization tasks. Figure 3 summarizes the types of images that were collected. Ideally all of these images would be scene images fully annotated with all target categories. However, given budget constraints our goal was to provide as much suitable detection data as possible, even if the images were drawn from a few different sources and distributions.

![](Images_26M35FQL/2204e692dea2933309dc3f21e8a741141f284d746a704e16a1efcdecb7e158d9.jpg)  
Fig. 3 Summary of images collected for the detection task. Images in green (bold) boxes have all instances of all 200 detection object classes fully annotated. Table 4 lists the complete statistics.

The validation and test detection set images come from two sources (percent of images from each source in parentheses). The first source (77%) is images from ILSVRC2012 single-object localization validation and test sets corresponding to the 200 detection classes (or their children in the ImageNet hierarchy). Images where the target object occupied more than 50% of the image area were discarded, since they were unlikely to contain other objects of interest. The second source (23%) is images from Flickr collected specifically for detection task. We queried Flickr using a large set of manually defined queries, such as “kitchenette” or “Australian zoo” to retrieve images of scenes likely to contain several objects of interest. Appendix C contains the full list. We also added pairwise queries, or queries with two target object names such as “tiger lion,” which also often returned cluttered scenes.

Figure 4 shows a random set of both types of validation images. Images were randomly split, with 33% going into the validation set and 67% into the test set.7

The training set for the detection task comes from three sources of images (percent of images from each source in parentheses). The first source (63%) is all training images from ILSVRC2012 single-object localization task corresponding to the 200 detection classes (or their children in the ImageNet hierarchy). We did not filter by object size, allowing teams to take advantage of all the positive examples available. The second source (24%) is negative images which were part of the original ImageNet collection process but voted as negative: for example, some of the images were collected from Flickr and search engines for the ImageNet synset “animals” but during the manual verification step did not collect enough votes to be considered as containing an “animal.” These images were manually re-verified for the detection task to ensure that they did not in fact contain the target objects. The third source (13%)

![](Images_26M35FQL/cf3ba2e797010a22c558a6e2ea94123f10d23bc5f680073eb17c3005b622e3c8.jpg)  
Fig. 4 Random selection of images in ILSVRC detection validation set. The images in the top 4 rows were taken from ILSVRC2012 single-object localization validation set, and the images in the bottom 4 rows were collected from Flickr using scene-level queries.

is images collected from Flickr specifically for the detection task. These images were added for ILSVRC2014 following the same protocol as the second type of images in the validation and test set. This was done to bring the training and testing distributions closer together.

![](Images_26M35FQL/01ae0161556fc1b085f6fadf5237878b678164958834fd086b84fa57e0158f9a.jpg)  
Fig. 5 Consider the problem of binary multi-label annotation. For each input (e.g., image) and each label (e.g., object), the goal is to determine the presence or absense (+ or -) of the label (e.g., decide if the object is present in the image). Multilabel annotation becomes much more efficient when considering real-world structure of data: correlation between labels, hierarchical organization of concepts, and sparsity of labels.

## 3.3.3 Complete image-object annotation for the object detection dataset

The key challenge in annotating images for the object detection task is that all objects in all images need to be labeled. Suppose there are N inputs (images) which need to be annotated with the presence or absence of K labels (objects). A na¨ıve approach would query humans for each combination of input and label, requiring NK queries. However, N and K can be very large and the cost of this exhaustive approach quickly becomes prohibitive. For example, annotating 60, 000 validation and test images with the presence or absence of 200 object classes for the detection task na¨ıvely would take 80 times more effort than annotating 150, 000 validation and test images with 1 object each for the classification task – and this is not even counting the additional cost of collecting bounding box annotations around each object instance. This quickly becomes infeasible.

In (Deng et al., 2014) we study strategies for scalable multilabel annotation, or for efficiently acquiring multiple labels from humans for a collection of items. We exploit three key observations for labels in real world applications (illustrated in Figure 5):

1. Correlation. Subsets of labels are often highly correlated. Objects such as a computer keyboard, mouse and monitor frequently co-occur in images. Similarly, some labels tend to all be absent at the same time. For example, all objects that require electricity are usually absent in pictures taken outdoors. This suggests that we could potentially fill in the values of multiple labels by grouping them into only one query for humans. Instead of checking if dog, cat, rabbit etc. are present in the photo, we just check about the “animal” group If the answer is no, then this implies a no for all categories in the group.

2. Hierarchy. The above example of grouping dog, cat, rabbit etc. into animal has implicitly assumed that labels can be grouped together and humans can efficiently answer queries about the group as a whole. This brings up our second key observation: humans organize semantic concepts into hierarchies and are able to efficiently categorize at higher semantic levels (Thorpe et al., 1996), e.g. humans can determine the presence of an animal in an image as fast as every type of animal individually. This leads to substantial cost savings.

3. Sparsity. The values of labels for each image tend to be sparse, i.e. an image is unlikely to contain more than a dozen types of objects, a small fraction of the hundreds of object categories. This enables rapid elimination of many objects by quickly filling in no. With a high degree of sparsity, an efficient algorithm can have a cost which grows logarithmically with the number of objects instead of linearly.

We propose algorithmic strategies that exploit the above intuitions. The key is to select a sequence of queries for humans such that we achieve the same labeling results with only a fraction of the cost of the na¨ıve approach. The main challenges include how to measure cost and utility of queries, how to construct good queries, and how to dynamically order them. A detailed description of the generic algorithm, along with theoretical analysis and empirical evaluation, is presented in (Deng et al., 2014).

Application of the generic multi-class labeling algorithm to our setting. The generic algorithm automatically selects the most informative queries to ask based on object label statistics learned from the training set. In our case of 200 object classes, since obtaining the training set was by itself challenging we chose to design the queries by hand. We created a hierarchy of queries of the type “is there a... in the image?” For example, one of the high-level questions was “is there an animal in the image?” We ask the crowd workers this question about every image we want to label. The children of the “animal” question would correspond to specific examples of animals: for example, “is there a mammal in the image?” or “is there an animal with no legs?” To annotate images efficiently, these questions are asked only on images determined to contain an animal. The 200 leaf node questions correspond to the 200 target objects, e.g., “is there a cat in the image?”. A few sample iterations of the algorithm are shown in Figure 6.

Algorithm 1 is the formal algorithm for labeling an image with the presence or absence of each target object category. With this algorithm in mind, the hierarchy of questions was constructed following the principle that false positives only add extra cost whereas false negatives can significantly affect the quality of the labeling. Thus, it is always better to stick with more general but less ambiguous questions, such as “is there a mammal in the image?” as opposed to asking overly specific but potentially ambiguous questions, such as “is there an animal that can climb trees?” Constructing this hierarchy was a surprisingly time-consuming process, involving multiple iterations to ensure high accuracy of labeling and avoid question ambiguity. Appendix D shows the constructed hierarchy.

![](Images_26M35FQL/225178438fa5c46e97bbff2031763e6ac6710ae3d71fd2bf87693b692dca646a.jpg)  
Fig. 6 Our algorithm dynamically selects the next query to efficiently determine the presence or absence of every object in every image. Green denotes a positive annotation and red denotes a negative annotation. This toy example illustrates a sample progression of the algorithm for one label (cat) on a set of images.

Bounding box annotation. Once all images are labeled with the presence or absence of all object categories we use the bounding box system described in Section 3.2.1 along with some additional modifications of Appendix E to annotate the location of every instance of every present object category.

## 3.3.4 Object detection dataset statistics

Using the procedure described above, we collect a largescale dataset for ILSVRC object detection task. There are 200 object classes and approximately 450K training images, 20K validation images and 40K test images. Table 4 documents the size of the dataset over the years of the challenge. The major change between ILSVRC2013 and ILSVRC2014 was the addition of 60,658 fully annotated training images.

Prior to ILSVRC, the object detection benchmark was the PASCAL VOC challenge (Everingham et al., 2010). ILSVRC has 10 times more object classes than PASCAL VOC (200 vs 20), 10.6 times more fully annotated training images (60,658 vs 5,717), 35.2 times more training objects (478,807 vs 13,609), 3.5 times more validation images (20,121 vs 5823) and 3.5 times more validation objects (55,501 vs 15,787). ILSVRC has 2.8 annotated objects per image on the validation set, compared to 2.7 in PASCAL VOC. The average object in ILSVRC takes up 17.0% of the image area and in PASCAL VOC takes up 20.7%; Table 3 contains per-class comparisons. Additionally, ILSVRC contains a wide variety of objects, including tiny objects such as sunglasses (1.3% of image area on average), ping-pong balls (1.5% of image area on average) and basketballs (2.0% of image area on average).

Input: Image $^ { i , }$ queries Q, directed graph G over $\mathcal { Q }$   
Output: Labels $L : \mathcal { Q } \to \{ ^ { \mathfrak { c } } \mathrm { y e s } ^ { \mathfrak { w } } , ^ { \mathfrak { c } } \mathrm { n o } ^ { \mathfrak { w } } \}$   
Initialize labels $L ( q ) = \emptyset \forall q \in \mathcal { Q } ;$   
Initialize candidates $C = \{ \bar { q } \colon q \in R o o t ( \mathcal { G } ) \}$ ;   
while $C$ not empty do   
Obtain answer A to query $q * \in C ;$   
$L ( q * ) = A ; C = C \backslash \{ q * \} ;$   
if A is “yes” then   
$C h l d \dot { r } = \{ q \in C h i l d r e n ( q * , \mathcal { G } ) \colon L ( q ) = \emptyset \} ;$   
$C = C \cup { \tilde { C } } h l d r ;$   
else   
$D e s = \{ q \in D e s c e n d a n t s ( q * , \mathcal { G } ) \colon L ( q ) = \emptyset \} ;$   
$L ( q ) = { \dot { \mathrm { \Omega } } } { \dot { \mathrm { \Omega } } } { \mathrm { } }$   
$C = C \backslash D e s ;$   
end   
end  
Algorithm 1: The algorithm for complete multi-class annotation. This is a special case of the algorithm described in (Deng et al., 2014). A hierarchy of questions G is manually constructed. All root questions are asked on every image. If the answer to query q∗ on image i is $^ { 6 } \mathrm { n o } ^ { 5 }$ then the answer is assumed to be $^ { 6 } \mathrm { n o } ^ { 9 }$ for all queries q such that q is a descendant of q∗ in the hierarchy. We continue asking the queries until all queries are answered. For images taken from the single-object localization task we used the known object label to initialize L.

## 4 Evaluation at large scale

Once the dataset has been collected, we need to define a standardized evaluation procedure for algorithms. Some measures have already been established by datasets such as the Caltech 101 (Fei-Fei et al., 2004) for image classification and PASCAL VOC (Everingham et al., 2012) for both image classification and object detection. To adapt these procedures to the large-scale setting we had to address three key challenges. First, for the image classification and single-object localization tasks only one object category could be labeled in each image due to the scale of the dataset. This created potential ambiguity during evaluation (addressed in Section 4.1). Second, evaluating localization of object instances is inherently difficult in some images which contain a cluster of objects (addressed in Section 4.2). Third, evaluating localization of object instances which occupy few pixels in the image is challenging (addressed in Section 4.3).

In this section we describe the standardized evaluation criteria for each of the three ILSVRC tasks.

Object detection annotations (200 object classes)
<table><tr><td rowspan=1 colspan=1>Year</td><td rowspan=1 colspan=1>Trainimages(per class)</td><td rowspan=1 colspan=1>Train bboxes annotated(per class)</td><td rowspan=1 colspan=1>Val images(per class)</td><td rowspan=1 colspan=1>Val bboxes annotated(per class)</td><td rowspan=1 colspan=1>Testimages</td></tr><tr><td rowspan=1 colspan=1>ILSVRC2013</td><td rowspan=1 colspan=1>395909(417-561-66911 pos,185-4130-10073 neg)</td><td rowspan=1 colspan=1>345854(438-660-73799)</td><td rowspan=1 colspan=1>21121(23-58-5791 pos,rest neg)</td><td rowspan=1 colspan=1>55501(31-111-12824)</td><td rowspan=1 colspan=1>40152</td></tr><tr><td rowspan=1 colspan=1>ILSVRC2014</td><td rowspan=1 colspan=1>456567(461-823-67513 pos,42945-64614-70626 neg)</td><td rowspan=1 colspan=1>478807(502-1008-74517)</td><td rowspan=1 colspan=1>21121(23-58-5791 pos,rest neg)</td><td rowspan=1 colspan=1>55501(31-111-12824)</td><td rowspan=1 colspan=1>40152</td></tr></table>

Table 4 Scale of ILSVRC object detection task. Numbers in parentheses correspond to (minimum per class - median per class - maximum per class).

We elaborate further on these and other more minor challenges with large-scale evaluation. Appendix F describes the submission protocol and other details of running the competition itself.

## 4.1 Image classification

The scale of ILSVRC classification task (1000 categories and more than a million of images) makes it very expensive to label every instance of every object in every image. Therefore, on this dataset only one object category is labeled in each image. This creates ambiguity in evaluation. For example, an image might be labeled as a “strawberry” but contain both a strawberry and an apple. Then an algorithm would not know which one of the two objects to name. For the image classification task we allowed an algorithm to identify multiple (up to 5) objects in an image and not be penalized as long as one of the objects indeed corresponded to the ground truth label. Figure 7(top row) shows some examples.

Concretely, each image i has a single class label $C _ { i }$ An algorithm is allowed to return 5 labels $c _ { i 1 } , \ldots c _ { i 5 }$ and is considered correct if $c _ { i j } = C _ { i }$ for some $j .$

Let the error of a prediction $d _ { i j } = d ( c _ { i j } , C _ { i } )$ be 1 if $c _ { i j } \neq C _ { i }$ and 0 otherwise. The error of an algorithm is the fraction of test images on which the algorithm makes a mistake:

$$
\mathrm { e r r o r } = \frac { 1 } { N } \sum _ { i = 1 } ^ { N } \operatorname* { m i n } _ { j } d _ { i j }\tag{1}
$$

We used two additional measures of error. First, we evaluated top-1 error. In this case algorithms were penalized if their highest-confidence output label $c _ { i 1 }$ did not match ground truth class $C _ { i } .$ Second, we evaluated hierarchical error. The intuition is that confusing two nearby classes (such as two different breeds of dogs) is not as harmful as confusing a dog for a container ship. For the hierarchical criteria, the cost of one misclassification, $d ( c _ { i j } , C _ { i } )$ , is defined as the height of the lowest common ancestor of $c _ { i j }$ and $C _ { i }$ in the ImageNet hierarchy. The height of a node is the length of the longest path to a leaf node (leaf nodes have height zero).

However, in practice we found that all three measures of error (top-5, top-1, and hierarchical) produced the same ordering of results. Thus, since ILSVRC2012 we have been exclusively using the top-5 metric which is the simplest and most suitable to the dataset.

## 4.2 Single-object localization

The evaluation for single-object localization is similar to object classification, again using a top-5 criteria to allow the algorithm to return unannotated object classes without penalty. However, now the algorithm is considered correct only if it both correctly identifies the target class $C _ { i }$ and accurately localizes one of its instances. Figure 7(middle row) shows some examples.

Concretely, an image is associated with object class $C _ { i } .$ , with all instances of this object class annotated with bounding boxes $B _ { i k }$ . An algorithm returns $\{ ( c _ { i j } , b _ { i j } ) \} _ { j = 1 } ^ { 5 }$ of class labels $c _ { i j }$ and associated locations $b _ { i j }$ . The error of a prediction j is:

$$
d _ { i j } = \operatorname* { m a x } ( d ( c _ { i j } , C _ { i } ) , \operatorname* { m i n } _ { k } d ( b _ { i j } , B _ { i k } ) )\tag{2}
$$

Here $d ( b _ { i j } , B _ { i k } )$ is the error of localization, defined as 0 if the area of intersection of boxes $b _ { i j }$ and $B _ { i k }$ divided by the areas of their union is greater than 0.5, and 1 otherwise. (Everingham et al., 2010) The error of an algorithm is computed as in Eq. 1.

Evaluating localization is inherently difficult in some images. Consider a picture of a bunch of bananas or a carton of apples. It is easy to classify these images as containing bananas or apples, and even possible to localize a few instances of each fruit. However, in order for evaluation to be accurate every instance of banana or apple needs to be annotated, and that may be impossible. To handle the images where localizing individual object instances is inherently ambiguous we manually discarded 3.5% of images since ILSVRC2012. Some examples of discarded images are shown in Figure 8.

![](Images_26M35FQL/f39d927ba589f5ccaaad4d867839ef61436fa978970b541b149aa72427e4e12b.jpg)

![](Images_26M35FQL/aaae43e668fafe00bf5d1fc494cd55a254f4b16ac52e2522fc13091b68628cc2.jpg)

Single-object localization  
![](Images_26M35FQL/77511e767dc5cf5cbabdb234b492322b74db0b2489d0bf04f597fe98eb820583.jpg)

![](Images_26M35FQL/cdc2b5afd4cd0a08a0660971a0b30e04db847371b2350ce7492217b6e38dd69d.jpg)

![](Images_26M35FQL/5f4dfce93502f7ad7d9c1abcc1ec559c1c0d27d116da59ac363c603456314bc3.jpg)

![](Images_26M35FQL/83b77305302d59a7323a2e6583b33b7f2220b3244ea13c87bc722a8752417255.jpg)

![](Images_26M35FQL/cb57f35db915637f3675917ac3ee11c558763d98781b2059c034b99806c53e06.jpg)

![](Images_26M35FQL/37aded06f6931bfc52a16a74c19d2d3d7d7aa07dfe65d53627fb68bdd51922e3.jpg)

![](Images_26M35FQL/c28bedd9e06a5a96162135c41a4ccedf4e2b2c16aca7e556d3928f7c1f5bcfbe.jpg)

Fig. 7 Tasks in ILSVRC. The first column shows the ground truth labeling on an example image, and the next three show three sample outputs with the corresponding evaluation score.  
![](Images_26M35FQL/7c0546afbee37b88d183d188871bb4a196e927459775fd73587b84523105efc2.jpg)  
Fig. 8 Images marked as “difficult” in the ILSVRC2012 single-object localization validation set. Please refer to Section 4.2 for details.

## 4.3 Object detection

The criteria for object detection was adopted from PAS-CAL VOC (Everingham et al., 2010). It is designed to penalize the algorithm for missing object instances, for duplicate detections of one instance, and for false positive detections. Figure 7(bottom row) shows examples.

For each object class and each image $I _ { i } ,$ an algorithm returns predicted detections $( b _ { i j } , s _ { i j } )$ of predicted locations $b _ { i j }$ with confidence scores $s _ { i j }$ . These detections are greedily matched to the ground truth boxes $\{ B _ { i k } \}$ using Algorithm 2. For every detection $j$ on image i the algorithm returns $z _ { i j } = 1$ if the detection is matched to a ground truth box according to the threshold criteria, and 0 otherwise. For a given object class, let N be the total number of ground truth instances across all images. Given a threshold t, define recall as the fraction of the N objects detected by the algorithm, and precision as the fraction of correct detections out of the total detections returned by the algorithm. Concretely,

$$
R e c a l l ( t ) = \frac { \sum _ { i j } 1 [ s _ { i j } \geq t ] z _ { i j } } { N }\tag{3}
$$

$$
P r e c i s i o n ( t ) = \frac { \sum _ { i j } 1 [ s _ { i j } \geq t ] z _ { i j } } { \sum _ { i j } 1 [ s _ { i j } \geq t ] }\tag{4}
$$

```latex
Input: Bounding box predictions with confidence
scores $\{ ( b _ { j } , s _ { j } ) \} _ { j = 1 } ^ { M }$ and ground truth boxes B
on image I for a given object class.
Output: Binary results $\bar { \{ z _ { j } \} } _  j = \bar  \{$ of whether or not
prediction $j$ is a true positive detection
Let $\mathcal { U } = \bar { B }$ be the set of unmatched objects;
Order $\{ ( b _ { j } , s _ { j } ) \} _ { j = 1 } ^ { M }$ in descending order of $s _ { j } ;$
for $j { = } 1 \ \dots$ M do
Let $\mathcal { C } = \{ B _ { k } \in \mathcal { U } : \mathrm { I O U } ( B _ { k } , b _ { j } ) \geq \mathrm { t h r } ( B _ { k } ) \} ;$
$\mathbf { i f } \ { \mathcal { C } } \neq \emptyset$ then
Let $k ^ { * } = \arg \operatorname* { m a x } _ { \{ k : B _ { k } \in \mathcal { C } \} } \mathrm { I O U } ( B _ { k } , b _ { j } ) ;$
Set $\mathcal { U } = \mathcal { U } \backslash B _ { k \ast } ;$
Set $z _ { j } = 1$ since true positive detection;
else
Set $z _ { j } = 0$ since false positive detection;
end
end
Algorithm 2: The algorithm for greedily matching
object detection outputs to ground truth labels. The
standard $\operatorname { t h r } ( B _ { k } ) = 0 . 5$ (Everingham et al., 2010).
ILSVRC computes $\operatorname { t h r } ( B _ { k } )$ using $\operatorname { E q . }$ 5 to better han
dle low-resolution objects.
```

The final metric for evaluating an algorithm on a given object class is average precision over the different levels of recall achieved by varying the threshold t. The winner of each object class is then the team with the highest average precision, and then winner of the challenge is the team that wins on the most object classes.8

Difference with PASCAL VOC. Evaluating localization of object instances which occupy very few pixels in the image is challenging. The PASCAL VOC approach was to label such instances as “difficult” and ignore them during evaluation. However, since ILSVRC contains a more diverse set of object classes including, for example, “nail” and “ping pong ball” which have many very small instances, it is important to include even very small object instances in evaluation.

In Algorithm 2, a predicted bounding box b is considered to have properly localized by a ground truth bounding box B if $I O U ( b , B ) \ge \mathrm { t h r } ( B )$ . The PASCAL VOC metric uses the threshold thr $( B ) = 0 . 5$ . However, for small objects even deviations of a few pixels would be unacceptable according to this threshold. For example, consider an object B of size $1 0 \times 1 0$ pixels, with a detection window of $2 0 \times 2 0$ pixels which fully contains that object. This would be an error of approximately 5 pixels on each dimension, which is average human annotation error. However, the IOU in this case would be $1 0 0 / 4 0 0 = 0 . 2 5 ,$ far below the threshold of 0.5. Thus for smaller objects we loosen the threshold in ILSVRC to allow for the annotation to extend up to 5 pixels on average in each direction around the object. Concretely, if the ground truth box B is of dimensions $w \times h$ then

$$
\operatorname { t h r } ( B ) = \operatorname* { m i n } \left( 0 . 5 , { \frac { w h } { ( w + 1 0 ) ( h + 1 0 ) } } \right)\tag{5}
$$

In practice, this changes the threshold only on objects which are smaller than approximately $2 5 \times 2 5$ pixels, and affects 5.5% of objects in the detection validation set.

Practical consideration. One additional practical consideration for ILSVRC detection evaluation is subtle and comes directly as a result of the scale of ILSVRC. In PASCAL, algorithms would often return many detections per class on the test set, including ones with low confidence scores. This allowed the algorithms to reach the level of high recall at least in the realm of very low precision. On ILSVRC detection test set if an algorithm returns 10 bounding boxes per object per image this would result in $1 0 \times 2 0 0 \times 4 0 K = 8 0 \mathrm { M }$ detections. Each detection contains an image index, a class index, 4 bounding box coordinates, and the confidence score, so it takes on the order of 28 bytes. The full set of detections would then require 2.24Gb to store and submit to the evaluation server, which is impractical. This means that algorithms are implicitly required to limit their predictions to only the most confident locations.

## 5 Methods

The ILSVRC dataset and the competition has allowed significant algorithmic advances in large-scale image recognition and retrieval.

## 5.1 Challenge entries

This section is organized chronologically, highlighting the particularly innovative and successful methods which participated in the ILSVRC each year. Tables 5, 6 and 7 list all the participating teams. We see a turning point in 2012 with the development of large-scale convolutional neural networks.

ILSVRC2010. The first year the challenge consisted of just the classification task. The winning entry from NEC team (Lin et al., 2011) used SIFT (Lowe, 2004) and LBP (Ahonen et al., 2006) features with two nonlinear coding representations (Zhou et al., 2010; Wang et al., 2010) and a stochastic SVM. The honorable mention XRCE team (Perronnin et al., 2010) used an improved Fisher vector representation (Perronnin and Dance, 2007) along with PCA dimensionality reduction and data compression followed by a linear SVM. Fisher vectorbased methods have evolved over five years of the challenge and continued performing strongly in every ILSVRC from 2010 to 2014.

ILSVRC2011. The winning classification entry in 2011 was the 2010 runner-up team XRCE, applying highdimensional image signatures (Perronnin et al., 2010) with compression using product quantization (Sanchez and Perronnin, 2011) and one-vs-all linear SVMs. The single-object localization competition was held for the first time, with two brave entries. The winner was the UvA team using a selective search approach to generate class-independent object hypothesis regions (van de Sande et al., 2011b), followed by dense sampling and vector quantization of several color SIFT features (van de Sande et al., 2010), pooling with spatial pyramid matching (Lazebnik et al., 2006), and classifying with a histogram intersection kernel SVM (Maji and Malik, 2009) trained on a GPU (van de Sande et al., 2011a).

ILSVRC2012. This was a turning point for large-scale object recognition, when large-scale deep neural networks entered the scene. The undisputed winner of both the classification and localization tasks in 2012 was the SuperVision team. They trained a large, deep convolutional neural network on RGB values, with 60 million parameters using an efficient GPU implementation and a novel hidden-unit dropout trick (Krizhevsky et al., 2012; Hinton et al., 2012). The second place in image classification went to the ISI team, which used Fisher vectors (Sanchez and Perronnin, 2011) and a streamlined version of Graphical Gaussian Vectors (Harada and Kuniyoshi, 2012), along with linear classifiers using Passive-Aggressive (PA) algorithm (Crammer et al., 2006). The second place in single-object localization went to the VGG, with an image classification system including dense SIFT features and color statistics (Lowe, 2004), a Fisher vector representation (Sanchez and Perronnin, 2011), and a linear SVM classifier, plus additional insights from (Arandjelovic and Zisserman, 2012; Sanchez et al., 2012). Both ISI and VGG used (Felzenszwalb et al., 2010) for object localization; SuperVision used a regression model trained to predict bounding box locations. Despite the weaker detection model, SuperVision handily won the object localization task. A detailed analysis and comparison of the Super-Vision and VGG submissions on the single-object localization task can be found in (Russakovsky et al., 2013).

The influence of the success of the SuperVision model can be clearly seen in ILSVRC2013 and ILSVRC2014.

ILSVRC2013. There were 24 teams participating in the ILSVRC2013 competition, compared to 21 in the previous three years combined. Following the success of the deep learning-based method in 2012, the vast majority of entries in 2013 used deep convolutional neural networks in their submission. The winner of the classification task was Clarifai, with several large deep convolutional networks averaged together. The network architectures were chosen using the visualization technique of (Zeiler and Fergus, 2013), and they were trained on the GPU following (Zeiler et al., 2011) using the dropout technique (Krizhevsky et al., 2012).

The winning single-object localization OverFeat submission was based on an integrated framework for using convolutional networks for classification, localization and detection with a multiscale sliding window approach (Sermanet et al., 2013). They were the only team tackling all three tasks.

The winner of object detection task was UvA team, which utilized a new way of efficient encoding (van de Sande et al., 2014) densely sampled color descriptors (van de Sande et al., 2010) pooled using a multi-level spatial pyramid in a selective search framework (Uijlings et al., 2013). The detection results were rescored using a fullimage convolutional network classifier.

ILSVRC2014. 2014 attracted the most submissions, with 36 teams submitting 123 entries compared to just 24 teams in 2013 – a 1.5x increase in participation.9 As in 2013 almost all teams used convolutional neural networks as the basis for their submission. Significant progress has been made in just one year: image classification error was almost halved since ILSVRC2013 and object detection mean average precision almost doubled compared to ILSVRC2013. Please refer to Section 6.1 for details.

In 2014 teams were allowed to use outside data for training their models in the competition, so there were six tracks: provided and outside data tracks in each of image classification, single-object localization, and object detection tasks.

The winning image classification with provided data team was GoogLeNet, which explored an improved convolutional neural network architecture combining the multi-scale idea with intuitions gained from the Hebbian principle. Additional dimension reduction layers allowed them to increase both the depth and the width of the network significantly without incurring significant computational overhead. In the image classification with external data track, CASIAWS won by using weakly supervised object localization from only classification labels to improve image classification. MCG region proposals (Arbel´aez et al., 2014) pretrained on PASCAL VOC 2012 data are used to extract region proposals, regions are represented using convolutional networks, and a multiple instance learning strategy is used to learn weakly supervised object detectors to represent the image.

ILSVRC 20 10
<table><tr><td>Codename</td><td>CLS</td><td>Insitutions</td><td>Contributors and references</td></tr><tr><td>Hminmax</td><td>54.4</td><td>Massachusetts Institute of Technology</td><td>Jim Mutch, Sharat Chikkerur,Hristo Paskov,Ruslan Salakhutdinov, Stan Bileschi, Hueihan Jhuang</td></tr><tr><td>IBM</td><td>70.1</td><td>IBM researcht,Georgia Tech</td><td>Lexing Xiet, Hua Ouyangt, Apostol Natsevt</td></tr><tr><td>ISIL</td><td>44.6</td><td></td><td>Tatsuya Harada,Hideki Nakayama, Yoshitaka Ushiku,Yuya Yamashita,Jun Imura,Yasuo Kuniyoshi</td></tr><tr><td>ITNLP</td><td>78.7</td><td>Harbin Institute of Technology</td><td>Deyuan Zhang, Wenfeng Xuan, Xiaolong Wang, Bingquan Liu, Chengjie Sun</td></tr><tr><td>LIG</td><td>60.7</td><td>Laboratoire d&#x27;Informatique de Grenoble</td><td>Georges Quenot</td></tr><tr><td>NEC</td><td>28.2</td><td>NEC LabsAmericat, University of llinois at Urbana- Champaign+, Rutgers</td><td>Yuanqing Lint,FengjunLvt,Shenghuo_Zhut,Ming Yang†,Timothe Court,KaiYut,LiangLiang Cao, Zhen Li， ,Min-Hsuan Tsai‡, Xi Zhou‡,Thomas Huang‡,Tong Zhang干 (Linet al.,2011)</td></tr><tr><td>NII</td><td>74.2</td><td>National Instituteof Informatics,TokyoJapant,Hefei Nor</td><td>Cai-Zhi Zhut, Xiao Zhou‡, Shinichi Satoht</td></tr><tr><td>NTU</td><td>58.3</td><td>mal Univ.HeifeiChina CeMNet, SCE, NTU, Singapore</td><td>Zhengxiang Wang, Liang-Tien Chia</td></tr><tr><td>Regularities</td><td>75.1</td><td>SRI International</td><td>Omid Madani, Brian Burns</td></tr><tr><td>UCI</td><td>46.6</td><td>University of California Irvine</td><td>Hamed Pirsiavash, Deva Ramanan, Charless Fowlkes</td></tr><tr><td>XRCE</td><td>33.6</td><td>Xerox Research Centre Europe</td><td>Jorge Sanchez, Florent Perronnin, Thomas Mensink (Perronnin et al. ，2010)</td></tr></table>

ILSVRC 20 1 1
<table><tr><td>Codename ISI</td><td>CLS LOC 36.0 1</td><td>Institutions</td><td>Contributors and references Tatsuya Harada, Asako Kanezaki, Yoshitaka Ushiku, Yuya Yamashita,Sho Inaba, Hiroshi Muraoka, Yasuo</td></tr><tr><td>NII</td><td>50.5 -</td><td>Intelligent Systems and InformaticslabUniversityof Tokyo</td><td>Kuniyoshi Duy-Dinh Le,Shinichi Satoh</td></tr><tr><td>UvA</td><td>31.0 42.5</td><td>National Instituteof IformaticsJapan University of Amsterdamt,University of Trento</td><td> Koen E. A. van de Sandet, Jasper R. R. Uijlings‡, Arnold W. M. Smeulderst, Theo Geverst, Nicu Sebe‡,</td></tr><tr><td>XRCE</td><td>25.8 56.5</td><td></td><td>FlorentPertge</td></tr><tr><td></td><td></td><td> Xerox Research Centre Europet, CIt</td><td></td></tr></table>

ILSVRC 20 1 2
<table><tr><td rowspan="2">Codename ISI</td><td rowspan="2">CLS 26.2</td><td rowspan="2">LOC 53.6</td><td>Institutions</td><td rowspan="2">Contributors and references Naoyuki Gunjit,Takayuki Higuchit,Koki Yasumotot, Hiroshi Muraokat,Yoshitaka Ushikut, Tatsuya Haradat‡, Yasuo Kuniyoshit</td></tr><tr><td>University of Tokyot, JST PRESTOt</td></tr><tr><td>LEAR</td><td>34.5</td><td>- Europe</td><td>LEAR INRIA Grenoblet， TVPA Xerox Research Centre</td><td>(Harada and Kuniyoshi2012) Thomas Mensinkt‡, Jakob Verbeekt, Florent Peronnin†, Gabriela Csurkat (Mensink et al.,2012)</td></tr><tr><td>VGG</td><td>27.0</td><td>50.0</td><td>University of Oxford</td><td>Karen Simonyan, Yusuf Aytar,Andrea Vedaldi, Andrew Zisserman KArandjelovicand Zisserman,2012;Sanchezetal.2012)</td></tr><tr><td>SuperVision</td><td>16.4</td><td>34.2</td><td>University of Toronto</td><td>Alex Krizhevsky,Ilya Sutskever,Geoffrey Hinton (Krizhevsky etal.,2012)</td></tr><tr><td>UvA</td><td>29.6</td><td>1</td><td>University of Amsterdam</td><td>Koen E. A. van de Sande, Amir Habibian, Cees G. M. Snoek (Sanchez and Perronni2011;Scheireret al.,2012)</td></tr><tr><td>XRCE</td><td>27.1</td><td>-</td><td>Xerox Research Centre Europet, LEAR INRIA $</td><td>Florent Peronnint,Zeyep Akatat‡,Zaid Harchaouit，Cordelia Shmid (Perronnin et al., 2012)</td></tr></table>

Table 5 Teams participating in ILSVRC20 1 0-20 1 2 , ordered alphabetically. Each method is identified with a codename used in the text . We report flat top-5 classification and single-obj ect localization error , in percents (lower is better) . For teams which submitted multiple entries we report the best score . In 20 1 2 , SuperVision also submitted entries trained with the extra data from the ImageNet Fall 20 1 1 release , and obtained 1 5 . 3% classification error and 33 . 5 % localization error . Key references are provided where available . More details about the winning entries can be found in Section 5 . 1 .

ILSVRC 20 13
<table><tr><td>Codename Adobe</td><td>CLS 15.2</td><td>LOC 1</td><td>DET 1</td><td>Insitutions Adobet, University of Illinois at Urbana-Champaignt</td><td>Contributors and references Hailin Jint, Zhe Lint, Jianchao Yangt,Tom Painet</td></tr><tr><td>AHoward</td><td>13.6</td><td></td><td>1</td><td>Andrew Howard Consulting</td><td>(Krizhevsky et al.,2012) Andrew Howard</td></tr><tr><td>BUPT</td><td>25.2</td><td></td><td>1</td><td>Beijing University of Posts and Telecommunications†, Orange Labs</td><td>Chong Huang†, Yunlong Biant, Hongliang Bai‡, Bo Liut, Yanchao Feng†, Yuan Dong†</td></tr><tr><td>Clarifai</td><td>11.7</td><td></td><td>-</td><td>International Center Beijing Clarifai</td><td>Matthew Zeiler</td></tr><tr><td>CogVision</td><td>16.1</td><td>1</td><td></td><td>Microsoft Researcht,HarbinInstituteof Techology</td><td>(Zeiler and Fergus,2013; Zeiler et al.,2011) Kuiyuan Yangt,Yalong Bait,Yong Rui</td></tr><tr><td>decaf</td><td>19.2</td><td>1</td><td>1 1</td><td>University of California Berkeley</td><td>Yangqing JiaJeff Donahue, Trevor Darrell</td></tr><tr><td>Deep Punx</td><td>20.9</td><td>-</td><td>-</td><td>Saint Petersburg State University</td><td>(Donahueetal.,2013) Evgeny Smirnov,Denis Timoshenko,Alexey Korolev</td></tr><tr><td>Delta</td><td>1</td><td>-</td><td>6.1</td><td>National Tsing Hua University</td><td>(Krizhevsky etal.,2012；Wanetal.,2013;Tang，2013) Che-Rung Le,Hwann-Tzong Chen, Hao-Ping Kang,Tzu-Wei Huang,Ci-Hong Deng, Hao-</td></tr><tr><td>IBM</td><td>20.7</td><td></td><td>1</td><td>University of Illnois at Urbana-Champaignt,IBM Watson Re-</td><td>CheKao Zhicheng Yant,Liangliang Caot,John R Smith‡,Noel Codell‡,Michele Merler‡, Sharath</td></tr><tr><td>MIL</td><td>24.4</td><td></td><td></td><td>search Center‡,IBM Haifa Research Center University of Tokyo</td><td>Pankanti‡,Sharon Alpert,Yochay Tzur干， Masatoshi Hidaka, Chie Kamada, Yusuke Mukuta,Naoyuki Gunji, Yoshitaka Ushiku, Tat-</td></tr><tr><td>Minerva</td><td>21.7</td><td></td><td></td><td>Peking Universityt， Microsoft Research‡，Shanghai Jiao Tong</td><td>suya Harada TianjunXiaot,Minjie Wang干#JianpengLiS,Yalong Bais#,Jiaxing Zhang,Kuiyuan</td></tr><tr><td>NEC</td><td>1</td><td></td><td></td><td>University,iian UversityS,rbinIsituteofechlo</td><td>Yang,ChuntaoHong‡,Zheng Zhang (Wang et al.,2014) Xiaoyu Wangt,Miao Sun‡,Tianbao Yang†, Yuanqing Lint, Tony X. Han‡,Shenghuo Zhut</td></tr><tr><td>NUS</td><td>13.0</td><td>1</td><td>19.6</td><td>NEC Labs Americat, University of Missouri National University of Singapore</td><td>(Wang et al.,2013) Min Lin*,Qiang Chen*,Jian Dong,Junshi Huang,Wei Xia, Shuicheng Yan (* = equal</td></tr><tr><td>Orange</td><td>25.2</td><td></td><td></td><td></td><td>contribution) (Krizhevsky etal.,2012) Hongliang BAit,Lezi Wang‡,Shusheng Cen‡, YiNan Liu‡, Kun Taot, Wei Liut,Peng Lit,</td></tr><tr><td>OverFeat</td><td>14.2</td><td></td><td></td><td>Orange Labs International Center Beijing†,Beijing University of Posts and Telecommunicationst</td><td>Yuan Dongt Pierre Sermanet,David Eigen, Michael Mathieu, Xiang Zhang,Rob Fergus, Yann LeCun</td></tr><tr><td>Quantum</td><td>82.0</td><td>30.0</td><td>(19.4)</td><td>New York University Self-employedt,Student in Troy High School, Fullerton,A</td><td>(Sermanetetal.,213) Henry Shut, Jerry Shu</td></tr><tr><td>SYSU</td><td>1</td><td>1</td><td>1 10.5</td><td>Sun Yat-Sen University China.</td><td>（Batraet al.,2013） Xiaolong Wang</td></tr><tr><td>Toronto</td><td>-</td><td></td><td>11.5</td><td>University of Toronto</td><td>(Felzenszwalb et al., 2010) Yichuan Tang*，Nitish Srivastava*, Ruslan Salakhutdinov (* = equal contribution)</td></tr><tr><td>Trimps</td><td>26.2</td><td>1</td><td>1</td><td></td><td>Jie Shao, Xiaoteng Zhang, Yanfeng Shang,Wenfei Wang, Lin Mei, Chuanping Hu</td></tr><tr><td>UCLA</td><td>1</td><td></td><td>9.8</td><td>University of California Los Angeles</td><td>Yukun Zhu, Jun Zhu,Alan Yuille</td></tr><tr><td>UIUC</td><td>-</td><td>1</td><td>1.0</td><td>Universityof Illinois at Urbana-Champaign</td><td>Thomas Paine, ,Kevin Shih, Thomas Huang (Krizhevskyetal.,2012)</td></tr><tr><td>UvA</td><td>14.3</td><td>1</td><td>22.6</td><td>University of Amsterdam,Euvision Technologies</td><td>Koen E.A. van de Sande, Daniel H.F.Fontijne,Cees G. M. Snoek, Harro M. G. Stokman, ArnoldW.M.Smeulders</td></tr><tr><td>VGG</td><td>15.2</td><td>46.4</td><td>-</td><td>Visual Geometry Group, University of Oxford</td><td>(vande Sande et al.,2014) Karen Simonyan, Andrea Vedaldi, Andrew Zisserman</td></tr><tr><td>ZF</td><td>13.5</td><td>1</td><td>-</td><td>New York University</td><td>(Simonyanetal., 2013) Matthew D Zeiler, Rob Fergus (Zeilerand Fergus, 2013；Zeiler et al.,2011)</td></tr></table>

Table 6 Teams participating in ILSVRC20 1 3 , ordered alphabetically. Each method is identified with a codename used in the text . For classificaton and single-obj ect localization we report flat top- 5 error , in percents (lower is better) . For detection we report mean average precision , in percents (higher is better) . Even though the winner of the challenge was determined by the number of obj ect categories won , this correlated strongly with mAP. Parentheses indicate the team used outside training data and was not part of the official competition . Some competing teams also submitted entries trained with outside data: Clarifai with 1 1 . 2% classification error , NEC with 20 . 9% detection mAP. Key references are provided where available . More details about the winning entries can be found in Section 5 . 1 .

ILSVRC 20 14
<table><tr><td>Codename</td><td>CLS</td><td>CLSoLOC</td><td></td><td></td><td></td><td>LOCoDET</td><td></td><td>DETo Insitutions</td><td>Contributors and references</td></tr><tr><td>Adobe AHoward</td><td>- 8.1</td><td>11.6</td><td></td><td>1</td><td>30.1</td><td>1</td><td>1 -</td><td>Adobet, UIuct</td><td>Hailin Jint, Zhaowen Wang‡, Jianchao Yangt, Zhe Lint Andrew Howard (Howard, 2014)</td></tr><tr><td>BDC</td><td>11.3</td><td>1 -</td><td></td><td>。 。</td><td>1 1</td><td>- 1</td><td>1</td><td>Howard Vision Technologies InstituteforInfocommResearcht,Uni</td><td>Olivier Moret,HanlinGoht,Antoine Vellard,VijayChandrasekhart(Krizevsyetal.12)</td></tr><tr><td>Berkeley</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>versit Pierret MariCuriea</td><td></td></tr><tr><td></td><td>1</td><td></td><td></td><td>1</td><td>1</td><td>1</td><td>34.5</td><td>UC Berkeley</td><td></td></tr><tr><td>BREIL Brno</td><td>16.0 17.6</td><td>1</td><td></td><td>。</td><td>1</td><td>1</td><td>-</td><td>KAIST department of EE</td><td>Jun-Cheol Park,Yunhun Jang,Hyungwon Choi, JaeYoung Jun (Chatfield et al., 2014; Jia, 2013) Martin Kolar,Michal Hradis,PavelSvoboda (Krizhevskyetal.,2012; Mikolov etal.2013；Jia,2013)</td></tr><tr><td>CASIA-2</td><td>1</td><td>=</td><td></td><td>52.0 1</td><td>1</td><td>、 28.6</td><td>- 1</td><td>Brno University of Technology Chinese Academy of Sciencet, South-</td><td>Peihao Huang†, Yongzhen Huang†， Feng Liu‡， Zifeng Wut, Fang Zhaot, Liang Wang†,Tieniu</td></tr><tr><td>CASIAWS</td><td>1</td><td></td><td>11.4</td><td>1</td><td>。</td><td>1</td><td>1</td><td>east University‡ CRIPAC, CASIA</td><td>Tant(Girshick et al.,2014) Weiqiang Ren,Chong Wang, Yanhua Chen,Kaiqi Huang,Tieniu Tan (Arbelaez et al.,2014)</td></tr><tr><td>Cldi</td><td>13.9</td><td></td><td></td><td>46.9</td><td></td><td>=</td><td></td><td>KAISTt, Cldi Inc.</td><td>Kyunghyun Paengt,Donggeun Yoot,Sunggyun Parkt, Jungin Lee,Anthony S.Paek,In So Kweont, SeongDae Kimt(Krizhevsky etal.,2012; Perronnin etal.,2010)</td></tr><tr><td>CUHK</td><td>-</td><td></td><td></td><td></td><td></td><td></td><td>40.7</td><td>The Chinese University of Hong Kong</td><td>Wanli Ouyang,Ping Luo, Xingyu Zeng,Shi Qiu Yonglong Tian, Hongsheng Li, Shuo Yang,Zhe Wang, Yuanjun Xiong，Chen Qian, Zhenyao Zhu，Ruohui Wang,Chen-ChangeLoyXiaogang Wang，Xiaoou</td></tr><tr><td>DeepCNet</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>Tang(Ouyang etal.2014;OuyangandWang,2013) Ben Graham (Graham,2013; Schmidhuber，2012)</td></tr><tr><td>DeepInsight</td><td>17.5</td><td></td><td></td><td>。</td><td></td><td>1</td><td>1 40.5</td><td>University of Warwick NLPRt,HKUST</td><td>Junjie Yant, Naiyan Wang‡,Stan Z. Lit, Dit-Yan Yeung(Girshick et al., 2014)</td></tr><tr><td>FengjunLv</td><td>17.4</td><td></td><td></td><td>1 。</td><td>= 1</td><td>1</td><td>-</td><td>Fengjun Lv Consulting</td><td>Fengjun Lv (Krizhevsky et al.,2012; Harel etal.,2007)</td></tr><tr><td>Go0gLeNet</td><td>6.7</td><td></td><td></td><td>26.4</td><td>1</td><td>1</td><td>43.9</td><td>Google</td><td>Christian Szegedy,WeiLiu,Yangqing Jia,Pierre Sermanet,Scott Reed,DragoAnguelov,Dumitru Erhan, AndrewRabinovich(Segedy tal2014)</td></tr><tr><td>HKUST</td><td>1</td><td></td><td></td><td>1</td><td></td><td>28.9</td><td>1</td><td>Hong Kong U. of Science and Tech.t,</td><td>CewuLut,HeiLaw*t,HaoChen,QifengChen*干,YaoXiao*tChiKeung Tangt(Uijlingsetal.2013;</td></tr><tr><td>libccv</td><td></td><td>=</td><td></td><td></td><td></td><td></td><td></td><td>Chinese U.of H. K., Stanford U.干</td><td>Girshick etal.,2013；Perronninetal.,20l0;Felzenszwalb etal.,010)</td></tr><tr><td>MIL</td><td>16.0 18.3</td><td></td><td></td><td>。 33.7</td><td>1</td><td>1 1</td><td>- 30.4</td><td>libccv.org The University ofTokyot，</td><td>Liu Liu (Zeiler and Fergus, 2013) Senthil Purushwalkamt‡, Yuichiro Tsuchiyat, Atsushi Kanehirat, Asako Kanezakit, Tatsuya</td></tr><tr><td>MPG-UT</td><td></td><td>-</td><td></td><td></td><td></td><td></td><td></td><td>Guwahati‡</td><td>Haradat(Kanezakietal.,014;Girshick etal.</td></tr><tr><td>MSRA</td><td>1 8.1</td><td>1</td><td></td><td>- 35.5</td><td>1 1</td><td>1 35.1</td><td>26.4 1</td><td>The University of Tokyo</td><td>Riku Togashi, Keita Iwamoto,Tomoaki Iwase,Hideki Nakayama (Girshick etal.,2014) Kaiming Het, Xiangyu Zhang‡,Shaoqing Ren干, Jian Sunt(He et al., 2014)</td></tr><tr><td>NUS</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>Jian Dongt, ,Yunchao Weit, Min Lint, Qiang Chen‡,Wei Xiat, Shuicheng Yant(Lin et al.,2014a; Chen</td></tr><tr><td>NUS-BST</td><td>1</td><td></td><td></td><td>1</td><td></td><td>37.2</td><td>1</td><td>National University of Singaporet, IBM Research Australia</td><td>et al.,2014)</td></tr><tr><td></td><td>9.8</td><td>1</td><td></td><td>。</td><td>1</td><td>1</td><td>1</td><td>National Univof Singaporet,Bing Samsung Telecom R&amp;D Centert</td><td>MinLint,JianDongt,HanjiangLait,Junjun Xiong,ShuichengYant(Linetal.,2014a; Howard2014; Krizhevskyetnal.,2012)</td></tr><tr><td>Orange PassBy</td><td>15.2</td><td>-</td><td>14.8</td><td>42.8</td><td>42.7</td><td>1 1</td><td>27.7</td><td> Orange Labs Beijingt, BUPT Chinat</td><td>Hongliang Bait, Yinan Liut,Bo Liu‡,Yanchao Feng‡,Kun Taot,Yuan Dongt(Girshick et al., 2014) Lin Sunt‡, Zhanghui Kuangt, Cong Zhaot, Kui Jia干,Oscar C.Au*(Jia, 2013; Krizhevsky et al., 2012)</td></tr><tr><td>SCUT</td><td>16.7 18.8</td><td></td><td></td><td>。 。</td><td>1</td><td></td><td>-</td><td>LENOVOt, HKUST‡, U. of MacaoF South China Univ. of Technology</td><td>Guo Lihua,Liao Qijun,Ma Qianli,Lin Junbin</td></tr><tr><td>Southeast SYSU</td><td>1</td><td></td><td></td><td>1</td><td>1</td><td>30.5</td><td>-</td><td>Southeast U.t,Chinese A.ofSciences</td><td>Feng Liut, Zifeng Wu, Yongzhen Huang Liliang Zhang, Tianshui Chen, Shuye Zhang, Wanglan He, Liang Lin, Dengguang Pang, Lingbo Liu</td></tr><tr><td>Trimps</td><td>14.4 1</td><td>11.5</td><td></td><td>31.9 1</td><td>42.2</td><td>1 1</td><td>1 33.7</td><td>Sun Yat-Sen University TheThird Research Institute of the</td><td>Jie Shao， ，Xiaoteng Zhang， JianYing Zhou，Jian Wang, Jian Chen, Yanfeng Shang, Wenfei Wang, Lin</td></tr><tr><td>TTIC</td><td>10.2</td><td></td><td></td><td>48.3</td><td></td><td></td><td>1</td><td>Ministry of Public Security Toyota Technological Institute</td><td>MeiCuaigHu (ck 2014;Manen et al., ,2013;Howard,2014) George Papandreout, Iasonas Kokkinos‡(Papandreou, 2014;Papandreou etal.,2014； Jojicetal.,2003;</td></tr><tr><td>UI</td><td></td><td></td><td></td><td>。</td><td></td><td></td><td></td><td>Chicagot,EcoleCentralePais University of Isfahan</td><td>Krizhevskyetal.,20i2;Sermanetetal., 2013;DuboutandFleuret0l2；Iandolaetal.,2014) Fatemeh Shafizadegan, Elham Shabaninia (Yang et al.,2009)</td></tr><tr><td>UvA</td><td>99.5 12.1</td><td></td><td></td><td>。</td><td></td><td>32.0</td><td>35.4</td><td>U. of Amsterdam and Euvision Tech.</td><td>Koen van de Sande, Daniel Fontijne, Cees Snoek, Harro Stokman, Arnold Smeulders (van de Sande et al.,</td></tr><tr><td>VGG</td><td>73</td><td>1</td><td></td><td>25.3</td><td>1</td><td>1</td><td>1</td><td>University of Oxford</td><td>2014） Karen Simonyan, Andrew Zisserman (Simonyan and Zisserman, 2014)</td></tr><tr><td>XYZ</td><td>11.2</td><td></td><td></td><td>。</td><td>1</td><td>1</td><td>-</td><td>The University of Queensland</td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table>

Table 7 Teams participating in ILSVRC20 14 , ordered alphabetically. Each method is identified with a codename used in the text . For classificaton and single-obj ect localization we report flat top- 5 error , in percents (lower is better) . For detection we report mean average precision , in percents (higher is better) . C L So , L O Co , D ETo corresponds to entries using outside training data (officially allowed in ILSVRC20 14) . ◦ means localization error greater than 60% (localization submission was required with every classification submission) . Key references are provided where available . More details about the winning entries can be found in Section 5 . 1 .

In the single-object localization with provided data track, the winning team was VGG, which explored the effect of convolutional neural network depth on its accuracy by using three different architectures with up to 19 weight layers with rectified linear unit non-linearity, building off of the implementation of Caffe (Jia, 2013). For localization they used per-class bounding box regression similar to OverFeat (Sermanet et al., 2013). In the single-object localization with external data track, Adobe used 2000 additional ImageNet classes to train the classifiers in an integrated convolutional neural network framework for both classification and localization, with bounding box regression. At test time they used k-means to find bounding box clusters and rank the clusters according to the classification scores.

In the object detection with provided data track, the winning team NUS used the RCNN framework (Girshick et al., 2013) with the network-in-network method (Lin et al., 2014a) and improvements of (Howard, 2014). Global context information was incorporated following (Chen et al., 2014). In the object detection with external data track, the winning team was GoogLeNet (which also won image classification with provided data). It is truly remarkable that the same team was able to win at both image classification and object detection, indicating that their methods are able to not only classify the image based on scene information but also accurately localize multiple object instances. Just like most teams participating in this track, GoogLeNet used the image classification dataset as extra training data.

## 5.2 Large scale algorithmic innovations

ILSVRC over the past five years has paved the way for several breakthroughs in computer vision.

The field of categorical object recognition has dramatically evolved in the large-scale setting. Section 5.1 documents the progress, starting from coded SIFT features and evolving to large-scale convolutional neural networks dominating at all three tasks of image classification, single-object localization, and object detection. With the availability of so much training data (along with an efficient algorithmic implementation and GPU computing resources) it became possible to learn neural networks directly from the image data, without needing to create multi-stage hand-tuned pipelines of extracted features and discriminative classifiers. The major breakthrough came in 2012 with the win of the SuperVision team on image classification and single-object localization tasks (Krizhevsky et al., 2012), and by 2014 all of the top contestants were relying heavily on convolutional neural networks.

Further, over the past few years there has been a lot of focus on large-scale recognition in the computer vision community . Best paper awards at top vision conferences in 2013 were awarded to large-scale recognition methods: at CVPR 2013 to ”Fast, Accurate Detection of 100,000 Object Classes on a Single Machine” (Dean et al., 2013) and at ICCV 2013 to ”From Large Scale Image Categorization to Entry-Level Categories” (Ordonez et al., 2013). Additionally, several influential lines of research have emerged, such as large-scale weakly supervised localization work of (Kuettel et al., 2012) which was awarded the best paper award in ECCV 2012 and large-scale zero-shot learning, e.g., (Frome et al., 2013).

## 6 Results and analysis

## 6.1 Improvements over the years

State-of-the-art accuracy has improved significantly from ILSVRC2010 to ILSVRC2014, showcasing the massive progress that has been made in large-scale object recognition over the past five years. The performance of the winning ILSVRC entries for each task and each year are shown in Figure 9. The improvement over the years is clearly visible. In this section we quantify and analyze this improvement.

## 6.1.1 Image classification and single-object localization improvement over the years

There has been a 4.2x reduction in image classification error (from 28.2% to 6.7%) and a 1.7x reduction in single-object localization error (from 42.5% to 25.3%) since the beginning of the challenge. For consistency, here we consider only teams that use the provided training data. Even though the exact object categories have changed (Section 3.1.1), the large scale of the dataset has remained the same (Table 2), making the results comparable across the years. The dataset has not changed since 2012, and there has been a 2.4x reduction in image classification error (from 16.4% to 6.7%) and a 1.3x in single-object localization error (from 33.5% to 25.3%) in the past three years.

![](Images_26M35FQL/23ee9c6fcfa52c59ceb782d4b66893f7b1a98bed4507dc8585350fdf85fc4af3.jpg)

![](Images_26M35FQL/1518a3a75e38d925a857de000253831b75a12a3703138b1980bc690672a0935f.jpg)

![](Images_26M35FQL/3bc353f23208f6bd7b1b5a66841f1f61127af87983765c750144f2d35424f74f.jpg)  
Fig. 9 Performance of winning entries in the ILSVRC2010- 2014 competitions in each of the three tasks (details about the entries and numerical results are in Section 5.1). There is a steady reduction of error every year in object classification and single-object localization tasks, and a 1.9x improvement in mean average precision in object detection. There are two considerations in making these comparisons. (1) The object categories used in ISLVRC changed between years 2010 and 2011, and between 2011 and 2012. However, the large scale of the data (1000 object categories, 1.2 million training images) has remained the same, making it possible to compare results. Image classification and single-object localization entries shown here use only provided training data. (2) The size of the object detection training data has increased significantly between years 2013 and 2014 (Section 3.3). Section 6.1 discusses the relative effects of training data increase versus algorithmic improvements.

## 6.1.2 Object detection improvement over the years

Object detection accuracy as measured by the mean average precision (mAP) has increased 1.9x since the introduction of this task, from 22.6% mAP in ILSVRC2013 to 43.9% mAP in ILSVRC2014. However, these results are not directly comparable for two reasons. First, the size of the object detection training data has increased significantly from 2013 to 2014 (Section 3.3). Second, the 43.9% mAP result was obtained with the addition of the image classification and single-object localization training data. Here we attempt to understand the relative effects of the training set size increase versus algorithmic improvements. All models are evaluated on the same ILSVRC2013-2014 object detection test set.

First, we quantify the effects of increasing detection training data between the two challenges by comparing the same model trained on ILSVRC2013 detection data versus ILSVRC2014 detection data. The UvA team’s framework from 2013 achieved 22.6% with ILSVRC2013 data (Table 6) and 26.3% with ILSVRC2014 data and no other modifications.10 The absolute increase in mAP was 3.7%. The RCNN model achieved 31.4% mAP with ILSVRC2013 detection plus image classification data (Girshick et al., 2013) and 34.5% mAP with ILSVRC2014 detection plus image classification data (Berkeley team in Table 7). The absolute increase in mAP by expanding ILSVRC2013 detection data to ILSVRC2014 was 3.1%.

Second, we quantify the effects of adding in the external data for training object detection models. The NEC model in 2013 achieved 19.6% mAP trained on ILSVRC2013 detection data alone and 20.9% mAP trained on ILSVRC2013 detection plus classification data (Table 6). The absolute increase in mAP was 1.3%. The UvA team’s best entry in 2014 achieved 32.0% mAP trained on ILSVRC2014 detection data and 35.4% mAP trained on ILSVRC2014 detection plus classification data. The absolute increase in mAP was 3.4%.

Thus, we conclude based on the evidence so far that expanding the ILSVRC2013 detection set to the ILSVRC2014 set, as well as adding in additional training data from the classification task, all account for approximately 1 − 4% in absolute mAP improvement for the models. For comparison, we can also attempt to quantify the effect of algorithmic innovation. The UvA team’s 2013 framework achieved 26.3% mAP on ILSVRC2014 data as mentioned above, and their improved method in 2014 obtained 32.0% mAP (Table 7). This is 5.8% absolute increase in mAP over just one year from algorithmic innovation alone.

In summary, we conclude that the absolute 21.3% increase in mAP between winning entries of ILSVRC2013 (22.6% mAP) and of ILSVRC2014 (43.9% mAP) is the result of impressive algorithmic innovation and not just a consequence of increased training data. However, increasing the ISLVRC2014 object detection training dataset further is likely to produce additional improvements in detection accuracy for current algorithms.

## 6.2 Statistical significance

One important question to ask is whether results of different submissions to ILSVRC are statistically significantly different from each other. Given the large scale, it is no surprise that even minor differences in accuracy are statistically significant; we seek to quantify exactly how much of a difference is enough.

Following the strategy employed by PASCAL VOC (Everingham et al., 2014), for each method we obtain a confidence interval of its score using bootstrap sampling. During each bootstrap round, we sample N images with replacement from all the available N test images and evaluate the performance of the algorithm on those sampled images. This can be done very efficiently by precomputing the accuracy on each image. Given the results of all the bootstrapping rounds we discard the lower and the upper α fraction. The range of the remaining results represents the 1 − 2α confidence interval. We run a large number of bootstrapping rounds (from 20,000 until convergence). Table 8 shows the results of the top entries to each task of ILSVRC2012-2014. The winning methods are statistically significantly different from the other methods, even at the 99.9% level.

<table><tr><td colspan="2">Imageciasshication</td><td>Error( (percent)</td><td></td><td>99.9% Conf Int</td></tr><tr><td>Year</td><td>Codename</td><td>6.66</td><td></td><td>6.40-6.92</td></tr><tr><td>2014 2014</td><td>GoogLeNet VGG</td><td>7.32</td><td></td><td>7.05 - 7.60</td></tr><tr><td>2014</td><td>MSRA</td><td>8.06</td><td></td><td>7.78 - 8.34</td></tr><tr><td>2014</td><td>AHoward</td><td>8.11</td><td></td><td>7.83- 8.39</td></tr><tr><td>2014</td><td></td><td>9.51</td><td></td><td>9.21- 9.82</td></tr><tr><td></td><td>DeeperVision</td><td>11.20</td><td></td><td>10.87 - 11.53</td></tr><tr><td>2013</td><td>Clarifait</td><td></td><td></td><td>11.03- 11.69</td></tr><tr><td>2014</td><td>CASIAWSt</td><td>11.36</td><td></td><td>11.13- 11.80</td></tr><tr><td>2014</td><td>Trimpst</td><td>11.46</td><td></td><td></td></tr><tr><td>2014</td><td>Adobet</td><td>11.58</td><td></td><td>11.25 - 11.91</td></tr><tr><td>2013</td><td>Clarifai</td><td>11.74</td><td></td><td>11.41 - 12.08</td></tr><tr><td>2013</td><td>NUS</td><td>12.95</td><td></td><td>12.60- 13.30</td></tr><tr><td>2013</td><td>ZF</td><td>13.51</td><td></td><td>13.14 - 13.87</td></tr><tr><td>2013</td><td>AHoward</td><td>13.55</td><td></td><td>13.20- 13.91</td></tr><tr><td>2013</td><td>OverFeat</td><td>14.18</td><td></td><td>13.83- 14.54</td></tr><tr><td>2014</td><td>Oranget</td><td>14.80</td><td></td><td>14.43- 15.17</td></tr><tr><td>2012</td><td>SuperVisiont</td><td>15.32</td><td></td><td>14.94 - 15.69</td></tr><tr><td>2012</td><td>SuperVision</td><td>16.42</td><td></td><td>16.04 - 16.80</td></tr><tr><td>2012</td><td>ISI</td><td>26.17</td><td></td><td>25.71- 26.65</td></tr><tr><td>2012</td><td>VGG</td><td>26.98</td><td></td><td>26.53- 27.43</td></tr><tr><td>2012</td><td>XRCE</td><td>27.06</td><td></td><td>26.60- 27.52</td></tr><tr><td>2012</td><td>UvA</td><td>29.58</td><td></td><td>29.09-30.04</td></tr></table>

Single-object localization
<table><tr><td>Year</td><td>Codename</td><td>Error (percent)</td><td>99.9% 6ConfInt</td></tr><tr><td>2014</td><td>VGG</td><td>25.32</td><td>24.87 - 25.78</td></tr><tr><td>2014</td><td>GoogLeNet</td><td>26.44</td><td>25.98- 26.92</td></tr><tr><td>2013</td><td>OverFeat</td><td>29.88</td><td>29.38 - 30.35</td></tr><tr><td>2014</td><td>Adobet</td><td>30.10</td><td>29.61 - 30.58</td></tr><tr><td>2014</td><td>SYSU</td><td>31.90</td><td>31.40- 32.40</td></tr><tr><td>2012</td><td>SuperVisiont</td><td>33.55</td><td>33.05 - 34.04</td></tr><tr><td>2014</td><td>MIL</td><td>33.74</td><td>33.24- 34.25</td></tr><tr><td>2012</td><td>SuperVision</td><td>34.19</td><td>33.67 - 34.69</td></tr><tr><td>2014</td><td>MSRA</td><td>35.48</td><td>34.97 - 35.99</td></tr><tr><td>2014</td><td>Trimpst</td><td>42.22</td><td>41.69 - 42.75</td></tr><tr><td>2014</td><td>Oranget</td><td>42.70</td><td>42.18- 43.24</td></tr><tr><td>2013</td><td>VGG</td><td>46.42</td><td>45.90 - 46.95</td></tr><tr><td>2012</td><td>VGG</td><td>50.03</td><td>49.50 - 50.57</td></tr><tr><td>2012</td><td>ISI</td><td>53.65</td><td>53.10- 54.17</td></tr><tr><td>2014</td><td>CASIAWSt</td><td>61.96</td><td>61.44 - 62.48</td></tr></table>

Object detection
<table><tr><td colspan="4">Objectdetection</td></tr><tr><td>Year</td><td>Codename</td><td>AP (percent)</td><td>99.9% Conf Int</td></tr><tr><td>2014</td><td>GoogLeNett</td><td>43.93</td><td>42.92- 45.65</td></tr><tr><td>2014</td><td>CUHKt</td><td>40.67</td><td>39.68- 42.30</td></tr><tr><td>2014</td><td>DeepInsight †</td><td>40.45</td><td>39.49- 42.06</td></tr><tr><td>2014</td><td>NUS</td><td>37.21</td><td>36.29 -38.80</td></tr><tr><td>2014</td><td>UvAt</td><td>35.42</td><td>34.63- 36.92</td></tr><tr><td>2014</td><td>MSRA</td><td>35.11</td><td>34.36 - 36.70</td></tr><tr><td>2014</td><td>Berkeleyt</td><td>34.52</td><td>33.67- 36.12</td></tr><tr><td>2014</td><td>UvA</td><td>32.03</td><td>31.28 - 33.49</td></tr><tr><td>2014</td><td>Southeast</td><td>30.48</td><td>29.70- 31.93</td></tr><tr><td>2014</td><td>HKUST</td><td>28.87</td><td>28.03-30.20</td></tr><tr><td>2013</td><td>UvA</td><td>22.58</td><td>22.00- 23.82</td></tr><tr><td>2013</td><td>NECt</td><td>20.90</td><td>20.40- 22.15</td></tr><tr><td>2013</td><td>NEC</td><td>19.62</td><td>19.14 - 20.85</td></tr><tr><td>2013</td><td>OverFeat†</td><td>19.40</td><td>18.82 - 20.61</td></tr><tr><td>2013</td><td>Toronto</td><td>11.46</td><td>10.98 - 12.34</td></tr><tr><td>2013</td><td>SYSU</td><td>10.45</td><td>10.04 - 11.32</td></tr><tr><td>2013</td><td>UCLA</td><td>9.83</td><td>9.48- 10.77</td></tr></table>

Table 8 We use bootstrapping to construct 99.9% confidence intervals around the result of up to top 5 submissions to each ILSVRC task in 2012-2014. †means the entry used external training data. The winners using the provided data for each track and each year are bolded. The difference between the winning method and the runner-up each year is significant even at the 99.9% level.

![](Images_26M35FQL/e804041943672df32b8f439ab740ee64351ca1d732d6ebeb4b20978d81bae4e8.jpg)  
Fig. 10 For each object class, we consider the best performance of any entry submitted to ILSVRC2012-2014, including entries using additional training data. The plots show the distribution of these “optimistic” per-class results. Performance is measured as accuracy for image classification (left) and for single-object localization (middle), and as average precision for object detection (right). While the results are very promising in image classification, the ILSVRC datasets are far from saturated: many object classes continue to be challenging for current algorithms.

## 6.3 Current state of categorical object recognition

Besides looking at just the average accuracy across hundreds of object categories and tens of thousands of images, we can also delve deeper to understand where mistakes are being made and where researchers’ efforts should be focused to expedite progress.

To do so, in this section we will be analyzing an “optimistic” measurement of state-of-the-art recognition performance instead of focusing on the differences in individual algorithms. For each task and each object class, we compute the best performance of any entry submitted to any ILSVRC2012-2014, including methods using additional training data. Since the test sets have remained the same, we can directly compare all the entries in the past three years to obtain the most “optimistic” measurement of state-of-the-art accuracy on each category.

For consistency with the object detection metric (higher is better), in this section we will be using image classification and single-object localization accuracy instead of error, where accuracy = 1 − error.

## 6.3.1 Range of accuracy across object classes

Figure 10 shows the distribution of accuracy achieved by the “optimistic” models across the object categories. The image classification model achieves 94.6% accuracy on average (or 5.4% error), but there remains a 41.0% absolute difference inaccuracy between the most and least accurate object class. The single-object localization model achieves 81.5% accuracy on average (or 18.5% error), with a 77.0% range in accuracy across the object classes. The object detection model achieves 44.7% average precision, with an 84.7% range across the object classes. It is clear that the ILSVRC dataset is far from saturated: performance on many categories has remained poor despite the strong overall performance of the models.

## 6.3.2 Qualitative examples of easy and hard classes

Figures 11 and 12 show the easiest and hardest classes for each task, i.e., classes with the best and worst results obtained with the “optimistic” models.

For image classification, 121 out of 1000 object classes have 100% image classification accuracy according to the optimistic estimate. Figure 11 (top) shows a random set of 10 of them. They contain a variety of classes, such as mammals like “red fox” and animals with distinctive structures like “stingray”. The hardest classes in the image classification task, with accuracy as low as 59.0%, include metallic and see-through man-made objects, such as “hook” and “water bottle,” the material “velvet” and the highly varied scene class “restaurant.”

For single-object localization, the 10 easiest classes with 99.0 − 100% accuracy are all mammals and birds. The hardest classes include metallic man-made objects such as “letter opener” and “ladle”, plus thin structures such as “pole” and “spacebar” and highly varied classes such as “wing”. The most challenging class “spacebar” has a only 23.0% localization accuracy.

Object detection results are shown in Figure 12. The easiest classes are living organisms such as “dog” and “tiger”, plus “basketball” and “volleyball” with distinctive shape and color, and a somewhat surprising “snowplow.” The easiest class “butterfly” is not yet perfectly detected but is very close with 92.7% AP. The hardest classes are as expected small thin objects such as “flute” and “nail”, and the highly varied “lamp” and “backpack” classes, with as low as 8.0% AP.

## 6.3.3 Per-class accuracy as a function of image properties

We now take a closer look at the image properties to try to understand why current algorithms perform well on some object classes but not others. One hypothesis is that variation in accuracy comes from the fact that instances of some classes tend to be much smaller in images than instances of other classes, and smaller objects may be harder for computers to recognize. In this section we argue that while accuracy is correlated with object scale in the image, not all variation in accuracy can be accounted for by scale alone.

For every object class, we compute its average scale, or the average fraction of image area occupied by an instance of the object class on the ILSVRC2012-2014 validation set. Since the images and object classes in the image classification and single-object localization tasks are the same, we use the bounding box annotations of the single-object localization dataset for both tasks. In that dataset the object classes range from “swimming trunks” with scale of 1.5% to “spider web” with scale of 85.6%. In the object detection validation dataset the object classes range from “sunglasses” with scale of 1.3% to “sofa” with scale of 44.4%.

Figure 13 shows the performance of the “optimistic” method as a function of the average scale of the object in the image. Each dot corresponds to one object class. We observe a very weak positive correlation between object scale and image classification accuracy: ρ = 0.14. For single-object localization and object detection the correlation is stronger, at $\rho = 0 . 4 0$ and ρ = 0.41 respectively. It is clear that not all variation in accuracy can be accounted for by scale alone. Nevertheless, in the next section we will normalize for object scale to ensure that this factor is not affecting our conclusions.

## 6.3.4 Per-class accuracy as a function of object properties.

Besides considering image-level properties we can also observe how accuracy changes as a function of intrinsic object properties. We define three properties inspired by human vision: the real-world size of the object, whether it’s deformable within instance, and how textured it is. For each property, the object classes are assigned to one of a few bins (listed below). These properties are illustrated in Figure 1.

Human subjects annotated each of the 1000 image classification and single-object localization object classes from ILSVRC2012-2014 with these properties. (Russakovsky et al., 2013). By construction (see Section 3.3.1), each of the 200 object detection classes is either also one of 1000 object classes or is an ancestor of one or more of the 1000 classes in the ImageNet hierarchy. To compute the values of the properties for each object detection class, we simply average the annotated values of the descendant classes.

In this section we draw the following conclusions about state-of-the-art recognition accuracy as a function of these object properties:

Real-world size: XS for extra small (e.g. nail), small (e.g. fox), medium (e.g. bookcase), large (e.g. car) or XL for extra large (e.g. church)

## Image classification

Easiest classes

red fox (100)hen-of-the-woods (100)

![](Images_26M35FQL/ea8b9c8525251e7288a31d0d599230eb2066ea757dc83e938f69e7b4a86632bf.jpg)  
tiger (100)

![](Images_26M35FQL/07210e1b803879308088d538fb06bd48fb31ade1b1eb02fdc5483f629138397e.jpg)  
hamster (100)

ibex (100)

![](Images_26M35FQL/990d3572902f1ecc46fde21c37255c431719469d40488ac665ef34c04e132cd9.jpg)

goldfinch (10o) flat-coated retriever (100)

porcupine (100)

![](Images_26M35FQL/81dff66621fa92c76590ad6f5a2533ea543579e2f154214d3f8814301bce888e.jpg)  
stingray (100)

![](Images_26M35FQL/1795e6165a6cb1b74e80cdda1b6f0a0a77fdfc47ec67833d84f9bf145787ccbc.jpg)  
Blenheim spaniel (100)

![](Images_26M35FQL/059861504c8a05afbb8c68008f58592a8e67946ca3099405111aedafce5cf722.jpg)

![](Images_26M35FQL/885b1251258f644363e4dde3fcdc32da905e5baf30f59d58d236449c18ced173.jpg)

![](Images_26M35FQL/22b70bc098a38e6c5a057cacf3f0dc9ef40e678f061b8d3c78cc42b4e2e4f978.jpg)

![](Images_26M35FQL/71f983f4c329fabd9baba0ae2d4e0bfe21155ed2f23893c867507d6652e6fd77.jpg)

![](Images_26M35FQL/9aca1147229b8c3415d714376a8112817fb1e3aec134266e2d252d5f2da30d0f.jpg)  
Hardest classes

muzzle (71)  
hatchet (68)  
![](Images_26M35FQL/61b667eaf6b8763eb8a0f9d3cf1307af23129de2dca708e84e9e89a578eb0a36.jpg)

velvet (68)  
![](Images_26M35FQL/724f53fc135c7fddb2d90f6a3ad47da0d2c2b0ac1110e5c32fac2eae2e7a8a7e.jpg)  
hook (66)  
loupe (66)  
spotlight (66)

![](Images_26M35FQL/c37f66fed054b37ba406740a3b2c28930213942af8e3a99ec020658e714b4dad.jpg)

![](Images_26M35FQL/05fec5856332db7e42a64252437ddad6485c43eaa5cc3bfdb72a3eb15efd10a5.jpg)

![](Images_26M35FQL/df97f0cddce23ac1d4898bd4877f8bbe5997f73544a780f034c0dec1a833fc71.jpg)

![](Images_26M35FQL/6a0ee510b763cd98535d1d7b2d97e0b3751ffba1969f1e5b37f3262821e17cab.jpg)

ladle (65)  
![](Images_26M35FQL/37b6a580c004fedcfaf721ae3403b7c353618b692fe4722b463aef3c069a0f9d.jpg)

![](Images_26M35FQL/afcb52e552e36e675c148fc30c9f2868299911efdb4aee0404943c63a06fcea4.jpg)  
letteropener(59)

![](Images_26M35FQL/86b23f4d6e4680a4f0cccee67933f1f79a24c06d6cd829b8e005abf7c3e9054a.jpg)

![](Images_26M35FQL/a2a2ea37516b637cab79be117225f37fcea4c7bf2b6229a6268fdafcbb0707fd.jpg)

Single-object localization Easiest classes

Leonberg (100)

![](Images_26M35FQL/bb1b82dfa464a34cf8677928fd1a5caa4f2cfd5301a2b435814db7c1919371a0.jpg)  
Maltese dog (99) Japanese spaniel (99)

![](Images_26M35FQL/3648df1ee63f6b8279c0a03aa73a89aa3bf99d8a342f5cf59255d93e9f843c4e.jpg)

![](Images_26M35FQL/3e986eddec6735c9e34b0a78b67919ae617dd9add09c7c4b934ae8d14ea58c17.jpg)  
tiger (99)

![](Images_26M35FQL/342cf424ca3fdafd1442d1a0685e38e6352182b523f683b84d3f2f5d1765700c.jpg)

![](Images_26M35FQL/9d717be3c48cf061961c394711f67210b4113a692375c40c53d7307aa6143888.jpg)  
Tibetan mastif(99)

![](Images_26M35FQL/15843848a65be3896f825dccb17e9b582b3c8220c979ec48e28867959464c7f2.jpg)  
hare (99)

![](Images_26M35FQL/676b36eb0e8e5d22fa3a3ebad74b303a30ee483d6b27171a683424a81b013ab3.jpg)  
African hunting dog (99)

![](Images_26M35FQL/5893eba8c0ab5d5432f85bc5c2f157ec7200c7a7f6ab69e72edbdfe76af0e6db.jpg)

![](Images_26M35FQL/4a118bb34d031612f4175f9233b6e1250903ae0e1445606f822a801672eb603a.jpg)

![](Images_26M35FQL/28f1234b51c81791766a76920f8ca195204b0d6dd5ae267e229c036d28f7c7c8.jpg)  
Hardest classes

horizontal bar (41)  
![](Images_26M35FQL/bfc8d9fca225e8f1074a2549ed20961484feade995ebf1a467450547dd77adcc.jpg)

flagpole (38)  
![](Images_26M35FQL/c2d25dc8eee87191f180f2038cd50a6893043b0bca241b6b2a03747083f39bcc.jpg)  
spotlight (35)

lakeside (36)  
![](Images_26M35FQL/5082edd879175bb76a55e32068b3976993a9985dbc7888f14233980adf714674.jpg)  
letter opener (36)  
wing (35)

![](Images_26M35FQL/2c99fada4b15a866137fa2a3ea094d4934259691e23558ff990ce1913349a426.jpg)  
ladle (28)

![](Images_26M35FQL/71821c4540712904650d5813fbd45c9dd1e1346c4772c1fb39626fd916311222.jpg)  
pole (27)

![](Images_26M35FQL/0605ce814195bba2ff68001cd649e87cad339f5b5ea7e2d7dc1da72772f0b313.jpg)

![](Images_26M35FQL/885a5a8e508874d66b6d5c10a8226b8e52cfc048ec332373820fe4e8da72514b.jpg)

![](Images_26M35FQL/e1caa2e1f151031f7125d7674c5309a682af002559227b1419cd4a2b94e58fa1.jpg)  
space bar (23)

![](Images_26M35FQL/41f68ccc3b3d95580d3c1112b1c374e318c6ad00c665908679ca643947f8a10c.jpg)

![](Images_26M35FQL/36ddd075f995a9be8a69019e42a675927bee17b876879e6b25912988a82c5947.jpg)

Fig. 11 For each object category, we take the best performance of any entry submitted to ILSVRC2012-2014 (including entries using additional training data). Given these “optimistic” results we show the easiest and harder classes for each task. The numbers in parentheses indicate classification and localization accuracy. For image classification the 10 easiest classes are randomly selected from among 121 object classes with 100% accuracy. Object detection results are shown in Figure 12.

0.5

## Object detection

Easiest classes

butterfly(93)

![](Images_26M35FQL/9875db7f10fbc5602ee5ccabf3da60fc3b3cc9224742715f63fcca61db9a7e14.jpg)  
dog (84)

![](Images_26M35FQL/b3b8d3339c69e15e2dedf72fb0ed0e051f113767894c676c5b7204e786765864.jpg)

volleyball(83)

basketball(80)

snowplow (80)

![](Images_26M35FQL/ff70fe65e6de2c6aa12e8fa10bd6dae2e32bdac4cd31c4e353f6efb03eef11c3.jpg)

rabbit(83)

bird (78)

![](Images_26M35FQL/54f2b62b5a5cfde76e3c6787212378ddc35cd8dfce2dfc35fd21f4b694145bb7.jpg)

frog (82)

![](Images_26M35FQL/b7cde1c95b8db16fa04a04ae9c8999f6454e3019238f23678d2850c1b36b5a91.jpg)

![](Images_26M35FQL/a85be9b54cd053ce1e97d7895784a2672cb68efc25dcceabcbfe093452da112c.jpg)  
zebra (77)

![](Images_26M35FQL/9949ab815a74b0d8c80b43d395869dda5cab805a7898d67f9e4457a7de76b008.jpg)

![](Images_26M35FQL/0a35032ee49e0323a17a4359094148e4b6d1fcfecac7ac90d81c6491e19152d8.jpg)

![](Images_26M35FQL/2f36c700723ec31a1ffd4f5bc933b121b9a63134657fb3c61c5f1349e69269a2.jpg)  
Hardest classes

![](Images_26M35FQL/20fdc437bd1f414141e30a97528266cf654a692497d6ea47bab23925ef9b38ea.jpg)

![](Images_26M35FQL/66f9752f42af0ab7bfa04d6d61a74463a370ba0cfb55a5a498450a7f53ce8b05.jpg)  
ski (12)

![](Images_26M35FQL/aa9a5d2f8eb13f095fc6cfd6538893e86734c7cbd24e95172efc9154c60022e6.jpg)  
horizontal bar (14)

![](Images_26M35FQL/cbe66b7aa6f9924e3620cbb0170be6f3f456f96b841622db502680053b552aba.jpg)  
spatula (13)  
microphone (11) rubber eraser (10)  
nail (13)

![](Images_26M35FQL/0bb1cb982fac6914232e276149c694ac69553b38188052c4c0919cc548d22b53.jpg)

![](Images_26M35FQL/fa99bb2f74212c3c8c0678b8cbb4fa3f3652f8a998cfcbbd99e6fb74621aa20c.jpg)

![](Images_26M35FQL/ca7e3b3b3765000ee1d02b9a7a2975f3d90b536cb047ad97cb134bce4324f6dd.jpg)

![](Images_26M35FQL/62fb09bccd40026b7eb424224fac81c24021fec2f79572f9f7b518ff23d246f4.jpg)

ladle (9)  
![](Images_26M35FQL/b5cf1ed9b999b10b2eac0230afb1871bae18bd203359f387eaa5d699f54f1635.jpg)  
backpack (8)

![](Images_26M35FQL/894d51434097db473b48e78221b9177ccab6e2ae0cf9d11f6d7a0731d5c09b16.jpg)

![](Images_26M35FQL/4c320c7ac38359ccac526f522ea7f5e385dfafe8511006c006e6e2bac52a91fd.jpg)  
Fig. 12 For each object category, we take the best performance of any entry submitted to ILSVRC2012-2014 (including entries using additional training data). Given these “optimistic” results we show the easiest and harder classes for the object detection task, i.e., classes with best and worst results. The numbers in parentheses indicate average precision. Image classification and single-object localization results are shown in Figure 11.  
Image classification

![](Images_26M35FQL/3e467b86e37a4883b0fd98ffed94a9ed9d4921f3e868e47bf12e708b5ae2813a.jpg)  
Average scale of object  
Single-object localization

![](Images_26M35FQL/a7dd0bcfeb24c7aeed0bb004b26621895c719d65c6a4bd6bc02b29f0f5f5318d.jpg)  
Object detection

![](Images_26M35FQL/0ea4974e5984f8f6fcd43e7e2e93a1712f09610b5c8ea39ecf9394624b02755d.jpg)  
Average scale of object  
Average scale of object

Fig. 13 Performance of the “optimistic” method as a function of object scale in the image, on each task. Each dot corresponds to one object class. Average scale (x-axis) is computed as the average fraction of the image area occupied by an instance of that object class on the ILSVRC2014 validation set. “Optimistic” performance (y-axis) corresponds to the best performance on the test set of any entry submitted to ILSVRC2012-2014 (including entries with additional training data). The test set has remained the same over these three years. We see that accuracy tends to increase as the objects get bigger in the image. However, it is clear that far from all the variation in accuracy on these classes can be accounted for by scale alone.

The image classification and single-object localization “optimistic” models performs better on large and extra large real-world objects than on smaller ones. The “optimistic” object detection model surprisingly performs better on extra small objects than on small or medium ones.

Deformability within instance: Rigid (e.g., mug) or deformable (e.g., water snake)

The “optimistic” model on each of the three tasks performs statistically significantly better on deformabl objects compared to rigid ones. However, this effect disappears when analyzing natural objects separately from man-made objects.

– Amount of texture: none (e.g. punching bag), low (e.g. horse), medium (e.g. sheep) or high (e.g. honeycomb)

The “optimistic” model on each of the three tasks is significantly better on objects with at least low level of texture compared to untextured objects.

These and other findings are justified and discussed in detail below.

Experimental setup. We observed in Section 6.3.3 that objects that occupy a larger area in the image tend to be somewhat easier to recognize. To make sure that differences in object scale are not influencing results in this section, we normalize each bin by object scale. We discard object classes with the largest scales from each bin as needed until the average object scale of object classes in each bin across one property is the same (or as close as possible). For real-world size property for example, the resulting average object scale in each of the five bins is 31.6%−31.7% in the image classification and single-object localization tasks, and 12.9% − 13.4% in the object detection task.11

Figure 14 shows the average performance of the “optimistic” model on the object classes that fall into each bin for each property. We analyze the results in detail below. Unless otherwise specified, the reported accuracies below are after the scale normalization step.

To evaluate statistical significance, we compute the 95% confidence interval for accuracy using bootstrapping: we repeatedly sample the object classes within the bin with replacement, discard some as needed to normalize by scale, and compute the average accuracy of the “optimistic” model on the remaining classes. We report the 95% confidence intervals (CI) in parentheses.

Real-world size. In Figure 14(top, left) we observe that in the image classification task the “optimistic” model tends to perform significantly better on objects which are larger in the real-world. The classification accuracy is 93.6% − 93.9% on XS, S and M objects compared to 97.0% on L and 96.4% on XL objects. Since this is after normalizing for scale and thus can’t be explained by the objects’ size in the image, we conclude that either (1) larger real-world objects are easier for the model to recognize, or (2) larger real-world objects usually occur in images with very distinctive backgrounds.

To distinguish between the two cases we look Figure 14(top, middle). We see that in the single-object localization task, the L objects are easy to localize at 82.4% localization accuracy. XL objects, however, tend to be the hardest to localize with only 73.4% localization accuracy. We conclude that the appearance of L objects must be easier for the model to learn, while XL objects tend to appear in distinctive backgrounds. The image background make these XL classes easier for the image-level classifier, but the individual instances are difficult to accurately localize. Some examples of L objects are “killer whale,” “schooner,” and “lion,” and some examples of XL objects are “boathouse,” “mosque,” “toyshop” and “steel arch bridge.”

In Figure 14(top,right) corresponding to the object detection task, the influence of real-world object size is not as apparent. One of the key reasons is that many of the XL and L object classes of the image classification and single-object localization datasets were removed in constructing the detection dataset (Section 3.3.1) since they were not basic categories well-suited for detection. There were only 3 XL object classes remaining in the dataset (“train,” “airplane” and “bus”), and none after scale normalization.We omit them from the analysis. The average precision of XS, S, M objects (44.5%, 39.0%, and 38.5% mAP respectively) is statistically insignificant from average precision on L objects: 95% confidence interval of L objects is 37.5% − 59.5%. This may be due to the fact that there are only 6 L object classes remaining after scale normalization; all other real-world size bins have at least 18 object classes.

Finally, it is interesting that performance on XS objects of 44.5% mAP (CI 40.5% − 47.6%) is statistically significantly better than performance on S or M objects with 39.0% mAP and 38.5% mAP respectively. Some examples of XS objects are “strawberry,” “bow tie” and “rugby ball.”

Deformability within instance. In Figure 14(second row) it is clear that the “optimistic” model performs statistically significantly worse on rigid objects than on deformable objects. Image classification accuracy is 93.2%

![](Images_26M35FQL/8617a57d41f09dfad1bb1c74d3f3ec83e4ac31e0b7bb8a20fcc9e4a351cc33e6.jpg)

Real-world size  
![](Images_26M35FQL/181a28db92c550aa81223d933aa5ed1478cb6607eb0c0d34e3fb38b6e6472b77.jpg)

![](Images_26M35FQL/3e74d8f50035b49bdceaa74fa6e96807b30ef2f3e539d8b477776883597346af.jpg)

## Deformability within instance

![](Images_26M35FQL/2db7c43c2f5caa76b96d65dbebf35ea75d30217ea930f7cc31a6c768ee22c4dd.jpg)

![](Images_26M35FQL/954fe8b6801488deb8c8e8e0d48d0b5b863bc733117de3ad7c744b4656b886ec.jpg)

![](Images_26M35FQL/53b5222780d2845f0fb26f8e211460159f190bb1e1b592bf3a3904141e03b846.jpg)

![](Images_26M35FQL/da3d51729f2dce0d0f57cc917e161da8c45023dc08a18e94b0a92766c1dbd4b0.jpg)

![](Images_26M35FQL/26285066723b4eecb52184c5cd4272d9dc7a27cd8f16ef961447057d16d50d94.jpg)

![](Images_26M35FQL/1c119e95d7611703ffd87bbd36fa8ee5b7092cbae21362becd353d733911cafc.jpg)

Amount of texture  
![](Images_26M35FQL/45d8dee97d589c32484f1b860611e2a16ed7f8cfe0bb0ca544f7bf48aaab089a.jpg)

![](Images_26M35FQL/deab423061234c2db784a108085c6b8302257f4894fce34ff7fbaa57d29e63f9.jpg)

![](Images_26M35FQL/324d29332ec5f28c9f621d7847fe3b7acbc7310693819dd52dd5a4a7b2fa829d.jpg)

![](Images_26M35FQL/3b3873507416e21daf94a89697d6de3c6058bba78fee47721425897a38df039d.jpg)

![](Images_26M35FQL/b89606df16956c085b753af071aa9ad2ab0bb13534810dadc9d55187b63cfedd.jpg)

![](Images_26M35FQL/db3c29eb4d5e6ed121764c58696683625afface3706a4395908ac4aee790ab2d.jpg)  
Fig. 14 Performance of the “optimistic” computer vision model as a function of object properties. The x-axis corresponds to object properties annotated by human labelers for each object class (Russakovsky et al., 2013) and illustrated in Figure 1. The y-axis is the average accuracy of the “optimistic” model. Note that the range of the y-axis is different for each task to make the trends more visible. The black circle is the average accuracy of the model on all object classes that fall into each bin. We control for the effects of object scale by normalizing the object scale within each bin (details in Section 6.3.4). The color bars show the model accuracy averaged across the remaining classes. Error bars show the 95% confidence interval obtained with bootstrapping. Some bins are missing color bars because less than 5 object classes remained in the bin after scale normalization. For example, the bar for XL real-world object detection classes is missing because that bin has only 3 object classes (airplane, bus, train) and after normalizing by scale no classes remain.

on rigid objects (CI 92.6%−93.8%), much smaller than 95.7% on deformable ones. Single-object localization accuracy is 76.2% on rigid objects (CI 74.9% − 77.4%), much smaller than 84.7% on deformable ones. Object detection mAP is 40.1% on rigid objects (CI 37.2% − 42.9%), much smaller than 44.8% on deformable ones.

We can further analyze the effects of deformability after separating object classes into “natural” and “man-made” bins based on the ImageNet hierarchy. Deformability is highly correlated with whether the object is natural or man-made: 0.72 correlation for image classification and single-object localization classes, and 0.61 for object detection classes. Figure 14(third row) shows the effect of deformability on performance of the model for man-made and natural objects separately.

Man-made classes are significantly harder than natural classes: classification accuracy 92.8% (CI 92.3% − 93.3%) for man-made versus 97.0% for natural, localization accuracy 75.5% (CI 74.3% − 76.5%) for man-made versus 88.5% for natural, and detection mAP 38.7% (CI 35.6 − 41.3%) for man-made versus 50.9% for natural. However, whether the classes are rigid or deformable within this subdivision is no longer significant in most cases. For example, the image classification accuracy is 92.3% (CI 91.4% − 93.1%) on man-made rigid objects and 91.8% on man-made deformable objects – not statistically significantly different.

There are two cases where the differences in performance are statistically significant. First, for singleobject localization, natural deformable objects are easier than natural rigid objects: localization accuracy of 87.9% (CI 85.9% − 90.1%) on natural deformable objects is higher than 85.8% on natural rigid objects – falling slightly outside the 95% confidence interval. This difference in performance is likely because deformable natural animals tend to be easier to localize than rigid natural fruit.

Second, for object detection, man-made rigid objects are easier than man-made deformable objects: 38.5% mAP (CI 35.2% − 41.7%) on man-made rigid objects is higher than 33.0% mAP on man-made deformable objects. This is because man-made rigid objects include classes like “traffic light” or “car” whereas the manmade deformable objects contain challenging classes like “plastic bag,” “swimming trunks” or “stethoscope.”

Amount of texture. Finally, we analyze the effect that object texture has on the accuracy of the “optimistic” model. Figure 14(fourth row) demonstrates that the model performs better as the amount of texture on the object increases. The most significant difference is between the performance on untextured objects and the performance on objects with low texture. Image classification accuracy is 90.5% on untextured objects (CI 89.3% − 91.6%), lower than 94.6% on low-textured objects. Single-object localization accuracy is 71.4% on untextured objects (CI 69.1%−73.3%), lower than 80.2% on low-textured objects. Object detection mAP is 33.2% on untextured objects (CI 29.5% − 35.9%), lower than 42.9% on low-textured objects.

Texture is correlated with whether the object is natural or man-made, at 0.35 correlation for image classification and single-object localization, and 0.46 correlation for object detection. To determine if this is a contributing factor, in Figure 14(bottom row) we break up the object classes into natural and man-made and show the accuracy on objects with no texture versus objects with low texture. We observe that the model is still statistically significantly better on low-textured object classes than on untextured ones, both on manmade and natural object classes independently.12

## 6.4 Human accuracy on large-scale image classification

Recent improvements in state-of-the-art accuracy on the ILSVRC dataset are easier to put in perspective when compared to human-level accuracy. In this section we compare the performance of the leading largescale image classification method with the performance of humans on this task.

To support this comparison, we developed an interface that allowed a human labeler to annotate images with up to five ILSVRC target classes. We compare human errors to those of the winning ILSRC2014 image classification model, GoogLeNet (Section 5.1). For this analysis we use a random sample of 1500 ILSVRC2012- 2014 image classification test set images.

Annotation interface. Our web-based annotation interface consists of one test set image and a list of 1000 ILSVRC categories on the side. Each category is described by its title, such as “cowboy boot.” The categories are sorted in the topological order of the ImageNet hierarchy, which places semantically similar concepts nearby in the list. For example, all motor vehiclerelated classes are arranged contiguously in the list. Every class category is additionally accompanied by a row of 13 examples images from the training set to allow for faster visual scanning. The user of the interface selects 5 categories from the list by clicking on the desired items.

Since our interface is web-based, it allows for natural scrolling through the list, and also search by text.

Annotation protocol. We found the task of annotating images with one of 1000 categories to be an extremely challenging task for an untrained annotator. The most common error that an untrained annotator is susceptible to is a failure to consider a relevant class as a possible label because they are unaware of its existence.

Therefore, in evaluating the human accuracy we relied primarily on expert annotators who learned to recognize a large portion of the 1000 ILSVRC classes. During training, the annotators labeled a few hundred validation images for practice and later switched to the test set images.

## 6.4.1 Quantitative comparison of human and computer accuracy on large-scale image classification

We report results based on experiments with two expert annotators. The first annotator (A1) trained on 500 images and annotated 1500 test images. The second annotator (A2) trained on 100 images and then annotated 258 test images. The average pace of labeling was approximately 1 image per minute, but the distribution is strongly bimodal: some images are quickly recognized, while some images (such as those of finegrained breeds of dogs, birds, or monkeys) may require multiple minutes of concentrated effort.

The results are reported in Table 9.

Annotator 1. Annotator A1 evaluated a total of 1500 test set images. The GoogLeNet classification error on this sample was estimated to be 6.8% (recall that the error on full test set of 100,000 images is 6.7%, as shown in Table 7). The human error was estimated to be 5.1%. Thus, annotator A1 achieves a performance superior to GoogLeNet, by approximately 1.7%. We can analyze the statistical significance of this result under the null hypothesis that they are from the same distribution. In particular, comparing the two proportions with a z-test yields a one-sided p-value of p = 0.022. Thus, we can conclude that this result is statistically significant at the 95% confidence level.

Annotator 2. Our second annotator (A2) trained on a smaller sample of only 100 images and then labeled 258 test set images. As seen in Table 9, the final classification error is significantly worse, at approximately 12.0% Top-5 error. The majority of these errors (48.8%) can be attributed to the annotator failing to spot and consider the ground truth label as an option.

<table><tr><td rowspan=1 colspan=1>Relative Confusion</td><td rowspan=1 colspan=1>A1</td><td rowspan=1 colspan=1>A2</td></tr><tr><td rowspan=1 colspan=1>Human succeeds, GoogLeNet succeedsHuman succeeds,GoogLeNet failsHuman fails,GoogLeNet succeedsHuman fails,GoogLeNet fails</td><td rowspan=1 colspan=1>1352724630</td><td rowspan=1 colspan=1>2198247</td></tr><tr><td rowspan=1 colspan=1>Total number of images</td><td rowspan=1 colspan=1>1500</td><td rowspan=1 colspan=1>258</td></tr><tr><td rowspan=1 colspan=1>Estimated GoogLeNet classification errorEstimated human classification error</td><td rowspan=1 colspan=1>6.8%5.1%</td><td rowspan=1 colspan=1>5.8%12.0%</td></tr></table>

Table 9 Human classification results on the ILSVRC2012- 2014 classification test set, for two expert annotators A1 and A2. We report top-5 classification error.

Thus, we conclude that a significant amount of training time is necessary for a human to achieve competitive performance on ILSVRC. However, with a sufficient amount of training, a human annotator is still able to outperform the GoogLeNet result $( p = 0 . 0 2 2 )$ by approximately 1.7%.

Annotator comparison. We also compare the prediction accuracy of the two annotators. Of a total of 204 images that both A1 and A2 labeled, 174 (85%) were correctly labeled by both A1 and A2, 19 (9%) were correctly labeled by A1 but not A2, 6 (3%) were correctly labeled by A2 but not A1, and 5 (2%) were incorrectly labeled by both. These include 2 images that we consider to be incorrectly labeled in the ground truth.

In particular, our results suggest that the human annotators do not exhibit strong overlap in their predictions. We can approximate the performance of an “optimistic” human classifier by assuming an image to be correct if at least one of A1 or A2 correctly labeled the image. On this sample of 204 images, we approximate the error rate of an “optimistic” human annotator at 2.4%, compared to the GoogLeNet error rate of 4.9%.

## 6.4.2 Analysis of human and computer errors on large-scale image classification

We manually inspected both human and GoogLeNet errors to gain an understanding of common error types and how they compare. For purposes of this section, we only discuss results based on the larger sample of 1500 images that were labeled by annotator A1. Examples of representative mistakes are in Figure 15. The analysis and insights below were derived specifically from GoogLeNet predictions, but we suspect that many of the same errors may be present in other methods.

Types of errors in both computer and human annotations:

1. Multiple objects. Both GoogLeNet and humans struggle with images that contain multiple ILSVRC classes (usually many more than five), with little indication of which object is the focus of the image. This error is only present in the Classification setting, since every image is constrained to have exactly one correct label. In total, we attribute 24 (24%) of GoogLeNet errors and 12 (16%) of human errors to this category. It is worth noting that humans can have a slight advantage in this error type, since it can sometimes be easy to identify the most salient object in the image.

![](Images_26M35FQL/405edd45a3427feb620833e8956dcdf4633e3f4a4d52aad7f03c9b6117b43726.jpg)  
Fig. 15 Representative validation images that highlight common sources of error. For each image, we display the ground truth in blue, and top 5 predictions from GoogLeNet follow (red = wrong, green = right). GoogLeNet predictions on the validation set images were graciously provided by members of the GoogLeNet team. From left to right: Images that contain multiple objects, images of extreme closeups and uncharacteristic views, images with filters, images that significantly benefit from the ability to read text, images that contain very small and thin objects, images with abstract representations, and example of a fine-grained image that GoogLeNet correctly identifies but a human would have significant difficulty with.

2. Incorrect annotations. We found that approximately 5 out of 1500 images (0.3%) were incorrectly annotated in the ground truth. This introduces an approximately equal number of errors for both humans and GoogLeNet.

## Types of errors that the computer is more susceptible to than the human:

1. Object small or thin. GoogLeNet struggles with recognizing objects that are very small or thin in the image, even if that object is the only object present. Examples of this include an image of a standing person wearing sunglasses, a person holding a quill in their hand, or a small ant on a stem of a flower. We estimate that approximately 22 (21%) of GoogLeNet errors fall into this category, while none of the human errors do. In other words, in our sample of images, no image was mislabeled by a human because they were unable to identify a very small or thin object. This discrepancy can be attributed to the fact that a human can very effectively leverage context and affordances to accurately infer the identity of small objects (for example, a few barely visible feathers near person’s hand as very likely belonging to a mostly occluded quill).

2. Image filters. Many people enhance their photos with filters that distort the contrast and color distributions of the image. We found that 13 (13%) of the images that GoogLeNet incorrectly classified contained a filter. Thus, we posit that GoogLeNet is not very robust to these distortions. In comparison, only one image among the human errors contained a filter, but we do not attribute the source of the error to the filter.

3. Abstract representations. GoogLeNet struggles with images that depict objects of interest in an abstract form, such as 3D-rendered images, paintings, sketches, plush toys, or statues. An example is the abstract shape of a bow drawn with a light source in night photography, a 3D-rendered robotic scorpion, or a shadow on the ground, of a child on a swing. We attribute approximately 6 (6%) of GoogLeNet errors to this type of error and believe that humans are significantly more robust, with no such errors seen in our sample.

4. Miscellaneous sources. Additional sources of error that occur relatively infrequently include extreme closeups of parts of an object, unconventional viewpoints such as a rotated image, images that can significantly benefit from the ability to read text (e.g. a featureless container identifying itself as “face powder”), objects with heavy occlusions, and images that depict a collage of multiple images. In general, we found that humans are more robust to all of these types of error.

## Types of errors that the human is more susceptible to than the computer:

1. Fine-grained recognition. We found that humans are noticeably worse at fine-grained recognition (e.g. dogs, monkeys, snakes, birds), even when they are in clear view. To understand the difficulty, consider that there are more than 120 species of dogs in the dataset. We estimate that 28 (37%) of the human errors fall into this category, while only 7 (7%) of GoogLeNet errors do.

2. Class unawareness. The annotator may sometimes be unaware of the ground truth class present as a label option. When pointed out as an ILSVRC class, it is usually clear that the label applies to the image. These errors get progressively less frequent as the annotator becomes more familiar with ILSVRC classes. Approximately 18 (24%) of the human errors fall into this category.

3. Insufficient training data. Recall that the annotator is only presented with 13 examples of a class under every category name. However, 13 images are not always enough to adequately convey the allowed class variations. For example, a brown dog can be incorrectly dismissed as a “Kelpie” if all examples of a “Kelpie” feature a dog with black coat. However, if more than 13 images were listed it would have become clear that a “Kelpie” may have brown coat. Approximately 4 (5%) of human errors fall into this category.

## 6.4.3 Conclusions from human image classification experiments

We investigated the performance of trained human annotators on a sample of 1500 ILSVRC test set images. Our results indicate that a trained human annotator is capable of outperforming the best model (GoogLeNet) by approximately 1.7% (p = 0.022).

We expect that some sources of error may be relatively easily eliminated (e.g. robustness to filters, rotations, collages, effectively reasoning over multiple scales), while others may prove more elusive (e.g. identifying abstract representations of objects). On the other hand, a large majority of human errors come from fine-grained categories and class unawareness. We expect that the former can be significantly reduced with fine-grained expert annotators, while the latter could be reduced with more practice and greater familiarity with ILSVRC classes. Our results also hint that human errors are not strongly correlated and that human ensembles may further reduce human error rate.

It is clear that humans will soon outperform stateof-the-art ILSVRC image classification models only by use of significant effort, expertise, and time. One interesting follow-up question for future investigation is how computer-level accuracy compares with human-level accuracy on more complex image understanding tasks.

## 7 Conclusions

In this paper we described the large-scale data collection process of ILSVRC, provided a summary of the most successful algorithms on this data, and analyzed the success and failure modes of these algorithms. In this section we discuss some of the key lessons we learned over the years of ILSVRC, strive to address the key criticisms of the datasets and the challenges we encountered over the years, and conclude by looking forward into the future.

## 7.1 Lessons learned

The key lesson of collecting the datasets and running the challenges for five years is this: All human intelligence tasks need to be exceptionally welldesigned. We learned this lesson both when annotating the dataset using Amazon Mechanical Turk workers (Section 3) and even when trying to evaluate humanlevel image classification accuracy using expert labelers (Section 6.4). The first iteration of the labeling interface was always bad – generally meaning completely unusable. If there was any inherent ambiguity in the questions posed (and there almost always was), workers found it and accuracy suffered. If there is one piece of advice we can offer to future research, it is to very carefully design, continuously monitor, and extensively sanity-check all crowdsourcing tasks.

The other lesson, already well-known to large-scale researchers, is this: Scaling up the dataset always reveals unexpected challenges. From designing complicated multi-step annotation strategies (Section 3.2.1) to having to modify the evaluation procedure (Section 4), we had to continuously adjust to the large-scale setting. On the plus side, of course, the major breakthroughs in object recognition accuracy (Section 5) and the analysis of the strength and weaknesses of current algorithms as a function of object class properties ( Section 6.3) would never have been possible on a smaller scale.

## 7.2 Criticism

In the past five years, we encountered three major criticisms of the ILSVRC dataset and the corresponding challenge: (1) the ILSVRC dataset is insufficiently challenging, (2) the ILSVRC dataset contains annotation errors, and (3) the rules of ILSVRC competition are too restrictive. We discuss these in order.

The first criticism is that the objects in the dataset tend to be large and centered in the images, making the dataset insufficiently challenging. In Sections 3.2.2 and 3.3.4 we tried to put those concerns to rest by analyzing the statistics of the ILSVRC dataset and concluding that it is comparable with, and in many cases much more challenging than, the long-standing PAS-CAL VOC benchmark (Everingham et al., 2010).

The second is regarding the errors in ground truth labeling. We went through several rounds of in-house post-processing of the annotations obtained using crowdsourcing, and corrected many common sources of errors (e.g., Appendix E). The major remaining source of annotation errors stem from fine-grained object classes, e.g., labelers failing to distinguish different species of birds. This is a tradeoff that had to be made: in order to annotate data at this scale on a reasonable budget, we had to rely on non-expert crowd labelers. However, overall the dataset is encouragingly clean. By our estimates, 99.7% precision is achieved in the image classification dataset (Sections 3.1.3 and 6.4) and 97.9% of images that went through the bounding box annotation system have all instances of the target object class labeled with bounding boxes (Section 3.2.1).

The third criticism we encountered is over the rules of the competition regarding using external training data. In ILSVRC2010-2013, algorithms had to only use the provided training and validation set images and annotations for training their models. With the growth of the field of large-scale unsupervised feature learning, however, questions began to arise about what exactly constitutes “outside” data: for example, are image features trained on a large pool of “outside” images in an unsupervised fashion allowed in the competition? After much discussion, in ILSVRC2014 we took the first step towards addressing this problem. We followed the PASCAL VOC strategy and created two tracks in the competition: entries using only “provided” data and entries using “outside” data, meaning any images or annotations not provided as part of ILSVRC training or validation sets. However, in the future this strategy will likely need to be further revised as the computer vision field evolves. For example, competitions can consider allowing the use of any image features which are publically available, even if these features were learned on an external source of data.

## 7.3 The future

Given the massive algorithmic breakthroughs over the past five years, we are very eager to see what will happen in the next five years. There are many potential directions of improvement and growth for ILSVRC and other large-scale image datasets.

First, continuing the trend of moving towards richer image understanding (from image classification to singleobject localization to object detection), the next challenge would be to tackle pixel-level object segmentation. The recently released large-scale COCO dataset (Lin et al., 2014b) is already taking a step in that direction.

Second, as datasets grow even larger in scale, it may become impossible to fully annotate them manually. The scale of ILSVRC is already imposing limits on the manual annotations that are feasible to obtain: for example, we had to restrict the number of objects labeled per image in the image classification and single-object localization datasets. In the future, with billions of images, it will become impossible to obtain even one clean label for every image. Datasets such as Yahoo’s Flickr Creative Commons 100M,13 released with weak human tags but no centralized annotation, will become more common.

The growth of unlabeled or only partially labeled large-scale datasets implies two things. First, algorithms will have to rely more on weakly supervised training data. Second, even evaluation might have to be done after the algorithms make predictions, not before. This means that rather than evaluating accuracy (how many of the test images or objects did the algorithm get right) or recall (how many of the desired images or objects did the algorithm manage to find), both of which require a fully annotated test set, we will be focusing more on precision: of the predictions that the algorithm made, how many were deemed correct by humans.

We are eagerly awaiting the future development of object recognition datasets and algorithms, and are grateful that ILSVRC served as a stepping stone along this path.

Acknowledgements We thank Stanford University, UNC Chapel Hill, Google and Facebook for sponsoring the challenges, and NVIDIA for providing computational resources to participants of ILSVRC2014. We thank our advisors over the years: Lubomir Bourdev, Alexei Efros, Derek Hoiem, Jitendra Malik, Chuck Rosenberg and Andrew Zisserman. We thank the PASCAL VOC organizers for partnering with us in running ILSVRC2010-2012. We thank all members of the Stanford vision lab for supporting the challenges and putting up with us along the way. Finally, and most importantly, we thank all researchers that have made the ILSVRC effort a success by competing in the challenges and by using the datasets to advance computer vision.

## Appendix A ILSVRC2012-2014 image classification and single-object localization object categories

abacus, abaya, academic gown, accordion, acorn, acorn squash, acoustic guitar, admiral, affenpinscher, Afghan hound, African chameleon, African crocodile,

African elephant, African grey, African hunting dog, agama, agaric, aircraft carrier, Airedale, airliner, airship, albatross, alligator lizard, alp, altar, ambulance, American alligator, American black bear, American chameleon, American coot, American egret, American lobster, American Staffordshire terrier, amphibian, analog clock, anemone fish, Angora, ant, apiary, Appenzeller, apron, Arabian camel, Arctic fox, armadillo, artichoke, ashcan, assault rifle, Australian terrier, axolotl, baboon, backpack, badger, bagel, bakery, balance beam, bald eagle, balloon, ballplayer, ballpoint, banana, Band Aid, banded gecko, banjo, bannister, barbell, barber chair, barbershop, barn, barn spider, barometer, barracouta, barrel, barrow, baseball, basenji, basketball, basset, bassinet, bassoon, bath towel, bathing cap, bathtub, beach wagon, beacon, beagle, beaker, bearskin, beaver, Bedlington terrier, bee, bee eater, beer bottle, beer glass, bell cote, bell pepper, Bernese mountain dog, bib, bicycle-built-for-two, bighorn, bikini, binder, binoculars, birdhouse, bison, bittern, black and gold garden spider, black grouse, black stork, black swan, black widow, black-and-tan coonhound, black-footed ferret, Blenheim spaniel, bloodhound, bluetick, boa constrictor, boathouse, bobsled, bolete, bolo tie, bonnet, book jacket, bookcase, bookshop, Border collie, Border terrier, borzoi, Boston bull, bottlecap, Bouvier des Flandres, bow, bow tie, box turtle, boxer, Brabancon griffon, brain coral, brambling, brass, brassiere, breakwater, breastplate, briard, Brittany spaniel, broccoli, broom, brown bear, bubble, bucket, buckeye, buckle, bulbul, bull mastiff, bullet train, bulletproof vest, bullfrog, burrito, bustard, butcher shop, butternut squash, cab, cabbage butterfly, cairn, caldron, can opener, candle, cannon, canoe, capuchin, car mirror, car wheel, carbonara, Cardigan, cardigan, cardoon, carousel, carpenter’s kit, carton, cash machine, cassette, cassette player, castle, catamaran, cauliflower, CD player, cello, cellular telephone, centipede, chain, chain mail, chain saw, chainlink fence, chambered nautilus, cheeseburger, cheetah, Chesapeake Bay retriever, chest, chickadee, chiffonier, Chihuahua, chime, chimpanzee, china cabinet, chiton, chocolate sauce, chow, Christmas stocking, church, cicada, cinema, cleaver, cliff, cliff dwelling, cloak, clog, clumber, cock, cocker spaniel, cockroach, cocktail shaker, coffee mug, coffeepot, coho, coil, collie, colobus, combination lock, comic book, common iguana, common newt, computer keyboard, conch, confectionery, consomme, container ship, convertible, coral fungus, coral reef, corkscrew, corn, cornet, coucal, cougar, cowboy boot, cowboy hat, coyote, cradle, crane, crane, crash helmet, crate, crayfish, crib, cricket, Crock Pot, croquet ball, crossword puzzle, crutch, cucumber, cuirass, cup, curly-coated retriever, custard apple, daisy, dalmatian, dam, damselfly, Dandie Dinmont, desk, desktop computer, dhole, dial telephone, diamondback, diaper, digital clock, digital watch, dingo, dining table, dishrag, dishwasher, disk brake, Doberman, dock, dogsled, dome, doormat, dough, dowitcher, dragonfly, drake, drilling platform, drum, drumstick, dugong, dumbbell, dung beetle, Dungeness crab, Dutch oven, ear, earthstar, echidna, eel, eft, eggnog, Egyptian cat, electric fan, electric guitar, electric locomotive, electric ray, English foxhound, English setter, English springer, entertainment center, EntleBucher, envelope, Eskimo dog, espresso, espresso maker, European fire salamander, European gallinule, face powder, feather boa, fiddler crab, fig, file, fire engine, fire screen, fireboat, flagpole, flamingo, flatcoated retriever, flatworm, flute, fly, folding chair, football helmet, forklift, fountain, fountain pen, four-poster, fox squirrel, freight car, French bulldog, French horn, French loaf, frilled lizard, frying pan, fur coat, gar, garbage truck, garden spider, garter snake, gas pump, gasmask, gazelle, German shepherd, German short-haired pointer, geyser, giant panda, giant schnauzer, gibbon, Gila monster, go-kart, goblet, golden retriever, goldfinch, goldfish, golf ball, golfcart, gondola, gong, goose, Gordon setter, gorilla, gown, grand piano, Granny Smith, grasshopper, Great Dane, great grey owl, Great Pyrenees, great white shark, Greater Swiss Mountain dog, green lizard, green mamba, green snake, greenhouse, grey fox, grey whale, grille, grocery store, groenendael, groom, ground beetle, guacamole, guenon, guillotine, guinea pig, gyromitra, hair slide, hair spray, half track, hammer, hammerhead, hamper, hamster, hand blower, handheld computer, handkerchief, hard disc, hare, harmonica, harp, hartebeest, harvester, harvestman, hatchet, hay, head cabbage, hen, hen-of-the-woods, hermit crab, hip, hippopotamus, hog, hognose snake, holster, home theater, honeycomb, hook, hoopskirt, horizontal bar, hornbill, horned viper, horse cart, hot pot, hotdog, hourglass, house finch, howler monkey, hummingbird, hyena, ibex, Ibizan hound, ice bear, ice cream, ice lolly, impala, Indian cobra, Indian elephant, indigo bunting, indri, iPod, Irish setter, Irish terrier, Irish water spaniel, Irish wolfhound, iron, isopod, Italian greyhound, jacamar, jack-o’-lantern, jackfruit, jaguar, Japanese spaniel, jay, jean, jeep, jellyfish, jersey, jigsaw puzzle, jinrikisha, joystick, junco, keeshond, kelpie, Kerry blue terrier, killer whale, kimono, king crab, king penguin, king snake, kit fox, kite, knee pad, knot, koala, Komodo dragon, komondor, kuvasz, lab coat, Labrador retriever, lacewing, ladle, ladybug, Lakeland terrier, lakeside, lampshade, langur, laptop, lawn mower, leaf beetle, leafhopper, leatherback turtle, lemon, lens cap, Leonberg, leopard, lesser panda, letter opener, Lhasa, library, lifeboat, lighter, limousine, limpkin, liner, lion, lionfish, lipstick, little blue heron, llama, Loafer, loggerhead, long-horned beetle, lorikeet, lotion, loudspeaker, loupe, lumbermill, lycaenid, lynx, macaque, macaw, Madagascar cat, magnetic compass, magpie, mailbag, mailbox, maillot, maillot, malamute, malinois, Maltese dog, manhole cover, mantis, maraca, marimba, marmoset, marmot, mashed potato, mask, matchstick, maypole, maze, measuring cup, meat loaf, medicine chest, meerkat, megalith, menu, Mexican hairless, microphone, microwave, military uniform, milk can, miniature pinscher, miniature poodle, miniature schnauzer, minibus, miniskirt, minivan, mink, missile, mitten, mixing bowl, mobile home, Model T, modem, monarch, monastery, mongoose, monitor, moped, mortar, mortarboard, mosque, mosquito net, motor scooter, mountain bike, mountain tent, mouse, mousetrap, moving van, mud turtle, mushroom, muzzle, nail, neck brace, necklace, nematode, Newfoundland, night snake, nipple, Norfolk terrier, Norwegian elkhound, Norwich terrier, notebook, obelisk, oboe, ocarina, odometer, oil filter, Old English sheepdog, orange, orangutan, organ, oscilloscope, ostrich, otter, otterhound, overskirt, ox, oxcart, oxygen mask, oystercatcher, packet, paddle, paddlewheel, padlock, paintbrush, pajama, palace, panpipe, paper towel, papillon, parachute, parallel bars, park bench, parking meter, partridge, passenger car, patas, patio, pay-phone, peacock, pedestal, Pekinese, pelican, Pembroke, pencil box, pencil sharpener, perfume, Persian cat, Petri dish, photocopier, pick, pickelhaube, picket fence, pickup, pier, piggy bank, pill bottle, pillow, pineapple, ping-pong ball, pinwheel, pirate, pitcher, pizza, plane, planetarium, plastic bag, plate, plate rack, platypus, plow, plunger, Polaroid camera, pole, polecat, police van, pomegranate, Pomeranian, poncho, pool table, pop bottle, porcupine, pot, potpie, potter’s wheel, power drill, prairie chicken, prayer rug, pretzel, printer, prison, proboscis monkey, projectile, projector, promontory, ptarmigan, puck, puffer, pug, punching bag, purse, quail, quill, quilt, racer, racket, radiator, radio, radio telescope, rain barrel, ram, rapeseed, recreational vehicle, red fox, red wine, red wolf, redbacked sandpiper, red-breasted merganser, redbone, redshank, reel, reflex camera, refrigerator, remote control, restaurant, revolver, rhinoceros beetle, Rhodesian ridgeback, rifle, ringlet, ringneck snake, robin, rock beauty, rock crab, rock python, rocking chair, rotisserie, Rottweiler, rubber eraser, ruddy turnstone, ruffed grouse, rugby ball, rule, running shoe, safe, safety pin, Saint Bernard, saltshaker, Saluki, Samoyed, sandal, sandbar, sarong, sax, scabbard, scale, schipperke, school bus, schooner, scoreboard, scorpion, Scotch terrier, Scottish deerhound, screen, screw, screwdriver, scuba diver, sea anemone, sea cucumber, sea lion, sea slug, sea snake, sea urchin, Sealyham terrier, seashore, seat belt, sewing machine, Shetland sheepdog, shield, Shih-Tzu, shoe shop, shoji, shopping basket, shopping cart, shovel, shower cap, shower curtain, siamang, Siamese cat, Siberian husky, sidewinder, silky terrier, ski, ski mask, skunk, sleeping bag, slide rule, sliding door, slot, sloth bear, slug, snail, snorkel, snow leopard, snowmobile, snowplow, soap dispenser, soccer ball, sock, soft-coated wheaten terrier, solar dish, sombrero, sorrel, soup bowl, space bar, space heater, space shuttle, spaghetti squash, spatula, speedboat, spider monkey, spider web, spindle, spiny lobster, spoonbill, sports car, spotlight, spotted salamander, squirrel monkey, Staffordshire bullterrier, stage, standard poodle, standard schnauzer, starfish, steam locomotive, steel arch bridge, steel drum, stethoscope, stingray, stinkhorn, stole, stone wall, stopwatch, stove, strainer, strawberry, street sign, streetcar, stretcher, studio couch, stupa, sturgeon, submarine, suit, sulphur butterfly, sulphur-crested cockatoo, sundial, sunglass, sunglasses, sunscreen, suspension bridge, Sussex spaniel, swab, sweatshirt, swimming trunks, swing, switch, syringe, tabby, table lamp, tailed frog, tank, tape player, tarantula, teapot, teddy, television, tench, tennis ball, terrapin, thatch, theater curtain, thimble, three-toed sloth, thresher, throne, thunder snake, Tibetan mastiff, Tibetan terrier, tick, tiger, tiger beetle, tiger cat, tiger shark, tile roof, timber wolf, titi, toaster, tobacco shop, toilet seat, toilet tissue, torch, totem pole, toucan, tow truck, toy poodle, toy terrier, toyshop, tractor, traffic light, trailer truck, tray, tree frog, trench coat, triceratops, tricycle, trifle, trilobite, trimaran, tripod, triumphal arch, trolleybus, trombone, tub, turnstile, tusker, typewriter keyboard, umbrella, unicycle, upright, vacuum, valley, vase, vault, velvet, vending machine, vestment, viaduct, vine snake, violin, vizsla, volcano, volleyball, vulture, waffle iron, Walker hound, walking stick, wall clock, wallaby, wallet, wardrobe, warplane, warthog, washbasin, washer, water bottle, water buffalo, water jug, water ouzel, water snake, water tower, weasel, web site, weevil, Weimaraner, Welsh springer spaniel, West Highland white terrier, whippet, whiptail, whiskey jug, whistle, white stork, white wolf, wig, wild boar, window screen, window shade, Windsor tie, wine bottle, wing, wire-haired fox terrier, wok, wolf spider, wombat, wood rabbit, wooden spoon, wool, worm fence, wreck, yawl, yellow lady’s slipper, Yorkshire terrier, yurt, zebra, zucchini

## Appendix B Additional single-object localization dataset statistics

We consider two additional metrics of object localization difficulty: chance performance of localization and the level of clutter. We use these metrics to compare ILSVRC2012-2014 single-object localization dataset to the PASCAL VOC 2012 object detection benchmark. The measures of localization difficulty are computed on the validation set of both datasets. According to both of these measures of difficulty there is a subset of ILSVRC which is as challenging as PASCAL but more than an order of magnitude greater in size. Figure 16 shows the distributions of different properties (object scale, chance performance of localization and level of clutter) across the different classes in the two datasets.

Chance performance of localization (CPL). Chance performance on a dataset is a common metric to consider. We define the CPL measure as the expected accuracy of a detector which first randomly samples an object instance of that class and then uses its bounding box directly as the proposed localization window on all other images (after rescaling the images to the same size). Concretely, let $B _ { 1 } , B _ { 2 } , \ldots , B _ { N }$ be all the bounding boxes of the object instances within a class, then

$$
{ \mathrm { C P L } } = { \frac { \sum _ { i } \sum _ { j \neq i } I O U ( B _ { i } , B _ { j } ) \geq 0 . 5 } { N ( N - 1 ) } }\tag{6}
$$

Some of the most difficult ILSVRC categories to localize according to this metric are basketball, swimming trunks, ping pong ball and rubber eraser, all with less than 0.2% CPL. This measure correlates strongly $( \rho = 0 . 9 )$ with the average scale of the object (fraction of image occupied by object). The average CPL across the 1000 ILSVRC categories is 20.8%. The 20 PASCAL categories have an average CPL of 8.7%, which is the same as the CPL of the 562 most difficult categories of ILSVRC.

Clutter. Intuitively, even small objects are easy to localize on a plain background. To quantify clutter we employ the objectness measure of (Alexe et al., 2012), which is a class-generic object detector evaluating how likely a window in the image contains a coherent object (of any class) as opposed to background (sky, water, grass). For every image m containing target object instances at positions $B _ { 1 } ^ { m } , B _ { 2 } ^ { m } , \ldots ,$ we use the publicly available objectness software to sample 1000 windows $W _ { 1 } ^ { m } , W _ { 2 } ^ { m } , \dots W _ { 1 0 0 0 } ^ { m }$ , in order of decreasing probability of the window containing any generic object. Let obj(m) be the number of generic object-looking windows sampled before localizing an instance of the target category, $\begin{array} { r } { \mathrm { i . e . , ~ O B J } ( m ) = \operatorname* { m i n } \{ k : \operatorname* { m a x } _ { i } \mathrm { I O U } ( W _ { k } ^ { m } , B _ { i } ^ { m } ) \geq } \end{array}$ 0.5}. For a category containing M images, we compute the average number of such windows per image and define

$$
\begin{array} { r } { \mathrm { C L U T E R } = \log _ { 2 } ( \frac { 1 } { M } \sum _ { m } \mathrm { O B J } ( m ) ) } \end{array}\tag{7}
$$

The higher the clutter of a category, the harder the objects are to localize according to generic cues. If an object can’t be localized with the first 1000 windows (as is the case for 1% of images on average per category in ILSVRC and 5% in PASCAL), we set obj(m) = 1001. The fact that more than 95% of objects can be localized with these windows imply that the objectness cue is already quite strong, so objects that require many windows on average will be extremely difficult to detect: e.g., ping pong ball (clutter of 9.57, or 758 windows on average), basketball (clutter of 9.21), puck (clutter of 9.17) in ILSVRC. The most difficult object in PAS-CAL is bottle with clutter score of 8.47. On average, ILSVRC has clutter score of 3.59. The most difficult subset of ILSVRC with 250 object categories has an order of magnitude more categories and the same average amount of clutter (of 5.90) as the PASCAL dataset.

## Appendix C Manually curated queries for obtaining object detection scene images

In Section 3.3.2 we discussed three types of queries we used for collecting the object detection images: (1) single object category name or a synonym; (2) a pair of object category names; (3) a manual query, typically targetting one or more object categories with insufficient data. Here we provide a list of the 129 manually curated queries:

afternoon tea, ant bridge building, armadillo race, armadillo yard, artist studio, auscultation, baby room, banjo orchestra, banjo rehersal, banjo show, califone headphones & media player sets, camel dessert, camel tourist, carpenter drilling, carpentry, centipede wild, coffee shop, continental breakfast toaster, continental breakfast waffles, crutch walking, desert scorpion, diner, dining room, dining table, dinner, dragonfly friendly, dragonfly kid, dragonfly pond, dragonfly wild, drying hair, dumbbell curl, fan blow wind, fast food, fast food restaurant, firewood chopping, flu shot, goldfish aquarium, goldfish tank, golf cart on golf course, gym dumbbell, hamster drinking water, harmonica orchestra, harmonica rehersal, harmonica show, harp ensemble, harp orchestra, harp rehersal, harp show, hedgehog cute, hedgehog floor, hedgehog hidden, hippo bird, hippo friendly, home improvement diy drill, horseback riding, hotel coffee machine, hotel coffee maker, hotel waffle maker, jellyfish scuba, jellyfish snorkling, kitchen, kitchen counter coffee maker, kitchen counter toaster, kitchenette, koala feed, koala tree, ladybug flower, ladybug yard, laundromat, lion zebra friendly, lunch, mailman, making breakfast, making waffles, mexican food, motorcycle racing, office, office fan, opossum on tree branch, orchestra, panda play, panda tree, pizzeria, pomegranate tree, porcupine climbing trees, power drill carpenter, purse shop, red panda tree, riding competition, riding motor scooters, school supplies, scuba starfish, sea lion beach, sea otter, sea urchin habitat, shopping for school supplies, sitting in front of a fan, skunk and cat, skunk park, skunk wild, skunk yard, snail flower, snorkling starfish, snowplow cleanup, snowplow pile, snowplow winter, soccer game, south american zoo, starfish sea world, starts shopping, steamed artichoke, stethoscope doctor, strainer pasta, strainer tea, syringe doctor, table with food, tape player, tiger circus, tiger pet, using a can opener, using power drill, waffle iron breakfast, wild lion savana, wildlife preserve animals, wiping dishes, wombat petting zoo, zebra savana, zoo feeding, zoo in australia

## Appendix D Hierarchy of questions for full image annotation

The following is a hierarchy of questions manually constructed for crowdsourcing full annotation of images with the presence or absence of 200 object detection categories in ILSVRC2013 and ILSVRC2014. All questions are of the form “is there a ... in the image?” Questions marked with • are asked on every image. If the answer to a question is determined to be “no” then the answer to all descendant questions is assumed to be “no”. The 200 numbered leaf nodes correspond to the 200 object detection categories.

The goal in the hierarchy construction is to save cost (by asking as few questions as possible on every image) while avoiding any ambiguity in questions which would lead to false negatives during annotation. This hierarchy is not tree-structured; some questions have multiple parents.

◦ things used to open cans/bottles: can opener or corkscrew

◦ (61) dishwasher, dish washer, dishwashing machine

◦ (24) pretzel

◦ (55) lamp

◦ (57) toaster

◦ (46) hair dryer, blow dryer

## 1000 classes of ILSVRC2012-2014 single-object localization (dark green) versus 20 classes of PASCAL 2012 (light blue)

![](Images_26M35FQL/a6acc70c0c5eb7c2bea28b47c347cb4a979e9fada4ed42a9e04fac42bd5c1c1d.jpg)

![](Images_26M35FQL/b57d4e62affce9cff3047402a385a57a789abba39a25fba8c9a6f2ce511d33ef.jpg)

![](Images_26M35FQL/11759241482556d2fbb10258168ac1a5316a9a763efddb58a0ea5844e2e60493.jpg)

![](Images_26M35FQL/ecd7462b61443c3134981297531ac5ee4aa17217fc2dd82967ce824fe5b25e57.jpg)  
200 hardest classes of ILSVRC2012-2014 single-object localization (dark green) versus 20 classes of PASCAL 2012 (light blue)

![](Images_26M35FQL/c374763179ad7d940efa3494dfc48ad58fdf30e4f691f99a1ca944b9ee443800.jpg)

![](Images_26M35FQL/3d6de557036b6702e37df2c94383ee3018a87d6e50d878356b3b00a8c7b7e38d.jpg)

![](Images_26M35FQL/14e8e215c0048a01966a3f99aef8061ba8f1ab857ba88e339e1a8f1cb9dd7a8d.jpg)

![](Images_26M35FQL/f00ee6662e27baafe0044c10750c564531bc232a87be308471810aec0c1ab572.jpg)  
Fig. 16 Distribution of various measures of localization difficulty on the ILSVRC2012-2014 single-object localization (dark green) and PASCAL VOC 2012 (light blue) validation sets. Object scale is fraction of image area occupied by an average object instance. Chance performance of localization and level of clutter are defined in Appendix B. The plots on top contain the full ILSVRC validation set with 1000 classes; the plots on the bottom contain 200 ILSVRC classes with the lowest chance performance of localization. All plots contain all 20 classes of PASCAL VOC.  
◦ (21) flute: a high-pitched musical instrument that looks like a straight tube and is usually played sideways (please do not confuse with oboes, which have a distinctive straw-like mouth piece and a slightly flared end)  
◦ (22) oboe: a slender musical instrument roughly 65cm long with metal keys, a distinctive straw-like mouthpiece and often a slightly flared end (please do not confuse with flutes)  
◦ (52) laptop, laptop computer  
◦ (23) saxophone: a musical instrument consisting of a brass conical tube, often with a u-bend at the end  
◦ (53) printer (please do not consider typewriters to be printers)  
◦ (54) computer keyboard  
• food: something you can eat or drink (includes growing fruit, vegetables and mushrooms, but does not include living animals)  
◦ food with bread or crust: pretzel, bagel, pizza, hotdog, hamburgers, etc  
◦ electric cooking appliance (an appliance which generates heat to cook food or boil water)  
◦ (25) bagel, beigel  
◦ (26) pizza, pizza pie  
◦ (27) hotdog, hot dog, red hot  
◦ (56) microwave, microwave oven  
◦ (58) waffle iron  
◦ (28) hamburger, beefburger, burger  
◦ (59) coffee maker: a kitchen appliance used for brewing coffee automatically  
◦ (60) vacuum, vacuum cleaner  
◦ (61) dishwasher, dish washer, dishwashing machine  
◦ (62) washer, washing machine: an electric appliance for washing clothes ◦ (63) traffic light, traffic signal, stoplight  
◦ (29) guacamole  
◦ (30) burrito  
◦ (31) popsicle (ice cream or water ice on a small wooden stick) ◦ fruit  
• items that run on electricity (plugged in or using batteries); including clocks, microphones, traffic lights, computers, etc  
◦ (45) remote control, remote  
◦ electronics that blow air  
◦ (47) electric fan: a device for creating a current of air by movement of a surface or surfaces (please do not consider hair dryers)  
◦ (50) microphone, mike  
◦ (64) tv or monitor: an electronic device that represents information in visual form

◦ computer and computer peripherals: mouse, laptop, printer, keyboard, etc ◦ (51) computer mouse

◦ (65) digital clock: a clock that displays the time of day digitally • kitchen items: tools,utensils and appliances usually found in the kitchen ◦ electric cooking appliance (an appliance which generates heat to cook food or boil water)

◦ (59) coffee maker: a kitchen appliance used for brewing coffee automatically

◦ (69) cocktail shaker

◦ non-electric item commonly found in the kitchen: pot, pan, utensil, bowl, etc

◦ (72) bowl: a dish for serving food that is round, open at the top, and has no handles (please do not confuse with a cup, which usually has a handle and is used for serving drinks)

◦ (73) salt or pepper shaker: a shaker with a perforated top for sprinkling salt or pepper

◦ (75) spatula: a turner with a narrow flexible blade ◦ (76) ladle: a spoon-shaped vessel with a long handle; frequently used to transfer liquids from one container to another

• furniture (including benches)

◦ (78) bookshelf: a shelf on which to keep books ◦ (79) baby bed: small bed for babies, enclosed by sides to prevent baby from falling

◦ (80) filing cabinet: office furniture consisting of a container for keeping papers in order

◦ (81) bench (a long seat for several people, typically made of wood or stone) ◦ (82) chair: a raised piece of furniture for one person to sit on; please do not confuse with benches or sofas, which are made for more people

◦ (83) sofa, couch: upholstered seat for more than one person; please do not confuse with benches (which are made of wood or stone) or with chairs (which are for just one person)

• clothing, article of clothing: a covering designed to be worn on a person’s body ◦ (85) diaper: Garment consisting of a folded cloth drawn up between the legs and fastened at the waist; worn by infants to catch excrement

◦ swimming attire: clothes used for swimming or bathing (swim suits, swim trunks, bathing caps)

◦ (86) swimming trunks: swimsuit worn by men while swimming ◦ (87) bathing cap, swimming cap: a cap worn to keep hair dry while swimming or showering

◦ (88) maillot: a woman’s one-piece bathing suit ◦ necktie: a man’s formal article of clothing worn around the neck (including bow ties)

◦ (89) bow tie: a man’s tie that ties in a bow ◦ (90) tie: a long piece of cloth worn for decorative purposes around the neck or shoulders, resting under the shirt collar and knotted at the throat (NOT a bow tie)

◦ headdress, headgear: clothing for the head (hats, helmets, bathing caps, etc) ◦ (87) bathing cap, swimming cap: a cap worn to keep hair dry while swimming or showering

◦ (91) hat with a wide brim

◦ (92) helmet: protective headgear made of hard material to resist blows ◦ (93) miniskirt, mini: a very short skirt

◦ (94) brassiere, bra: an undergarment worn by women to support their breasts ◦ (95) sunglasses

• living organism (other than people): dogs, snakes, fish, insects, sea urchins, starfish, etc.

◦ living organism which can fly

◦ (96) bee

◦ (97) dragonfly

◦ (98) ladybug

◦ (99) butterfly

◦ (100) bird

◦ living organism which cannot fly (please don’t include humans)

◦ living organism with 2 or 4 legs (please don’t include humans):

◦ mammals (but please do not include humans)

◦ feline (cat-like) animal: cat, tiger or lion

◦ (101) domestic cat

◦ (102) tiger

◦ (103) lion

◦ canine (dog-like animal): dog, hyena, fox or wolf

◦ (104) dog, domestic dog, canis familiaris

◦ (105) fox: wild carnivorous mammal with pointed muzzle and ears and a bushy tail (please do not confuse with dogs)

◦ animals with hooves: camels, elephants, hippos, pigs, sheep, etc

◦ (106) elephant

◦ (107) hippopotamus, hippo

◦ (108) camel

◦ (109) swine: pig or boar

◦ (110) sheep: woolly animal, males have large spiraling horns (please

do not confuse with antelope which have long legs)

◦ (111) cattle: cows or oxen (domestic bovine animals)

◦ (112) zebra

◦ (113) horse

◦ (114) antelope: a graceful animal with long legs and horns directed   
upward and backward   
(115)

◦ (116) hamster: short-tailed burrowing rodent with large cheek pouches ◦ (117) otter

◦ (118) monkey

◦ (119) koala bear

◦ (120) bear (other than pandas)

◦ (121) skunk (mammal known for its ability fo spray a liquid with a strong odor; they may have a single thick stripe across back and tail, two thinner stripes, or a series of white spots and broken stripes （122)rabbit

◦ (123) giant panda: an animal characterized by its distinct black and white markings

◦ (124) red panda: Reddish-brown Old World raccoon-like carnivore ◦ (125) frog, toad

◦ (126) lizard: please do not confuse with snake (lizards have legs)

◦ (127) turtle

◦ (128) armadillo

◦ (129) porcupine, hedgehog

◦ living organism with 6 or more legs: lobster, scorpion, insects, etc.

◦ (130) lobster: large marine crustaceans with long bodies and muscular tails; three of their five pairs of legs have claws

◦ (132) centipede: an arthropod having a flattened body of 15 to 173 segments each with a pair of legs, the foremost pair being modified as prehensors

◦ (133) tick (a small creature with 4 pairs of legs which lives on the blood of mammals and birds)

◦ (134) isopod: a small crustacean with seven pairs of legs adapted for crawling （135)

◦ living organism without legs: fish, snake, seal, etc. (please don’t include plants)

◦ living organism that lives in water: seal, whale, fish, sea cucumber, etc. ◦ (136) jellyfish

◦ (137) starfish, sea star

◦ (138) seal

◦ (139) whale

◦ (140) ray: a marine animal with a horizontally flattened body and enlarged winglike pectoral fins with gills on the underside

◦ (141) goldfish: small golden or orange-red fishes

◦ living organism that slides on land: worm, snail, snake

◦ (143) snake: please do not confuse with lizard (snakes do not have legs)

• vehicle: any object used to move people or objects from place to place

◦ a vehicle with wheels

◦ (144) golfcart, golf cart

◦ (145) snowplow: a vehicle used to push snow from roads

◦ (146) motorcycle (or moped)

◦ (147) car, automobile (not a golf cart or a bus)

◦ (148) bus: a vehicle carrying many passengers; used for public transport ◦ (149) train

◦ (150) cart: a heavy open wagon usually having two wheels and drawn by an animal

◦ (151) bicycle, bike: a two wheeled vehicle moved by foot pedals ◦ (152) unicycle, monocycle

◦ a vehicle without wheels (snowmobile, sleighs)

◦ (153) snowmobile: tracked vehicle for travel on snow ◦ (154) watercraft (such as ship or boat): a craft designed for water transportation

◦ (155) airplane: an aircraft powered by propellers or jets

• cosmetics: toiletry designed to beautify the body

◦ (156) face powder

◦ (157) perfume, essence (usually comes in a smaller bottle than hair spray

◦ (158) hair spray

◦ (159) cream, ointment, lotion

◦ (160) lipstick, lip rouge

• carpentry items: items used in carpentry, including nails, hammers, axes, screwdrivers, drills, chain saws, etc

◦ (161) chain saw, chainsaw

◦ (162) nail: pin-shaped with a head on one end and a point on the other (163) ft

◦ (163) axe: a sharp tool often used to cut trees/ logs ◦ (164) hammer: a blunt hand tool used to drive nails in or break things apart (please do not confuse with axe, which is sharp)

◦ (166) power drill: a power tool for drilling holes into hard materials

## • school supplies: rulers, erasers, pencil sharpeners, pencil boxes, binders

◦ (167) ruler,rule: measuring stick consisting of a strip of wood or metal or plastic with a straight edge that is used for drawing straight lines and measuring lengths

◦ (168) rubber eraser, rubber, pencil eraser

◦ (169) pencil sharpener

◦ (170) pencil box, pencil case

◦ (171) binder, ring-binder

• sports items: items used to play sports or in the gym (such as skis, raquets, gymnastics bars, bows, punching bags, balls)

◦ (172) bow: weapon for shooting arrows, composed of a curved piece of resilient wood with a taut cord to propel the arrow

◦ (173) puck, hockey puck: vulcanized rubber disk 3 inches in diameter that is used instead of a ball in ice hockey

◦ (174) ski

◦ (175) racket, racquet

◦ gymnastic equipment: parallel bars, high beam, etc

◦ (176) balance beam: a horizontal bar used for gymnastics which is raised from the floor and wide enough to walk on

◦ (177) horizontal bar, high bar: used for gymnastics; gymnasts grip it with their hands (please do not confuse with balance beam, which is wide enough to walk on)

◦ ball

◦ (178) golf ball

◦ (179) baseball

◦ (180) basketball

◦ (181) croquet ball

◦ (182) soccer ball

◦ (183) ping-pong ball

◦ (184) rugby ball

◦ (185) volleyball

◦ (186) tennis ball

◦ (187) punching bag, punch bag, punching ball, punchball

◦ (188) dumbbell: An exercising weight; two spheres connected by a short bar that serves as a handle

• liquid container: vessels which commonly contain liquids such as bottles, cans, etc.

◦ (189) pitcher: a vessel with a handle and a spout for pouring

◦ (190) beaker: a flatbottomed jar made of glass or plastic; used for chemistry

◦ (191) milk can

◦ (192) soap dispenser

◦ (193) wine bottle

◦ (194) water bottle

◦ (195) cup or mug (usually with a handle and usually cylindrical)

◦ (196) backpack: a bag carried by a strap on your back or shoulder

◦ (197) purse: a small bag for carrying money

◦ (198) plastic bag

• (199) person

• (200) flower pot: a container in which plants are cultivated

## Appendix E Modification to bounding box system for object detection

The bounding box annotation system described in Section 3.2.1 is used for annotating images for both the single-object localization dataset and the object detection dataset. However, two additional manual postprocessing are needed to ensure accuracy in the object detection scenario:

Ambiguous objects. The first common source of error was that workers were not able to accurately differentiate some object classes during annotation. Some commonly confused labels were seal and sea otter, backpack and purse, banjo and guitar, violin and cello, brass instruments (trumpet, trombone, french horn and brass), flute and oboe, ladle and spatula. Despite our best efforts (providing positive and negative example images in the annotation task, adding text explanations to alert the user to the distinction between these categories) these errors persisted.

In the single-object localization setting, this problem was not as prominent for two reasons. First, the way the data was collected imposed a strong prior on the object class which was present. Second, since only one object category needed to be annotated per image, ambiguous images could be discarded: for example, if workers couldn’t agree on whether or not a trumpet was in fact present, this image could simply be removed. In contrast, for the object detection setting consensus had to be reached for all target categories on all images.

To fix this problem, once bounding box annotations were collected we manually looked through all cases where the bounding boxes for two different object classes had significant overlap with each other (about 3% of the collected boxes). About a quarter of these boxes were found to correspond to incorrect objects and were removed. Crowdsourcing this post-processing step (with very stringent accuracy constraints) would be possible but it occurred in few enough cases that it was faster (and more accurate) to do this in-house.

Duplicate annotations. The second common source of error were duplicate bounding boxes drawn on the same object instance. Despite instructions not to draw more than one bounding box around the same object instance and constraints in the annotation UI enforcing at least a 5 pixel difference between different bounding boxes, these errors persisted. One reason was that sometimes the initial bounding box was not perfect and subsequent labelers drew a slightly improved alternative.

This type of error was also present in the singleobject localization scenario but was not a major cause for concern. A duplicate bounding box is a slightly perturbed but still correct positive example, and singleobject localization is only concerned with correctly localizing one object instance. For the detection task algorithms are evaluated on the ability to localize every object instance, and penalized for duplicate detections, so it is imperative that these labeling errors are corrected (even if they only appear in about 0.6% of cases).

Approximately 1% of bounding boxes were found to have significant overlap of more than 50% with another bounding box of the same object class.We again manually verified all of these cases in-house. In approximately 40% of the cases the two bounding boxes correctly corresponded to different people in a crowd, to stacked plates, or to musical instruments nearby in an orchestra. In the other 60% of cases one of the boxes was randomly removed.

These verification steps complete the annotation procedure of bounding boxes around every instance of every object class in validation, test and a subset of training images for the detection task.

Training set annotation. With the optimized algorithm of Section 3.3.3 we fully annotated the validation and test sets. However, annotating all training images with all target object classes was still a budget challenge. Positive training images taken from the single-object localization dataset already had bounding box annotations of all instances of one object class on each image. We extended the existing annotations to the detection dataset by making two modification. First, we corrected any bounding box omissions resulting from merging fine-grained categories: i.e., if an image belonged to the ”dalmatian” category and all instances of ”dalmatian” were annotated with bounding boxes for single-object localization, we ensured that all remaining ”dog” instances are also annotated for the object detection task. Second, we collected significantly more training data for the person class because the existing annotation set was not diverse enough to be representative (the only people categories in the single-object localization task are scuba diver, groom, and ballplayer). To compensate, we additionally annotated people in a large fraction of the existing training set images.

## Appendix F Competition protocol

Competition format. At the beginning of the competition period each year we release the new training/validation/test images, training/validation annotations, and competition specification for the year. We then specify a deadline for submission, usually approximately 4 months after the release of data. Teams are asked to upload a text file of their predicted annotations on test images by this deadline to a provided server. We then evaluate all submissions and release the results.

For every task we released code that takes a text file of automatically generated image annotations and compares it with the ground truth annotations to return a quantitative measure of algorithm accuracy. Teams can use this code to evaluate their performance on the validation data.

As described in (Everingham et al., 2014), there are three options for measuring performance on test data: (i) Release test images and annotations, and allow participants to assess performance themselves; (ii) Release test images but not test annotations – participants submit results and organizers assess performance; (iii) Neither test images nor annotations are released – participants submit software and organizers run it on new data and assess performance. In line with the PASCAL VOC choice, we opted for option (ii). Option (i) allows too much leeway in overfitting to the test data; option (iii) is infeasible, especially given the scale of our test set (40K-100K images).

We released ILSVRC2010 test annotations for the image classification task, but all other test annotations have remained hidden to discourage fine-tuning results on the test data.

Evaluation protocol after the challenge. After the challenge period we set up an automatic evaluation server that researchers can use throughout the year to continue evaluating their algorithms against the ground truth test annotations. We limit teams to 2 submissions per week to discourage parameter tuning on the test data, and in practice we have never had a problem with researchers abusing the system.

\*Bibliography

Ahonen, T., Hadid, A., and Pietikinen, M. (2006). Face description with local binary patterns: Application to face recognition. PAMI, 28.

Alexe, B., Deselares, T., and Ferrari, V. (2012). Measuring the objectness of image windows. In PAMI.

Arandjelovic, R. and Zisserman, A. (2012). Three things everyone should know to improve object retrieval. In CVPR.

Arbelaez, P., Maire, M., Fowlkes, C., and Malik, J. (2011). Contour detection and hierarchical image segmentation. IEEE TPAMI, 33.

Arbel´aez, P., Pont-Tuset, J., Barron, J., Marques, F., and Malik, J. (2014). Multiscale combinatorial grouping. In Computer Vision and Pattern Recognition.

Batra, D., Agrawal, H., Banik, P., Chavali, N., Mathialagan, C. S., and Alfadda, A. (2013). Cloudcv: Large-scale distributed computer vision as a cloud service.

Bell, S., Upchurch, P., Snavely, N., and Bala, K. (2013). OpenSurfaces: A richly annotated catalog of surface appearance. In ACM Transactions on Graphics (SIGGRAPH).

Berg, A., Farrell, R., Khosla, A., Krause, J., Fei-Fei, L., Li, J., and Maji, S. (2013). Fine-Grained Competition. https://sites.google.com/site/fgcomp2013/.

Chatfield, K., Simonyan, K., Vedaldi, A., and Zisserman, A. (2014). Return of the devil in the details: Delving deep into convolutional nets. CoRR, abs/1405.3531.

Chen, Q., Song, Z., Huang, Z., Hua, Y., and Yan, S. (2014). Contextualizing object detection and classification. volume PP.

Crammer, K., Dekel, O., Keshet, J., Shalev-Shwartz, S., and Singer, Y. (2006). Online passive-aggressive algorithms. Journal of Machine Learning Research, 7:551–585.

Criminisi, A. (2004). Microsoft Research Cambridge (MSRC) object recognition image database (version 2.0). http://research.microsoft.com/vision/ cambridge/recognition.

Dean, T., Ruzon, M., Segal, M., Shlens, J., Vijayanarasimhan, S., and Yagnik, J. (2013). Fast, accurate detection of 100,000 object classes on a single machine. In CVPR.

Deng, J., Dong, W., Socher, R., Li, L.-J., Li, K., and Fei-Fei, L. (2009). ImageNet: a large-scale hierarchical image database. In CVPR.

Deng, J., Russakovsky, O., Krause, J., Bernstein, M., Berg, A. C., and Fei-Fei, L. (2014). Scalable multilabel annotation. In CHI.

Donahue, J., Jia, Y., Vinyals, O., Hoffman, J., Zhang, N., Tzeng, E., and Darrell, T. (2013). Decaf: A deep convolutional activation feature for generic visual recognition. CoRR, abs/1310.1531.

Dubout, C. and Fleuret, F. (2012). Exact acceleration of linear object detectors. In Proceedings of the European Conference on Computer Vision (ECCV).

Everingham, M., , Eslami, S. M. A., Van Gool, L., Williams, C. K. I., Winn, J., and Zisserman, A. (2014). The Pascal Visual Object Classes (VOC) challenge - a Retrospective. IJCV.

Everingham, M., Gool, L. V., Williams, C., Winn, J., and Zisserman, A. (2005-2012). PASCAL Visual Object Classes Challenge (VOC). http://www.pascalnetwork.org/challenges/VOC/voc2012/workshop/index.html.

Everingham, M., Van Gool, L., Williams, C. K. I., Winn, J., and Zisserman, A. (2010). The Pascal Visual Object Classes (VOC) challenge. IJCV, 88(2):303–338.

Fei-Fei, L., Fergus, R., and Perona, P. (2004). Learning generative visual models from few examples: an incremental bayesian approach tested on 101 object categories. In CVPR.

Fei-Fei, L. and Perona, P. (2005). A bayesian hierarchical model for learning natural scene categories. In CVPR.

Felzenszwalb, P., Girshick, R., McAllester, D., and Ramanan, D. (2010). Object detection with discrimina-

tively trained part based models. PAMI, 32.

Frome, A., Corrado, G., Shlens, J., Bengio, S., Dean, J., Ranzato, M., and Mikolov, T. (2013). Devise: A deep visual-semantic embedding model. In Advances In Neural Information Processing Systems, NIPS.

Geiger, A., Lenz, P., Stiller, C., and Urtasun, R. (2013). Vision meets robotics: The kitti dataset. International Journal of Robotics Research (IJRR).

Girshick, R., Donahue, J., Darrell, T., and Malik., J. (2014). Rich feature hierarchies for accurate object detection and semantic segmentation. In CVPR.

Girshick, R. B., Donahue, J., Darrell, T., and Malik, J. (2013). Rich feature hierarchies for accurate object detection and semantic segmentation (v4). CoRR.

Gould, S., Fulton, R., and Koller, D. (2009). Decomposing a scene into geometric and semantically consistent regions. In ICCV.

Graham, B. (2013). Sparse arrays of signatures for online character recognition. CoRR.

Griffin, G., Holub, A., and Perona, P. (2007). Caltech-256 object category dataset. Technical Report 7694, Caltech.

Harada, T. and Kuniyoshi, Y. (2012). Graphical gaussian vector for image categorization. In NIPS.

Harel, J., Koch, C., and Perona, P. (2007). Graph-based visual saliency. In NIPS.

He, K., Zhang, X., Ren, S., , and Su, J. (2014). Spatial pyramid pooling in deep convolutional networks for visual recognition. In ECCV.

Hinton, G. E., Srivastava, N., Krizhevsky, A., Sutskever, I., and Salakhutdinov, R. (2012). Improving neural networks by preventing co-adaptation of feature detectors. CoRR, abs/1207.0580.

Hoiem, D., Chodpathumwan, Y., and Dai, Q. (2012). Diagnosing error in object detectors. In ECCV.

Howard, A. (2014). Some improvements on deep convolutional neural network based image classification. ICLR.

Huang, G. B., Ramesh, M., Berg, T., and Learned-Miller, E. (2007). Labeled faces in the wild: A database for studying face recognition in unconstrained environments. Technical Report 07-49, University of Massachusetts, Amherst.

Iandola, F. N., Moskewicz, M. W., Karayev, S., Girshick, R. B., Darrell, T., and Keutzer, K. (2014). Densenet: Implementing efficient convnet descriptor pyramids. CoRR.

Jia, Y. (2013). Caffe: An open source convolutional architecture for fast feature embedding. http:// caffe.berkeleyvision.org/.

Jojic, N., Frey, B. J., and Kannan, A. (2003). Epitomic analysis of appearance and shape. In ICCV.

Kanezaki, A., Inaba, S., Ushiku, Y., Yamashita, Y., Muraoka, H., Kuniyoshi, Y., and Harada, T. (2014). Hard negative classes for multiple object detection. In ICRA.

Khosla, A., Jayadevaprakash, N., Yao, B., and Fei-Fei, L. (2011). Novel dataset for fine-grained image categorization. In First Workshop on Fine-Grained Visual Categorization, CVPR.

Krizhevsky, A., Sutskever, I., and Hinton, G. (2012). ImageNet classification with deep convolutional neural networks. In NIPS.

Kuettel, D., Guillaumin, M., and Ferrari, V. (2012). Segmentation Propagation in ImageNet. In eccv.

Lazebnik, S., Schmid, C., and Ponce, J. (2006). Beyond bags of features: Spatial Pyramid Matching for recognizing natural scene categories. In CVPR.

Lin, M., Chen, Q., and Yan, S. (2014a). Network in network. ICLR.

Lin, T.-Y., Maire, M., Belongie, S., Hays, J., Perona, P., Ramanan, D., Dollr, P., and Zitnick, C. L. (2014b). Microsoft COCO: Common Objects in Context. In ECCV.

Lin, Y., Lv, F., Cao, L., Zhu, S., Yang, M., Cour, T., Yu, K., and Huang, T. (2011). Large-scale image classification: Fast feature extraction and SVM training. In CVPR.

Liu, C., Yuen, J., and Torralba, A. (2011). Nonparametric scene parsing via label transfer. IEEE Transactions on Pattern Analysis and Machine Intelligence, 33(12).

Lowe, D. G. (2004). Distinctive image features from scale-invariant keypoints. IJCV, 60(2):91–110.

Maji, S. and Malik, J. (2009). Object detection using a max-margin hough transform. In CVPR.

Manen, S., Guillaumin, M., and Van Gool, L. (2013). Prime Object Proposals with Randomized Prim’s Algorithm. In ICCV.

Mensink, T., Verbeek, J., Perronnin, F., and Csurka, G. (2012). Metric Learning for Large Scale Image Classification: Generalizing to New Classes at Near-Zero Cost. In ECCV.

Mikolov, T., Chen, K., Corrado, G., and Dean, J. (2013). Efficient estimation of word representations in vector space. ICLR.

Miller, G. A. (1995). Wordnet: A lexical database for english. Commun. ACM, 38(11).

Oliva, A. and Torralba, A. (2001). Modeling the shape of the scene: A holistic representation of the spatial envelope. IJCV.

Ordonez, V., Deng, J., Choi, Y., Berg, A. C., and Berg, T. L. (2013). From large scale image categorization to entry-level categories. In IEEE International Conference on Computer Vision (ICCV).

Ouyang, W., Luo, P., Zeng, X., Qiu, S., Tian, Y., Li, H., Yang, S., Wang, Z., Xiong, Y., Qian, C., Zhu, Z., Wang, R., Loy, C. C., Wang, X., and Tang, X. (2014). Deepid-net: multi-stage and deformable deep convolutional neural networks for object detection. CoRR, abs/1409.3505.

Ouyang, W. and Wang, X. (2013). Joint deep learning for pedestrian detection. In ICCV.

Papandreou, G. (2014). Deep epitomic convolutional neural networks. CoRR.

Papandreou, G., Chen, L.-C., and Yuille, A. L. (2014). Modeling image patches with a generic dictionary of mini-epitomes.

Perronnin, F., Akata, Z., Harchaoui, Z., and Schmid, C. (2012). Towards good practice in large-scale learning for image classification. In CVPR.

Perronnin, F. and Dance, C. R. (2007). Fisher kernels on visual vocabularies for image categorization. In CVPR.

Perronnin, F., S´anchez, J., and Mensink, T. (2010). Improving the fisher kernel for large-scale image classification. In ECCV (4).

Russakovsky, O., Deng, J., Huang, Z., Berg, A., and Fei-Fei, L. (2013). Detecting avocados to zucchinis: what have we done, and where are we going? In ICCV.

Russell, B., Torralba, A., Murphy, K., and Freeman, W. T. (2007). LabelMe: a database and web-based tool for image annotation. IJCV.

Sanchez, J. and Perronnin, F. (2011). High-dim. signature compression for large-scale image classification. In CVPR.

Sanchez, J., Perronnin, F., and de Campos, T. (2012). Modeling spatial layout of images beyond spatial pyramids. In PRL.

Scheirer, W., Kumar, N., Belhumeur, P. N., and Boult, T. E. (2012). Multi-attribute spaces: Calibration for attribute fusion and similarity search. In CVPR.

Schmidhuber, J. (2012). Multi-column deep neural networks for image classification. In CVPR.

Sermanet, P., Eigen, D., Zhang, X., Mathieu, M., Fergus, R., and LeCun, Y. (2013). Overfeat: Integrated recognition, localization and detection using convolutional networks. CoRR, abs/1312.6229.

Sheng, V. S., Provost, F., and Ipeirotis, P. G. (2008). Get another label? Improving data quality and data mining using multiple, noisy labelers. In SIGKDD.

Simonyan, K., Vedaldi, A., and Zisserman, A. (2013). Deep fisher networks for large-scale image classification. In NIPS.

Simonyan, K. and Zisserman, A. (2014). Very deep convolutional networks for large-scale image recognition. CoRR, abs/1409.1556.

Sorokin, A. and Forsyth, D. (2008). Utility data annotation with Amazon Mechanical Turk. In InterNet08.

Su, H., Deng, J., and Fei-Fei, L. (2012). Crowdsourcing annotations for visual object detection. In AAAI Human Computation Workshop.

Szegedy, C., Liu, W., Jia, Y., Sermanet, P., Reed, S., Anguelov, D., Erhan, D., and Rabinovich, A. (2014). Going deeper with convolutions. Technical report.

Tang, Y. (2013). Deep learning using support vector machines. CoRR, abs/1306.0239.

Thorpe, S., Fize, D., Marlot, C., et al. (1996). Speed of processing in the human visual system. nature, 381(6582):520–522.

Torralba, A. and Efros, A. A. (2011). Unbiased look at dataset bias. In CVPR’11.

Torralba, A., Fergus, R., and Freeman, W. (2008). 80 million tiny images: A large data set for nonparametric object and scene recognition. In PAMI.

Uijlings, J., van de Sande, K., Gevers, T., and Smeulders, A. (2013). Selective search for object recognition. International Journal of Computer Vision.

Urtasun, R., Fergus, R., Hoiem, D., Torralba, A., Geiger, A., Lenz, P., Silberman, N., Xiao, J., and Fidler, S. (2013-2014). Reconstruction meets recognition challenge. http://ttic.uchicago.edu/ \~rurtasun/rmrc/.

van de Sande, K. E. A., Gevers, T., and Snoek, C. G. M. (2010). Evaluating color descriptors for object and scene recognition. IEEE Transactions on Pattern Analysis and Machine Intelligence, 32(9):1582–1596.

van de Sande, K. E. A., Gevers, T., and Snoek, C. G. M. (2011a). Empowering visual categorization with the gpu. IEEE Transactions on Multimedia, 13(1):60–70.

van de Sande, K. E. A., Snoek, C. G. M., and Smeulders, A. W. M. (2014). Fisher and vlad with flair. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition.

van de Sande, K. E. A., Uijlings, J. R. R., Gevers, T., and Smeulders, A. W. M. (2011b). Segmentation as selective search for object recognition. In ICCV.

Vittayakorn, S. and Hays, J. (2011). Quality assessment for crowdsourced object annotations. In BMVC.

von Ahn, L. and Dabbish, L. (2005). Esp: Labeling images with a computer game. In AAAI Spring Symposium: Knowledge Collection from Volunteer Contributors.

Vondrick, C., Patterson, D., and Ramanan, D. (2012). Efficiently scaling up crowdsourced video annotation. International Journal of Computer Vision.

Wan, L., Zeiler, M., Zhang, S., LeCun, Y., and Fergus, R. (2013). Regularization of neural networks using dropconnect. In Proc. International Conference on Machine learning (ICML’13).

Wang, J., Yang, J., Yu, K., Lv, F., Huang, T., and Gong, Y. (2010). Locality-constrained Linear Coding for image classification. In CVPR.

Wang, M., Xiao, T., Li, J., Hong, C., Zhang, J., and Zhang, Z. (2014). Minerva: A scalable and highly efficient training platform for deep learning. In APSys.

Wang, X., Yang, M., Zhu, S., and Lin, Y. (2013). Regionlets for generic object detection. In ICCV.

Welinder, P., Branson, S., Belongie, S., and Perona, P. (2010). The multidimensional wisdom of crowds. In NIPS.

Xiao, J., Hays, J., Ehinger, K., Oliva, A., and Torralba., A. (2010). SUN database: Large-scale scene recognition from Abbey to Zoo. CVPR.

Yang, J., Yu, K., Gong, Y., and Huang, T. (2009). Linear spatial pyramid matching using sparse coding for image classification. In CVPR.

Yao, B., Yang, X., and Zhu, S.-C. (2007). Introduction to a large scale general purpose ground truth dataset: methodology, annotation tool, and benchmarks.

Zeiler, M. D. and Fergus, R. (2013). Visualizing and understanding convolutional networks. CoRR, abs/1311.2901.

Zeiler, M. D., Taylor, G. W., and Fergus, R. (2011). Adaptive deconvolutional networks for mid and high level feature learning. In ICCV.

Zhou, B., Lapedriza, A., Xiao, J., Torralba, A., and Oliva, A. (2014). Learning deep features for scene recognition using places database. NIPS.

Zhou, X., Yu, K., Zhang, T., and Huang, T. (2010). Image classification using super-vector coding of local image descriptors. In ECCV.