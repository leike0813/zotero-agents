# Configuration du backend Generic HTTP

## Objectif

Le backend Generic HTTP est utilisé pour envoyer des requêtes HTTP brutes à n'importe quelle URL. Il n'exécute pas de skills d'agents mais sert de client HTTP généraliste.

## Cas d'utilisation principal : Analyse de documents MinerU

L'utilisation principale du backend Generic HTTP est de prendre en charge le **workflow MinerU** — un workflow d'analyse de documents PDF.

MinerU est un service d'analyse de documents qui convertit les fichiers PDF au format Markdown. Le workflow MinerU envoie des requêtes au service MinerU via le backend Generic HTTP pour obtenir les résultats d'analyse.

### Configuration de MinerU

1. Visitez [mineru.net](https://mineru.net) pour créer un compte, et obtenez un jeton API depuis la page **API → API Management**
2. Ouvrez **Outils → [Gestionnaire de backends](#doc/backends%2Fbackend-manager)**
3. Basculez sur l'onglet **Generic HTTP**
4. Cliquez sur **Ajouter Generic HTTP**
5. Remplissez :

| Champ | Valeur |
|-------|--------|
| Nom d'affichage | `MinerU Official` |
| URL de base | `https://mineru.net` |
| Authentification | `bearer` |
| Jeton d'authentification | Collez votre jeton API |
| Délai d'attente | `600000` (10 minutes) |

6. Cliquez sur **Enregistrer** dans le coin inférieur droit

## Champs de configuration

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| Nom d'affichage | Oui | Nom d'affichage du backend |
| URL de base | Oui | Adresse de base du service HTTP |
| Bearer Token | Non | Jeton d'authentification |
| Délai d'attente | Non | Délai d'attente de la requête (millisecondes) |

## Détails techniques

Le backend Generic HTTP prend en charge :
- **Requêtes unitaires** : `generic-http.request.v1` — Envoyer une seule requête HTTP
- **Pipelines multi-étapes** : `generic-http.steps.v1` — Requêtes chaînées avec extraction de chemin JSON (expressions `$.*`), extrayant les valeurs des réponses précédentes comme paramètres pour les requêtes suivantes
- **Téléversements multipart** : Prise en charge du téléversement de fichiers
- Des mécanismes de polling et de retry

## Prochaines étapes

- [Découvrir les workflows](#doc/workflows%2Findex) — Les backends Generic HTTP sont principalement utilisés pour des workflows spécifiques
