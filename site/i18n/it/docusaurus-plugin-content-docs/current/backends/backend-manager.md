# Backend Manager

Il Backend Manager è la finestra unificata per gestire tutte le configurazioni dei backend. Tramite esso puoi aggiungere, modificare, eliminare e verificare le connessioni ai backend.

## Come aprire

- **Menu**: **Strumenti → Backend Manager**

## Layout dell'interfaccia

```
┌─────────────────────────────────────────────────┐
│  Backend Manager                        [Annulla] [Salva] │
├─────────────────────────────────────────────────┤
│  [ACP] [SkillRunner] [Generic HTTP]              │
├─────────────────────────────────────────────────┤
│  ACP                                   [Aggiungi ACP] │
│                                                 │
│  ┌─ Nome visualizzato: [________]  ─┐          │
│  │  Comando:        [________]       │          │
│  │  Argomenti:      Editor argomenti │          │
│  │  Var. d'ambiente: Editor var. amb │ [Rimuovi]│
│  └──────────────────────────────────┘          │
│                                                 │
│  ┌─ Nome visualizzato: [________]  ─┐          │
│  │  ...                            │ [Rimuovi] │
│  └──────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

## Operazioni generali

### Cambio di scheda

Nella parte superiore della finestra ci sono tre schede: **ACP**, **SkillRunner** e **Generic HTTP**. Fai clic su una scheda per passare alla corrispondente area di configurazione del tipo di backend. Ogni scheda elenca tutti i backend configurati di quel tipo.

### Aggiunta di un backend

Fai clic sul pulsante **Aggiungi** sotto una scheda per creare una nuova riga di configurazione vuota per quel tipo. Compila i campi e fai clic su **Salva** nell'angolo in basso a destra per applicare.

### Modifica di un backend

Modifica i campi direttamente nella riga di configurazione. Le modifiche non salvate non avranno effetto.

### Eliminazione di un backend

Fai clic sul pulsante **Rimuovi** all'interno di una riga di configurazione per eliminare quel backend. Le eliminazioni hanno effetto dopo il salvataggio.

### Salva e Annulla

| Pulsante | Posizione | Funzione |
|----------|-----------|----------|
| **Salva** | In basso a destra nella finestra | Salva tutte le modifiche e chiude la finestra |
| **Annulla** | In basso a destra nella finestra (accanto a Salva) | Scarta tutte le modifiche non salvate e chiude la finestra |

Se ci sono modifiche non salvate prima di chiudere la finestra, apparirà una richiesta di conferma.

---

## Scheda ACP

I backend ACP sono sottoprocessi agent in esecuzione locale. La configurazione specifica il comando di avvio e il plugin gestisce il ciclo di vita del processo.

![Pagina di configurazione del backend ACP](/img/docs/backends/backend-manager_ACP.png)

### Descrizione dei campi

| Campo | Obbligatorio | Descrizione |
|-------|-------------|-------------|
| **Nome visualizzato** | Sì | Nome visualizzato per il backend, usato per identificarlo nella Dashboard e nella barra laterale |
| **Comando** | Sì | Comando per avviare il backend ACP (es. `npx opencode-ai@latest acp`) |
| **Argomenti** | No | Argomenti aggiuntivi per il comando, aggiunti uno alla volta tramite l'editor degli argomenti |
| **Variabili d'ambiente** | No | Variabili d'ambiente aggiuntive, aggiunte una alla volta tramite l'editor delle variabili d'ambiente (coppie chiave-valore) |

### Preset ACP

Nella parte superiore della scheda ACP c'è un menu a tendina **Aggiungi da preset**. Dopo aver selezionato un preset, il plugin compila automaticamente il comando e i parametri comuni.

Preset integrati:

| Preset | Comando |
|--------|---------|
| **OpenCode** | `npx opencode-ai@latest acp` |
| **Codex** | `npx codex acp` |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` |
| **Gemini CLI** | `npx @google/gemini-cli acp` |
| **Qwen Code** | `qwen-code acp` |

