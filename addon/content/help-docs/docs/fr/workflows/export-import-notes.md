# Export/Import Notes

## Objectif

Exporter et importer les trois types de notes structurées générées par `literature-analysis` (résumé, références, analyse de citation), facilitant la migration entre instances Zotero.

:::info Édition des Résultats d'Analyse
Les notes générées par [Literature Analysis](#doc/workflows%2Fliterature-analysis) sont **rendues** à partir des données du backend ; modifier directement le contenu des notes ne changera pas les données du backend. Si vous avez besoin de modifier les résultats d'analyse, la bonne approche est : **Exporter les Notes** → modifier les fichiers exportés → utiliser **Importer les Notes** pour réimporter.
:::

## export-notes (Exporter les Notes)

### Cas d'Usage

- Partager les résultats d'analyse littéraire avec des collaborateurs
- Importer les résultats d'analyse dans une autre instance Zotero
- Sauvegarder les artefacts d'analyse littéraire

### Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | Notice parente |
| Méthode de Sélection | Prend en charge la sélection mixte de notices parentes et de trois types de notes |
| Comportement Multi-sélection | Une seule boîte de dialogue de sélection de répertoire d'exportation est affichée pour la multi-sélection |

### Artefacts Exportés

| Fichier | Description |
|------|------|
| `digest.md` | Markdown du résumé littéraire |
| `references.json` | JSON de la liste de références |
| `citation_analysis.json` | JSON des données d'analyse de citation |
| `citation_analysis.md` | Markdown du rapport d'analyse de citation |
| `representative_image.jpg` | Image représentative (lorsque la note résumé contient une image embarquée) |

L'image représentative est insérée dans `digest.md` sous forme de bloc de commentaire Markdown `zs:representative-image:v1`, référencée à l'aide d'un chemin relatif au même répertoire. L'échec de l'exportation de l'image ne bloque pas l'exportation des artefacts texte et JSON.

## Durée Estimée

Terminé en quelques secondes (opérations sur fichiers purement locales, aucun backend requis).

## import-notes (Importer les Notes)

### Cas d'Usage

- Restaurer les résultats d'analyse littéraire dans une autre instance Zotero
- Importer les artefacts d'analyse partagés par des collaborateurs

### Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | Notice parente unique |
| Méthode d'Import | Sélectionner un répertoire contenant les artefacts exportés |

### Flux d'Import

```
1. Sélectionner le Répertoire d'Import
   └── Le répertoire doit contenir digest.md, references.json, citation_analysis.json

2. Validation de la Structure
   └── references.json et citation_analysis.json subissent une validation de structure avant de devenir candidats
       └── L'échec de la validation affiche un avertissement mais ne bloque pas l'import d'autres artefacts

3. Analyse de l'Image
   └── Si digest.md contient un bloc marqueur zs:representative-image:v1
       └── Analyser automatiquement l'image représentative depuis le même répertoire
       └── L'utilisateur peut également sélectionner ou effacer manuellement l'image représentative

4. Écriture
   └── Créer/mettre à jour les notes correspondantes sous la notice parente
```

L'échec de l'import de l'image ne bloque pas l'import de la note résumé.

## Dépendances

- Aucune connexion backend requise
- Repose uniquement sur le stockage local de Zotero

## Workflows Associés

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Générer les trois types de notes exportables
