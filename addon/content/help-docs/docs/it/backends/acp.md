# Configurazione del backend ACP

## Cos'è l'ACP?

ACP (Agent Client Protocol) è un protocollo per comunicare con i backend agent. Zotero Agents comunica con i processi agent in esecuzione locale (come Codex, Claude Code, OpenCode, ecc.) tramite il protocollo ACP per abilitare conversazioni ed esecuzione di skill.

Il backend ACP è il metodo di configurazione **consigliato** — finché hai uno strumento agent compatibile con ACP installato sul tuo computer, puoi usarlo direttamente senza alcuna configurazione aggiuntiva.

## Nuovo su Agent?

Se sei nuovo agli strumenti agent e non sei sicuro di quale scegliere o come installarlo, consulta questa guida:

**[Guida introduttiva agli Agent](https://agent.ps5.online)**

## Perché l'ACP come prima scelta?

- **Nessun carico di configurazione**: Non è necessario distribuire servizi aggiuntivi; usa gli strumenti agent già presenti sul tuo computer
- **Gestione automatica dei processi**: Il plugin specifica il comando di avvio nella configurazione e gestisce automaticamente il ciclo di vita del processo agent
- **Supporto multi-agent**: Configura più backend agent contemporaneamente e passa da uno all'altro secondo necessità
- **Isolamento della configurazione**: Alcuni agent (come OpenCode e Codex) supportano l'isolamento delle directory di configurazione e di persistenza delle sessioni tramite variabili d'ambiente

## Passaggi di configurazione

1. Assicurati di avere almeno uno strumento agent CLI compatibile con ACP installato sul tuo computer
2. Apri **Strumenti → [Backend Manager](#doc/backends%2Fbackend-manager)**
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

**Usa npx** passa il comando al formato `npx <package>` e mostra un avviso sulla necessità di installare Node.js e npm. Codex, Claude Code, Factory Droid, Pi ACP e Amp ACP usano npx per impostazione predefinita; gli altri preset usano il comando installato per impostazione predefinita. L'attivazione di npx aggiunge il suffisso `(npm)` al nome del profilo.

Disattivando **Usa npx** viene avviato l'eseguibile denominato del preset, che deve essere già installato (ad esempio `gemini`, `copilot`, `opencode` o `kimi`). I preset senza opzione npx usano sempre il CLI installato: Hermes, Cursor nativo (`agent`), Mistral Vibe, OpenHands, Goose, Junie, Kiro CLI e Oh My Pi. Pi ACP e Amp ACP sono adapter, quindi anche i CLI sottostanti di Pi e Amp devono essere installati e autenticati. Oh My Pi è basato su Bun. L'attivazione di npx richiede Node.js e npm.

**Ambiente isolato** è disponibile solo per gli agent che supportano l'isolamento. Una volta attivato, il plugin inietta nell'anteprima le variabili d'ambiente di isolamento documentate o gli argomenti della directory di sessione, e mostra un avviso che le opzioni dell'agent e l'autenticazione devono essere gestite manualmente in quella directory. L'attivazione dell'isolamento aggiunge il suffisso `(Isolated)` al nome del profilo.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/backends/backend-manager_ACP-preset.webp" alt="Finestra di dialogo preset ACP" title="Finestra di dialogo preset ACP" loading="lazy" /><figcaption>Finestra di dialogo preset ACP</figcaption></figure>

<!-- prettier-ignore -->
| Preset | Comando predefinito | Descrizione |
| --- | --- | --- |
| **OpenCode** | `opencode acp` | Backend ACP OpenCode; inietta `OPENCODE_CONFIG_CONTENT` per negare le domande sui permessi e supporta l'isolamento della directory di configurazione tramite `OPENCODE_CONFIG_DIR` |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | Adapter ACP per OpenAI Codex |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | Adapter ACP per Claude Code |
| **Gemini CLI** | `gemini --acp` | Modalità ACP di Gemini CLI |
| **Hermes** | `hermes acp` | Backend ACP Hermes Agent |
| **Qwen Code** | `qwen --acp` | Modalità ACP di Qwen Code; supporta l'isolamento della directory di configurazione tramite `QWEN_HOME` |
| **GitHub Copilot** | `copilot --acp --stdio` | Modalità ACP di GitHub Copilot CLI; supporta l'isolamento della directory di configurazione tramite `COPILOT_HOME` |
| **Qoder CLI** | `qoder --acp` | Modalità ACP di Qoder CLI; supporta l'isolamento documentato della directory di configurazione tramite `QODER_CONFIG_DIR` |
| **Cursor Agent ACP** | `cursor-agent-acp` | Adapter ACP Cursor Agent; supporta l'isolamento documentato della directory di sessione tramite `--session-dir` |
| **DeepAgents** | `deepagents-acp` | Adapter ACP DeepAgents |
| **Auggie** | `auggie --acp` | Modalità ACP Auggie |
| **Kilo** | `kilo acp` | Modalità ACP Kilo Code; inietta `KILO_CONFIG_CONTENT` per negare le domande sui permessi, ed è stato osservato l'isolamento dei percorsi XDG principali per configurazione, dati/sessione/auth/log e cache |
| **Cline** | `cline --acp` | Modalità ACP Cline; supporta l'isolamento della directory di configurazione tramite `CLINE_DIR` |
| **CodeBuddy** | `codebuddy --acp` | Modalità ACP CodeBuddy; supporta l'isolamento della directory di configurazione tramite `CODEBUDDY_CONFIG_DIR` |
| **Grok** | `grok agent stdio` | Modalità stdio Grok Agent; supporta l'isolamento home/configurazione tramite `GROK_HOME` |
| **Cursor** | `agent acp` | Voce ACP nativa di Cursor, distinta dall'adapter Cursor Agent ACP; supporta l'isolamento della directory di configurazione tramite `CURSOR_CONFIG_DIR` |
| **Kimi Code** | `kimi acp` | Modalità ACP Kimi Code; supporta l'isolamento della directory di configurazione tramite `KIMI_CODE_HOME` |
| **MiniMax Code** | `mcode acp` | Modalità ACP MiniMax Code; con npx attivo viene selezionato esplicitamente l'eseguibile `mcode` di `@minimax-ai/code`, e l'isolamento usa `MINIMAX_DATA_DIR` |
| **Mistral Vibe** | `vibe-acp` | Modalità ACP Mistral Vibe; supporta l'isolamento home/configurazione tramite `VIBE_HOME` |
| **OpenHands** | `openhands acp` | Modalità ACP OpenHands; l'isolamento separa l'archiviazione di persistenza e delle conversazioni tramite `OPENHANDS_PERSISTENCE_DIR` e `OPENHANDS_CONVERSATIONS_DIR` |
| **DeepSeek Harness** | `dsh --profile acp` | Modalità ACP DeepSeek Harness; supporta l'isolamento home/configurazione tramite `DSH_HOME` |
| **Factory Droid** | `npx -y droid@latest exec --output-format acp-daemon` | Modalità demone ACP Factory Droid; disattiva l'aggiornamento automatico di Droid tramite `DROID_DISABLE_AUTO_UPDATE` e `FACTORY_DROID_AUTO_UPDATE_ENABLED` |
| **Goose** | `goose acp` | Modalità ACP Goose; supporta l'isolamento della radice dei percorsi tramite `GOOSE_PATH_ROOT` |
| **Junie** | `junie --acp=true` | Modalità ACP Junie; supporta l'isolamento home/configurazione tramite `JUNIE_HOME` |
| **Kiro CLI** | `kiro-cli acp` | Modalità ACP Kiro CLI |
| **Pi ACP** | `npx -y pi-acp@latest` | Adapter Pi ACP; richiede il CLI dell'agente di coding Pi e supporta l'isolamento della directory di configurazione tramite `PI_CODING_AGENT_DIR` |
| **Amp ACP** | `npx -y amp-acp@latest` | Adapter Amp ACP; richiede il CLI Amp, e l'isolamento sposta solo lo stato di thread/sessioni dell'adapter tramite `AMP_ACP_STATE_DIR` |
| **Oh My Pi** | `omp acp` | Modalità ACP Oh My Pi; richiede Bun ed è offerto solo come comando installato |

Sono stati testati solo OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code e Hermes Agent. La disponibilità di altri backend ACP dipende dalle loro implementazioni e questo plugin non la garantisce. In caso di problemi, puoi modificare manualmente gli argomenti del comando e le variabili d'ambiente; fai riferimento al protocollo ACP e alla documentazione ufficiale del backend.

Dopo aver selezionato un preset, puoi comunque modificare manualmente qualsiasi campo.

## Raccomandazioni sulla configurazione delle variabili d'ambiente

Alcuni agent supportano l'isolamento della configurazione e la persistenza delle sessioni tramite variabili d'ambiente o argomenti del comando. I preset con **Ambiente isolato** attivo iniettano automaticamente i valori documentati; per i profili manuali, aggiungi tu stesso i valori corrispondenti:

L'isolamento sposta solo le radici del filesystem dichiarate. L'isolamento Amp ACP riguarda solo lo stato di thread/sessioni dell'adapter, mentre configurazione e credenziali di Amp restano configurate separatamente. L'isolamento nativo di Cursor riguarda la directory di configurazione di Cursor, distinta dalla directory di sessione dell'adapter `cursor-agent-acp`. La cache propria di Copilot e il portachiavi di Goose restano fuori dai percorsi iniettati.

I preset OpenCode e Kilo iniettano inoltre sempre una configurazione dei permessi inline: `OPENCODE_CONFIG_CONTENT` e `KILO_CONFIG_CONTENT` rispettivamente, entrambi impostati su `{"permission":{"question":"deny"}}`. Puoi modificare o rimuovere questi valori dopo aver aggiunto il preset.

<!-- prettier-ignore -->
| Impostazione | Agent | Scopo |
| --- | --- | --- |
| `OPENCODE_CONFIG_DIR` | OpenCode | Specifica una directory di configurazione indipendente |
| `CODEX_HOME` | Codex | Specifica una directory home/configurazione indipendente |
| `CLAUDE_CONFIG_DIR` | Claude Code | Specifica una directory di configurazione indipendente |
| `GEMINI_CLI_HOME` | Gemini CLI | Specifica una directory di configurazione indipendente |
| `HERMES_HOME` | Hermes Agent | Specifica una directory home/configurazione indipendente |
| `QODER_CONFIG_DIR` | Qoder CLI | Specifica una directory di configurazione indipendente |
| `QWEN_HOME` | Qwen Code | Specifica una directory home/configurazione indipendente |
| `COPILOT_HOME` | GitHub Copilot | Specifica una directory di configurazione indipendente; la cache propria di Copilot resta fuori da questo percorso |
| `CLINE_DIR` | Cline | Specifica una directory di configurazione indipendente |
| `CODEBUDDY_CONFIG_DIR` | CodeBuddy | Specifica una directory di configurazione indipendente |
| `GROK_HOME` | Grok | Specifica una directory home/configurazione indipendente |
| `CURSOR_CONFIG_DIR` | Cursor (ACP nativo) | Specifica una directory di configurazione indipendente |
| `KIMI_CODE_HOME` | Kimi Code | Specifica una directory home/configurazione indipendente |
| `MINIMAX_DATA_DIR` | MiniMax Code | Specifica una directory dati indipendente |
| `VIBE_HOME` | Mistral Vibe | Specifica una directory home/configurazione indipendente |
| `OPENHANDS_PERSISTENCE_DIR`, `OPENHANDS_CONVERSATIONS_DIR` | OpenHands | Specifica una radice di persistenza indipendente e la sua archiviazione delle conversazioni (`<root>/conversations`) |
| `DSH_HOME` | DeepSeek Harness | Specifica una directory home/configurazione indipendente |
| `GOOSE_PATH_ROOT` | Goose | Specifica una radice dei percorsi indipendente; il portachiavi di Goose resta fuori da questo percorso |
| `JUNIE_HOME` | Junie | Specifica una directory home/configurazione indipendente |
| `PI_CODING_AGENT_DIR` | Pi ACP | Specifica una directory di configurazione indipendente dell'agente di coding Pi |
| `AMP_ACP_STATE_DIR` | Amp ACP | Sposta solo lo stato di thread/sessioni dell'adapter; configurazione e credenziali di Amp restano configurate separatamente |
| `--session-dir <path>` | Cursor Agent ACP | Specifica una directory di persistenza delle sessioni indipendente |
| `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME` | Kilo | Specifica radici XDG indipendenti per configurazione, dati/sessione/auth/log e stato della cache. Questo copre i percorsi principali osservati, ma non dimostra che ogni sottocomando o plugin di Kilo eviti le directory globali. |

## Opzioni di modelli gratuiti

Diversi motori offrono **accesso gratuito ai modelli** — ideale per iniziare senza alcun pagamento:

| Motore                    | Opzione gratuita            | Come funziona                                                                                                                                                                                   |
| ------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kilo Code**             | Modalità Auto Free          | La modalità Auto Free integrata di Kilo Code instrada automaticamente ogni richiesta a un modello gratuito appropriato. Attivala nelle impostazioni di Kilo Code — nessuna chiave API richiesta |
| **OpenCode Zen**          | Modelli gratuiti integrati  | L'edizione [OpenCode Zen](https://opencode.ai/zen) include l'accesso ai modelli gratuiti senza richiedere un abbonamento API                                                                    |
| **OpenCode + OpenRouter** | Modelli gratuiti OpenRouter | Configura OpenCode per utilizzare [OpenRouter](https://openrouter.ai/) e seleziona i modelli del piano gratuito (es. Gemini 2.5 Flash, DeepSeek V3). Richiede un account OpenRouter gratuito    |

### Limitazioni del piano gratuito

I modelli gratuiti sono sufficienti per un uso occasionale, ma tieni presenti le seguenti restrizioni:

| Limitazione                   | Cosa aspettarsi                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Limite di velocità**        | Le richieste possono essere limitate — in genere 5–20 richieste al minuto a seconda del carico del provider. L'elaborazione in batch rallenta notevolmente                     |
| **Concorrenza**               | Di solito limitata a una singola richiesta simultanea. L'esecuzione di più flussi di lavoro contemporaneamente può essere messa in coda o fallire                              |
| **Disponibilità dei modelli** | I pool di modelli gratuiti possono esaurirsi nelle ore di punta. Potresti vedere errori come «modello non disponibile» o «capacità superata»                                   |
| **Rotazione dei modelli**     | I provider possono cambiare silenziosamente i modelli gratuiti (aggiornamento o declassamento) senza preavviso. La qualità dell'output può variare tra un'esecuzione e l'altra |
| **Nessun SLA / Affidabilità** | I piani gratuiti non offrono garanzie di disponibilità. I servizi potrebbero essere temporaneamente non disponibili o interrotti                                               |

> Se hai bisogno di elaborazione batch affidabile o uso in produzione, considera un piano a pagamento come [OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW) ($10/mese) o un Coding Plan (Bailian, Zhipu, ecc.). Il costo per articolo è trascurabile rispetto al tempo risparmiato.

## Tipi di richiesta

Il backend ACP supporta due tipi di richiesta:

- `acp.prompt.v1` — Interazione conversazionale (Chat ACP)
- `acp.skill.run.v1` — Esecuzione di skill (Competenze ACP)

Lo stesso backend ACP può essere usato contemporaneamente sia per le conversazioni che per le esecuzioni di skill.

## Gestione delle sessioni

- Ogni backend può avere più sessioni (conversazioni), che sono memorizzate in modo persistente nel database del plugin
- Diversi backend ACP possono funzionare simultaneamente senza interferire tra loro
- Le sessioni possono essere gestite nella [Chat ACP](#doc/sidebar%2Facp-chat)

## Passi successivi

Dopo aver completato la configurazione, puoi:

- Chattare con il backend nella [Chat ACP della barra laterale](#doc/sidebar%2Facp-chat)
- Visualizzare le esecuzioni di skill ACP nella [Dashboard](#doc/dashboard)
- Usare il backend ACP per eseguire attività nell'[Elenco dei Workflow](#doc/workflows%2Findex)
