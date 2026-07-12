# Collection Collector

## Objectif

Remplir une collection Zotero existante avec de la littérature pertinente déjà présente dans la même bibliothèque. Le workflow interprète une portée de collection en texte libre requise, examine les métadonnées, balises et l'appartenance aux Synthesis Topics actuels, et applique une liste d'appartenance validée.

## Entrées

| Paramètre | Requis | Description |
| --- | --- | --- |
| `collection` | Oui | Collection Zotero existante sélectionnée par chemin. |
| `collectionScope` | Oui | Signification, sujet de recherche ou frontière de littérature représentée par la collection. |

Aucune sélection d'élément Zotero n'est requise.

## Comportement

1. Parcourir par pages tous les éléments réguliers de niveau supérieur dans la bibliothèque de la collection cible.
2. Exclure les éléments déjà présents dans la collection cible.
3. Construire les candidats à partir des correspondances de métadonnées/balises et des Synthesis Topics existants pertinents.
4. Évaluer sémantiquement au plus 250 candidats par lots de 20.
5. Sélectionner les articles avec une pertinence d'au moins `0.65` et conserver la preuve et la raison de chaque décision.
6. Revérifier l'appartenance actuelle et ajouter les éléments restants via workflow apply.

Le workflow est automatique et ne s'interrompt pas pour confirmation. Il ne recherche pas sur le web, n'ingère pas de nouveaux articles, ne modifie pas les balises, ne crée pas de collections et ne mute pas les Synthesis Topics. Un contexte de Topic manquant se dégrade en preuve de métadonnées et de balises.

## Sortie et application

Le résultat d'exécution contient les références d'éléments Zotero sélectionnés, les titres, les valeurs de pertinence, la base de preuve, les IDs de Topic correspondants, les raisons, les mises en garde et les diagnostics de sélection. Une sélection vide est un no-op réussi. Apply valide à nouveau la cible et les références d'éléments et reste idempotent si l'appartenance a changé pendant l'exécution du skill.
