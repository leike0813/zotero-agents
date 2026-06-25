# Creazione della Sintesi di Argomento

## Cos'è la Sintesi di Argomento?

La Sintesi di Argomento è il processo di analisi e sintesi sistematica di un gruppo di letteratura correlata. Estrae automaticamente le informazioni chiave, identifica le strutture degli argomenti e genera report di analisi completi tramite workflow AI.

## Superficie Topics

Nella pagina Synthesis Workbench → Topics, è possibile sfogliare e gestire tutti gli argomenti creati. La superficie Topics supporta **tre modalità di visualizzazione**:

| Vista | Descrizione | Caso d'uso |
|-------|-------------|------------|
| **Vista Grafo** | Grafo forza-diretto con argomenti come nodi e relazioni come archi | Comprendere intuitivamente le associazioni inter-argomento |
| **Vista Griglia** | Card con titolo, numero di articoli, riassunto e pulsanti azione | Sfogliare e trovare argomenti |
| **Vista Elenco** | Vista tabellare con colonne: nome, numero di articoli, data di creazione, data di aggiornamento, stato | Ordinamento e operazioni in batch |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/topic-graph.webp" alt="Vista Grafo degli Argomenti di Synthesis" title="Vista Grafo degli Argomenti di Synthesis" loading="lazy" /><figcaption>Vista Grafo degli Argomenti di Synthesis</figcaption></figure>

### Operazioni di gestione degli argomenti

- **Ricerca**: Cercare per nome e descrizione dell'argomento
- **Ordinamento**: Ordinare per titolo, numero di articoli o data di aggiornamento
- **Crea nuovo argomento**: Fare clic sul pulsante di creazione per avviare la pipeline del workflow
- **Aggiorna argomento**: Rieseguire la pipeline per aggiornare l'analisi dell'argomento
- **Elimina argomento**: Rimuovere gli argomenti che non sono più necessari

## Processo di creazione

La creazione degli argomenti è guidata da workflow ed è una pipeline automatizzata multi-step:

```
1. create-topic-prepare
   → Raccogliere dati di letteratura, costruire il set di articoli
   
2. topic-synthesis-core-enrichment
   → Arricchimento centrale: estrarre informazioni, associare conoscenze
   
3. topic-synthesis-finalize
   → Generare gli artifact di analisi finali e i report

(update-topic-synthesis-prepare viene utilizzato per aggiornare gli argomenti esistenti)
```

### Prerequisiti

- Backend [Skill-Runner](#doc/backends%2Fskill-runner) configurato
- Articoli pertinenti nella libreria
- Gli articoli hanno generato riassunti e analisi delle citazioni (opzionale, consigliato)

Questa pipeline è orchestrata dal workflow [Creazione Sintesi di Argomento](#doc/workflows%2Ftopic-synthesis).

## Inspector degli Argomenti

Dopo aver creato un argomento, fare clic su di esso per accedere all'Inspector degli Argomenti. Si tratta di un lettore multi-pagina contenente 8 sotto-pagine, ognuna delle quali presenta una diversa dimensione dell'argomento.

### Panoramica

- Nome dell'argomento, descrizione, punteggio di importanza
- Riepilogo delle affermazioni principali
- Statistiche (numero di articoli, numero di categorie, numero di affermazioni, ecc.)
- Informazioni sulla posizione associata nel Grafo degli Argomenti

### Tassonomia

Mostra la struttura di classificazione gerarchica dell'argomento:

- Argomenti più ampi: Aree di argomento più ampie
- Argomenti più stretti: Sotto-argomenti più specifici
- Argomenti correlati: Altri argomenti associati
- Posizione e gerarchia nel Grafo degli Argomenti

### Affermazioni

Affermazioni principali e asserzioni estratte dalla letteratura:

- Ogni affermazione include le citazioni di evidenza originali
- Indica gli articoli da cui originano le affermazioni
- Tipo di affermazione (risultati / ipotesi / conclusioni, ecc.)
- Numero di articoli a sostegno dell'affermazione

### Confronto

Confronto dei punti di vista tra diversi articoli sullo stesso argomento:

- Dimensioni di confronto (metodi, conclusioni, dataset, ecc.)
- Posizione e argomentazioni di ciascun articolo
- Visualizzazione di consenso e divergenza

### Direzioni future

Lacune nella ricerca e direzioni future identificate attraverso l'analisi della letteratura:

- Domande aperte
- Potenziali direzioni di ricerca
- Sfide e raccomandazioni correlate

### Copertura

Analizza il grado in cui l'argomento copre la letteratura pertinente:

- Elenco degli articoli coperti dall'argomento
- Completezza degli articoli (esistenza di artifact riassunto/analisi delle citazioni)
- Aspetti coperti e aspetti non coperti

### Riferimenti

Tutti i riferimenti associati all'argomento, inclusi i dettagli di associazione:

- Link all'elemento Zotero per ogni citazione
- Ruolo della citazione nell'argomento (supporto / contrasto / sfondo)
- Sorgente e contesto della citazione

### Report (Report completo)

Il report di analisi di sintesi strutturata generato (in formato Markdown):

- Testo completo dell'analisi dell'argomento
- Può essere esportato come Markdown o HTML autonomo
- Adatto per l'uso come materiale di riferimento nella scrittura accademica

## Grafo degli Argomenti

Il Grafo degli Argomenti è una rete gerarchica di argomenti che mostra le relazioni tra gli argomenti:

### Tipi di nodo

| Tipo | Descrizione |
|------|-------------|
| **materialized** | Argomenti strutturati che sono stati effettivamente creati |
| **placeholder** | Segnaposto di argomenti la cui esistenza è stata inferita ma non ancora creati |

### Stato degli archi

| Stato | Descrizione |
|-------|-------------|
| `suggested` | Relazioni suggerite dal sistema (in attesa di revisione) |
| `confirmed` | Relazioni confermate dall'utente |
| `rejected` | Relazioni rifiutate dall'utente |
| `stale` | Dati obsoleti, in attesa di rivalutazione |
| `deleted` | Relazioni eliminate |

### Tipi di relazione

| Relazione | Descrizione |
|-----------|-------------|
| `broader_than` | A è un argomento più ampio di B |
| `related_to` | Due argomenti sono correlati |
| `overlaps_with` | Due argomenti si sovrappongono |
| `contrasts_with` | Due argomenti sono in contrasto tra loro |

### Gestione degli argomenti

- **Crea nuovo argomento**: Fare clic su "Crea" nella pagina degli Argomenti
- **Modifica argomento**: Modificare nome, descrizione, importanza, ecc.
- **Associa articoli**: Aggiungere o rimuovere articoli da un argomento
- **Sfoglia il Grafo degli Argomenti**: Visualizzare la rete di relazioni tra gli argomenti

## Workflow correlati

- [Creazione Sintesi di Argomento](#doc/workflows%2Ftopic-synthesis) — Dettagli del workflow per la creazione degli argomenti
- [Manuscript Literature Framing](#doc/workflows%2Fmanuscript-literature-framing) — Scrivere articoli basati sull'analisi degli argomenti
