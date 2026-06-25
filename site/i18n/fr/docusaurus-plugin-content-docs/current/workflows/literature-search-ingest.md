# Literature Search & Ingest

## Objectif

Rechercher de la littérature académique via l'IA et ingérer les résultats directement dans Zotero. Prend en charge plusieurs modes de recherche avec confirmation interactive avant d'exécuter l'opération d'ingestion.

## Cas d'Usage

- Rechercher et ingérer en lot de la littérature pertinente lors de l'exploration d'un nouveau sujet
- Saisir le titre, le DOI, l'identifiant arXiv ou le PMID d'un article connu pour un import rapide
- Élargir la recherche de littérature connexe à partir d'un article graine

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | workflow (aucune notice n'a besoin d'être sélectionnée) |
| Méthode de Déclenchement | Exécuter depuis le menu contextuel ou le Tableau de Bord, aucune notice n'a besoin d'être présélectionnée |

## Modes de Recherche

| Mode | Description |
|------|------|
| `auto` | Déterminer automatiquement le mode de recherche le plus adapté (par défaut) |
| `topic_expansion` | Rechercher par direction de recherche ou sujet pour trouver de la littérature connexe |
| `paper_seed_expansion` | Élargir la recherche à partir d'un article graine |
| `targeted_ingest` | Localiser et ingérer précisément un seul article |

## Flux d'Exécution

```
1. Phase de Confirmation du Plan
   └── Lire la bibliothèque Zotero et le contexte Synthesis
       └── Déterminer automatiquement le mode de recherche (mode auto)
       └── Présenter le plan de recherche à l'utilisateur
       └── Attendre la confirmation de l'utilisateur

2. Phase de Recherche (sans ingestion)
   └── Rechercher la littérature candidate selon le plan confirmé
       └── Afficher la liste des résultats de recherche
       └── L'utilisateur sélectionne la littérature à ingérer

3. Phase d'Ingestion
   └── Ingérer les articles un par un via zotero-bridge
       └── Inclut l'import des métadonnées et l'import des pièces jointes PDF
       └── Afficher la progression de l'ingestion

4. Fin
   └── Produire un résumé des résultats d'ingestion
       └── Inclut les informations sur les notices réussies/échouées
```

### Détails de l'Interaction

- Ce workflow s'exécute en mode **interactif**, nécessitant une confirmation utilisateur à des étapes clés
- Confirmation du plan : Après que l'IA présente le plan de recherche, l'utilisateur le confirme ou l'ajuste
- Confirmation de la liste : Après l'affichage des résultats de recherche, l'utilisateur vérifie les notices à ingérer
- La progression de l'exécution peut être suivie dans le Tableau de Bord

## Recommandation de Modèle

🔴 **Doit** avoir une capacité de recherche web. Le cœur de ce workflow est la recherche de littérature académique en ligne — les modèles sans capacité de recherche web ne peuvent pas effectuer cette tâche.
🟢 La capacité de raisonnement du modèle n'a pas besoin d'être puissante — la recherche et l'ingestion sont essentiellement des tâches de récupération et d'appel d'outils, que des modèles légers peuvent gérer.

## Sorties

- Les résultats de recherche sont ingérés directement comme notices Zotero
- Tente automatiquement de télécharger les pièces jointes PDF (au mieux)
- Peut spécifier une Collection cible pour le classement

## Paramètres

| Paramètre | Type | Description | Défaut |
|------|------|------|--------|
| `query` | string | Sujet de recherche, direction de recherche, titre d'article, DOI, identifiant arXiv, PMID, etc. | — |
| `searchMode` | string | Mode de recherche | `auto` |
| `targetCollection` | string | Collection cible (optionnel) | Vide |

### Valeurs Disponibles pour searchMode

- `auto` : Détermination automatique
- `topic_expansion` : Expansion de sujet
- `paper_seed_expansion` : Expansion par article graine
- `targeted_ingest` : Ingestion ciblée

## Dépendances

- **Backend** : Backend ACP (nécessite la prise en charge du protocole ACP)
- **Compétence** : La compétence `literature-search-ingest` doit être déployée sur le backend

## Workflows Associés

- [Literature Analysis](literature-analysis) — Générer des résumés pour la littérature ingérée
