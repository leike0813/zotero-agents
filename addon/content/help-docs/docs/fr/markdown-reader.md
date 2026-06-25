# Lecteur Markdown intégré

## Aperçu

Le plugin inclut un lecteur Markdown léger. Lorsque vous **double-cliquez sur n'importe quelle pièce jointe `.md`** dans Zotero, elle s'ouvre automatiquement dans le lecteur intégré, éliminant le besoin de basculer vers une application externe.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/markdown-reader.webp" alt="Page du lecteur Markdown intégré" title="Page du lecteur Markdown intégré" loading="lazy" /><figcaption>Page du lecteur Markdown intégré</figcaption></figure>

Le lecteur est activé par défaut. Pour le désactiver (revenir à l'ouvreur par défaut du système), décochez l'option dans **Préférences → Général**.

## Fonctionnalités

### Navigation par le plan

La barre latérale gauche analyse automatiquement les niveaux de titres (h1–h4) du document. Cliquez sur n'importe quel titre pour accéder rapidement à la section correspondante.

### Recherche en texte intégral

La zone de recherche dans la barre d'outils prend en charge la recherche par mots-clés avec mise en surbrillance des résultats.

### Rendu Markdown

- **Blocs de code** : coloration syntaxique highlight.js pour les principaux langages de programmation
- **Formules mathématiques** : rendu KaTeX pour les formules LaTeX, prenant en charge l'affichage en ligne et en bloc
- **Tableaux, listes, blocs de citation** : prise en charge complète de la syntaxe Markdown standard
- **Images** : les images avec des chemins relatifs sont chargées automatiquement

### Taille de police et largeur

- **Ajustement de la taille de police** : ajustable de 12px à 24px ; cliquez sur les boutons +/- dans la barre d'outils pour ajuster par incrément
- **Largeur de lecture** : prend en charge les modes étroit (860px) et large (1160px) pour différentes tailles d'écran

### Actions de la barre d'outils

| Bouton | Fonction |
|--------|----------|
| Zone de recherche | Recherche de mots-clés en texte intégral |
| Actualiser | Relire le fichier et effectuer un nouveau rendu |
| Copier Markdown | Copier le contenu Markdown brut dans le presse-papiers |
| Copier le chemin | Copier le chemin du fichier dans le presse-papiers |
| Taille de police - | Diminuer la taille de police |
| Taille de police + | Augmenter la taille de police |
| Bascule de largeur | Basculer entre le mode de lecture étroit et large |
| Retour en haut | Défilement progressif vers le haut du document |
| Ouvrir externement | Ouvrir le fichier avec l'application par défaut du système |

### Thématisation automatique

Le lecteur s'adapte automatiquement au thème clair/sombre de Zotero sans nécessiter de basculement manuel.

## Préférences

Dans **Zotero → Paramètres → Zotero Agents → Général** :

- **Activer le lecteur Markdown intégré** : lorsque cette option est cochée, double-cliquer sur des pièces jointes `.md` les ouvre dans le lecteur intégré ; lorsqu'elle est décochée, l'ouvreur par défaut du système est restauré.

## Notes techniques

- Moteur de rendu : `markdown-it` + KaTeX + highlight.js
- Sécurité : une sanitization HTML intégrée supprime les balises non sûres et les gestionnaires d'événements tels que script/style/iframe
- Types de fichiers pris en charge : `.md`, `.markdown` (détectés à la fois par l'extension du fichier et le type MIME)
