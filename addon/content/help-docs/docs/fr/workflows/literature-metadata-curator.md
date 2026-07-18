# Literature Metadata Curator

## Objectif

Interroger, corriger et compléter les métadonnées bibliographiques pour une notice parente Zotero sélectionnée. Le workflow traite des cas tels que la casse incohérente des titres, les auteurs manquants, les champs incomplets de revue/volume/page, les entrées DOI/ISBN incomplètes et les types de notice incorrectement définis.

## Entrées

| Paramètre | Requis | Description |
| --- | --- | --- |
| Ignorer la voie rapide par identifiant | Non (désactivé par défaut) | Contourner la recherche d’identifiant Zotero et exécuter directement `literature-metadata-search`. |

Sélectionnez exactement une notice parente dans la liste des éléments Zotero. Les pièces jointes et les notices multiples ne sont pas acceptées.

## Comportement

Le workflow s'exécute entièrement automatiquement sans confirmation de l'utilisateur. Il utilise les voies suivantes :

1. **Chemin rapide local (par défaut)** : Si la notice a un DOI, un ISBN ou une URL qui se résout de manière déterministe vers un identifiant DOI, arXiv ou PubMed, le workflow appelle `runtime.hostApi.metadata.translateIdentifier` (une façade contrôlée en lecture seule Zotero `Translate.Search`). Lorsque l'identifiant candidat correspond et contient des informations bibliographiques précieuses, les résultats sont écrits directement.
2. **Recherche Agent forcée** : Lorsque **Ignorer la voie rapide par identifiant** est activé, la recherche locale est contournée et `literature-metadata-search` est exécuté directement. L’identifiant reste disponible comme contexte de recherche.
3. **Repli Skill-Runner** : Lorsque l’option est désactivée, une recherche locale infructueuse ou non fiable exécute également le même skill pour rechercher les métadonnées sur le web.

Toutes les voies partagent le même résultat canonique et le même gestionnaire d’application. Si une notice possède déjà un DOI, un ISBN ou un autre identifiant pris en charge mais que l’exécution par défaut renvoie des métadonnées incorrectes, activez l’option pour forcer la recherche Agent. Les exigences de correspondance et de preuve restent inchangées.

### Règles d'écriture

Le workflow met à jour les champs bibliographiques de la notice parente :

- Titre, DOI, ISBN, ISSN, URL, résumé, date, langue, catalogue de bibliothèque
- Champs de revue/conférence/livre/thèse/rapport (nom de revue, volume/numéro/pages, éditeur, nom de conférence, école, type de rapport, etc.)
- Créateurs (auteurs, auteurs institutionnels, etc.)
- `itemType` lorsqu'il est supporté par des preuves de haute confiance (par exemple, article de revue corrigé en thèse)

Pour un travail publié à l’origine en chinois, l’Agent n’écrit les noms d’auteurs en caractères chinois que lorsqu’une source autorisée confirme la liste complète. Il ne remplace pas les auteurs par du pinyin, des traductions ou des caractères chinois supposés ; sans liste complète vérifiée, les auteurs existants sont conservés.

Le workflow ne modifie **pas** les pièces jointes, notes, balises, collections, notices liées, fichiers PDF ou instantanés web.

Sans identifiant stable, le workflow ne remplace un titre existant ou ne change le type de notice que lorsque : le candidat peut être prouvé comme étant la même œuvre directe, au moins deux signaux bibliographiques indépendants concordent et une page d'accueil autorisée corrobore. Les titres de conteneur sont écrits dans le champ de conteneur approprié plutôt que de remplacer le titre de l'œuvre. Les résultats de faible confiance, les candidats conflictuels ou les résultats seulement suspects sont ignorés.

## Sortie et application

Les modifications de métadonnées sont appliquées directement à la notice parente Zotero sélectionnée. Aucune étape de confirmation intermédiaire n'est requise.

## Recommandation de modèle

- **Chemin rapide réussi** (identifiant pris en charge présent et option désactivée) : Aucun modèle backend nécessaire.
- **Option activée ou repli sur `literature-metadata-search`** : Un modèle avec capacité de recherche web est recommandé. La tâche est une récupération légère et une vérification de preuves — elle ne nécessite pas de capacité d'écriture longue, mais doit distinguer les homonymes, les versions prépublication vs. publiées, les articles vs. les thèses et les différentes éditions.

## Dépendances

- **Backend** : Skill-Runner (pour repli après échec de recherche locale)
- **Skill** : `literature-metadata-search`
- **Zotero Host API** : `metadata.translateIdentifier` (chemin rapide contrôlé en lecture seule)
- **Apply Handler** : `handlers.parent.updateMetadata`

## Workflows connexes

- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — Rechercher de la nouvelle littérature et l'ingérer dans Zotero
- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Générer un résumé et une analyse de citation à partir de PDF/Markdown
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Normaliser les balises une fois les métadonnées complètes
