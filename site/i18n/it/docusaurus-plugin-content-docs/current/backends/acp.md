# Configurazione del backend ACP

## Cos'è l'ACP?

ACP (Agent Client Protocol) è un protocollo per comunicare con i backend agent. Zotero Agents comunica con i processi agent in esecuzione locale (come Codex, Claude Code, OpenCode, ecc.) tramite il protocollo ACP per abilitare conversazioni ed esecuzione di skill.

Il backend ACP è il metodo di configurazione **consigliato** — finché hai uno strumento agent compatibile con ACP installato sul tuo computer, puoi usarlo direttamente senza alcuna configurazione aggiuntiva.

## Perché l'ACP come prima scelta?

- **Nessun carico di configurazione**: Non è necessario distribuire servizi aggiuntivi; usa gli strumenti agent già presenti sul tuo computer
- **Gestione automatica dei processi**: Il plugin specifica il comando di avvio nella configurazione e gestisce automaticamente il ciclo di vita del processo agent
- **Supporto multi-agent**: Configura più backend agent contemporaneamente e passa da uno all'altro secondo necessità
- **Isolamento della configurazione**: Alcuni agent (come OpenCode e Codex) supportano l'isolamento delle directory di configurazione e di persistenza delle sessioni tramite variabili d'ambiente

## Passaggi di configurazione

1. Assicurati di avere almeno uno strumento agent CLI compatibile con ACP installato sul tuo computer
2. Apri **Strumenti → [Backend Manager](backend-manager)**
3. Passa alla scheda **ACP**
4. Seleziona il tuo strumento agent dal menu a tendina **Aggiungi da preset**, oppure fai clic su **Aggiungi ACP** per configurare manualmente
5. Compila i seguenti campi:
   - **Nome visualizzato**: Un nome descrittivo (es. "Il mio OpenCode")
   - **Comando**: Comando per avviare il backend ACP (i preset si compilano automaticamente, ma puoi anche modificare manualmente)
   - **Argomenti**: Argomenti aggiuntivi per il comando (opzionale)
   - **Variabili d'ambiente**: Variabili d'ambiente aggiuntive (opzionale, utilizzate per l'isolamento della configurazione, ecc.)
6. Fai clic su **Salva** nell'angolo in basso a destra

### Verifica della connessione

Dopo il salvataggio, il plugin rileva automaticamente le funzionalità del backend:
- Verifica se il comando esiste
- Si connette e si inizializza
- Recupera i modelli e le modalità disponibili
- Calcola un'impronta digitale della configurazione per rilevare eventuali modifiche successive

Se il rilevamento fallisce, verifica che l'agent CLI sia installato correttamente e che il formato del comando sia corretto.

## Preset agent supportati

Il plugin fornisce diversi preset integrati. Dopo aver cliccato **Aggiungi da preset**, seleziona un agent a sinistra; a destra vengono mostrate le opzioni di avvio e un'anteprima di configurazione in sola lettura.

**Usa npx** passa il comando al formato `npx <package>` e mostra un avviso sulla necessità di installare Node.js e npm. Codex e Claude Code usano npx per impostazione predefinita, poiché dipendono dall'adapter ACP; gli altri agent usano il comando diretto per impostazione predefinita. L'attivazione di npx aggiunge il suffisso `(npm)` al nome del profilo.

**Ambiente isolato** è disponibile solo per gli agent che supportano l'isolamento. Una volta attivato, il plugin inietta nell'anteprima le variabili d'ambiente di isolamento documentate o gli argomenti della directory di sessione, e mostra un avviso che le opzioni dell'agent e l'autenticazione devono essere gestite manualmente in quella directory. L'attivazione dell'isolamento aggiunge il suffisso `(Isolated)` al nome del profilo.

![Finestra di dialogo preset ACP](/img/docs/backends/backend-manager_ACP-preset.png)

| Preset | Comando predefinito | Descrizione |
|------|------|------|
| **OpenCode** | `opencode acp` | Backend ACP OpenCode; supporta l'isolamento della directory di configurazione tramite `OPENCODE_CONFIG_DIR` |
| **Codex** | `npx @zed-industries/codex-acp@latest` | Adapter ACP per OpenAI Codex |
| **Claude Code** | `npx @agentclientprotocol/claude-agent-acp@latest` | Adapter ACP per Claude Code |
| **Gemini CLI** | `gemini --experimental-acp` | Modalità ACP di Gemini CLI |
| **Hermes** | `hermes acp` | Backend ACP Hermes Agent |
| **Qwen Code** | `qwen --acp --experimental-skills` | Modalità ACP di Qwen Code |
| **GitHub Copilot** | `copilot --acp --stdio` | Modalità ACP di GitHub Copilot CLI |
| **Qoder CLI** | `qodercli --acp` | Modalità ACP di Qoder CLI; supporta l'isolamento della directory di configurazione tramite `QODER_CONFIG_DIR` |
| **Cursor Agent ACP** | `cursor-agent-acp` | Adapter ACP Cursor Agent; supporta l'isolamento della directory di sessione tramite `--session-dir` |
| **DeepAgents** | `deepagents-acp` | Adapter ACP DeepAgents |
| **Auggie** | `auggie --acp` | Modalità ACP Auggie |
| **Kilo** | `kilo acp` | Modalità ACP Kilo Code |
| **Cline** | `cline --acp` | Modalità ACP Cline |
| **CodeBuddy** | `codebuddy --acp` | Modalità ACP CodeBuddy |
| **Grok** | `grok agent stdio` | Modalità stdio Grok Agent |

Sono stati testati solo OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code e Hermes Agent. La disponibilità di altri backend ACP dipende dalle loro implementazioni e questo plugin non la garantisce. In caso di problemi, puoi modificare manualmente gli argomenti del comando e le variabili d'ambiente; fai riferimento al protocollo ACP e alla documentazione ufficiale del backend.

Dopo aver selezionato un preset, puoi comunque modificare manualmente qualsiasi campo.

## Raccomandazioni sulla configurazione delle variabili d'ambiente

Alcuni agent supportano l'isolamento della configurazione e la persistenza delle sessioni tramite variabili d'ambiente; è sufficiente aggiungerle nell'editor delle variabili d'ambiente:

| Variabile d'ambiente | Agent | Scopo |
|----------------------|-------|-------|
| `OPENCODE_CONFIG` | OpenCode | Specifica una directory di configurazione indipendente |
| `OPENCODE_SESSION_DIR` | OpenCode | Specifica una directory di persistenza delle sessioni |
| `CODEX_CONFIG_DIR` | Codex | Specifica una directory di configurazione indipendente |

## Tipi di richiesta

Il backend ACP supporta due tipi di richiesta:
- `acp.prompt.v1` — Interazione conversazionale (Chat ACP)
- `acp.skill.run.v1` — Esecuzione di skill (Competenze ACP)

Lo stesso backend ACP può essere usato contemporaneamente sia per le conversazioni che per le esecuzioni di skill.

## Gestione delle sessioni

- Ogni backend può avere più sessioni (conversazioni), che sono memorizzate in modo persistente nel database del plugin
- Diversi backend ACP possono funzionare simultaneamente senza interferire tra loro
- Le sessioni possono essere gestite nella [Chat ACP](../sidebar/acp-chat)

## Passi successivi

Dopo aver completato la configurazione, puoi:
- Chattare con il backend nella [Chat ACP della barra laterale](../sidebar/acp-chat)
- Visualizzare le esecuzioni di skill ACP nella [Dashboard](../dashboard)
- Usare il backend ACP per eseguire attività nell'[Elenco dei Workflow](../workflows/)
