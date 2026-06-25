# Scheda SkillRunner

La scheda SkillRunner viene utilizzata per visualizzare e interagire con le esecuzioni effettuate tramite il backend Skill-Runner. A differenza di ACP Skills, che si concentra sull'esecuzione una tantum degli skill, la scheda SkillRunner enfatizza la gestione delle sessioni interattive.

## Panoramica dell'interfaccia

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/skillrunner-tab.webp" alt="Pannello SkillRunner" title="Pannello SkillRunner" loading="lazy" /><figcaption>Pannello SkillRunner</figcaption></figure>

```
┌─────────────────────────────────────┐
│  Banner: Titolo / requestId / Status    │
├─────────────────────────────────────┤
│  ← Task Drawer  │  Area contenuti principale   │  Details → │
│               │  Transcript View            │
│  Running      │  Plan Component             │
│  └─ backend1  │  Prompt Component           │
│     └─ task A │  Reply Area                 │
│  Completed    │                             │
│  └─ backend1  │                             │
│     └─ task B │                             │
└─────────────────────────────────────┘
```

## Banner

Il Banner mostra le informazioni relative all'attività attualmente selezionata:

- **Titolo**: Nome dell'attività o identificatore dello skill
- **Request ID**: Identificatore univoco della richiesta per l'attività
- **Stato**: Stato dell'esecuzione (running / waiting_user / waiting_auth / completed / failed)
- **Backend**: Informazioni sul backend
- **Engine**: Il motore in uso (ad es., gemini, claude, ecc.)
- **Model**: Il modello in uso
- **Aggiornato**: Ora dell'ultimo aggiornamento
- **Pulsante Annulla attività**

## Task Drawer (sinistra)

Il drawer sinistro mostra tutte le attività di SkillRunner, divise nei gruppi Running e Completed. Ogni voce di attività mostra informazioni riassuntive, un indicatore di stato e un'azione di archiviazione. Fare clic su una voce per passare alla vista dettagliata di quell'attività.

## Area contenuti principale

### Transcript View

La vista transcript di SkillRunner utilizza un **modello di chat con pensiero** che gestisce intelligentemente il ragionamento continuo:

- **Thinking Blocks**: Il processo di ragionamento dell'AI viene mostrato come blocchi di pensiero separati
- **Chiamate agli strumenti**: Mostra nome dello strumento, riepilogo dell'input e stato di esecuzione
- **Messaggi**: Messaggi di conversazione tra assistente e utente
- **Revisione**: Record delle modifiche alle versioni dell'output

Supporta anche le modalità di visualizzazione **Plain / Bubble**.

### Flusso di autenticazione

La scheda SkillRunner supporta flussi di autenticazione, consentendo di completare l'autenticazione del backend senza abbandonare il pannello:

**Trigger di autenticazione:**

- Attivata automaticamente quando si esegue uno skill che richiede autenticazione
- Il componente prompt mostra una richiesta di autenticazione

**Metodi di autenticazione supportati:**

| Metodo | Descrizione | Casi d'uso |
|--------|-------------|------------|
| **OAuth Proxy** | Completare il flusso OAuth tramite browser | Metodo consigliato, per motori che supportano OAuth |
| **Inserimento codice auth** | Inserire manualmente un codice o URL di autenticazione | Quando il motore ha generato un link di autenticazione |
| **Importazione file** | Importare un file di credenziali | Quando un file di credenziali è già disponibile |
| **TUI inline** | Avviare un terminale direttamente nel pannello | Quando è richiesto un login interattivo |

**Esempio di flusso di autenticazione (OAuth):**

1. L'esecuzione rileva che è richiesta l'autenticazione
2. Il componente prompt mostra "Autenticazione richiesta" e i metodi di autenticazione disponibili
3. L'utente seleziona il proxy OAuth
4. Il browser apre la pagina OAuth
5. L'utente completa l'autenticazione
6. L'esecuzione riprende automaticamente

### Prompt Component

| Stato | Contenuto mostrato |
|-------|--------------------|
| `waiting_user` | In attesa dell'input dell'utente; mostra la descrizione del contesto e opzioni rapide (se disponibili) |
| `waiting_auth` | In attesa di autenticazione; mostra la selezione del metodo di autenticazione e l'input |
| `running` | Indicatore di avanzamento |
| `completed` | Conferma dello stato di completamento |
| `error` | Informazioni sull'errore e suggerimenti per la risoluzione |

### Reply Area

- **Casella di input testo**: Inserire il contenuto della risposta
- **Pulsante Invia/Annulla**

A differenza di ACP Skills, l'area di risposta della scheda SkillRunner non dispone di selettori modalità/modello/ragionamento (questi sono configurati nelle impostazioni del backend).

## Drawer dei dettagli (destra)

| Area | Contenuto |
|------|-----------|
| **Metadati esecuzione** | Titolo, requestId, taskKey, stato, flag terminal/waiting |
| **Info backend** | backend, engine, model |
| **Ora aggiornamento** | Ora di ultima attività |
| **Info interazione** | Informazioni sull'interazione in sospeso corrente (se presenti) |
| **Riepilogo sessione** | Riepilogo storico della sessione |
| **Riepilogo revisioni** | Record delle modifiche alle versioni dell'output |

## Configurazione correlata

Prima di utilizzare la scheda SkillRunner, è necessario configurare un [backend Skill-Runner](#doc/backends%2Fskill-runner).
