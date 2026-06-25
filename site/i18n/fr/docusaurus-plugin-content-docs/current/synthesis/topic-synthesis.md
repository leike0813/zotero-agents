# Créer une synthèse de sujet

## Qu'est-ce que la synthèse de sujet ?

La synthèse de sujet est le processus d'analyse et de synthèse systématique d'un groupe de littérature connexe. Elle extrait automatiquement les informations clés, identifie les structures de sujets et génère des rapports d'analyse complets grâce à des workflows IA.

## Surface Sujets

Dans la page Synthesis Workbench → Sujets, vous pouvez parcourir et gérer tous les sujets créés. La surface Sujets prend en charge **trois modes d'affichage** :

| Vue | Description | Cas d'utilisation |
|------|-------------|----------|
| **Vue Graphe** | Graphe force-directed avec les sujets comme nœuds et les relations comme arêtes | Comprendre intuitivement les associations inter-sujets |
| **Vue Grille** | Cartes avec titre, nombre d'articles, résumé et boutons d'action | Parcourir et trouver des sujets |
| **Vue Liste** | Vue tabulaire avec colonnes : nom, nombre d'articles, date de création, date de mise à jour, état | Tri et opérations groupées |

![Synthesis Topics Graph View](/img/docs/synthesis/topic-graph.png)

### Opérations de gestion des sujets

- **Rechercher** : Rechercher par nom et description du sujet
- **Trier** : Trier par titre, nombre d'articles ou date de mise à jour
- **Créer un nouveau sujet** : Cliquer sur le bouton de création pour démarrer le pipeline de workflow
- **Mettre à jour le sujet** : Ré-exécuter le pipeline pour mettre à jour l'analyse du sujet
- **Supprimer le sujet** : Retirer les sujets qui ne sont plus nécessaires

## Processus de création

La création de sujet est pilotée par des workflows et constitue un pipeline automatisé en plusieurs étapes :

```
1. create-topic-prepare
   → Collecter les données littéraires, construire l'ensemble d'articles
   
2. topic-synthesis-core-enrichment
   → Enrichissement central : extraire les informations, associer les connaissances
   
3. topic-synthesis-finalize
   → Générer les artefacts et rapports d'analyse finaux

(update-topic-synthesis-prepare est utilisé pour mettre à jour les sujets existants)
```

### Prérequis

- [Backend Skill-Runner](../backends/skill-runner) configuré
- Des articles pertinents dans la bibliothèque
- Les articles ont généré des résumés et des analyses de citations (optionnel, recommandé)

Ce pipeline est orchestré par le workflow [Création de synthèse de sujet](../workflows/topic-synthesis).

## Inspecteur de sujet

Après avoir créé un sujet, cliquez dessus pour entrer dans l'inspecteur de sujet. C'est un lecteur multi-pages contenant 8 sous-pages, chacune présentant une dimension différente du sujet.

### Aperçu

- Nom du sujet, description, score d'importance
- Résumé des affirmations fondamentales
- Statistiques (nombre d'articles, nombre de catégories, nombre d'affirmations, etc.)
- Informations de localisation associées dans le graphe de sujets

### Taxonomie

Affiche la structure de classification hiérarchique du sujet :

- Sujets plus larges : Domaines de sujets plus larges
- Sujets plus étroits : Sous-sujets plus spécifiques
- Sujets connexes : Autres sujets associés
- Position et hiérarchie dans le graphe de sujets

### Affirmations

Affirmations et assertions fondamentales extraites de la littérature :

- Chaque affirmation inclut les citations de preuve originales
- Marque les articles d'où proviennent les affirmations
- Type d'affirmation (trouvailles / hypothèses / conclusions, etc.)
- Nombre d'articles soutenant l'affirmation

### Comparaison

Comparaison des points de vue entre différents articles sur le même sujet :

- Dimensions de comparaison (méthodes, conclusions, jeux de données, etc.)
- Position et arguments de chaque article
- Visualisation des consensus et divergences

### Perspectives futures

Lacunes de recherche et orientations futures identifiées par l'analyse littéraire :

- Questions ouvertes
- Directions de recherche potentielles
- Défis et recommandations connexes

### Couverture

Analyse le degré de couverture de la littérature pertinente par le sujet :

- Liste des articles couverts par le sujet
- Complétude des articles (existence d'artefacts résumé/analyse de citations)
- Aspects couverts et aspects non couverts

### Références

Toutes les références associées au sujet, incluant les détails de liaison :

- Lien vers la notice Zotero pour chaque citation
- Rôle de la citation dans le sujet (support / contraste / contexte)
- Source et contexte de la citation

### Rapport (Rapport complet)

Le rapport d'analyse de synthèse structuré généré (au format Markdown) :

- Texte complet de l'analyse du sujet
- Peut être exporté en Markdown ou en HTML autonome
- Adapté pour être utilisé comme matériel de référence dans l'écriture académique

## Graphe de sujets

Le graphe de sujets est un réseau hiérarchique de sujets montrant les relations entre eux :

### Types de nœuds

| Type | Description |
|------|-------------|
| **materialized** | Sujets structurés qui ont été effectivement créés |
| **placeholder** | Espaces réservés de sujets déduits comme existants mais pas encore créés |

### État des arêtes

| État | Description |
|--------|-------------|
| `suggested` | Relations suggérées par le système (en attente de révision) |
| `confirmed` | Relations confirmées par l'utilisateur |
| `rejected` | Relations rejetées par l'utilisateur |
| `stale` | Données obsolètes, en attente de réévaluation |
| `deleted` | Relations supprimées |

### Types de relations

| Relation | Description |
|--------------|-------------|
| `broader_than` | A est un sujet plus large que B |
| `related_to` | Deux sujets sont liés |
| `overlaps_with` | Deux sujets se chevauchent |
| `contrasts_with` | Deux sujets se contrastent mutuellement |

### Gérer les sujets

- **Créer un nouveau sujet** : Cliquer sur « Créer » dans la page Sujets
- **Modifier un sujet** : Changer le nom, la description, l'importance, etc.
- **Associer des articles** : Ajouter ou retirer des articles d'un sujet
- **Parcourir le graphe de sujets** : Voir le réseau de relations entre les sujets

## Workflows associés

- [Création de synthèse de sujet](../workflows/topic-synthesis) — Détails du workflow de création de sujets
- [Encadrement de la littérature pour manuscrit](../workflows/manuscript-literature-framing) — Rédiger des articles basés sur l'analyse de sujets
