# Utilizzo di ACP Chat

## Funzionalità

ACP Chat consente di conversare con un backend ACP configurato, con il contesto della conversazione tratto dall'elemento Zotero attualmente in visualizzazione o dall'articolo nel lettore.

## Casi d'uso

- **Domande sulla letteratura**: Porre domande sull'articolo che si sta leggendo, ottenere spiegazioni e riassunti
- **Assistenza nella scrittura**: Ottenere suggerimenti durante il processo di scrittura
- **Ricerca rapida**: Recuperare rapidamente informazioni chiave su un articolo specifico
- **Elaborazione in batch**: Eseguire analisi in batch su più elementi in un elenco di letteratura

## Layout dell'interfaccia

Il pannello ACP Chat contiene le seguenti aree:

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/acp-chat.webp" alt="Pannello ACP Chat" title="Pannello ACP Chat" loading="lazy" /><figcaption>Pannello ACP Chat</figcaption></figure>

```
┌──────────────────────────────────────────┐
│  Banner                                  │
│  Backend ▼  |  Session ▼  | [Connect] [＋] │
│  Status:   ● Connection | ● MCP | ● HostBridge  │
├──────────────────────────────────────────┤
│  ← Session Drawer  │  Transcript View  │  Details →  │
│                    │  [Toggle Plain/Bubble]    │
│  Backend A         │  Conversation messages... │
│  ├─ Session 1      │  Plan Component           │
│  └─ Session 2      │  Prompt Component         │
│  Backend B         │  Reply Area               │
│  └─ Session 3      │  Text input + Send/Cancel │
│                    │  Mode ▼ | Model ▼ | Reasoning ▼│
│                    │  ⭕ Usage 12.3k/200k   │
└──────────────────────────────────────────┘
```

## Banner

Il Banner si trova nella parte superiore del pannello e fornisce le funzioni di controllo principali:

### Selezione del backend

Un menu a tendina elenca tutti i backend configurati, ognuno con un suffisso di stato (Connecting/Connected/Disconnected). Cambiando backend si passa automaticamente alla sessione di quel backend.

### Selezione della sessione

Un menu a tendina mostra le 8 sessioni più recenti (ordinate per tempo); selezionandone una si passa a quella sessione. Quando ce ne sono più di 8, "Show more..." appare in basso; facendo clic si apre il drawer delle sessioni per visualizzare l'elenco completo.

### Controlli di connessione

- **Pulsante Connetti/Disconnetti**: Gestire manualmente lo stato di connessione del backend corrente
- **Pulsante Auth**: Mostrato quando il backend richiede l'autenticazione
- **Nuova sessione (＋)**: Creare una nuova sessione sul backend corrente

### Indicatori di stato

Il lato destro del Banner mostra tre indicatori di stato:

| Indicatore | Descrizione |
|------------|-------------|
| ● Connection | Stato della connessione con il backend ACP (verde=Connesso/grigio=Disconnesso/giallo=In connessione) |
| ● MCP | Disponibilità del servizio MCP |
| ● Host Bridge | Stato della connessione di Zotero Host Bridge (vedi sotto) |

### Stato di Host Bridge

Host Bridge è un canale ponte interno tra il plugin Zotero e il backend. È responsabile del passaggio del contesto corrente di Zotero (elementi selezionati, articolo nel lettore, dati della libreria, ecc.) al backend, consentendo all'AI di operare basandosi sui dati reali di Zotero.

Host Bridge comunica tramite lo strumento CLI `zotero-bridge`; il plugin ne gestisce il ciclo di vita automaticamente in background.

| Stato | Significato |
|-------|-------------|
| Verde ● | Host Bridge è connesso; il backend può accedere al contesto di Zotero |
| Giallo ● | In connessione o riconnessione |
| Grigio ● | Host Bridge non è disponibile (non installato o non avviato); il backend non può ottenere il contesto di Zotero |
| Nascosto | Host Bridge non è necessario al momento (ad es., il backend non lo supporta o le funzionalità di contesto non sono abilitate) |

Quando Host Bridge non è disponibile, ACP Chat può funzionare normalmente, ma l'AI non può accedere alle informazioni sull'articolo attualmente in visualizzazione come contesto.

## Drawer delle sessioni (sinistra)

Il drawer sinistro mostra tutte le sessioni storiche raggruppate per backend. Ogni voce di sessione mostra un titolo e l'ora di ultima attività.

- **Cambiare sessione**: Fare clic su una sessione nell'elenco per caricarla
- **Nuova sessione**: Operare dalla parte superiore del drawer o dal Banner

## Transcript View

### Messaggi della conversazione

I messaggi della conversazione supportano il rendering Markdown, tra cui:

