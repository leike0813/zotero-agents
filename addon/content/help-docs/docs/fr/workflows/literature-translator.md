# Literature Translator

## Objectif

Traduire une pièce jointe littéraire (Markdown ou PDF) dans une langue cible spécifiée, produisant un fichier Markdown traduit et des données d'alignement bilingue. Il est fortement recommandé de convertir d'abord les PDF en Markdown à l'aide de [MinerU](#doc/workflows%2Fmineru) pour une qualité de traduction nettement meilleure.

## Entrées

| Paramètre | Requis | Description |
| --- | --- | --- |
| `target_language` | Non | Langue cible (par défaut : `zh-CN`). Supportées : `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Des valeurs personnalisées sont acceptées. |
| `mode` | Non | Mode de traduction : `fast` (par défaut) ou `high_quality` (plus lent). |

Types de pièces jointes acceptés : `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf`.

### Méthodes de déclenchement

- Sélectionner directement une pièce jointe (PDF ou Markdown)
- Sélectionner une notice parente — le plugin trouve automatiquement la première pièce jointe qualifiée
- Une seule pièce jointe par notice parente est traitée
- Les notices avec une traduction existante dans la langue cible sont automatiquement ignorées

## Comportement

1. Résoudre la pièce jointe cible à partir de la sélection (pièce jointe directe ou première pièce jointe qualifiée sous la notice parente).
2. Vérifier si un artefact de traduction existe déjà pour la langue cible ; si oui, ignorer.
3. Soumettre la tâche de traduction au backend Skill-Runner avec le skill `literature-translator`.
4. Le pipeline de traduction exécute plusieurs étapes : analyse d'alignement, exécution de la traduction et vérification QA.
5. Écrire le fichier Markdown traduit dans le même répertoire que la source, nommé `<source-name>_<target-language>.md`, et créer une pièce jointe liée sous la notice parente.

Le workflow est entièrement automatique et ne s'interrompt pas pour l'intervention de l'utilisateur.

## Sortie et application

| Artefact | Description |
|----------|-------------|
| Markdown traduit | Écrit à côté du fichier source sous `<source-name>_<target-language>.md` |
| Pièce jointe liée | Créée sous la notice parente pointant vers le Markdown traduit |
| Données d'alignement | JSON d'alignement bilingue dans l'espace de travail du skill |
| Glossaire | JSON de glossaire extrait dans l'espace de travail du skill |
| Rapport QA | JSON de rapport d'assurance qualité dans l'espace de travail du skill |

## Durée estimée

| Taille du fichier | Temps estimé |
|-----------|---------------|
| Article court (≤10 pages) | 3–5 minutes |
| Standard (10–30 pages) | 5–10 minutes |
| Article long (30+ pages) | 10–18 minutes |

## Recommandation de modèle

Un modèle avec capacité de délégation de sous-agents est recommandé. Le pipeline de traduction comprend des étapes d'analyse d'alignement, d'exécution de traduction et de vérification QA. La délégation de sous-agents permet le traitement parallèle de ces sous-tâches, améliorant significativement l'efficacité et la cohérence de la traduction.

## Dépendances

- **Backend** : Skill-Runner
- **Skill** : `literature-translator`

## Workflows connexes

- [MinerU PDF Parsing](#doc/workflows%2Fmineru) — Convertir d'abord le PDF en Markdown pour une meilleure qualité de traduction
- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Générer un résumé de littérature et des artefacts d'analyse
