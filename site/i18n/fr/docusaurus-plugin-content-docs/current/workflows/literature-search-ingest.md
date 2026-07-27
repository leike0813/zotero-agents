# Literature Search & Ingest

## Objectif

Rechercher de la littérature académique avec l'IA et ingérer les résultats approuvés directement dans Zotero. Une requête vide peut démarrer une conversation guidée qui transforme un besoin de recherche en un brief de recherche confirmé.

## Modes de recherche

| Mode | Description |
|------|------|
| `auto` | Détecte un mode adapté pour une requête non vide ; une requête vide lance la planification guidée. |
| `guided` | Clarifier le besoin de recherche, inspecter la couverture locale Zotero/Synthesis, et exécuter directement le brief confirmé. |
| `topic_expansion` | Recherche par direction de recherche ou sujet. |
| `paper_seed_expansion` | Expansion à partir d'un article graine. |
| `targeted_ingest` | Localiser et ingérer précisément un seul article. |

## Flux d'exécution

```
1. Planification guidée (requête auto vide ou mode guided)
    └── Clarifier l'objectif de recherche en tours courts
    └── Lire uniquement la couverture locale Zotero/Synthesis
    └── Présenter un brief de recherche structuré
    └── Attendre la confirmation ; pas de recherche web ni d'écritures avant confirmation

2. Recherche et sélection des candidats
    └── Rechercher selon le brief confirmé ou le mode explicite
    └── Vérifier les identifiants, métadonnées faisant autorité, pages de destination et preuves légales de PDF public
    └── L'utilisateur sélectionne les articles à ingérer

3. Ingestion et finalisation
    └── Ingérer chaque article approuvé via zotero-bridge
    └── Produire un JSON d'ingestion concis, incluant les liens PDF manquants
```

## Paramètres

| Paramètre | Type | Description | Par défaut |
|------|------|------|------|
| `query` | string | Sujet de recherche, identifiant d'article, graine ou valeur vide pour la planification guidée. | Vide |
| `searchMode` | string | `auto`, `guided`, `topic_expansion`, `paper_seed_expansion` ou `targeted_ingest`. | `auto` |
| `searchBreadth` | string | Choisissez une découverte large sur plusieurs pistes, une couverture équilibrée ou un premier passage rapide. | `broad` |
| `languageHints` | string[] | Indications facultatives de langue BCP 47, par exemple `en`, `zh-CN`, `ja` ou `de` ; elles élargissent les requêtes et les sources sans filtrer les autres langues. | `[]` |
| `targetCollection` | string | Collection cible optionnelle. | Vide |

## Sorties

- Les preuves du candidat sont vérifiées avant que l'utilisateur puisse approuver l'ingestion.
- Chaque ingestion réussie est créée ou réutilisée dans Zotero ; les liens légaux vers les pages de destination restent disponibles lorsqu'aucun PDF n'est joint.
- Les exécutions guidées rapportent `search_mode: "guided"` ; les autres exécutions conservent leur mode de recherche concret.

## Dépendances

- **Backend** : Backend ACP avec exécution interactive
- **Skill** : `literature-search-ingest`
