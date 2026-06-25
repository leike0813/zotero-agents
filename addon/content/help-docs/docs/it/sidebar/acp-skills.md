# ACP Skills

La scheda ACP Skills viene utilizzata per monitorare e gestire le esecuzioni degli skill effettuate tramite il backend ACP. A differenza della conversazione continua di ACP Chat, ACP Skills è progettato per attività skill eseguite una tantum o periodicamente.

## Panoramica dell'interfaccia

Il pannello ACP Skills è suddiviso nelle seguenti aree principali:

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/acp-skills.webp" alt="Pannello ACP Skills" title="Pannello ACP Skills" loading="lazy" /><figcaption>Pannello ACP Skills</figcaption></figure>

```
┌─────────────────────────────────────┐
│  Banner: Titolo attività / Stato / Backend   │
├─────────────────────────────────────┤
│  ← Run Drawer  │  Area contenuti principale  │  Details → │
│               │  Transcript View            │
│  Running      │  Plan Component             │
│  └─ backend1  │  Prompt Component           │
│     ├─ run A  │  Reply Area                 │
│     └─ run B  │                             │
│  Completed    │                             │
│  └─ backend1  │                             │
│     └─ run C  │                             │
└─────────────────────────────────────┘
```

## Banner

L'area Banner mostra le meta-informazioni e i pulsanti azione per l'esecuzione attualmente selezionata:

- **Titolo attività**: Il nome dello skill dell'esecuzione
- **Stato**: Indicatore di stato dell'esecuzione (in esecuzione / completata / fallita / annullata, ecc.)
- **Backend**: Il backend ACP che sta eseguendo l'esecuzione
- **Pulsanti azione**: Connetti/Disconnetti, Annulla attività

## Run Drawer (sinistra)

Il drawer sinistro organizza tutte le esecuzioni ACP Skill in una struttura ad albero:

### Raggruppamento

| Gruppo | Descrizione |
|--------|-------------|
| **Running** | Attività attualmente in esecuzione, raggruppate per backend |
| **Completed** | Attività terminate, raggruppate per backend |

Ogni voce di attività mostra informazioni riassuntive (ID skill, stato, ora) e dispone di un indicatore di attenzione (LED) per segnalare i cambiamenti di stato. Fare clic su una voce di attività per passare alla vista dettagliata di quell'esecuzione.

### Archiviazione

Le attività completate possono essere rimosse dall'elenco tramite il pulsante di archiviazione (l'archiviazione le nasconde solo nella sessione corrente e non influisce sui record di esecuzione).

## Area contenuti principale

### Transcript View

Dopo aver selezionato un'esecuzione, l'area contenuti principale mostra il transcript completo di quell'esecuzione, tra cui:

- **Messaggi**: Contenuto del dialogo tra assistente e utente
- **Chiamate agli strumenti**: Strumenti invocati dall'AI e relativi risultati, con nome dello strumento, riepilogo dell'input e LED di stato
- **Processo di pensiero**: Il processo di ragionamento dell'AI (se disponibile)
- **Eventi di stato**: Cambiamenti di stato durante l'esecuzione

Il transcript supporta la **modalità Plain** (messaggi colorati per ruolo sul bordo sinistro) e la **modalità Bubble** (messaggi in stile bolla, chiamate consecutive agli strumenti compresse automaticamente in gruppi), commutabile tramite il pulsante nell'angolo in alto a destra.

### Plan Component

Quando un'esecuzione include un piano multi-step, il componente plan mostra l'avanzamento corrente, i passaggi completati e quelli in sospeso, con ogni passaggio dotato di un'icona di stato (in corso/completato/fallito).

### Prompt Component

Il componente prompt mostra diversi prompt interattivi in base allo stato dell'esecuzione:

| Stato | Contenuto mostrato |
|-------|--------------------|
| `waiting_user` | Prompt in attesa della risposta dell'utente, con descrizione del contesto e opzioni di risposta rapida |
| `permission` | Prompt di richiesta autorizzazione, con anteprima del comando e pulsanti approva/rifiuta |
| `disconnected` | Prompt di riconnessione; fare clic per connettere |
| `running` | Indicatore di avanzamento |
| `completed` | Conferma dello stato di completamento |
| `error` | Informazioni sull'errore e suggerimenti per la risoluzione |

### Reply Area

L'area di risposta in basso contiene:

- **Casella di input testo**: Inserire il contenuto della risposta
- **Selezione modalità** (opzionale): Commutazione della modalità di esecuzione
- **Selezione modello** (opzionale): Commutazione del modello AI
- **Reasoning Effort** (opzionale): Livello di sforzo di ragionamento
- **Pulsante Invia/Annulla**
- **Misuratore di utilizzo**: Grafico circolare che mostra l'utilizzo dei token (usati/limite)
- **Suggerimento scorciatoia da tastiera**: Scorciatoia da tastiera per inviare risposte

Le bozze di risposta vengono salvate per richiesta — passando da un'esecuzione all'altra e tornando indietro, il contenuto non inviato viene preservato.

## Drawer dei dettagli (destra)

Il drawer destro mostra informazioni dettagliate sull'esecuzione selezionata, con le seguenti aree comprimibili:

| Area | Contenuto |
|------|-----------|
| **Percorso esecuzione** | Directory del workspace, percorsi dei file di risultato |
| **Info Runner** | backend, agent, mode, model, reasoning, skill, session |
| **Info validazione** | Stato della validazione, numero di correzioni, dettagli degli errori |
| **Dipendenze runtime** | Elenco delle dipendenze dell'ambiente di esecuzione |
| **Revisione output** | Cronologia delle revisioni dell'output |
| **Log runtime** | Voci di log durante l'esecuzione |
| **Risultato JSON** | Output strutturato finale (espandibile) |

## Gestione delle autorizzazioni

Quando un'esecuzione richiede permessi di scrittura su Zotero o autorizzazioni per le chiamate agli strumenti ACP, il componente prompt mostra una richiesta di autorizzazione:

- **Anteprima del comando**: Mostra l'operazione richiesta
- **Info origine**: Chi ha avviato la richiesta
- **Pulsanti azione**: Approva / Rifiuta
- Espandere per visualizzare i dettagli completi della richiesta

## Configurazione correlata

Il pannello ACP Skills richiede che un [backend ACP](#doc/backends%2Facp) sia configurato prima dell'uso.
