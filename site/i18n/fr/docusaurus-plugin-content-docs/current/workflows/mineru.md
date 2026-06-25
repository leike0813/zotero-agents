# MinerU PDF Parsing

## Objectif

Appeler le service MinerU pour analyser des documents PDF, en extrayant du texte et des images Markdown de haute qualité, produisant des fichiers de notes directement lisibles.

MinerU est un outil d'analyse PDF basé sur l'apprentissage profond qui extrait du texte et des figures de haute qualité d'articles académiques.

## Cas d'Usage

- Convertir de la littérature au format PDF en Markdown éditable
- Préparer des documents en texte brut pour des workflows en aval (par exemple, Literature Analysis, Deep Reading)
- Extraire des images et des tableaux des PDF

## Configuration du Backend MinerU

### 1. Créer un Compte MinerU et Obtenir un Jeton API

1. Visitez [mineru.net](https://mineru.net) pour créer un compte
2. Après connexion, allez à la page **API → Gestion de l'API**
3. Créez ou copiez un Jeton API

### 2. Ajouter un Backend dans le Gestionnaire de Backends

1. Ouvrez **Outils → [Gestionnaire de Backends](../backends/backend-manager)**
2. Basculez vers l'onglet **HTTP Générique**
3. Cliquez sur **Ajouter HTTP Générique**
4. Remplissez les champs suivants :

| Champ | Valeur |
|------|-----|
| Nom d'Affichage | `MinerU Official` (ou tout nom de votre choix) |
| URL de Base | `https://mineru.net` |
| Méthode d'Authentification | `bearer` |
| Jeton d'Authentification | Collez le Jeton API obtenu à l'étape précédente |
| Délai d'Attente | `60000` (60 secondes) |

5. Cliquez sur **Enregistrer** dans le coin inférieur droit

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | Pièce jointe |
| Types Acceptés | `application/pdf` (PDF uniquement) |
| Détection de Conflits | Si un fichier `.md` portant le même nom existe déjà dans le même répertoire, le PDF est ignoré |

### Méthodes de Déclenchement

- Sélectionner directement une ou plusieurs pièces jointes PDF
- Sélectionner la notice parente, et le plugin déploiera automatiquement ses pièces jointes PDF enfants

### Gestion des Conflits

- Vérifie si `<nom du fichier PDF>.md` existe dans le répertoire cible
- S'il existe, l'entrée est ignorée lors du prétraitement
- Si tous les candidats ont des conflits, le workflow ne soumet aucune tâche

## Flux d'Exécution

```
1. Demander l'URL de Téléversement
   └── POST vers l'API MinerU pour obtenir batch_id et upload_url

2. Téléverser le Fichier
   └── Téléversement binaire du fichier PDF

3. Interroger les Résultats
   └── Requêtes répétées jusqu'à ce que le traitement se termine ou échoue
       └── Intervalle : 2 secondes

4. Télécharger les Résultats
   └── Télécharger le bundle (format zip)

5. Matérialisation Locale
   └── Extraire le bundle
       └── Extraire le contenu Markdown
       └── Extraire les images
       └── Réécrire les chemins d'images dans le Markdown en chemins relatifs locaux
       └── Écrire dans le même répertoire que le PDF
```

## Sorties

### 1. Fichier Markdown

- **Emplacement** : Même répertoire que le PDF
- **Nommage** : `<nom du fichier original>.md`
- **Contenu** : Texte Markdown analysé
- **Encodage** : UTF-8

### 2. Répertoire d'Images

- **Emplacement** : Même répertoire que le PDF : `Images_<ItemKey>/`
- **Contenu** : Fichiers d'images extraits du PDF

### 3. Pièce Jointe Liée

- **Type** : Lien vers un fichier local
- **Emplacement** : Sous la notice parente
- **Cible** : Le fichier `.md`

### Logique de Nettoyage

- Si `Images_<ItemKey>/` existe déjà dans le répertoire cible, l'ancien répertoire est supprimé avant l'écriture
- Évite de créer des pièces jointes liées `.md` en double qui existent déjà

## Durée Estimée

| Taille du PDF | Durée Estimée |
|---------|---------|
| Article court (≤15 pages) | 30 secondes - 1 minute |
| Standard (15-40 pages) | 1-2 minutes |
| Article long (40+ pages) | 2-3 minutes |

La durée dépend principalement de la vitesse de traitement du service MinerU.

## Paramètres

Le workflow MinerU n'a pas de paramètres configurables par l'utilisateur.

## Recommandation de Modèle

Aucun modèle LLM requis. Ce workflow appelle uniquement le service MinerU via l'API HTTP.

## Dépendances

- **Backend** : Service MinerU (backend HTTP Générique)
- **Configuration du Backend** : Configurer un backend de type HTTP Générique dans le Gestionnaire de Backends
- **Authentification** : Un Jeton API valide (jeton Bearer) est requis
- **URL du Service MinerU** : `https://mineru.net` ou une autre instance déployée

## Workflows Associés

- [Literature Analysis](literature-analysis) — Générer des résumés et des analyses de citation à partir du Markdown analysé
