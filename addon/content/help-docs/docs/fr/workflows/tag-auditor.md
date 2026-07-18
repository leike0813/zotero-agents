# Tag Auditor

## Objectif

Analyser toutes les notices régulières de niveau supérieur dans la bibliothèque Zotero par rapport au vocabulaire de balises contrôlé et signaler la conformité des balises par notice. Les résultats sont écrits dans le panneau d'audit des balises du Synthesis Workbench pour examen et régulation ultérieure.

## Entrées

Aucun paramètre ni sélection d'élément Zotero requis. Le workflow opère sur l'ensemble de la bibliothèque.

## Comportement

1. Charger le vocabulaire de balises contrôlé depuis Synthesis via `exportTagVocabularyForRegulator`.
2. Parcourir par pages toutes les notices régulières de niveau supérieur dans la bibliothèque (excluant les éléments enfants, notes, pièces jointes et notices supprimées).
3. Pour chaque notice, collecter ses balises actuelles et évaluer la conformité : une balise est non conforme si elle n'est pas présente dans le vocabulaire contrôlé.
4. Grouper les entrées d'audit par ID de bibliothèque et les écrire dans Synthesis via `replaceTagAuditRecords`.

Le workflow est entièrement automatique et ne modifie aucun élément ni balise Zotero. C'est un scan en lecture seule qui produit des enregistrements d'audit pour le panneau Balises.

## Sortie et application

Le panneau d'audit des Balises du Synthesis Workbench affiche des enregistrements d'audit par notice, chacun contenant :

| Champ | Description |
|-------|-------------|
| `itemKey` | La clé de l'élément Zotero |
| `compliant` | Si toutes les balises de la notice sont dans le vocabulaire contrôlé |
| `nonCompliantTags` | Liste des balises non trouvées dans le vocabulaire contrôlé |

Le résultat d'exécution résume le nombre de notices auditées et de notices nécessitant une régulation de balises par bibliothèque. Exécuter à nouveau le workflow remplace les enregistrements d'audit précédents (idempotent dans le même état de vocabulaire).

Un prérequis est qu'un vocabulaire de balises contrôlé doit déjà être défini dans la page Balises du Synthesis Workbench.

## Dépendances

- Aucune connexion backend requise
- **Vocabulaire contrôlé** : Un vocabulaire de balises contrôlé doit d'abord être défini ; voir [Gestion des balises](#doc/synthesis%2Ftags)

## Workflows connexes

- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Normaliser les balises selon le vocabulaire contrôlé et inférer de nouvelles balises
- [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) — Créer interactivement un vocabulaire de balises contrôlé
