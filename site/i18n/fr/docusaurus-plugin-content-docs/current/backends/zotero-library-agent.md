# Zotero Library Agent

## Vue d'ensemble

Zotero Library Agent est la surface de tâches limitée et à la demande du [Host Bridge](host-bridge). Il permet aux agents IA d'opérer sur une bibliothèque Zotero pour des requêtes finies — inspecter des notices, récupérer du contexte, lire des données de littérature et de synthèse, exécuter des workflows, appliquer des mutations approuvées, transférer des fichiers et transmettre des preuves — sans devenir un service de maintenance de bibliothèque résident.

Le Host Bridge expose trois surfaces, chacune ayant un rôle différent :

| Surface | Rôle | Quand l'utiliser |
|---------|------|------------------|
| **CLI Bundle** (`zotero-bridge`) | Installation, connexion et contrats de commandes de bas niveau | Accès CLI direct aux capacités du Host Bridge nécessaire |
| **Library Agent** | Routage de tâches limitées, transmission de preuves et résultats auditables | Requête finie nécessitant un routage d'intention et une preuve de complétion |
| **Librarian Profile** (Hermes) | Index résident, maintenance planifiée et service continu de bibliothèque | Indexation locale persistante, tâches cron ou surveillance continue nécessaire |

## Ce que fournit le Library Agent

- **Routage de tâches** : Achemine l'intention actuelle vers la plus petite famille de commandes correspondante sans nécessiter un balayage complet de la table de commandes.
- **Références de journey** : Sept manuels de journey détaillés couvrent des catégories de tâches spécifiques, chacun spécifiant les branches, les cas limites, les exigences de preuve, les limites d'approbation et les chemins de récupération.
- **Transmission de preuves** : Paquets de preuves portables avec validation de forme déterministe et calcul de digest d'artefacts.
- **Limites d'autorité** : Impose que le Host Bridge soit le seul chemin de contrôle, empêchant l'accès direct au stockage Zotero ou le comportement de service en arrière-plan.
- **Opérations limitées** : Chaque tâche est terminée lorsque le résultat demandé et sa preuve sont observables — un accusé de soumission ou une transmission préparée ne constitue pas en soi une complétion.

## Flux de tâches limité

1. **Confirmer la connexion** : Vérifier la CLI chargée et le profil Host Bridge. Exécuter `zotero-bridge surface identity --json` pour comparer avec le manifeste empaqueté et confirmer le `releaseSetId` du dépôt.
2. **Router l'intention** : Lire la référence de routage de tâches pour choisir la plus petite famille de commandes satisfaisant la requête.
3. **Charger le journey correspondant** : Lire exactement un manuel de journey correspondant à la catégorie de tâche.
4. **Préserver les preuves** : Conserver les faits Host actuels, les handles retournés, les artefacts locaux et l'état d'approbation comme preuves distinctes.
5. **Exécuter ou soumettre** : Pour les workflows, suivre la référence d'exécution de workflow ; ne jamais envoyer d'options de workflow via un mode d'exécution qui ne les accepte pas.
6. **Construire et valider** : Construire le paquet de preuves final et le valider avec l'assistant fourni.

La tâche n'est terminée que lorsque le résultat demandé et sa preuve sont observables.

## Catégories de journey

Le Library Agent comprend sept manuels de journey, chacun couvrant un domaine de tâche spécifique :

| Journey | Portée |
|---------|--------|
| **Contexte actuel et lecture de bibliothèque** | Sélection déictique, recherche versus liste, détail de notice, notes et preuves d'attachments |
| **Notes, attachments et préparation** | Morceaux de notes et payloads, annotations, préparation PDF/Markdown/analyse et attachments générés |
| **Contexte de recherche de synthèse** | Sujets, vues de graphe de citations, index, résolveurs, artefacts, schémas et files d'attention |
| **Workflow propriété du Host** | Description de workflow, exigences, validation, soumission, surveillance, permissions, interaction et preuves Product |
| **Transmission propriété de l'Agent** | Exécution de bundle agent-run, validation de résultats, apply-back et récupération de reçus |
| **Écriture concrète** | Mutations prévisualisées, commandes d'écriture sémantique, approbation et vérification en direct |
| **Products et fichiers** | Chemins locaux, fichiers enregistrés, Products du Dashboard, téléchargements et livraison d'attachments |

