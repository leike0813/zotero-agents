# Tableau de bord Home

Home est la première page que vous voyez en ouvrant le Synthesis Workbench. Elle fournit un aperçu complet de votre bibliothèque, de l'état de la synchronisation et un accès rapide aux sujets tendance.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/home.webp" alt="Synthesis Home Dashboard" title="Synthesis Home Dashboard" loading="lazy" /><figcaption>Synthesis Home Dashboard</figcaption></figure>

## Cartes d'aperçu de la bibliothèque

Le haut de la page affiche un ensemble de cartes statistiques montrant l'état actuel du système Synthesis :

| Métrique | Description |
|--------|-------------|
| **Articles enregistrés** | Nombre total d'articles inclus dans l'index de référence canonique |
| **Nombre de sujets** | Nombre de synthèses de sujets créées |
| **Nœuds du graphe** | Nombre total de nœuds dans le graphe de citations (articles de la bibliothèque + références externes) |
| **Arêtes du graphe** | Nombre total de relations de citation dans le graphe de citations |
| **État de la synchronisation** | État de fonctionnement de la synchronisation WebDAV/Git |

Ces métriques vous aident à comprendre rapidement le niveau de structuration et la progression de la synthèse de votre bibliothèque.

## Panneau de synchronisation

Si la [synchronisation WebDAV](#doc/synthesis%2Fwebdav-sync) (recommandée) ou la [synchronisation Git](#doc/synthesis%2Fgit-sync) (obsolète) est configurée, la page Home affiche un panneau d'état de la synchronisation :

### Synchronisation WebDAV

- **État de la synchronisation** : idle / queued / syncing / blocked_conflict / failed
- **Dernière synchronisation**
- **Identifiant HEAD distant**
- **Boutons d'action** : Synchronisation manuelle, pause/reprise, réessayer

Lorsque des conflits surviennent, le panneau affiche les détails du conflit et les options d'action (`keep_local`, `clear_after_manual_edit`).

Pour la configuration détaillée et l'utilisation de la synchronisation WebDAV, voir [Synchronisation WebDAV](#doc/synthesis%2Fwebdav-sync).

:::warning Note sur la synchronisation automatique
La fonctionnalité de synchronisation automatique de la synchronisation WebDAV n'a pas été testée de manière approfondie. Il est recommandé d'**utiliser uniquement la synchronisation manuelle** à ce stade, et d'activer la synchronisation automatique après son amélioration dans une prochaine version.
:::

### Synchronisation Git (obsolète)

Voir [Synchronisation Git](#doc/synthesis%2Fgit-sync) pour référence historique.

## Panneau d'éléments à réviser

La page Home peut afficher un aperçu rapide des éléments en attente de révision :

| Catégorie de révision | Description |
|-----------------|-------------|
| **Correspondances de citations** | Propositions de liaison citation-notice en attente |
| **Concepts** | Suggestions de concepts, sens et alias en attente |
| **Relations du graphe de sujets** | Relations inter-sujets en attente |
| **Suggestions de balises** | Balises suggérées par l'IA en attente d'approbation |

Chaque catégorie affiche un badge avec le nombre d'éléments en attente. Cliquez pour naviguer vers le sous-onglet correspondant dans le [Centre de révision](#doc/synthesis%2Freview).

## Sujets tendance

La section inférieure de la page affiche une liste de cartes des sujets tendance, triés par nombre d'articles associés. Chaque carte contient :

- **Nom du sujet** — Cliquez pour entrer dans la page de détail du sujet
- **Nombre d'articles** — Nombre d'articles couverts par le sujet
- **Aperçu du résumé** — Extrait de la description du sujet
- **Boutons d'action** — Ouvrir le sujet, mettre à jour le sujet

Lorsqu'il y a plusieurs sujets actifs, utilisez le lien « Voir tout » pour parcourir la liste complète dans la page Sujets.

## Prochaines étapes

- [Synchronisation WebDAV](#doc/synthesis%2Fwebdav-sync) — Configurer la synchronisation multi-appareils des données Synthesis
- [Centre de révision](#doc/synthesis%2Freview) — Traiter les éléments de révision des correspondances de citations, des concepts et du graphe de sujets
- [Index et graphe de citations](#doc/synthesis%2Findex-and-citation) — Gérer l'index de référence canonique