Puoi comunque modificare manualmente qualsiasi campo dopo aver selezionato un preset.

### Pulsanti azione

| Pulsante | Funzione |
|----------|----------|
| **Aggiorna opzioni runtime** | Rileva nuovamente l'elenco dei modelli, l'elenco delle modalità e altre funzionalità runtime del backend |

### Editor degli argomenti

**Aggiungi argomento**: Fai clic sul pulsante di aggiunta e inserisci il contenuto dell'argomento.
**Rimuovi argomento**: Fai clic sul pulsante di rimozione accanto all'argomento.

### Editor delle variabili d'ambiente

**Aggiungi variabile d'ambiente**: Fai clic sul pulsante di aggiunta e compila Chiave e Valore.
**Rimuovi variabile d'ambiente**: Fai clic sul pulsante di rimozione accanto alla variabile.

---

## Scheda SkillRunner

I backend SkillRunner comunicano con i servizi Skill-Runner tramite API HTTP, supportando sia la modalità di distribuzione locale che remota.

![Pagina di configurazione del backend SkillRunner](/img/docs/backends/backend-manager_skillrunner.png)

### Descrizione dei campi

| Campo | Obbligatorio | Descrizione |
|-------|-------------|-------------|
| **Nome visualizzato** | Sì | Nome visualizzato per il backend |
| **URL di base** | Sì | Indirizzo del servizio Skill-Runner (es. `http://127.0.0.1:29813`) |
| **Autenticazione** | No | Seleziona `none` (nessuna autenticazione) o `bearer` (autenticazione con Bearer Token) |
| **Token di autenticazione** | No | Bearer Token (da compilare solo quando l'autenticazione è impostata su bearer) |
| **Timeout** | No | Timeout della richiesta (millisecondi) |

### Pulsanti azione

| Pulsante | Funzione |
|----------|----------|
| **Apri interfaccia di gestione** | Apri l'interfaccia di gestione Web integrata di Skill-Runner |
| **Aggiorna cache modelli** | Aggiorna la cache dell'elenco dei modelli per questo backend |

---

## Scheda Generic HTTP

I backend Generic HTTP sono utilizzati per inviare richieste a qualsiasi servizio HTTP, principalmente per chiamare API esterne (come il servizio di analisi documenti MinerU).

![Pagina di configurazione del backend Generic HTTP](/img/docs/backends/backend-manager_generic-HTTP.png)

### Descrizione dei campi

| Campo | Obbligatorio | Descrizione |
|-------|-------------|-------------|
| **Nome visualizzato** | Sì | Nome visualizzato per il backend |
| **URL di base** | Sì | Indirizzo di base del servizio HTTP |
| **Autenticazione** | No | Seleziona `none` o `bearer` |
| **Token di autenticazione** | No | Bearer Token (da compilare solo quando l'autenticazione è impostata su bearer) |
| **Timeout** | No | Timeout della richiesta (millisecondi) |

## Rilevamento delle funzionalità del backend

Dopo aver salvato un backend, il plugin rileva automaticamente le funzionalità del backend in background:

- **ACP**: Verifica la disponibilità del comando, l'inizializzazione della connessione, l'elenco dei modelli, l'elenco delle modalità e calcola un'impronta digitale della configurazione per rilevare eventuali modifiche successive
- **SkillRunner**: Verifica la disponibilità dell'API, l'elenco dei motori, l'elenco dei modelli
- **Generic HTTP**: Verifica la raggiungibilità dell'endpoint HTTP

I risultati del rilevamento sono visualizzati come indicatori di stato del backend nella Dashboard e nella barra laterale.

## Passi successivi

Dopo aver completato la configurazione, puoi:

- Usare il backend ACP nella [Chat ACP](../sidebar/acp-chat) o nelle [Competenze ACP](../sidebar/acp-skills)
- Gestire le esecuzioni SkillRunner tramite la [Scheda SkillRunner](../sidebar/skillrunner-tab)
- Usare i backend configurati per eseguire attività nell'[Elenco dei Workflow](../workflows/) e nella [Dashboard](../dashboard)