- **Blocchi di codice**: Con evidenziazione della sintassi e pulsante di copia
- **Formule matematiche**: Formule LaTeX renderizzate con KaTeX
- **Elenchi, Tabelle, Link** e altri elementi Markdown standard

### Chiamate agli strumenti

Quando l'AI invoca uno strumento, nel transcript viene mostrata una voce di chiamata allo strumento:

- Badge con il nome dello strumento
- Riepilogo dei parametri di input
- LED di stato dell'esecuzione (in attesa/in corso/completata/fallita)
- In modalità Bubble, le chiamate consecutive agli strumenti vengono compresse automaticamente in un "gruppo di attività degli strumenti"

### Processo di pensiero

Il processo di ragionamento dell'AI viene mostrato come un blocco "Thinking" separato, distinto dalla risposta formale.

### Cambio modalità di visualizzazione

Il pulsante di commutazione nell'angolo in alto a destra consente di passare tra due modalità:

| Modalità | Descrizione |
|----------|-------------|
| **Plain** | I messaggi sono colorati per ruolo sul bordo sinistro, adatto per sfogliare conversazioni lunghe |
| **Bubble** | I messaggi sono mostrati in stile bolla, le chiamate consecutive agli strumenti vengono raggruppate automaticamente, adatto per la lettura |

### Plan Component

Quando una conversazione include un piano multi-step, viene mostrata una barra di avanzamento del piano sopra il transcript, con i passaggi completati, in corso e in sospeso.

### Prompt Component

Il componente prompt viene mostrato quando è richiesta l'interazione dell'utente:

- **Richieste di autorizzazione**: Quando il backend necessita di permessi di accesso a Zotero, mostra i dettagli della richiesta e i pulsanti di approvazione
- **Prompt di connessione**: Quando disconnesso, mostra un suggerimento per la riconnessione
- **Prompt di errore**: Mostra le informazioni sull'errore e le azioni di ripristino

## Reply Area

### Input di testo

- **Casella di testo multi-riga**: Supporta l'inserimento di testo lungo
- **Invio per inviare**: Premere Invio per inviare un messaggio
- **Shift+Invio per nuova riga**: Inserire un'interruzione di riga
- **Cronologia delle risposte**: Premere i tasti freccia su/giù per sfogliare i messaggi inviati

### Modalità di esecuzione

Sopra l'area di risposta è possibile selezionare:

| Opzione | Descrizione | Valori disponibili |
|---------|-------------|--------------------|
| **Mode** | Modalità di esecuzione | Definito dal backend |
| **Model** | Modello AI | Elenco dei modelli supportati dal backend |
| **Reasoning Effort** | Livello di sforzo di ragionamento | Basso/Medio/Alto (se supportato dal backend) |

### Misuratore di utilizzo

Un misuratore di utilizzo circolare è mostrato nell'angolo in basso a destra dell'area di risposta:

- **Anello esterno**: Percentuale di utilizzo dei token della sessione corrente rispetto al limite
- **Testo**: `Usati k / Limite k`
- Il colore cambia in base al livello di utilizzo (Normale → Avviso → Critico)

### Suggerimenti per le scorciatoie da tastiera

I suggerimenti per le scorciatoie da tastiera sono mostrati all'interno della casella di input.

## Drawer dei dettagli (destra)

Il drawer destro mostra informazioni dettagliate sulla sessione corrente:

| Area | Contenuto |
|------|-----------|
| **Info sessione** | ID sessione, ora di creazione, ora di ultima attività |
| **Info backend** | Tipo di backend, indirizzo, modello |
| **Percorso workspace** | Percorso del file del workspace della sessione |
| **Diagnostica** | Dati di debug e diagnostici |

## Contesto libreria vs Contesto lettore

ACP Chat supporta due modalità di contesto; il plugin rileva automaticamente il tipo di contesto corrente e lo passa al backend:

| Modalità | Descrizione | Casi d'uso |
|----------|-------------|------------|
| **Contesto libreria** | Basato sugli elementi attualmente selezionati nell'elenco degli elementi di Zotero | Riferimento rapido durante la navigazione della libreria |
| **Contesto lettore** | Basato sul testo completo dell'articolo attualmente aperto nel lettore di Zotero | Comprensione contestuale necessaria durante la lettura approfondita |

## Gestione delle sessioni

- La cronologia delle conversazioni viene persistita automaticamente
- Più sessioni per backend sono gestite in modo indipendente
- Le sessioni storiche possono essere visualizzate nella Dashboard o nella barra laterale
- È supportato l'elenco delle sessioni raggruppate per backend

## Note

- È necessario configurare prima un [backend ACP](#doc/backends%2Facp)
- Le conversazioni su diversi backend ACP non interferiscono tra loro
- Le conversazioni sono associate agli elementi Zotero per facilitarne il riferimento successivo
