# Centre de révision

La surface Review est l'endroit centralisé pour traiter tous les éléments en attente de révision dans le système Synthesis. Elle contient trois sous-onglets : **Correspondances de citations**, **Concepts** et **Graphe de sujets**.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/review.webp" alt="Synthesis Review Hub" title="Synthesis Review Hub" loading="lazy" /><figcaption>Synthesis Review Hub</figcaption></figure>

## Révision des correspondances de citations

Lorsque le système fait automatiquement correspondre des références à des notices Zotero, les correspondances qui ne peuvent pas être déterminées avec certitude sont soumises sous forme de propositions à la file de révision.

### État des propositions de correspondance

| État | Description |
|--------|-------------|
| **Pending** | Candidat de correspondance généré par le système, en attente de confirmation ou de rejet par l'utilisateur |
| **Accepted** | L'utilisateur a confirmé la liaison ; la référence est maintenant liée à une notice Zotero |
| **Rejected** | L'utilisateur a rejeté la liaison |
| **Reopened** | Une proposition précédemment traitée, rouverte pour révision |

### Actions disponibles

- **Accepter** : Confirmer la relation de liaison citation-notice
- **Rejeter** : Décliner la proposition de correspondance
- **Opérations groupées** : Sélectionner plusieurs propositions pour les accepter ou les rejeter en lot

### Confiance de correspondance

Voir [Index et graphe de citations](#doc/synthesis%2Findex-and-citation) pour les descriptions des niveaux de confiance. Les correspondances déterministes et à haute confiance sont généralement traitées automatiquement ; les correspondances à confiance moyenne et inférieure entrent dans la file de révision.

### Filtrage et tri

Vous pouvez filtrer la liste des propositions par :

- État de correspondance (pending / accepted / rejected)
- Stratégie de correspondance (DOI / titre / auteur, etc.)
- Niveau de confiance
- Tri par date ou par pertinence

## Révision des concepts

L'expansion automatique de la base de connaissances conceptuelle peut produire des suggestions de correspondance de concepts à faible confiance, nécessitant une révision et une confirmation par l'utilisateur.

### Cibles de révision

- **Suggestions de nouveaux concepts** : Candidats de nouveaux concepts automatiquement extraits de la littérature
- **Confirmation de sens** : Confirmation lorsqu'un nouveau sens est ajouté à un concept existant
- **Suggestions d'alias** : Confirmation lorsqu'un nom alternatif pour le même concept est détecté

### Comment opérer

Chaque suggestion affiche le nom du concept, la source d'extraction, le niveau de confiance et les preuves à l'appui. Vous pouvez :

- **Accepter** : Confirmer la suggestion et l'écrire dans la base de connaissances
- **Rejeter** : Ignorer la suggestion
- **Voir le contexte** : Voir où le concept apparaît dans la littérature

## Révision du graphe de sujets

Lorsque le système détecte des relations potentielles entre des sujets, il génère des propositions de relations pour révision.

### Types de relations

| Relation | Description |
|--------------|-------------|
| `broader_than` | A est un sujet plus large que B |
| `related_to` | Deux sujets sont liés |
| `overlaps_with` | Deux sujets ont un chevauchement de contenu |
| `contrasts_with` | Deux sujets se contrastent mutuellement |

### Contenu des propositions

Chaque proposition affiche :

- **Noms et descriptions** des sujets source et cible
- **Type de relation suggéré**
- **Confiance** (basée sur l'analyse sémantique du contenu des sujets)
- **Preuves à l'appui** (articles co-couverts, etc.)

### Comment opérer

- **Accepter** : Confirmer la relation et l'écrire dans le graphe de sujets
- **Rejeter** : Ignorer la suggestion de relation
- **Rouvrir** : Rouvrir une proposition précédemment traitée pour révision

## Prochaines étapes

- [Base de connaissances conceptuelle](#doc/synthesis%2Fconcepts) — Gérer les concepts, sens et alias
- [Sujets](#doc/synthesis%2Ftopic-synthesis) — Gérer les synthèses de sujets
