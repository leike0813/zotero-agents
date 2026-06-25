# Invocazione e configurazione dei Workflow

## Metodi di invocazione

![Pulsante della barra degli strumenti Esegui Workflow](/img/icon_play.png)

### Tramite menu contestuale

1. Seleziona uno o più elementi nell'elenco degli elementi di Zotero
2. Fai clic con il tasto destro e seleziona il sottomenu **Zotero Agents**
3. Scegli un Workflow dall'elenco
4. Se appare una finestra di configurazione, compila i parametri e fai clic su Esegui

### Tramite Dashboard

1. Apri la **Dashboard** (pulsante della barra degli strumenti o menu)
2. Trova il Workflow desiderato nell'elenco dei Workflow della pagina Home
3. Fai clic sul pulsante **Esegui**
4. Se appare una finestra di configurazione, compila i parametri e invia

## Finestra di configurazione del Workflow

Prima di eseguire un Workflow, può apparire una finestra di configurazione con le seguenti opzioni:

### Impostazioni dei parametri

Mostra tutti i parametri configurabili dichiarati dal Workflow, che variano a seconda della definizione del Workflow.

### Opzioni del provider

| Opzione | Descrizione |
|---------|-------------|
| Selezione del backend | Scegli l'istanza del backend per eseguire questo Workflow |
| Selezione del modello | Il modello AI da utilizzare (fornito dal backend) |
| Impostazioni della modalità | Configurazione della modalità di esecuzione |
| Intensità del ragionamento | Livello di intensità del ragionamento (se supportato dal backend) |

### Modalità di esecuzione

| Modalità | Descrizione |
|----------|-------------|
| `auto` | Esecuzione automatica, non richiede intervento dell'utente |
| `sync` | Esecuzione sincrona, attende i risultati |
| `async` | Esecuzione asincrona, viene eseguita in background |

### Modalità SkillRunner

Per i backend Skill-Runner:

| Modalità | Descrizione |
|----------|-------------|
| `auto` | Esecuzione non interattiva, adatta a skill che non richiedono input dell'utente |
| `interactive` | Esecuzione interattiva, può richiedere input dell'utente durante l'esecuzione |

## Esecuzione e monitoraggio

- Dopo aver inviato un'attività, puoi visualizzare lo stato di avanzamento nella Dashboard
- Aggiornamenti di stato in tempo reale (in coda → in esecuzione → riuscito/fallito/annullato)
- Per i Workflow interattivi, puoi rispondere alle attività in attesa di input nella barra laterale
- Una volta completata l'esecuzione, i risultati vengono applicati a Zotero tramite gli script hook

## Note

- L'esecuzione di un Workflow per la prima volta potrebbe richiedere la configurazione del backend
- Alcuni Workflow potrebbero avere requisiti di input specifici (es. è necessario selezionare allegati)
- I Workflow interattivi richiedono che Zotero rimanga in esecuzione per gestire l'input dell'utente