Chaque journey renvoie aux cartes de commandes CLI `zotero-bridge` fournies lorsque des champs exacts de payload ou de résultat sont nécessaires.

## Limites d'autorité et de sécurité

Le Library Agent impose des limites strictes pour prévenir les mutations involontaires de Zotero :

- **Host Bridge uniquement** : Traiter le Host Bridge comme le seul chemin de contrôle Zotero et Zotero Agents. Ne pas lire ni écrire directement les bases de données Zotero, les répertoires de stockage, les internes du plugin ou l'état du navigateur.
- **Travail limité** : Ne pas transformer le Library Agent en service de bibliothèque en arrière-plan. Effectuer un travail limité pour la requête actuelle et rendre le contrôle lorsque le résultat ou la décision utilisateur requise est disponible.
- **Pas d'écritures non surveillées** : Ne pas effectuer d'écritures planifiées ou non surveillées. Une requête utilisateur actuelle et l'approbation du Host Bridge régissent chaque mutation ou apply-back.
- **Pas de suppositions obsolètes** : Ne pas traiter les entrées de cache, les références générées ou les paquets de preuves comme la vérité Zotero en direct ; confirmer les faits actuels via le Host Bridge lorsque la fraîcheur importe.

## Transmission de preuves

Le Library Agent produit des paquets de preuves portables pour la continuité des tâches. Un paquet de preuves contient :

- **Statut** : `completed`, `canceled` ou `failed`
- **Résumé** : Constatations concises locales à la tâche
- **Fichier de preuve** (optionnel) : Un paquet de preuves construit et validé par l'assistant, consommable par un autre agent ou une autre tâche
- **Diagnostics** (optionnel) : Informations de diagnostic structurées

Construire et valider un paquet de preuves avec l'assistant fourni :

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

L'assistant valide la forme déterministe, calcule les digests d'artefacts et inspecte les bundles de workflow. L'agent reste responsable du choix des commandes, de l'interprétation, de la suffisance des preuves et de l'autorisation d'une action examinée.

## Gestion des erreurs

- Préserver les codes d'erreur structurés et les champs de handle lors du signalement d'une erreur.
- Redécouvrir une commande ou un objet uniquement lorsque l'erreur indique une syntaxe ou une identité obsolète ; ne pas deviner des handles alternatifs.
- Lorsqu'une opération retourne un handle de fichier ou un chemin de sortie, vérifier le fichier déclaré avant de l'utiliser comme entrée de preuve ou d'apply-back.
- Lorsque l'autorité, l'entrée ou l'intention utilisateur requise est manquante, s'arrêter à la limite et indiquer la décision manquante exacte.

## Intégration

Le Library Agent dépend du Host Bridge pour tout accès à Zotero. Avant d'utiliser le Library Agent :

1. S'assurer que le Host Bridge est en cours d'exécution (Zotero → Paramètres → Zotero Agents → Host Bridge → **Démarrer / Afficher le point de terminaison**).
2. Installer la CLI `zotero-bridge` (utiliser le bouton **Installer la CLI** dans le panneau de préférences du Host Bridge).
3. Configurer le profil de connexion avec l'URL du point de terminaison et le jeton Bearer. Voir [Configuration du Host Bridge](host-bridge) pour la configuration détaillée.

## Prochaines étapes

- [Host Bridge](host-bridge) — référence complète de la CLI `zotero-bridge` et des capacités du Host Bridge
- [Hermes Profiles](hermes-profiles) — service de bibliothèque résident avec indexation locale et maintenance planifiée
- [Workflows](../workflows) — aperçu de tous les workflows intégrés et personnalisés
- [MCP Server](mcp-server) — interface de protocole alternative pour les clients compatibles MCP
