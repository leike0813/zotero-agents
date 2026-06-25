# Index et graphe de citations

## Surface Index

Dans la page Synthesis Workbench → Index, vous pouvez gérer l'index de référence canonique. La surface Index contient **deux sous-vues** :

### Vue Registre

Affiche une liste de tous les articles suivis dans la bibliothèque, chaque ligne montrant un article et son état de couverture :

- **Informations sur l'article** : Titre, auteur, année
- **Couverture** : Complet / Partiel / Manquant (état de couverture des trois types d'artefacts : résumé, références, analyse de citations)
- **Ligne extensible** : Lorsqu'elle est déployée, affiche la liste des références de l'article, chaque citation étant marquée par son état de liaison (unbound / candidate / accepted / rejected)
- **Filtre** : Filtrer par portée (all / library / cited), couverture ou recherche

![Synthesis Index Registry View](/img/docs/synthesis/index.png)

### Vue Référence canonique

Affichée lorsque l'outil d'indexation actif est basculé sur « Réviser le canon » :

- **Liste des références canoniques** : Enregistrements de références canoniques dédoublonnés
- **Recherche et filtre** : Filtrer par état de liaison, visibilité dans le graphe, état de redirection, ou s'il existe des candidats en double
- **Actions** : Modification des métadonnées, fusion des références en double, création de redirections, consultation des éléments de révision

![Synthesis Index Canonical Reference Revision View](/img/docs/synthesis/index_canonical-revision.png)

## Index de référence canonique

L'index de référence canonique est l'index central du système Synthesis, effectuant le dédoublonnage et la canonisation de toutes les références des articles de la bibliothèque. Il obtient les données brutes de citations depuis le Reference Sidecar (voir la section « Reference Sidecar » dans la [Vue d'ensemble](/synthesis)) et forme l'index par extraction, canonisation et liaison par correspondance.

### Fonctionnalités

- **Recherche plein texte** : Rechercher dans toutes les références canonisées
- **Modification des métadonnées** : Modifier les métadonnées des enregistrements de citations
- **Fusion** : Fusionner des enregistrements de références en double (crée automatiquement des redirections)
- **Redirection** : Pointer une référence vers un autre enregistrement canonique
- **Révision** : Voir les éléments de révision de qualité pour la correspondance de citations
- **Dédoublonnage** : Découvrir des références potentiellement en double

### Types d'enregistrements de référence

| Type | Description |
|------|-------------|
| **Bound** | Associé à une notice de la bibliothèque Zotero |
| **External** | Littérature connue ne figurant pas dans la bibliothèque Zotero actuelle |
| **Unresolved** | Extrait des références mais pas encore identifié |

## Pipeline de correspondance des références

La correspondance des références est le processus d'établissement automatique d'associations entre les références extraites des articles et les notices de la bibliothèque Zotero. Le système utilise un **modèle en deux étapes** pour équilibrer performance et précision.

### Modèle en deux étapes

#### Étape 1 : Rafraîchissement léger du Sidecar

S'exécute pendant les opérations régulières (ex. : après l'application d'un résumé), analyse l'état du sidecar, compare les hashs d'artefacts de citation et ne traite que les références ayant changé. **N'exécute pas de dédoublonnage avancé ni de construction d'index**, effectue uniquement une assignation canonique et une liaison légères.

- Déclencheur : Après l'exécution du workflow et l'écriture des artefacts, ou via une opération de rafraîchissement explicite
- Portée : Incrémentale (uniquement les références modifiées)
- Algorithme : Correspondance par identifiants simples (DOI, arXiv, ISBN)

#### Étape 2 : Correspondance de citations avancée

Une opération de correspondance profonde déclenchée explicitement. Construit un index complet de correspondance de citations et exécute des algorithmes complets de correspondance et de dédoublonnage.

- Déclencheur : Déclenchement manuel par l'utilisateur, maintenance périodique
- Portée : Complète
- Algorithme : Correspondance multi-stratégies + dédoublonnage par clustering

:::caution Note sur les performances
La correspondance de citations avancée, le rafraîchissement de l'index et la reconstruction du graphe de citations sont des opérations intensives en calcul. Puisque Zotero utilise une architecture de processus hôte unique, ces opérations peuvent provoquer de brefs ralentissements de l'interface utilisateur pendant l'exécution. Veuillez faire preuve de patience. Ce problème devrait être résolu lors d'une future refonte architecturale.
:::

### Stratégies de correspondance

| Stratégie | Base de correspondance | Confiance | Description |
|----------|-------------|------------|-------------|
| Correspondance DOI | Identifiant DOI | Déterministe | Correspondance exacte, acceptée automatiquement |
| Correspondance arXiv | ID arXiv | Déterministe | Correspondance exacte, acceptée automatiquement |
| Correspondance ISBN | Numéro ISBN | Déterministe | Correspondance exacte, acceptée automatiquement |
| Similarité de titre | Correspondance floue de titres | Haute / Moyenne / Basse | Utilise les titres normalisés et les titres compacts pour le calcul de similarité |
| Auteur + Année | Noms d'auteurs et année de publication | Moyenne / Basse | Combine la normalisation des auteurs et la plage d'années pour la correspondance |

### Niveaux de confiance

| Niveau | Description | Action recommandée |
|-------|-------------|-------------------|
| `deterministic` | Correspondance déterministe | Acceptation automatique |
| `high` | Haute confiance | Acceptable |
| `medium` | Confiance moyenne | Révision recommandée |
| `low` | Confiance faible | Révision requise |
| `review` | Nécessite un jugement humain | Révision obligatoire |

### Dédoublonnage par clustering

L'étape de correspondance avancée effectue un dédoublonnage par clustering sur les références canoniques. Processus de l'algorithme :

1. Construction d'un enregistrement de dédoublonnage pour chaque référence canonique (incluant le filtrage d'éligibilité et l'analyse du bruit bibliographique)
2. La comparaison par paires produit des arêtes de cluster (correspondance exacte d'identifiants, correspondance canonique de titres, correspondance floue de titres, etc.)
3. Les arêtes sont agrégées en clusters et sous-clusters
4. Génère des redirections automatiques ou des propositions de révision pour le dédoublonnage

Contrainte de sécurité : Les correspondances à faible confiance (ex. : `contained_extension_risk`) ne déclenchent jamais de redirections automatiques et nécessitent une révision par l'utilisateur.

### Surface de révision

Dans le [Centre de révision](review), vous pouvez voir et traiter les propositions de correspondance de citations, en les acceptant ou en les rejetant une par une.

## Graphe de citations

Le graphe de citations visualise les articles de la bibliothèque et leurs références sous forme de graphe réseau. Les données du graphe sont construites comme une projection SQLite et peuvent tolérer un certain degré d'obsolescence des données (n'est pas un miroir en temps réel).

![Synthesis Citation Graph](/img/docs/synthesis/citation-graph.png)

### Types de nœuds

| Nœud | Couleur | Description |
|------|-------|-------------|
| `library_paper` | Bleu | Articles déjà dans la bibliothèque Zotero |
| `external_reference` | Vert | Références connues ne figurant pas dans la bibliothèque |
| `unresolved_reference` | Gris | Références extraites mais non identifiées |

### Informations sur les arêtes

Chaque arête de citation contient :

- **mention_count** : Nombre de fois citée
- **primary_role** : Rôle de citation principal (ex. : contexte, comparaison, support, contraste)
- **aux_roles** : Liste des rôles auxiliaires
- **role_evidence** : Base pour la détermination du rôle

### Métriques du graphe

Le graphe de citations peut calculer diverses métriques pour aider à identifier les articles fondamentaux et les travaux influents :

| Métrique | Description |
|--------|-------------|
| **Nombre de citations** | Nombre total de fois qu'un article est cité |
| **PageRank** | Score d'importance d'un nœud basé sur la structure du graphe |
| **Foundation Score** | Degré auquel il sert de travail fondateur dans le domaine |
| **Frontier Score** | Degré auquel il représente un travail de pointe |

### Dispositions de visualisation

| Disposition | Description | Cas d'utilisation |
|--------|-------------|----------|
| **Force (Force-Directed)** | Disposition d3-force | Explorer la structure globale |
| **Radial** | Déploiement autour d'un nœud sélectionné | Analyser le réseau de citations d'un article |
| **Composantes** | Regroupement par composantes connexes | Découvrir des clusters de citations indépendants |

### Opérations interactives

- **Zoom / Déplacement** : Parcourir le graphe librement
- **Survol** : Voir les étiquettes des nœuds et les informations de base
- **Clic sur le nœud** : Ouvrir la notice d'article correspondante dans Zotero
- **Filtrer** : Filtrer les citations affichées par rôle, sujet ou type de nœud
- **Afficher/masquer les citations à faible signal** : Afficher/masquer les arêtes à faible nombre de citations
- **Curseur de profondeur** : Contrôler la profondeur d'expansion du réseau de citations

### Filtrage par sujet

Vous pouvez filtrer le graphe de citations par sujet pour n'afficher que les articles et les relations de citations liés à des sujets spécifiques. Les portées de sujets sont affichées dans le graphe avec différentes couleurs et groupements.

## Prochaines étapes

- [Centre de révision](review) — Réviser les propositions de correspondance et de dédoublonnage de citations
- [Créer une synthèse de sujet](topic-synthesis) — Créer des analyses de sujets basées sur les réseaux de citations
- [Tableau de bord Home](home) — Voir les métriques d'aperçu de la bibliothèque
- [Synchronisation WebDAV](webdav-sync) — Synchroniser les données de liaison de citations entre appareils
